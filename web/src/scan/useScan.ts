// The picture scan's state, shared by every view that shows it: the flat picture on Play along
// (components/PictureScan.tsx) and the globe. Which picture, what the line reads, the score, the
// player and its settings, and the marks the chimes leave. One place, so every view reads the same
// pixels, makes the same score and plays it with the same player. A view adds only its drawing.
//
// The rule is in docs/mapping_spec.md, "Play along: the picture scan". The scan is a play-along
// extra with its own player, clock and volume (audio/scanPlayer.ts); it never changes the Earth rhythm.
//
// Each picture is read by its own rule (data/sources.ts, `scan`): its floor, full levels, the
// pixels it never reads, whether it is a world map, and what each instrument means in its legend.
// The rule was measured on that picture's still; its numbers are never compared with another's.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Region } from '../data/types';
import type { Picture, ScanRule } from '../data/sources';
import { DEFAULT_SCAN_SOUND, scanSound, type ScanSoundDef, type ScanSoundId } from '../audio/instruments';
import { ScanPlayer, type ScanState } from '../audio/scanPlayer';
import {
  LINE_GRID,
  RADAR_GRID,
  TEST_CIRCLE,
  buildScanScore,
  chimeNote,
  noteName,
  regionScan,
  type Chime,
  type ChimeColour,
  type ScanScore,
} from '../audio/scanScore';
import { scanChoicesFor } from '../audio/scanChoices';
import { cellCentre } from '../audio/scanPick';
import type { WhyContext } from '../audio/scanWhy';
import { regionLabel } from '../components/ExploreControls';
import { loadMask, loadPicture, type LoadedPicture } from './loadPicture';

/** The picture the scan plays, with its measured rule. */
export type ScanPicture = Pick<Picture, 'key' | 'label' | 'scene' | 'imageUrl' | 'firstLetter' | 'test'> & { scan: ScanRule };

/** The names the chosen scan sound gives its instruments, by colour. */
export const nameOf = (sound: ScanSoundDef, colour: ChimeColour) => (colour === 'warm' ? sound.warmName : colour === 'blue' ? sound.blueName : sound.coolName);

/** A black-and-white picture of a mask (white = never read), for drawing the no-data hatch. */
function maskHref(mask: Uint8Array, width: number, height: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const image = new ImageData(width, height);
  for (let p = 0; p < mask.length; p++) {
    const v = mask[p] ? 255 : 0;
    image.data.set([v, v, v, 255], p * 4);
  }
  canvas.getContext('2d')!.putImageData(image, 0, 0);
  return canvas.toDataURL('image/png');
}

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
  colour: ChimeColour;
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
  /** The picture and its rule. Its still is null in practice mode (a TEST INPUT picture is scanned
   *  instead). A view remounts the scan (a React `key`) when the picture changes. */
  picture: ScanPicture;
  /** The page's speed setting: the scan follows it. */
  speed: number;
}

export type Scan = ReturnType<typeof useScan>;

export function useScan({ picture, speed }: ScanOptions) {
  const { scene, imageUrl, scan: rule } = picture;
  const [loaded, setLoaded] = useState<LoadedPicture | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Pixels this picture's rule never reads, at the still's size, and a picture of them for the
  // hatch. `undefined` while loading: the scan waits, so it never plays a picture unmasked.
  const [mask, setMask] = useState<{ pixels: Uint8Array; href: string } | null | undefined>(undefined);
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
  // "West to east" only for a whole-world map, as the picture's rule states; a made-up TEST INPUT
  // picture is never one. Any other picture is read left to right.
  const worldMap = !!loaded && !loaded.isTest && rule.worldMap;
  const across = worldMap ? 'west to east' : 'left to right';
  const blueClass = !!rule.instruments.blue;

  // What the line reads, and the score it makes. Same picture, same score, every time. The
  // picture's own settings; the radar's circle cuts the mask out with the picture.
  const score = useMemo<ScanScore | null>(() => {
    if (!loaded || mask === undefined) return null;
    const settings = { measure: rule.measure, floor: rule.floor, blueClass };
    if (!region) return buildScanScore(loaded.pixels, { kind: 'line' }, { ...settings, grid: { ...LINE_GRID, fullStrength: rule.full.line }, mask: mask?.pixels ?? null });
    // The still may be smaller than the frames the region's pixels are counted in.
    const cut = regionScan(loaded.pixels, loaded.isTest ? loaded.pixels.width : scene.frames.width, region, mask?.pixels ?? null);
    return buildScanScore(cut.crop, cut.shape, { ...settings, grid: { ...RADAR_GRID, fullStrength: rule.full.radar }, mask: cut.mask });
  }, [loaded, mask, region, scene.frames.width, rule, blueClass]);

  const bands = score?.grid.bands ?? 12;
  const columns = score?.grid.columns ?? 1;

  const onChime = useCallback(
    (chime: Chime) => {
      if (lastChime.current) lastChime.current.textContent = `${nameOf(sound, chime.colour)} ${noteName(chimeNote(chime))}`;
      setLastStruck({ chime, names: { held: sound.heldName, warm: sound.warmName, cool: sound.coolName, blue: sound.blueName } });
      // The bar for this band flashes. Restarting the animation needs the class to go and come back.
      const bar = bars.current[chime.band];
      if (bar) {
        bar.classList.remove('hit');
        void bar.offsetWidth;
        bar.classList.add('hit');
      }
      const [x, y] = chimePosition(chime, columns, bands, frame, region);
      const id = ++traceId.current;
      setTraces((t) => [...t.slice(-(MAX_TRACES - 1)), { id, x, y, colour: chime.colour }]);
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
    loadPicture(imageUrl, picture.test?.pixels).then(
      (l) => live && setLoaded(l),
      (e: Error) => live && setLoadError(e.message),
    );
    return () => {
      live = false;
    };
  }, [imageUrl, picture.test]);

  // The pixels this picture never reads: its mask file, fitted to the still (a TEST INPUT picture
  // brings its own). No mask: every pixel is read.
  useEffect(() => {
    if (!loaded) return;
    const { width, height } = loaded.pixels;
    const testMask = loaded.isTest ? picture.test?.mask : undefined;
    if (testMask) {
      const pixels = testMask();
      setMask({ pixels, href: maskHref(pixels, width, height) });
      return;
    }
    if (loaded.isTest || !rule.mask) {
      setMask(null);
      return;
    }
    let live = true;
    const url = rule.mask.url;
    loadMask(url, width, height).then(
      (pixels) => live && setMask({ pixels, href: url }),
      () => live && setLoadError('This picture\'s mask (the pixels it never reads) did not load, so the scan will not play it.'),
    );
    return () => {
      live = false;
    };
  }, [loaded, rule.mask, picture.test]);

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

  const labelOf = (t: Target) => (t === 'map' ? 'the whole picture' : loaded?.isTest ? 'the test circle' : regionLabel(scene.regions, t, picture.firstLetter));
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
  // For "Why the scan sounds like this": the words for what is sounding, what each instrument means
  // in this picture, which column the line is on, and this picture's own fixed choices.
  const why = useMemo<WhyContext>(
    () => ({
      geometry: worldMap ? 'world' : 'plain',
      names: { held: sound.heldName, warm: sound.warmName, cool: sound.coolName, blue: sound.blueName },
      picture: { instruments: rule.instruments, noData: rule.mask?.what },
    }),
    [worldMap, sound, rule],
  );
  const choices = useMemo(() => scanChoicesFor({ label: picture.label, scan: rule }), [picture.label, rule]);
  const liveColumn = useCallback(() => Math.min(columns - 1, Math.floor((player.current?.position() ?? 0) * columns)), [columns]);

  return {
    picture,
    rule,
    scene,
    mask,
    blueClass,
    choices,
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

/** Centre of a chime's cell on the picture, in frame pixels. The same formula a click on the picture
 *  is inverted from (audio/scanPick.ts, tested there), so a mark and a click on it name the same cell. */
export function chimePosition(
  chime: Chime,
  columns: number,
  bands: number,
  frame: { width: number; height: number },
  region?: { center_px: [number, number]; radius_px: number },
): [number, number] {
  return cellCentre(
    chime,
    { columns, bands },
    region ? { kind: 'radar', frame, center: region.center_px, radius: region.radius_px } : { kind: 'line', frame, pixels: frame },
  );
}

/** "143° W": where the line is on the map. The NASA frame runs from 180° W at the left edge to 180° E. */
export function longitude(position: number): string {
  const lon = position * 360 - 180;
  const rounded = Math.round(Math.abs(lon));
  return rounded === 0 || rounded === 180 ? `${rounded}°` : `${rounded}° ${lon < 0 ? 'W' : 'E'}`;
}
