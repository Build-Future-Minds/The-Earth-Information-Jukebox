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

type PartItem = { kind: 'step'; step: TrackStep } | { kind: 'note'; pitch: number; dur: number; vel: number };

export class Transport {
  private state: PlayState = 'stopped';
  private track: EarthTrack | null = null;
  private part: Tone.Part<{ time: Tone.Unit.Time } & PartItem> | null = null;
  private synth: Tone.MembraneSynth | null = null;
  private earthVolume: Tone.Volume | null = null;
  private volumeDb = -6;
  private speed = 1;

  constructor(private listener: TransportListener) {}

  getState(): PlayState {
    return this.state;
  }

  /** Must be called from a user gesture (click or key press): browsers block audio before that. */
  async start(): Promise<void> {
    if (!this.track) return;
    if (!this.synth) await this.initAudio();
    if (!this.part) this.part = this.buildPart(this.track);
    Tone.getTransport().start('+0.05');
    this.setState('playing');
  }

  pause(): void {
    if (this.state !== 'playing') return;
    Tone.getTransport().pause();
    this.setState('paused');
  }

  /** Silences everything and rewinds to the beginning. */
  stop(): void {
    const transport = Tone.getTransport();
    transport.stop();
    transport.position = 0;
    this.synth?.triggerRelease(Tone.now());
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
  }

  private buildPart(track: EarthTrack) {
    const items: ({ time: Tone.Unit.Time } & PartItem)[] = [];
    for (const step of track.steps) {
      items.push({ time: toTicks(step.t), kind: 'step', step });
      for (const ev of step.events) {
        items.push({ time: toTicks(ev.t), kind: 'note', pitch: ev.pitch, dur: ev.dur, vel: ev.vel });
      }
    }
    const part = new Tone.Part((time, item) => {
      if (item.kind === 'note') {
        this.synth?.triggerAttackRelease(Tone.Frequency(item.pitch, 'midi').toFrequency(), item.dur, time, item.vel);
      } else {
        // Draw runs the callback when the audio actually reaches `time`, so the screen
        // (status, explanation) follows the sound that is really playing.
        Tone.getDraw().schedule(() => this.listener.onStep(item.step), time);
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
