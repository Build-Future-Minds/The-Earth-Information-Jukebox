// Transport: start, pause, stop, replay, speed, volume, and timing of the Earth voice.
// All audio is synthesised locally with Tone.js (bundled). No sound until start() runs from a user press.
// This file decides when each Earth note sounds; what it sounds like is earthSound.ts.

import * as Tone from 'tone';
import type { EarthTrack, TrackStep } from './earthVoice';
import { createEarthSound, DEFAULT_EARTH_SOUND, type EarthProbe, type EarthSound, type EarthSoundId, type Silence } from './earthSound';

export type PlayState = 'stopped' | 'playing' | 'paused';

export interface TransportListener {
  /** Called at the moment a step starts sounding (or starts being quiet, if missing). `beat` counts
   *  beats from the start of play, the count the Earth band's chords follow (earthBand.ts, chordAt). */
  onStep: (step: TrackStep, beat: number) => void;
  onState: (state: PlayState) => void;
}

/** Speed 1 = 120 bpm. Times are scheduled in ticks, so changing bpm stretches the whole
 *  rhythm evenly: the long/short ratio (the data) never changes with speed. */
const BASE_BPM = 120;

type PartItem =
  | { kind: 'step'; step: TrackStep }
  | { kind: 'note'; pitch: number; dur: number; vel: number; region: string; longFraction: number; pulse: number; trackTime: number };

/** Development-only record of every Earth note handed to the synth, with its exact audio time.
 *  Used by browser tests to check the real sound (not just the screen). Absent in production builds. */
export interface NoteLogEntry {
  audioTime: number;
  region: string;
  longFraction: number;
  /** 0 = first pulse of the beat, 1 = second */
  pulse: number;
  /** Seconds into the region's loop at speed 1 (from earthVoice): lets tests compare with the schedule */
  trackTime: number;
}
declare global {
  interface Window {
    __earthNotes?: NoteLogEntry[];
    __earthSynth?: EarthProbe;
  }
}
if (import.meta.env.DEV) window.__earthNotes = [];

/** Region switch: the old region's queued pulses end; the band plays on (it is the same for both). */
const SWITCH: Silence = { band: false, echo: false };
/** Seek: everything queued for the old position ends; the room's echo may ring on. */
const SEEK: Silence = { band: true, echo: false };
/** Stop and Pause: silence, echo included. */
const STOP: Silence = { band: true, echo: true };

export class Transport {
  private state: PlayState = 'stopped';
  private track: EarthTrack | null = null;
  private part: Tone.Part<{ time: Tone.Unit.Time } & PartItem> | null = null;
  private sound: EarthSound | null = null;
  private soundId: EarthSoundId = DEFAULT_EARTH_SOUND;
  private volumeDb = -6;
  private speed = 1;
  /** Shared so a double press of Start creates one synth, not two. */
  private initP: Promise<void> | null = null;
  private disposed = false;
  /** Bumped whenever queued sound is cancelled, so screen updates queued for it are ignored. */
  private generation = 0;

  constructor(private listener: TransportListener) {}

  getState(): PlayState {
    return this.state;
  }

  /** Must be called from a user gesture (click or key press): browsers block audio before that. */
  async start(): Promise<void> {
    if (!this.track || this.disposed || this.state === 'playing') return;
    this.initP ??= this.initAudio();
    await this.initP;
    // Something may have changed while the browser was unlocking audio.
    if (!this.track || this.disposed || this.getState() === 'playing') return;
    if (!this.part) this.part = this.buildPart(this.track);
    this.sound?.open(); // Stop and Pause close the room; let sound through again
    Tone.getTransport().start('+0.05');
    this.setState('playing');
  }

  pause(): void {
    if (this.state !== 'playing') return;
    // Tone.now() is 0.1 s in the future (its lookahead); immediate() is the real "now".
    Tone.getTransport().pause(Tone.immediate());
    this.silencePending(STOP);
    this.setState('paused');
  }

  /** Silences everything and rewinds to the beginning. */
  stop(): void {
    const transport = Tone.getTransport();
    transport.stop(Tone.immediate());
    transport.position = 0;
    this.silencePending(STOP);
    this.setState('stopped');
  }

  /** Same track from the beginning. The track is rebuilt from the same data, so the rhythm is identical. */
  async replay(): Promise<void> {
    this.stop();
    await this.start();
  }

  /** Load the Earth track for a region. Safe to call while stopped, paused or playing. */
  setTrack(track: EarthTrack): void {
    this.track = track;
    this.part?.dispose();
    this.part = null;
    if (!this.sound) return; // audio not started yet; start() will build the part
    this.silencePending(SWITCH); // drop the old region's pulses already queued for the next ~0.1 s

    // Region switch keeps the transport position (decision D1 in docs/DECISIONS.md):
    // the new region continues at the same step, i.e. the same source moment, so the
    // listener compares A and B while the first rhythm is still fresh in memory.
    // Both regions share one beat grid (step_seconds), so the switch lands on the beat.
    // Works for playing and paused alike: the transport keeps its position in both.
    this.part = this.buildPart(track);
  }

  /** Choose what the Earth voice sounds like (earthSound.ts). The notes and their times do not
   *  change. While playing, the new sound takes over from the next note. */
  setSound(id: EarthSoundId): void {
    if (id === this.soundId) return;
    this.soundId = id;
    const old = this.sound;
    if (!old) return; // audio not started yet: initAudio() will build this one
    old.silence(STOP);
    setTimeout(() => old.dispose(), 600); // after its notes have faded
    this.sound = createEarthSound(id, this.volumeDb);
    if (this.state === 'playing') this.sound.open();
    if (import.meta.env.DEV) window.__earthSynth = this.sound.probe;
  }

  /** Where playback is inside the current region's loop, in track seconds at speed 1, read from
   *  the real audio clock (not Tone.now(), which runs 0.1 s ahead). For the beat visualizer. */
  loopPosition(): number {
    if (!this.track || this.state === 'stopped') return 0;
    const transport = Tone.getTransport();
    const ticks = transport.getTicksAtTime(Tone.immediate());
    const loop = ticksOf(this.track.length);
    const inLoop = ((ticks % loop) + loop) % loop;
    return (inLoop * 60) / (BASE_BPM * transport.PPQ);
  }

  /** Jump to a point in the current region's loop (track seconds at speed 1). Playing or paused only. */
  seek(trackSeconds: number): void {
    if (!this.track || this.state === 'stopped') return;
    const t = Math.min(this.track.length, Math.max(0, trackSeconds));
    this.silencePending(SEEK); // drop pulses already queued for the old position
    Tone.getTransport().ticks = ticksOf(t);
  }

  setSpeed(speed: number): void {
    this.speed = speed;
    Tone.getTransport().bpm.value = BASE_BPM * speed;
  }

  setVolume(db: number): void {
    this.volumeDb = db;
    this.sound?.setVolume(db);
  }

  dispose(): void {
    this.disposed = true;
    this.stop();
    this.part?.dispose();
    this.sound?.dispose();
  }

  private async initAudio(): Promise<void> {
    await Tone.start();
    this.sound = createEarthSound(this.soundId, this.volumeDb);
    Tone.getTransport().bpm.value = BASE_BPM * this.speed;
    if (import.meta.env.DEV) window.__earthSynth = this.sound.probe;
  }

  /** Tone schedules notes about 0.1 s ahead. Cancel those so Stop, Pause and a region switch
   *  are silent at once, and ignore screen updates queued for the cancelled sound. */
  private silencePending(what: Silence): void {
    this.generation++;
    this.sound?.silence(what);
  }

  private buildPart(track: EarthTrack) {
    const items: ({ time: Tone.Unit.Time } & PartItem)[] = [];
    for (const step of track.steps) {
      items.push({ time: toTicks(step.t), kind: 'step', step });
      for (const [pulse, ev] of step.events.entries()) {
        items.push({
          time: toTicks(ev.t),
          kind: 'note',
          pitch: ev.pitch,
          dur: ev.dur,
          vel: ev.vel,
          region: ev.why!.region,
          longFraction: ev.why!.long_fraction,
          pulse,
          trackTime: ev.t,
        });
      }
    }
    const part = new Tone.Part((time, item) => {
      if (item.kind === 'note') {
        this.sound?.note(time, item.pitch, item.dur, item.vel);
        window.__earthNotes?.push({ audioTime: time, region: item.region, longFraction: item.longFraction, pulse: item.pulse, trackTime: item.trackTime });
      } else {
        // Every step is one beat. The band (if any) plays on beat starts only, missing or not;
        // the beat is counted from the start of play, so its chords move on across loops.
        const transport = Tone.getTransport();
        const beat = Math.round(transport.getTicksAtTime(time) / ticksOf(item.step.dur));
        const beatSeconds = (item.step.dur * BASE_BPM) / transport.bpm.value;
        this.sound?.beat(time, beat, beatSeconds, item.step.step.status !== 'ok');
        // Draw runs the callback when the audio actually reaches `time`, so the screen
        // (status, explanation) follows the sound that is really playing.
        const gen = this.generation;
        Tone.getDraw().schedule(() => {
          if (gen === this.generation) this.listener.onStep(item.step, beat);
        }, time);
      }
    }, items);
    part.loop = true;
    part.loopEnd = toTicks(track.length);
    part.start(0);
    return part;
  }

  private setState(state: PlayState): void {
    this.state = state;
    this.listener.onState(state);
  }
}

/** Seconds at speed 1 (120 bpm, so 1 beat = 0.5 s) to transport ticks. */
function ticksOf(seconds: number): number {
  return Math.round((seconds * BASE_BPM * Tone.getTransport().PPQ) / 60);
}
function toTicks(seconds: number): Tone.Unit.Time {
  return `${ticksOf(seconds)}i`;
}
