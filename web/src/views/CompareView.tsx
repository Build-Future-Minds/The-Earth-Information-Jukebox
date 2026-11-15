// Compare: why the two regions of one picture sound different. Close-ups, then the tide table and
// curves, for the current picture only. Task 8 lays these out per region.
import type { PlayState } from '../audio/transport';
import { RegionCloseups } from '../components/RegionCloseups';
import { RhythmsPlot } from '../components/RhythmsPlot';
import type { RegionLook } from '../components/ExploreControls';
import type { Features, Scene } from '../data/types';

interface Props {
  scene: Scene;
  features: Features;
  imageUrl: string | null;
  regionId: string;
  playState: PlayState;
  getPosition: () => number;
  onListen: (regionId: string) => void;
  onStop: () => void;
  look: RegionLook;
}

export function CompareView(p: Props) {
  return (
    <>
      <RegionCloseups scene={p.scene} features={p.features} imageUrl={p.imageUrl} regionId={p.regionId} onListen={p.onListen}
        playing={p.playState === 'playing'} onStop={p.onStop} look={p.look} />
      <RhythmsPlot
        features={p.features}
        regions={p.scene.regions}
        activeRegionId={p.regionId}
        playState={p.playState}
        getPosition={p.getPosition}
        look={p.look}
      />
    </>
  );
}
