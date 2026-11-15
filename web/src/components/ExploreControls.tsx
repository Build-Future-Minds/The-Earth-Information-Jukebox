import { useState, type CSSProperties } from 'react';
import { IconButton } from './IconButton';
import { ExplainIcon, PauseIcon, PlayIcon, ReplayIcon, SoundIcon, StopIcon } from './icons';
// Owner: Student B (v1 by Dev B — refine wording, order and labels; review together).
// Real <button>s and form controls only, so everything works with Tab / Enter / Space.
import { thumbCss } from '../data/selection';
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
  look?: RegionLook;
  /** The picture, for a round crop of each region in the region choice. */
  imageUrl?: string | null;
  frame?: { width: number; height: number };
}

export const SPEEDS = [0.5, 0.75, 1, 1.25];
/** Speed buttons say ½× ¾× 1× 1¼×, not decimals. */
export const SPEED_LABEL: Record<number, string> = { 0.5: '½×', 0.75: '¾×', 1: '1×', 1.25: '1¼×' };

/** Volume as a share of the slider, for screen readers; no decibel numbers on screen. */
export const volumeText = (db: number) => `${Math.round(((db + 36) / 36) * 100)}%`;

/** A region's colour token: Region A violet, Region B rose (styles.css). */
export function regionColour(regions: Region[], id: string): string {
  const i = regions.findIndex((r) => r.id === id);
  return i === 0 ? 'var(--region-a)' : i === 1 ? 'var(--region-b)' : 'var(--ink)';
}

/** How a picture's regions look: their first letter, and neutral (ink) instead of violet and rose. */
export interface RegionLook {
  firstLetter?: string;
  neutral?: boolean;
}

/** Sets the custom properties the region's marks and badge read. Neutral regions (DESIGN.md
 *  Off-Scale Rule: aerosols, rain) are ink inside a white outline, so they show on any picture. */
export function regionStyle(regions: Region[], id: string, look: RegionLook = {}): CSSProperties {
  if (look.neutral) return { ['--region' as string]: 'var(--ink)', ['--region-outline' as string]: 'var(--white)' } as CSSProperties;
  return { ['--region' as string]: regionColour(regions, id) } as CSSProperties;
}

/** "Region A". Letters start at the source's first letter (aerosols: C), so pictures never share one. */
export function regionLabel(regions: Region[], id: string, firstLetter = 'A'): string {
  const i = regions.findIndex((r) => r.id === id);
  return `Region ${String.fromCharCode(firstLetter.charCodeAt(0) + i)}`;
}

export function ExploreControls(p: Props) {
  const playing = p.playState === 'playing';
  const [soundOpen, setSoundOpen] = useState(false);
  return (
    <section className="controls" aria-label="Playback controls">
      <div className="row icon-row">
        {playing ? (
          <IconButton icon={PauseIcon} label="Pause" onClick={p.onPause} />
        ) : (
          <IconButton icon={PlayIcon} label="Play" onClick={p.onStart} primary />
        )}
        <IconButton icon={StopIcon} label="Stop" onClick={p.onStop} keyshortcuts="Escape" />
        <IconButton icon={ReplayIcon} label="Replay" onClick={p.onReplay} />
        <IconButton icon={ExplainIcon} label="Explain" onClick={p.onExplain} expanded={p.explaining} />
        <IconButton icon={SoundIcon} label="Sound" onClick={() => setSoundOpen((o) => !o)} expanded={soundOpen} controls="sound-settings" />
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
            {p.imageUrl && p.frame && (
              <span className="region-thumb" aria-hidden="true"
                style={{ backgroundImage: `url(${p.imageUrl})`, ...thumbCss(r, p.frame, 44), ...regionStyle(p.regions, r.id, p.look) }} />
            )}
            <span className="region-badge" aria-hidden="true" style={regionStyle(p.regions, r.id, p.look)}>
              {regionLabel(p.regions, r.id, p.look?.firstLetter).replace('Region ', '')}
            </span>
            {regionLabel(p.regions, r.id, p.look?.firstLetter)}: {r.name}
            <kbd aria-hidden="true">{p.regions.indexOf(r) + 1}</kbd>
          </label>
        ))}
      </fieldset>

      <div id="sound-settings" className="sound-settings" hidden={!soundOpen}>
        <div className="row" role="group" aria-label="Speed">
          {SPEEDS.map((v) => (
            <button key={v} type="button" className="speed" aria-pressed={p.speed === v} onClick={() => p.onSpeed(v)}>
              {SPEED_LABEL[v]}
            </button>
          ))}
        </div>
        <label className="range">
          <span className="range-row">
            <span>Volume</span>
          </span>
          <input
            type="range"
            min={-36}
            max={0}
            step={1}
            value={p.volumeDb}
            onChange={(e) => p.onVolume(Number(e.target.value))}
            aria-valuetext={volumeText(p.volumeDb)}
          />
        </label>
      </div>
    </section>
  );
}
