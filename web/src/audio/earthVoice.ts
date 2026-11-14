// Earth voice: turns features.json steps into Earth-voice notes, each with a `why` record.
// Pure functions only (no audio here), so the same input always gives the same notes.
// The rule comes from docs/mapping_spec.md (owner: Dev A). Tune the two end points there, then here.

import type { Features, MusicEvent, Step } from '../data/types';

/** Share of the beat before the second pulse when alignment A = 0 (strong short–long). */
export const LONG_AT_A0 = 0.75;
/** Share of the beat before the second pulse when alignment A = 1 (even). */
export const LONG_AT_A1 = 0.5;
export const RULE_TEXT = `long_fraction = ${LONG_AT_A0} - ${LONG_AT_A0 - LONG_AT_A1} * alignment`;

/** Fixed sound settings. They carry no data and are identical for both regions. */
export const EARTH_PITCH = 64; // MIDI E4
export const EARTH_VELOCITY = 0.8;
export const PULSE_SECONDS = 0.08;

export function longFraction(alignment: number): number {
  const a = Math.min(1, Math.max(0, alignment));
  return LONG_AT_A0 - (LONG_AT_A0 - LONG_AT_A1) * a;
}

/** One data step as it will be played: its time slot plus the notes it makes (none when missing). */
export interface TrackStep {
  t: number;
  dur: number;
  step: Step;
  events: MusicEvent[];
}

export interface EarthTrack {
  regionId: string;
  steps: TrackStep[];
  /** Seconds for one pass through the region's steps at speed 1. */
  length: number;
}

export function stepToEvents(step: Step, t: number, beatSeconds: number): MusicEvent[] {
  // Missing information: the Earth voice is quiet. Never invent a rhythm, never treat it as A = 0.
  if (step.status !== 'ok') return [];
  const lf = longFraction(step.alignment);
  const why = { region: step.region, alignment: step.alignment, long_fraction: lf, rule: RULE_TEXT };
  const dur = Math.min(PULSE_SECONDS, beatSeconds * (1 - lf) * 0.9);
  return [
    { t, voice: 'earth', pitch: EARTH_PITCH, dur, vel: EARTH_VELOCITY, why },
    { t: t + lf * beatSeconds, voice: 'earth', pitch: EARTH_PITCH, dur, vel: EARTH_VELOCITY, why },
  ];
}

/** Build the playable track for one region. One data step = one beat of `step_seconds`. */
export function buildEarthTrack(features: Features, regionId: string): EarthTrack {
  const beat = features.step_seconds;
  const regionSteps = features.steps
    .filter((s) => s.region === regionId)
    .sort((a, b) => a.t - b.t);
  if (regionSteps.length === 0) throw new Error(`No steps for region "${regionId}" in features.json`);

  const t0 = regionSteps[0].t;
  const steps = regionSteps.map((step) => {
    const t = step.t - t0;
    return { t, dur: beat, step, events: stepToEvents(step, t, beat) };
  });
  const last = steps[steps.length - 1];
  return { regionId, steps, length: last.t + last.dur };
}
