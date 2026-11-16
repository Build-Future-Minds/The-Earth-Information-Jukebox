// Owner: Student B (v1 by Dev B). Explains the rhythm that is sounding right now.
// It reads only the `why` on the notes actually playing, so it cannot disagree with the sound.
// Ask Dev A to check every sentence means what the code does.
import { forwardRef, type CSSProperties } from 'react';
import { thumbCss } from '../data/selection';
import { BeatPicture } from './BeatPicture';
import { longFraction, type TrackStep } from '../audio/earthVoice';
import type { Region, Step } from '../data/types';

/**
 * Alignment gap below which two regions are called "about as even as" each other instead of more or less even.
 * Design choice. Same starting value as `--min-difference` in tools/build_listening_tasks.py;
 * Dev A to confirm the final number.
 */
export const SAME_BELOW = 0.2;

/** The other region, for the comparison line. `step` is its measurement at the same moment. */
export interface OtherRegion {
  label: string;
  step: Step | null;
}

/** The other region's step at the same source moment, or null when it has none. */
export function stepAtSameMoment(steps: Step[], step: Step, otherRegionId: string): Step | null {
  const same = (s: Step) => (s.frame !== undefined && step.frame !== undefined ? s.frame === step.frame : s.t === step.t);
  return steps.find((s) => s.region === otherRegionId && same(s)) ?? null;
}

/**
 * One sentence comparing this region with the other at the same moment, using the same alignment
 * the sound is made from. On real data no region reaches "even" on its own, so the single-region
 * wording alone cannot say which region is the more even one. Returns null (no line) when either
 * region is missing: missing information is never turned into a number.
 */
export function compareLine(step: TrackStep | null, other?: OtherRegion | null): string | null {
  if (!step || !other) return null;
  const mine = step.step, theirs = other.step;
  if (mine.status !== 'ok' || !theirs || theirs.status !== 'ok') return null;
  const pct = (a: number) => Math.round(longFraction(a) * 100);
  const numbers = `second pulse at ${pct(mine.alignment)}% of the beat, against ${pct(theirs.alignment)}% for ${other.label}`;
  const gap = Math.round((mine.alignment - theirs.alignment) * 1e6) / 1e6;
  const lead = `Compared with ${other.label} at the same moment, this region`;
  if (Math.abs(gap) < SAME_BELOW) {
    // Says only what the numbers show. Whether people can hear the difference is for the listening test to find out.
    return `${lead} is about as even as ${other.label} (${numbers}; the two alignments differ by less than ${SAME_BELOW.toFixed(2)}).`;
  }
  return `${lead} is ${gap > 0 ? 'more even' : 'less even, more long–short'} (${numbers}).`;
}

/** Words for the split. Design choice; Dev A to confirm the cut points. */
export function describeSplit(longFraction: number): 'even' | 'slight lilt' | 'long–short' {
  if (longFraction <= 0.56) return 'even';
  if (longFraction >= 0.66) return 'long–short';
  return 'slight lilt';
}

export function explain(step: TrackStep | null, other?: OtherRegion | null): string {
  if (!step) return 'Press Play to hear a rhythm, then ask for an explanation.';
  if (step.step.status === 'missing') {
    return `There is not enough visible detail here to make a rhythm, so the Earth voice is quiet. Reason: ${step.step.reason}.`;
  }
  const why = step.events[0].why!;
  const kind = describeSplit(why.long_fraction);
  const pct = Math.round(why.long_fraction * 100);
  const because =
    kind === 'even'
      ? 'most visible lines in this region run the same way'
      : kind === 'long–short'
        ? 'the visible lines in this region run in many directions'
        : 'the visible lines in this region partly share a direction';
  const pulse = kind === 'slight lilt' ? 'has a slight lilt' : `is ${kind}`;
  const compare = compareLine(step, other);
  return (
    `The pulse ${pulse} because ${because}. ` +
    `Alignment is ${why.alignment.toFixed(2)} (0 = every which way, 1 = all the same way), ` +
    // The formula lives on How it's made (team: less text); the numbers stay.
    `so the second pulse falls ${pct}% of the way through the beat.` +
    (compare ? ` ${compare}` : '')
  );
}

/** One sentence under the Explain picture (Student B), with the number that made the rhythm. */
export function explainShort(step: TrackStep | null, label: string): string {
  if (!step) return 'Press Play to hear a rhythm, then ask for an explanation.';
  if (step.step.status === 'missing') return `There is not enough visible detail in ${label} here, so the Earth voice is quiet.`;
  const why = step.events[0].why!;
  const kind = describeSplit(why.long_fraction);
  const lines =
    kind === 'even' ? 'line up, so its second pulse comes near the middle'
      : kind === 'long–short' ? 'point every which way, so its second pulse comes late'
        : 'partly line up, so its second pulse comes a little late';
  return `${label}'s lines ${lines}. Alignment is ${why.alignment.toFixed(2)}.`;
}

/** A row of the Explain picture: one region's crop, then its beat drawn to scale. */
export interface ExplainRow {
  letter: string;
  label: string;
  region: Region;
  step: Step | null;
  playing: boolean;
  colour: CSSProperties;
}

export const DISCLAIMER =
  'This is a visualization of a computer model. The rhythm rule is our choice. ' +
  'It describes the image, not water speed, turbulence or ocean health.';

interface Props {
  step: TrackStep | null;
  regionLabel: string;
  other?: OtherRegion | null;
  /** Student B's picture: this region and the other, crop → beat. */
  rows?: ExplainRow[];
  imageUrl?: string | null;
  frame?: { width: number; height: number };
}

export const RhythmExplanation = forwardRef<HTMLElement, Props>(function RhythmExplanation(
  { step, regionLabel, other, rows = [], imageUrl, frame },
  ref,
) {
  const when = step?.step.source_time ? ` Model time: ${step.step.source_time}.` : '';
  return (
    <section ref={ref} tabIndex={-1} className="explanation" aria-labelledby="explain-heading">
      <h2 id="explain-heading">Why it sounds like this: {regionLabel}</h2>
      <p className="explain-line">{explainShort(step, regionLabel)}</p>
      <div className="explain-picture" aria-hidden="true">
        {rows.map((row) => (
          <div key={row.region.id} className={row.playing ? 'explain-row playing' : 'explain-row'} style={row.colour}>
            <span className="region-badge">{row.letter}</span>
            {imageUrl && frame && (
              <span className="region-thumb" style={{ backgroundImage: `url(${imageUrl})`, ...thumbCss(row.region, frame, 44) }} />
            )}
            <svg className="explain-arrow" viewBox="0 0 20 10" width="20" height="10"><path d="M1 5h16M13 1l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {row.step?.status === 'ok' ? <BeatPicture alignment={row.step.alignment} /> : <span className="muted small">no data</span>}
          </div>
        ))}
      </div>
      {/* The full sentence with the comparison, for screen readers. */}
      <p className="sr-only">{explain(step, other)}{when}</p>
      {/* The honesty lines are said once, on How it's made (DISCLAIMER is used there). */}
    </section>
  );
});
