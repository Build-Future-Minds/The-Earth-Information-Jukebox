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
export function landShare(rgba: ArrayLike<number>, width: number, height: number, spot: Spot): number {
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
      if (spread <= 12 && mean >= 30 && mean <= 80) land++;
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
