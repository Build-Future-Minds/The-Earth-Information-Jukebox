// "What you hear now, and why" (Compare): the numbers behind the beat that is sounding, for both
// regions at the same moment, updated every beat while the Earth voice plays. Mirrored like the
// page plan's P2: Region A on the left, what the row means in the middle, Region B on the right, so
// the eye reads straight across. Below it, what is fixed (the note, the chord, the sound), which
// is the same for both regions and carries no data.
//
// Every number comes from the same `features.json` steps the sound is made from (the step the
// transport reports as sounding, and the other region's step at the same moment). The arithmetic
// is in nowNumbers.ts, with unit tests.
import { useRef, type CSSProperties, type ReactNode } from 'react';
import type { EarthSoundId } from '../audio/earthSound';
import type { PlayState } from '../audio/transport';
import type { TrackStep } from '../audio/earthVoice';
import { timeWord } from '../data/sources';
import type { Features, Region, Scene, Step } from '../data/types';
import { BeatPicture } from './BeatPicture';
import { shapeWord } from './compare';
import { EarthSoundChoice } from './EarthSoundChoice';
import { regionLabel, regionStyle, SPEED_LABEL, type RegionLook } from './ExploreControls';
import { chordNow, earthNoteName, frameOf, gapsMs, regionSteps, ruleWorked, shownAlignment, shownSplit, splitPercent } from './nowNumbers';
import { weightFor } from './NowPlaying';
import { describeSplit, stepAtSameMoment } from './RhythmExplanation';

interface Props {
  scene: Scene;
  features: Features;
  /** The region chosen (and playing, when something plays). */
  regionId: string;
  playState: PlayState;
  /** The step sounding now (from the transport), or null. */
  sounding: TrackStep | null;
  /** Beats since Play: the band's chord follows it. */
  beat: number | null;
  speed: number;
  earthSound: EarthSoundId;
  onEarthSound: (id: EarthSoundId) => void;
  look?: RegionLook;
}

/** What each Earth sound is, in words. */
const SOUND_WORDS: Record<EarthSoundId, string> = {
  band: 'soft piano and bell, over the band',
  piano: 'soft piano and bell, no band',
  plain: 'a short drum-like pulse',
};

export function NowMatrix(p: Props) {
  const { scene, features, look = {} } = p;
  // The moment shown: the step sounding now; while playing but between reports (just after a
  // region switch), the last one shown; when stopped, the chosen region's first frame.
  const last = useRef<Step | null>(null);
  const stopped = p.playState === 'stopped';
  let moment: Step;
  if (!stopped && p.sounding) moment = p.sounding.step;
  else if (!stopped && last.current) moment = last.current;
  else moment = regionSteps(features, p.regionId)[0];
  last.current = stopped ? null : moment;

  const regions = scene.regions.slice(0, 2);
  const stepFor = (r: Region) => (r.id === moment.region ? moment : stepAtSameMoment(features.steps, moment, r.id));
  const letter = (r: Region) => regionLabel(scene.regions, r.id, look.firstLetter).replace('Region ', '');
  const { n, of } = frameOf(features, moment);
  const when = moment.source_time ? `${timeWord({ scene })} ${moment.source_time}` : null;
  const band = p.earthSound === 'band';
  const chord = chordNow(p.beat ?? 0);
  const speedNote = p.speed === 1 ? '' : ` at ${SPEED_LABEL[p.speed] ?? `${p.speed}×`}`;

  // One mirrored row: A's cell, the row's name and meaning, B's cell. Cells name both headers, so
  // a screen reader hears "Region A, Alignment" for a cell left of its row's name too.
  const row = (key: string, name: string, meaning: string, cell: (step: Step | null, r: Region) => ReactNode) => (
    <tr key={key} role="row">
      {regions.map((r, i) => {
        const td = (
          <td key={r.id} role="cell" headers={`now-col-${r.id} now-row-${key}`} className={i === 0 ? 'side first' : 'side'}
            style={regionStyle(scene.regions, r.id, look) as CSSProperties} data-current={r.id === p.regionId || undefined}>
            {cell(stepFor(r), r)}
          </td>
        );
        if (i === 0) return [td, <th key="name" role="rowheader" id={`now-row-${key}`} scope="row" className="mid"><span className="now-name">{name}</span><span className="now-meaning">{meaning}</span></th>];
        return td;
      })}
    </tr>
  );

  const missing = <span className="now-missing">no data</span>;
  // The worked rule wraps as two whole pieces on narrow screens: "0.75 − 0.25 × 0.08" and "= 0.73".
  const calc = (text: string) => {
    const [sum, result] = text.split(" = ");
    return <><span>{sum}</span> <span>= {result}</span></>;
  };

  return (
    <section className="now" aria-labelledby="now-title">
      <div className="now-head">
        <h2 id="now-title">What you hear now, and why</h2>
        <p className="now-moment">
          <span className="mono">Frame {n} of {of}</span>
          {when && <><span className="now-sep" aria-hidden="true">·</span><span className="sr-only">, </span><span className="mono">{when}</span></>}
          {stopped && <><span className="now-sep" aria-hidden="true">·</span><span className="sr-only">, </span>Press Listen to follow the sound beat by beat</>}
        </p>
      </div>

      {/* Roles stay explicit: on phones the rows are laid out as a grid (styles.css), which can drop a table's roles. */}
      <table className="now-table" role="table" aria-labelledby="now-title">
        <thead role="rowgroup">
          <tr role="row">
            {regions.map((r, i) => {
              const th = (
                <th key={r.id} role="columnheader" id={`now-col-${r.id}`} scope="col" className={i === 0 ? 'side first' : 'side'} style={regionStyle(scene.regions, r.id, look) as CSSProperties}>
                  {i > 0 && <span className="region-badge" aria-hidden="true">{letter(r)}</span>}
                  <span className="now-region">{regionLabel(scene.regions, r.id, look.firstLetter)}<span className="now-region-name">{r.name}</span></span>
                  {i === 0 && <span className="region-badge" aria-hidden="true">{letter(r)}</span>}
                </th>
              );
              if (i === 0) return [th, <th key="group" role="columnheader" scope="col" className="mid group">From the picture<span>changes every beat</span></th>];
              return th;
            })}
          </tr>
        </thead>
        <tbody role="rowgroup">
          {row('alignment', 'Alignment', 'How lined up the visible lines are: 0 swirly, 1 lined up', (s) =>
            s?.status === 'ok' ? (
              <>
                <span className="now-value" style={{ fontWeight: weightFor(s.alignment) }}>{shownAlignment(s.alignment)}</span>
                <span className="now-word">{shapeWord(s.alignment)}</span>
              </>
            ) : missing,
          )}
          {row('rule', 'Second pulse', 'The rule: where in the beat the second pulse lands', (s) =>
            s?.status === 'ok' ? (
              <>
                <span className="now-calc">{calc(ruleWorked(s.alignment))}</span>
                <span className="now-word">at {splitPercent(s.alignment)}% of the beat</span>
              </>
            ) : <span className="now-word">No pulse: missing information, so the Earth voice is quiet</span>,
          )}
          {row('beat', 'One beat', `The long gap, then the short gap${speedNote}`, (s) => {
            if (s?.status !== 'ok') return missing;
            const [long, short] = gapsMs(s.alignment, features.step_seconds, p.speed);
            return (
              <>
                <BeatPicture alignment={s.alignment} />
                <span className="now-calc">{long} ms, then {short} ms</span>
                <span className="now-word">{describeSplit(shownSplit(s.alignment))}</span>
              </>
            );
          })}
        </tbody>
      </table>

      <div className="now-fixed" role="group" aria-labelledby="now-fixed-title">
        <h3 id="now-fixed-title">Fixed: the same for both regions, so it carries no data</h3>
        <div className="now-fixed-item">
          <span className="now-name">Note</span>
          <span className="now-fixed-value"><b>{earthNoteName()}</b> {SOUND_WORDS[p.earthSound]}</span>
          <span className="now-meaning">One note for every pulse of both regions, so pitch never carries data. It fits every chord the band plays.</span>
        </div>
        <div className="now-fixed-item">
          <span className="now-name">Chord now</span>
          {band ? (
            <span className="now-fixed-value"><b>{chord.name}</b> {chord.role}{stopped && ' (the band starts here)'}</span>
          ) : (
            <span className="now-fixed-value">No band with this Earth sound</span>
          )}
          <span className="now-meaning">C, Am7, F and Gsus4, two beats each. The band strikes only on the beat, never between the two pulses.</span>
        </div>
        <div className="now-fixed-item">
          <EarthSoundChoice className="now-sound" value={p.earthSound} onChange={p.onEarthSound} />
          <span className="now-meaning">The same setting as on Play along. Only the sound changes, never when a pulse falls.</span>
        </div>
      </div>
    </section>
  );
}
