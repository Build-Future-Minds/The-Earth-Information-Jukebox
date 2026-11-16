// One beat drawn to scale (Student B's Explain and How it's made pictures): the first pulse at the
// start, the second at 0.75 − 0.25 × alignment of the beat, and a dashed line at the middle, so
// "more even" is something you can see. Decorative: callers say the same in words.
import { longFraction } from '../audio/earthVoice';

const W = 120, H = 36;

export function BeatPicture({ alignment, label }: { alignment: number; label?: string }) {
  const x2 = longFraction(alignment) * W;
  return (
    <svg className="beat-picture" viewBox={`-4 -4 ${W + 8} ${H + 8}`} aria-hidden="true">
      <line className="bp-base" x1={0} x2={W} y1={H} y2={H} />
      <line className="bp-mid" x1={W / 2} x2={W / 2} y1={0} y2={H} />
      <line className="bp-edge" x1={W} x2={W} y1={0} y2={H} />
      <rect className="bp-lo" x={-2} y={0} width={5} height={H} />
      <rect className="bp-hi" x={x2 - 2.5} y={H * 0.35} width={5} height={H * 0.65} />
      {label && <text className="bp-label" x={W} y={-6} textAnchor="end">{label}</text>}
    </svg>
  );
}
