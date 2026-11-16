// "Why the scan sounds like this": for any moment of the scan, where on the picture it is, what was
// measured there, and how that became a pitch, a loudness and an instrument. Then the fixed choices
// behind the rule, each with its reason, its evidence and its tag.
//
// Everything here is written by audio/scanWhy.ts and audio/scanChoices.ts from the score the sound
// is made from, so it cannot disagree with what is heard. Two groups, kept apart in words:
//   "From the picture"  what the picture sets (and the rules we chose for reading it)
//   "Fixed by us"       choices the picture cannot change
// It is not a live region: nothing here is announced while the scan plays. While the scan plays it
// follows the line, until a place is chosen (with the slider, the buttons or a click on the picture);
// "Follow the line" brings it back. Every column can be reached by keyboard, playing or not.
//
// What it shows (open or not, which column, which band, following or not) is kept by the view that
// shows the scan (PictureScan, or the globe), so a click on the flat picture can choose a place here,
// and the picture can mark the place explained. The globe has no such click: a press on it turns it.
import { useEffect, useMemo } from 'react';
import { SCAN_CHOICES, type ScanChoice } from '../audio/scanChoices';
import { chimeSummary, chosenBand, explainBand, explainRoot, heldSummary, placeOf, whyBand, whyColumn, type WhyContext } from '../audio/scanWhy';
import type { Chime, ScanScore } from '../audio/scanScore';

/** What the fold-out shows. */
export interface WhyView {
  open: boolean;
  /** The column explained (0-based). */
  column: number;
  /** The band explained in full, if the listener chose one; else the fold-out chooses (chosenBand). */
  pick: number | null;
  /** While the scan plays, follow the line. Choosing a place turns this off. */
  follow: boolean;
}
export const WHY_START: WhyView = { open: false, column: 0, pick: null, follow: true };

interface Props {
  score: ScanScore;
  ctx: WhyContext;
  /** The scan is playing. */
  playing: boolean;
  /** Which column the line is on right now, from the audio clock. */
  getColumn: () => number;
  /** The note most recently struck in this sweep, with the instrument names it had when it sounded, or null. */
  lastStruck: { chime: Chime; names: WhyContext['names'] } | null;
  view: WhyView;
  onChange: (change: Partial<WhyView>) => void;
  /** id for the full sentence about the chosen band, so "Read why" under the picture can move focus to it. */
  bandSentenceId: string;
  /** A click on the picture chooses a place (the flat picture). False on the globe, where it does not. */
  pickOnPicture?: boolean;
}

const FOLLOW_MS = 250;

export function ScanExplanation({ score, ctx, playing, getColumn, lastStruck, view, onChange, bandSentenceId, pickOnPicture = true }: Props) {
  const { open, column, pick, follow } = view;
  const { columns, bands } = score.grid;
  const following = playing && follow;

  // Follow the line while it plays, a few times a second. Not while the fold-out is closed.
  useEffect(() => {
    if (!open || !following) return;
    onChange({ column: getColumn() });
    const id = window.setInterval(() => onChange({ column: getColumn() }), FOLLOW_MS);
    return () => window.clearInterval(id);
  }, [open, following, getColumn, onChange]);

  const here = useMemo(() => whyColumn(score, column, ctx), [score, column, ctx]);
  const chosen = chosenBand(here.bands, pick);
  const moment = placeOf(score, here.column, 0, ctx.geometry).across; // where along the sweep this column is
  // A column chosen with the slider or the buttons is a place chosen: stop following the line.
  const choose = (c: number) => onChange({ column: Math.min(columns - 1, Math.max(0, c)), follow: false });

  const last = lastStruck ? whyBand(score, lastStruck.chime.column, lastStruck.chime.band, { ...ctx, names: lastStruck.names }) : null;
  const rules = SCAN_CHOICES.filter((c) => c.kind === 'rule');
  const decoration = SCAN_CHOICES.filter((c) => c.kind === 'decoration');

  return (
    <details className="scan-why" open={open} onToggle={(e) => onChange({ open: (e.currentTarget as HTMLDetailsElement).open })}>
      <summary>Why the scan sounds like this</summary>
      {open && (
        <div className="scan-why-body">
          <p className="muted">
            Pick any moment of the scan to see where on the picture it is, what was measured there, and how that became its
            pitch, loudness and instrument. These sentences are written from the same numbers the sound is made from. Nothing
            here is announced while the scan plays.
          </p>

          <section aria-labelledby="why-picture">
            <h4 id="why-picture">From the picture</h4>

            <h5>Last struck note</h5>
            <p className="why-last">{last ? explainBand(last) : 'No note has been struck in this sweep yet.'}</p>

            <h5>Look at a column</h5>
            <div className="row why-controls">
              <button type="button" disabled={following || here.column <= 0} onClick={() => choose(here.column - 1)}>
                Earlier column
              </button>
              <button type="button" disabled={following || here.column >= columns - 1} onClick={() => choose(here.column + 1)}>
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
                  disabled={following}
                  onChange={(e) => choose(Number(e.target.value))}
                  aria-valuetext={`Column ${here.column + 1} of ${columns}, ${moment}`}
                />
              </label>
              <label className="why-follow">
                <input type="checkbox" checked={follow} onChange={(e) => onChange({ follow: e.target.checked })} />
                Follow the line while the scan plays
              </label>
            </div>
            <p className="muted">
              {following
                ? `Following the line while the scan plays. Untick “Follow the line”${pickOnPicture ? ', or click the picture,' : ''} to look at another place.`
                : playing
                  ? 'Showing the place you chose while the scan plays on. Tick “Follow the line” to follow it again. Choosing a place does not move the scan or make a sound.'
                  : `Choose a column with the slider or the two buttons${pickOnPicture ? ', or click the picture' : ''}. This does not move the scan or make a sound.`}
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
                  {[...here.bands].reverse().map((b) => (
                    <tr key={b.band}>
                      <th scope="row">{b.band + 1}</th>
                      <td>{b.along}</td>
                      <td className="num">{b.reads}</td>
                      <td className="num">{b.mean.toFixed(3)}</td>
                      <td className="num">{b.level.toFixed(2)}</td>
                      <td>{heldSummary(b)}</td>
                      <td>{chimeSummary(b.chime)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <label className="why-pick">
              Explain band{' '}
              <select value={chosen.band} onChange={(e) => onChange({ pick: Number(e.target.value) })}>
                {here.bands.map((b) => (
                  <option key={b.band} value={b.band}>
                    {b.band + 1}: {b.held.name}, {b.along}
                  </option>
                ))}
              </select>
            </label>
            <p className="why-band" id={bandSentenceId} tabIndex={-1}>{explainBand(chosen)}</p>

            <h5>Low note</h5>
            <p>{explainRoot(here.root, here.seconds, bands)}</p>
          </section>

          <section aria-labelledby="why-fixed">
            <h4 id="why-fixed">Fixed by us</h4>
            <p className="muted">
              Choices the picture cannot change. Each says why it was made and what supports it, tagged the way the team tags every
              claim: <strong>Verified</strong>, <strong>Design choice</strong> or <strong>Unverified</strong>.
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
