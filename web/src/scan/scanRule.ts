// Which scan rule a picture has: the one place every view asks.
//
// Each picture's rule is kept with the picture (data/sources.ts, `scan`): its floor, its full
// levels, the pixels it never reads, whether it is a world map, and what each instrument means in
// its legend. Every one was measured on that picture's own still (docs/measurements/scan_pictures.md),
// because by colour the aerosol and rain pictures' empty sea and land would otherwise sound. A
// picture with no rule is not scanned by any view: the flat picture and the globe both ask here.
import type { Picture, ScanRule } from '../data/sources';

/** The scan rule of a picture, or null if the scan has not been measured on it (it is not played). */
export function scanRuleOf(picture: Pick<Picture, 'scan'>): ScanRule | null {
  return picture.scan;
}

/** Why a picture cannot be scanned, for the screen. */
export const NO_SCAN_RULE =
  'The picture scan has no measured rule for this picture, so it is not played here: by colour, its empty sea and its land would sound. Choose another picture to scan it on the globe.';
