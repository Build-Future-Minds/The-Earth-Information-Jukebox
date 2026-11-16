// "Play the picture": a line sweeps the NASA image and plays what it crosses, after NASA's own
// image sonifications (docs/mapping_spec.md, "The picture scan: what Listen plays"). Listen plays the
// same scan with the page's player bar (components/ListenScan.tsx); this one, on Play along, has its
// own buttons. It has its own player, clock and volume (audio/scanPlayer.ts) and never changes the
// Earth rhythm. It reads the picture chosen on Listen, with that picture's own settings. In practice mode there is no NASA image, so it scans a labelled
// TEST INPUT picture instead.
//
// This is the flat view of the scan. The picture, the score, the player, the controls, the bars
// and the legend are shared with the globe (web/src/scan/); this file draws the line on the flat
// picture.
//
// What you see is what you hear, drawn from the same score and the same audio clock as the sound:
//   - the picture lights up as the line passes (the part not played yet is dimmed);
//   - a white shape rides the line: wide where a band is loud;
//   - every chime leaves a mark on the picture (round for warm colours, a diamond for cool ones);
//   - the bars beside the picture are the low note and the twelve held notes, low to high;
//   - the legend names every one of these, with the same shapes.
// Everything drawn over the NASA image is black or white: its colours are never changed.
import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { Scene } from '../data/types';
import { scanChoicesFor } from '../audio/scanChoices';
import { factsOf, type ScanRule } from '../data/sources';
import { cellAt, cellOutline, cellTicks, type ScanPlacement } from '../audio/scanPick';
import { chosenBand, explainPick, whyColumn } from '../audio/scanWhy';
import { ScanButtons, ScanSettings, ScanStatus } from '../scan/ScanControls';
import { ScanHow } from '../scan/ScanLegend';
import { ScanOverlay, drawSweep, viewOf } from '../scan/ScanOverlay';
import { ScanSide } from '../scan/ScanSide';
import { useScan, type ScanHandle } from '../scan/useScan';
import { useScanFrame } from '../scan/useScanFrame';
import { ScanExplanation, WHY_START, type WhyView } from './ScanExplanation';

export type PictureScanHandle = ScanHandle;

interface Props {
  scene: Scene;
  /** The NASA still, or null in practice mode. */
  imageUrl: string | null;
  /** The page's speed setting: the scan follows it. */
  speed: number;
  /** This picture's own settings (data/sources.ts). null: not measured yet, so the scan does not play it. */
  rule: ScanRule | null;
}

/** A press that moves further than this (CSS pixels) before it lets go is a drag, not a tap: it picks nothing. */
const TAP_SLOP = 10;

export const PictureScan = forwardRef<PictureScanHandle, Props>(function PictureScan({ scene, imageUrl, speed, rule }, ref) {
  const scan = useScan({ scene, imageUrl, speed, rule });
  const { loaded, target, state, traces, frame, region, worldMap, score, bands, labelOf, why, liveColumn, lastStruck, reducedMotion } = scan;
  const sweep = useRef<SVGGElement>(null);
  const profile = useRef<SVGPathElement>(null);
  const unplayed = useRef<SVGPathElement>(null);
  const played = useRef<SVGPathElement>(null);
  const sweepRefs = useMemo(() => ({ sweep, profile, unplayed, played }), []);
  const picture = useRef<SVGSVGElement>(null);
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
    const m = picture.current?.getScreenCTM();
    if (!m || !score || !placement) return;
    // Screen to picture units, through the SVG's own viewBox (the radar view is zoomed to its circle).
    const at = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    const cell = cellAt(at.x, at.y, score.grid, placement);
    if (!cell) return; // outside the picture, or outside the circle: nothing happens
    changeWhy({ open: true, column: cell.column, pick: cell.band, follow: false });
  };

  useImperativeHandle(ref, () => ({ stop: scan.stop }), []);
  // "Why the scan sounds like this" lists this picture's own floor, full level and switch.
  const choices = useMemo(() => scanChoicesFor(rule ? factsOf(rule) : undefined), [rule]);

  // The line on the flat picture, moved every frame by the shared loop.
  useScanFrame(scan, ({ position, levels, region: r, frame: f }) => drawSweep(sweepRefs, f, r, position, levels));

  // Radar view: zoom to the circle with a small margin. Sizes drawn on the picture are shares of
  // what is in view, so they look the same on the map and on the zoomed circle.
  const { view, unit } = viewOf(frame, region);
  const figureClass = ['scene', 'scan-view', region ? 'radar' : 'line', state, reducedMotion ? 'still' : ''].join(' ').trim();

  return (
    <div className="scan" role="group" aria-labelledby="scan-heading">
      <h3 id="scan-heading">Play the picture</h3>
      <p className="muted">A line sweeps the picture and plays the colours it crosses. A rule we chose; the Earth rhythm is unchanged.</p>

      <ScanButtons scan={scan} />
      <ScanSettings scan={scan} />
      <ScanStatus scan={scan} />
      {!rule && <p className="missing">The scan has not been measured on this picture yet, so it does not play it.</p>}

      <figure className={figureClass} style={{ '--aspect': view.w / view.h } as React.CSSProperties}>
        <div className="scan-picture">
          {loaded?.isTest && <span className="scan-test">TEST INPUT — a made-up picture, not NASA data</span>}
          <svg
            ref={picture}
            viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
            role="img"
            aria-label={
              loaded?.isTest
                ? 'Test picture for the scan: three coloured dots and a grey block on black.'
                : `${scene.source.title}, with the scan line${region ? ` on ${labelOf(target)}, ${region.name}` : ''}.`
            }
            aria-describedby={hintId}
            onPointerDown={onPressStart}
            onPointerUp={onPressEnd}
            onPointerCancel={() => (press.current = null)}
          >
            {loaded ? (
              <image href={loaded.href} width={frame.width} height={frame.height} preserveAspectRatio="none" />
            ) : (
              <rect width={frame.width} height={frame.height} className="frame-placeholder" />
            )}

            <ScanOverlay frame={frame} region={region} bands={bands} traces={traces} worldMap={worldMap} refs={sweepRefs} />

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
              <span>Where {labelOf(target)} is on the whole picture: {region.name}.</span>
            </div>
          )}
        </ScanSide>
      </figure>

      <details className="scan-how">
        <summary>How the picture becomes sound</summary>
        <ScanHow scene={scene} rule={rule} isTest={!!loaded?.isTest} />
      </details>

      {score && (
        <ScanExplanation
          score={score}
          ctx={why}
          playing={state === 'playing'}
          getColumn={liveColumn}
          lastStruck={lastStruck}
          view={whyView}
          onChange={changeWhy}
          bandSentenceId={bandSentenceId}
          choices={choices}
        />
      )}
    </div>
  );
});
