// Listen (P1): three numbered steps on one page.
//   1. Choose a NASA picture (PictureList: every picture the app has, by NASA's own title).
//   2. Choose what to hear (HearChoice: the whole picture, or one region by name).
//   3. Play (ListenScan: the picture scan, with its sound line under the picture).
// The picture is the biggest thing on the page and fits the screen at 1440 × 900 (DESIGN.md).
// Decision D1 (docs/page_plan.md): Listen's sound is the picture scan. The Earth rhythm is the sound
// of Compare and the game, and comes back here as a switch in P4.
import { useLayoutEffect, useRef, type Ref, type RefObject } from 'react';
import type { ScanSoundId } from '../audio/instruments';
import type { RegionLook } from '../components/ExploreControls';
import { HearChoice } from '../components/HearChoice';
import { ListenScan, type ListenScanHandle } from '../components/ListenScan';
import { PictureList } from '../components/PictureList';
import type { ScanTarget, Source, SourceKey } from '../data/sources';

interface Props {
  pictures: Source[];
  picture: Source;
  onPicture: (key: SourceKey) => void;
  target: ScanTarget;
  onTarget: (target: ScanTarget) => void;
  look: RegionLook;
  scanRef: Ref<ListenScanHandle>;
  speed: number;
  onSpeed: (speed: number) => void;
  volumeDb: number;
  onVolume: (db: number) => void;
  soundId: ScanSoundId;
  onSound: (id: ScanSoundId) => void;
  explaining: boolean;
  onExplain: () => void;
  explanationRef: RefObject<HTMLElement | null>;
}

export function ListenView(p: Props) {
  // The steps' height, so the picture can take the rest of the screen (styles.css, ".listen-area").
  const listen = useRef<HTMLDivElement>(null);
  const steps = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const box = steps.current;
    if (!box) return;
    const set = () => listen.current?.style.setProperty('--steps-h', `${box.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(box);
    return () => ro.disconnect();
  }, []);
  return (
    <div className="listen" ref={listen}>
      <div className="steps" ref={steps}>
        <PictureList pictures={p.pictures} current={p.picture.key} onChoose={p.onPicture} />
        <HearChoice picture={p.picture} value={p.target} onChange={p.onTarget} look={p.look} speed={p.speed} />
      </div>
      <ListenScan
        ref={p.scanRef}
        picture={p.picture}
        target={p.target}
        look={p.look}
        speed={p.speed}
        onSpeed={p.onSpeed}
        volumeDb={p.volumeDb}
        onVolume={p.onVolume}
        soundId={p.soundId}
        onSound={p.onSound}
        explaining={p.explaining}
        onExplain={p.onExplain}
        explanationRef={p.explanationRef}
        onPickRegion={p.onTarget}
      />
    </div>
  );
}
