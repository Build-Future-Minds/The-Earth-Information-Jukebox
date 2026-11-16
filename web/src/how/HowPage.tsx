// How it's made (docs/page_plan.md, P3): the methods, the formulas, the theorems they rest on, how
// we used each one, and how we checked it. Read mode inside the Tide Table world (DESIGN.md).
// Loaded on demand by views/HowView.tsx, so KaTeX and the charts never slow Listen down.
//
// Order: the honesty lines (each linked to its evidence), the two pipelines at a glance, where the
// picture comes from, pipeline 1 (the Earth rhythm), pipeline 2 (the picture scan), what the NASA
// picture shows, what the number cannot say, the applied-math moves, why no machine learning, how we
// check it, sources and credits.
import { useEffect, useState, type ReactNode } from 'react';
import { HONESTY_LINES } from '../data/honesty';
import type { Scene } from '../data/types';
import { useWidth } from './charts';
import {
  CHECKS,
  column,
  COUNTS,
  experiment,
  guessingTail,
  LISTENING_PASS,
  LISTENING_RESULTS,
  NASA,
  NASA_SCENES,
  numbers,
  OCEAN_SCAN,
  row,
  SCAN,
  SOUND,
  type SuiteCount,
} from './data';
import { EarthRhythm } from './EarthRhythm';
import { AlignmentMap, ChanceChart, RegionsOverTime } from './NasaCharts';
import { fmt, hashPlace, M, N, RepoLink, Table, Tag, type ClaimTag } from './parts';
import { PictureScan } from './PictureScan';
import './how.css';

// Each stage: number, name, and the method it rests on (shown on the route, so the first screen names the maths).
const P1 = [
  ['1.1', 'Picture and mask', 'erosion by the filters’ reach'],
  ['1.2', 'Brightness', 'max(R, G, B)'],
  ['1.3', 'Slope', 'regularised differentiation'],
  ['1.4', 'Structure tensor', 'spectral theorem'],
  ['1.5', 'Alignment', 'doubled-angle vote'],
  ['1.6', 'Enough to measure?', 'evidence before value'],
  ['1.7', 'The rule', 'a linear, invertible map'],
] as const;
const P2 = [
  ['2.1', 'The grid', 'midpoint sampling'],
  ['2.2', 'Colour strength', 'chroma'],
  ['2.3', 'Which cells chime', 'non-maximum suppression'],
  ['2.4', 'Pitch, loudness, instrument', 'position to pitch'],
  ['2.5', 'Struck bars', 'Euler–Bernoulli beam'],
] as const;
const slug = (n: string) => `s${n.replace('.', '-')}`;

type StageInfo = readonly [string, string, string];
const SECTIONS: { id: string; label: string; stages?: readonly StageInfo[] }[] = [
  { id: 'honest', label: 'What it is and is not' },
  { id: 'chain', label: 'Where the picture comes from' },
  { id: 'p1', label: '1 The Earth rhythm', stages: P1 },
  { id: 'p2', label: '2 The picture scan', stages: P2 },
  { id: 'nasa', label: 'What the NASA picture shows' },
  { id: 'drawing', label: 'What the number cannot say' },
  { id: 'moves', label: 'The applied-math moves' },
  { id: 'no-ml', label: 'Why no machine learning' },
  { id: 'checks', label: 'How we check it' },
  { id: 'sources', label: 'Sources and credits' },
];
const ALL_PLACES = SECTIONS.flatMap((s) => [s.id, ...(s.stages ?? []).map(([n]) => slug(n))]);

/** Which section or stage the reader is in: the last one whose top has passed under the top bar. */
function useCurrentPlace(): string {
  const [current, setCurrent] = useState(ALL_PLACES[0]);
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      let found = ALL_PLACES[0];
      // A place counts once its top is in the upper third of the screen (below the top bar, and on
      // phones below the sticky contents bar too).
      const line = Math.max(140, window.innerHeight * 0.33);
      for (const place of ALL_PLACES) {
        const el = document.getElementById(`how-${place}`);
        if (el && el.getBoundingClientRect().top <= line) found = place;
      }
      setCurrent(found);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);
  return current;
}

/** #how/<place>: scroll to it (a stage opens itself) and move focus there, so a screen reader follows. */
function useGoToPlace() {
  useEffect(() => {
    const go = () => {
      const place = hashPlace();
      if (!place) return;
      requestAnimationFrame(() => {
        const el = document.getElementById(`how-${place}`);
        if (!el) return;
        el.scrollIntoView({ block: 'start' });
        el.querySelector<HTMLElement>('h3, h4 button')?.focus({ preventScroll: true });
      });
    };
    go();
    window.addEventListener('hashchange', go);
    return () => window.removeEventListener('hashchange', go);
  }, []);
}

function Contents({ current }: { current: string }) {
  const inSection = (s: (typeof SECTIONS)[number]) => s.id === current || (s.stages ?? []).some(([n]) => slug(n) === current);
  return (
    <ol className="how-contents">
      {SECTIONS.map((s) => (
        <li key={s.id} className={inSection(s) ? 'current' : undefined}>
          <a href={`#how/${s.id}`} aria-current={s.id === current ? 'location' : undefined}>
            {s.label}
          </a>
          {s.stages && (
            <ol>
              {s.stages.map(([n, name]) => (
                <li key={n} className={slug(n) === current ? 'current' : undefined}>
                  <a href={`#how/${slug(n)}`} aria-current={slug(n) === current ? 'location' : undefined}>
                    <span className="how-n">{n}</span> {name}
                  </a>
                </li>
              ))}
            </ol>
          )}
        </li>
      ))}
    </ol>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="how-section" id={`how-${id}`} aria-labelledby={`how-${id}-h`}>
      <h3 id={`how-${id}-h`} tabIndex={-1}>
        {title}
      </h3>
      {children}
    </section>
  );
}

/** The name of the place the reader is in, for the phone's contents bar. */
function placeLabel(place: string): string {
  for (const s of SECTIONS) {
    if (s.id === place) return s.label;
    const stage = s.stages?.find(([n]) => slug(n) === place);
    if (stage) return `${stage[0]} ${stage[1]}`;
  }
  return '';
}

/** A pipeline at a glance: its stages as stops on a route, each a link that opens the stage. */
function Route({ stops, end }: { stops: readonly StageInfo[]; end: string }) {
  return (
    <ol className="how-route">
      {stops.map(([n, name, method]) => (
        <li key={n}>
          <a href={`#how/${slug(n)}`}>
            <span className="how-stop" aria-hidden="true" />
            <span className="how-n">{n}</span>
            <span className="how-route-name">{name}</span>
            <span className="how-route-method">{method}</span>
          </a>
        </li>
      ))}
      <li className="how-route-end">
        <span className="how-stop" aria-hidden="true" />
        <span className="how-route-name">{end}</span>
      </li>
    </ol>
  );
}

export default function HowPage() {
  const current = useCurrentPlace();
  useGoToPlace();
  return (
    <div className="how">
      <a className="how-skip" href="#how/honest">Skip the contents</a>
      <nav className="how-rail" aria-label="On this page">
        <p className="how-rail-h">On this page</p>
        <Contents current={current} />
      </nav>

      <article className="how-article">
        {/* The view's heading is App's "How it's made" (h2, read by screen readers); this is its visible face. */}
        <p className="how-title" aria-hidden="true">How it’s made</p>
        <p className="how-stand">
          Every sound here comes from formulas that are written down and tested, so the same picture always gives the same
          sound. This page shows each step from a NASA picture to a note: the formula, what it rests on, and how we checked it.
        </p>
        <details className="how-onpage">
          <summary>
            On this page<span className="how-onpage-here">{placeLabel(current) ? ` · ${placeLabel(current)}` : ''}</span>
          </summary>
          <nav aria-label="On this page, list">
            <Contents current={current} />
          </nav>
        </details>

        <Section id="honest" title="What it is and is not">
          <ol className="how-honest">
            {HONESTY_LINES.map((line) => (
              <li key={line.id} data-line={line.id}>
                <span>
                  <b>{line.text}</b>
                  <a href={line.href}>{line.evidence}</a>
                </span>
              </li>
            ))}
          </ol>
        </Section>

        <section className="how-section" aria-labelledby="how-routes-h">
          <h3 id="how-routes-h">Two pipelines, from picture to sound</h3>
          <p className="how-lede">Choose any step to open it. Each one gives a plain sentence, the formula, what it rests on, and how we checked it.</p>
          <div className="how-pipe">
            <p className="how-pipe-h"><span className="how-n">1</span> The Earth rhythm <span>· one number per circle sets where the second pulse lands</span></p>
            <Route stops={P1} end="two pulses a beat" />
          </div>
          <div className="how-pipe">
            <p className="how-pipe-h"><span className="how-n">2</span> The picture scan <span>· a line sweeps the picture and plays what it crosses</span></p>
            <Route stops={P2} end="held notes and chimes" />
          </div>
        </section>

        <Section id="chain" title="Where the picture comes from">
          <p className="how-lede">
            Between the Earth and the pixels we measure there is a chain of choices we do not control. The picture is a
            visualization of computer model output or satellite estimates, not a photo.
          </p>
          <ChainDiagram />
          <PictureTable />
        </Section>

        <Section id="p1" title="1 The Earth rhythm">
          <p className="how-lede">For one circle of one frame: from coloured pixels to one alignment number, then to where the second pulse lands. It plays on Compare and in the Game.</p>
          <EarthRhythm />
        </Section>

        <Section id="p2" title="2 The picture scan">
          <p className="how-lede">A second way to listen, after NASA’s own image sonifications: a line or a radar sweeps the picture and turns what it crosses into notes. It is not part of the rhythm rule.</p>
          <PictureScan />
        </Section>

        <Section id="nasa" title="What the NASA picture shows">
          <p className="how-lede">Measured on the ocean picture (NASA SVS 3912) with the same settings as above. Each chart shows one picture: numbers from different pictures are never compared.</p>
          <AlignmentMap />
          <RegionsOverTime />
          <Listening />
        </Section>

        <Section id="drawing" title="What the number cannot say">
          <p className="how-lede">
            Alignment describes lines in a drawing. In each case below the drawing changed and the number moved, while the Earth did
            not change at all.
          </p>
          <DrawingCases />
          <ChanceChart />
          <Limits />
        </Section>

        <Section id="moves" title="The applied-math moves">
          <Moves />
        </Section>

        <Section id="no-ml" title="Why no machine learning">
          <p>
            No learning model is used anywhere in Earth Sonata. Nothing is trained, there are no model weights and no training data.
            Every number comes from a formula on this page, run the same way every time: the same picture always gives the same
            numbers and the same sound (named case “{String(row(experiment('spec_cases'), 'Repeated: same image again').case)}”: {String(row(experiment('spec_cases'), 'Repeated: same image again').alignment)}, both times).
          </p>
          <p>
            We see this as a strength. Each formula makes a prediction we could test against a picture whose answer is known in closed
            form, and every sound can be traced back to the numbers that made it. AI tools helped write some of the code (listed in{' '}
            <RepoLink path="AI_USE.md">AI_USE.md</RepoLink>); none of them runs in the app.
          </p>
        </Section>

        <Section id="checks" title="How we check it">
          <Checks />
        </Section>

        <Section id="sources" title="Sources and credits">
          <Sources />
        </Section>
      </article>
    </div>
  );
}

// ---------- Where the picture comes from ----------

const CHAIN = [
  ['The Earth', ''],
  ['A computer model', 'or satellites'],
  ['NASA’s', 'colour map'],
  ['A map', 'projection'],
  ['Rendering', 'lines, labels'],
  ['A file', 'compression'],
  ['Our pixels', 'what we measure'],
];

function ChainDiagram() {
  const [ref, width] = useWidth<HTMLDivElement>();
  const across = width >= 620;
  const n = CHAIN.length;
  const w = Math.min(width, 760);
  // Across, the end stops sit half a label in from the edges, so "The Earth" and "Our pixels" are never cut.
  const inset = 58;
  const step = across ? (w - 2 * inset) / (n - 1) : 46;
  const h = across ? 96 : step * (n - 1) + 30;
  const at = (i: number): [number, number] => (across ? [inset + i * step, 18] : [14, 14 + i * step]);
  return (
    <figure className="how-diagram how-chain" ref={ref}>
      {width > 0 && (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img"
          aria-label={`The chain from the Earth to our pixels: ${CHAIN.map(([a, b]) => `${a} ${b}`.trim()).join(', then ')}. Only the last step is ours.`}>
          {CHAIN.slice(0, -1).map((_, i) => {
            const [x1, y1] = at(i), [x2, y2] = at(i + 1);
            return <line key={i} className="how-chain-link" x1={x1} y1={y1} x2={x2} y2={y2} />;
          })}
          {CHAIN.map(([a, b], i) => {
            const [x, y] = at(i);
            const ours = i === n - 1;
            return (
              <g key={a}>
                <rect className={ours ? 'how-chain-stop ours' : 'how-chain-stop'} x={x - 6} y={y - 6} width={12} height={12} />
                <text className="how-chain-label" x={across ? x : x + 20} y={across ? y + 28 : y + 5} textAnchor={across ? 'middle' : 'start'}>
                  {a}
                  {across ? (
                    <tspan className="how-chain-sub" x={x} dy={17}>{b}</tspan>
                  ) : (
                    b && <tspan className="how-chain-sub"> {b}</tspan>
                  )}
                </text>
              </g>
            );
          })}
        </svg>
      )}
      <figcaption>Only the last step is ours. Line length, colour and the map’s stretch are all choices made before it (stage 1.2, and “What the number cannot say”).</figcaption>
    </figure>
  );
}

const KIND: Record<Scene['source']['data_kind'], string> = {
  model_output: 'Computer model output',
  observation: 'Satellite estimates',
  artistic_rendering: 'An artist’s rendering',
  synthetic_test_input: 'Test input',
};

function PictureTable() {
  return (
    <Table
      cols={[{ label: 'NASA picture' }, { label: 'What it is' }, { label: 'Made with' }]}
      rows={NASA_SCENES.map((s) => [
        <a href={s.source.url}>{s.source.title}{s.source.svs_id ? ` (SVS ${s.source.svs_id})` : ''}</a>,
        KIND[s.source.data_kind],
        s.source.model_or_instrument && s.source.model_or_instrument !== 'none' ? s.source.model_or_instrument : '',
      ])}
    />
  );
}

// ---------- What the NASA picture shows: the listening test ----------

function Listening() {
  const tail = guessingTail(LISTENING_PASS.questions, LISTENING_PASS.correct);
  return (
    <div className="how-listen" id="how-listening">
      <h4>Can people hear the difference?</h4>
      {LISTENING_RESULTS === null && (
        <p>
          <b>Not run yet.</b> <Tag t="Unverified" /> No listener has taken the test, so we make no claim that the two regions can be told
          apart by ear.
        </p>
      )}
      <p>
        The pass mark was set before anyone listened (<RepoLink path="docs/ACCESSIBILITY_LOG.md">ACCESSIBILITY_LOG.md</RepoLink>): each listener answers{' '}
        <N>{LISTENING_PASS.questions}</N> questions, and <N>{LISTENING_PASS.correct}</N> or more right counts as hearing the difference. By guessing alone
        that happens in <N>{tail.ways}</N> of <N>{tail.of}</N> tries, <N>{fmt(100 * tail.p, 1)}%</N> (the binomial tail, chance ½ per question). Results
        will be shown here against 50% chance once they are in the log.
      </p>
    </div>
  );
}

// ---------- What the number cannot say ----------

function DrawingCases() {
  const south = NASA.regions.southern_ocean_streaks, equator = NASA.regions.equator_pacific;
  const dash = experiment('dash_length');
  const len = numbers(column(dash, 'dash_length_px')), dashScore = numbers(column(dash, 'observed_mean'));
  const crop = experiment('crop');
  const cropBox = numbers(column(crop, 'box_px')), cropRandom = numbers(column(crop, 'random mean'));
  const colour = numbers(column(experiment('colour'), 'value mode')).slice(0, 5);
  const big = cropBox.indexOf(Math.max(...cropBox)), small = cropBox.indexOf(Math.min(...cropBox));
  const rows: [string, ReactNode, ReactNode, ClaimTag, string][] = [
    [
      'Map projection',
      <>A circle at <N>{fmt(Math.abs(south.lonlat[1]), 0)}°{south.lonlat[1] < 0 ? 'S' : 'N'}</N> on the NASA map scores <N>{fmt(south.mean, 2)}</N> as drawn and about{' '}
        <N>{fmt(south.unstretched_mean, 2)}</N> with the map’s east–west stretch undone. A circle on the equator stays at <N>{fmt(equator.mean, 2)}</N>.</>,
      'A rough estimate: it treats latitude as constant across the circle.',
      'Unverified',
      'NASA SVS 3912, 30 frames',
    ],
    [
      'Dash length',
      <>Perfectly parallel dashes score <N>{fmt(dashScore[0], 2)}</N> at <N>{len[0]}</N> px and <N>{fmt(dashScore[dashScore.length - 1], 2)}</N> as long lines (<N>{len[len.length - 1]}</N> px).</>,
      'Each dash end is an edge across the line.',
      'Verified',
      'Test pictures',
    ],
    [
      'Box size',
      <>Dashes at random angles score <N>{fmt(cropRandom[big], 2)}</N> in a <N>{cropBox[big]}</N> px box and <N>{fmt(cropRandom[small], 2)}</N> in a <N>{cropBox[small]}</N> px box.</>,
      'Fewer dashes, bigger chance vote (chart below).',
      'Verified',
      'Test pictures',
    ],
    [
      'Line colour',
      <>The same drawing in white, yellow, green, red and blue scores <N>{fmt(Math.min(...colour), 4)}</N>{Math.min(...colour) === Math.max(...colour) ? ' every time' : ` to ${fmt(Math.max(...colour), 4)}`}.</>,
      'Brightness is max(R, G, B) (stage 1.2), so the colour (temperature) does not count.',
      'Verified',
      'Test pictures',
    ],
  ];
  return (
    <div className="how-cases">
      <Table
        cols={[{ label: 'What changed in the drawing' }, { label: 'What the number did' }, { label: 'Why' }, { label: 'Tag' }]}
        rows={rows.map(([what, did, why, tag, where]) => [
          <>{what}<span className="how-where">{where}</span></>,
          did,
          why,
          <Tag t={tag} />,
        ])}
      />
    </div>
  );
}

function Limits() {
  const two = experiment('two_families');
  const at90 = row(two, 90).observed as number;
  const legend = experiment('legend').rows[0];
  const contrast = experiment('contrast');
  const cDash = numbers(column(contrast, 'dashes, 20 deg spread'));
  const cFactor = numbers(column(contrast, 'contrast_factor'));
  const lastOk = cDash.reduce((k, v, i) => (Number.isNaN(v) ? k : i), 0);
  const rot = numbers(column(experiment('rotation'), 'dashes, 20 deg spread'));
  const smear = experiment('motion_blur');
  const smearPx = numbers(column(smear, 'smear_px'));
  // The smallest smear, and the largest one that is still below 0.7, as in math_notes.md limitation 8.
  const smearSmall = Math.min(...smearPx);
  const smearBig = Math.max(...smearPx.filter((px) => (row(smear, px).alignment as number) < 0.7));
  const zoom = numbers(column(experiment('zoom'), 'dashes, random'));
  const flatNoise = row(experiment('noise'), 40)['no lines (flat grey)'] as number;
  const weight = numbers(column(experiment('weighting'), 'difference'));
  const kuroshio = OCEAN_SCAN.regions.find((r) => r.id === 'kuroshio_eddies') as unknown as { groundRatio?: number } | undefined;
  const items: [string, ReactNode][] = [
    ['It is one number for the whole circle.', <>Two tidy families of lines at 90° score <N>{fmt(at90, 3)}</N>, like chaos, and a closed swirl scores low too. Low alignment is not disorder or turbulence.</>],
    ['Any edge votes.', <>A colour bar drawn into a test picture moved its score from <N>{fmt(legend[1] as number, 2)}</N> to <N>{fmt(legend[2] as number, 2)}</N> until it was masked (stage 1.1).</>],
    ['Dash ends vote sideways.', 'Short parallel dashes cannot reach 1 (above), so real frames top out below 1.'],
    ['Small boxes inflate the score.', 'Regions must be large and the same size (chart above). On the NASA picture the Kuroshio score also changes with the circle’s radius, so the radius is fixed.'],
    ['Dim lines near the threshold score higher.', <>Dimming a test picture moved its score from <N>{fmt(cDash[0], 2)}</N> to <N>{fmt(cDash[lastOk], 2)}</N> at <N>{fmt(100 * cFactor[lastOk], 0)}%</N> contrast, before it went missing.</>],
    ['The pixel grid matters a little.', <>Turning the same dashes changes their score by up to <N>{fmt((Math.max(...rot) - Math.min(...rot)) / 2, 2)}</N> either way, lowest near 45°.</>],
    ['The map squeezes directions at high latitude.', 'East–west distances are stretched by 1/cos(latitude), so lines lean toward horizontal (first case above).'],
    ['Camera smear and zoom change the score.', <>A <N>{smearBig}</N> px smear raises random dashes from <N>{fmt(row(smear, smearSmall).alignment as number, 2)}</N> to <N>{fmt(row(smear, smearBig).alignment as number, 2)}</N>; zoom moves them between <N>{fmt(Math.min(...zoom), 2)}</N> and <N>{fmt(Math.max(...zoom), 2)}</N>. The NASA frames have a fixed camera.</>],
    ['Strong noise passes for lines pointing every way.', <>Noise of σ 40 on a blank picture reads <N>{fmt(flatNoise, 2)}</N>, a low score, not missing.</>],
    ['Bright lines count more.', <>The weight is <M t="m^2" />; weighting by <M t="m" /> instead moves test scores by at most <N>{fmt(Math.max(...weight.map(Math.abs)), 2)}</N> and keeps their order.</>],
    ['A circle on the flat map is not round on the Earth.', <>The Kuroshio circle is <N>{fmt(kuroshio?.groundRatio ?? NaN, 3)}</N> times as wide east–west as it is tall on the ground. Version one keeps flat circles. <Tag t="Design choice" /></>],
  ];
  return (
    <div className="how-limits">
      <h4>All the limits we found</h4>
      <ol>
        {items.map(([head, body]) => (
          <li key={head}>
            <b>{head}</b> {body}
          </li>
        ))}
      </ol>
      <p className="how-src">
        Evidence: <RepoLink path="docs/science_review.md">science_review.md</RepoLink> sections 3, 4 and 6 (test pictures) and 9 (NASA frames); derivations in{' '}
        <RepoLink path="docs/math_notes.md">math_notes.md</RepoLink> section 5.
      </p>
    </div>
  );
}

// ---------- The applied-math moves ----------

function Moves() {
  const at = (n: string) => <a href={`#how/${slug(n)}`}>{n}</a>;
  const rows: [string, ReactNode, ReactNode][] = [
    ['Regularised differentiation', 'Blur a little before taking a slope, because a slope amplifies noise.', <>{at('1.3')}</>],
    ['Invariance by design', 'Square the slope and double the angle, so a line’s two sides, a reversed picture or a dimmer one give the same answer.', <>{at('1.4')}, {at('1.5')}</>],
    ['Closed-form eigen-decomposition', 'A 2 × 2 symmetric matrix has its eigenvalues in one line, so nothing is iterated.', <>{at('1.4')}</>],
    ['No evidence is not a low value', 'Measure the amount of evidence first; below the gate the answer is “missing”, never 0.', <>{at('1.6')}</>],
    ['Known-answer tests', <>Pictures made so the answer is known in closed form: <M t={String.raw`\lvert\cos\delta\rvert`} />, <M t={String.raw`\lvert 2f-1\rvert`} />, <M t={String.raw`k\,e^{-2s^2}`} />, chance and noise.</>, <>{at('1.5')}</>],
    ['Sensitivity analysis', 'Change one thing in the drawing at a time: dash length, box size, contrast, rotation, JPEG, projection, camera motion.', <a href="#how/drawing">What the number cannot say</a>],
    ['Fair comparison', 'Same settings, same moment, same circle size for both regions; never compare two pictures.', <>{at('1.7')}, <a href="#how/nasa">NASA results</a></>],
    ['A linear, invertible mapping', 'A straight-line rule, so the number can be read back from the sound.', <>{at('1.7')}</>],
    ['Deterministic and reproducible', 'No randomness in the measurement, no training: the same picture gives the same numbers and sound.', <a href="#how/no-ml">Why no machine learning</a>],
  ];
  return <Table cols={[{ label: 'Move' }, { label: 'What it means' }, { label: 'Where' }]} rows={rows} />;
}

// ---------- How we check it ----------

function Checks() {
  const suite = (name: string, s: SuiteCount | null, what: string) => [
    name,
    what,
    s ? `${s.passed} of ${s.total}` : '–',
    s
      ? [s.failed ? `${s.failed} failed` : 'none failed', s.skipped ? `${s.skipped} skipped` : ''].filter(Boolean).join(', ')
      : 'not counted in this run',
  ];
  const s = COUNTS.suites;
  return (
    <>
      <p>
        Three kinds of check, each with its tag in the stages above: tests that run on every change, measurements of the real
        pictures and the running app, and the listening test.
      </p>
      <Table
        caption={<>Test suites, counted from a real run on {COUNTS.date} (commit <span className="how-test">{COUNTS.commit}</span>{COUNTS.uncommitted_changes ? ', with uncommitted changes' : ''}) by <RepoLink path="web/scripts/count-tests.mjs">count-tests.mjs</RepoLink></>}
        cols={[{ label: 'Suite' }, { label: 'What it checks' }, { label: 'Passed', num: true }, { label: 'Result' }]}
        rows={[
          suite('Math engine (pytest)', s.engine, 'The formulas, the named cases, the predictions, the exports'),
          suite('App (unit tests)', s.unit, 'The rule, the scan, the instruments, the data files, this page’s numbers'),
          suite('App in a browser', s.browser, 'The real app by keyboard: sound timing, Stop, this page’s formulas and charts'),
        ]}
      />
      <Table
        caption="Measurements, each written by the code that made it"
        cols={[{ label: 'File' }, { label: 'What was measured' }, { label: 'When' }]}
        rows={[
          [<RepoLink path="docs/measurements/math_checks.json">math_checks.json</RepoLink>, 'Every verification experiment on test pictures', CHECKS.run.date],
          [<RepoLink path="docs/measurements/nasa_regions.json">nasa_regions.json</RepoLink>, `${Object.keys(NASA.regions).length} circles on ${NASA.frames.length} NASA frames, and what the settings change`, NASA.date],
          [<RepoLink path="docs/measurements/scan_pictures.json">scan_pictures.json</RepoLink>, 'The picture scan on the NASA stills, in Chromium', SCAN.meta.date],
          [<RepoLink path="docs/measurements/scan_sound.json">scan_sound.json</RepoLink>, 'Recordings of the running app: loudness, left and right, silence after Stop', SOUND.meta.date],
        ]}
      />
      <p>
        The listening test: <a href="#how/listening">not run yet</a>.
      </p>
    </>
  );
}

// ---------- Sources and credits ----------

function Sources() {
  return (
    <>
      <h4>Mathematics</h4>
      <ul className="how-refs">
        <li>J. Bigün and G. Granlund, “Optimal orientation detection of linear symmetry”, ICCV 1987: the structure tensor and orientation.</li>
        <li>M. Kass and A. Witkin, “Analyzing oriented patterns”, Computer Vision, Graphics, and Image Processing, 1987: the doubled-angle vote.</li>
        <li>B. Jähne, <i>Digital Image Processing</i>, Springer: the structure tensor and the coherence measure.</li>
        <li><a href="https://ccrma.stanford.edu/CCRMA/Courses/150/percussion.html">Stanford CCRMA, Music 150: percussion instruments</a>: the bar modes, and the marimba’s tuning.</li>
      </ul>
      <h4>NASA image sonifications (the picture scan’s method)</h4>
      <ul className="how-refs">
        <li><a href="https://svs.gsfc.nasa.gov/14156">NASA SVS 14156, Sonification of NGC 1569</a>. Sonification: SYSTEM Sounds (M. Russo, A. Santaguida).</li>
        <li><a href="https://svs.gsfc.nasa.gov/13786">NASA SVS 13786, Data Sonification: Caldwell 73</a>. SYSTEM Sounds.</li>
        <li><a href="https://chandra.si.edu/sound/gcenter.html">Chandra X-ray Center, A Universe of Sound: Galactic Center</a>.</li>
      </ul>
      <h4>The pictures</h4>
      <ul className="how-refs">
        {NASA_SCENES.map((s) => (
          <li key={s.source.url}>
            <a href={s.source.url}>{s.source.title}</a>. {s.source.credit}.
          </li>
        ))}
      </ul>
      <p className="how-src">
        The team’s own notes: <RepoLink path="docs/math_notes.md">math_notes.md</RepoLink>, <RepoLink path="docs/science_review.md">science_review.md</RepoLink>,{' '}
        <RepoLink path="docs/mapping_spec.md">mapping_spec.md</RepoLink>. Measured ahead of time; all sound is made in your browser by our own code.
      </p>
    </>
  );
}
