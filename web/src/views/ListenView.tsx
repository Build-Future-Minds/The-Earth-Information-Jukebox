// Listen (home): the NASA picture, what is sounding, the beat timeline, and Explain.
// The play buttons, region choice and sound settings sit in the rail (App).
import type { CSSProperties, RefObject } from 'react';
import type { EarthTrack, TrackStep } from '../audio/earthVoice';
import type { PlayState } from '../audio/transport';
import { BeatTrack } from '../components/BeatTrack';
import { NowPlaying } from '../components/NowPlaying';
import { RhythmExplanation, type OtherRegion } from '../components/RhythmExplanation';
import { SceneView } from '../components/SceneView';
import type { RegionLook } from '../components/ExploreControls';
import type { Scene } from '../data/types';

interface Props {
  scene: Scene;
  imageUrl: string | null;
  regionId: string;
  label: string;
  look: RegionLook;
  onSelect: (regionId: string) => void;
  colour: CSSProperties;
  track: EarthTrack;
  sounding: TrackStep | null;
  playState: PlayState;
  speed: number;
  getPosition: () => number;
  onSeek: (t: number) => void;
  explaining: boolean;
  explanationRef: RefObject<HTMLElement | null>;
  other: OtherRegion | null;
}

export function ListenView(p: Props) {
  return (
    <>
      <SceneView scene={p.scene} imageUrl={p.imageUrl} regionId={p.regionId} look={p.look} onSelect={p.onSelect} />
      <NowPlaying step={p.sounding} regionLabel={p.label} />
      <BeatTrack
        track={p.track}
        colour={p.colour}
        regionLabel={p.label}
        playState={p.playState}
        speed={p.speed}
        getPosition={p.getPosition}
        onSeek={p.onSeek}
      />
      {p.explaining && <RhythmExplanation ref={p.explanationRef} step={p.sounding} regionLabel={p.label} other={p.other} />}
    </>
  );
}
