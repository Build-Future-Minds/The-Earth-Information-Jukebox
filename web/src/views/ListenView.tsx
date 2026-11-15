// Listen (home): the NASA picture, the player bar under it (Play, Stop, Replay, the beat timeline,
// Explain, Sound), and the Explain panel. The picture and region choice sit above (App).
import type { ReactNode, RefObject } from 'react';
import type { TrackStep } from '../audio/earthVoice';
import type { RegionLook } from '../components/ExploreControls';
import { RhythmExplanation, type OtherRegion } from '../components/RhythmExplanation';
import { SceneView } from '../components/SceneView';
import type { Scene } from '../data/types';

interface Props {
  scene: Scene;
  imageUrl: string | null;
  regionId: string;
  label: string;
  look: RegionLook;
  onSelect: (regionId: string) => void;
  sounding: TrackStep | null;
  explaining: boolean;
  explanationRef: RefObject<HTMLElement | null>;
  other: OtherRegion | null;
  player: ReactNode;
}

export function ListenView(p: Props) {
  return (
    <>
      <SceneView scene={p.scene} imageUrl={p.imageUrl} regionId={p.regionId} look={p.look} onSelect={p.onSelect} />
      {p.player}
      {p.explaining && <RhythmExplanation ref={p.explanationRef} step={p.sounding} regionLabel={p.label} other={p.other} />}
    </>
  );
}
