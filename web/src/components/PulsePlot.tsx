// The pulse plot (DESIGN.md "Pulse plot", Pulse Catalogue): one hairline per model frame, stacked
// like a record sleeve's pulsar plot. Each line is one beat of the region's Earth rhythm: a peak at
// the first pulse and a second, lower peak where the second pulse lands (0.75 − 0.25 × alignment of
// the beat). While the region plays, the line for the sounding beat doubles in weight in the side's
// colour, and a needle sweeps across the beat, crossing each peak as its pulse sounds.
// A missing frame is a dashed flat line: no peaks, never drawn as a value.
// Ready for Compare (docs/page_plan.md, P2); the page owner decides where it goes.
import type { CSSProperties } from 'react';
import { useEffect, useRef } from 'react';
import type { EarthTrack } from '../audio/earthVoice';
import type { PlayState } from '../audio/transport';

/** Where the second pulse lands in each beat, as a share of the beat; null when the frame is missing. */
export function pulseLines(track: EarthTrack): (number | null)[] {
  return track.steps.map((s) => (s.events.length >= 2 ? (s.events[1].t - s.t) / s.dur : null));
}

/** The beat sounding at a track position (seconds), and how far through it the needle is (0–1). */
export function needleAt(track: EarthTrack, position: number): { step: number; fraction: number } {
  const steps = track.steps;
  let i = 0;
  while (i < steps.length - 1 && steps[i + 1].t <= position) i++;
  const s = steps[i];
  return { step: i, fraction: Math.min(1, Math.max(0, (position - s.t) / s.dur)) };
}

// The beat runs from LEFT to RIGHT of the canvas width, with a little room before the first pulse.
const PAD = 0.12; // share of a beat drawn before the first pulse and after the end
const LEFT = 0.1;
const RIGHT = 0.9;
/** Horizontal place of a point in the beat (0 = first pulse, 1 = next beat), as a share of the width. */
export const xOfBeat = (u: number) => LEFT + ((RIGHT - LEFT) * (u + PAD)) / (1 + 2 * PAD);

interface Props {
  track: EarthTrack;
  /** regionStyle(...): sets --region for the side's colour. */
  colour: CSSProperties;
  label: string;
  /** True when this region is the one playing. */
  active: boolean;
  playState: PlayState;
  getPosition: () => number;
}

export function PulsePlot({ track, colour, label, active, playState, getPosition }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const needleRef = useRef<HTMLSpanElement>(null);
  const litRef = useRef(-1);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const lines = pulseLines(track);
    const draw = (lit: number) => {
      const box = canvas.getBoundingClientRect();
      if (!box.width) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(box.width * dpr);
      canvas.height = Math.round(box.height * dpr);
      const c = canvas.getContext('2d')!;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      const css = getComputedStyle(canvas);
      const well = css.getPropertyValue('--well').trim() || '#000';
      const side = css.getPropertyValue('--region').trim() || '#fff';
      const W = box.width;
      const H = box.height;
      c.fillStyle = well;
      c.fillRect(0, 0, W, H);
      const n = lines.length;
      const amp = H * 0.17;
      const top = H * 0.06 + amp;
      const gap = n > 1 ? (H * 0.95 - top) / (n - 1) : 0;
      const bump = (u: number, at: number) => Math.exp(-((u - at) ** 2) / (2 * 0.028 * 0.028));
      const K = 200;
      for (let i = 0; i < n; i++) {
        const base = top + i * gap;
        const second = lines[i];
        const pts: [number, number][] = [];
        for (let k = 0; k <= K; k++) {
          const u = -PAD + ((1 + 2 * PAD) * k) / K;
          const v = second === null ? 0 : bump(u, 0) + 0.72 * bump(u, second);
          pts.push([xOfBeat(u) * W, base - v * amp]);
        }
        // Fill under the line with the well, so lines in front hide the ones behind.
        c.beginPath();
        pts.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y)));
        c.lineTo(RIGHT * W, base + 2);
        c.lineTo(LEFT * W, base + 2);
        c.closePath();
        c.fillStyle = well;
        c.fill();
        c.beginPath();
        pts.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y)));
        const on = i === lit;
        c.setLineDash(second === null ? [3, 4] : []);
        c.strokeStyle = on ? side : 'rgba(255,255,255,0.92)';
        c.lineWidth = on ? 2.6 : 1.1;
        c.stroke();
      }
      c.setLineDash([]);
    };
    const redraw = () => draw(litRef.current);
    redraw();
    const ro = new ResizeObserver(redraw);
    ro.observe(canvas);
    // The side's colour lifts in dark mode; redraw when the theme changes.
    const mo = new MutationObserver(redraw);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    let raf = 0;
    const needle = needleRef.current!;
    const frame = () => {
      const { step, fraction } = needleAt(track, getPosition());
      needle.style.left = `${(xOfBeat(fraction) * 100).toFixed(3)}%`;
      if (step !== litRef.current) {
        litRef.current = step;
        draw(step);
      }
      if (playState === 'playing') raf = requestAnimationFrame(frame);
    };
    if (active && playState !== 'stopped') frame();
    else if (litRef.current !== -1) {
      litRef.current = -1;
      draw(-1);
    }
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
    };
  }, [track, active, playState, getPosition]);

  const live = active && playState !== 'stopped';
  return (
    <div className="pulse-plot" style={colour}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Pulse plot for ${label}: one line per model frame. Each line is one beat; the first peak is the first pulse, the second peak is where the second pulse lands.`}
      />
      <span ref={needleRef} className="pulse-needle" aria-hidden="true" hidden={!live} />
    </div>
  );
}
