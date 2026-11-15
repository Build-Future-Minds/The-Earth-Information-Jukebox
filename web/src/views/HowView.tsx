// How it's made: picture → ticks → pulses, the rule, the honesty lines and the credit.
// Task 4 moves today's explainer and footer here; Task 9 replaces them with Student B's strip.
import { LookingAt } from '../components/LookingAt';
import type { Scene } from '../data/types';

export function HowView({ scene }: { scene: Scene }) {
  return (
    <>
      <LookingAt />
      <footer>
        <h3>Source and credit</h3>
        <p>
          <a href={scene.source.url}>{scene.source.title}</a>. {scene.source.credit}.
        </p>
        <p>Data kind: {scene.source.data_kind.replace(/_/g, ' ')}.</p>
        <ul>
          {scene.source.limitations.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <p className="muted">Cached image measurements with live sound. All sounds are synthesised in your browser.</p>
      </footer>
    </>
  );
}
