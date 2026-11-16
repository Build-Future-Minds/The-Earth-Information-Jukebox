// The four page links, as tabs in the top bar (a fixed bottom bar on phones). Real links (#listen …), so the back button and
// shared links work; the current one is marked for screen readers with aria-current="page".
import type { ComponentType } from 'react';
import { VIEWS, type View } from '../views';
import { CompareIcon, GameIcon, GlobeIcon, HowIcon, ListenIcon, PlayAlongIcon } from './icons';

const ICON: Record<View, ComponentType> = { listen: ListenIcon, compare: CompareIcon, how: HowIcon, play: PlayAlongIcon, globe: GlobeIcon };

export function PageLinks({ current }: { current: View }) {
  return (
    <nav className="page-links" aria-label="Pages">
      <ul>
        {VIEWS.map((v) => {
          const Icon = ICON[v.key];
          return (
            <li key={v.key}>
              <a href={`#${v.key}`} aria-current={v.key === current ? 'page' : undefined}>
                <Icon />
                <span>{v.label}</span>
              </a>
            </li>
          );
        })}
        {/* The listening game is its own page (it has a way back), one click from anywhere. */}
        <li>
          <a href="tools/listening_game.html">
            <GameIcon />
            <span>Game</span>
          </a>
        </li>
      </ul>
    </nav>
  );
}
