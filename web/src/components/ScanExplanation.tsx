// "Why the scan sounds like this": for any moment of the scan, where on the picture it is, what was
// measured there, and how that became a pitch, a loudness and an instrument. Then the fixed choices
// behind the rule, each with its reason, its evidence and its tag.
//
// Everything here is written by audio/scanWhy.ts and audio/scanChoices.ts from the score the sound
// is made from, so it cannot disagree with what is heard. Two groups, kept apart in words:
//   "From the picture"  what the picture sets (and the rules we chose for reading it)
//   "Fixed by us"       choices the picture cannot change
// It is not a live region: nothing here is announced while the scan plays. It follows the line
// while the scan plays and holds still when it does not, so every column can be reached by keyboard.
// It speaks about the picture being played only, with that picture's own numbers.
import { useEffect, useMemo, useState } from 'react';
import type { ScanChoice } from '../audio/scanChoices';
import { explainBand, explainRoot, placeOf, whyBand, whyColumn, type BandWhy, type ChimeWhy, type WhyContext } from '../audio/scanWhy';
import type { Chime, ScanScore } from '../audio/scanScore';

interface Props {
  score: ScanScore;
  ctx: WhyContext;
  /** The fixed choices behind the scan of this picture (audio/scanChoices.ts, scanChoicesFor). */
  choices: ScanChoice[];
  /** The scan is playing: the explanation follows the line. */
  playing: boolean;
  /** Which column the line is on right now, from the audio clock. */
  getColumn: () => number;
  /** The note most recently struck in this sweep, with the instrument names it had when it sounded, or null. */
  lastStruck: { chime: Chime; names: WhyContext['names'] } | null;
}

const FOLLOW_MS = 250;

function chimeCell(c: ChimeWhy): string {
  if (c.status === 'struck') return `${c.instrument} ${c.name}`;
  if (c.status === 'left out') return c.reason === 'spacing' ? 'peak, left out: too close to a stronger one' : 'peak, left out: a stronger peak in this column';
  if (c.reason === 'no data') return 'none: no data';
  return c.reason === 'no colour' ? 'none: no colour' : c.reason === 'below level' ? 'none: below the peak level' : 'none: not a peak';
}

export function ScanExplanation({ score, ctx, choices, playing, getColumn, lastStruck }: Props) {
  const [open, setOpen] = useState(false);
  const [column, setColumn] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const { columns, bands } = score.grid;

  // Follow the line while it plays, a few times a second. Not while the fold-out is closed.
  useEffect(() => {
    if (!open || !playing) return;
    setColumn(getColumn());
    const id = window.setInterval(() => setColumn(getColumn()), FOLLOW_MS);
    return () => window.clearInterval(id);
  }, [open, playing, getColumn]);

  // A new score is a new picture or a new scan: start again at its first column.
  useEffect(() => {
    setColumn(0);
    setPick(null);
  }, [score]);

  const here = useMemo(() => whyColumn(score, column, ctx), [score, column, ctx]);
  // The band explained below the table: the one the listener picked, else the loudest struck one,
  // else the loudest held note, else the lowest band.
  const bandOf = (list: BandWhy[]) => {
    if (pick !== null && list[pick]) return list[pick];
    const struck = list.filter((b) => b.chime.status === 'struck').sort((a, b) => b.level - a.level)[0];
    return struck ?? [...list].sort((a, b) => b.level - a.level)[0] ?? list[0];
  };
  const chosen = bandOf(here.bands);
  const moment = placeOf(score, here.column, 0, ctx.geometry).across; // where along the sweep this column is

  const last = lastStruck ? whyBand(score, lastStruck.chime.column, lastStruck.chime.band, { ...ctx, names: lastStruck.names }) : null;
  const rules = choices.filter((c) => c.kind === 'rule');
  const decoration = choices.filter((c) => c.kind === 'decoration');

  return (
    <details className="scan-why" onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
      <summary>Why the scan sounds like this</summary>
      {open && (
        <div className="scan-why-body">
          <p className="muted">
            Pick any moment of the scan to see where in this picture it is, what was measured there, and how that became its
            pitch, loudness and instrument. These sentences are written from the same numbers the sound is made from, with this
            picture's own settings. Nothing here is announced while the scan plays.
          </p>

          <section aria-labelledby="why-picture">
            <h4 id="why-picture">From the picture</h4>

            <h5>Last struck note</h5>
            <p className="why-last">{last ? explainBand(last) : 'No note has been struck in this sweep yet.'}</p>

            <h5>Look at a column</h5>
            <div className="row why-controls">
              <button type="button" disabled={playing || column <= 0} onClick={() => setColumn((c) => Math.max(0, c - 1))}>
                Earlier column
              </button>
              <button type="button" disabled={playing || column >= columns - 1} onClick={() => setColumn((c) => Math.min(columns - 1, c + 1))}>
                Later column
              </button>
              <label className="range">
                <span className="range-row">
                  <span>Column</span>
                  <span className="readout">{here.column + 1} of {columns}</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={columns - 1}
                  step={1}
                  value={here.column}
                  disabled={playing}
                  onChange={(e) => setColumn(Number(e.target.value))}
                  aria-valuetext={`Column ${here.column + 1} of ${columns}, ${moment}`}
                />
              </label>
            </div>
            <p className="muted">
              {playing
                ? 'Following the line while the scan plays. Pause or stop it to look at another column.'
                : 'Choose a column with the slider or the two buttons. This does not move the scan or make a sound.'}
            </p>

            <div className="why-table" role="region" aria-label="Table of the bands in this column" tabIndex={0}>
              <table>
                <caption>
                  What the scan did in column {here.column + 1} of {columns}: {moment}, {here.seconds.toFixed(1)} s into the sweep at normal speed
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Band</th>
                    <th scope="col">Place</th>
                    <th scope="col">Read</th>
                    <th scope="col">Mean {score.measure === 'colour' ? 'colour strength' : 'brightness'}</th>
                    <th scope="col">Level</th>
                    <th scope="col">Held note</th>
                    <th scope="col">Struck note</th>
                  </tr>
                </thead>
                <tbody>
                  {[...here.bands].reverse().map((b) =>
                    b.reads === 0 ? (
                      // No data: nothing was read, so there is no mean and no level, and never a 0.
                      <tr key={b.band} className="nodata">
                        <th scope="row">{b.band + 1}</th>
                        <td>{b.along}</td>
                        <td className="num">0</td>
                        <td className="num">—</td>
                        <td className="num">no data</td>
                        <td>{b.held.name}, silent: no data</td>
                        <td>{chimeCell(b.chime)}</td>
                      </tr>
                    ) : (
                      <tr key={b.band}>
                        <th scope="row">{b.band + 1}</th>
                        <td>{b.along}</td>
                        <td className="num">{b.reads}</td>
                        <td className="num">{b.mean.toFixed(3)}</td>
                        <td className="num">{b.level.toFixed(2)}</td>
                        <td>{b.level > 0 ? `${b.held.name} at ${Math.round(100 * b.level)}%` : `${b.held.name}, silent`}</td>
                        <td>{chimeCell(b.chime)}</td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>

            <label className="why-pick">
              Explain band{' '}
              <select value={chosen.band} onChange={(e) => setPick(Number(e.target.value))}>
                {here.bands.map((b) => (
                  <option key={b.band} value={b.band}>
                    {b.band + 1}: {b.held.name}, {b.along}
                  </option>
                ))}
              </select>
            </label>
            <p className="why-band">{explainBand(chosen)}</p>

            <h5>Low note</h5>
            <p>{explainRoot(here.root, here.seconds, bands)}</p>
          </section>

          <section aria-labelledby="why-fixed">
            <h4 id="why-fixed">Fixed by us, for this picture</h4>
            <p className="muted">
              Choices the picture cannot change. Each says why it was made and what supports it, with this picture's own numbers,
              tagged the way the team tags every claim: <strong>Verified</strong>, <strong>Design choice</strong> or{' '}
              <strong>Unverified</strong>.
            </p>
            <ChoiceList heading="Rules for reading the picture" choices={rules} />
            <ChoiceList heading="Decoration: carries no data" choices={decoration} />
          </section>
        </div>
      )}
    </details>
  );
}

function ChoiceList({ heading, choices }: { heading: string; choices: ScanChoice[] }) {
  return (
    <>
      <h5>{heading}</h5>
      <ul className="why-choices">
        {choices.map((c) => (
          <li key={c.id}>
            <strong>{c.name}</strong> <span className="why-tag">[{c.tag}]</span>
            <br />
            {c.what}
            <br />
            <span className="muted">Why: {c.why}</span>
            <br />
            <span className="muted">Evidence: {c.evidence}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
