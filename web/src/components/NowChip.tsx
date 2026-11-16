// What is sounding, at a glance: the region's letter badge and one word. Visual only; the page's
// status line says the same in a sentence for screen readers.
import type { PlayState } from '../audio/transport';

const WORD: Record<PlayState, string> = { stopped: 'Ready', paused: 'Paused', playing: 'Playing' };

export function NowChip({ letter, playState }: { letter: string; playState: PlayState }) {
  return (
    <span className={`now-chip ${playState}`} aria-hidden="true">
      <b className="region-badge">{letter}</b>
      <span>{WORD[playState]}</span>
    </span>
  );
}
