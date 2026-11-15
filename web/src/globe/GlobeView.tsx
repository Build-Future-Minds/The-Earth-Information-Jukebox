// The globe: drag it or use the arrow keys to turn it; wheel, pinch, +/- keys or the buttons to zoom.
// It only moves when you move it. Prototype for Dev A and Dev B (see web/src/globe/README.md).
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
}

const DRAG_DEG_PER_PX = 0.35;
export const ZOOM_MIN = 0.6;
export const ZOOM_MAX = 6;
const ZOOM_STEP = 1.25;

export function GlobeView({ imageUrl, frame, spot, faceSpotToken, label }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const view = useRef<View>({ lon: 0, lat: 10 });
  const zoomRef = useRef(1);
  const [zoom, setZoomState] = useState(1);
  const live = useRef({ spot, frame });
  live.current = { spot, frame };
  const [error, setError] = useState<string | null>(null);

  const setZoom = (z: number) => {
    zoomRef.current = clamp(z, ZOOM_MIN, ZOOM_MAX);
    setZoomState(zoomRef.current);
  };
  const setZoomRef = useRef(setZoom);
  setZoomRef.current = setZoom;

  // Turn to the spotlight when asked (and once at the start).
  useEffect(() => {
    const [lon, lat] = pxToLonLat(spot.center_px[0], spot.center_px[1], frame.width, frame.height);
    view.current = { lon, lat: clamp(lat, -60, 60) };
  }, [faceSpotToken]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    let renderer: GlobeRenderer;
    try {
      renderer = new GlobeRenderer(canvas);
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    const image = new Image();
    image.onload = () => renderer.setImage(image);
    image.onerror = () => setError(`Could not load the NASA image (${imageUrl}).`);
    image.src = imageUrl;

    // The stars twinkle gently; they keep still for people who ask for reduced motion.
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frameId = 0;
    const tick = (now: number) => {
      const { spot: s, frame: f } = live.current;
      const time = reduceMotion.matches ? 0 : now / 1000;
      renderer.draw(view.current, f, { cx: s.center_px[0], cy: s.center_px[1], r: s.radius_px }, time, zoomRef.current);
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);

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
    };
    const up = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchStart = null;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault(); // zoom the globe, not the page
      setZoomRef.current(zoomRef.current * Math.exp(-e.deltaY * 0.0015));
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', wheel, { passive: false });
    return () => {
      cancelAnimationFrame(frameId);
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      canvas.removeEventListener('wheel', wheel);
    };
  }, [imageUrl]);

  const onKey = (e: KeyboardEvent) => {
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
    }
  };

  return (
    <div className="globe-well">
      <canvas ref={canvasRef} className="globe-canvas" tabIndex={0} role="img" aria-label={label} onKeyDown={onKey} />
      <div className="globe-zoom" role="group" aria-label="Zoom">
        <button type="button" aria-label="Zoom in" onClick={() => setZoom(zoom * ZOOM_STEP)} disabled={zoom >= ZOOM_MAX}>+</button>
        <button type="button" aria-label="Zoom out" onClick={() => setZoom(zoom / ZOOM_STEP)} disabled={zoom <= ZOOM_MIN}>−</button>
        <button type="button" aria-label={`Reset zoom (now ${zoom.toFixed(1)} times)`} onClick={() => setZoom(1)} className="globe-zoom-level">
          {zoom.toFixed(1)}×
        </button>
      </div>
      {error && <p className="globe-error" role="alert">{error}</p>}
    </div>
  );
}
