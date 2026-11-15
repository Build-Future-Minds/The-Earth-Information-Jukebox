// Choosing a picture (Ocean, Aerosols, Rain), and cropping a region's circle for its thumbnail.
import { sourceByKey, type SourceKey } from './sources';
import type { Region } from './types';

/** Switching picture selects that picture's first region (the caller stops the sound first). */
export function selectSource(key: SourceKey): { sourceKey: SourceKey; regionId: string } {
  const s = sourceByKey(key);
  return { sourceKey: s.key, regionId: s.scene.regions[0].id };
}

/** CSS background size and position that show the region's circle filling a `size`-px square. */
export function thumbCss(region: Region, frame: { width: number; height: number }, size: number) {
  const k = size / (2 * region.radius_px);
  const [cx, cy] = region.center_px;
  return {
    backgroundSize: `${frame.width * k}px ${frame.height * k}px`,
    backgroundPosition: `${-(cx * k - size / 2)}px ${-(cy * k - size / 2)}px`,
  };
}
