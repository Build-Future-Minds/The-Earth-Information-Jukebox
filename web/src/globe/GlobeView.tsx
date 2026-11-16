// The globe: drag it or use the arrow keys to turn it; wheel, pinch, +/- keys or the buttons to zoom.
// It only moves when you move it, or, while the picture scan plays with "Turn with the line" on, with
// the scan's line. Prototype for Dev A and Dev B (see web/src/globe/README.md).
//
// Drawing is on demand: a frame is drawn only when something changes (turn, zoom, spotlight, size,
// image). The stars twinkle at a few frames a second, and not at all when the tab is hidden, the
// globe is off screen, or the system asks for reduced motion.
//
// The picture scan (`scan`): the shared drawing loop (scan/useScanFrame.ts) hands each moment to
// `scanMoment`, and the globe draws it at once, in place of the spotlight. The stars hold still while
// the scan is on. The chime marks, the needle's ends and the compass letters are an SVG layer over
// the canvas, placed with the same sums the shader uses (geo.ts, projectToScreen).
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type KeyboardEvent } from 'react';
import {
  ZOOM_MAX,
  ZOOM_MIN,
  clamp,
  followLongitude,
  globeRadius,
  projectToScreen,
  pxToLonLat,
  radarView,
  type ScreenPoint,
  type Spot,
  type View,
} from './geo';
import { GlobeRenderer } from './globeRenderer';

export { ZOOM_MAX, ZOOM_MIN } from './geo';

/** A mark left by a chime, in frame pixels. */
export interface GlobeMark {
  id: number;
  x: number;
  y: number;
  warm: boolean;
}

/** The picture scan, while it is playing or paused: drawn in place of the spotlight. */
export interface GlobeScan {
  mode: 'line' | 'radar';
  /** The size of the picture the scan reads, in the pixels its circle and marks are counted in
   *  (the scene's frames; the TEST INPUT picture has its own size). */
  frame: { width: number; height: number };
  /** The radar's circle, in frame pixels. */
  circle: Spot | null;
  /** Marks left by the chimes of this sweep. */
  marks: GlobeMark[];
  /** Compass letters round the radar: only on a whole-world map. */
  compass: boolean;
  /** Reduced motion: the line moves in whole seconds and the globe only cuts. */
  reducedMotion: boolean;
}

export interface GlobeHandle {
  /** One moment of the scan, from the shared drawing loop: draw it now. */
  scanMoment: (position: number, levels: ArrayLike<number>) => void;
}

interface Props {
  imageUrl: string;
  frame: { width: number; height: number };
  spot: Spot;
  /** Change this number to turn the globe so the spotlight faces the viewer. */
  faceSpotToken: number;
  label: string;
  /** id of the element with the instructions, for aria-describedby on the globe. */
  describedBy?: string;
  /** The picture scan, or null: then the spotlight is drawn. */
  scan?: GlobeScan | null;
  /** Turn the globe with the scan: the line a little right of the middle, or the radar's circle faced and zoomed to. */
  follow?: boolean;
  /** The person turned the globe themselves (drag or arrow key) while it was following. */
  onFollowOff?: () => void;
}

declare global {
  interface Window {
    /** Development only: what the globe shows, for the browser tests. */
    __globe?: {
      state: () => { mode: 'spot' | 'line' | 'radar'; follow: boolean; view: View; zoom: number; position: number; stillSky: boolean; size: { width: number; height: number } };
      project: (lon: number, lat: number) => ScreenPoint;
      probe: (lon: number, lat: number) => [number, number, number, number] | null;
      renderer: () => string;
    };
  }
}

const DRAG_DEG_PER_PX = 0.35;
const ZOOM_STEP = 1.25;
const TWINKLE_MS = 160; // about 6 frames a second
const LINE_PX = 16; // Firefox reports wheel steps in lines (deltaMode 1)
/** A drag shorter than this (CSS pixels) is a click and leaves "Turn with the line" on. */
const DRAG_THRESHOLD = 4;
/** Design choice: the white shape on the scan's line is at most this share of the globe's radius
 *  wide each side, and never more than SHAPE_MAX_PX, so a loud band looks as wide at every latitude. */
const SHAPE_SHARE = 0.12;
const SHAPE_MAX_PX = 40;
/** Compass letters round the radar: letter, then the direction as (east, north). */
const COMPASS: [string, number, number][] = [['E', 1, 0], ['N', 0, 1], ['W', -1, 0], ['S', 0, -1]];

export const GlobeView = forwardRef<GlobeHandle, Props>(function GlobeView(
  { imageUrl, frame, spot, faceSpotToken, label, describedBy, scan = null, follow = false, onFollowOff },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const marksRef = useRef<SVGSVGElement>(null);
  const view = useRef<View>({ lon: 0, lat: 10 });
  const zoomRef = useRef(1);
  const [zoom, setZoomState] = useState(1);
  const live = useRef({ spot, frame, scan, follow });
  live.current = { spot, frame, scan, follow };
  const onFollowOffRef = useRef(onFollowOff);
  onFollowOffRef.current = onFollowOff;
  /** The scan's last moment: where the line is and the levels under it. */
  const moment = useRef({ position: 0, levels: new Float32Array(12) });
  const requestDraw = useRef<() => void>(() => {});
  const drawNow = useRef<() => void>(() => {});
  const [error, setError] = useState<string | null>(null);
  /** Which radar circle the globe has turned to, and the zoom to go back to afterwards. */
  const faced = useRef<string | null>(null);
  const zoomBefore = useRef<number | null>(null);

  const setZoom = (z: number) => {
    zoomRef.current = clamp(z, ZOOM_MIN, ZOOM_MAX);
    setZoomState(zoomRef.current);
    requestDraw.current();
  };
  const setZoomRef = useRef(setZoom);
  setZoomRef.current = setZoom;

  useImperativeHandle(
    ref,
    () => ({
      scanMoment: (position, levels) => {
        moment.current.position = position;
        for (let i = 0; i < 12; i++) moment.current.levels[i] = levels[i] ?? 0;
        drawNow.current();
      },
    }),
    [],
  );

  // Turn to the spotlight when asked (and once at the start).
  useEffect(() => {
    const [lon, lat] = pxToLonLat(spot.center_px[0], spot.center_px[1], frame.width, frame.height);
    view.current = { lon, lat: clamp(lat, -60, 60) };
    requestDraw.current();
  }, [faceSpotToken]);

  // Redraw when the spotlight moves or changes size, or the scan starts, stops or leaves a mark.
  useEffect(() => requestDraw.current(), [spot, frame, scan]);

  // Following again: turn to the radar's circle once more.
  useEffect(() => {
    if (follow) faced.current = null;
    requestDraw.current();
  }, [follow]);

  // Leaving the radar (back to the line, or the scan stopped): the zoom the person had before it.
  const radarKey = scan?.mode === 'radar' && scan.circle ? `${scan.circle.center_px.join(',')}:${scan.circle.radius_px}` : null;
  useEffect(() => {
    if (radarKey === null) {
      faced.current = null;
      if (zoomBefore.current !== null) {
        setZoomRef.current(zoomBefore.current);
        zoomBefore.current = null;
      }
    }
  }, [radarKey]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    let renderer: GlobeRenderer;
    try {
      renderer = new GlobeRenderer(canvas);
    } catch (e) {
      setError((e as Error).message);
      return;
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frameId = 0;

    // While following: the line a little right of the middle, or the radar's circle faced and zoomed to (once).
    const followScan = () => {
      const { scan: s, follow: on } = live.current;
      if (!s || !on) return;
      if (s.mode === 'radar' && s.circle) {
        const key = `${s.circle.center_px.join(',')}:${s.circle.radius_px}`;
        if (faced.current === key) return;
        const v = radarView(s.circle, s.frame.width, s.frame.height);
        if (zoomBefore.current === null) zoomBefore.current = zoomRef.current;
        view.current = { lon: v.lon, lat: v.lat };
        zoomRef.current = clamp(v.zoom, ZOOM_MIN, ZOOM_MAX);
        setZoomState(zoomRef.current);
        faced.current = key;
      } else {
        view.current = { lon: followLongitude(moment.current.position, s.reducedMotion), lat: view.current.lat };
      }
    };

    // The SVG layer: every element with data-x and data-y (frame pixels) goes where the globe draws that place.
    const placeMarks = () => {
      const svg = marksRef.current;
      const s = live.current.scan;
      if (!svg || !s) return;
      const f = s.frame;
      const rim = svg.querySelector<SVGElement>('[data-needle="rim"]');
      if (rim && s.circle) {
        const a = 2 * Math.PI * moment.current.position;
        const [cx, cy] = s.circle.center_px;
        rim.dataset.x = String(cx + s.circle.radius_px * Math.cos(a));
        rim.dataset.y = String(cy - s.circle.radius_px * Math.sin(a));
      }
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      for (const el of svg.querySelectorAll<SVGGraphicsElement>('[data-x]')) {
        const [lon, lat] = pxToLonLat(Number(el.dataset.x), Number(el.dataset.y), f.width, f.height);
        const p = projectToScreen(lon, lat, view.current, zoomRef.current, w, h);
        el.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
        // The far side of the globe is hidden: so are its marks.
        el.style.visibility = p.depth > 0 ? '' : 'hidden';
      }
    };

    const draw = (now: number) => {
      frameId = 0;
      followScan();
      const { spot: s, frame: f, scan: sc } = live.current;
      const time = reduceMotion.matches ? 0 : now / 1000;
      const radius = globeRadius(zoomRef.current, canvas.clientWidth, canvas.clientHeight);
      renderer.draw(
        view.current,
        // The scan is drawn in its own picture's pixels, the spotlight in the scene's.
        sc ? sc.frame : f,
        { cx: s.center_px[0], cy: s.center_px[1], r: s.radius_px },
        time,
        zoomRef.current,
        sc
          ? {
              mode: sc.mode,
              position: moment.current.position,
              levels: moment.current.levels,
              circle: sc.circle ? { cx: sc.circle.center_px[0], cy: sc.circle.center_px[1], r: sc.circle.radius_px } : null,
              shapePx: Math.min(SHAPE_MAX_PX, SHAPE_SHARE * radius),
            }
          : null,
      );
      placeMarks();
    };
    const request = () => {
      if (!frameId) frameId = requestAnimationFrame(draw);
    };
    requestDraw.current = request;
    drawNow.current = () => {
      if (frameId) cancelAnimationFrame(frameId);
      draw(performance.now());
    };

    if (import.meta.env.DEV) {
      window.__globe = {
        state: () => ({
          mode: live.current.scan ? live.current.scan.mode : 'spot',
          follow: live.current.follow,
          view: { ...view.current },
          zoom: zoomRef.current,
          position: moment.current.position,
          stillSky: !!live.current.scan,
          size: { width: canvas.clientWidth, height: canvas.clientHeight },
        }),
        project: (lon, lat) => projectToScreen(lon, lat, view.current, zoomRef.current, canvas.clientWidth, canvas.clientHeight),
        // Draw, then read the drawn pixel at a place, in the same task (the drawing is still there).
        probe: (lon, lat) => {
          drawNow.current();
          const p = projectToScreen(lon, lat, view.current, zoomRef.current, canvas.clientWidth, canvas.clientHeight);
          if (!p.visible) return null;
          const k = canvas.width / canvas.clientWidth;
          return renderer.readPixel(p.x * k, p.y * k);
        },
        renderer: () => renderer.rendererName(),
      };
    }

    const image = new Image();
    image.onload = () => {
      renderer.setImage(image);
      request();
    };
    image.onerror = () => setError(`Could not load the NASA image (${imageUrl}).`);
    image.src = imageUrl;

    // Twinkle only while someone can see it, and not while the scan holds the stars still.
    let onScreen = true;
    const seen = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
    });
    seen.observe(canvas);
    const twinkle = window.setInterval(() => {
      if (onScreen && !document.hidden && !reduceMotion.matches && !live.current.scan) request();
    }, TWINKLE_MS);
    const resized = new ResizeObserver(request);
    resized.observe(canvas);
    reduceMotion.addEventListener('change', request);

    // Turning the globe yourself while it follows the scan stops the following.
    const stopFollowing = () => {
      if (!live.current.follow || !live.current.scan) return;
      live.current.follow = false;
      onFollowOffRef.current?.();
    };

    // One pointer turns the globe; two pointers (a pinch) zoom.
    const pointers = new Map<number, { x: number; y: number }>();
    let pinchStart: { distance: number; zoom: number } | null = null;
    let dragged = 0;
    const pinchDistance = () => {
      const [a, b] = [...pointers.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    const down = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      canvas.setPointerCapture(e.pointerId);
      dragged = 0;
      if (pointers.size === 2) pinchStart = { distance: pinchDistance(), zoom: zoomRef.current };
    };
    const move = (e: PointerEvent) => {
      const last = pointers.get(e.pointerId);
      if (!last) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size >= 2 && pinchStart) {
        setZoomRef.current(pinchStart.zoom * (pinchDistance() / Math.max(1, pinchStart.distance)));
        return;
      }
      dragged += Math.abs(e.clientX - last.x) + Math.abs(e.clientY - last.y);
      if (dragged > DRAG_THRESHOLD) stopFollowing();
      const degPerPx = DRAG_DEG_PER_PX / zoomRef.current; // slower when zoomed in
      const v = view.current;
      v.lon = ((v.lon - (e.clientX - last.x) * degPerPx + 540) % 360) - 180;
      v.lat = clamp(v.lat + (e.clientY - last.y) * degPerPx, -80, 80);
      request();
    };
    const up = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchStart = null;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault(); // zoom the globe, not the page
      const pixels = e.deltaY * (e.deltaMode === 1 ? LINE_PX : e.deltaMode === 2 ? canvas.clientHeight : 1);
      setZoomRef.current(zoomRef.current * Math.exp(-pixels * 0.0015));
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', wheel, { passive: false });
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      window.clearInterval(twinkle);
      seen.disconnect();
      resized.disconnect();
      reduceMotion.removeEventListener('change', request);
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      canvas.removeEventListener('wheel', wheel);
      image.onload = null;
      requestDraw.current = () => {};
      drawNow.current = () => {};
      if (import.meta.env.DEV) delete window.__globe;
      renderer.dispose();
    };
  }, [imageUrl]);

  const onKey = (e: KeyboardEvent) => {
    // Leave browser shortcuts alone: Ctrl/Cmd + and - is page zoom, which low-vision users rely on.
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const step = (e.shiftKey ? 30 : 10) / zoomRef.current;
    const v = view.current;
    const turn = (f: () => void) => () => {
      // Turning the globe yourself while it follows the scan stops the following.
      if (live.current.follow && live.current.scan) {
        live.current.follow = false;
        onFollowOffRef.current?.();
      }
      f();
    };
    const actions: Record<string, () => void> = {
      ArrowLeft: turn(() => (v.lon = ((v.lon - step + 540) % 360) - 180)),
      ArrowRight: turn(() => (v.lon = ((v.lon + step + 540) % 360) - 180)),
      ArrowUp: turn(() => (v.lat = clamp(v.lat + step, -80, 80))),
      ArrowDown: turn(() => (v.lat = clamp(v.lat - step, -80, 80))),
      '+': () => setZoom(zoomRef.current * ZOOM_STEP),
      '=': () => setZoom(zoomRef.current * ZOOM_STEP),
      '-': () => setZoom(zoomRef.current / ZOOM_STEP),
      _: () => setZoom(zoomRef.current / ZOOM_STEP),
      '0': () => setZoom(1),
    };
    if (actions[e.key]) {
      e.preventDefault();
      actions[e.key]();
      requestDraw.current();
    }
  };

  // The marks are placed by the drawing (placeMarks); after React adds one, draw once to place it.
  useEffect(() => requestDraw.current(), [scan?.marks]);

  const level = `${zoom.toFixed(1)}×`;
  const circle = scan?.mode === 'radar' ? scan.circle : null;
  return (
    <div className="globe-well">
      <canvas ref={canvasRef} className="globe-canvas" tabIndex={0} role="img" aria-label={label}
        aria-describedby={describedBy} onKeyDown={onKey} />
      {scan && (
        <svg ref={marksRef} className={`globe-marks scan-view${scan.reducedMotion ? ' still' : ''}`} aria-hidden="true">
          {circle && scan.compass && (
            <g className="compass" fontSize={14}>
              {COMPASS.map(([letter, dx, dy]) => (
                <text key={letter} data-x={circle.center_px[0] + dx * circle.radius_px * 1.09} data-y={circle.center_px[1] - dy * circle.radius_px * 1.09}>
                  {letter}
                </text>
              ))}
            </g>
          )}
          <g className="traces">
            {scan.marks.map((m) => (
              <g key={m.id} className={m.warm ? 'trace warm' : 'trace cool'} data-x={m.x} data-y={m.y}>
                <circle className="ripple" r={24} />
                {m.warm ? (
                  <circle className="chime-dot" r={5} />
                ) : (
                  <g transform="rotate(45)">
                    <rect className="chime-dot" x={-4.75} y={-4.75} width={9.5} height={9.5} />
                  </g>
                )}
              </g>
            ))}
          </g>
          {circle && (
            <>
              <circle className="needle-end" data-needle="centre" data-x={circle.center_px[0]} data-y={circle.center_px[1]} r={4} />
              <circle className="needle-end" data-needle="rim" data-x={circle.center_px[0] + circle.radius_px} data-y={circle.center_px[1]} r={5.5} />
            </>
          )}
        </svg>
      )}
      <div className="globe-zoom" role="group" aria-label="Zoom">
        <button type="button" aria-label="Zoom in" onClick={() => setZoom(zoom * ZOOM_STEP)} disabled={zoom >= ZOOM_MAX}>+</button>
        <button type="button" aria-label="Zoom out" onClick={() => setZoom(zoom / ZOOM_STEP)} disabled={zoom <= ZOOM_MIN}>−</button>
        {/* The accessible name starts with the visible text (WCAG 2.5.3, Label in Name). */}
        <button type="button" aria-label={`${level} zoom, reset`} onClick={() => setZoom(1)} className="globe-zoom-level">
          {level}
        </button>
      </div>
      {error && <p className="globe-error" role="alert">{error}</p>}
    </div>
  );
});
