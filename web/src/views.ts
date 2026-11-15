// The app's four views, picked by the URL hash (#listen, #compare, #how, #play), so the back button
// and shared links work on GitHub Pages without a server or a routing library. Anything unknown
// shows Listen, the home view.
import { useEffect, useState } from 'react';

export type View = 'listen' | 'compare' | 'how' | 'play';

export const VIEWS: { key: View; label: string }[] = [
  { key: 'listen', label: 'Listen' },
  { key: 'compare', label: 'Compare' },
  { key: 'how', label: "How it's made" },
  { key: 'play', label: 'Play along' },
];

export function viewFromHash(hash: string): View {
  const key = hash.replace(/^#/, '');
  return VIEWS.find((v) => v.key === key)?.key ?? 'listen';
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
