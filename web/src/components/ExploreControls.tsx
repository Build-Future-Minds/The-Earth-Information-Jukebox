import type { CSSProperties } from 'react';
// Owner: Student B (v1 by Dev B — refine wording, order and labels; review together).
// Real <button>s and form controls only, so everything works with Tab / Enter / Space.
import type { Region } from '../data/types';
import type { PlayState } from '../audio/transport';

interface Props {
  regions: Region[];
  regionId: string;
  playState: PlayState;
  explaining: boolean;
  speed: number;
  volumeDb: number;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  onReplay: () => void;
  onRegion: (id: string) => void;
  onExplain: () => void;
  onSpeed: (speed: number) => void;
  onVolume: (db: number) => void;
}

export const SPEEDS = [0.5, 0.75, 1, 1.25];

/** A region's colour token: Region A violet, Region B rose (styles.css). */
export function regionColour(regions: Region[], id: string): string {
  const i = regions.findIndex((r) => r.id === id);
  return i === 0 ? 'var(--region-a)' : i === 1 ? 'var(--region-b)' : 'var(--ink)';
}

/** Sets the --region custom property that the region's marks and badge read. */
export function regionStyle(regions: Region[], id: string): CSSProperties {
  return { ['--region' as string]: regionColour(regions, id) } as CSSProperties;
}

export function regionLabel(regions: Region[], id: string): string {
  const i = regions.findIndex((r) => r.id === id);
  return `Region ${String.fromCharCode(65 + i)}`;
}

export function ExploreControls(p: Props) {
  const playing = p.playState === 'playing';
  return (
    <section className="controls" aria-label="Playback controls">
      <div className="row">
        {playing ? (
          <button type="button" onClick={p.onPause}>Pause</button>
        ) : (
          <button type="button" onClick={p.onStart} className="primary">
            {p.playState === 'paused' ? 'Resume' : 'Start'}
          </button>
        )}
        <button type="button" onClick={p.onStop}>Stop <kbd>Esc</kbd></button>
        <button type="button" onClick={p.onReplay}>Replay</button>
        <button type="button" onClick={p.onExplain} aria-expanded={p.explaining}>
          Explain this rhythm
        </button>
      </div>

      <fieldset className="row region-group">
        <legend>Region (arrow keys, or 1–{p.regions.length})</legend>
        {p.regions.map((r) => (
          <label key={r.id} className="region-choice">
            <input
              type="radio"
              name="region"
              value={r.id}
              checked={p.regionId === r.id}
              onChange={() => p.onRegion(r.id)}
            />
            <span className="region-badge" aria-hidden="true" style={regionStyle(p.regions, r.id)}>
              {String.fromCharCode(65 + p.regions.indexOf(r))}
            </span>
            {regionLabel(p.regions, r.id)}: {r.name}
            <kbd aria-hidden="true">{p.regions.indexOf(r) + 1}</kbd>
          </label>
        ))}
      </fieldset>

      <div className="row">
        <label>
          Speed{' '}
          <select value={p.speed} onChange={(e) => p.onSpeed(Number(e.target.value))}>
            {SPEEDS.map((s) => (
              <option key={s} value={s}>{s}×</option>
            ))}
          </select>
        </label>
        <label className="range">
          <span className="range-row">
            <span>Earth volume</span>
            <span className="readout" aria-hidden="true">{p.volumeDb} dB</span>
          </span>
          <input
            type="range"
            min={-36}
            max={0}
            step={1}
            value={p.volumeDb}
            onChange={(e) => p.onVolume(Number(e.target.value))}
            aria-valuetext={`${p.volumeDb} decibels`}
          />
        </label>
      </div>
    </section>
  );
}
