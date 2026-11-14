// The globe: drag it or use the arrow keys to turn it. It only moves when you move it.
// Prototype for Dev A and Dev B (see web/src/globe/README.md). Not used by the main app yet.
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

export function GlobeView({ imageUrl, frame, spot, faceSpotToken, label }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const view = useRef<View>({ lon: 0, lat: 10 });
  const live = useRef({ spot, frame });
  live.current = { spot, frame };
  const [error, setError] = useState<string | null>(null);

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
      renderer.draw(view.current, f, { cx: s.center_px[0], cy: s.center_px[1], r: s.radius_px }, time);
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);

    let drag: { x: number; y: number; id: number } | null = null;
    const down = (e: PointerEvent) => {
      drag = { x: e.clientX, y: e.clientY, id: e.pointerId };
      canvas.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const v = view.current;
      v.lon = ((v.lon - (e.clientX - drag.x) * DRAG_DEG_PER_PX + 540) % 360) - 180;
      v.lat = clamp(v.lat + (e.clientY - drag.y) * DRAG_DEG_PER_PX, -80, 80);
      drag = { ...drag, x: e.clientX, y: e.clientY };
    };
    const up = (e: PointerEvent) => {
      if (drag && e.pointerId === drag.id) drag = null;
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    return () => {
      cancelAnimationFrame(frameId);
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
    };
  }, [imageUrl]);

  const onKey = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 30 : 10;
    const v = view.current;
    const turns: Record<string, () => void> = {
      ArrowLeft: () => (v.lon = ((v.lon - step + 540) % 360) - 180),
      ArrowRight: () => (v.lon = ((v.lon + step + 540) % 360) - 180),
      ArrowUp: () => (v.lat = clamp(v.lat + step, -80, 80)),
      ArrowDown: () => (v.lat = clamp(v.lat - step, -80, 80)),
    };
    if (turns[e.key]) {
      e.preventDefault();
      turns[e.key]();
    }
  };

  return (
    <div className="globe-well">
      <canvas ref={canvasRef} className="globe-canvas" tabIndex={0} role="img" aria-label={label} onKeyDown={onKey} />
      {error && <p className="globe-error" role="alert">{error}</p>}
    </div>
  );
}
