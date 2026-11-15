import type { CSSProperties } from 'react';
// Region close-ups: Student B's patch columns from tools/listening_game.html, brought into the app.
// Each region circle is shown enlarged from the NASA preview frame, with white-over-black ticks for
// the line directions (illustration: lineTicks.ts) and a giant numeral whose weight is the region's
// alignment in this frame (DESIGN.md). The letter takes the region's colour; the ticks stay black and white.
import { useEffect, useRef, useState } from 'react';
import { longFraction } from '../audio/earthVoice';
import { lineTicks, type Tick } from '../data/lineTicks';
import type { Features, Region, Scene } from '../data/types';
import { regionLabel, regionStyle } from './ExploreControls';
import { weightFor } from './NowPlaying';

interface Props {
  scene: Scene;
  features: Features;
  imageUrl: string | null;
  regionId: string;
  onListen: (regionId: string) => void;
}

const SCALE = 3; // canvas pixels per image pixel
const CELL = 15; // tick cell, in image pixels
const TICK_LEN = 30; // canvas pixels

export function RegionCloseups({ scene, features, imageUrl, regionId, onListen }: Props) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.onload = () => setImage(img);
    img.src = imageUrl;
  }, [imageUrl]);

  // The preview image is the first frame, so its numbers are the first step's.
  const firstStep = (id: string) => features.steps.filter((s) => s.region === id).sort((a, b) => a.t - b.t)[0];
  const frameNote = scene.frames.timestamps?.[0] ? `model time ${scene.frames.timestamps[0]}` : 'first frame';

  return (
    <section className="closeups" aria-labelledby="closeups-title">
      <h2 id="closeups-title">The two regions, up close</h2>
      <div className="pair">
        {scene.regions.map((r) => (
          <Closeup
            key={r.id}
            region={r}
            label={regionLabel(scene.regions, r.id)}
            colour={regionStyle(scene.regions, r.id)}
            step={firstStep(r.id)}
            image={image}
            frameWidth={scene.frames.width}
            threshold={features.normalisation.gradient_threshold}
            current={r.id === regionId}
            frameNote={frameNote}
            onListen={() => onListen(r.id)}
          />
        ))}
      </div>
      <p className="muted small">
        Ticks are drawn in your browser; the rhythm uses Dev A&apos;s measurement of every frame.
      </p>
    </section>
  );
}

interface CloseupProps {
  region: Region;
  label: string;
  colour: CSSProperties;
  step: Features['steps'][number] | undefined;
  image: HTMLImageElement | null;
  frameWidth: number;
  threshold: number;
  current: boolean;
  frameNote: string;
  onListen: () => void;
}

function Closeup({ region, label, colour, step, image, frameWidth, threshold, current, frameNote, onListen }: CloseupProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ticks, setTicks] = useState<Tick[]>([]);
  const [x0, y0, w, h] = region.box_px;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const k = image.naturalWidth / frameWidth; // preview pixels per frame pixel
    // Measure the crop at frame resolution.
    const crop = document.createElement('canvas');
    crop.width = w;
    crop.height = h;
    const cg = crop.getContext('2d', { willReadFrequently: true })!;
    cg.drawImage(image, x0 * k, y0 * k, w * k, h * k, 0, 0, w, h);
    const t = lineTicks(cg.getImageData(0, 0, w, h).data, w, h, { cx: w / 2, cy: h / 2, r: region.radius_px }, CELL, threshold);
    setTicks(t);

    // Draw it enlarged, then the circle (black under white) and the ticks.
    const g = canvas.getContext('2d')!;
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(crop, 0, 0, w, h, 0, 0, w * SCALE, h * SCALE);
    g.lineCap = 'round';
    for (const [width, colour] of [[7, '#000'], [3.5, '#fff']] as const) {
      g.lineWidth = width;
      g.strokeStyle = colour;
      g.beginPath();
      g.arc((w / 2) * SCALE, (h / 2) * SCALE, region.radius_px * SCALE - 2, 0, 2 * Math.PI);
      for (const tk of t) {
        const dx = (Math.cos(tk.angle) * TICK_LEN) / 2, dy = (Math.sin(tk.angle) * TICK_LEN) / 2;
        g.moveTo(tk.cx * SCALE - dx, tk.cy * SCALE - dy);
        g.lineTo(tk.cx * SCALE + dx, tk.cy * SCALE + dy);
      }
      g.stroke();
    }
  }, [image, x0, y0, w, h, frameWidth, threshold, region.radius_px]);

  const ok = step?.status === 'ok';
  const a = ok ? step!.alignment : null;
  return (
    <figure className={current ? 'patch current' : 'patch'} style={colour}>
      <canvas
        ref={canvasRef}
        width={w * SCALE}
        height={h * SCALE}
        role="img"
        aria-label={
          image
            ? `${label}, ${region.name}, enlarged with ${ticks.length} line-direction ticks.`
            : `${label}: no picture available for practice data.`
        }
      />
      <span className="numeral" aria-hidden="true" style={{ fontWeight: a === null ? 500 : weightFor(a) }}>
        {label.replace('Region ', '')}
      </span>
      <div className="patch-readout">
        <span className="value">
          {a === null ? '–' : a.toFixed(2)}
          <small>alignment</small>
        </span>
        <span>
          <span className="nw">{a === null ? 'missing in this frame' : `second pulse at ${Math.round(longFraction(a) * 100)}%`}</span>
          <br />
          {/* "model time" may wrap; the timestamp itself never breaks. */}
          {frameNote.split(' ').slice(0, -1).join(' ')} <span className="nw">{frameNote.split(' ').slice(-1)[0]}</span>
        </span>
      </div>
      <button type="button" className="hear" onClick={onListen} aria-pressed={current}>
        {current ? `Listening to ${label}` : `Listen to ${label}`}
      </button>
      <figcaption className="where">{region.name}</figcaption>
    </figure>
  );
}
