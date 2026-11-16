// Pipeline 1, the Earth rhythm: from a circle of the NASA picture to one alignment number, then to
// where the second pulse lands. Sources: docs/math_notes.md sections 2 to 8, docs/science_review.md,
// analysis/sonata_math/image_analysis.py and rhythm.py, web/src/audio/earthVoice.ts.
import { LONG_AT_A0, LONG_AT_A1, longFraction } from '../audio/earthVoice';
import { ChartFigure, curve, Dots, LegendItem, path, Plot } from './charts';
import {
  CHANCE,
  CHECKS,
  column,
  experiment,
  gameBaseNote,
  gameHold,
  gameNoteName,
  mean,
  NASA,
  numbers,
  OCEAN_FEATURES,
  OCEAN_REGIONS,
  reasonWords,
  regionSeries,
  row,
  SETTINGS,
  type Cell,
} from './data';
import { Entry, Field, fmt, Formula, M, N, RepoLink, Stage, Table, Tag, TestName } from './parts';

const R = String.raw;
const TESTS = 'analysis/tests/test_image_analysis.py';
const RHYTHM_TESTS = 'analysis/tests/test_rhythm_and_smoothing.py';

const cell = (c: Cell, digits = 4) => (c === null ? 'missing' : typeof c === 'number' ? fmt(c, digits) : c);
const TAU = SETTINGS.gradient_threshold;
const SIGMA = SETTINGS.blur_sigma;
const REACH = SETTINGS.support_radius_px;
const BLUR_R = SETTINGS.blur_radius_px;
const SOBEL_DIV = Math.round(1 / SETTINGS.sobel_scale);
const U_MIN = SETTINGS.min_usable_fraction;
const EPS_EXP = Math.round(Math.log10(SETTINGS.epsilon));
const SLOPE = LONG_AT_A0 - LONG_AT_A1;
const BEAT = CHECKS.settings.rhythm.beat_seconds;
const ALPHA = OCEAN_FEATURES.normalisation.smoothing_alpha;
const [LUMA_R, LUMA_G, LUMA_B] = SETTINGS.luma_rgb;
const pct = (v: number) => `${fmt(100 * v, 0)}%`;

/** Rows of the named cases (science_review.md section 1) whose case name starts with one of these. */
function namedCases(starts: string[]) {
  const e = experiment('spec_cases');
  return e.rows
    .filter((r) => starts.some((s) => String(r[0]).startsWith(s)))
    .map((r) => {
      const x = Object.fromEntries(e.columns.map((c, i) => [c, r[i]]));
      return [x.case, x.expected, cell(x.alignment), x.reason_code === '-' ? '' : reasonWords(String(x.reason_code)), x.agrees];
    });
}
const CASE_COLS = [{ label: 'Test picture' }, { label: 'Expected' }, { label: 'Alignment' }, { label: 'Reason' }, { label: 'As expected' }];

export function EarthRhythm() {
  return (
    <>
      <Stage n="1.1" name="Picture and mask" tags={['Verified']}
        plain="Only the circle is measured, and only pixels whose whole neighbourhood lies inside it, on water.">
        <Entry>
          <Field label="Formula">
            <Formula
              tex={R`\begin{gathered}V_0=\{\,p:\ q \in \text{circle} \cap \text{mask for every } q \text{ with } \lVert q-p\rVert_\infty\le r\,\}\\ r=\lceil 4\sigma\rceil+1=${REACH}\end{gathered}`}
              words={<>a pixel may vote only if every pixel within {REACH} of it, across or down, is inside the circle and allowed by the mask: {BLUR_R} pixels of blur plus 1 of the slope filter.</>}
            />
          </Field>
          <Field label="Why it holds">
            The slope at a pixel is built only from pixels at most <M t="r" /> away: the blur reaches <M t={R`\lceil 4\sigma\rceil=${BLUR_R}`} /> pixels
            (the Gaussian is cut at four standard deviations) and the slope filter one more (stage 1.3). When all of them are
            allowed, nothing the mask leaves out can reach the vote. In image-processing words, the mask is eroded by the
            reach of the filters.
          </Field>
          <Field label="How we use it">
            Each region’s mask is its circle minus land, written by Student A’s <RepoLink path="analysis/prepare_scene.py">prepare_scene.py</RepoLink>.
            Labels, the colour bar and the frame’s edge all lie outside the circles. A mask that is named but missing stops the run;
            it never falls back to “no mask”.
          </Field>
          <Field label="Check">
            <p><Tag t="Verified" /> on test pictures: replacing every excluded pixel with random values leaves the result the same, bit for bit
              (<TestName name="test_excluded_pixels_cannot_change_the_result" file={TESTS} />), and pixels nearer than {REACH} to the edge never vote
              (<TestName name="test_border_pixels_do_not_vote" file={TESTS} />).</p>
            <Table cols={CASE_COLS} rows={namedCases(['Masked'])} />
          </Field>
        </Entry>
      </Stage>

      <Stage n="1.2" name="Brightness" tags={['Design choice', 'Verified']}
        plain="Each pixel becomes one number, its largest colour channel, so a line counts the same whatever its colour.">
        <Entry>
          <Field label="Formula">
            <Formula
              tex={R`I=\max(R,G,B)\qquad\text{not}\qquad Y=${LUMA_R}R+${LUMA_G}G+${LUMA_B}B`}
              words={<>brightness is the largest of the red, green and blue values, 0 to 255. We do not use the usual weighted sum (luma), shown on the right.</>}
            />
          </Field>
          <Field label="Why it holds">
            Any pure colour at full strength has the same maximum, 255: white, yellow, red and blue lines are equally bright to the
            measure. Luma weighs blue by <N>{LUMA_B}</N> and yellow by <N>{fmt(LUMA_R + LUMA_G, 3)}</N>, so a pure blue line is
            about <N>{fmt((LUMA_R + LUMA_G) / LUMA_B, 1)}</N> times fainter than a yellow one. On the ocean picture line colour shows
            modelled temperature, so luma would make cold water look as if it had fewer lines.
          </Field>
          <Field label="How we use it">
            Every alignment number in the app. <Tag t="Design choice" />
          </Field>
          <Field label="Check">
            <p><Tag t="Verified" /> on test pictures: the same drawing in six colours (<TestName name="test_line_colour_does_not_change_the_score_in_value_mode" file={TESTS} />).
              On the NASA frames, luma makes the dim blue Southern Ocean circle {NASA.sensitivity['grayscale luma'].southern_ocean_streaks.ok === 0 ? 'missing in every frame' : 'change'}.</p>
            <ColourTable />
          </Field>
        </Entry>
      </Stage>

      <Stage n="1.3" name="Slope" tags={['Verified', 'Design choice']}
        plain="Blur lightly, then measure how fast brightness changes across and down at each pixel. The slope points across a line, never along it.">
        <Entry>
          <Field label="Formula">
            <Formula
              tex={R`\nabla I=\Big(\frac{\partial I}{\partial x},\ \frac{\partial I}{\partial y}\Big),\qquad \nabla I\cdot u = 0 \ \text{along a line}`}
              words="the gradient is the pair of slopes, across and down. Walking along a line, brightness does not change, so the gradient is at right angles to the line."
            />
            <Formula
              tex={R`\frac{I(x+1)-I(x-1)}{2}=\frac{\partial I}{\partial x}+\frac{1}{6}\frac{\partial^3 I}{\partial x^3}+\dots`}
              words="the difference of the two neighbours, halved, is the slope plus a small error, from the Taylor series. Pixels are samples one unit apart."
            />
            <Formula
              tex={R`S_x=\frac{1}{${SOBEL_DIV}}\begin{bmatrix}-1&0&1\\-2&0&2\\-1&0&1\end{bmatrix}=\frac{1}{4}\begin{bmatrix}1\\2\\1\end{bmatrix}\otimes\frac{1}{2}\begin{bmatrix}-1&0&1\end{bmatrix},\qquad S_y=S_x^{\mathsf T}`}
              words={<>the Sobel filter is that central difference, averaged over three rows with weights 1, 2, 1. Dividing by {SOBEL_DIV} makes the answer a true slope in grey levels per pixel.</>}
            />
          </Field>
          <Field label="Why it holds">
            Writing <M t={R`I(x\pm1)=I\pm I'+\tfrac12 I''\pm\tfrac16 I'''+\dots`} /> and subtracting cancels the even terms, so the error is of
            third order. Differentiating amplifies pixel noise (a derivative multiplies each frequency by itself), so we
            blur first with a Gaussian of <M t={R`\sigma=${SIGMA}`} /> pixel: <b>regularised differentiation</b>. The Sobel filter is
            separable, a smoothing in one direction times a difference in the other.
          </Field>
          <Field label="How we use it">
            Each pixel’s slope has a length <M t={R`m=\lVert\nabla I\rVert`} />, in grey levels per pixel. Only pixels with{' '}
            <M t={R`m\ge\tau=${TAU}`} /> vote: a clear edge, not a faint shimmer. <Tag t="Design choice" />
          </Field>
          <Field label="Check">
            <p><Tag t="Verified" /> on test pictures: a ramp that rises 3 grey levels per pixel reads exactly 3
              (<TestName name="test_sobel_returns_the_slope_in_grey_levels_per_pixel" file={TESTS} />). Without the blur, noise alone passes
              for lines; with it, noise alone is missing:</p>
            <BlurTable />
          </Field>
        </Entry>
      </Stage>

      <Stage n="1.4" name="Structure tensor" tags={['Verified']}
        plain="Add up every slope as a 2 × 2 matrix, so the two sides of a line count the same.">
        <Entry>
          <Field label="Formula">
            <Formula
              tex={R`J=\sum_{p\in V}\nabla I_p\,\nabla I_p^{\mathsf T}=\begin{bmatrix}J_{xx}&J_{xy}\\J_{xy}&J_{yy}\end{bmatrix},\qquad u^{\mathsf T}Ju=\sum_{p\in V}(\nabla I_p\cdot u)^2\ \ge 0`}
              words="add up, over the voting pixels, each slope times itself as a small matrix. Squeezed along any direction u, the matrix gives the total squared change of brightness along u, which is never negative."
            />
            <Formula
              tex={R`\lambda_{1,2}=\frac{J_{xx}+J_{yy}}{2}\pm\frac12\sqrt{(J_{xx}-J_{yy})^2+4J_{xy}^2},\qquad \theta=\tfrac12\operatorname{atan2}(2J_{xy},\,J_{xx}-J_{yy})`}
              words="the two eigenvalues: the most change (across the lines) and the least (along them). The angle θ is the direction of most change; the lines run at right angles to it."
            />
          </Field>
          <Field label="Why it holds">
            <ul className="how-props">
              <li><b>The two sides of a line agree.</b> A bright line’s two edges have opposite slopes, and{' '}
                <M t={R`(-\nabla I)(-\nabla I)^{\mathsf T}=\nabla I\,\nabla I^{\mathsf T}`} />. Adding the slopes themselves would cancel to zero.</li>
              <li><b>Real, ordered, not negative.</b> <M t="J" /> is symmetric and its quadratic form is a sum of squares, so it is positive
                semi-definite. By the spectral theorem its eigenvalues are real, <M t={R`\lambda_1\ge\lambda_2\ge 0`} />, with eigenvectors
                at right angles.</li>
              <li><b>A closed form.</b> A 2 × 2 matrix has its eigenvalues in one line (the quadratic formula on{' '}
                <M t={R`\det(J-\lambda I)=0`} />), so nothing is iterated or approximated.</li>
            </ul>
            <Table
              cols={[{ label: 'What is in the circle' }, { label: 'Eigenvalues' }]}
              rows={[
                ['Lines share one direction', <M t={R`\lambda_1\gg\lambda_2\approx 0`} />],
                ['Lines in many directions', <M t={R`\lambda_1\approx\lambda_2>0`} />],
                ['Nothing there', <M t={R`\lambda_1\approx\lambda_2\approx 0`} />],
              ]}
            />
          </Field>
          <Field label="How we use it">
            The engine keeps <M t={R`J_{xx},J_{yy},J_{xy}`} /> for every measurement and reports the lines’ direction (it means nothing when
            alignment is near 0).
          </Field>
          <Field label="Check">
            <Tag t="Verified" /> on test pictures: tensors of separate areas add up (<TestName name="test_structure_tensors_of_separate_areas_add_up" file={TESTS} />),
            and the direction follows the stated convention (<TestName name="test_dominant_line_angle_convention" file={TESTS} />).
          </Field>
        </Entry>
      </Stage>

      <Stage n="1.5" name="Alignment" tags={['Verified']}
        plain="How much the edges agree on one direction, from 0 (every which way) to 1 (all one way).">
        <Entry>
          <Field label="Formula">
            <Formula
              tex={R`\begin{aligned}C&=\frac{\lambda_1-\lambda_2}{\lambda_1+\lambda_2}\\[4pt]&=\frac{\sqrt{(J_{xx}-J_{yy})^2+4J_{xy}^2}}{J_{xx}+J_{yy}+\varepsilon}\\[4pt]&=\frac{\left|\sum m^2 e^{2i\varphi}\right|}{\sum m^2}\end{aligned}`}
              words={<>alignment is the gap between the two eigenvalues divided by their sum. It is also a vote: each edge pixel draws an arrow at twice its slope’s angle, <M t="m^2" /> long; add the arrows tip to tail, and divide the length of the total by the length of all the arrows.</>}
            />
          </Field>
          <Field label="Why it holds">
            <ul className="how-props">
              <li><b>Always between 0 and 1.</b> By Cauchy–Schwarz <M t={R`J_{xy}^2\le J_{xx}J_{yy}`} />, so <M t={R`\lambda_2\ge0`} /> and the gap is never
                larger than the sum.</li>
              <li><b>The same after rotating, reversing or dimming the picture.</b> Rotation keeps the eigenvalues; <M t={R`-\nabla I`} /> gives the
                same <M t={R`\nabla I\,\nabla I^{\mathsf T}`} />; scaling contrast by <M t="k" /> scales top and bottom by <M t="k^2" /> (the fixed
                threshold <M t={R`\tau`} /> breaks this near it: see “What the number cannot say”).</li>
              <li><b>The two sides of a line agree.</b> With <M t={R`\nabla I=m(\cos\varphi,\sin\varphi)`} />,{' '}
                <M t={R`g_x^2-g_y^2=m^2\cos2\varphi`} /> and <M t={R`2g_xg_y=m^2\sin2\varphi`} />. Doubling the angle sends <M t={R`\varphi`} /> and{' '}
                <M t={R`\varphi+\pi`} /> to the same arrow. In axial circular statistics, <M t="C" /> is the mean resultant length of the doubled
                angles.</li>
              <li><b>Chance never gives 0.</b> For <M t="n" /> lines at random angles the arrows make a two-dimensional random walk. By the central
                limit theorem its length is Rayleigh-distributed, with mean <M t={R`\sqrt{\pi n}/2`} />, so <M t={R`C\approx\sqrt\pi/(2\sqrt n)\approx${CHANCE}/\sqrt n`} />.</li>
            </ul>
          </Field>
          <Field label="How we use it">
            One alignment per circle per frame. Stage 1.7 turns it into the beat. <M t={R`\varepsilon=10^{${EPS_EXP}}`} /> only guards the
            division; a blank circle never reaches it (stage 1.6).
          </Field>
          <Field label="Check">
            <p><Tag t="Verified" /> on test pictures: both forms of <M t="C" /> agree (<TestName name="test_coherence_is_the_eigenvalue_contrast_of_the_structure_tensor" file={TESTS} />),
              and so does the vote, for weights <M t="m" /> and <M t="m^2" /> (<TestName name="test_coherence_is_a_doubled_angle_vote" file={TESTS} />).
              Five predictions, each measured on test pictures made to have a known answer:</p>
            <Predictions />
          </Field>
        </Entry>
        <TwoFamiliesChart />
        <ParityChart />
      </Stage>

      <Stage n="1.6" name="Enough to measure?" tags={['Verified']}
        plain="Too few edges is “missing”, never 0. Not enough evidence is a different statement from lines that disagree.">
        <Entry>
          <Field label="Formula">
            <Formula
              tex={R`u=\frac{\lvert\{\,p\in V_0:\ m_p\ge\tau\,\}\rvert}{\lvert\text{circle}\rvert},\qquad \text{result}=\begin{cases}\text{missing} & u<${U_MIN}\\ C & u\ge ${U_MIN}\end{cases}`}
              words={<>the usable fraction is the share of the circle’s pixels that vote. Below {pct(U_MIN)} the result is missing, with a reason; otherwise it is the alignment.</>}
            />
          </Field>
          <Field label="Why it holds">
            <M t="C" /> is a ratio, so it forgets how much evidence it was built from. A blank circle gives <M t="0/0" />; with{' '}
            <M t={R`\varepsilon`} /> that would read 0, which says “the lines disagree”, a false statement. So the amount of evidence is a
            second number, judged first. Land inside a circle counts in the denominator: it holds no evidence, so a circle that is mostly
            land goes missing instead of giving a confident score from a sliver of water.
          </Field>
          <Field label="How we use it">
            A missing step plays no pulses and the app says why. On the NASA frames the two approved circles have usable fractions
            of <N>{fmt(NASA.regions.kuroshio_eddies.usable_mean, 2)}</N> and <N>{fmt(NASA.regions.equator_pacific.usable_mean, 2)}</N>, about{' '}
            <N>{fmt(Math.min(NASA.regions.kuroshio_eddies.usable_mean, NASA.regions.equator_pacific.usable_mean) / U_MIN, 0)}</N> times the{' '}
            {pct(U_MIN)} needed, and no frame is missing.
          </Field>
          <Field label="Check">
            <p><Tag t="Verified" /> on test pictures (<TestName name="test_blank_image_is_missing_not_zero" file={TESTS} />,{' '}
              <TestName name="test_a_mostly_masked_circle_is_missing" file={TESTS} />):</p>
            <Table cols={CASE_COLS} rows={namedCases(['Blank', 'Masked: everything', 'Noise only'])} />
          </Field>
        </Entry>
      </Stage>

      <Stage n="1.7" name="The rule" tags={['Design choice', 'Verified']}
        plain="Alignment sets where the second pulse lands in each beat: more alignment, a more even pulse. This rule is a choice we made.">
        <Entry>
          <Field label="Formula">
            <Formula
              tex={R`L(A)=${LONG_AT_A0}-${SLOPE}\,A,\qquad d_\text{long}=T\,L,\quad d_\text{short}=T\,(1-L),\qquad A=${fmt(LONG_AT_A0 / SLOPE, 0)}-${fmt(1 / SLOPE, 0)}L`}
              words={<>each beat of length T has two identical pulses. The second lands at L of the way through the beat. The two gaps always add up to T, and the alignment can be read back from L.</>}
            />
          </Field>
          <Field label="Why it holds">
            <ul className="how-props">
              <li><b>Fixed tempo.</b> <M t={R`d_\text{long}+d_\text{short}=T`} /> for every <M t="A" />: two pulses a beat, and only the spacing inside
                the beat carries data.</li>
              <li><b>Never ambiguous.</b> <M t={R`L\in[${LONG_AT_A1},\,${LONG_AT_A0}]`} />: the second pulse is never before half-way and never closer
                than <M t={R`T/${fmt(1 / (1 - LONG_AT_A0), 0)}`} /> to the next beat, so the pulses cannot merge or swap.</li>
              <li><b>Invertible and linear.</b> The number can be read back from the sound. A change of 0.01 in alignment moves the second pulse
                by <N>{fmt(1000 * SLOPE * 0.01 * BEAT, 1)}</N> ms at a <N>{BEAT}</N> s beat.</li>
              <li><b>Swing.</b> In music <M t="L" /> is a swing ratio: <SwingRatios />.</li>
            </ul>
          </Field>
          <Field label="How we use it">
            One frame is one beat. <RepoLink path="analysis/features.py">features.py</RepoLink> smooths each region over time with{' '}
            <M t={R`s_k=\alpha a_k+(1-\alpha)s_{k-1}`} />, <M t={R`\alpha=${ALPHA}`} />, restarting after a missing frame, and writes the
            smoothed values to <RepoLink path="data/features.json">data/features.json</RepoLink>. The app plays those values as they are; it
            does not smooth again. Smoothing lags a trend by roughly <M t={R`1/\alpha`} /> frames (chart below).
          </Field>
          <Field label="Check">
            <Tag t="Design choice" /> for the rule itself. <Tag t="Verified" />: the two gaps always add up to one beat
            (<TestName name="test_the_two_gaps_always_add_up_to_one_beat" file={RHYTHM_TESTS} />), the rule equals the team’s first draft
            (<TestName name="test_rule_equals_the_first_draft_formula_d1_d2" file={RHYTHM_TESTS} />), and smoothing follows its formula
            (<TestName name="test_smoothing_follows_the_stated_formula" file={RHYTHM_TESTS} />). Whether people can hear the difference is not
            yet tested (“What the NASA picture shows”).
          </Field>
        </Entry>
        <div className="how-pair">
          <RuleChart />
          <GameRuleChart />
        </div>
        <SmoothingChart />
      </Stage>
    </>
  );
}

function ColourTable() {
  const e = experiment('colour');
  return (
    <Table
      cols={[{ label: 'Line colour' }, { label: 'Alignment, max(R,G,B)', num: true }, { label: 'Alignment, luma', num: true }]}
      rows={e.rows.map((r) => [r[0], cell(r[1]), cell(r[3])])}
    />
  );
}

function BlurTable() {
  const e = experiment('blur');
  return (
    <Table
      cols={[{ label: 'Blur σ, px', num: true }, { label: 'Dashes, 20° spread', num: true }, { label: 'Noise σ 20 alone', num: true }]}
      rows={e.rows.map((r) => [fmt(r[0] as number, 1), cell(r[1]), cell(r[4])])}
    />
  );
}

function SwingRatios() {
  const e = experiment('mapping');
  const ratio = column(e, 'long : short');
  const a = column(e, 'alignment');
  const at = (target: number) => {
    const i = a.findIndex((v) => Math.abs((v as number) - target) < 1e-3);
    return i < 0 ? null : (ratio[i] as number);
  };
  return (
    <>
      <N>{fmt(at(1), 0)}:1</N> (even) at <M t="A=1" />, <N>{fmt(at(1 / 3), 0)}:1</N> (triplet swing) at <M t="A=1/3" />, <N>{fmt(at(0), 0)}:1</N>{' '}
      (dotted) at <M t="A=0" />
    </>
  );
}

// ---------- 1.5: the predictions ----------

function predictionSummary() {
  const diff = (id: string, p: string, o: string) => {
    const e = experiment(id);
    const pr = numbers(column(e, p)), ob = numbers(column(e, o));
    return Math.max(...pr.map((v, i) => Math.abs(ob[i] - v)));
  };
  const spread = experiment('spread_law');
  const deg = numbers(column(spread, 'spread_deg'));
  const pred = numbers(column(spread, 'exp(-2s^2)'));
  const ratio = numbers(column(spread, 'observed / observed(0)'));
  const spreadUpTo = 30;
  const spreadDiff = Math.max(...deg.map((d, i) => (d <= spreadUpTo ? Math.abs(ratio[i] - pred[i]) : 0)));
  const floor = row(experiment('random_floor'), 30);
  return [
    ['Two equal line families, δ apart', <M t={R`\lvert\cos\delta\rvert`} />, `within ${fmt(diff('two_families', 'predicted', 'observed'), 3)}`],
    [<>Share <M t="f" /> of the edges one way, the rest at 90°</>, <M t={R`\lvert 2f-1\rvert`} />, `within ${fmt(diff('energy_share', 'predicted', 'observed'), 3)}`],
    [<>Angles spread normally by <M t="s" /> radians, relative to no spread</>, <M t={R`k\,e^{-2s^2}`} />, `within ${fmt(spreadDiff, 3)} up to ${spreadUpTo}°`],
    [<><M t="n" /> dashes at random angles</>, <M t={R`${CHANCE}/\sqrt n`} />, `${fmt(floor.observed_mean as number, 3)} vs ${fmt(floor['0.886/sqrt(n)'] as number, 3)}`],
    [<>Noise <M t={R`\sigma`} /> on smooth stripes</>, <M t={R`\frac{E}{E+2N\frac{12}{64}\sigma^2}`} />, `within ${fmt(diff('noise_formula', 'predicted', 'observed'), 3)}`],
  ];
}

function Predictions() {
  return (
    <Table
      className="how-preds"
      cols={[{ label: 'Test picture' }, { label: 'Predicted' }, { label: 'Measured' }]}
      rows={predictionSummary()}
    />
  );
}

function TwoFamiliesChart() {
  const e = experiment('two_families');
  const d = numbers(column(e, 'delta_deg')), p = numbers(column(e, 'predicted')), o = numbers(column(e, 'observed'));
  const worst = Math.max(...o.map((v, i) => Math.abs(v - p[i])));
  return (
    <ChartFigure
      title="Two families of lines, δ apart"
      takeaway={<>At every angle tried, the measured alignment sits within <N>{fmt(worst, 3)}</N> of <M t={R`\lvert\cos\delta\rvert`} />.</>}
      source="Test pictures, not NASA data."
      legend={<><LegendItem kind="faint">Predicted, <M t={R`\lvert\cos\delta\rvert`} /></LegendItem><LegendItem kind="dot">Measured</LegendItem></>}
      numbers={{
        cols: [{ label: 'δ', num: true }, { label: 'Predicted', num: true }, { label: 'Measured', num: true }, { label: 'Difference', num: true }],
        rows: d.map((v, i) => [`${v}°`, fmt(p[i], 4), fmt(o[i], 4), fmt(o[i] - p[i], 4)]),
      }}
    >
      {(w) => (
        <Plot width={w} height={w < 480 ? 230 : 250} label={`Measured alignment of two line families against the angle between them, with the prediction |cos δ|. All ${d.length} points lie on the curve.`}
          x={{ min: 0, max: 90, ticks: w < 480 ? [0, 30, 60, 90] : [0, 15, 30, 45, 60, 75, 90], format: (v) => `${v}°`, label: 'δ, the angle between the two families' }}
          y={{ min: 0, max: 1, ticks: [0, 0.5, 1], label: 'alignment' }}
          points={d.map((v, i) => ({ x: v, y: o[i], text: `δ = ${v}°: measured ${fmt(o[i], 4)}, predicted ${fmt(p[i], 4)}` }))}>
          {(sx, sy) => (
            <>
              <path className="how-line-faint" d={curve((x) => Math.abs(Math.cos((x * Math.PI) / 180)), 0, 90, sx, sy)} />
              <Dots pts={d.map((v, i) => ({ x: v, y: o[i] }))} sx={sx} sy={sy} />
            </>
          )}
        </Plot>
      )}
    </ChartFigure>
  );
}

function ParityChart() {
  const sets: [string, string, string, string, (r: Record<string, Cell>) => string][] = [
    ['two_families', 'predicted', 'observed', 'Two families', (r) => `δ = ${r.delta_deg}°`],
    ['energy_share', 'predicted', 'observed', 'Unequal mix', (r) => `f = ${fmt(r['f (voting area)'] as number, 2)}`],
    ['spread_law', 'exp(-2s^2)', 'observed / observed(0)', 'Spread angles', (r) => `s = ${r.spread_deg}°`],
    ['random_floor', '0.886/sqrt(n)', 'observed_mean', 'Random dashes', () => 'chance level'],
    ['noise_formula', 'predicted', 'observed', 'Noise', (r) => `σ = ${r.noise_sigma}`],
  ];
  const pts = sets.flatMap(([id, p, o, name, what]) => {
    const e = experiment(id);
    return e.rows.map((r) => {
      const rec = Object.fromEntries(e.columns.map((c, i) => [c, r[i]]));
      return { x: rec[p] as number, y: rec[o] as number, name, what: what(rec) };
    });
  });
  const worst = Math.max(...pts.filter((q) => q.name !== 'Spread angles' || q.x > 0.5).map((q) => Math.abs(q.y - q.x)));
  return (
    <ChartFigure
      title="All five predictions against the measurements"
      takeaway={<>Every point sits on the diagonal, where measured equals predicted; the largest gap away from wide spreads is <N>{fmt(worst, 3)}</N>.</>}
      source="Test pictures, not NASA data. Spread angles are plotted as the ratio to no spread."
      legend={<><LegendItem kind="faint">Measured = predicted</LegendItem><LegendItem kind="dot">One test picture (or the mean of several)</LegendItem></>}
      numbers={{
        cols: [{ label: 'Prediction' }, { label: 'Case' }, { label: 'Predicted', num: true }, { label: 'Measured', num: true }],
        rows: pts.map((q) => [q.name, q.what, fmt(q.x, 4), fmt(q.y, 4)]),
      }}
    >
      {(w) => {
        const size = Math.min(w, 420);
        return (
          <Plot width={size} height={size} label={`Measured against predicted alignment for ${pts.length} test pictures across five predictions. All lie on the diagonal.`}
            x={{ min: 0, max: 1, ticks: [0, 0.5, 1], label: 'predicted' }} y={{ min: 0, max: 1, ticks: [0, 0.5, 1], label: 'measured' }}
            points={pts.map((q) => ({ x: q.x, y: q.y, text: `${q.name}, ${q.what}: predicted ${fmt(q.x, 4)}, measured ${fmt(q.y, 4)}` }))}>
            {(sx, sy) => (
              <>
                <line className="how-line-faint" x1={sx(0)} y1={sy(0)} x2={sx(1)} y2={sy(1)} />
                <Dots pts={pts} sx={sx} sy={sy} r={4} />
              </>
            )}
          </Plot>
        );
      }}
    </ChartFigure>
  );
}

// ---------- 1.7: the two rules from one number, and smoothing ----------

function RuleChart() {
  const regions = OCEAN_REGIONS.map(({ region, letter, className }) => {
    const ok = regionSeries(region.id).flatMap((s) => (s.status === 'ok' ? [s.alignment] : []));
    return { letter, name: region.name, className, a: mean(ok) };
  });
  return (
    <ChartFigure
      id="how-rule-chart"
      title="The team’s rule"
      takeaway={<>A straight line from <N>{LONG_AT_A0}</N> (long–short) to <N>{LONG_AT_A1}</N> (even). <Tag t="Design choice" /></>}
      source="Regions: mean of the 30 frames the app plays, NASA SVS 3912 (data/features.json)."
      legend={<><LegendItem kind="line">L(A)</LegendItem>{regions.map((r) => <LegendItem key={r.letter} kind={r.className === 'how-region-a' ? 'region-a' : 'region-b'}>Region {r.letter}</LegendItem>)}</>}
      numbers={{
        cols: [{ label: 'Alignment' }, { label: 'Second pulse at', num: true }, { label: 'Long : short', num: true }],
        rows: [
          ...experiment('mapping').rows.map((r) => [fmt(r[0] as number, 2), fmt(r[1] as number, 3), `${fmt(r[5] as number, 2)} : 1`]),
          ...regions.map((r) => [`Region ${r.letter}, ${r.name} (${fmt(r.a, 3)})`, fmt(longFraction(r.a), 3), `${fmt(longFraction(r.a) / (1 - longFraction(r.a)), 2)} : 1`]),
        ],
      }}
      maxWidth={420}
    >
      {(w) => (
        <Plot width={w} height={240} label={`Where the second pulse lands, from ${LONG_AT_A0} at alignment 0 to ${LONG_AT_A1} at alignment 1. ${regions.map((r) => `Region ${r.letter} at ${fmt(r.a, 2)}`).join(', ')}.`}
          x={{ min: 0, max: 1, ticks: [0, 0.5, 1], label: 'alignment A' }} y={{ min: 0.45, max: 0.8, ticks: [LONG_AT_A1, (LONG_AT_A0 + LONG_AT_A1) / 2, LONG_AT_A0], label: 'second pulse, share of the beat' }}
          points={regions.map((r) => ({ x: r.a, y: longFraction(r.a), text: `Region ${r.letter}: alignment ${fmt(r.a, 3)}, second pulse at ${fmt(longFraction(r.a), 3)}` }))}>
          {(sx, sy) => (
            <>
              <path className="how-line" d={curve(longFraction, 0, 1, sx, sy, 2)} />
              {regions.map((r) => (
                <g key={r.letter} className={r.className}>
                  <circle className="how-region-dot" cx={sx(r.a)} cy={sy(longFraction(r.a))} r={7} />
                  <text className="how-region-label" x={sx(r.a)} y={sy(longFraction(r.a)) - 14} textAnchor="middle">{r.letter}</text>
                </g>
              ))}
            </>
          )}
        </Plot>
      )}
    </ChartFigure>
  );
}

function GameRuleChart() {
  const s = [0, 0.25, 0.5, 0.75, 1];
  const steps = Array.from({ length: 401 }, (_, i) => i / 400);
  const lo = gameBaseNote(0), hi = gameBaseNote(1);
  return (
    <ChartFigure
      id="how-game-rule-chart"
      title="The game’s rule, from the same number"
      takeaway={<>The listening game also turns alignment into pitch and note length: lined-up patches play higher and hold their notes. Student B’s choice. <Tag t="Design choice" /></>}
      source={<>The game stretches alignment across the picture’s measured range first (<RepoLink path="tools/listening_game.html">listening_game.html</RepoLink>).</>}
      legend={<LegendItem kind="line">Base note</LegendItem>}
      numbers={{
        cols: [{ label: 'Place in the range, s', num: true }, { label: 'Base note' }, { label: 'Notes held for, share of the gap', num: true }],
        rows: s.map((v) => {
          const [a, b] = gameHold(v);
          return [fmt(v, 2), gameNoteName(gameBaseNote(v)), a === b ? fmt(a, 2) : `${fmt(a, 2)} to ${fmt(b, 2)}`];
        }),
      }}
      maxWidth={420}
    >
      {(w) => (
        <Plot width={w} height={240} label={`The game's base note rises in steps from ${gameNoteName(lo)} to ${gameNoteName(hi)} as alignment rises within the picture's range.`}
          x={{ min: 0, max: 1, ticks: [0, 0.5, 1], label: 'place in the range, s' }}
          y={{ min: lo - 1, max: hi + 1, ticks: [lo, Math.round((lo + hi) / 2), hi], format: gameNoteName, label: 'base note' }}>
          {(sx, sy) => <path className="how-line" d={path(steps.map((v) => ({ x: v, y: gameBaseNote(v) })), sx, sy)} />}
        </Plot>
      )}
    </ChartFigure>
  );
}

function SmoothingChart() {
  const e = experiment('sequence');
  const rows = e.rows
    .map((r) => Object.fromEntries(e.columns.map((c, i) => [c, r[i]])))
    .filter((r) => r.region === 'drifting');
  const raw = rows.map((r) => ({ x: r.frame as number, y: r.alignment_raw as number | null }));
  const smooth = rows.map((r) => ({ x: r.frame as number, y: r.alignment as number | null }));
  const gaps = rows.filter((r) => r.status !== 'ok').map((r) => r.frame as number);
  const last = rows[rows.length - 1];
  const alpha = Number(/alpha = ([\d.]+)/.exec(e.title)?.[1]);
  return (
    <ChartFigure
      title="Smoothing calms the wobble but lags a trend"
      takeaway={<>On the last frame the smoothed value is <N>{fmt(last.alignment as number, 2)}</N> while the frame itself measures <N>{fmt(last.alignment_raw as number, 2)}</N>. After the blank frames it starts again; nothing is carried across the gap.</>}
      source={<>Test pictures, not NASA data: dashes that spread wider every frame, <M t={R`\alpha=${alpha}`} />.</>}
      legend={<><LegendItem kind="dot">Each frame, measured</LegendItem><LegendItem kind="line">Smoothed (what would play)</LegendItem><LegendItem kind="gap">Blank frames: missing</LegendItem></>}
      numbers={{
        cols: [{ label: 'Frame', num: true }, { label: 'Measured', num: true }, { label: 'Smoothed', num: true }],
        rows: rows.map((r) => [String(r.frame), cell(r.alignment_raw, 3), cell(r.alignment, 3)]),
      }}
    >
      {(w) => (
        <Plot width={w} height={230} label={`Alignment of a test region over ${rows.length} frames as its lines spread: measured each frame, and smoothed. Frames ${gaps.join(' and ')} are blank and missing.`}
          x={{ min: 0, max: rows.length - 1, ticks: [0, 5, 10, 15, 20, rows.length - 1].filter((v) => v < rows.length), label: 'frame' }}
          y={{ min: 0, max: 1, ticks: [0, 0.5, 1], label: 'alignment' }}
          points={rows.flatMap((r) => (r.alignment_raw === null ? [] : [{ x: r.frame as number, y: r.alignment_raw as number, text: `Frame ${r.frame}: measured ${fmt(r.alignment_raw as number, 3)}, smoothed ${fmt(r.alignment as number, 3)}` }]))}>
          {(sx, sy) => (
            <>
              {gaps.map((g) => (
                <rect key={g} className="how-gap" x={sx(g - 0.5)} y={sy(1)} width={sx(g + 0.5) - sx(g - 0.5)} height={sy(0) - sy(1)} />
              ))}
              <path className="how-line" d={path(smooth, sx, sy)} />
              <Dots pts={raw.filter((p): p is { x: number; y: number } => p.y !== null)} sx={sx} sy={sy} r={4} />
            </>
          )}
        </Plot>
      )}
    </ChartFigure>
  );
}
