// Compare: why the two regions of one picture sound different. Close-ups, then "What you hear now"
// (the numbers behind the beat that is sounding, both regions at the same moment), then the tide
// table and curves, for the current picture only. Task 8 lays these out per region.
import type { EarthSoundId } from '../audio/earthSound';
import type { PlayState } from '../audio/transport';
import { RegionCloseups } from '../components/RegionCloseups';
import { RhythmRow, RhythmsPlot } from '../components/RhythmsPlot';
import { NowMatrix } from '../components/NowMatrix';
import { buildEarthTrack, type TrackStep } from '../audio/earthVoice';
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
  /** The step sounding now, and beats since Play (the band's chord follows it). */
  sounding: TrackStep | null;
  beat: number | null;
  speed: number;
  earthSound: EarthSoundId;
  onEarthSound: (id: EarthSoundId) => void;
}

export function CompareView(p: Props) {
  // Every row on one clock: the longest region's loop.
  const length = Math.max(...p.scene.regions.map((r) => buildEarthTrack(p.features, r.id).length));
  // The beat sounding now, marked on both regions' rows: the moment "What you hear now" shows.
  const nowT = p.playState !== 'stopped' && p.sounding ? p.sounding.t : null;
  return (
    <>
      <RegionCloseups scene={p.scene} features={p.features} imageUrl={p.imageUrl} regionId={p.regionId} onListen={p.onListen}
        playing={p.playState === 'playing'} onStop={p.onStop} look={p.look}
        rowFor={(id) => (
          <RhythmRow features={p.features} regions={p.scene.regions} regionId={id} activeRegionId={p.regionId} look={p.look} length={length}
            nowT={nowT} />
        )} />
      <NowMatrix scene={p.scene} features={p.features} regionId={p.regionId} playState={p.playState} sounding={p.sounding} beat={p.beat}
        speed={p.speed} earthSound={p.earthSound} onEarthSound={p.onEarthSound} look={p.look} />
      <RhythmsPlot
        features={p.features}
        regions={p.scene.regions}
        activeRegionId={p.regionId}
        playState={p.playState}
        getPosition={p.getPosition}
        look={p.look}
        showRows={false}
      />
    </>
  );
}
