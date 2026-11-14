// Owner: Student B (v1 by Dev B). Explains the rhythm that is sounding right now.
// It reads only the `why` on the notes actually playing, so it cannot disagree with the sound.
// Ask Dev A to check every sentence means what the code does.
import { forwardRef } from 'react';
import type { TrackStep } from '../audio/earthVoice';

/** Words for the split. Design choice; Dev A to confirm the cut points. */
export function describeSplit(longFraction: number): 'even' | 'slight lilt' | 'short–long' {
  if (longFraction <= 0.56) return 'even';
  if (longFraction >= 0.66) return 'short–long';
  return 'slight lilt';
}

export function explain(step: TrackStep | null): string {
  if (!step) return 'Press Start to hear a rhythm, then ask for an explanation.';
  if (step.step.status === 'missing') {
    return `There is not enough visible detail here to make a rhythm, so the Earth voice is quiet. Reason: ${step.step.reason}.`;
  }
  const why = step.events[0].why!;
  const kind = describeSplit(why.long_fraction);
  const pct = Math.round(why.long_fraction * 100);
  const because =
    kind === 'even'
      ? 'most visible lines in this region run the same way'
      : kind === 'short–long'
        ? 'the visible lines in this region run in many directions'
        : 'the visible lines in this region partly share a direction';
  const pulse = kind === 'slight lilt' ? 'has a slight lilt' : `is ${kind}`;
  return (
    `The pulse ${pulse} because ${because}. ` +
    `Alignment is ${why.alignment.toFixed(2)} (0 = every which way, 1 = all the same way), ` +
    `so the second pulse falls ${pct}% of the way through the beat (rule: ${why.rule}).`
  );
}

export const DISCLAIMER =
  'This is a visualization of a computer model. The rhythm rule is our choice. ' +
  'It describes the image, not water speed, turbulence or ocean health.';

interface Props {
  step: TrackStep | null;
  regionLabel: string;
}

export const RhythmExplanation = forwardRef<HTMLElement, Props>(function RhythmExplanation(
  { step, regionLabel },
  ref,
) {
  const when = step?.step.source_time ? ` Model time: ${step.step.source_time}.` : '';
  return (
    <section ref={ref} tabIndex={-1} className="explanation" aria-labelledby="explain-heading">
      <h2 id="explain-heading">Why it sounds like this: {regionLabel}</h2>
      <p>{explain(step)}{when}</p>
      <p className="muted">{DISCLAIMER}</p>
    </section>
  );
});
