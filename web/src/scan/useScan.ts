// The picture scan's state, shared by every view that shows it: the flat picture on Play along
// (components/PictureScan.tsx) and the globe. Which picture, what the line reads, the score, the
// player and its settings, and the marks the chimes leave. One place, so every view reads the same
// pixels, makes the same score and plays it with the same player. A view adds only its drawing.
//
// The rule is in docs/mapping_spec.md, "Play along: the picture scan". The scan is a play-along
// extra with its own player, clock and volume (audio/scanPlayer.ts); it never changes the Earth rhythm.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Region, Scene } from '../data/types';
import { DEFAULT_SCAN_SOUND, scanSound, type ScanSoundId } from '../audio/instruments';
import { ScanPlayer, type ScanState } from '../audio/scanPlayer';
import {
  TEST_CIRCLE,
  buildScanScore,
  chimeNote,
  noteName,
  regionScan,
  type Chime,
  type ScanMeasure,
  type ScanScore,
} from '../audio/scanScore';
import type { WhyContext } from '../audio/scanWhy';
import { regionLabel } from '../components/ExploreControls';
import { loadPicture, type LoadedPicture } from './loadPicture';

export interface ScanHandle {
  /** Silence the scan and rewind it (the page's Stop and Esc). */
  stop: () => void;
}

/** What the line reads: the whole picture, or one region's circle. */
export type Target = 'map' | string;

/** A chime that has sounded in this sweep: where it is on the picture, in frame pixels. */
export interface Trace {
  id: number;
  x: number;
  y: number;
  warm: boolean;
}

/** The note most recently struck, with the names the sound had when it was struck. */
export interface StruckNote {
  chime: Chime;
  names: WhyContext['names'];
}

declare global {
  interface Window {
    /** Development only: the score being played, for measurements and browser tests. */
    __scanScore?: ScanScore | null;
  }
}

/** Most chime marks kept on the picture (one sweep makes about 70). */
const MAX_TRACES = 160;

export interface ScanOptions {
  scene: Scene;
  /** The NASA still, or null in practice mode (the TEST INPUT picture is scanned instead). */
  imageUrl: string | null;
  /** The page's speed setting: the scan follows it. */
  speed: number;
  /** What counts as light in this picture. Colour suits the ocean picture (grey land is silent). */
  measure: ScanMeasure;
}

export type Scan = ReturnType<typeof useScan>;

export function useScan({ scene, imageUrl, speed, measure }: ScanOptions) {
  const [loaded, setLoaded] = useState<LoadedPicture | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [target, setTarget] = useState<Target>('map');
  const [state, setState] = useState<ScanState>('stopped');
  const [volumeDb, setVolumeDb] = useState(-8);
  const [soundId, setSoundId] = useState<ScanSoundId>(DEFAULT_SCAN_SOUND);
  const [traces, setTraces] = useState<Trace[]>([]);
  // The note most recently struck, with the names the sound had when it was struck: switching the
  // scan sound afterwards must not change what the explanation says about a note already played.
  const [lastStruck, setLastStruck] = useState<StruckNote | null>(null);
  const player = useRef<ScanPlayer | null>(null);
  // The bars and the readout beside the picture (scan/ScanSide.tsx): written directly, many times a
  // second, without a React render.
  const bars = useRef<(HTMLElement | null)[]>([]);
  const rootBar = useRef<HTMLElement>(null);
  const rootName = useRef<HTMLElement>(null);
  const readout = useRef<HTMLSpanElement>(null);
  const lastChime = useRef<HTMLSpanElement>(null);
  const side = useMemo(() => ({ bars, rootBar, rootName, readout, lastChime }), []);
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
    // The still may be smaller than the frames the region's pixels are counted in.
    const { crop, shape } = regionScan(loaded.pixels, loaded.isTest ? loaded.pixels.width : scene.frames.width, region);
    return buildScanScore(crop, shape, { measure });
  }, [loaded, region, scene.frames.width, measure]);

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

  const stop = useCallback(() => player.current?.stop(), []);

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
  const order = region ? 'the centre to the rim' : worldMap ? 'south to north' : 'bottom to top';
  // For "Why the scan sounds like this": the words for what is sounding, and which column the line is on.
  const why = useMemo(
    () => ({ geometry: worldMap ? ('world' as const) : ('plain' as const), names: { held: sound.heldName, warm: sound.warmName, cool: sound.coolName } }),
    [worldMap, sound],
  );
  const liveColumn = useCallback(() => Math.min(columns - 1, Math.floor((player.current?.position() ?? 0) * columns)), [columns]);

  return {
    scene,
    loaded,
    loadError,
    target,
    setTarget,
    state,
    volumeDb,
    setVolumeDb,
    soundId,
    setSoundId,
    sound,
    traces,
    setTraces,
    lastStruck,
    player,
    side,
    reducedMotion,
    frame,
    regions,
    region,
    worldMap,
    across,
    score,
    bands,
    columns,
    stop,
    labelOf,
    status,
    ready,
    order,
    why,
    liveColumn,
  };
}

/** Centre of a chime's cell on the picture, in frame pixels. */
export function chimePosition(
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

/** "143° W": where the line is on the map. The NASA frame runs from 180° W at the left edge to 180° E. */
export function longitude(position: number): string {
  const lon = position * 360 - 180;
  const rounded = Math.round(Math.abs(lon));
  return rounded === 0 || rounded === 180 ? `${rounded}°` : `${rounded}° ${lon < 0 ? 'W' : 'E'}`;
}
