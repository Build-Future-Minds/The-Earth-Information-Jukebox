import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { IconButton } from './IconButton';
import { ExplainIcon, PauseIcon, PlayIcon, ReplayIcon, SoundIcon, StopIcon } from './icons';
// Owner: Student B (v1 by Dev B — refine wording, order and labels; review together).
// Real <button>s and form controls only, so everything works with Tab / Enter / Space.
import { thumbCss } from '../data/selection';
import type { Region } from '../data/types';
import type { PlayState } from '../audio/transport';


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

interface PlayerProps {
  playState: PlayState;
  explaining: boolean;
  speed: number;
  volumeDb: number;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  /** Without it there is no Replay button (Listen's scan: Stop then Play does the same). */
  onReplay?: () => void;
  onExplain: () => void;
  onSpeed: (speed: number) => void;
  onVolume: (db: number) => void;
  /** The timeline, shown inside the bar like a music player's progress line. */
  children?: ReactNode;
  /** Step number for Play on Listen; decoration, hidden from screen readers. */
  step?: number;
  /** The bar's name for screen readers. */
  label?: string;
  /** Extra classes: 'axis' lines the timeline up under the picture (Listen). */
  className?: string;
  /** Nothing to play yet: Play is disabled. */
  canPlay?: boolean;
  /** More settings under Speed and Volume (Listen: the scan's instruments). */
  settings?: ReactNode;
}

/** One framed bar under the picture: Play, Stop, Replay, the timeline, Explain and Sound. */
export function PlayerBar(p: PlayerProps) {
  const playing = p.playState === 'playing';
  const [soundOpen, setSoundOpen] = useState(false);
  // The settings open under the bar: bring them into view, which may be below the fold.
  const settingsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (soundOpen) settingsRef.current?.scrollIntoView({ block: 'nearest' });
  }, [soundOpen]);
  return (
    <section className={p.className ? `player ${p.className}` : 'player'} aria-label={p.label ?? 'Playback controls'}>
      <div className="player-row">
        <div className="player-buttons">
          {playing ? (
            <IconButton icon={PauseIcon} label="Pause" onClick={p.onPause} primary />
          ) : (
            <IconButton icon={PlayIcon} label="Play" onClick={p.onStart} primary step={p.step} disabled={p.canPlay === false} />
          )}
          <IconButton icon={StopIcon} label="Stop" onClick={p.onStop} keyshortcuts="Escape" hint="Esc" />
          {p.onReplay && <IconButton icon={ReplayIcon} label="Replay" onClick={p.onReplay} />}
        </div>
        <div className="player-track">{p.children}</div>
        <div className="player-buttons">
          <IconButton icon={ExplainIcon} label="Explain" onClick={p.onExplain} expanded={p.explaining} />
          <IconButton icon={SoundIcon} label="Sound" onClick={() => setSoundOpen((o) => !o)} expanded={soundOpen} controls="sound-settings" />
        </div>
      </div>
      <div id="sound-settings" className="sound-settings" hidden={!soundOpen} ref={settingsRef}>
        {p.settings}
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

interface RegionProps {
  regions: Region[];
  regionId: string;
  onRegion: (id: string) => void;
  look?: RegionLook;
  /** The picture, for a round crop of each region. */
  imageUrl?: string | null;
  frame?: { width: number; height: number };
  /** Step number on Listen (1 Picture · 2 Region · 3 Play); decoration, hidden from screen readers. */
  step?: number;
}

/** Which region to hear: a round crop of each circle, its letter and short name. Arrow keys or 1/2. */
export function RegionChoice(p: RegionProps) {
  return (
    <fieldset className="region-group">
      <legend>{p.step && <span className="step-mark" aria-hidden="true">{p.step}</span>}Region</legend>
      <div className="row">
        {p.regions.map((r) => (
          <label key={r.id} className="region-choice">
            <input type="radio" name="region" value={r.id} checked={p.regionId === r.id} onChange={() => p.onRegion(r.id)} />
            {p.imageUrl && p.frame && (
              <span className="region-thumb" aria-hidden="true"
                style={{ backgroundImage: `url(${p.imageUrl})`, ...thumbCss(r, p.frame, 44), ...regionStyle(p.regions, r.id, p.look) }} />
            )}
            <span className="region-badge" aria-hidden="true" style={regionStyle(p.regions, r.id, p.look)}>
              {regionLabel(p.regions, r.id, p.look?.firstLetter).replace('Region ', '')}
            </span>
            <span className="region-name">{regionLabel(p.regions, r.id, p.look?.firstLetter)}: {r.name}</span>
            <kbd aria-hidden="true">{p.regions.indexOf(r) + 1}</kbd>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
