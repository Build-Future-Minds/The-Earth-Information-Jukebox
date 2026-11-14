// Transport: start, pause, stop, replay, speed, volume, and timing of the Earth voice.
// All audio is synthesised locally with Tone.js (bundled). No sound until start() runs from a user press.

import * as Tone from 'tone';
import type { EarthTrack, TrackStep } from './earthVoice';

export type PlayState = 'stopped' | 'playing' | 'paused';

export interface TransportListener {
  /** Called at the moment a step starts sounding (or starts being quiet, if missing). */
  onStep: (step: TrackStep) => void;
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
    __earthSynth?: Tone.MembraneSynth;
  }
}
if (import.meta.env.DEV) window.__earthNotes = [];

export class Transport {
  private state: PlayState = 'stopped';
  private track: EarthTrack | null = null;
  private part: Tone.Part<{ time: Tone.Unit.Time } & PartItem> | null = null;
  private synth: Tone.MembraneSynth | null = null;
  private earthVolume: Tone.Volume | null = null;
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
    Tone.getTransport().start('+0.05');
    this.setState('playing');
  }

  pause(): void {
    if (this.state !== 'playing') return;
    // Tone.now() is 0.1 s in the future (its lookahead); immediate() is the real "now".
    Tone.getTransport().pause(Tone.immediate());
    this.silencePending();
    this.setState('paused');
  }

  /** Silences everything and rewinds to the beginning. */
  stop(): void {
    const transport = Tone.getTransport();
    transport.stop(Tone.immediate());
    transport.position = 0;
    this.silencePending();
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
    if (!this.synth) return; // audio not started yet; start() will build the part
    this.silencePending(); // drop the old region's pulses already queued for the next ~0.1 s

    // Region switch keeps the transport position (decision D1 in docs/DECISIONS.md):
    // the new region continues at the same step, i.e. the same source moment, so the
    // listener compares A and B while the first rhythm is still fresh in memory.
    // Both regions share one beat grid (step_seconds), so the switch lands on the beat.
    // Works for playing and paused alike: the transport keeps its position in both.
    this.part = this.buildPart(track);
  }

  setSpeed(speed: number): void {
    this.speed = speed;
    Tone.getTransport().bpm.value = BASE_BPM * speed;
  }

  setVolume(db: number): void {
    this.volumeDb = db;
    if (this.earthVolume) this.earthVolume.volume.value = db;
  }

  dispose(): void {
    this.disposed = true;
    this.stop();
    this.part?.dispose();
    this.synth?.dispose();
    this.earthVolume?.dispose();
  }

  private async initAudio(): Promise<void> {
    await Tone.start();
    this.earthVolume = new Tone.Volume(this.volumeDb).toDestination();
    // Fixed timbre: a short drum-like pulse. Carries no data.
    this.synth = new Tone.MembraneSynth({
      pitchDecay: 0.01,
      octaves: 2,
      envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.05 },
    }).connect(this.earthVolume);
    Tone.getTransport().bpm.value = BASE_BPM * this.speed;
    if (import.meta.env.DEV) window.__earthSynth = this.synth;
  }

  /** Tone schedules notes about 0.1 s ahead. Cancel those so Stop, Pause and a region switch
   *  are silent at once, and ignore screen updates queued for the cancelled sound. */
  private silencePending(): void {
    this.generation++;
    if (!this.synth) return;
    const now = Tone.immediate(); // not Tone.now(): that is 0.1 s ahead and would skip the queued pulses
    this.synth.envelope.cancel(now);
    this.synth.triggerRelease(now); // short release ramp from wherever the pulse is: no click
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
        this.synth?.triggerAttackRelease(Tone.Frequency(item.pitch, 'midi').toFrequency(), item.dur, time, item.vel);
        window.__earthNotes?.push({ audioTime: time, region: item.region, longFraction: item.longFraction, pulse: item.pulse, trackTime: item.trackTime });
      } else {
        // Draw runs the callback when the audio actually reaches `time`, so the screen
        // (status, explanation) follows the sound that is really playing.
        const gen = this.generation;
        Tone.getDraw().schedule(() => {
          if (gen === this.generation) this.listener.onStep(item.step);
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
function toTicks(seconds: number): Tone.Unit.Time {
  const ppq = Tone.getTransport().PPQ;
  return `${Math.round((seconds * BASE_BPM * ppq) / 60)}i`;
}
