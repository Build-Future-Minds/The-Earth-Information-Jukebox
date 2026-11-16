// What the picture scan draws over the flat NASA image, shared by Listen (components/ListenScan.tsx)
// and Play along (components/PictureScan.tsx): the moving line or radar needle, the shape that rides it, the dimmed part not
// played yet, and a mark for every struck note. Black and white only: the image's colours are never
// changed. The moving parts are set straight on the SVG by `drawSweep`, from the audio clock, on
// every animation frame; React draws only what changes less often (the marks).
import type { RefObject } from 'react';
import type { Region } from '../data/types';
import type { Trace } from './useScan';

/** Widest the shape riding the line gets (each side), as a share of the picture's width or the circle's radius. */
export const PROFILE_LINE = 0.034;
export const PROFILE_RADAR = 0.2;
/** How far behind the line its glow reaches: a share of the width, or degrees of turn (many thin
 *  wedges on top of each other, so the glow fades evenly). */
export const TRAIL_LINE = 0.05;
export const TRAIL_RADAR_DEGREES = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];
/** Compass letters around the radar on a world map: letter, then the direction as (east, north). */
export const COMPASS: [string, number, number][] = [['E', 1, 0], ['N', 0, 1], ['W', -1, 0], ['S', 0, -1]];
/** Thin rings on the radar: every third band. */
export const RANGE_RINGS = [3, 6, 9];
/** An asterisk of three crossing strokes, radius r, centred on (cx, cy): the third instrument's mark. */
export function starPath(r: number, cx = 0, cy = 0): string {
  return [90, 30, 150]
    .map((deg) => {
      const a = (deg * Math.PI) / 180;
      const dx = r * Math.cos(a);
      const dy = r * Math.sin(a);
      return `M${(cx - dx).toFixed(2)} ${(cy - dy).toFixed(2)}L${(cx + dx).toFixed(2)} ${(cy + dy).toFixed(2)}`;
    })
    .join('');
}
/** The SVG elements that move with the line. */
export interface SweepRefs {
  sweep: RefObject<SVGGElement | null>;
  profile: RefObject<SVGPathElement | null>;
  unplayed: RefObject<SVGPathElement | null>;
  played: RefObject<SVGPathElement | null>;
}

/** The part of the picture in view: the whole frame, or the radar's circle with a small margin. */
export function viewOf(frame: { width: number; height: number }, region?: Region) {
  const margin = region ? region.radius_px * 0.16 : 0;
  const view = region
    ? { x: region.center_px[0] - region.radius_px - margin, y: region.center_px[1] - region.radius_px - margin, w: 2 * (region.radius_px + margin), h: 2 * (region.radius_px + margin) }
    : { x: 0, y: 0, w: frame.width, h: frame.height };
  return { view, margin, unit: view.h / 100 };
}

/** Move the line (or the needle) to `position` (0 to 1) and shape it from the band levels under it. */
export function drawSweep(refs: SweepRefs, frame: { width: number; height: number }, region: Region | undefined, position: number, levels: ArrayLike<number>): void {
  const bands = levels.length;
  if (region) {
    const [cx, cy] = region.center_px;
    refs.sweep.current?.setAttribute('transform', `rotate(${-position * 360} ${cx} ${cy})`);
    refs.profile.current?.setAttribute('d', profilePath(levels, (b) => cx + ((b + 0.5) * region.radius_px) / bands, cy, region.radius_px * PROFILE_RADAR, cx, cx + region.radius_px, true));
    refs.unplayed.current?.setAttribute('d', sectorPath(cx, cy, region.radius_px * 1.02, position));
    refs.played.current?.setAttribute('d', arcPath(cx, cy, region.radius_px, position));
  } else {
    refs.sweep.current?.setAttribute('transform', `translate(${position * frame.width} 0)`);
    refs.profile.current?.setAttribute('d', profilePath(levels, (b) => frame.height - ((b + 0.5) * frame.height) / bands, 0, frame.width * PROFILE_LINE, frame.height, 0, false));
  }
}

interface OverlayProps {
  frame: { width: number; height: number };
  region?: Region;
  bands: number;
  traces: Trace[];
  /** Compass letters round the radar: only on a whole-world map. */
  worldMap: boolean;
  refs: SweepRefs;
  /** The pixels the picture's rule never reads, as a black-and-white picture (white = never read):
   *  they are hatched, because no data is not a zero. null: every pixel is read. */
  mask?: { href: string } | null;
}

/** Everything the scan draws on the picture. Place it inside the picture's <svg>, after the image. */
export function ScanOverlay({ frame, region, bands, traces, worldMap, refs, mask = null }: OverlayProps) {
  const { view, margin, unit } = viewOf(frame, region);
  return (
    <>
      <defs>
        {/* Soft edge of the dimmed, not-yet-played part, and the glow behind the line. */}
        <linearGradient id="scan-ahead" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset="0.02" stopColor="#000" stopOpacity="0.42" />
          <stop offset="1" stopColor="#000" stopOpacity="0.42" />
        </linearGradient>
        <linearGradient id="scan-trail" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.2" />
        </linearGradient>
        {mask && (
          <>
            {/* Black and white stripes, seen only where the mask is white: the pixels never read. */}
            <pattern id="scan-nodata-hatch" patternUnits="userSpaceOnUse" width={unit * 1.6} height={unit * 1.6} patternTransform="rotate(45)">
              <rect width={unit * 0.8} height={unit * 1.6} className="nodata-stripe-light" />
              <rect x={unit * 0.8} width={unit * 0.8} height={unit * 1.6} className="nodata-stripe-dark" />
            </pattern>
            <mask id="scan-nodata-mask" maskUnits="userSpaceOnUse" x={0} y={0} width={frame.width} height={frame.height}>
              <image href={mask.href} width={frame.width} height={frame.height} preserveAspectRatio="none" />
            </mask>
          </>
        )}
      </defs>
      {mask && <rect className="nodata-hatch" width={frame.width} height={frame.height} fill="url(#scan-nodata-hatch)" mask="url(#scan-nodata-mask)" />}

      {region && (
        <>
          {/* Outside the circle is never read, and the part of the circle not played yet waits in the dark. */}
          <path
            className="veil"
            fillRule="evenodd"
            d={`M${view.x} ${view.y}h${view.w}v${view.h}h${-view.w}Z ${circlePath(region.center_px[0], region.center_px[1], region.radius_px)}`}
          />
          <path ref={refs.unplayed} className="veil" />
          {/* Thin rings every third band: how far out a note is. */}
          <g className="range-rings">
            {RANGE_RINGS.map((band) => (
              <circle key={band} cx={region.center_px[0]} cy={region.center_px[1]} r={(region.radius_px * band) / bands} />
            ))}
          </g>
          <g className="box active">
            <circle className="ring-outline" cx={region.center_px[0]} cy={region.center_px[1]} r={region.radius_px} />
            <circle className="ring" cx={region.center_px[0]} cy={region.center_px[1]} r={region.radius_px} />
          </g>
          {/* The part of the rim the line has passed: how far round this turn is. */}
          <path ref={refs.played} className="played-arc" />
          {worldMap && (
            <g className="compass" fontSize={unit * 4.2}>
              {COMPASS.map(([letter, dx, dy]) => (
                <text key={letter} x={region.center_px[0] + dx * (region.radius_px + margin * 0.55)} y={region.center_px[1] - dy * (region.radius_px + margin * 0.55)}>
                  {letter}
                </text>
              ))}
            </g>
          )}
        </>
      )}

      {/* Marks left by the chimes of this sweep. */}
      <g className="traces">
        {traces.map((t) => (
          <g key={t.id} className={`trace ${t.colour}`} transform={`translate(${t.x} ${t.y})`}>
            <circle className="ripple" r={unit * 5.5} />
            {t.colour === 'warm' ? (
              <circle className="chime-dot" r={unit * 1.15} />
            ) : t.colour === 'blue' ? (
              <path className="chime-star-outline" d={starPath(unit * 1.5)} />
            ) : (
              <g transform="rotate(45)">
                <rect className="chime-dot" x={-unit * 1.1} y={-unit * 1.1} width={unit * 2.2} height={unit * 2.2} />
              </g>
            )}
            {t.colour === 'blue' && <path className="chime-star" d={starPath(unit * 1.5)} />}
          </g>
        ))}
      </g>

      {/* Everything that moves with the line. */}
      <g ref={refs.sweep} className="sweep">
        {region ? (
          <RadarTrail region={region} />
        ) : (
          <>
            <rect className="ahead" x={0} y={0} width={frame.width} height={frame.height} fill="url(#scan-ahead)" />
            <rect className="trail" x={-frame.width * TRAIL_LINE} y={0} width={frame.width * TRAIL_LINE} height={frame.height} fill="url(#scan-trail)" />
          </>
        )}
        <path ref={refs.profile} className="profile" />
        {region ? (
          <>
            <line className="sweep-outline" x1={region.center_px[0]} y1={region.center_px[1]} x2={region.center_px[0] + region.radius_px} y2={region.center_px[1]} />
            <line className="sweep-halo" x1={region.center_px[0]} y1={region.center_px[1]} x2={region.center_px[0] + region.radius_px} y2={region.center_px[1]} />
            <line className="sweep-line" x1={region.center_px[0]} y1={region.center_px[1]} x2={region.center_px[0] + region.radius_px} y2={region.center_px[1]} />
            <circle className="needle-end" cx={region.center_px[0]} cy={region.center_px[1]} r={unit * 1.3} />
            <circle className="needle-end" cx={region.center_px[0] + region.radius_px} cy={region.center_px[1]} r={unit * 1.7} />
          </>
        ) : (
          <>
            <line className="sweep-outline" x1={0} y1={0} x2={0} y2={frame.height} />
            <line className="sweep-halo" x1={0} y1={0} x2={0} y2={frame.height} />
            <line className="sweep-line" x1={0} y1={0} x2={0} y2={frame.height} />
            {/* Small arrowheads where the line meets the top and bottom edges. */}
            <path className="needle-end" d={`M${-unit * 1.8} 0H${unit * 1.8}L0 ${unit * 3}Z`} />
            <path className="needle-end" d={`M${-unit * 1.8} ${frame.height}H${unit * 1.8}L0 ${frame.height - unit * 3}Z`} />
          </>
        )}
      </g>
    </>
  );
}

/** The glow behind the radar line. Drawn with the line pointing east; the group it sits in is turned. */
function RadarTrail({ region }: { region: Region }) {
  const [cx, cy] = region.center_px;
  const r = region.radius_px;
  return (
    <>
      {TRAIL_RADAR_DEGREES.map((degrees) => {
        // Behind an anticlockwise line is the clockwise side: below it on screen when it points east.
        const a = (degrees * Math.PI) / 180;
        return <path key={degrees} className="trail" d={`M${cx} ${cy}L${cx + r} ${cy}A${r} ${r} 0 0 1 ${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}Z`} />;
      })}
    </>
  );
}

/** A full circle as a path (two arcs), for cutting a hole in the dimmed surround. */
export function circlePath(cx: number, cy: number, r: number): string {
  return `M${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}Z`;
}

/** The part of the rim the line has already passed: an arc from 3 o'clock, anticlockwise, to the line. */
export function arcPath(cx: number, cy: number, r: number, position: number): string {
  if (position <= 0.0005) return '';
  const p = Math.min(position, 0.9995);
  const angle = 2 * Math.PI * p;
  return `M${cx + r} ${cy}A${r} ${r} 0 ${p > 0.5 ? 1 : 0} 0 ${cx + r * Math.cos(angle)} ${cy - r * Math.sin(angle)}`;
}

/** The part of the circle the radar has not reached yet: from the line round (anticlockwise) to
 *  3 o'clock. `position` is how far round the line is, 0 to 1. */
export function sectorPath(cx: number, cy: number, r: number, position: number): string {
  if (position <= 0.0005) return circlePath(cx, cy, r);
  if (position >= 0.9995) return '';
  const angle = 2 * Math.PI * position;
  const x = cx + r * Math.cos(angle);
  const y = cy - r * Math.sin(angle);
  const large = position < 0.5 ? 1 : 0;
  // Sweep flag 0 is anticlockwise on screen.
  return `M${cx} ${cy}L${x} ${y}A${r} ${r} 0 ${large} 0 ${cx + r} ${cy}Z`;
}

/**
 * The shape that rides the line: a closed, smooth outline, wide where a band is loud.
 * `along(band)` is the band's place along the line; `across0` is the line's own coordinate;
 * `half` is the widest half-width; `start` and `end` are the line's two ends.
 * For the radar the line runs along x (`alongX`), for the map sweep along y.
 */
export function profilePath(
  levels: ArrayLike<number>,
  along: (band: number) => number,
  across0: number,
  half: number,
  start: number,
  end: number,
  alongX: boolean,
): string {
  const points: [number, number][] = [[start, 0]];
  for (let band = 0; band < levels.length; band++) points.push([along(band), levels[band] * half]);
  points.push([end, 0]);
  const xy = (a: number, w: number) => (alongX ? `${a.toFixed(1)} ${(across0 + w).toFixed(1)}` : `${(across0 + w).toFixed(1)} ${a.toFixed(1)}`);
  // One side out, the mirror side back. Each step is a curve with level control points, so the
  // outline has no corners and never overshoots a band's width.
  const side = (sign: 1 | -1, list: [number, number][]) => {
    let d = '';
    for (let i = 1; i < list.length; i++) {
      const [a0, w0] = list[i - 1];
      const [a1, w1] = list[i];
      const mid = (a0 + a1) / 2;
      d += `C${xy(mid, sign * w0)} ${xy(mid, sign * w1)} ${xy(a1, sign * w1)}`;
    }
    return d;
  };
  return `M${xy(start, 0)}${side(1, points)}${side(-1, [...points].reverse())}Z`;
}

/** ", 2007-03-25 12:00 UTC" for "2007-03-25T12:00Z": the time of the still's frame, as the scene file gives it. */
export function stillTime(iso?: string | null): string {
  return iso ? `, ${iso.replace('T', ' ').replace('Z', ' UTC')}` : '';
}
