// Compare view helpers. Pure functions, so the curve and the words are unit-tested.
import { longFraction } from '../audio/earthVoice';
import type { Step } from '../data/types';
import { describeSplit } from './RhythmExplanation';

/**
 * The tide curve: alignment over the frames, x across `width`, alignment 1 at the top of `height`.
 * A missing frame lifts the pen (never drawn as zero). A frame with no measured neighbour, including
 * a picture with only one frame, is returned as a dot, because a one-point line draws nothing.
 */
export function tideCurve(steps: Step[], width: number, height: number): { path: string; dots: { x: number; y: number }[] } {
  const n = steps.length;
  const x = (i: number) => (n > 1 ? (i / (n - 1)) * width : 0);
  const y = (a: number) => height - a * height;
  const isOk = (i: number) => i >= 0 && i < n && steps[i].status === 'ok';
  const parts: string[] = [];
  const dots: { x: number; y: number }[] = [];
  steps.forEach((s, i) => {
    if (s.status !== 'ok') return;
    if (!isOk(i - 1) && !isOk(i + 1)) {
      dots.push({ x: x(i), y: y(s.alignment) });
      return;
    }
    parts.push(`${isOk(i - 1) ? 'L' : 'M'}${x(i).toFixed(1)} ${y(s.alignment).toFixed(1)}`);
  });
  return { path: parts.join(' '), dots };
}

/** The word under a numeral, the same words Explain uses ("even", "slight lilt", "long–short"). */
export function shapeWord(alignment: number): 'Lined up' | 'Partly lined up' | 'Swirly' {
  const kind = describeSplit(longFraction(alignment));
  return kind === 'even' ? 'Lined up' : kind === 'long–short' ? 'Swirly' : 'Partly lined up';
}
