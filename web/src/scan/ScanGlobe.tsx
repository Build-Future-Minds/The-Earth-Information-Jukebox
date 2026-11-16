// The picture scan on the globe: the same scan as the flat picture (the same pixels, the same score,
// the same player), drawn round the globe. It takes the scan's shared state (scan/useScan.ts) as a
// prop, so a page can show one scan on the flat picture or on the globe (docs/page_plan.md, P4).
//
// While the scan is stopped the globe shows the Earth voice's region as its spotlight, as before.
import { useMemo, useRef } from 'react';
import { GlobeView, type GlobeHandle, type GlobeScan } from '../globe/GlobeView';
import type { Spot } from '../globe/geo';
import type { Scan } from './useScan';
import { useScanFrame } from './useScanFrame';

interface Props {
  scan: Scan;
  /** The picture wrapped on the globe: the NASA still, or in practice mode the TEST INPUT picture. */
  imageUrl: string;
  /** The Earth voice's region, the spotlight while the scan is stopped, in the scene's frame pixels. */
  spot: Spot;
  sceneFrame: { width: number; height: number };
  /** Change this number to turn the globe to the spotlight. */
  faceSpotToken: number;
  label: string;
  describedBy?: string;
  /** Turn the globe with the scan's line (or to the radar's circle). */
  follow: boolean;
  /** The person turned the globe themselves while it was following. */
  onFollowOff: () => void;
}

export function ScanGlobe({ scan, imageUrl, spot, sceneFrame, faceSpotToken, label, describedBy, follow, onFollowOff }: Props) {
  const globe = useRef<GlobeHandle>(null);
  const { state, loaded, region, frame, traces, worldMap, reducedMotion } = scan;
  // Every frame the shared loop knows where the line is; the globe draws that moment at once.
  useScanFrame(scan, ({ position, levels }) => globe.current?.scanMoment(position, levels));
  const overlay = useMemo<GlobeScan | null>(
    () =>
      state === 'stopped' || !loaded
        ? null
        : {
            mode: region ? 'radar' : 'line',
            // The scan works in its picture's pixels (the TEST INPUT picture has its own size).
            frame: { width: frame.width, height: frame.height },
            circle: region ? { center_px: region.center_px, radius_px: region.radius_px } : null,
            marks: traces,
            compass: worldMap,
            reducedMotion,
          },
    [state, loaded, region, frame.width, frame.height, traces, worldMap, reducedMotion],
  );
  return (
    <GlobeView
      ref={globe}
      imageUrl={imageUrl}
      // The spotlight is in the scene's pixels.
      frame={sceneFrame}
      spot={spot}
      faceSpotToken={faceSpotToken}
      label={label}
      describedBy={describedBy}
      scan={overlay}
      follow={follow}
      onFollowOff={onFollowOff}
    />
  );
}
