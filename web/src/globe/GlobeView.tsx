// The globe: drag it or use the arrow keys to turn it; wheel, pinch, +/- keys or the buttons to zoom.
// It only moves when you move it. Prototype for Dev A and Dev B (see web/src/globe/README.md).
//
// Drawing is on demand: a frame is drawn only when something changes (turn, zoom, spotlight, size,
// image). The stars twinkle at a few frames a second, and not at all when the tab is hidden, the
// globe is off screen, or the system asks for reduced motion.
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { clamp, pxToLonLat, type Spot } from './geo';
import { GlobeRenderer, type View } from './globeRenderer';

interface Props {
  imageUrl: string;
  frame: { width: number; height: number };
  spot: Spot;
  /** Change this number to turn the globe so the spotlight faces the viewer. */
  faceSpotToken: number;
  label: string;
  /** id of the element with the instructions, for aria-describedby on the globe. */
  describedBy?: string;
}

const DRAG_DEG_PER_PX = 0.35;
export const ZOOM_MIN = 0.6;
export const ZOOM_MAX = 6;
const ZOOM_STEP = 1.25;
const TWINKLE_MS = 160; // about 6 frames a second
const LINE_PX = 16; // Firefox reports wheel steps in lines (deltaMode 1)

export function GlobeView({ imageUrl, frame, spot, faceSpotToken, label, describedBy }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const view = useRef<View>({ lon: 0, lat: 10 });
  const zoomRef = useRef(1);
  const [zoom, setZoomState] = useState(1);
  const live = useRef({ spot, frame });
  live.current = { spot, frame };
  const requestDraw = useRef<() => void>(() => {});
  const [error, setError] = useState<string | null>(null);

  const setZoom = (z: number) => {
    zoomRef.current = clamp(z, ZOOM_MIN, ZOOM_MAX);
    setZoomState(zoomRef.current);
    requestDraw.current();
  };
  const setZoomRef = useRef(setZoom);
  setZoomRef.current = setZoom;

  // Turn to the spotlight when asked (and once at the start).
  useEffect(() => {
    const [lon, lat] = pxToLonLat(spot.center_px[0], spot.center_px[1], frame.width, frame.height);
    view.current = { lon, lat: clamp(lat, -60, 60) };
    requestDraw.current();
  }, [faceSpotToken]);

  // Redraw when the spotlight moves or changes size.
  useEffect(() => requestDraw.current(), [spot, frame]);

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
    const draw = (now: number) => {
      frameId = 0;
      const { spot: s, frame: f } = live.current;
      const time = reduceMotion.matches ? 0 : now / 1000;
      renderer.draw(view.current, f, { cx: s.center_px[0], cy: s.center_px[1], r: s.radius_px }, time, zoomRef.current);
    };
    const request = () => {
      if (!frameId) frameId = requestAnimationFrame(draw);
    };
    requestDraw.current = request;

    const image = new Image();
    image.onload = () => {
      renderer.setImage(image);
      request();
    };
    image.onerror = () => setError(`Could not load the NASA image (${imageUrl}).`);
    image.src = imageUrl;

    // Twinkle only while someone can see it.
    let onScreen = true;
    const seen = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
    });
    seen.observe(canvas);
    const twinkle = window.setInterval(() => {
      if (onScreen && !document.hidden && !reduceMotion.matches) request();
    }, TWINKLE_MS);
    const resized = new ResizeObserver(request);
    resized.observe(canvas);
    reduceMotion.addEventListener('change', request);

    // One pointer turns the globe; two pointers (a pinch) zoom.
    const pointers = new Map<number, { x: number; y: number }>();
    let pinchStart: { distance: number; zoom: number } | null = null;
    const pinchDistance = () => {
      const [a, b] = [...pointers.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    const down = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      canvas.setPointerCapture(e.pointerId);
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
      renderer.dispose();
    };
  }, [imageUrl]);

  const onKey = (e: KeyboardEvent) => {
    // Leave browser shortcuts alone: Ctrl/Cmd + and - is page zoom, which low-vision users rely on.
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const step = (e.shiftKey ? 30 : 10) / zoomRef.current;
    const v = view.current;
    const actions: Record<string, () => void> = {
      ArrowLeft: () => (v.lon = ((v.lon - step + 540) % 360) - 180),
      ArrowRight: () => (v.lon = ((v.lon + step + 540) % 360) - 180),
      ArrowUp: () => (v.lat = clamp(v.lat + step, -80, 80)),
      ArrowDown: () => (v.lat = clamp(v.lat - step, -80, 80)),
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

  const level = `${zoom.toFixed(1)}×`;
  return (
    <div className="globe-well">
      <canvas ref={canvasRef} className="globe-canvas" tabIndex={0} role="img" aria-label={label}
        aria-describedby={describedBy} onKeyDown={onKey} />
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
}
