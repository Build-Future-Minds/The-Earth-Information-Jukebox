// "Both rhythms, one time line": Student B's comparison plot from tools/listening_game.html.
// Every Earth pulse of both regions on one shared time axis, made by the same code that makes the
// sound (buildEarthTrack), so the plot cannot disagree with what you hear. In the game it appears
// only after an answer; in the app there is nothing to give away, so it is always shown.
import { buildEarthTrack } from '../audio/earthVoice';
import type { Features, Region } from '../data/types';
import { regionLabel } from './ExploreControls';

interface Props {
  features: Features;
  regions: Region[];
  activeRegionId: string;
}

const U = 20;
const ROW_H = 40;

export function RhythmsPlot({ features, regions, activeRegionId }: Props) {
  const tracks = regions.map((r) => ({ region: r, track: buildEarthTrack(features, r.id) }));
  const length = Math.max(...tracks.map((t) => t.track.length));
  const W = length * U;
  const meanSplit = (id: string) => {
    const lf = tracks
      .find((t) => t.region.id === id)!
      .track.steps.flatMap((s) => s.events.slice(0, 1).map((e) => e.why!.long_fraction));
    return lf.length ? Math.round((100 * lf.reduce((a, b) => a + b, 0)) / lf.length) : null;
  };

  return (
    <section className="plot" aria-labelledby="plot-title">
      <h2 id="plot-title">Both rhythms, one time line</h2>
      <p>
        Every pulse of both regions, on the same clock. The closer each orange mark sits to the middle of its beat, the
        more even the pulse.
      </p>
      {tracks.map(({ region, track }) => {
        const label = regionLabel(regions, region.id);
        const split = meanSplit(region.id);
        const missing = track.steps.filter((s) => s.events.length === 0).length;
        return (
          <div key={region.id} className={region.id === activeRegionId ? 'plot-row current' : 'plot-row'}>
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
                  {s.events.length === 0 && (
                    <rect className="missing-beat" x={s.t * U + 1} y={4} width={s.dur * U - 2} height={ROW_H - 8} />
                  )}
                  {s.events.map((e, i) => (
                    <rect
                      key={i}
                      className={`note ${i === 1 ? 'hi' : 'lo'}`}
                      x={e.t * U - 2}
                      y={i === 1 ? 14 : 2}
                      width={4}
                      height={i === 1 ? ROW_H - 15 : ROW_H - 3}
                    />
                  ))}
                </g>
              ))}
            </svg>
            <span className="plot-split">{split === null ? 'no sound' : `${split}/${100 - split}`}</span>
          </div>
        );
      })}
      <div className="legend" aria-hidden="true">
        <span>
          <i className="swatch" style={{ background: 'var(--ink)' }} />
          First pulse of each beat
        </span>
        <span>
          <i className="swatch" style={{ background: 'var(--signal)' }} />
          Second pulse
        </span>
        <span>
          <i className="swatch hatch" />
          Missing information (quiet)
        </span>
      </div>
    </section>
  );
}
