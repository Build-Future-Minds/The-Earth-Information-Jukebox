// The app's views, picked by the URL hash (#home, #listen, #compare, #how, #play, #globe), so the back
// button and shared links work on GitHub Pages without a server or a routing library. An empty or
// unknown address shows Home, the landing page (docs/page_plan.md, P0).
import { useEffect, useState } from 'react';

export type View = 'home' | 'listen' | 'compare' | 'how' | 'play' | 'globe';

export const VIEWS: { key: View; label: string }[] = [
  { key: 'home', label: 'Home' },
  { key: 'listen', label: 'Listen' },
  { key: 'compare', label: 'Compare' },
  { key: 'how', label: "How it's made" },
  { key: 'play', label: 'Play along' },
  { key: 'globe', label: 'Globe' },
];

/** The listening game is its own page (it has a way back), not a view. */
export const GAME_HREF = 'tools/listening_game.html';

export function viewFromHash(hash: string): View {
  const key = hash.replace(/^#/, '');
  return VIEWS.find((v) => v.key === key)?.key ?? 'home';
}

/** The current view; follows the back button and page links through `hashchange`. */
export function useView(): View {
  const [view, setView] = useState<View>(() => viewFromHash(window.location.hash));
  useEffect(() => {
    const onChange = () => setView(viewFromHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return view;
}
