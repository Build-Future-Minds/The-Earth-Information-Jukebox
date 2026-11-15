// "Play the picture": a line sweeps the NASA image and plays what it crosses, after NASA's own
// image sonifications (docs/mapping_spec.md, "Play along: the picture scan").
// A play-along extra: it has its own player, clock and volume (audio/scanPlayer.ts) and never
// changes the Earth rhythm. In practice mode there is no NASA image, so it scans a labelled
// TEST INPUT picture instead.
//
// What you see is what you hear, drawn from the same score and the same audio clock as the sound:
//   - the picture lights up as the line passes (the part not played yet is dimmed);
//   - a white shape rides the line: wide where a band is loud;
//   - every chime leaves a mark on the picture (round for warm colours, a diamond for cool ones);
//   - the bars beside the picture are the low note and the twelve held notes, low to high;
//   - the legend names every one of these, with the same shapes.
// Everything drawn over the NASA image is black or white: its colours are never changed.
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { Region, Scene } from '../data/types';
import { DEFAULT_SCAN_SOUND, SCAN_SOUNDS, scanSound, type ScanSoundDef, type ScanSoundId } from '../audio/instruments';
import { ScanPlayer, type ScanState } from '../audio/scanPlayer';
import {
  ROOT_NOTES,
  bandNote,
  buildScanScore,
  chimeNote,
  cropPixels,
  TEST_CIRCLE,
  makeTestPicture,
  noteName,
  rootNoteAt,
  type Chime,
  type Pixels,
  type ScanMeasure,
  type ScanScore,
  type ScanShape,
} from '../audio/scanScore';
import { regionLabel } from './ExploreControls';

export interface PictureScanHandle {
  /** Silence the scan and rewind it (the page's Stop and Esc). */
  stop: () => void;
}

interface Props {
  scene: Scene;
  /** The NASA still, or null in practice mode. */
  imageUrl: string | null;
  /** The page's speed setting: the scan follows it. */
  speed: number;
  /** What counts as light in this picture. Colour suits the ocean picture (grey land is silent). */
  measure?: ScanMeasure;
}

/** What the line reads: the whole picture, or one region's circle. */
type Target = 'map' | string;

interface Loaded {
  /** URL shown on screen. */
  href: string;
  pixels: Pixels;
  /** true: the made-up TEST INPUT picture, not NASA data. */
  isTest: boolean;
}

/** A chime that has sounded in this sweep: where it is on the picture. */
interface Trace {
  id: number;
  x: number;
  y: number;
  warm: boolean;
}

declare global {
  interface Window {
    /** Development only: the score being played, for measurements and browser tests. */
    __scanScore?: ScanScore | null;
  }
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
/** Most chime marks kept on the picture (one sweep makes about 70). */
const MAX_TRACES = 160;

function loadPicture(imageUrl: string | null): Promise<Loaded> {
  if (!imageUrl) {
    const pixels = makeTestPicture();
    const canvas = document.createElement('canvas');
    canvas.width = pixels.width;
    canvas.height = pixels.height;
    canvas.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(pixels.data), pixels.width, pixels.height), 0, 0);
    return Promise.resolve({ href: canvas.toDataURL('image/png'), pixels, isTest: true });
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return reject(new Error('This browser cannot read the picture.'));
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      resolve({ href: imageUrl, pixels: { data: data.data, width: data.width, height: data.height }, isTest: false });
    };
    img.onerror = () => reject(new Error('The picture did not load.'));
    img.src = imageUrl;
  });
}

export const PictureScan = forwardRef<PictureScanHandle, Props>(function PictureScan({ scene, imageUrl, speed, measure = 'colour' }, ref) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [target, setTarget] = useState<Target>('map');
  const [state, setState] = useState<ScanState>('stopped');
  const [volumeDb, setVolumeDb] = useState(-8);
  const [soundId, setSoundId] = useState<ScanSoundId>(DEFAULT_SCAN_SOUND);
  const [traces, setTraces] = useState<Trace[]>([]);
  const player = useRef<ScanPlayer | null>(null);
  const sweep = useRef<SVGGElement>(null);
  const profile = useRef<SVGPathElement>(null);
  const unplayed = useRef<SVGPathElement>(null);
  const played = useRef<SVGPathElement>(null);
  const bars = useRef<(HTMLElement | null)[]>([]);
  const rootBar = useRef<HTMLElement>(null);
  const rootName = useRef<HTMLElement>(null);
  const readout = useRef<HTMLSpanElement>(null);
  const lastChime = useRef<HTMLSpanElement>(null);
  const traceId = useRef(0);
  const reducedMotion = useMemo(() => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, []);
  const sound = scanSound(soundId);

  // The picture's size on screen, in the units the scene uses (frame pixels).
  const frame = loaded?.isTest ? { width: loaded.pixels.width, height: loaded.pixels.height } : scene.frames;
  // Circles a radar can turn in: the scene's regions, or one test circle on the TEST picture.
  const regions: Region[] = loaded?.isTest ? [TEST_CIRCLE] : scene.regions;
  const region = target === 'map' ? undefined : regions.find((r) => r.id === target);
  // "West to east" only for a whole-world map; any other picture is read left to right.
  const worldMap = !!loaded && !loaded.isTest && scene.source.limitations.some((l) => /equirectangular/i.test(l));
  const across = worldMap ? 'west to east' : 'left to right';

  // What the line reads, and the score it makes. Same picture, same score, every time.
  const score = useMemo<ScanScore | null>(() => {
    if (!loaded) return null;
    if (!region) return buildScanScore(loaded.pixels, { kind: 'line' }, { measure });
    const k = loaded.pixels.width / (loaded.isTest ? loaded.pixels.width : scene.frames.width); // the still may be smaller than the frames
    const [x, y, w, h] = region.box_px;
    const crop = cropPixels(loaded.pixels, Math.round(x * k), Math.round(y * k), Math.round(w * k), Math.round(h * k));
    const shape: ScanShape = { kind: 'radar', cx: crop.width / 2, cy: crop.height / 2, r: region.radius_px * k };
    return buildScanScore(crop, shape, { measure });
  }, [loaded, region, scene.frames.width, measure]);

  const bands = score?.grid.bands ?? 12;
  const columns = score?.grid.columns ?? 1;

  const onChime = useCallback(
    (chime: Chime) => {
      if (lastChime.current) lastChime.current.textContent = `${chime.warm ? sound.warmName : sound.coolName} ${noteName(chimeNote(chime))}`;
      // The bar for this band flashes. Restarting the animation needs the class to go and come back.
      const bar = bars.current[chime.band];
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
    const p = new ScanPlayer({ onState: setState, onChime: (c) => onChimeRef.current(c) });
    player.current = p;
    return () => p.dispose();
  }, []);

  useEffect(() => {
    let live = true;
    loadPicture(imageUrl).then(
      (l) => live && setLoaded(l),
      (e: Error) => live && setLoadError(e.message),
    );
    return () => {
      live = false;
    };
  }, [imageUrl]);

  useEffect(() => {
    player.current?.setScore(score);
    setTraces([]);
    if (import.meta.env.DEV) window.__scanScore = score;
  }, [score]);

  useEffect(() => player.current?.setSpeed(speed), [speed]);
  useEffect(() => player.current?.setVolume(volumeDb), [volumeDb]);
  useEffect(() => player.current?.setSound(soundId), [soundId]);
  // A stopped scan shows the clean picture: no marks from the last sweep.
  useEffect(() => {
    if (state === 'stopped') setTraces([]);
  }, [state]);

  useImperativeHandle(ref, () => ({ stop: () => player.current?.stop() }), []);

  // Draw with the sound. One loop runs for as long as the scan is on the page, and on every frame
  // it asks the player itself where the line is. It must not wait for React to report "playing":
  // choosing another scan while one plays stops and restarts the player within one tick, React
  // sees "playing" before and after and re-renders nothing, and a loop tied to that change was
  // never restarted. The notes played and the needle stood still (found and fixed 15 Nov).
  const drawFrame = useRef<(now: number) => void>(() => {});
  /** Set whenever something other than the moving line changes what should be on screen. */
  const redraw = useRef(true);
  const drawn = useRef({ position: 0, textAt: 0, levels: new Float32Array(0) });
  useEffect(() => {
    redraw.current = true;
    drawFrame.current = (now: number) => {
      const p = player.current;
      if (!score || !p) return;
      const playing = p.getState() === 'playing';
      if (!playing && !redraw.current) return; // nothing is moving: leave the picture as it is
      redraw.current = false;
      const grid = score.grid;
      const cyclic = score.shape === 'radar';
      if (drawn.current.levels.length !== grid.bands) drawn.current.levels = new Float32Array(grid.bands);
      const levels = drawn.current.levels;

      let position = p.position();
      // Reduced motion: the line jumps once a second instead of gliding.
      if (reducedMotion) position = Math.floor(position * grid.seconds) / grid.seconds;
      // A new sweep starts with a clean picture.
      if (position < drawn.current.position - 0.5) setTraces([]);
      drawn.current.position = position;

      // Levels under the line right now, gliding from one column to the next as the sound does.
      const at = position * grid.columns;
      const c0 = Math.min(grid.columns - 1, Math.floor(at));
      const c1 = cyclic ? (c0 + 1) % grid.columns : Math.min(grid.columns - 1, c0 + 1);
      const mix = reducedMotion ? 0 : at - c0;
      let sounding = 0;
      let mean = 0;
      for (let band = 0; band < grid.bands; band++) {
        const level = score.levels[c0 * grid.bands + band] * (1 - mix) + score.levels[c1 * grid.bands + band] * mix;
        levels[band] = level;
        mean += level / grid.bands;
        if (level > 0) sounding++;
        bars.current[band]?.style.setProperty('--level', level.toFixed(3));
      }
      rootBar.current?.style.setProperty('--level', Math.min(1, mean * 2).toFixed(3));

      if (region) {
        const [cx, cy] = region.center_px;
        sweep.current?.setAttribute('transform', `rotate(${-position * 360} ${cx} ${cy})`);
        profile.current?.setAttribute('d', profilePath(levels, (b) => cx + ((b + 0.5) * region.radius_px) / grid.bands, cy, region.radius_px * PROFILE_RADAR, cx, cx + region.radius_px, true));
        unplayed.current?.setAttribute('d', sectorPath(cx, cy, region.radius_px * 1.02, position));
        played.current?.setAttribute('d', arcPath(cx, cy, region.radius_px, position));
      } else {
        sweep.current?.setAttribute('transform', `translate(${position * frame.width} 0)`);
        profile.current?.setAttribute('d', profilePath(levels, (b) => frame.height - ((b + 0.5) * frame.height) / grid.bands, 0, frame.width * PROFILE_LINE, frame.height, 0, false));
      }

      // Text a few times a second is enough, and easier to read than a blur of digits.
      if (now - drawn.current.textAt > 240 || !playing) {
        drawn.current.textAt = now;
        const root = noteName(rootNoteAt(grid, c0));
        if (rootName.current) rootName.current.textContent = root;
        if (readout.current) {
          const where = region
            ? `line at ${Math.round(position * 360)}° (0° is east, turning anticlockwise)`
            : worldMap
              ? `line at about ${longitude(position)}`
              : `line ${Math.round(position * 100)}% of the way across`;
          readout.current.textContent = `${where} · ${sounding} of ${grid.bands} bands sounding · low note ${root}`;
        }
      }
    };
  }, [score, state, region, frame.width, frame.height, worldMap, reducedMotion]);
  useEffect(() => {
    let raf = requestAnimationFrame(function tick(now) {
      drawFrame.current(now);
      raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const labelOf = (t: Target) => (t === 'map' ? 'the whole picture' : loaded?.isTest ? 'the test circle' : regionLabel(scene.regions, t));
  const status =
    state === 'playing'
      ? region
        ? `Scanning ${labelOf(target)}: a radar line turns once around the circle.`
        : `Scanning ${labelOf(target)}: a line moves from ${across}.`
      : state === 'paused'
        ? `Scan paused on ${labelOf(target)}.`
        : 'Scan stopped.';

  const ready = score?.status === 'ok';
  // Radar view: zoom to the circle with a small margin.
  const margin = region ? region.radius_px * 0.16 : 0;
  const view = region
    ? { x: region.center_px[0] - region.radius_px - margin, y: region.center_px[1] - region.radius_px - margin, w: 2 * (region.radius_px + margin), h: 2 * (region.radius_px + margin) }
    : { x: 0, y: 0, w: frame.width, h: frame.height };
  // Sizes of things drawn on the picture, as shares of what is in view, so they look the same on
  // the map and on the zoomed circle.
  const unit = view.h / 100;
  const figureClass = ['scene', 'scan-view', region ? 'radar' : 'line', state, reducedMotion ? 'still' : ''].join(' ').trim();
  const order = region ? 'the centre to the rim' : worldMap ? 'south to north' : 'bottom to top';

  return (
    <div className="scan" role="group" aria-labelledby="scan-heading">
      <h3 id="scan-heading">Play the picture</h3>
      <p className="muted">
        A line sweeps the picture and plays what it crosses, the way NASA turns telescope images into sound. This is a rule we
        chose: it describes the picture's colours and positions, and it leaves the Earth rhythm unchanged.
      </p>

      <div className="row">
        {state === 'playing' ? (
          <button type="button" onClick={() => player.current?.pause()}>Pause the scan</button>
        ) : (
          <button type="button" className="primary" disabled={!ready} onClick={() => void player.current?.start()}>
            {state === 'paused' ? 'Resume the scan' : 'Play the picture'}
          </button>
        )}
        <button type="button" disabled={state === 'stopped'} onClick={() => player.current?.stop()}>Stop the scan</button>
        <label>
          Scan{' '}
          <select value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="map">Whole picture: a line, {across}</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{loaded?.isTest ? 'Test circle' : regionLabel(scene.regions, r.id)}: a radar turn</option>
            ))}
          </select>
        </label>
        <label>
          Scan sound{' '}
          <select value={soundId} onChange={(e) => setSoundId(e.target.value as ScanSoundId)}>
            {SCAN_SOUNDS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </label>
        <label className="range">
          <span className="range-row">
            <span>Scan volume</span>
            <span className="readout" aria-hidden="true">{volumeDb} dB</span>
          </span>
          <input
            type="range"
            min={-36}
            max={0}
            step={1}
            value={volumeDb}
            onChange={(e) => setVolumeDb(Number(e.target.value))}
            aria-valuetext={`${volumeDb} decibels`}
          />
        </label>
      </div>

      {/* Announced politely, and only when the scan starts, pauses or stops. Not role="status":
          the page has one status sentence, for the Earth rhythm. */}
      <div aria-live="polite">
        <p className="scan-status">{status}</p>
        {loadError && <p className="missing">The picture scan is not available: {loadError}</p>}
        {score?.status === 'missing' && (
          <p className="missing">
            Nothing to play for {labelOf(target)}: {score.reason}. The scan stays quiet.
          </p>
        )}
      </div>

      <figure className={figureClass} style={{ '--aspect': view.w / view.h } as React.CSSProperties}>
        <div className="scan-picture">
          {loaded?.isTest && <span className="scan-test">TEST INPUT — a made-up picture, not NASA data</span>}
          <svg
            viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
            role="img"
            aria-label={
              loaded?.isTest
                ? 'Test picture for the scan: three coloured dots and a grey block on black.'
                : `${scene.source.title}, with the scan line${region ? ` on ${labelOf(target)}, ${region.name}` : ''}.`
            }
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
            </defs>

            {loaded ? (
              <image href={loaded.href} width={frame.width} height={frame.height} preserveAspectRatio="none" />
            ) : (
              <rect width={frame.width} height={frame.height} className="frame-placeholder" />
            )}

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
                <g key={t.id} className={t.warm ? 'trace warm' : 'trace cool'} transform={`translate(${t.x} ${t.y})`}>
                  <circle className="ripple" r={unit * 5.5} />
                  {t.warm ? (
                    <circle className="chime-dot" r={unit * 1.15} />
                  ) : (
                    <g transform="rotate(45)">
                      <rect className="chime-dot" x={-unit * 1.1} y={-unit * 1.1} width={unit * 2.2} height={unit * 2.2} />
                    </g>
                  )}
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
          </svg>
          {!loaded?.isTest && <span className="credit">Visualization: {scene.source.credit}</span>}
        </div>

        <div className="scan-side">
          {/* The low note and the twelve held notes, low to high: how loud each is right now. A bar
              flashes when its band is struck. It repeats in shapes what the sound and the text say. */}
          <div className="notes" aria-hidden="true">
            <span className="note-bar root" ref={rootBar}>
              <i />
              <b ref={rootName}>{noteName(ROOT_NOTES[0])}</b>
            </span>
            {Array.from({ length: bands }, (_, band) => (
              <span key={band} className="note-bar" ref={(el) => void (bars.current[band] = el)} style={{ '--length': 1 - band * 0.035 } as React.CSSProperties}>
                <i />
                <b>{noteName(bandNote(band))}</b>
              </span>
            ))}
          </div>
          <span className="readout" aria-hidden="true">
            <span ref={readout}>line at the start</span>
            {' · last chime: '}
            <span ref={lastChime}>none yet</span>
          </span>

          <Legend sound={sound} order={order} radar={!!region} />

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
        </div>
      </figure>

      <details className="scan-how">
        <summary>How the picture becomes sound</summary>
        <ul>
          <li><strong>Where.</strong> Higher on the picture is a higher note (on the radar: further from the centre). There are 12 bands, on the five notes C, D, E, G and A. Low bands are far apart and high bands close together, as a choir is spaced.</li>
          <li><strong>How much colour.</strong> More colour under the line is louder, and a little brighter in tone. Black sea and grey land are silent. A soft held note sounds for every band the line is crossing.</li>
          <li><strong>Bright spots.</strong> When the line crosses a spot brighter than what is around it, one note is struck, an octave above that band's held note.</li>
          <li><strong>Which colour.</strong> Red and orange spots are struck on one instrument, yellow-green, green and blue spots on another.</li>
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
    </div>
  );
});

/** What every mark and bar means, with the same shapes as on the picture. Real text: read by screen readers. */
function Legend({ sound, order, radar }: { sound: ScanSoundDef; order: string; radar: boolean }) {
  return (
    <ul className="scan-legend" aria-label="What the marks and bars mean">
      <li>
        <svg className="glyph" viewBox="0 0 30 22" aria-hidden="true">
          <rect width="15" height="22" fill="#666" />
          <rect x="15" width="15" height="22" fill="#2a2a2a" />
          <line x1="15" y1="0" x2="15" y2="22" stroke="#fff" strokeWidth="2.5" />
        </svg>
        <span><strong>The line.</strong> You hear what is under it. Behind it the picture is bright; the dimmed part is still to come.</span>
      </li>
      <li>
        <svg className="glyph" viewBox="0 0 30 22" aria-hidden="true">
          <path d="M15 1C21 6 21 8 15 11C9 14 23 17 15 21C7 17 21 14 15 11C9 8 9 6 15 1Z" fill="#fff" fillOpacity="0.85" />
          <line x1="15" y1="0" x2="15" y2="22" stroke="#fff" strokeWidth="1.5" />
        </svg>
        <span><strong>White shape on the line.</strong> Wider where that band is louder.</span>
      </li>
      <li>
        <svg className="glyph" viewBox="0 0 30 22" aria-hidden="true">
          <circle cx="15" cy="11" r="5" fill="#fff" stroke="#000" strokeWidth="1.5" />
        </svg>
        <span><strong>Round mark: a {sound.warmName} note.</strong> The line crossed a bright red or orange spot.</span>
      </li>
      <li>
        <svg className="glyph" viewBox="0 0 30 22" aria-hidden="true">
          <rect x="10.5" y="6.5" width="9" height="9" transform="rotate(45 15 11)" fill="#fff" stroke="#000" strokeWidth="1.5" />
        </svg>
        <span><strong>Diamond: a {sound.coolName} note.</strong> The line crossed a bright yellow-green, green or blue spot.</span>
      </li>
      <li>
        <svg className="glyph" viewBox="0 0 30 22" aria-hidden="true">
          <circle cx="15" cy="11" r="8.5" fill="none" stroke="#fff" strokeWidth="1.5" strokeOpacity="0.7" />
          <circle cx="15" cy="11" r="2.5" fill="#fff" />
        </svg>
        <span><strong>Ring.</strong> Spreads from a mark at the moment its note sounds. The mark stays until the sweep ends.</span>
      </li>
      {radar && (
        <li>
          <svg className="glyph" viewBox="0 0 30 22" aria-hidden="true">
            <circle cx="15" cy="11" r="3.5" fill="none" stroke="#fff" strokeWidth="1" strokeOpacity="0.6" />
            <circle cx="15" cy="11" r="6.5" fill="none" stroke="#fff" strokeWidth="1" strokeOpacity="0.6" />
            <circle cx="15" cy="11" r="9.5" fill="none" stroke="#fff" strokeWidth="1.5" />
          </svg>
          <span><strong>Thin rings.</strong> Every third band. Further from the centre is a higher note.</span>
        </li>
      )}
      <li>
        <svg className="glyph light" viewBox="0 0 30 22" aria-hidden="true">
          <rect x="3" y="3" width="6" height="16" className="g-track" />
          <rect x="3" y="12" width="6" height="7" className="g-ink" />
          <rect x="12" y="5" width="6" height="14" className="g-signal" />
          <rect x="21" y="7" width="6" height="12" className="g-track" />
          <rect x="21" y="15" width="6" height="4" className="g-ink" />
        </svg>
        <span>
          <strong>Bars: the 12 held notes ({sound.heldName}),</strong> from {order}, low to high. The dark part is how loud each is
          now. A bar flashes orange when a note is struck in its band.
        </span>
      </li>
      <li>
        <svg className="glyph light" viewBox="0 0 30 22" aria-hidden="true">
          <rect x="6" y="3" width="18" height="16" className="g-track" />
          <rect x="6" y="10" width="18" height="9" className="g-ink" />
        </svg>
        <span>
          <strong>First bar: the low note.</strong> It steps C, A, F, G by the clock. That is decoration, not data: the picture sets
          only how loud it is.
        </span>
      </li>
    </ul>
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

/** "143° W": where the line is on the map. The NASA frame runs from 180° W at the left edge to 180° E. */
function longitude(position: number): string {
  const lon = position * 360 - 180;
  const rounded = Math.round(Math.abs(lon));
  return rounded === 0 || rounded === 180 ? `${rounded}°` : `${rounded}° ${lon < 0 ? 'W' : 'E'}`;
}

/** Centre of a chime's cell on the picture, in frame pixels. */
function chimePosition(
  chime: Chime,
  columns: number,
  bands: number,
  frame: { width: number; height: number },
  region?: { center_px: [number, number]; radius_px: number },
): [number, number] {
  if (!region) {
    return [((chime.column + 0.5) / columns) * frame.width, frame.height - ((chime.band + 0.5) / bands) * frame.height];
  }
  const angle = (2 * Math.PI * (chime.column + 0.5)) / columns;
  const radius = (region.radius_px * (chime.band + 0.5)) / bands;
  return [region.center_px[0] + radius * Math.cos(angle), region.center_px[1] - radius * Math.sin(angle)];
}
