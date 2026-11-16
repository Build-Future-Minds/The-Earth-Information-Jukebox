// Scan player: plays a ScanScore (scanScore.ts) with its own clock and its own instruments.
// It shares nothing with the Earth voice: not the Tone Transport, not the synth, not the volume.
// So starting, stopping or speeding the scan cannot move, add or remove an Earth note
// (the same promise docs/CONTRACT.md makes for the melody).

import * as Tone from 'tone';
import {
  BarInstrument,
  DEFAULT_SCAN_SOUND,
  Room,
  ScanChoir,
  createScanBass,
  scanSound,
  type ScanBass,
  type ScanSoundDef,
  type ScanSoundId,
} from './instruments';
import { bandNote, chimeNote, chimeVelocity, columnMean, rootNoteAt, scanPan, type Chime, type ScanScore } from './scanScore';

export type ScanState = 'stopped' | 'playing' | 'paused';

export interface ScanListener {
  onState: (state: ScanState) => void;
  /** Called when a chime actually sounds (not when it is scheduled), for the screen. */
  onChime?: (chime: Chime) => void;
}

/** Development-only record of every chime handed to an instrument, with its exact audio time. */
export interface ScanLogEntry {
  audioTime: number;
  column: number;
  band: number;
  warm: boolean;
  /** Which instrument struck it: warm, cool or (a picture with a third class) blue. */
  colour: Chime['colour'];
  note: number;
  /** The root note sounding under this chime (decoration: scanScore.ts, rootNoteAt). */
  root: number;
  /** Left–right position of the scan at this moment, -1 to 1. */
  pan: number;
  /** Which sound from the library played it. The score is the same for all of them. */
  sound: ScanSoundId;
}
/** Development only: the audio time at which each sweep's first column played, for measurements.
 *  A sweep with no struck note cannot be timed from its first chime (web/measure/sound.measure.ts). */
export interface ScanSweepEntry {
  audioTime: number;
  shape: ScanScore['shape'];
  columns: number;
  seconds: number;
  speed: number;
}
declare global {
  interface Window {
    __scanNotes?: ScanLogEntry[];
    __scanSweeps?: ScanSweepEntry[];
  }
}
if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.__scanNotes = [];
  window.__scanSweeps = [];
}

/** One fixed loudness setting per kind of scan. A circle is small and full of lines, so its radar
 *  would be much louder than the map sweep; this brings the two closer. Both regions share the
 *  radar setting, so the louder region is the one with more colour. Design choice. */
const SHAPE_TRIM = { line: 1, radar: 0.5 } as const;

/** How often the player checks for chimes whose moment has come, to show them (about a frame). */
const SHOW_EVERY_MS = 16;

/** Everything that makes sound for one choice from the library. Replaced whole when the choice changes. */
interface Rig {
  def: ScanSoundDef;
  room: Room;
  panner: Tone.Panner;
  volume: Tone.Volume;
  choir: ScanChoir;
  bass: ScanBass;
  warm: BarInstrument;
  cool: BarInstrument;
  blue: BarInstrument;
}

export class ScanPlayer {
  private state: ScanState = 'stopped';
  private score: ScanScore | null = null;
  private chimesByColumn = new Map<number, Chime[]>();
  private clock: Tone.Clock | null = null;
  private rig: Rig | null = null;
  private soundId: ScanSoundId = DEFAULT_SCAN_SOUND;
  private volumeDb = -8;
  private speed = 1;
  private root = -1;
  private initP: Promise<void> | null = null;
  private disposed = false;
  /** Bumped whenever queued sound is cancelled, so screen updates queued for it are ignored. */
  private generation = 0;
  /** Chimes handed to an instrument whose moment has not been shown on screen yet, in time order. */
  private due: { time: number; chime: Chime; generation: number }[] = [];
  private showTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private listener: ScanListener) {}

  getState(): ScanState {
    return this.state;
  }

  /** Load a score. If the scan is playing it starts again from the beginning with the new score. */
  setScore(score: ScanScore | null): void {
    const wasPlaying = this.state === 'playing';
    this.halt('stopped');
    this.score = score;
    this.chimesByColumn = new Map();
    for (const chime of score?.chimes ?? []) {
      this.chimesByColumn.set(chime.column, [...(this.chimesByColumn.get(chime.column) ?? []), chime]);
    }
    this.clock?.dispose();
    this.clock = null;
    if (wasPlaying && score?.status === 'ok') void this.start();
  }

  /** Must be called from a user gesture (click or key press): browsers block audio before that. */
  async start(): Promise<void> {
    if (!this.score || this.score.status !== 'ok' || this.disposed || this.state === 'playing') return;
    this.initP ??= Tone.start();
    await this.initP;
    if (!this.score || this.score.status !== 'ok' || this.disposed || this.getState() === 'playing') return;
    this.rig ??= this.buildRig();
    const { columns, seconds } = this.score.grid;
    this.clock ??= new Tone.Clock((time, ticks) => this.playColumn(time, ticks ?? 0), (columns / seconds) * this.speed);
    if (this.state === 'stopped') {
      // A sweep begins on the first root, whatever was sounding when the last one stopped.
      this.root = rootNoteAt(this.score.grid, 0);
      this.rig.bass.setRoot(this.root, Tone.immediate(), true);
    }
    this.rig.room.open();
    this.clock.start();
    this.showTimer ??= setInterval(() => this.showDue(), SHOW_EVERY_MS);
    this.setState('playing');
  }

  pause(): void {
    if (this.state !== 'playing') return;
    this.halt('paused');
  }

  /** Silence the scan and rewind to the first column. */
  stop(): void {
    this.halt('stopped');
  }

  setSpeed(speed: number): void {
    this.speed = speed;
    if (this.clock && this.score) {
      const { columns, seconds } = this.score.grid;
      this.clock.frequency.value = (columns / seconds) * speed;
    }
  }

  setVolume(db: number): void {
    this.volumeDb = db;
    if (this.rig) this.rig.volume.volume.value = db;
  }

  /**
   * Choose a sound from the library. The score does not change: the same notes at the same times.
   * While playing, the new instruments take over from the next column and the old ones are faded
   * out and removed.
   */
  setSound(id: ScanSoundId): void {
    if (id === this.soundId) return;
    this.soundId = id;
    const old = this.rig;
    if (!old) return; // nothing built yet: start() will build this one
    this.rig = this.buildRig();
    if (this.root >= 0) this.rig.bass.setRoot(this.root, Tone.immediate(), true);
    if (this.state === 'playing') this.rig.room.open();
    else this.rig.room.close();
    old.room.close();
    old.choir.silence();
    old.bass.silence();
    old.warm.damp();
    old.cool.damp();
    old.blue.damp();
    setTimeout(() => disposeRig(old), 400);
  }

  /** How far through the sweep the line is, 0 to 1, read from the real audio clock. */
  position(): number {
    if (!this.clock || !this.score || this.state === 'stopped') return 0;
    const { columns } = this.score.grid;
    const ticks = this.clock.getTicksAtTime(Tone.immediate());
    return (((ticks % columns) + columns) % columns) / columns;
  }

  dispose(): void {
    this.disposed = true;
    this.halt('stopped');
    this.clock?.dispose();
    if (this.rig) disposeRig(this.rig);
    this.rig = null;
  }

  private buildRig(): Rig {
    const def = scanSound(this.soundId);
    const room = new Room(def.room.wet, def.room.decay);
    // The dry sound sits where the line is (left to right); the room's echo stays wide.
    // A panner at the centre sends each speaker 3 dB less than no panner would, so the room's
    // input makes that up (measured: -28.4 LUFS with the panner alone, -25.4 before it).
    room.input.gain.value = Math.SQRT2;
    const panner = new Tone.Panner(0).connect(room.input);
    const volume = new Tone.Volume(this.volumeDb).connect(panner);
    const bands = this.score?.grid.bands ?? 12;
    const choir = new ScanChoir(Array.from({ length: bands }, (_, band) => bandNote(band)), def.choir);
    const bass = createScanBass(def);
    const warm = new BarInstrument(def.warm, def.warmLevel);
    const cool = new BarInstrument(def.cool, def.coolLevel);
    const blue = new BarInstrument(def.blue, def.blueLevel);
    for (const source of [choir, bass, warm, cool, blue]) source.output.connect(volume);
    return { def, room, panner, volume, choir, bass, warm, cool, blue };
  }

  /** One column of the score, at exact audio time `time`. */
  private playColumn(time: number, tick: number): void {
    const score = this.score;
    const rig = this.rig;
    if (!score || !rig) return;
    const { columns, bands, seconds } = score.grid;
    const column = ((Math.round(tick) % columns) + columns) % columns;
    const columnSeconds = seconds / columns / this.speed;
    const trim = SHAPE_TRIM[score.shape];
    if (column === 0) window.__scanSweeps?.push({ audioTime: time, shape: score.shape, columns, seconds, speed: this.speed });

    // Decoration, not data: the root steps on its timetable, and the sound follows the line across.
    const root = rootNoteAt(score.grid, column);
    if (root !== this.root) {
      this.root = root;
      rig.bass.setRoot(root, time);
    }
    const pan = scanPan(score.shape, (column + 0.5) / columns);
    rig.panner.pan.setTargetAtTime(pan, time, columnSeconds);

    // Held notes: each band glides to this column's level. One column is about three time constants.
    const mean = columnMean(score, column);
    rig.choir.setLevels(score.levels.subarray(column * bands, (column + 1) * bands), mean, time, columnSeconds / 3, trim);
    rig.bass.setLevel(mean * trim, time, columnSeconds / 3);

    for (const chime of this.chimesByColumn.get(column) ?? []) {
      const note = chimeNote(chime);
      rig[chime.colour].strike(note, time, chimeVelocity(chime.level));
      window.__scanNotes?.push({ audioTime: time, column, band: chime.band, warm: chime.warm, colour: chime.colour, note, root, pan, sound: rig.def.id });
      this.due.push({ time, chime, generation: this.generation });
    }
  }

  /**
   * Tell the screen about every chime whose moment has come, however late the page is: a note that
   * sounded always leaves its mark. (Tone's Draw, used before, drops a screen update that is more
   * than 0.25 s late, and a page busy drawing the globe in software can be that late: the note was
   * heard and never shown. Found by the globe's browser test, 15 Nov.)
   */
  private showDue(): void {
    if (!this.due.length) return;
    const now = Tone.immediate();
    while (this.due.length && this.due[0].time <= now) {
      const d = this.due.shift()!;
      if (d.generation === this.generation) this.listener.onChime?.(d.chime);
    }
  }

  /** Stop the clock and silence everything this player makes, echo included. */
  private halt(next: ScanState): void {
    this.generation++;
    // Chimes queued for the screen belong to the sound just cancelled.
    this.due = [];
    if (this.showTimer !== null) clearInterval(this.showTimer);
    this.showTimer = null;
    const now = Tone.immediate();
    if (this.clock) {
      if (next === 'paused') this.clock.pause(now);
      else this.clock.stop(now);
    }
    if (this.rig) {
      this.rig.choir.silence();
      this.rig.bass.silence();
      this.rig.warm.damp();
      this.rig.cool.damp();
      this.rig.blue.damp();
      this.rig.room.close();
    }
    this.setState(next);
  }

  private setState(state: ScanState): void {
    if (state === this.state) return;
    this.state = state;
    this.listener.onState(state);
  }
}

function disposeRig(rig: Rig): void {
  rig.choir.dispose();
  rig.bass.dispose();
  rig.warm.dispose();
  rig.cool.dispose();
  rig.blue.dispose();
  rig.volume.dispose();
  rig.panner.dispose();
  rig.room.dispose();
}
