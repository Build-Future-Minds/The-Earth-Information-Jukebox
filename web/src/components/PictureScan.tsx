// "Play the picture": a line sweeps the NASA image and plays what it crosses, after NASA's own
// image sonifications (docs/mapping_spec.md, "Play along: the picture scan").
// A play-along extra: it has its own player, clock and volume (audio/scanPlayer.ts) and never
// changes the Earth rhythm. In practice mode there is no NASA image, so it scans a labelled
// TEST INPUT picture instead.
//
// This is the flat view of the scan. The picture, the score, the player, the controls, the bars
// and the legend are shared with the globe (web/src/scan/); this file draws the line on the flat
// picture.
//
// Each picture is read by its own rule (data/sources.ts, `scan`), measured on its own still; its
// numbers are never compared with another picture's.
//
// What you see is what you hear, drawn from the same score and the same audio clock as the sound:
//   - the picture lights up as the line passes (the part not played yet is dimmed);
//   - a white shape rides the line: wide where a band is loud;
//   - every chime leaves a mark on the picture (round for warm colours, a diamond for cool ones,
//     an asterisk for the third instrument of a picture that has one);
//   - pixels the picture's rule never reads are hatched: no data, never a zero;
//   - the bars beside the picture are the low note and the twelve held notes, low to high;
//   - the legend names every one of these, with the same shapes.
// Everything drawn over the NASA image is black or white: its colours are never changed.
import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { Region } from '../data/types';
import { cellAt, cellOutline, cellTicks, type ScanPlacement } from '../audio/scanPick';
import { chosenBand, explainPick, whyColumn } from '../audio/scanWhy';
import { ScanButtons, ScanSettings, ScanStatus } from '../scan/ScanControls';
import { starPath } from '../scan/ScanLegend';
import { ScanSide } from '../scan/ScanSide';
import { groundNote } from '../scan/groundNote';
import { useScan, type ScanHandle, type ScanPicture } from '../scan/useScan';
import { useScanFrame } from '../scan/useScanFrame';
import { ScanExplanation, WHY_START, type WhyView } from './ScanExplanation';

export type PictureScanHandle = ScanHandle;
export type { ScanPicture };

interface Props {
  /** The picture the scan plays, with its measured rule. The view remounts this (a React `key`)
   *  when the picture changes, so a new picture starts stopped, on the whole picture. */
  picture: ScanPicture;
  /** The page's speed setting: the scan follows it. */
  speed: number;
  /** Change the page's speed from the scan's settings (the Earth rhythm follows it too). */
  onSpeed?: (speed: number) => void;
}

/** Widest the shape riding the line gets (each side), as a share of the picture's width or the circle's radius. */
const PROFILE_LINE = 0.034;
const PROFILE_RADAR = 0.2;
/** How far behind the line its glow reaches: a share of the width, or degrees of turn (many thin
 *  wedges on top of each other, so the glow fades evenly). */
const TRAIL_LINE = 0.05;
const TRAIL_RADAR_DEGREES = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];
/** Compass letters around the radar on a world map: letter, then the direction as (east, north). */
const COMPASS: [string, number, number][] = [['E', 1, 0], ['N', 0, 1], ['W', -1, 0], ['S', 0, -1]];
/** Thin rings on the radar: every third band. */
const RANGE_RINGS = [3, 6, 9];
/** A press that moves further than this (CSS pixels) before it lets go is a drag, not a tap: it picks nothing. */
const TAP_SLOP = 10;

export const PictureScan = forwardRef<PictureScanHandle, Props>(function PictureScan({ picture, speed, onSpeed }, ref) {
  const scan = useScan({ picture, speed });
  const { scene, rule, mask, blueClass, choices, sound } = scan;
  const { loaded, target, state, traces, frame, region, worldMap, score, bands, labelOf, why, liveColumn, lastStruck, reducedMotion } = scan;
  const nodataNote = mask ? (rule.mask?.what ?? 'the hatched part of the picture') : null;
  const sweep = useRef<SVGGElement>(null);
  const profile = useRef<SVGPathElement>(null);
  const unplayed = useRef<SVGPathElement>(null);
  const played = useRef<SVGPathElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  /** The pointer pressed on the picture and where, until it lets go. */
  const press = useRef<{ id: number; x: number; y: number } | null>(null);
  const bandSentenceId = useId();
  const hintId = useId();

  // What "Why the scan sounds like this" shows. Kept here so a click on the picture can choose a
  // place in it, and the picture can mark the place it explains.
  const [whyView, setWhyView] = useState<WhyView>(WHY_START);
  const changeWhy = useCallback(
    (change: Partial<WhyView>) =>
      setWhyView((v) => ((Object.keys(change) as (keyof WhyView)[]).some((k) => v[k] !== change[k]) ? { ...v, ...change } : v)),
    [],
  );
  // A new score is a new picture or a new scan: the explanation starts again at its first column.
  useEffect(() => changeWhy({ column: 0, pick: null, follow: true }), [score, changeWhy]);

  // Where the scan lies on the picture, for a click and for the mark.
  const placement = useMemo<ScanPlacement | null>(() => {
    if (!loaded) return null;
    const frameSize = { width: frame.width, height: frame.height };
    return region
      ? { kind: 'radar', frame: frameSize, center: region.center_px, radius: region.radius_px }
      : { kind: 'line', frame: frameSize, pixels: { width: loaded.pixels.width, height: loaded.pixels.height } };
  }, [loaded, region, frame.width, frame.height]);

  // The place the fold-out explains: its column, and the band it explains in full. It is marked on
  // the picture, with a line of words under it, whenever it is not moving with the line: the fold-out
  // is open and the scan is not following the line as it plays.
  const explained = useMemo(
    () => (score ? chosenBand(whyColumn(score, whyView.column, why).bands, whyView.pick) : null),
    [score, whyView.column, whyView.pick, why],
  );
  const showPlace = whyView.open && !(state === 'playing' && whyView.follow) && !!explained && !!placement;

  // Click or tap a place on the picture: the fold-out opens on that column and band, as if they had
  // been chosen with its slider and list. It never touches the player: no sound, and the line stays
  // where it is. Mouse, touch and pen all send pointer events. A press that moves (a drag, or a finger
  // scrolling the page, which the browser cancels) picks nothing, and nothing happens on hover.
  const onPressStart = (e: React.PointerEvent<SVGSVGElement>) => {
    press.current = e.isPrimary && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY } : null;
  };
  const onPressEnd = (e: React.PointerEvent<SVGSVGElement>) => {
    const p = press.current;
    press.current = null;
    if (!p || p.id !== e.pointerId || Math.hypot(e.clientX - p.x, e.clientY - p.y) > TAP_SLOP) return;
    const m = svg.current?.getScreenCTM();
    if (!m || !score || !placement) return;
    // Screen to picture units, through the SVG's own viewBox (the radar view is zoomed to its circle).
    const at = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    const cell = cellAt(at.x, at.y, score.grid, placement);
    if (!cell) return; // outside the picture, or outside the circle: nothing happens
    changeWhy({ open: true, column: cell.column, pick: cell.band, follow: false });
  };

  useImperativeHandle(ref, () => ({ stop: scan.stop }), []);

  // The line on the flat picture, moved every frame by the shared loop.
  useScanFrame(scan, ({ position, levels, grid, region: r, frame: f }) => {
    if (r) {
      const [cx, cy] = r.center_px;
      sweep.current?.setAttribute('transform', `rotate(${-position * 360} ${cx} ${cy})`);
      profile.current?.setAttribute('d', profilePath(levels, (b) => cx + ((b + 0.5) * r.radius_px) / grid.bands, cy, r.radius_px * PROFILE_RADAR, cx, cx + r.radius_px, true));
      unplayed.current?.setAttribute('d', sectorPath(cx, cy, r.radius_px * 1.02, position));
      played.current?.setAttribute('d', arcPath(cx, cy, r.radius_px, position));
    } else {
      sweep.current?.setAttribute('transform', `translate(${position * f.width} 0)`);
      profile.current?.setAttribute('d', profilePath(levels, (b) => f.height - ((b + 0.5) * f.height) / grid.bands, 0, f.width * PROFILE_LINE, f.height, 0, false));
    }
  });

  // Radar view: zoom to the circle with a small margin.
  const margin = region ? region.radius_px * 0.16 : 0;
  const view = region
    ? { x: region.center_px[0] - region.radius_px - margin, y: region.center_px[1] - region.radius_px - margin, w: 2 * (region.radius_px + margin), h: 2 * (region.radius_px + margin) }
    : { x: 0, y: 0, w: frame.width, h: frame.height };
  // Sizes of things drawn on the picture, as shares of what is in view, so they look the same on
  // the map and on the zoomed circle.
  const unit = view.h / 100;
  const figureClass = ['scene', 'scan-view', region ? 'radar' : 'line', state, reducedMotion ? 'still' : ''].join(' ').trim();

  return (
    <div className="scan" role="group" aria-labelledby="scan-heading">
      <h3 id="scan-heading">Play the picture</h3>
      <p className="muted">A line sweeps the picture and plays the colours it crosses. A rule we chose; the Earth rhythm is unchanged.</p>
      {!loaded?.isTest && (
        <p className="muted scan-which">
          Reading {picture.label === 'Ocean' ? 'the ocean picture' : `the ${picture.label.toLowerCase()} picture`}: {scene.source.title}, with its own settings.
        </p>
      )}

      <ScanButtons scan={scan} />
      <ScanSettings scan={scan} speed={speed} onSpeed={onSpeed} />
      <ScanStatus scan={scan} />

      <figure className={figureClass} style={{ '--aspect': view.w / view.h } as React.CSSProperties}>
        <div className="scan-picture">
          {loaded?.isTest && <span className="scan-test">TEST INPUT — a made-up picture, not NASA data</span>}
          <svg
            ref={svg}
            viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
            role="img"
            aria-label={
              loaded?.isTest
                ? picture.test
                  ? `Test picture for the scan (made up, not NASA data): dots in the colours of the ${picture.label.toLowerCase()} picture's legend${mask ? ', and a hatched block that is never read' : ''}.`
                  : 'Test picture for the scan: three coloured dots and a grey block on black.'
                : `${scene.source.title}, with the scan line${region ? ` on ${labelOf(target)}, ${region.name}` : ''}.`
            }
            aria-describedby={hintId}
            onPointerDown={onPressStart}
            onPointerUp={onPressEnd}
            onPointerCancel={() => (press.current = null)}
          >
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

            {loaded ? (
              <image href={loaded.href} width={frame.width} height={frame.height} preserveAspectRatio="none" />
            ) : (
              <rect width={frame.width} height={frame.height} className="frame-placeholder" />
            )}
            {mask && <rect className="nodata-hatch" width={frame.width} height={frame.height} fill="url(#scan-nodata-hatch)" mask="url(#scan-nodata-mask)" />}

            {region && (
              <>
                {/* Outside the circle is never read, and the part of the circle not played yet waits in the dark. */}
                <path
                  className="veil"
                  fillRule="evenodd"
                  d={`M${view.x} ${view.y}h${view.w}v${view.h}h${-view.w}Z ${circlePath(region.center_px[0], region.center_px[1], region.radius_px)}`}
                />
                <path ref={unplayed} className="veil" />
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
                <path ref={played} className="played-arc" />
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
            <g ref={sweep} className="sweep">
              {region ? (
                <RadarTrail region={region} />
              ) : (
                <>
                  <rect className="ahead" x={0} y={0} width={frame.width} height={frame.height} fill="url(#scan-ahead)" />
                  <rect className="trail" x={-frame.width * TRAIL_LINE} y={0} width={frame.width * TRAIL_LINE} height={frame.height} fill="url(#scan-trail)" />
                </>
              )}
              <path ref={profile} className="profile" />
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

            {/* The place explained in "Why the scan sounds like this": the cell's own outline and four
                ticks pointing at it, black under white. It never moves. */}
            {showPlace && explained && placement && score && (
              <g className="pick-mark" data-column={explained.column} data-band={explained.band}>
                {(['under', 'over'] as const).map((layer) => (
                  <g key={layer} className={layer}>
                    <path d={cellOutline(explained, score.grid, placement)} />
                    {cellTicks(explained, score.grid, placement, unit * 0.9, unit * 3.2).map(([x1, y1, x2, y2], i) => (
                      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
                    ))}
                  </g>
                ))}
              </g>
            )}
          </svg>
          {!loaded?.isTest && <span className="credit">Visualization: {scene.source.credit}</span>}
          {nodataNote && (
            <p className="scan-nodata-note">
              The hatched part is never read: {nodataNote}. There the scan has no data, so it is silent; that is not a zero.
            </p>
          )}
          <p className="scan-pick-hint" id={hintId}>
            Click or tap a place on the picture to see why it sounds as it does, or use the column slider in “Why the scan sounds like this”.
          </p>
          {/* Plain text, not announced: it is there when someone reads on from the picture. */}
          {showPlace && explained && score && (
            <p className="scan-pick">
              <span>{explainPick(explained, score, why)}</span>
              <button type="button" onClick={() => document.getElementById(bandSentenceId)?.focus()}>
                Read why
              </button>
            </p>
          )}
        </div>

        <ScanSide scan={scan}>
          {region && loaded && !loaded.isTest && (
            <div className="scan-mini">
              <svg viewBox={`0 0 ${frame.width} ${frame.height}`} role="img" aria-label={`Where ${labelOf(target)} is on the whole picture.`}>
                <image href={loaded.href} width={frame.width} height={frame.height} preserveAspectRatio="none" />
                <g className="box active">
                  <circle className="ring-outline" cx={region.center_px[0]} cy={region.center_px[1]} r={region.radius_px} />
                  <circle className="ring" cx={region.center_px[0]} cy={region.center_px[1]} r={region.radius_px} />
                </g>
              </svg>
              <span>Where {labelOf(target)} is on the whole picture: {region.name}.{worldMap && ` ${groundNote(region, frame)}`}</span>
            </div>
          )}
        </ScanSide>
      </figure>

      <details className="scan-how">
        <summary>How the picture becomes sound</summary>
        <ul>
          {loaded && !loaded.isTest && (
            <li>
              <strong>Which picture.</strong> One still: {scene.source.title}, {rule.still.frame}
              {stillTime(rule.still.time ?? undefined)}, {rule.still.how}. This picture has its own settings, measured on
              this still; its numbers are never compared with another picture's.
            </li>
          )}
          <li><strong>Where.</strong> Higher on the picture is a higher note (on the radar: further from the centre). There are 12 bands, on the five notes C, D, E, G and A. Low bands are far apart and high bands close together, as a choir is spaced.</li>
          <li>
            <strong>How much colour.</strong> More colour under the line is louder, and a little brighter in tone. In this
            picture a cell at or below {Number((rule.floor * 255).toFixed(2))} of 255 is silent
            {rule.floor === 12 / 255 ? ' (black sea and grey land)' : ', just above the colour drawn where there is nothing'}. A soft held note sounds for every band the line is crossing.
          </li>
          {rule.mask && !loaded?.isTest && (
            <li>
              <strong>Pixels never read.</strong> The scan never reads {rule.mask.what}. There it has no data: it is silent, it
              strikes no note, and it does not count as a zero. They are hatched on the picture.
            </li>
          )}
          <li>
            <strong>Peaks of colour.</strong> When a band has more colour under the line than just before and just after, one
            note is struck, an octave above that band's held note. Peaks that follow each other too closely are left out, so
            each struck note can be heard.
          </li>
          <li>
            <strong>Which colour.</strong> Where most of that colour is on the red side of yellow (red and orange), the note is
            struck on one instrument.{' '}
            {blueClass
              ? 'Where most of it has blue as its largest channel, it is struck on a third. Otherwise it is struck on the second.'
              : 'Where it is not (yellow-green, green and blue), it is struck on another.'}
            {loaded && !loaded.isTest && (
              <>
                {' '}In this picture the {sound.warmName} means {rule.instruments.warm}; the {sound.coolName}, {rule.instruments.cool}
                {rule.instruments.blue ? <>; the {sound.blueName}, {rule.instruments.blue}</> : null}.
                {rule.measured.bar0SwitchValue !== undefined && (
                  <> On NASA's colour bar for this picture the switch falls at about {Math.round(rule.measured.bar0SwitchValue)} °C, if the bar's scale is even. We measured the bar, not the sea.</>
                )}
              </>
            )}
          </li>
          {loaded && !loaded.isTest && (
            <li>
              <strong>What the scan cannot tell you.</strong> {rule.limits.join(' ')}
            </li>
          )}
          <li><strong>Left and right.</strong> The sound sits where the line is: it travels from the left speaker to the right with the line.</li>
          <li>
            <strong>Decoration, not data.</strong> The scale is fixed. The low note steps through C, A, F and G on a fixed
            timetable, so the same held notes sound like four chords. The picture sets only how loud that low note is.
          </li>
          <li>
            <strong>Scan sound.</strong> Every choice plays the same notes at the same times. Only the instruments change, and
            all of them are made by this page's own code.
          </li>
        </ul>
      </details>

      {score && (
        <ScanExplanation
          score={score}
          ctx={why}
          choices={choices}
          playing={state === 'playing'}
          getColumn={liveColumn}
          lastStruck={lastStruck}
          view={whyView}
          onChange={changeWhy}
          bandSentenceId={bandSentenceId}
        />
      )}
    </div>
  );
});

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
function circlePath(cx: number, cy: number, r: number): string {
  return `M${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}Z`;
}

/** The part of the rim the line has already passed: an arc from 3 o'clock, anticlockwise, to the line. */
function arcPath(cx: number, cy: number, r: number, position: number): string {
  if (position <= 0.0005) return '';
  const p = Math.min(position, 0.9995);
  const angle = 2 * Math.PI * p;
  return `M${cx + r} ${cy}A${r} ${r} 0 ${p > 0.5 ? 1 : 0} 0 ${cx + r * Math.cos(angle)} ${cy - r * Math.sin(angle)}`;
}

/** The part of the circle the radar has not reached yet: from the line round (anticlockwise) to
 *  3 o'clock. `position` is how far round the line is, 0 to 1. */
function sectorPath(cx: number, cy: number, r: number, position: number): string {
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
function profilePath(
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
function stillTime(iso?: string): string {
  return iso ? `, ${iso.replace('T', ' ').replace('Z', ' UTC')}` : '';
}
