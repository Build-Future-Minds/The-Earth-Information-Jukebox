// One sentence about a region's circle on the ground, for under the radar. A circle on the flat map
// is an oval on the Earth (docs/mapping_spec.md, "What we do not claim"), so the radar's equal turns
// are not equal compass bearings. The numbers come from the scene by geometry (globe/geo.ts,
// groundShape), not typed in, so they cannot drift from the circles.
import { groundShape, type Spot } from '../globe/geo';

/** Below this many degrees of difference the bearings are called equal (the radar's columns are 3° wide). */
const EQUAL_BEARINGS = 0.5;

export function groundNote(spot: Spot, frame: { width: number; height: number }): string {
  const g = groundShape(spot, frame.width, frame.height);
  const ratio = g.ratio.toFixed(2);
  if (g.bearingDifference < EQUAL_BEARINGS) {
    return `On the ground this circle is as wide east–west as north–south (${ratio} times), so equal turns of the line are equal compass bearings.`;
  }
  return (
    `On the ground this circle is ${ratio} times as wide east–west as north–south, so equal turns of the line are not ` +
    `equal compass bearings: they differ by up to ${Math.round(g.bearingDifference)}°.`
  );
}
