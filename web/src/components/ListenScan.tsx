// Listen, the picture and step 3: the picture scan played with the page's player bar (P1, decision
// D1: Listen's sound is the scan; the Earth rhythm stays the sound of Compare and the game).
//
// The picture is framed by its own two sound axes:
//   - under it, the sound line: every struck note of the scan, by time and pitch, with the playhead.
//     On the map sweep its x is the picture's x, so the playhead stands under the scan line;
//   - beside it, the twelve held notes, each next to the band of the picture it reads.
// Everything is drawn from the same score and the same audio clock as the sound. The score uses the
// chosen picture's own settings (data/sources.ts, ScanRule), never another picture's.
// No sound before Play; Stop and Esc (App) silence it; choosing another picture stops it (App).
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { scanSound, SCAN_SOUNDS, type ScanSoundId } from '../audio/instruments';
import { scanChoicesFor } from '../audio/scanChoices';
import { ScanPlayer, type ScanState } from '../audio/scanPlayer';
import { bandNote, noteName, pictureScore, type Chime, type ScanScore } from '../audio/scanScore';
import {
  factsOf,
  regionLetter,
  scanFrame,
  scanRegions,
  targetName,
  type ScanTarget,
  type Source,
} from '../data/sources';
import type { Region } from '../data/types';
import { PlayerBar, regionStyle, type RegionLook } from './ExploreControls';
import { useScanPicture, useSweepRefs } from './PictureScan';
import { ScanExplanation } from './ScanExplanation';
import { ScanHow, ScanLegend } from './ScanLegend';
import { MAX_TRACES, ScanOverlay, chimePosition, drawSweep, longitude, viewOf, type Trace } from './ScanOverlay';
import { Graticule } from './SceneView';

export interface ListenScanHandle {
  /** Silence the scan and rewind it (the page's Stop and Esc, and a change of picture). */
  stop: () => void;
}

interface Props {
  picture: Source;
  target: ScanTarget;
  look: RegionLook;
  speed: number;
  onSpeed: (speed: number) => void;
  volumeDb: number;
  onVolume: (db: number) => void;
  soundId: ScanSoundId;
  onSound: (id: ScanSoundId) => void;
  explaining: boolean;
  onExplain: () => void;
  explanationRef: RefObject<HTMLElement | null>;
  /** Pressing a circle on the picture chooses it in step 2 (keyboard users use step 2). */
  onPickRegion: (regionId: string) => void;
}

declare global {
  interface Window {
    __scanScore?: ScanScore | null;
  }
}

const WORD: Record<ScanState, string> = { stopped: 'Ready', paused: 'Paused', playing: 'Playing' };

/** "0:13": minutes and seconds. */
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export const ListenScan = forwardRef<ListenScanHandle, Props>(function ListenScan(p, ref) {
  const { picture, target } = p;
  const rule = picture.scan;
  const { loaded, mask, error } = useScanPicture(picture.imageUrl, rule);
  const [state, setState] = useState<ScanState>('stopped');
  const [traces, setTraces] = useState<Trace[]>([]);
  // The note most recently struck, with the instrument names it had when it was struck.
  const [lastStruck, setLastStruck] = useState<{ chime: Chime; names: { held: string; warm: string; cool: string } } | null>(null);
  const player = useRef<ScanPlayer | null>(null);
  const sweepRefs = useSweepRefs();
  const meter = useRef<(HTMLElement | null)[]>([]);
  const lane = useRef<HTMLDivElement>(null);
  const whereText = useRef<HTMLSpanElement>(null);
  const timeText = useRef<HTMLSpanElement>(null);
  const traceId = useRef(0);
  const reducedMotion = useMemo(() => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, []);
  const sound = scanSound(p.soundId);

  const test = !picture.imageUrl;
  const frame = scanFrame(picture);
  const regions = scanRegions(picture);
  const region = target === 'map' ? undefined : regions.find((r) => r.id === target);
  const worldMap = !test && !!rule?.worldMap;
  const name = targetName(picture, region ? region.id : 'map');

  // The score, with this picture's own settings: the same recipe as `npm run measure`.
  const score = useMemo<ScanScore | null>(() => {
    if (!loaded || !rule) return null;
    if (!region) return pictureScore(loaded.pixels, rule, mask, { kind: 'line' });
    return pictureScore(loaded.pixels, rule, mask, { kind: 'radar', frameWidth: loaded.isTest ? loaded.pixels.width : picture.scene.frames.width, region });
  }, [loaded, mask, rule, region, picture.scene.frames.width]);
  const bands = score?.grid.bands ?? 12;
  const columns = score?.grid.columns ?? 1;
  const seconds = score?.grid.seconds ?? 30;

  const onChime = useCallback(
    (chime: Chime) => {
      setLastStruck({ chime, names: { held: sound.heldName, warm: sound.warmName, cool: sound.coolName } });
      // The band's bar flashes. Restarting the animation needs the class to go and come back.
      const bar = meter.current[chime.band];
      if (bar) {
        bar.classList.remove('hit');
        void bar.offsetWidth;
        bar.classList.add('hit');
      }
      const [x, y] = chimePosition(chime, columns, bands, frame, region);
      const id = ++traceId.current;
      setTraces((t) => [...t.slice(-(MAX_TRACES - 1)), { id, x, y, warm: chime.warm }]);
    },
    [columns, bands, frame, region, sound],
  );
  const onChimeRef = useRef(onChime);
  onChimeRef.current = onChime;

  useEffect(() => {
    const pl = new ScanPlayer({ onState: setState, onChime: (c) => onChimeRef.current(c) });
    player.current = pl;
    return () => pl.dispose();
  }, []);
  useEffect(() => {
    player.current?.setScore(score);
    setTraces([]);
    setLastStruck(null);
    if (import.meta.env.DEV) window.__scanScore = score;
  }, [score]);
  useEffect(() => player.current?.setSpeed(p.speed), [p.speed]);
  useEffect(() => player.current?.setVolume(p.volumeDb), [p.volumeDb]);
  useEffect(() => player.current?.setSound(p.soundId), [p.soundId]);
  useEffect(() => {
    if (state === 'stopped') {
      setTraces([]);
      setLastStruck(null);
    }
  }, [state]);
  useImperativeHandle(ref, () => ({ stop: () => player.current?.stop() }), []);

  // Draw with the sound: one loop for as long as Listen is open, asking the player where the line
  // is on every frame (PictureScan.tsx explains why it must not wait for React).
  const speedRef = useRef(p.speed);
  speedRef.current = p.speed;
  const drawFrame = useRef<(now: number) => void>(() => {});
  const redraw = useRef(true);
  const drawn = useRef({ position: 0, textAt: 0, levels: new Float32Array(0) });
  useEffect(() => {
    redraw.current = true;
    drawFrame.current = (now: number) => {
      const pl = player.current;
      if (!score || !pl) return;
      const playing = pl.getState() === 'playing';
      if (!playing && !redraw.current) return;
      redraw.current = false;
      const grid = score.grid;
      const cyclic = score.shape === 'radar';
      if (drawn.current.levels.length !== grid.bands) drawn.current.levels = new Float32Array(grid.bands);
      const levels = drawn.current.levels;

      let position = pl.position();
      if (reducedMotion) position = Math.floor(position * grid.seconds) / grid.seconds;
      if (position < drawn.current.position - 0.5) setTraces([]);
      drawn.current.position = position;

      const at = position * grid.columns;
      const c0 = Math.min(grid.columns - 1, Math.floor(at));
      const c1 = cyclic ? (c0 + 1) % grid.columns : Math.min(grid.columns - 1, c0 + 1);
      const mix = reducedMotion ? 0 : at - c0;
      // Stopped: nothing sounds, so the held notes' bars are empty.
      const quiet = pl.getState() === 'stopped';
      for (let band = 0; band < grid.bands; band++) {
        const level = score.levels[c0 * grid.bands + band] * (1 - mix) + score.levels[c1 * grid.bands + band] * mix;
        levels[band] = level;
        meter.current[band]?.style.setProperty('--level', quiet ? '0' : level.toFixed(3));
      }
      drawSweep(sweepRefs, frame, region, position, levels);
      lane.current?.style.setProperty('--pos', position.toFixed(4));

      if (now - drawn.current.textAt > 240 || !playing) {
        drawn.current.textAt = now;
        const total = grid.seconds / speedRef.current;
        if (timeText.current) timeText.current.textContent = `${clock(position * total)} / ${clock(total)}`;
        if (whereText.current) {
          whereText.current.textContent =
            pl.getState() === 'stopped'
              ? ''
              : region
                ? `line at ${Math.round(position * 360)}°`
                : worldMap
                  ? `line at ${longitude(position)}`
                  : `line ${Math.round(position * 100)}% across`;
        }
      }
    };
  }, [score, state, region, frame, worldMap, reducedMotion, sweepRefs]);
  useEffect(() => {
    redraw.current = true; // the time on screen follows the speed
  }, [p.speed]);
  useEffect(() => {
    let raf = requestAnimationFrame(function tick(now) {
      drawFrame.current(now);
      raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const across = worldMap ? 'west to east' : 'left to right';
  const fullName = region && !test ? `${name}, ${region.name}` : name.toLowerCase() === 'whole picture' ? 'the whole picture' : name;
  // One sentence for screen readers, only on real changes (DESIGN.md: state is shown, not narrated).
  const status =
    state === 'playing'
      ? region
        ? `Playing ${fullName}: a radar line turns once around the circle.`
        : `Playing the whole picture: a line moves ${across}.`
      : state === 'paused'
        ? `Paused on ${fullName}.`
        : `Stopped. ${region ? fullName : 'The whole picture'} selected.`;

  const why = useMemo(
    () => ({ geometry: worldMap ? ('world' as const) : ('plain' as const), names: { held: sound.heldName, warm: sound.warmName, cool: sound.coolName } }),
    [worldMap, sound],
  );
  const choices = useMemo(() => scanChoicesFor(rule ? factsOf(rule) : undefined), [rule]);
  const liveColumn = useCallback(() => Math.min(columns - 1, Math.floor((player.current?.position() ?? 0) * columns)), [columns]);
  const order = region ? 'the centre to the rim' : worldMap ? 'south to north' : 'bottom to top';
  const letter = region && !test ? regionLetter(picture, region.id) : null;
  const axis = region
    ? worldMap
      ? ['0° E', '90° N', '180° W', '270° S', '360° E']
      : ['0°', '90°', '180°', '270°', '360°']
    : worldMap
      ? ['180°', '120° W', '60° W', '0°', '60° E', '120° E', '180°']
      : ['left edge', 'middle', 'right edge'];
  const aspect = frame.width / frame.height;
  const figureState = [state, reducedMotion ? 'still' : ''].join(' ').trim();

  return (
    <div className={`listen-scan ${region ? 'radar' : 'line'}`} style={{ '--aspect': aspect } as CSSProperties}>
      <div className="listen-area">
        <div className="listen-axes">
          {region ? (
            <div className="listen-radar">
              <figure className={`listen-figure scan-view radar ${figureState}`}>
                <div className="zoom">
                  <RadarPicture frame={frame} region={region} href={loaded?.href ?? null} label={`${test ? 'Test picture' : picture.scene.source.title}, zoomed to ${fullName}.`}>
                    <ScanOverlay frame={frame} region={region} bands={bands} traces={traces} worldMap={worldMap} refs={sweepRefs} />
                  </RadarPicture>
                </div>
              </figure>
              <div className="listen-where" style={regionStyle(picture.scene.regions, region.id, p.look)}>
                <p className="where-name">
                  {letter && <span className="region-badge" aria-hidden="true">{letter}</span>}
                  {test ? name : `${name}: ${region.name}`}
                </p>
                {!test && <p className="where-desc">{region.description}</p>}
                <p className="where-desc">The radar reads only inside the circle. The centre is low, the rim high.</p>
                {loaded && !test && (
                  <svg className="where-map" viewBox={`0 0 ${frame.width} ${frame.height}`} role="img" aria-label={`Where ${name} is on the whole picture.`}>
                    <image href={loaded.href} width={frame.width} height={frame.height} preserveAspectRatio="none" />
                    <g className="box active">
                      <circle className="ring-outline" cx={region.center_px[0]} cy={region.center_px[1]} r={region.radius_px * 1.6} />
                      <circle className="ring" cx={region.center_px[0]} cy={region.center_px[1]} r={region.radius_px * 1.6} />
                    </g>
                  </svg>
                )}
              </div>
            </div>
          ) : (
            <figure className={`listen-figure scan-view line ${figureState}`}>
              <div className="chart">
                <svg
                  viewBox={`0 0 ${frame.width} ${frame.height}`}
                  role="img"
                  aria-label={
                    test
                      ? 'Test picture for the scan: three coloured dots and a grey block on black.'
                      : `${picture.scene.source.title}, with ${regions.length} regions: ${regions.map((r) => `${targetName(picture, r.id)}, ${r.name}`).join('; ')}.`
                  }
                >
                  {loaded ? (
                    <image href={loaded.href} width={frame.width} height={frame.height} preserveAspectRatio="none" />
                  ) : (
                    <rect width={frame.width} height={frame.height} className="frame-placeholder" />
                  )}
                  {regions.map((r) => (
                    <g key={r.id} className="box" style={regionStyle(picture.scene.regions, r.id, p.look)} data-region={r.id} onClick={() => p.onPickRegion(r.id)}>
                      <circle className="ring-outline" cx={r.center_px[0]} cy={r.center_px[1]} r={r.radius_px} />
                      <circle className="ring" cx={r.center_px[0]} cy={r.center_px[1]} r={r.radius_px} />
                    </g>
                  ))}
                  <ScanOverlay frame={frame} bands={bands} traces={traces} worldMap={worldMap} refs={sweepRefs} />
                </svg>
                {!test && <MapTags picture={picture} regions={regions} frame={frame} look={p.look} />}
                {worldMap && <Graticule />}
              </div>
            </figure>
          )}

          {/* The y axis: the twelve held notes, highest at the top, each beside the band it reads. */}
          <div className="band-meter" aria-hidden="true">
            {Array.from({ length: bands }, (_, i) => bands - 1 - i).map((band) => (
              <span key={band} className="band" ref={(el) => void (meter.current[band] = el)}>
                <b>{noteName(bandNote(band))}</b>
                <i />
              </span>
            ))}
          </div>

          <div className="listen-under">
            {test ? (
              <span className="scan-test">TEST INPUT — a made-up picture, not NASA data</span>
            ) : (
              <span className="credit">
                Visualization: {picture.scene.source.credit}
                {rule?.mask && <span className="never-read"> · The scan never reads {rule.mask.what}.</span>}
              </span>
            )}
            <div className="listen-notes" aria-live="polite">
              {error && <p className="missing">The picture did not load: {error}. The scan stays quiet.</p>}
              {!rule && <p className="missing">The scan has not been measured on this picture yet, so it does not play it.</p>}
              {score?.status === 'missing' && <p className="missing">Nothing to play for {fullName}: {score.reason}. The scan stays quiet.</p>}
            </div>
          </div>
        </div>

        <PlayerBar
          className="axis"
          label="Step 3 of 3: play"
          step={3}
          playState={state}
          canPlay={score?.status === 'ok'}
          explaining={p.explaining}
          speed={p.speed}
          volumeDb={p.volumeDb}
          onStart={() => void player.current?.start()}
          onPause={() => player.current?.pause()}
          onStop={() => player.current?.stop()}
          onExplain={p.onExplain}
          onSpeed={p.onSpeed}
          onVolume={p.onVolume}
          settings={
            <label className="scan-sound">
              Instruments{' '}
              <select value={p.soundId} onChange={(e) => p.onSound(e.target.value as ScanSoundId)}>
                {SCAN_SOUNDS.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </label>
          }
        >
          <div className="sound-line" aria-hidden="true">
            <div className="sl-head">
              <span className={`now-chip ${state}`}>
                {letter ? <b className="region-badge" style={regionStyle(picture.scene.regions, region!.id, p.look)}>{letter}</b> : <span className={region ? 'circle-icon small' : 'sweep-icon small'} />}
                <span>{name} · {WORD[state]}</span>
              </span>
              <span className="sl-where" ref={whereText} />
              <span className="sl-time" ref={timeText}>0:00 / {clock(seconds)}</span>
            </div>
            <div className={state === 'stopped' ? 'sl-lane idle' : 'sl-lane'} ref={lane}>
              <SoundMarks score={score} />
              <SoundMarks score={score} played />
              <span className="sl-playhead" />
            </div>
            <div className="sl-axis">
              {axis.map((t, i) => (
                <span key={i} style={{ left: `${(100 * i) / (axis.length - 1)}%` }}>{t}</span>
              ))}
            </div>
          </div>
        </PlayerBar>
      </div>

      <p className="status sr-only" role="status">{status}</p>

      {p.explaining && (
        <section className="explain-scan" ref={p.explanationRef} tabIndex={-1} aria-labelledby="explain-scan-title">
          {/* The honesty lines are said once, on How it's made (team rule), not in every explanation. */}
          <h3 id="explain-scan-title">Where each note comes from</h3>
          {score ? (
            <ScanExplanation score={score} ctx={why} playing={state === 'playing'} getColumn={liveColumn} lastStruck={lastStruck} choices={choices} startOpen />
          ) : (
            <p className="muted">Nothing to explain yet: the scan has no score for this picture.</p>
          )}
          <details className="scan-legend-box">
            <summary>What the marks mean</summary>
            <ScanLegend sound={sound} order={order} radar={!!region} bars="beside" />
          </details>
          <details className="scan-how">
            <summary>How the picture becomes sound</summary>
            <ScanHow scene={picture.scene} rule={rule} isTest={test} />
          </details>
        </section>
      )}
    </div>
  );
});

/** The zoomed circle for the radar. */
function RadarPicture({ frame, region, href, label, children }: { frame: { width: number; height: number }; region: Region; href: string | null; label: string; children: React.ReactNode }) {
  const { view } = viewOf(frame, region);
  return (
    <svg viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} role="img" aria-label={label}>
      {href ? <image href={href} width={frame.width} height={frame.height} preserveAspectRatio="none" /> : <rect width={frame.width} height={frame.height} className="frame-placeholder" />}
      {children}
    </svg>
  );
}

/** Every struck note of the score on the sound line: x is time (the picture's x on the map sweep, the
 *  turn on the radar), y is pitch. The second copy shows the notes already played, clipped at the playhead. */
function SoundMarks({ score, played = false }: { score: ScanScore | null; played?: boolean }) {
  if (!score) return <div className={played ? 'sl-marks played' : 'sl-marks'} />;
  const { columns, bands } = score.grid;
  return (
    <div className={played ? 'sl-marks played' : 'sl-marks'}>
      {score.chimes.map((c) => (
        <i
          key={`${c.column}-${c.band}`}
          className={c.warm ? 'warm' : 'cool'}
          style={{ left: `${(100 * (c.column + 0.5)) / columns}%`, top: `${100 * (1 - (c.band + 0.5) / bands)}%` }}
        />
      ))}
    </div>
  );
}

/** Region tags on the map: above each circle, or below it when the space above runs into another
 *  circle (the rain picture's two circles sit close together). */
function MapTags({ picture, regions, frame, look }: { picture: Source; regions: Region[]; frame: { width: number; height: number }; look: RegionLook }) {
  // A tag is about 90 × 24 px on a picture about 800 px wide: its size in the frame's own pixels.
  const tagW = (90 / 800) * frame.width;
  const tagH = (24 / 800) * frame.width;
  const gap = (6 / 800) * frame.width;
  const hits = (x0: number, y0: number, self: Region) =>
    regions.some((o) => {
      if (o === self) return false;
      const nx = Math.max(x0, Math.min(o.center_px[0], x0 + tagW));
      const ny = Math.max(y0, Math.min(o.center_px[1], y0 + tagH));
      return Math.hypot(nx - o.center_px[0], ny - o.center_px[1]) < o.radius_px;
    });
  return (
    <>
      {regions.map((r) => {
        const [cx, cy] = r.center_px;
        const below = hits(cx - tagW / 2, cy - r.radius_px - gap - tagH, r);
        const letter = regionLetter(picture, r.id);
        return (
          <span
            key={r.id}
            className={below ? 'map-tag below' : 'map-tag'}
            aria-hidden="true"
            style={{
              ...regionStyle(picture.scene.regions, r.id, look),
              left: `${(cx / frame.width) * 100}%`,
              top: `${((below ? cy + r.radius_px : cy - r.radius_px) / frame.height) * 100}%`,
            }}
          >
            <b>{letter}</b>
            <span>Region {letter}</span>
          </span>
        );
      })}
    </>
  );
}
