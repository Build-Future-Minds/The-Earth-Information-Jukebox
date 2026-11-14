// Does the app play exactly the rhythm Dev A's engine computed? (docs/CONTRACT.md section 4)
// For every features file that has a rhythm_reference beside it, every Earth note the app makes
// must equal the engine's: time, pitch, length, loudness and the `why` record.
import { describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020';
import { buildEarthTrack } from '../audio/earthVoice';
import type { Features, MusicEvent } from './types';

const json = import.meta.glob<{ default: unknown }>(
  [
    '../../../data/{features,rhythm_reference}.json',
    '../../../analysis/practice/{features,rhythm_reference}.practice.json',
    '../../../contracts/rhythm-reference.schema.json',
  ],
  { eager: true },
);
const get = (p: string) => json[`../../../${p}`]?.default;

const pairs = [
  { name: 'real data (data/)', features: 'data/features.json', ref: 'data/rhythm_reference.json' },
  {
    name: "Dev A's practice output",
    features: 'analysis/practice/features.practice.json',
    ref: 'analysis/practice/rhythm_reference.practice.json',
  },
].filter((p) => get(p.features) && get(p.ref));

interface Reference {
  rhythm: { beat_seconds: number };
  events: Record<string, MusicEvent[]>;
}

describe('the app plays the rhythm the engine computed', () => {
  it.skipIf(pairs.length > 0)('no features + rhythm_reference pair present yet', () => {});

  for (const p of pairs) {
    const features = get(p.features) as Features;
    const ref = get(p.ref) as Reference;

    it(`${p.name}: reference file matches contracts/rhythm-reference.schema.json`, () => {
      const schema = get('contracts/rhythm-reference.schema.json');
      if (!schema) return; // schema arrives with Dev A's branch
      const valid = new Ajv2020({ allErrors: true, strict: false }).compile(schema as object);
      expect(valid(ref), JSON.stringify(valid.errors)).toBe(true);
    });

    it(`${p.name}: same beat length`, () => {
      expect(ref.rhythm.beat_seconds).toBe(features.step_seconds);
    });

    for (const region of Object.keys(ref.events)) {
      it(`${p.name}: every note matches for ${region}`, () => {
        const app = buildEarthTrack(features, region).steps.flatMap((s) => s.events);
        const want = ref.events[region];
        expect(app.length).toBe(want.length);
        app.forEach((e, i) => {
          const w = want[i];
          expect(Math.abs(e.t - w.t), `note ${i} time`).toBeLessThan(1e-4);
          expect([e.voice, e.pitch, e.vel]).toEqual([w.voice, w.pitch, w.vel]);
          expect(Math.abs(e.dur - w.dur), `note ${i} length`).toBeLessThan(1e-9);
          expect(e.why!.region).toBe(w.why!.region);
          expect(e.why!.alignment).toBe(w.why!.alignment);
          expect(Math.abs(e.why!.long_fraction - w.why!.long_fraction)).toBeLessThan(1e-4);
          expect(e.why!.rule).toBe(w.why!.rule);
        });
      });
    }
  }
});
