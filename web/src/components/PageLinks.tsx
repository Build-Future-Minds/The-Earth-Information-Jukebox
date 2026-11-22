// The page links, as tabs in the top bar (a fixed bottom bar on phones and tablets). Real links (#home …), so the back
// button and shared links work; the current one is marked for screen readers with aria-current="page".
import type { ComponentType } from 'react';
import { GAME_HREF, VIEWS, type View } from '../views';
import { AiUseIcon, CompareIcon, GameIcon, GlobeIcon, HomeIcon, HowIcon, ListenIcon, PlayAlongIcon } from './icons';

const VIEW_ICON: Record<View, ComponentType> = {
  home: HomeIcon, listen: ListenIcon, compare: CompareIcon, how: HowIcon, play: PlayAlongIcon, globe: GlobeIcon, ai: AiUseIcon,
};

export function PageLinks({ current }: { current: View }) {
  return (
    <nav className="page-links" aria-label="Pages">
      <ul>
        {VIEWS.map((v) => {
          const Icon = VIEW_ICON[v.key];
          return (
            <li key={v.key}>
              <a href={`#${v.key}`} aria-current={v.key === current ? 'page' : undefined}>
                <Icon />
                <span>{v.label}</span>
              </a>
            </li>
          );
        })}
        {/* The listening game, one click from anywhere. */}
        <li>
          <a href={GAME_HREF}>
            <GameIcon />
            <span>Game</span>
          </a>
        </li>
      </ul>
    </nav>
  );
}
