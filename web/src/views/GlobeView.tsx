// Globe: the chosen picture wrapped on a globe, its own tab (Dev B, 15 Nov). Loaded only when opened.
import { lazy, Suspense } from 'react';
import type { Source } from '../data/sources';

const GlobeSection = lazy(() => import('../globe/GlobeSection'));

export function GlobeTab({ source, regionId, onPlayRegion, playing, onStop }: {
  source: Source; regionId: string; onPlayRegion: (id: string) => void; playing: boolean; onStop: () => void;
}) {
  return (
    <section className="globe-panel" aria-label="Explore the globe">
      <Suspense fallback={<p className="muted">Loading the globe…</p>}>
        <GlobeSection source={source} regionId={regionId} onPlayRegion={onPlayRegion} playing={playing} onStop={onStop} />
      </Suspense>
    </section>
  );
}
