// Charts for How it's made, drawn by hand in SVG like RhythmsPlot (no chart library). Each one
// lives in a ChartFigure: a takeaway first, a legend when it has two series or more, the plot sized to
// its column, and "Show the numbers" with the table behind it. Colours are CSS tokens, so both themes
// work; a hover readout names the nearest point (the table carries the same values for keyboards
// and screen readers).
import { useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { ShowNumbers, type Col } from './parts';

export function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

export function LegendItem({ kind, children }: { kind: 'line' | 'dot' | 'faint' | 'region-a' | 'region-b' | 'hatch' | 'gap'; children: ReactNode }) {
  return (
    <li>
      <i className={`how-key how-key-${kind}`} aria-hidden="true" />
      {children}
    </li>
  );
}

export function ChartFigure({ id, title, takeaway, source, legend, numbers, maxWidth = 720, children }: {
  id?: string;
  title: string;
  takeaway: ReactNode;
  /** Where the numbers come from, e.g. "Test pictures, not NASA data." */
  source: ReactNode;
  legend?: ReactNode;
  numbers: { cols: Col[]; rows: ReactNode[][] };
  maxWidth?: number;
  children: (width: number) => ReactNode;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  return (
    <figure className="how-chart" id={id}>
      <figcaption>
        <b>{title}.</b> {takeaway} <span className="how-src">{source}</span>
      </figcaption>
      {legend && <ul className="how-legend">{legend}</ul>}
      <div className="how-plot" ref={ref}>
        {width > 0 && children(Math.min(width, maxWidth))}
      </div>
      <ShowNumbers {...numbers} />
    </figure>
  );
}

export interface Axis {
  min: number;
  max: number;
  ticks: number[];
  format?: (v: number) => string;
  label?: string;
  log?: boolean;
}
export interface HoverPoint {
  x: number;
  y: number;
  text: string;
}
type Scale = (v: number) => number;

/** Axes, hairline grid and a hover readout; the marks are drawn by `children` with the two scales. */
export function Plot({ width, height, x, y, label, points = [], children }: {
  width: number;
  height: number;
  x: Axis;
  y: Axis;
  /** What the chart shows, in one sentence, for screen readers. */
  label: string;
  points?: HoverPoint[];
  children: (sx: Scale, sy: Scale) => ReactNode;
}) {
  const L = 46, R = width < 480 ? 16 : 24, T = y.label ? 24 : 12, B = x.label ? 48 : 30;
  const pw = Math.max(10, width - L - R), ph = Math.max(10, height - T - B);
  const t = (v: number) => (x.log ? Math.log(v) : v);
  const sx: Scale = (v) => L + ((t(v) - t(x.min)) / (t(x.max) - t(x.min))) * pw;
  const sy: Scale = (v) => T + (1 - (v - y.min) / (y.max - y.min)) * ph;
  const fx = x.format ?? String, fy = y.format ?? String;
  const [hover, setHover] = useState<number | null>(null);
  const onMove = (e: PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
    const px = e.clientX - box.left, py = e.clientY - box.top;
    let best = -1, bestD = Infinity;
    points.forEach((p, i) => {
      const d = Math.hypot(sx(p.x) - px, sy(p.y) - py);
      if (d < bestD) [best, bestD] = [i, d];
    });
    setHover(best >= 0 && bestD < 40 ? best : null);
  };
  return (
    <>
      {points.length > 0 && (
        <p className="how-readout" aria-hidden="true">
          {hover !== null ? points[hover].text : ' '}
        </p>
      )}
      <svg className="how-svg" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
        {y.label && (
          <text className="how-axis-label" x={L - 8} y={12}>
            {y.label}
          </text>
        )}
        {y.ticks.map((v) => (
          <g key={`y${v}`}>
            <line className="how-grid" x1={L} x2={L + pw} y1={sy(v)} y2={sy(v)} />
            <text className="how-axis" x={L - 8} y={sy(v) + 4} textAnchor="end">
              {fy(v)}
            </text>
          </g>
        ))}
        {x.ticks.map((v) => (
          <text key={`x${v}`} className="how-axis" x={sx(v)} y={T + ph + 18} textAnchor="middle">
            {fx(v)}
          </text>
        ))}
        {x.label && (
          <text className="how-axis-label" x={L + pw} y={height - 6} textAnchor="end">
            {x.label}
          </text>
        )}
        {children(sx, sy)}
        {hover !== null && <circle className="how-hover" cx={sx(points[hover].x)} cy={sy(points[hover].y)} r={9} />}
        {points.length > 0 && (
          <rect className="how-hit" x={L - 10} y={T - 10} width={pw + 20} height={ph + 20} onPointerMove={onMove} onPointerLeave={() => setHover(null)} />
        )}
      </svg>
    </>
  );
}

/** A path through points; a null value lifts the pen (a gap is never drawn as zero). */
export function path(values: { x: number; y: number | null }[], sx: Scale, sy: Scale): string {
  let d = '';
  let pen = false;
  for (const v of values) {
    if (v.y === null || Number.isNaN(v.y)) {
      pen = false;
      continue;
    }
    d += `${pen ? 'L' : 'M'}${sx(v.x).toFixed(1)},${sy(v.y).toFixed(1)}`;
    pen = true;
  }
  return d;
}

/** A function drawn as a smooth curve, sampled at `n` points. */
export function curve(f: (x: number) => number, min: number, max: number, sx: Scale, sy: Scale, n = 120, log = false): string {
  const pts = Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n;
    const x = log ? Math.exp(Math.log(min) + u * (Math.log(max) - Math.log(min))) : min + u * (max - min);
    return { x, y: f(x) };
  });
  return path(pts, sx, sy);
}

/** Dots with a ring in the page colour, so they stay readable where they cross a line. */
export function Dots({ pts, sx, sy, className = 'how-dot', r = 5 }: {
  pts: { x: number; y: number }[];
  sx: Scale;
  sy: Scale;
  className?: string;
  r?: number;
}) {
  return (
    <g>
      {pts.map((p, i) => (
        <circle key={i} className={className} cx={sx(p.x)} cy={sy(p.y)} r={r} />
      ))}
    </g>
  );
}
