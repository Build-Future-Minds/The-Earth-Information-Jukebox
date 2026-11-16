// Listen, step 2: choose what to hear. "Whole picture" (the map sweep: a line crosses the picture)
// or one of the picture's regions by name (the radar: a line turns once around its circle), with the
// picture's own letters (A/B, C/D, E/F). A radio group: one Tab stop, arrow keys or 1, 2, 3 while
// it has focus (number keys elsewhere stay free for speech input: WCAG 2.1.4, docs/DECISIONS.md D8).
// Choosing never starts the sound; while it plays, the scan carries on with the new choice.
import type { KeyboardEvent } from 'react';
import { LINE_GRID, RADAR_GRID } from '../audio/scanScore';
import { thumbCss } from '../data/selection';
import { scanRegions, targetName, type ScanTarget, type Source } from '../data/sources';
import { regionStyle, type RegionLook } from './ExploreControls';

interface Props {
  picture: Source;
  value: ScanTarget;
  onChange: (target: ScanTarget) => void;
  look: RegionLook;
  /** The page's speed: the times on screen follow it. */
  speed: number;
}

/** "30 s", or "1 min" and more at slow speeds. */
const seconds = (s: number) => (s >= 60 ? `${Math.round(s / 6) / 10} min` : `${Math.round(s)} s`);

export function HearChoice({ picture, value, onChange, look, speed }: Props) {
  const regions = scanRegions(picture);
  const test = !picture.imageUrl;
  const across = !test && picture.scan?.worldMap ? 'west to east' : 'left to right';
  // The scan repeats until Stop: "each time", never "once".
  const lineWords = `A line sweeps it ${across}, ${seconds(LINE_GRID.seconds / speed)} each time`;
  const radarWords = `A radar line turns around the circle, ${seconds(RADAR_GRID.seconds / speed)} each turn`;
  const options: ScanTarget[] = ['map', ...regions.map((r) => r.id)];
  const chosen = value === 'map' ? null : regions.find((r) => r.id === value) ?? null;

  const onKeyDown = (e: KeyboardEvent<HTMLFieldSetElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const n = Number(e.key);
    if (!Number.isInteger(n) || n < 1 || n > options.length) return;
    e.preventDefault();
    onChange(options[n - 1]);
    // Move focus with the choice, as arrow keys do, so the next arrow press starts from here.
    e.currentTarget.querySelector<HTMLInputElement>(`input[value="${CSS.escape(options[n - 1])}"]`)?.focus();
  };

  return (
    <fieldset className="step step-hear" onKeyDown={onKeyDown}>
      <legend>
        <span className="step-mark" aria-hidden="true">2</span>
        <span className="sr-only">Step 2 of 3: </span>Choose what to hear
      </legend>
      <div className="step-rows hear-rows">
        <label className={value === 'map' ? 'hear-row on' : 'hear-row'}>
          <input type="radio" name="hear" value="map" checked={value === 'map'} onChange={() => onChange('map')} aria-label={`Whole picture: ${lineWords.toLowerCase()}`} />
          <span className="hear-icon" aria-hidden="true"><span className="sweep-icon" /></span>
          <span className="hear-name">
            <b>Whole picture</b>
            <small>{lineWords}</small>
          </span>
          <kbd aria-hidden="true">1</kbd>
        </label>
        {regions.map((r, i) => {
          const name = targetName(picture, r.id);
          const letter = test ? null : name.replace('Region ', '');
          const style = regionStyle(picture.scene.regions, r.id, look);
          return (
            <label key={r.id} className={value === r.id ? 'hear-row on' : 'hear-row'} style={style}>
              <input
                type="radio"
                name="hear"
                value={r.id}
                checked={value === r.id}
                onChange={() => onChange(r.id)}
                aria-label={test ? `${name}: ${radarWords.toLowerCase()}` : `${name}: ${r.name}. ${radarWords}`}
              />
              <span className="hear-icon" aria-hidden="true">
                {picture.imageUrl ? (
                  <span className="region-thumb" style={{ backgroundImage: `url(${picture.imageUrl})`, ...thumbCss(r, picture.scene.frames, 40) }} />
                ) : (
                  <span className="circle-icon" />
                )}
              </span>
              <span className="hear-name">
                <b>
                  {letter && <span className="region-badge" aria-hidden="true">{letter}</span>}
                  {name}
                  {!test && <span className="hear-full">: {r.name}</span>}
                </b>
                <small>{radarWords}</small>
              </span>
              <kbd aria-hidden="true">{i + 2}</kbd>
            </label>
          );
        })}
      </div>
      {/* Phones show the choices as three chips; the full name of the chosen one is spelled out
          here. Screen readers already hear it from the radio, so this line is hidden from them. */}
      <p className="hear-chosen" aria-hidden="true">
        <b>{chosen ? `${targetName(picture, chosen.id)}${test ? '' : `: ${chosen.name}`}.` : 'Whole picture.'}</b> {chosen ? radarWords : lineWords}.
      </p>
    </fieldset>
  );
}
