// Which scan rule a picture has: the one place every view asks.
//
// The rule's settings were measured and checked on the ocean picture only. By colour, the aerosol
// and rain pictures' empty sea and land would sound (docs/mapping_spec.md, "Other pictures"), so
// they have no rule until each picture's own settings are measured (docs/page_plan.md, P1a). When
// those settings are kept in data/sources.ts, this function returns them instead, and every view
// of the scan (the flat picture and the globe) follows.
import type { ScanMeasure } from '../audio/scanScore';
import type { Picture } from '../data/sources';

export interface PictureScanRule {
  /** What counts as light in this picture: colour strength or brightness. */
  measure: ScanMeasure;
}

/** The scan rule of a picture, or null if the scan has not been checked on it yet. Practice mode
 *  scans the TEST INPUT picture, which is drawn for the colour rule. */
export function scanRuleOf(picture: Pick<Picture, 'key'>): PictureScanRule | null {
  return picture.key === 'ocean' || picture.key === 'practice' ? { measure: 'colour' } : null;
}

/** Why a picture cannot be scanned yet, for the screen. */
export const NO_SCAN_RULE =
  'The picture scan has no rule for this picture yet: by colour, its empty sea and its land would sound. Its own settings are still to be measured. Choose Ocean to scan the picture on the globe.';
