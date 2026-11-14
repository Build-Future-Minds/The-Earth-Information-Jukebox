// Line-direction ticks for the region close-ups: an illustration of what the measurement looks at.
// Adapted from Student B's orientationTicks (tools/listening_game.html), using Dev A's choices
// (docs/mapping_spec.md): brightness = the largest of R, G, B; a light blur; Sobel gradient in grey
// levels per pixel; only pixels above the gradient threshold vote; doubled angles, weighted by strength.
// The rhythm itself comes from Dev A's features.json, measured on every frame, not from these ticks.

export interface Tick {
  /** Cell centre in crop pixels. */
  cx: number;
  cy: number;
  /** Direction the lines run, in radians (0 = along x). */
  angle: number;
}

function blur3(src: Float32Array, w: number, h: number): Float32Array {
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const at = (a: Float32Array, x: number, y: number) =>
    a[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) tmp[y * w + x] = (at(src, x - 1, y) + at(src, x, y) + at(src, x + 1, y)) / 3;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[y * w + x] = (at(tmp, x, y - 1) + at(tmp, x, y) + at(tmp, x, y + 1)) / 3;
  return out;
}

/**
 * @param rgba  pixels of the crop (ImageData.data)
 * @param circle the region circle in crop pixels; only pixels inside it vote
 * @param cell  tick cell size in crop pixels
 * @param threshold gradient threshold, grey levels per pixel (features.json normalisation)
 */
export function lineTicks(
  rgba: Uint8ClampedArray,
  w: number,
  h: number,
  circle: { cx: number; cy: number; r: number },
  cell: number,
  threshold: number,
): Tick[] {
  const n = w * h;
  const value = new Float32Array(n);
  for (let i = 0; i < n; i++) value[i] = Math.max(rgba[4 * i], rgba[4 * i + 1], rgba[4 * i + 2]);
  const L = blur3(value, w, h);

  const inside = (x: number, y: number) => (x + 0.5 - circle.cx) ** 2 + (y + 0.5 - circle.cy) ** 2 <= circle.r ** 2;
  const ticks: Tick[] = [];
  for (let by = 0; by + cell <= h; by += cell) {
    for (let bx = 0; bx + cell <= w; bx += cell) {
      let area = 0, used = 0, c = 0, s = 0;
      for (let y = Math.max(1, by); y < Math.min(h - 1, by + cell); y++) {
        for (let x = Math.max(1, bx); x < Math.min(w - 1, bx + cell); x++) {
          if (!inside(x, y)) continue;
          area++;
          const i = y * w + x, up = i - w, dn = i + w;
          const gx = (L[up + 1] + 2 * L[i + 1] + L[dn + 1] - L[up - 1] - 2 * L[i - 1] - L[dn - 1]) / 8;
          const gy = (L[dn - 1] + 2 * L[dn] + L[dn + 1] - L[up - 1] - 2 * L[up] - L[up + 1]) / 8;
          const m = Math.hypot(gx, gy);
          if (m <= threshold) continue;
          used++;
          c += (gx * gx - gy * gy) / m; // doubled angle, weighted by strength
          s += (2 * gx * gy) / m;
        }
      }
      // Cells mostly outside the circle, or with too few strong pixels, get no tick.
      if (area < 0.5 * cell * cell || used < 0.15 * area) continue;
      // (c, s) is the doubled gradient angle; lines run at right angles to the gradient.
      ticks.push({ cx: bx + cell / 2, cy: by + cell / 2, angle: 0.5 * Math.atan2(s, c) + Math.PI / 2 });
    }
  }
  return ticks;
}
