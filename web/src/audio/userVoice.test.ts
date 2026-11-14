// UserVoice with a fake Tone: every attack and release is recorded, so a stuck note shows up as
// an attack with no matching release. Covers the cases a code review found (14 Nov).
import { beforeEach, describe, expect, it, vi } from 'vitest';

const log: string[] = [];
let unlock: () => void = () => {};
let started: Promise<void> = Promise.resolve();

vi.mock('tone', () => {
  class PolySynth {
    connect() {
      return this;
    }
    triggerAttack(f: number) {
      log.push(`on ${f}`);
    }
    triggerRelease(f: number) {
      log.push(`off ${f}`);
    }
    releaseAll() {
      log.push('releaseAll');
    }
    dispose() {}
  }
  class Volume {
    volume = { value: 0 };
    toDestination() {
      return this;
    }
    dispose() {}
  }
  return {
    start: () => started,
    immediate: () => 0,
    Frequency: (n: number) => ({ toFrequency: () => n }),
    PolySynth,
    Synth: class {},
    Volume,
  };
});

const { UserVoice } = await import('./userVoice');

/** Notes attacked more times than released, i.e. still sounding. */
function stillSounding(): number[] {
  const count = new Map<number, number>();
  for (const e of log) {
    const [kind, f] = e.split(' ');
    if (kind === 'releaseAll') throw new Error('releaseAll must not be used: it can leave a later note stuck');
    count.set(+f, (count.get(+f) ?? 0) + (kind === 'on' ? 1 : -1));
  }
  return [...count].filter(([, c]) => c > 0).map(([n]) => n);
}
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  log.length = 0;
  started = Promise.resolve();
});

describe('UserVoice (melody)', () => {
  it('a press and release sounds once and stops', async () => {
    const v = new UserVoice();
    await v.noteOn(72);
    v.noteOff(72);
    expect(log).toEqual(['on 72', 'off 72']);
  });

  it('key auto-repeat starts one note, not many', async () => {
    const v = new UserVoice();
    for (let i = 0; i < 5; i++) await v.noteOn(76);
    v.noteOff(76);
    expect(log).toEqual(['on 76', 'off 76']);
  });

  it('Stop while holding, then auto-repeat, then release: nothing stuck', async () => {
    const v = new UserVoice();
    await v.noteOn(72);
    v.allOff(); // Esc or Stop while the key is down
    await v.noteOn(72); // the key's auto-repeat arrives
    v.noteOff(72); // key released
    expect(stillSounding()).toEqual([]);
  });

  it('a quick first tap while audio is starting never starts late', async () => {
    started = new Promise((r) => (unlock = r));
    const v = new UserVoice();
    const pending = v.noteOn(72);
    v.noteOff(72);
    unlock();
    await pending;
    expect(log).toEqual([]);
  });

  it('tap, release, tap during start-up gives exactly one note', async () => {
    started = new Promise((r) => (unlock = r));
    const v = new UserVoice();
    const first = v.noteOn(72);
    v.noteOff(72);
    const second = v.noteOn(72);
    unlock();
    await Promise.all([first, second]);
    expect(log).toEqual(['on 72']);
    v.noteOff(72);
    expect(stillSounding()).toEqual([]);
  });

  it('keyboard and mouse on the same note: it stops only when both let go', async () => {
    const v = new UserVoice();
    await v.noteOn(79, 0.7, 'key');
    await v.noteOn(79, 0.7, 'pointer');
    v.noteOff(79, 'pointer');
    expect(stillSounding()).toEqual([79]); // key still down
    v.noteOff(79, 'key');
    expect(stillSounding()).toEqual([]);
    expect(log).toEqual(['on 79', 'off 79']);
  });

  it('allOff releases every sounding note individually', async () => {
    const v = new UserVoice();
    await v.noteOn(72);
    await v.noteOn(76, 0.7, 'pointer');
    v.allOff();
    expect(stillSounding()).toEqual([]);
  });

  it('reports held notes for the on-screen highlight, including after Stop', async () => {
    const seen: number[][] = [];
    const v = new UserVoice((held) => seen.push([...held]));
    await v.noteOn(72);
    await v.noteOn(74);
    v.allOff();
    await flush();
    expect(seen.at(-1)).toEqual([]);
    expect(seen).toContainEqual([72, 74]);
  });

  it('ignores values that are not MIDI notes', async () => {
    const v = new UserVoice();
    await v.noteOn(128);
    await v.noteOn(-1);
    await v.noteOn(60.5);
    expect(log).toEqual([]);
  });
});
