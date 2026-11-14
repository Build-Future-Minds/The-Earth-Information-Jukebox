// The measurement behind the rhythm sounding now, in Student B's "Axis Specimen" style (DESIGN.md):
// the alignment number's font weight is the value itself (200 = every which way, 800 = all one way).
// Visual only: the status line and "Explain this rhythm" give screen readers the same facts.
import type { TrackStep } from '../audio/earthVoice';

interface Props {
  step: TrackStep | null;
  regionLabel: string;
}

/** Weight Is the Value: alignment 0 → 200, alignment 1 → 800. */
export const weightFor = (alignment: number) => Math.round(200 + 600 * Math.min(1, Math.max(0, alignment)));

export function NowPlaying({ step, regionLabel }: Props) {
  const why = step?.events[0]?.why;
  const missing = step?.step.status === 'missing';
  return (
    <div className="now-playing" aria-hidden="true">
      <span className="np-value" style={{ fontWeight: why ? weightFor(why.alignment) : 500 }}>
        {why ? why.alignment.toFixed(2) : '–'}
      </span>
      <span className="np-readout">
        <span>{step ? regionLabel : 'Not playing'} · alignment</span>
        <span>
          {why
            ? `second pulse at ${Math.round(why.long_fraction * 100)}% of the beat · wght ${weightFor(why.alignment)}`
            : missing
              ? 'missing information · Earth voice quiet'
              : 'press Start'}
        </span>
      </span>
    </div>
  );
}
