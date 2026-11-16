// Where a place on the scan's picture is in the score, and back: the column and band under a point,
// the centre of a cell, and the outline of a cell. Pure functions, like the rule itself, so a click on
// the picture can be tested against the pixels the score read (scanPick.test.ts).
//
// Units are the picture's as drawn: the SVG's user units, which are the scene's frame pixels, or the
// TEST INPUT picture's pixels. The rule that reads the picture is in scanScore.ts and is not changed
// here: this file only answers "which cell is this?" and "where is that cell?".
import type { ScanGrid } from './scanScore';

/** All the geometry needs of a grid: how many columns and bands. */
type Grid = Pick<ScanGrid, 'columns' | 'bands'>;

export interface Size {
  width: number;
  height: number;
}

/**
 * How a scan lies on the picture.
 * - `line`: the whole picture. `frame` is the size it is drawn at; `pixels` is the size of the still
 *   the score read (it may be smaller than the frame), so a point can be taken to the pixel under it.
 * - `radar`: a region's circle, in frame units. The radar reads around this centre and radius
 *   (regionScan in scanScore.ts; a test checks the two agree for every circle the app has).
 */
export type ScanPlacement =
  | { kind: 'line'; frame: Size; pixels: Size }
  | { kind: 'radar'; frame: Size; center: [number, number]; radius: number };

/** One cell of the score: a column (a moment of the sweep) and a band (a pitch). */
export interface Cell {
  column: number;
  band: number;
}

/** Centre of a cell on the picture. Chime marks are drawn here (`chimePosition` in scan/useScan.ts
 *  hands off to this), so a mark and a click on it name the same cell. */
export function cellCentre(cell: Cell, grid: Grid, placement: ScanPlacement): [number, number] {
  const { columns, bands } = grid;
  if (placement.kind === 'line') {
    const { width, height } = placement.frame;
    return [((cell.column + 0.5) / columns) * width, height - ((cell.band + 0.5) / bands) * height];
  }
  const angle = (2 * Math.PI * (cell.column + 0.5)) / columns;
  const radius = (placement.radius * (cell.band + 0.5)) / bands;
  return [placement.center[0] + radius * Math.cos(angle), placement.center[1] - radius * Math.sin(angle)];
}

/**
 * The cell under a point on the picture, or null when the point is outside the picture (or, on the
 * radar, outside the circle). The inverse of `cellCentre`.
 * - Line: the point is taken to the still's pixel under it, and that pixel to the cell it was counted
 *   in, with the same two expressions as `buildScanScore`. So the pixel under the pointer is always one
 *   of the pixels the returned cell read.
 * - Radar: the bearing (0 at 3 o'clock, anticlockwise) gives the column and the distance from the
 *   centre gives the band, as `radarPoint` lays them out. The cell is the ring sector holding all 16
 *   points the radar read for it.
 */
export function cellAt(x: number, y: number, grid: Grid, placement: ScanPlacement): Cell | null {
  const { width: W, height: H } = placement.frame;
  if (!(x >= 0 && x <= W && y >= 0 && y <= H)) return null; // also rejects NaN
  const { columns, bands } = grid;
  if (placement.kind === 'line') {
    const { width: w, height: h } = placement.pixels;
    // The still's pixel under the point. The right and bottom edges belong to the last pixel.
    const px = Math.min(w - 1, Math.floor((x * w) / W));
    const py = Math.min(h - 1, Math.floor((y * h) / H));
    // The cell that pixel is counted in (buildScanScore: band 0 is the bottom row).
    const column = Math.min(columns - 1, Math.floor(((px + 0.5) * columns) / w));
    const band = Math.min(bands - 1, Math.floor(((h - (py + 0.5)) * bands) / h));
    return { column, band };
  }
  const [cx, cy] = placement.center;
  const dx = x - cx;
  const dy = cy - y; // screen y points down; "anticlockwise" on screen means up is positive
  const distance = Math.hypot(dx, dy);
  if (distance > placement.radius) return null;
  let angle = Math.atan2(dy, dx);
  if (angle < 0) angle += 2 * Math.PI;
  const column = Math.floor((angle * columns) / (2 * Math.PI)) % columns;
  const band = Math.min(bands - 1, Math.floor((distance * bands) / placement.radius));
  return { column, band };
}

/**
 * Map sweep: the rectangle of still pixels a cell read, in frame units. Pixel x is counted in column
 * floor((x + 0.5)·C/w), so column c starts at pixel ceil(c·w/C − 0.5); row y is counted in band
 * floor((h − y − 0.5)·B/h), so the rows of band b and above end at row floor(h − 0.5 − b·h/B).
 * Both are written with whole numbers on top so a boundary that falls exactly on a pixel is exact.
 */
export function lineCellBounds(cell: Cell, grid: Grid, placement: Extract<ScanPlacement, { kind: 'line' }>) {
  const { columns, bands } = grid;
  const { width: w, height: h } = placement.pixels;
  const { width: W, height: H } = placement.frame;
  // First pixel column counted in column c or later.
  const firstPixel = (c: number) => Math.min(w, Math.max(0, Math.ceil((2 * c * w - columns) / (2 * columns))));
  // Number of rows counted in band b or higher (they are the top rows).
  const rowsFrom = (b: number) => Math.min(h, Math.max(0, Math.floor((2 * h * bands - bands - 2 * b * h) / (2 * bands)) + 1));
  const x0 = firstPixel(cell.column);
  const x1 = firstPixel(cell.column + 1);
  const y0 = rowsFrom(cell.band + 1);
  const y1 = rowsFrom(cell.band);
  return { x0: (x0 * W) / w, x1: (x1 * W) / w, y0: (y0 * H) / h, y1: (y1 * H) / h, pixels: { x0, x1, y0, y1 } };
}

/** The outline of a cell as an SVG path: the rectangle of pixels it read (map sweep), or its ring
 *  sector (radar; the innermost band is a wedge from the centre). */
export function cellOutline(cell: Cell, grid: Grid, placement: ScanPlacement): string {
  if (placement.kind === 'line') {
    const { x0, x1, y0, y1 } = lineCellBounds(cell, grid, placement);
    return `M${n(x0)} ${n(y0)}H${n(x1)}V${n(y1)}H${n(x0)}Z`;
  }
  const { r0, r1, a0, a1 } = radarSector(cell, grid, placement);
  const [cx, cy] = placement.center;
  const at = (r: number, a: number) => `${n(cx + r * Math.cos(a))} ${n(cy - r * Math.sin(a))}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  // Sweep flag 0 is anticlockwise on screen (as the played arc in PictureScan).
  if (r0 === 0) return `M${n(cx)} ${n(cy)}L${at(r1, a0)}A${n(r1)} ${n(r1)} 0 ${large} 0 ${at(r1, a1)}Z`;
  return `M${at(r0, a0)}L${at(r1, a0)}A${n(r1)} ${n(r1)} 0 ${large} 0 ${at(r1, a1)}L${at(r0, a1)}A${n(r0)} ${n(r0)} 0 ${large} 1 ${at(r0, a0)}Z`;
}

/** Four short ticks pointing at a cell from outside it: two along the line (or the radius) and two
 *  across it, so a cell one or two screen pixels wide can still be found. Each tick starts `gap` beyond
 *  the cell's edge and is `length` long, in frame units. Returns [x1, y1, x2, y2] for each tick. */
export function cellTicks(cell: Cell, grid: Grid, placement: ScanPlacement, gap: number, length: number): [number, number, number, number][] {
  let centre: [number, number];
  let along: [number, number]; // unit vector along the scan's line (up the map, or out along the radius)
  let across: [number, number]; // unit vector across it
  let halfAlong: number;
  let halfAcross: number;
  if (placement.kind === 'line') {
    const { x0, x1, y0, y1 } = lineCellBounds(cell, grid, placement);
    centre = [(x0 + x1) / 2, (y0 + y1) / 2];
    along = [0, -1];
    across = [1, 0];
    halfAlong = (y1 - y0) / 2;
    halfAcross = (x1 - x0) / 2;
  } else {
    const { r0, r1, a0, a1 } = radarSector(cell, grid, placement);
    const a = (a0 + a1) / 2;
    const [cx, cy] = placement.center;
    const middle = (r0 + r1) / 2;
    centre = [cx + middle * Math.cos(a), cy - middle * Math.sin(a)];
    along = [Math.cos(a), -Math.sin(a)];
    across = [-Math.sin(a), -Math.cos(a)];
    halfAlong = (r1 - r0) / 2;
    // Half the sector's widest chord, at its outer edge, so the ticks clear its corners.
    halfAcross = r1 * Math.sin((a1 - a0) / 2);
  }
  const tick = (u: [number, number], sign: 1 | -1, half: number): [number, number, number, number] => {
    const s = sign * (half + gap);
    const e = sign * (half + gap + length);
    return [centre[0] + u[0] * s, centre[1] + u[1] * s, centre[0] + u[0] * e, centre[1] + u[1] * e];
  };
  return [tick(along, 1, halfAlong), tick(along, -1, halfAlong), tick(across, 1, halfAcross), tick(across, -1, halfAcross)];
}

/** A radar cell's ring sector: radii r0 to r1, angles a0 to a1 (radians, 0 east, anticlockwise). */
function radarSector(cell: Cell, grid: Grid, placement: Extract<ScanPlacement, { kind: 'radar' }>) {
  const { columns, bands } = grid;
  return {
    r0: (placement.radius * cell.band) / bands,
    r1: (placement.radius * (cell.band + 1)) / bands,
    a0: (2 * Math.PI * cell.column) / columns,
    a1: (2 * Math.PI * (cell.column + 1)) / columns,
  };
}

/** Numbers in a path: three decimals are far below a screen pixel. */
function n(x: number): string {
  return String(Math.round(x * 1000) / 1000);
}
