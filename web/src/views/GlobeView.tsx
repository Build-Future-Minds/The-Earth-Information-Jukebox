// Globe: the chosen picture wrapped on a globe, its own tab (Dev B, 15 Nov). Loaded only when opened.
// It also plays the picture scan on the globe; the page's Stop and Esc silence it through `scanRef`.
import { lazy, Suspense, type Ref } from 'react';
import type { Source } from '../data/sources';
import type { ScanHandle } from '../scan/useScan';

const GlobeSection = lazy(() => import('../globe/GlobeSection'));

export function GlobeTab({ source, regionId, onPlayRegion, playing, onStop, speed, onSpeed, scanRef }: {
  source: Source; regionId: string; onPlayRegion: (id: string) => void; playing: boolean; onStop: () => void;
  speed: number; onSpeed: (speed: number) => void; scanRef: Ref<ScanHandle>;
}) {
  return (
    <section className="globe-panel" aria-label="Explore the globe">
      <Suspense fallback={<p className="muted">Loading the globe…</p>}>
        <GlobeSection source={source} regionId={regionId} onPlayRegion={onPlayRegion} playing={playing} onStop={onStop}
          speed={speed} onSpeed={onSpeed} scanRef={scanRef} />
      </Suspense>
    </section>
  );
}
