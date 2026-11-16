// Charts of what was measured: the NASA picture (alignment map, the two regions over time) and the
// box-size test that shows chance never scores 0. Each chart shows one picture only: numbers from
// different pictures are never compared.
import { ChartFigure, curve, Dots, LegendItem, path, Plot } from './charts';
import { CHANCE, column, experiment, MAP, modelTime, numbers, OCEAN_REGIONS, percentile, regionSeries } from './data';
import { fmt, M, N } from './parts';

const R = String.raw;
/** Bins of 0.1 for the map's single-hue scale; the last bin holds everything from 0.7 up. */
const BINS = 8;
const bin = (v: number) => Math.min(BINS - 1, Math.floor(v * 10));

export function AlignmentMap() {
  const { grid } = MAP;
  const values = MAP.alignment.flat().filter((v): v is number => v !== null).sort((a, b) => a - b);
  const toGrid = (px: number, axis: 0 | 1) => (px - grid.first_center_px[axis]) / grid.step_px + 0.5;
  const regions = OCEAN_REGIONS.map((r) => {
    const check = MAP.checked_against_features.find((c) => c.region === r.region.id);
    return {
      ...r,
      u: toGrid(r.region.center_px[0], 0),
      v: toGrid(r.region.center_px[1], 1),
      radius: r.region.radius_px / grid.step_px,
      value: check?.map ?? null,
      features: check?.features ?? null,
    };
  });
  const below = (x: number) => values.filter((v) => v < x).length / values.length;
  // "lower than 98% of the circles" reads better than "higher than 2%".
  const rank = (x: number) => (below(x) < 0.5 ? `lower than ${fmt(100 * (1 - below(x)), 0)}%` : `higher than ${fmt(100 * below(x), 0)}%`);
  return (
    <ChartFigure
      id="how-map-chart"
      title="Alignment across the whole ocean picture"
      takeaway={<>Most of the ocean scores between <N>{fmt(percentile(values, 5), 2)}</N> and <N>{fmt(percentile(values, 95), 2)}</N>. {regions.map((r) => `Region ${r.letter} (${fmt(r.value, 2)}) scores ${rank(r.value ?? 0)} of the circles`).join('; ')}.</>}
      source={<>NASA SVS 3912, one frame (model time {modelTime(MAP.frame.source_time)}): a circle of radius {MAP.measurement.radius_px} px centred every {grid.step_px} px, the same settings as the regions.</>}
      legend={
        <>
          {Array.from({ length: BINS }, (_, k) => (
            <li key={k} className="how-ramp-item">
              <i className={`how-key how-hm-${k}`} aria-hidden="true" />
              <span>{k === BINS - 1 ? `${fmt(k / 10, 1)}+` : fmt(k / 10, 1)}</span>
            </li>
          ))}
          <LegendItem kind="hatch">No number: land, coast or too little detail</LegendItem>
        </>
      }
      numbers={{
        cols: [{ label: 'What' }, { label: 'Value', num: true }],
        rows: [
          ['Circles measured', String(MAP.summary.points)],
          ['Circles with a number', String(MAP.summary.with_a_number)],
          ['Lowest', fmt(MAP.summary.min, 3)],
          ['5th percentile', fmt(percentile(values, 5), 3)],
          ['Median', fmt(percentile(values, 50), 3)],
          ['95th percentile', fmt(percentile(values, 95), 3)],
          ['Highest', fmt(MAP.summary.max, 3)],
          ...regions.map((r) => [`Region ${r.letter}, ${r.region.name} (map / features.json)`, `${fmt(r.value, 3)} / ${fmt(r.features, 3)}`]),
        ],
      }}
      maxWidth={760}
    >
      {(w) => (
        <div className="how-map" style={{ width: w }}>
          <svg className="how-svg" viewBox={`0 0 ${grid.columns} ${grid.rows}`} width={w} height={(w * grid.rows) / grid.columns} preserveAspectRatio="none" role="img"
            aria-label={`Alignment map of the ocean picture: ${MAP.summary.with_a_number} circles with a number, from ${fmt(MAP.summary.min, 2)} to ${fmt(MAP.summary.max, 2)}. ${regions.map((r) => `Region ${r.letter} scores ${fmt(r.value, 2)}`).join('; ')}.`}>
            <defs>
              <pattern id="how-hatch" width="1" height="1" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line className="how-hatch-line" x1="0" y1="0" x2="0" y2="1" />
              </pattern>
            </defs>
            <rect x={0} y={0} width={grid.columns} height={grid.rows} fill="url(#how-hatch)" />
            {MAP.alignment.map((cells, j) =>
              cells.map((v, i) => (v === null ? null : <rect key={`${i}-${j}`} className={`how-hm-${bin(v)}`} x={i} y={j} width={1.04} height={1.04} />)),
            )}
            {regions.map((r) => (
              <g key={r.letter} className={r.className}>
                <circle className="how-map-ring-under" cx={r.u} cy={r.v} r={r.radius} />
                <circle className="how-map-ring" cx={r.u} cy={r.v} r={r.radius} />
              </g>
            ))}
          </svg>
          {regions.map((r) => (
            <span key={r.letter} className={`how-map-tag ${r.className}`}
              style={{ left: `${(100 * (r.u + r.radius * 0.75)) / grid.columns}%`, top: `${(100 * (r.v - r.radius * 0.75)) / grid.rows}%` }} aria-hidden="true">
              {r.letter}
            </span>
          ))}
        </div>
      )}
    </ChartFigure>
  );
}

export function RegionsOverTime() {
  const series = OCEAN_REGIONS.map((r) => ({ ...r, steps: regionSeries(r.region.id) }));
  const frames = Math.max(...series.map((s) => s.steps.length));
  const first = series[0].steps[0], lastStep = series[0].steps[frames - 1];
  const okValues = (s: (typeof series)[number]) => s.steps.flatMap((st) => (st.status === 'ok' ? [st.alignment] : []));
  const title = `The two regions over ${frames} frames`;
  const gaps = series[0].steps.map((st, i) => {
    const other = series[1]?.steps[i];
    return st.status === 'ok' && other?.status === 'ok' ? Math.abs(st.alignment - other.alignment) : null;
  }).filter((g): g is number => g !== null);
  return (
    <ChartFigure
      id="how-time-chart"
      title={title}
      takeaway={<>{series.map((s) => `Region ${s.letter} stays between ${fmt(Math.min(...okValues(s)), 2)} and ${fmt(Math.max(...okValues(s)), 2)}`).join('; ')}. At the same moment they are never closer than <N>{fmt(Math.min(...gaps), 2)}</N> apart.</>}
      source={<>NASA SVS 3912, model time {modelTime(first?.source_time)} to {modelTime(lastStep?.source_time)}: the smoothed values the app plays.</>}
      legend={series.map((s) => <LegendItem key={s.letter} kind={s.className === 'how-region-a' ? 'region-a' : 'region-b'}>Region {s.letter}, {s.region.name}</LegendItem>)}
      numbers={{
        cols: [{ label: 'Frame', num: true }, { label: 'Model time' }, ...series.map((s) => ({ label: `Region ${s.letter}`, num: true }))],
        rows: series[0].steps.map((st, i) => [
          String(i + 1),
          modelTime(st.source_time),
          ...series.map((s) => {
            const x = s.steps[i];
            return x && x.status === 'ok' ? fmt(x.alignment, 3) : 'missing';
          }),
        ]),
      }}
    >
      {(w) => (
        <Plot width={w} height={240} label={`Alignment of the two regions over ${frames} frames. ${series.map((s) => `Region ${s.letter} near ${fmt(okValues(s)[0], 2)}`).join(', ')}.`}
          x={{ min: 1, max: frames, ticks: [1, 10, 20, frames], label: 'frame' }}
          y={{ min: 0, max: 1, ticks: [0, 0.5, 1], label: 'alignment' }}
          points={series.flatMap((s) => s.steps.flatMap((st, i) => (st.status === 'ok' ? [{ x: i + 1, y: st.alignment, text: `Region ${s.letter}, frame ${i + 1} (${st.source_time}): ${fmt(st.alignment, 3)}` }] : [])))}>
          {(sx, sy) => (
            <>
              {series.map((s) => {
                const last = [...s.steps].reverse().find((st) => st.status === 'ok');
                return (
                  <g key={s.letter} className={s.className}>
                    <path className="how-region-line" d={path(s.steps.map((st, i) => ({ x: i + 1, y: st.status === 'ok' ? st.alignment : null })), sx, sy)} />
                    {last && last.status === 'ok' && (
                      <text className="how-region-label" x={sx(frames) - 4} y={sy(last.alignment) - 10} textAnchor="end">
                        {s.letter} {fmt(last.alignment, 2)}
                      </text>
                    )}
                  </g>
                );
              })}
            </>
          )}
        </Plot>
      )}
    </ChartFigure>
  );
}

export function ChanceChart() {
  const e = experiment('crop');
  const box = numbers(column(e, 'box_px')), measured = numbers(column(e, 'random mean')), sd = numbers(column(e, 'sd '));
  const n = numbers(column(e, 'dashes in box (about)')), predicted = numbers(column(e, '0.886/sqrt(n)'));
  // The prediction is c / box for one field of dashes (n grows with the box's area); c from the table.
  const c = mean(predicted.map((p, i) => p * box[i]));
  const boxes = Number(/(\d+) boxes/.exec(e.title)?.[1]);
  const lo = Math.min(...box), hi = Math.max(...box);
  return (
    <ChartFigure
      id="how-chance-chart"
      title="Chance level against box size"
      takeaway={<>Dashes at random angles score <N>{fmt(measured[box.indexOf(hi)], 2)}</N> in a {hi} px box but <N>{fmt(measured[box.indexOf(lo)], 2)}</N> in a {lo} px box: fewer dashes leave a bigger chance vote, close to <M t={R`${CHANCE}/\sqrt n`} />. Regions must be large and the same size.</>}
      source={`Test pictures, not NASA data: ${boxes} boxes at random places in one field of dashes; whiskers are one standard deviation.`}
      legend={<><LegendItem kind="faint">Predicted, <M t={R`${CHANCE}/\sqrt n`} /></LegendItem><LegendItem kind="dot">Measured, mean of {boxes} boxes</LegendItem></>}
      numbers={{
        cols: [{ label: 'Box, px', num: true }, { label: 'Dashes in it, about', num: true }, { label: 'Predicted', num: true }, { label: 'Measured', num: true }, { label: 'sd', num: true }],
        rows: box.map((b, i) => [String(b), fmt(n[i], 0), fmt(predicted[i], 3), fmt(measured[i], 3), fmt(sd[i], 3)]),
      }}
    >
      {(w) => (
        <Plot width={w} height={250} label={`Random dashes: alignment falls from ${fmt(measured[box.indexOf(lo)], 2)} in a ${lo} pixel box to ${fmt(measured[box.indexOf(hi)], 2)} in a ${hi} pixel box, following 0.886 over the square root of the number of dashes.`}
          x={{ min: lo * 0.85, max: hi * 1.15, ticks: box.slice().sort((a, b) => a - b), log: true, label: 'box size, px (log scale)' }}
          y={{ min: 0, max: 0.8, ticks: [0, 0.25, 0.5, 0.75], label: 'alignment' }}
          points={box.map((b, i) => ({ x: b, y: measured[i], text: `${b} px box, about ${fmt(n[i], 0)} dashes: measured ${fmt(measured[i], 3)}, predicted ${fmt(predicted[i], 3)}` }))}>
          {(sx, sy) => (
            <>
              <path className="how-line-faint" d={curve((b) => c / b, lo * 0.85, hi * 1.15, sx, sy, 80, true)} />
              {box.map((b, i) => (
                <line key={b} className="how-whisker" x1={sx(b)} x2={sx(b)} y1={sy(Math.max(0, measured[i] - sd[i]))} y2={sy(measured[i] + sd[i])} />
              ))}
              <Dots pts={box.map((b, i) => ({ x: b, y: measured[i] }))} sx={sx} sy={sy} />
            </>
          )}
        </Plot>
      )}
    </ChartFigure>
  );
}

function mean(values: number[]) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}
