// "Both rhythms, one time line": Student B's comparison plot from tools/listening_game.html.
// Every Earth pulse of both regions on one shared time axis, made by the same code that makes the
// sound (buildEarthTrack), so the plot cannot disagree with what you hear. In the game it appears
// only after an answer; in the app there is nothing to give away, so it is always shown.
import { useEffect, useState } from 'react';
import { buildEarthTrack } from '../audio/earthVoice';
import { tideCurve } from './compare';
import type { PlayState } from '../audio/transport';
import type { Features, Region } from '../data/types';
import { regionLabel, regionStyle, type RegionLook } from './ExploreControls';

interface Props {
  features: Features;
  regions: Region[];
  activeRegionId: string;
  playState: PlayState;
  getPosition: () => number;
  /** First letter and neutral style of this picture's regions. */
  look?: RegionLook;
  /** Draw the per-region rhythm rows here (false on Compare, where each row sits under its region). */
  showRows?: boolean;
}

const U = 20;
const ROW_H = 40;

export function RhythmsPlot({ features, regions, activeRegionId, playState, getPosition, look = {}, showRows = true }: Props) {
  // The playing position, in model frames, for the marker across the tide curves.
  const [pos, setPos] = useState<number | null>(null);
  useEffect(() => {
    if (playState === 'stopped') {
      setPos(null);
      return;
    }
    let raf = 0;
    const tick = () => {
      setPos(getPosition());
      if (playState === 'playing') raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [playState, getPosition]);
  const tracks = regions.map((r) => ({ region: r, track: buildEarthTrack(features, r.id) }));
  const length = Math.max(...tracks.map((t) => t.track.length));
  const meanSplit = (id: string) => {
    const lf = tracks
      .find((t) => t.region.id === id)!
      .track.steps.flatMap((s) => s.events.slice(0, 1).map((e) => e.why!.long_fraction));
    return lf.length ? Math.round((100 * lf.reduce((a, b) => a + b, 0)) / lf.length) : null;
  };

  // Tide table: each region's alignment over the model frames, the numbers behind every curve.
  const series = regions.map((r) => {
    const steps = features.steps.filter((st) => st.region === r.id).sort((a, b) => a.t - b.t);
    const ok = steps.flatMap((st) => (st.status === 'ok' ? [st.alignment] : []));
    return { region: r, steps, lo: ok.length ? Math.min(...ok) : null, hi: ok.length ? Math.max(...ok) : null };
  });
  const frames = Math.max(...series.map((x) => x.steps.length));
  const CW = 600, CH = 120, LABEL = 70;
  const cx = (i: number) => (frames > 1 ? (i / (frames - 1)) * CW : 0);
  const cy = (a: number) => CH - a * CH;
  // A missing frame breaks the curve (never drawn as zero); a lone frame, or a one-frame picture, is a dot.
  const curve = (steps: (typeof series)[number]['steps']) => tideCurve(steps, CW, CH);
  const fmt = (a: number | null) => (a === null ? '–' : a.toFixed(2));

  return (
    <section className="plot" aria-labelledby="plot-title">
      <h2 id="plot-title">Both rhythms, one time line</h2>
      <table className="tide-table">
        <thead>
          <tr>
            <th scope="col">Region</th>
            <th scope="col" className="num">Alignment, low–high</th>
            <th scope="col" className="num">Second pulse, average</th>
            <th scope="col" className="num">Missing frames</th>
          </tr>
        </thead>
        <tbody>
          {series.map(({ region, steps, lo, hi }) => {
            const split = meanSplit(region.id);
            return (
              <tr key={region.id} className={region.id === activeRegionId ? 'current' : undefined}>
                <th scope="row">
                  <span className="region-badge" aria-hidden="true" style={regionStyle(regions, region.id, look)}>
                    {regionLabel(regions, region.id, look.firstLetter).replace('Region ', '')}
                  </span>
                  {region.name}
                </th>
                <td className="num">{fmt(lo)}–{fmt(hi)}</td>
                <td className="num">{split === null ? 'no sound' : `${split}%`}</td>
                <td className="num">{steps.filter((st) => st.status !== 'ok').length}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <figure className="tide">
        <svg
          viewBox={`-34 -8 ${CW + 42 + LABEL} ${CH + 30}`}
          role="img"
          aria-label={`Alignment over ${frames} model frames. ${series
            .map((x) => `${regionLabel(regions, x.region.id, look.firstLetter)} from ${fmt(x.lo)} to ${fmt(x.hi)}`)
            .join('; ')}.`}
        >
          {[0, 0.5, 1].map((a) => (
            <g key={a}>
              <line className="tide-grid" x1={0} x2={CW} y1={cy(a)} y2={cy(a)} />
              <text className="tide-axis" x={-8} y={cy(a) + 4} textAnchor="end">{a}</text>
            </g>
          ))}
          {series.map((x) => {
            // Each curve is named at its right end (letter and last value), so colour is never the only cue.
            const lastOk = [...x.steps].reverse().find((st) => st.status === 'ok');
            const letter = regionLabel(regions, x.region.id, look.firstLetter).replace('Region ', '');
            return (
              <g key={x.region.id} style={regionStyle(regions, x.region.id, look)}>
                <path className="tide-curve" d={curve(x.steps).path} />
                {curve(x.steps).dots.map((d) => (
                  <circle key={`${d.x}-${d.y}`} className="tide-dot" cx={d.x} cy={d.y} r={5} />
                ))}
                {lastOk && lastOk.status === 'ok' && (
                  <text className="tide-end" x={CW + 10} y={cy(lastOk.alignment) + 5}>
                    {letter} {lastOk.alignment.toFixed(2)}
                  </text>
                )}
              </g>
            );
          })}
          {pos !== null && frames > 1 && (
            <line className="tide-now" x1={cx(Math.min(frames - 1, pos))} x2={cx(Math.min(frames - 1, pos))} y1={-6} y2={CH} />
          )}
          {frames > 1 ? (
            <>
              <text className="tide-axis" x={0} y={CH + 20}>frame 1</text>
              <text className="tide-axis" x={CW} y={CH + 20} textAnchor="end">frame {frames}</text>
            </>
          ) : (
            <text className="tide-axis" x={0} y={CH + 20}>one moment</text>
          )}
        </svg>
        <figcaption>Alignment over the frames: higher means the streaks line up more.</figcaption>
      </figure>

      {showRows && (
        <>
          <p>Grey second-pulse marks nearer the middle of the beat mean a more even pulse.</p>
          {tracks.map(({ region }) => (
            <RhythmRow key={region.id} features={features} regions={regions} regionId={region.id}
              activeRegionId={activeRegionId} look={look} length={length} />
          ))}
          <RhythmLegend />
        </>
      )}
    </section>
  );
}

interface RowProps {
  features: Features;
  regions: Region[];
  regionId: string;
  activeRegionId: string;
  look?: RegionLook;
  /** Seconds the row spans, the same for every row so they share one clock. */
  length: number;
}

/** One region's Earth pulses on the shared clock, made by the same code as the sound. */
export function RhythmRow({ features, regions, regionId, activeRegionId, look = {}, length }: RowProps) {
  const region = regions.find((r) => r.id === regionId)!;
  const track = buildEarthTrack(features, regionId);
  const W = length * U;
  const label = regionLabel(regions, regionId, look.firstLetter);
  const lf = track.steps.flatMap((s) => s.events.slice(0, 1).map((e) => e.why!.long_fraction));
  const split = lf.length ? Math.round((100 * lf.reduce((a, b) => a + b, 0)) / lf.length) : null;
  const missing = track.steps.filter((s) => s.events.length === 0).length;
  return (
    <div className={regionId === activeRegionId ? 'plot-row current' : 'plot-row'} style={regionStyle(regions, regionId, look)}>
      <b>{label}</b>
      <svg
        viewBox={`0 0 ${W} ${ROW_H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${label}, ${region.name}: second pulse on average ${split ?? '–'}% of the way through each beat${missing ? `; ${missing} beats missing` : ''}.`}
      >
        <line className="baseline" x1={0} x2={W} y1={ROW_H - 1} y2={ROW_H - 1} />
        {track.steps.map((s) => (
          <g key={s.t}>
            <line className="beat" x1={s.t * U} x2={s.t * U} y1={0} y2={ROW_H} />
            {s.events.length === 0 && <rect className="missing-beat" x={s.t * U + 1} y={4} width={s.dur * U - 2} height={ROW_H - 8} />}
            {s.events.map((e, i) => (
              <rect key={i} className={`note ${i === 1 ? 'hi' : 'lo'}`} x={e.t * U - 2} y={i === 1 ? 14 : 2} width={4} height={i === 1 ? ROW_H - 15 : ROW_H - 3} />
            ))}
          </g>
        ))}
      </svg>
      <span className="plot-split">{split === null ? 'no sound' : `${split}/${100 - split}`}</span>
    </div>
  );
}

/** Legend for the rhythm rows. */
export function RhythmLegend() {
  return (
    <div className="legend" aria-hidden="true">
      <span><i className="swatch" style={{ background: 'var(--ink)' }} />First pulse (in the region&apos;s colour)</span>
      <span><i className="swatch short" style={{ background: 'var(--ink-2)' }} />Second pulse</span>
      <span><i className="swatch hatch" />Missing information (quiet)</span>
    </div>
  );
}
