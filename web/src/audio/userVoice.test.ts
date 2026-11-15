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
    connect() {
      return this;
    }
    dispose() {}
  }
  // The room (reverb, gate, limiter) and the struck instruments: nodes that only need to connect.
  const param = () => ({ cancelScheduledValues() {}, setTargetAtTime() {}, setValueAtTime() {}, linearRampToValueAtTime() {} });
  class Node {
    gain = param();
    connect() {
      return this;
    }
    toDestination() {
      return this;
    }
    dispose() {}
  }
  class Oscillator extends Node {
    onstop: () => void = () => {};
    constructor(f: number) {
      super();
      struck.push(Math.round(f));
    }
    start() {
      return this;
    }
    stop() {
      return this;
    }
  }
  return {
    start: () => started,
    immediate: () => 0,
    Frequency: (n: number) => ({ toFrequency: () => n }),
    PolySynth: class extends PolySynth {
      volume = { value: 0 };
    },
    Synth: class {},
    FMSynth: class {},
    Volume,
    Gain: Node,
    Reverb: Node,
    Limiter: Node,
    Filter: Node,
    Noise: class extends Node {
      start() {
        return this;
      }
    },
    Oscillator,
  };
});
/** Lowest tone of every bar struck (the fake Frequency maps a MIDI note to itself). */
const struck: number[] = [];

const { UserVoice, KEYBOARD_NOTES } = await import('./userVoice');

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
  struck.length = 0;
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

describe('UserVoice instruments (play along)', () => {
  it('the eight melody keys are the picture scan’s scale, from C5 to E6', async () => {
    const { Note, Scale } = await import('tonal');
    const { SCAN_SCALE } = await import('./scanScore');
    const scale = Scale.rangeOf(SCAN_SCALE)('C5', 'E6').map((name) => Note.midi(name as string));
    expect(Object.values(KEYBOARD_NOTES)).toEqual(scale);
  });

  it('Stop (hush) lets every held note go, one by one', async () => {
    const v = new UserVoice();
    await v.noteOn(72);
    await v.noteOn(76);
    v.hush();
    expect(stillSounding()).toEqual([]);
  });

  it('changing the sound while a key is down leaves nothing stuck', async () => {
    const v = new UserVoice();
    await v.noteOn(72);
    v.setInstrument('choir');
    expect(stillSounding()).toEqual([]);
    await v.noteOn(74); // the new instrument plays
    v.noteOff(74);
    expect(log).toEqual(['on 72', 'off 72', 'on 74', 'off 74']);
  });

  it('a sound chosen before the first press is the one that plays', async () => {
    const v = new UserVoice();
    v.setInstrument('marimba');
    await v.noteOn(72);
    expect(log).toEqual([]); // not the held synth
    expect(struck[0]).toBe(72); // the bar's lowest tone is the note itself
  });

  it('a struck note has its bar\'s tones: marimba 1 : 4 : 9.2, bells 1 : 2.7565 : 5.4039 : 8.933, music box 1 : 6.2669 : 17.5475', async () => {
    const v = new UserVoice();
    v.setInstrument('marimba');
    await v.noteOn(100);
    expect(struck).toEqual([100, 400, 920]);
    struck.length = 0;
    v.noteOff(100);
    v.setInstrument('bells');
    await v.noteOn(100);
    // 101 is the shimmer: a quieter copy of the lowest tone 1.3 Hz above it (rounded by the fake oscillator).
    expect(struck).toEqual([100, 101, 276, 540, 893]);
    struck.length = 0;
    v.noteOff(100);
    v.setInstrument('musicbox');
    await v.noteOn(100);
    expect(struck).toEqual([100, 627, 1755]);
  });

  it('a struck note rings by itself: letting go sends no release, and no voice counts as held after it', async () => {
    const v = new UserVoice();
    v.setInstrument('bells');
    await v.noteOn(72);
    expect(v.activeVoices()).toBe(1); // the key is down
    v.noteOff(72);
    expect(log).toEqual([]);
    expect(v.activeVoices()).toBe(0);
  });
});
