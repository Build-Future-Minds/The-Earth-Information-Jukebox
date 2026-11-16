// "Play the picture" on Play along: a line sweeps the NASA image and plays what it crosses, after
// NASA's own image sonifications (docs/mapping_spec.md, "The picture scan"). Listen plays the same
// scan with the page's player bar (ListenScan.tsx); this one has its own buttons and settings.
// It has its own player, clock and volume (audio/scanPlayer.ts) and never changes the Earth rhythm.
// In practice mode there is no NASA image, so it scans a labelled TEST INPUT picture instead.
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
import { factsOf, type ScanRule } from '../data/sources';
import { DEFAULT_SCAN_SOUND, SCAN_SOUNDS, scanSound, type ScanSoundId } from '../audio/instruments';
import { ScanPlayer, type ScanState } from '../audio/scanPlayer';
import { scanChoicesFor } from '../audio/scanChoices';
import {
  ROOT_NOTES,
  bandNote,
  chimeNote,
  TEST_CIRCLE,
  makeTestPicture,
  maskFromPixels,
  noteName,
  pictureScore,
  resampleMask,
  rootNoteAt,
  type Chime,
  type Pixels,
  type ScanScore,
} from '../audio/scanScore';
import { regionLabel } from './ExploreControls';
import { ScanExplanation } from './ScanExplanation';
import { ScanHow, ScanLegend } from './ScanLegend';
import { MAX_TRACES, ScanOverlay, chimePosition, drawSweep, longitude, viewOf, type SweepRefs, type Trace } from './ScanOverlay';

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
  /** This picture's own settings (data/sources.ts). null: not measured yet, so the scan does not play it. */
  rule: ScanRule | null;
}

/** What the line reads: the whole picture, or one region's circle. */
type Target = 'map' | string;

export interface Loaded {
  /** URL shown on screen. */
  href: string;
  pixels: Pixels;
  /** true: the made-up TEST INPUT picture, not NASA data. */
  isTest: boolean;
}

declare global {
  interface Window {
    /** Development only: the score being played, for measurements and browser tests. */
    __scanScore?: ScanScore | null;
  }
}

/** Read a picture's pixels the way the scan does. Exported for the measuring tool (web/measure),
 *  so its numbers come from the same pixels the app plays. */
export function loadPicture(imageUrl: string | null): Promise<Loaded> {
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

/** Read a picture's mask (white = never read) and fit it to a still of `width` × `height`, nearest
 *  pixel. Exported for the measuring tool, so the app and the tool mask the same pixels. */
export async function loadMask(url: string, width: number, height: number): Promise<Uint8Array> {
  const { pixels } = await loadPicture(url);
  return resampleMask(maskFromPixels(pixels), pixels.width, pixels.height, width, height);
}

/** The picture and its mask, loaded together; the mask is null when the picture has none. A
 *  picture from before a change of picture is never returned, so it is never shown or played. */
export function useScanPicture(imageUrl: string | null, rule: ScanRule | null) {
  const [state, setState] = useState<{ url: string | null; loaded: Loaded; mask: Uint8Array | null } | null>(null);
  const [error, setError] = useState<{ url: string | null; message: string } | null>(null);
  const maskUrl = rule?.mask?.url ?? null;
  useEffect(() => {
    let live = true;
    (async () => {
      const loaded = await loadPicture(imageUrl);
      const mask = maskUrl && !loaded.isTest ? await loadMask(maskUrl, loaded.pixels.width, loaded.pixels.height) : null;
      if (live) setState({ url: imageUrl, loaded, mask });
    })().catch((e: Error) => live && setError({ url: imageUrl, message: e.message }));
    return () => {
      live = false;
    };
  }, [imageUrl, maskUrl]);
  const current = state && state.url === imageUrl ? state : null;
  return { loaded: current?.loaded ?? null, mask: current?.mask ?? null, error: error && error.url === imageUrl ? error.message : null };
}

/** The four refs `drawSweep` moves, made once per component. */
export function useSweepRefs(): SweepRefs {
  const sweep = useRef<SVGGElement>(null);
  const profile = useRef<SVGPathElement>(null);
  const unplayed = useRef<SVGPathElement>(null);
  const played = useRef<SVGPathElement>(null);
  return useMemo(() => ({ sweep, profile, unplayed, played }), []);
}

export const PictureScan = forwardRef<PictureScanHandle, Props>(function PictureScan({ scene, imageUrl, speed, rule }, ref) {
  const { loaded, mask, error: loadError } = useScanPicture(imageUrl, rule);
  const [target, setTarget] = useState<Target>('map');
  const [state, setState] = useState<ScanState>('stopped');
  const [volumeDb, setVolumeDb] = useState(-8);
  const [soundId, setSoundId] = useState<ScanSoundId>(DEFAULT_SCAN_SOUND);
  const [traces, setTraces] = useState<Trace[]>([]);
  // The note most recently struck, with the names the sound had when it was struck: switching the
  // scan sound afterwards must not change what the explanation says about a note already played.
  const [lastStruck, setLastStruck] = useState<{ chime: Chime; names: { held: string; warm: string; cool: string } } | null>(null);
  const player = useRef<ScanPlayer | null>(null);
  const sweepRefs = useSweepRefs();
  const bars = useRef<(HTMLElement | null)[]>([]);
  const rootBar = useRef<HTMLElement>(null);
  const rootName = useRef<HTMLElement>(null);
  const readout = useRef<HTMLSpanElement>(null);
  const lastChime = useRef<HTMLSpanElement>(null);
  const traceId = useRef(0);
  const reducedMotion = useMemo(() => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, []);
  const sound = scanSound(soundId);

  // The picture's size on screen, in the units the scene uses (frame pixels).
  const frame = useMemo(() => (loaded?.isTest ? { width: loaded.pixels.width, height: loaded.pixels.height } : scene.frames), [loaded, scene.frames]);
  // Circles a radar can turn in: the scene's regions, or one test circle on the TEST picture.
  const regions: Region[] = loaded?.isTest ? [TEST_CIRCLE] : scene.regions;
  const region = target === 'map' ? undefined : regions.find((r) => r.id === target);
  // "West to east" only for a whole-world map; any other picture is read left to right.
  const worldMap = !!loaded && !loaded.isTest && !!rule?.worldMap;
  const across = worldMap ? 'west to east' : 'left to right';

  // What the line reads, and the score it makes, with this picture's own settings. Same picture,
  // same score, every time.
  const score = useMemo<ScanScore | null>(() => {
    if (!loaded || !rule) return null;
    if (!region) return pictureScore(loaded.pixels, rule, mask, { kind: 'line' });
    // The still may be smaller than the frames the region's pixels are counted in.
    return pictureScore(loaded.pixels, rule, mask, { kind: 'radar', frameWidth: loaded.isTest ? loaded.pixels.width : scene.frames.width, region });
  }, [loaded, mask, region, scene.frames.width, rule]);

  const bands = score?.grid.bands ?? 12;
  const columns = score?.grid.columns ?? 1;

  const onChime = useCallback(
    (chime: Chime) => {
      if (lastChime.current) lastChime.current.textContent = `${chime.warm ? sound.warmName : sound.coolName} ${noteName(chimeNote(chime))}`;
      setLastStruck({ chime, names: { held: sound.heldName, warm: sound.warmName, cool: sound.coolName } });
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
    player.current?.setScore(score);
    setTraces([]);
    setLastStruck(null);
    if (import.meta.env.DEV) window.__scanScore = score;
  }, [score]);

  useEffect(() => player.current?.setSpeed(speed), [speed]);
  useEffect(() => player.current?.setVolume(volumeDb), [volumeDb]);
  useEffect(() => player.current?.setSound(soundId), [soundId]);
  // A stopped scan shows the clean picture: no marks from the last sweep.
  useEffect(() => {
    if (state === 'stopped') {
      setTraces([]);
      setLastStruck(null);
    }
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
      drawSweep(sweepRefs, frame, region, position, levels);

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
  }, [score, state, region, frame, worldMap, reducedMotion, sweepRefs]);
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
  const { view } = viewOf(frame, region);
  const figureClass = ['scene', 'scan-view', region ? 'radar' : 'line', state, reducedMotion ? 'still' : ''].join(' ').trim();
  const order = region ? 'the centre to the rim' : worldMap ? 'south to north' : 'bottom to top';
  // For "Why the scan sounds like this": the words for what is sounding, and which column the line is on.
  const why = useMemo(
    () => ({ geometry: worldMap ? ('world' as const) : ('plain' as const), names: { held: sound.heldName, warm: sound.warmName, cool: sound.coolName } }),
    [worldMap, sound],
  );
  const choices = useMemo(() => scanChoicesFor(rule ? factsOf(rule) : undefined), [rule]);
  const liveColumn = useCallback(() => Math.min(columns - 1, Math.floor((player.current?.position() ?? 0) * columns)), [columns]);

  return (
    <div className="scan" role="group" aria-labelledby="scan-heading">
      <h3 id="scan-heading">Play the picture</h3>
      <p className="muted">A line sweeps the picture and plays the colours it crosses. A rule we chose; the Earth rhythm is unchanged.</p>

      <div className="row">
        {state === 'playing' ? (
          <button type="button" onClick={() => player.current?.pause()}>Pause the scan</button>
        ) : (
          <button type="button" className="primary" disabled={!ready} onClick={() => void player.current?.start()}>
            {state === 'paused' ? 'Resume the scan' : 'Play the picture'}
          </button>
        )}
        <button type="button" disabled={state === 'stopped'} onClick={() => player.current?.stop()}>Stop the scan</button>
      </div>
      {/* Settings folded away (UI pass, 15 Nov): one clear start, the rest on request. */}
      <details className="scan-settings">
        <summary>Scan settings</summary>
        <div className="row">
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
      </details>

      {/* Announced politely, and only when the scan starts, pauses or stops. Not role="status":
          the page has one status sentence, for the Earth rhythm. */}
      <div aria-live="polite">
        <p className="scan-status">{status}</p>
        {loadError && <p className="missing">The picture scan is not available: {loadError}</p>}
        {!rule && <p className="missing">The scan has not been measured on this picture yet, so it does not play it.</p>}
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
            {loaded ? (
              <image href={loaded.href} width={frame.width} height={frame.height} preserveAspectRatio="none" />
            ) : (
              <rect width={frame.width} height={frame.height} className="frame-placeholder" />
            )}
            <ScanOverlay frame={frame} region={region} bands={bands} traces={traces} worldMap={worldMap} refs={sweepRefs} />
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

          <details className="scan-legend-box">
            <summary>What the marks mean</summary>
            <ScanLegend sound={sound} order={order} radar={!!region} />
          </details>

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
        <ScanHow scene={scene} rule={rule} isTest={!!loaded?.isTest} />
      </details>

      {score && <ScanExplanation score={score} ctx={why} playing={state === 'playing'} getColumn={liveColumn} lastStruck={lastStruck} choices={choices} />}
    </div>
  );
});
