// Map maths for the globe prototype. The NASA frame is an equirectangular map:
//   x = (lon + 180) * W / 360,   y = (90 - lat) * H / 180   (see map_geometry in assets/source_manifest.json)
// A spotlight is the same thing as a scene region: a circle in frame pixels (scene schema 0.2).

export interface Spot {
  center_px: [number, number];
  radius_px: number;
}

export function lonLatToPx(lon: number, lat: number, width: number, height: number): [number, number] {
  return [Math.round(((lon + 180) * width) / 360), Math.round(((90 - lat) * height) / 180)];
}

export function pxToLonLat(x: number, y: number, width: number, height: number): [number, number] {
  return [(x * 360) / width - 180, 90 - (y * 180) / height];
}

/** The square around the circle, as scene.json wants it: [cx - r, cy - r, 2r, 2r]. */
export function boxFor(spot: Spot): [number, number, number, number] {
  const [cx, cy] = spot.center_px;
  const r = spot.radius_px;
  return [cx - r, cy - r, 2 * r, 2 * r];
}

/** Longitude and latitude limits that keep the whole circle inside the frame (prepare_scene.py stops otherwise). */
export function limits(radius: number, width: number, height: number) {
  const lon = 180 - (radius * 360) / width;
  const lat = 90 - (radius * 180) / height;
  return { lonMin: -lon, lonMax: lon, latMin: -lat, latMax: lat };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Share of the circle drawn as flat grey land (same rule as check_motion.py / prepare_scene.py,
 *  with a little more colour tolerance because preview.jpg is a JPEG). rgba is width*height*4. */
/** What flat land looks like in a source: mean brightness range and the largest channel spread. */
export type LandRule = [min: number, max: number, spread: number];
export const OCEAN_LAND: LandRule = [30, 80, 12];

export function landShare(rgba: ArrayLike<number>, width: number, height: number, spot: Spot,
  rule: LandRule = OCEAN_LAND): number {
  const [low, high, maxSpread] = rule;
  const [cx, cy] = spot.center_px;
  const r = spot.radius_px;
  let inside = 0;
  let land = 0;
  for (let y = Math.max(0, cy - r); y <= Math.min(height - 1, cy + r); y++) {
    for (let x = Math.max(0, cx - r); x <= Math.min(width - 1, cx + r); x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) continue;
      inside++;
      const i = (y * width + x) * 4;
      const red = rgba[i];
      const green = rgba[i + 1];
      const blue = rgba[i + 2];
      const spread = Math.max(red, green, blue) - Math.min(red, green, blue);
      const mean = (red + green + blue) / 3;
      if (spread <= maxSpread && mean >= low && mean <= high) land++;
    }
  }
  return inside ? land / inside : 0;
}

/** A region object in scene schema 0.2 shape, for Dev A to measure or Student A to add to regions_draft.json. */
export function regionJson(id: string, name: string, spot: Spot, width: number, height: number) {
  const [lon, lat] = pxToLonLat(spot.center_px[0], spot.center_px[1], width, height);
  return {
    id,
    name,
    center_px: spot.center_px,
    radius_px: spot.radius_px,
    box_px: boxFor(spot),
    center_lonlat: [Math.round(lon * 10) / 10, Math.round(lat * 10) / 10],
  };
}

// ---------- The globe on screen: the same sums the shader does ----------
//
// globeRenderer.ts hands the GPU exactly `viewRotation(view)` and `globeScale(zoom, w, h)`. The
// functions below use the same two, so a place worked out here is where the GPU draws it. Tests
// check the sums against the vertex shader's, and the browser tests read the GPU's own pixels.

/** Which way the globe faces: the longitude and latitude at the centre of the screen, degrees. */
export interface View {
  lon: number;
  lat: number;
}

/** How much of the canvas's shorter side the whole globe spans at zoom 1. */
export const GLOBE_SIZE = 0.86;
export const ZOOM_MIN = 0.6;
export const ZOOM_MAX = 6;

/** Rotation that turns (view.lon, view.lat) to face the viewer, as a column-major mat3. */
export function viewRotation(view: View): Float32Array {
  const yaw = (-view.lon * Math.PI) / 180;
  const pitch = (view.lat * Math.PI) / 180;
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  // Row-major Rx(pitch) * Ry(yaw), written out column by column.
  return new Float32Array([cy, sp * sy, -cp * sy, 0, cp, sp, sy, -sp * cy, cp * cy]);
}

/** The shader's uScale: how wide and tall a unit sphere is in clip space, on a canvas w × h. */
export function globeScale(zoom: number, w: number, h: number): [number, number] {
  const size = GLOBE_SIZE * zoom;
  return w >= h ? [(size * h) / w, size] : [size, (size * w) / h];
}

/** Radius of the globe on screen, in the canvas's own units. */
export function globeRadius(zoom: number, w: number, h: number): number {
  return (GLOBE_SIZE * zoom * Math.min(w, h)) / 2;
}

/** A place on the unit sphere, as the globe's mesh is built (globeRenderer.ts, sphere()). */
export function spherePoint(lon: number, lat: number): [number, number, number] {
  const a = (lon * Math.PI) / 180;
  const b = (lat * Math.PI) / 180;
  return [Math.cos(b) * Math.sin(a), Math.sin(b), Math.cos(b) * Math.cos(a)];
}

export interface ScreenPoint {
  /** From the canvas's left and top edges, in the units of the w and h given. */
  x: number;
  y: number;
  /** 1 at the middle of the globe, 0 on its edge, below 0 on the far side. */
  depth: number;
  /** On the near half (the edge counts): the far half is hidden behind the globe. */
  visible: boolean;
}

/**
 * Where a place is drawn on a canvas w × h. The vertex shader's sums: p = uRot · position (uRot is
 * column-major), clip x = p.x · uScale.x, clip y = p.y · uScale.y; then clip space to the canvas.
 */
export function projectToScreen(lon: number, lat: number, view: View, zoom: number, w: number, h: number): ScreenPoint {
  const m = viewRotation(view);
  const [x, y, z] = spherePoint(lon, lat);
  const px = m[0] * x + m[3] * y + m[6] * z;
  const py = m[1] * x + m[4] * y + m[7] * z;
  const pz = m[2] * x + m[5] * y + m[8] * z;
  const [sx, sy] = globeScale(zoom, w, h);
  // The matrix is single precision, as on the GPU: a place exactly on the edge may come out a
  // millionth either side of 0.
  return { x: ((px * sx + 1) / 2) * w, y: ((1 - py * sy) / 2) * h, depth: pz, visible: pz >= -1e-6 };
}

/** Longitude wrapped into −180 (inclusive) to 180 (exclusive). */
export function wrapLongitude(lon: number): number {
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}

/** The scan line's longitude at a place in the map sweep, 0 to 1 (it starts on the 180° line). */
export function lineLongitude(position: number): number {
  return position * 360 - 180;
}

/** Design choice: while the globe follows the line, the line sits this many degrees east of the
 *  middle of the globe (a little right of centre), so most of the globe in view is already played. */
export const FOLLOW_OFFSET = 20;
/** Under reduced motion the globe only cuts, once per step of the scan's low note: 3.75 s of the
 *  30 s sweep, which is 45° of longitude (a test checks it against audio/scanScore.ts). */
export const FOLLOW_STEP = 45;

/**
 * The longitude the globe faces while it follows the line. Normal motion: the line FOLLOW_OFFSET
 * east of the middle, every frame. Reduced motion: the middle of the 45° step the line is in, so the
 * globe holds still while the line walks across the middle, then cuts to the next step.
 */
export function followLongitude(position: number, reducedMotion: boolean): number {
  if (!reducedMotion) return wrapLongitude(lineLongitude(position) - FOLLOW_OFFSET);
  const step = Math.floor((position * 360) / FOLLOW_STEP + 1e-9);
  return wrapLongitude(-180 + (step + 0.5) * FOLLOW_STEP);
}

/**
 * A region's circle on the ground. A circle of r pixels on the flat map spans r · 360 ÷ W degrees
 * of longitude and r · 180 ÷ H of latitude; on the ground the east–west span shrinks by
 * cos(latitude). Derived from the map geometry at the circle's centre, not measured; the same
 * numbers as docs/measurements/scan_pictures.md, "The circles on the ground".
 */
export function groundShape(spot: Spot, width: number, height: number) {
  const [lon, lat] = pxToLonLat(spot.center_px[0], spot.center_px[1], width, height);
  const r = spot.radius_px;
  /** Half-widths on the ground, in degrees of arc. */
  const eastWest = ((r * 360) / width) * Math.cos((lat * Math.PI) / 180);
  const northSouth = (r * 180) / height;
  /** Ground width ÷ height: 1 is round. */
  const ratio = eastWest / northSouth;
  // The radar turns in equal angles on the map. A map angle θ (0 east, anticlockwise) points along
  // the ground bearing atan2(sin θ, ratio · cos θ). The two differ most where tan θ = √ratio, by
  // |atan(1/√ratio) − atan(√ratio)|.
  const s = Math.sqrt(ratio);
  const bearingDifference = (Math.abs(Math.atan(1 / s) - Math.atan(s)) * 180) / Math.PI;
  return { lon, lat, eastWest, northSouth, ratio, bearingDifference };
}

/** The ground bearing (radians, 0 east, anticlockwise) of a map angle θ on a circle of this ratio. */
export function groundBearing(theta: number, ratio: number): number {
  const b = Math.atan2(Math.sin(theta), ratio * Math.cos(theta));
  return b < 0 ? b + 2 * Math.PI : b;
}

/** Design choice: after the cut to a radar, its circle reaches this share of the way from the
 *  middle of the globe's view to the edge of the canvas's shorter side. */
export const RADAR_FILL = 0.8;

/** Where the globe faces, and how far it zooms, to show a region's circle: its centre in the middle,
 *  the wider of its two ground half-widths reaching RADAR_FILL of the way to the edge. */
export function radarView(spot: Spot, width: number, height: number): View & { zoom: number } {
  const g = groundShape(spot, width, height);
  const half = Math.min(90, Math.max(g.eastWest, g.northSouth));
  const zoom = clamp(RADAR_FILL / (GLOBE_SIZE * Math.sin((half * Math.PI) / 180)), ZOOM_MIN, ZOOM_MAX);
  return { lon: g.lon, lat: clamp(g.lat, -80, 80), zoom };
}

// ---------- How the scan shades the picture on the globe ----------
//
// The same look as the flat picture (styles.css .scan-view, PictureScan.tsx): black and white only,
// so the picture's own colours are never changed. The shader in globeRenderer.ts reads these
// numbers, and `scanShade` is the same rule in TypeScript, so a test can check the GPU's pixels.

/** The part not played yet is mixed this far toward black. */
export const SCAN_DIM = 0.42;
/** The dimming fades in over this share of the picture's width ahead of the line. */
export const SCAN_DIM_EDGE = 0.02;
/** The glow behind the line: this far toward white at the line, fading to nothing over SCAN_TRAIL. */
export const SCAN_GLOW = 0.2;
export const SCAN_TRAIL = 0.05;
/** Behind the radar's needle: 12 thin wedges of 0.032 white each over 60° on the flat picture, summed. */
export const RADAR_GLOW = 0.384;
export const RADAR_TRAIL_DEGREES = 60;

export interface ScanShadeInput {
  mode: 'line' | 'radar';
  /** How far through the sweep, 0 to 1. */
  position: number;
  frame: { width: number; height: number };
  /** The radar's circle, in frame pixels. */
  circle?: { cx: number; cy: number; r: number } | null;
}

/**
 * How the scan shades the picture at a map pixel (x, y), away from the strokes (the line, its shape,
 * the rings): how far it is mixed toward black (`dim`) and then toward white (`glow`).
 */
export function scanShade(x: number, y: number, s: ScanShadeInput): { dim: number; glow: number } {
  const W = s.frame.width;
  if (s.mode === 'line' || !s.circle) {
    const f = x - s.position * W; // frame pixels east of the line; below 0 is played
    const dim = SCAN_DIM * clamp(f / (SCAN_DIM_EDGE * W), 0, 1);
    const glow = f < 0 ? SCAN_GLOW * clamp(1 + f / (SCAN_TRAIL * W), 0, 1) : 0;
    return { dim, glow };
  }
  const c = s.circle;
  let dx = x - c.cx;
  dx -= W * Math.floor(dx / W + 0.5); // the nearer way round the 180° line
  const dy = y - c.cy;
  if (Math.hypot(dx, dy) > c.r) return { dim: SCAN_DIM, glow: 0 }; // outside the circle is never read
  let theta = Math.atan2(-dy, dx);
  if (theta < 0) theta += 2 * Math.PI;
  const a = 2 * Math.PI * s.position;
  if (theta > a) return { dim: SCAN_DIM, glow: 0 }; // not reached yet
  const behind = ((a - theta) * 180) / Math.PI;
  return { dim: 0, glow: RADAR_GLOW * Math.max(0, 1 - behind / RADAR_TRAIL_DEGREES) };
}

/** A picture colour (0–255) after the scan's shading. */
export function shadeColour(rgb: [number, number, number], shade: { dim: number; glow: number }): [number, number, number] {
  return rgb.map((c) => c * (1 - shade.dim) * (1 - shade.glow) + 255 * shade.glow) as [number, number, number];
}
