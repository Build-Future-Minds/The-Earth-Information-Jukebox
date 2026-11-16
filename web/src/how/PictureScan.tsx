// Pipeline 2, the picture scan: a line (or a radar on a region) sweeps the NASA picture and plays
// what it crosses. Sources: docs/mapping_spec.md "Play along: the picture scan",
// web/src/audio/scanScore.ts, scanChoices.ts and instruments.ts, docs/measurements/.
import { GLOCKENSPIEL, MARIMBA, MUSIC_BOX } from '../audio/instruments';
import { SCAN_CHOICES } from '../audio/scanChoices';
import {
  BAND_NOTE_NAMES,
  CHIME_RULE,
  chimeVelocity,
  LINE_GRID,
  PAN_WIDTH,
  RADAR_GRID,
  RADAR_SAMPLES,
  ROOT_NOTES,
  ROOT_PROGRESSION,
  ROOT_STEP_SECONDS,
  SCAN_SCALE,
  STRENGTH_FLOOR,
  noteName,
} from '../audio/scanScore';
import { ChartFigure, LegendItem, Plot } from './charts';
import { barRoots, OCEAN_SCAN, SCAN, SOUND } from './data';
import { Entry, Field, fmt, Formula, M, N, RepoLink, Stage, Table, Tag, TestName } from './parts';

const R = String.raw;
const SCAN_TESTS = 'web/src/audio/scanScore.test.ts';
const FLOOR_LEVELS = Math.round(STRENGTH_FLOOR * 255);
const PER_SECOND = LINE_GRID.columns / LINE_GRID.seconds;
const V0 = chimeVelocity(0), V1 = chimeVelocity(1);

const SWEEPS = SOUND.sweeps;

export function PictureScan() {
  const quiet = SCAN.lossless.quietCells.find((q) => q.least === 0.9);
  const levelSteps = SOUND.steps.steps;
  const lineSweep = SWEEPS.find((s) => s.name.startsWith('Whole picture'));
  return (
    <>
      <Stage n="2.1" name="The grid" tags={['Design choice']}
        plain={`A line crosses the whole picture from west to east in ${LINE_GRID.columns} columns of ${LINE_GRID.bands} bands; on a region, a radar turns in ${RADAR_GRID.columns} columns of ${RADAR_GRID.bands} rings.`}>
        <Entry>
          <Field label="Formula">
            <Formula
              tex={R`\text{cell}(c,b)=\Big[\tfrac{c}{${LINE_GRID.columns}}W,\ \tfrac{c+1}{${LINE_GRID.columns}}W\Big)\times\Big[\tfrac{b}{${LINE_GRID.bands}}H,\ \tfrac{b+1}{${LINE_GRID.bands}}H\Big),\qquad t_c=\frac{c}{${LINE_GRID.columns}}\,${LINE_GRID.seconds}\ \text{s}`}
              words={<>the map sweep cuts the picture into {LINE_GRID.columns} columns and {LINE_GRID.bands} bands and reads every pixel once. Column c plays at time t, {LINE_GRID.seconds} seconds for the whole sweep.</>}
            />
            <Formula
              tex={R`\theta_i=\frac{2\pi\,\big(c+\frac{i+1/2}{${RADAR_SAMPLES}}\big)}{${RADAR_GRID.columns}},\qquad \rho_j=\frac{r\,\big(b+\frac{j+1/2}{${RADAR_SAMPLES}}\big)}{${RADAR_GRID.bands}},\qquad i,j=0,\dots,${RADAR_SAMPLES - 1}`}
              words={<>the radar cuts a circle of radius r into {RADAR_GRID.columns} wedges and {RADAR_GRID.bands} rings, starting at 3 o’clock and turning anticlockwise. It reads each cell at {RADAR_SAMPLES} × {RADAR_SAMPLES} evenly spaced points, so the small cells near the centre are never empty.</>}
            />
          </Field>
          <Field label="Why it holds">
            Both scans move at the same pace, <N>{PER_SECOND}</N> columns a second ({LINE_GRID.columns} in {LINE_GRID.seconds} s, {RADAR_GRID.columns} in{' '}
            {RADAR_GRID.seconds} s). Sampling each polar cell at the midpoints of a {RADAR_SAMPLES} × {RADAR_SAMPLES} grid is the midpoint rule for its
            average colour.
          </Field>
          <Field label="How we use it">
            On Play along the whole picture plays as the map sweep, and a region as its radar. Each cell becomes one band’s held note
            for one column’s time (stages 2.2 to 2.4).
            <ScanGridDiagram />
          </Field>
          <Field label="Check">
            <Tag t="Design choice" />. The unit tests in <RepoLink path={SCAN_TESTS}>scanScore.test.ts</RepoLink> place three coloured dots on a test
            picture and require exactly three notes, at the columns and bands where the dots are.
          </Field>
        </Entry>
      </Stage>

      <Stage n="2.2" name="Colour strength" tags={['Design choice', 'Verified']}
        plain="How much colour a cell holds sets how loud its band plays. Black sea, grey land and white are silent.">
        <Entry>
          <Field label="Formula">
            <Formula
              tex={R`s=\frac{\max(R,G,B)-\min(R,G,B)}{255},\qquad \ell=\operatorname{clamp}\!\Big(\frac{\bar s-f}{F-f},\,0,\,1\Big),\qquad f=\frac{${FLOOR_LEVELS}}{255}`}
              words={<>colour strength is the gap between a pixel’s largest and smallest channel. A cell’s mean strength becomes a level: 0 at the floor, 1 at the full level F ({LINE_GRID.fullStrength} for the map sweep, {RADAR_GRID.fullStrength} for the radar).</>}
            />
          </Field>
          <Field label="Why it holds">
            Black, grey and white sit on the grey axis, where all three channels are equal, so their strength is 0 (it is the
            “chroma” of the HSV colour model). The level is a straight line, and the held note’s loudness follows it: doubling the
            level should add <M t={R`20\log_{10}2\approx${fmt(20 * Math.log10(2), 2)}`} /> dB.
          </Field>
          <Field label="How we use it">
            The level sets the loudness of the band’s held note and how hard a chime is struck (stage 2.4). Each picture needs its own
            full level; only the ocean picture has been measured, so the scan plays the ocean picture only.
          </Field>
          <Field label="Check">
            <p><Tag t="Verified" /> for the ocean picture: of the <N>{quiet?.cells ?? '–'}</N> cells that are {fmt(100 * (quiet?.least ?? NaN), 0)}% or more grey land or black sea,{' '}
              <N>{quiet?.sounding ?? '–'}</N> sound; the largest mean strength among them is <N>{fmt((quiet?.largestStrength ?? NaN) * 255, 2)}</N> of 255,
              under the floor of {FLOOR_LEVELS} (<RepoLink path="docs/measurements/scan_pictures.md">scan_pictures.md</RepoLink>).
              <Tag t="Verified" /> in a recording of the running app, each doubling of the level adds close to 6 dB:</p>
            <Table
              cols={[{ label: 'Level', num: true }, { label: 'Tone, dB', num: true }, { label: 'Step up, dB', num: true }, { label: 'Expected, dB', num: true }]}
              rows={levelSteps.map((s, i) => [
                fmt(s.level, 3),
                fmt(s.toneDb, 1),
                i ? fmt(s.toneDb - levelSteps[i - 1].toneDb, 2) : '',
                i ? fmt(20 * Math.log10(s.level / levelSteps[i - 1].level), 2) : '',
              ])}
            />
          </Field>
        </Entry>
      </Stage>

      <Stage n="2.3" name="Which cells chime" tags={['Design choice', 'Verified']}
        plain="A bright spot along a band’s path is struck as one note, if it is strong enough and not too close to a stronger one.">
        <Entry>
          <Field label="Formula">
            <Formula
              tex={R`\tilde\ell_c=\frac{\ell_{c-1}+2\ell_c+\ell_{c+1}}{4},\qquad \text{peak at } c \iff \tilde\ell_c>\tilde\ell_{c-1},\ \ \tilde\ell_c\ge\tilde\ell_{c+1},\ \ \tilde\ell_c\ge ${CHIME_RULE.minLevel}`}
              words={<>smooth each band’s levels over three columns with weights 1, 2, 1. A peak is a column higher than the one before, at least as high as the one after, with a level of {CHIME_RULE.minLevel} or more.</>}
            />
          </Field>
          <Field label="Why it holds">
            The 1-2-1 weights are the smallest binomial (Gaussian-like) smoother, so one noisy column cannot make a peak on its own.
            Then <b>non-maximum suppression</b>: two peaks in one band must be at least {CHIME_RULE.minGap} columns apart
            (<N>{fmt(CHIME_RULE.minGap / PER_SECOND, 2)}</N> s), and a column starts at most {CHIME_RULE.perColumn} note; in both cases the
            stronger peak wins. It keeps the notes few enough to hear one by one.
          </Field>
          <Field label="How we use it">
            Each kept peak is a struck note. A peak left out still sounds in its band’s held note; Explain names the stronger peak that took
            its place.
          </Field>
          <Field label="Check">
            <Tag t="Design choice" /> for the thresholds. <Tag t="Verified" />: the counts below were measured on the ocean still in Chromium by{' '}
            <RepoLink path="web/measure">npm run measure</RepoLink> on {SCAN.meta.date}.
          </Field>
        </Entry>
        <ChimesChart />
      </Stage>

      <Stage n="2.4" name="Pitch, loudness, instrument" tags={['Design choice', 'Verified']}
        plain="Where the line is gives the pitch, how much colour gives the loudness, warm or cool colour gives the instrument, and the line’s place gives left or right.">
        <Entry>
          <Field label="Formula">
            <Formula
              tex={R`v=${fmt(V0, 2)}+${fmt(V1 - V0, 2)}\,\ell,\qquad \text{pan}=\begin{cases}${PAN_WIDTH}\,(2p-1) & \text{line}\\ ${PAN_WIDTH}\cos 2\pi p & \text{radar}\end{cases}`}
              words={<>a chime is struck with strength v from its level. The sound sits between the speakers where the line is: p goes from 0 to 1 along the sweep, and never more than {PAN_WIDTH} of the way to one side.</>}
            />
          </Field>
          <Field label="Why it holds">
            It is the method of NASA’s own image sonifications by SYSTEM Sounds: a line sweeps the picture, position sets pitch,
            light sets loudness, and colour picks the instrument (sources at the end). The {SCAN_SCALE} scale has no two notes a
            semitone, a tritone or a major seventh apart, so any mix of the held notes sounds without a clash.
          </Field>
          <Field label="How we use it">
            <Table
              cols={[{ label: 'What the line crosses' }, { label: 'What you hear' }]}
              rows={[
                [`Height on the map (radar: distance from the centre), ${LINE_GRID.bands} bands`, <>Held note, low to high: <N>{BAND_NOTE_NAMES.join(' ')}</N></>],
                ['A peak along the path (stage 2.3)', 'One struck note, an octave above its band’s held note'],
                ['How much colour: the level', 'Loudness of the held note; how hard a chime is struck'],
                ['Red is the largest channel in half or more of the colour', 'Marimba; otherwise bells'],
                ['Where the line is, west to east', 'Left to right between the speakers'],
              ]}
            />
          </Field>
          <Field label="Check">
            <Tag t="Verified" /> in a recording of the map sweep: the left speaker is <N>{fmt(lineSweep?.firstSixth.leftMinusRightDb ?? NaN, 1)}</N> dB louder in the
            first sixth and <N>{fmt(-(lineSweep?.lastSixth.leftMinusRightDb ?? NaN), 1)}</N> dB quieter in the last. The warm/cool switch falls at{' '}
            <N>{fmt(100 * SCAN.bar.switches[0], 1)}%</N> of NASA’s colour bar: a rule about pixels, not degrees. <Tag t="Unverified" />: what that is in °C,
            since we read the bar’s labels by eye.
          </Field>
        </Entry>
      </Stage>

      <Stage n="2.5" name="Struck bars" tags={['Verified', 'Design choice']}
        plain="Each struck note is a few pure tones at the ratios a real vibrating bar makes, computed from the beam equation, not recorded.">
        <Entry>
          <Field label="Formula">
            <Formula
              tex={R`\begin{gathered}EI\,\frac{\partial^4 w}{\partial x^4}+\rho A\,\frac{\partial^2 w}{\partial t^2}=0,\qquad f_n\propto x_n^2\\[6pt] \cos x_n\cosh x_n=\begin{cases}+1&\text{free at both ends}\\-1&\text{clamped at one end}\end{cases}\end{gathered}`}
              words="the Euler–Bernoulli equation for a thin bar. Its tones are at frequencies proportional to the squares of the roots of one equation, which depends on how the bar is held."
            />
          </Field>
          <Field label="Why it holds">
            Separating time from space turns the equation into <M t={R`w''''=\beta^4 w`} />, solved by sines, cosines and their hyperbolic cousins. The
            two free ends (no bending, no shear) leave a solution only when <M t={R`\cos x\cosh x=1`} />; one clamped end gives{' '}
            <M t={R`-1`} />. This page solves both by bisection and compares the ratios with the ones the instruments play.
          </Field>
          <Field label="How we use it">
            Bells play the free bar, the music box and kalimba the clamped one. A marimba bar is carved underneath so its tones sit at about{' '}
            <N>{MARIMBA.partials.map((p) => p.ratio).join(' : ')}</N> (Stanford CCRMA, sources at the end). <Tag t="Design choice" />
          </Field>
          <Field label="Check">
            <Tag t="Verified" />: a unit test solves both equations again (<TestName name="instruments.test.ts" file="web/src/audio/instruments.test.ts" />).
          </Field>
        </Entry>
        <BarTonesChart />
        <FixedChoices />
      </Stage>
    </>
  );
}

/** The two grids, drawn: the map sweep's columns and bands, and the radar's wedges and rings (every 10th wedge). */
function ScanGridDiagram() {
  const W = 300, H = 150, cx = 420, cy = 75, r = 70;
  const bandY = (b: number) => (H * b) / LINE_GRID.bands;
  return (
    <figure className="how-diagram">
      <svg viewBox="-4 -4 510 168" role="img" aria-label={`The map sweep: ${LINE_GRID.columns} columns and ${LINE_GRID.bands} bands, read left to right. The radar: ${RADAR_GRID.columns} wedges and ${RADAR_GRID.bands} rings, turning anticlockwise from 3 o'clock.`}>
        <rect className="how-d-frame" x={0} y={0} width={W} height={H} />
        {Array.from({ length: LINE_GRID.bands - 1 }, (_, i) => (
          <line key={`b${i}`} className="how-d-thin" x1={0} x2={W} y1={bandY(i + 1)} y2={bandY(i + 1)} />
        ))}
        {Array.from({ length: LINE_GRID.columns / 10 - 1 }, (_, i) => (
          <line key={`c${i}`} className="how-d-thin" x1={(W * (i + 1) * 10) / LINE_GRID.columns} x2={(W * (i + 1) * 10) / LINE_GRID.columns} y1={0} y2={H} />
        ))}
        <line className="how-d-sweep" x1={W * 0.38} x2={W * 0.38} y1={-4} y2={H + 4} />
        <path className="how-d-arrow" d={`M${W * 0.38 + 6},${H / 2} l14,0 m-5,-5 l5,5 l-5,5`} />
        <circle className="how-d-frame" cx={cx} cy={cy} r={r} />
        {Array.from({ length: RADAR_GRID.bands - 1 }, (_, i) => (
          <circle key={`r${i}`} className="how-d-thin" cx={cx} cy={cy} r={(r * (i + 1)) / RADAR_GRID.bands} />
        ))}
        {Array.from({ length: RADAR_GRID.columns / 10 }, (_, i) => {
          const a = (2 * Math.PI * i * 10) / RADAR_GRID.columns;
          return <line key={`w${i}`} className="how-d-thin" x1={cx} y1={cy} x2={cx + r * Math.cos(a)} y2={cy - r * Math.sin(a)} />;
        })}
        <line className="how-d-sweep" x1={cx} y1={cy} x2={cx + r * Math.cos(0.9)} y2={cy - r * Math.sin(0.9)} />
      </svg>
      <figcaption>
        Left: the map sweep, every 10th of its {LINE_GRID.columns} columns drawn. Right: a region’s radar, every 10th of its {RADAR_GRID.columns} wedges. The
        dark line is where the scan is reading.
      </figcaption>
    </figure>
  );
}

function ChimesChart() {
  const scans = [
    { name: 'Whole picture (map sweep)', c: OCEAN_SCAN.line.colour },
    ...OCEAN_SCAN.regions.map((r, i) => ({ name: `Region ${String.fromCharCode(65 + i)}, ${r.name} (radar)`, c: r.radar })),
  ];
  const line = OCEAN_SCAN.line.colour;
  const stages = [
    { label: 'Peaks found', v: line.peaks },
    { label: `After the ${CHIME_RULE.minGap}-column spacing`, v: line.afterSpacing },
    { label: 'After one per column: played', v: line.chimes },
  ];
  return (
    <ChartFigure
      title="How many peaks become notes"
      takeaway={<>On one map sweep of the ocean still, <N>{line.peaks}</N> peaks become <N>{line.chimes}</N> struck notes: the rule leaves out <N>{fmt((100 * (line.peaks - line.chimes)) / line.peaks, 0)}%</N>.</>}
      source="NASA SVS 3912 still (data/preview.jpg), measured in the browser."
      numbers={{
        cols: [{ label: 'Scan' }, { label: 'Peaks', num: true }, { label: 'After spacing', num: true }, { label: 'Played', num: true }, { label: 'Marimba', num: true }, { label: 'Bells', num: true }],
        rows: scans.map((s) => [s.name, s.c.peaks, s.c.afterSpacing, s.c.chimes, s.c.warm, s.c.cool]),
      }}
      maxWidth={560}
    >
      {(w) => {
        const labelW = w < 480 ? 0 : 230;
        const rowH = w < 480 ? 44 : 30;
        const max = line.peaks;
        const barW = (v: number) => ((w - labelW - 60) * v) / max;
        return (
          <svg className="how-svg" width={w} height={stages.length * rowH} viewBox={`0 0 ${w} ${stages.length * rowH}`} role="img"
            aria-label={`Map sweep: ${stages.map((s) => `${s.label} ${s.v}`).join(', ')}.`}>
            {stages.map((s, i) => {
              const y = i * rowH;
              const barY = labelW ? y + 6 : y + 20;
              return (
                <g key={s.label}>
                  <text className="how-bar-label" x={0} y={labelW ? y + 19 : y + 14}>{s.label}</text>
                  <rect className="how-bar" x={labelW} y={barY} width={barW(s.v)} height={16} />
                  <text className="how-axis" x={labelW + barW(s.v) + 8} y={barY + 13}>{s.v}</text>
                </g>
              );
            })}
          </svg>
        );
      }}
    </ChartFigure>
  );
}

function BarTonesChart() {
  const free = barRoots(1, 4), clamped = barRoots(-1, 3);
  const ratios = (roots: number[]) => roots.map((x) => (x / roots[0]) ** 2);
  const rows = [
    { name: 'Bells (free bar)', computed: ratios(free), played: GLOCKENSPIEL.partials.map((p) => p.ratio) },
    { name: 'Music box, kalimba (clamped bar)', computed: ratios(clamped), played: MUSIC_BOX.partials.map((p) => p.ratio) },
    { name: 'Marimba (carved, tuned)', computed: null, played: MARIMBA.partials.map((p) => p.ratio) },
  ];
  const maxRatio = Math.max(...rows.flatMap((r) => r.played));
  return (
    <ChartFigure
      title="The tones of a struck bar"
      takeaway={<>The ratios the bells and music box play are the roots of <M t={R`\cos x\cosh x=\pm1`} />, squared; the page’s own solution matches them to four decimals.</>}
      source="Computed on this page; played ratios from web/src/audio/instruments.ts."
      legend={<><LegendItem kind="line">A tone the instrument plays</LegendItem><LegendItem kind="dot">Root of the beam equation, computed here</LegendItem></>}
      numbers={{
        cols: [{ label: 'Bar' }, { label: 'Tone', num: true }, { label: 'Root x', num: true }, { label: 'Ratio computed', num: true }, { label: 'Ratio played', num: true }],
        rows: rows.flatMap((r) =>
          r.played.map((p, i) => [
            r.name,
            String(i + 1),
            r.computed ? fmt((r === rows[0] ? free : clamped)[i], 5) : '–',
            r.computed ? fmt(r.computed[i], 4) : '–',
            fmt(p, 4),
          ]),
        ),
      }}
      maxWidth={640}
    >
      {(w) => {
        const rowH = 58;
        return (
          <Plot width={w} height={rows.length * rowH + 44} label={`Tone ratios on a log scale. Bells ${rows[0].played.map((v) => fmt(v, 2)).join(', ')}; music box ${rows[1].played.map((v) => fmt(v, 2)).join(', ')}; marimba ${rows[2].played.map((v) => fmt(v, 1)).join(', ')}.`}
            x={{ min: 0.8, max: Math.ceil(maxRatio * 1.15), ticks: [1, 2, 5, 10], log: true, label: 'frequency, times the lowest tone' }}
            y={{ min: 0, max: rows.length, ticks: [] }}>
            {(sx, sy) => (
              <>
                {rows.map((r, i) => {
                  const base = sy(rows.length - i - 1) - 6, top = base - 30;
                  return (
                    <g key={r.name}>
                      <line className="how-grid" x1={sx(0.8)} x2={sx(Math.ceil(maxRatio * 1.15))} y1={base} y2={base} />
                      <text className="how-bar-label" x={sx(0.8) + 4} y={top - 6}>{r.name}</text>
                      {r.played.map((p) => (
                        <line key={p} className="how-stem" x1={sx(p)} x2={sx(p)} y1={base} y2={top + 8} />
                      ))}
                      {r.computed?.map((p) => <circle key={p} className="how-dot" cx={sx(p)} cy={top + 8} r={4} />)}
                    </g>
                  );
                })}
              </>
            )}
          </Plot>
        );
      }}
    </ChartFigure>
  );
}

/** scanChoices.ts, the scan's fixed choices: rules (they change what a listener can learn) apart from decoration (no data). */
function FixedChoices() {
  const group = (kind: 'rule' | 'decoration') => SCAN_CHOICES.filter((c) => c.kind === kind);
  return (
    <div className="how-choices">
      <h5>Fixed by us</h5>
      <p>
        Every fixed choice in the scan, from <RepoLink path="web/src/audio/scanChoices.ts">scanChoices.ts</RepoLink> (the same list the app’s Explain
        shows). Rules change what a listener can learn; decoration carries no data. The low note’s chord steps,{' '}
        {ROOT_PROGRESSION.join(', ')} ({ROOT_NOTES.map(noteName).join(', ')}, one every {ROOT_STEP_SECONDS} s), are decoration: the picture sets only how
        loud the low note is.
      </p>
      {(['rule', 'decoration'] as const).map((kind) => (
        <div key={kind}>
          <h6>{kind === 'rule' ? 'Rules: how the picture is read' : 'Decoration: carries no data'}</h6>
          <ul className="how-choice-list">
            {group(kind).map((c) => (
              <li key={c.id}>
                <b>{c.name}.</b> {c.what} <Tag t={c.tag} />
                <span className="how-choice-why">{c.why}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
