// Light / Dark switch. index.html sets the starting theme before the first paint (a saved choice,
// else the system setting); this keeps the buttons in step and saves a new choice. Saving is optional:
// storage can be blocked, and the page still works.
import { useState } from 'react';

type Theme = 'light' | 'dark';
const current = (): Theme => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

export function ThemeSwitch() {
  const [theme, setTheme] = useState<Theme>(current);
  const choose = (t: Theme) => {
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem('es-theme', t);
    } catch {
      /* storage blocked: the choice lasts for this visit only */
    }
    setTheme(t);
  };
  return (
    <div className="theme-switch" role="group" aria-label="Colour theme">
      <button type="button" aria-pressed={theme === 'light'} onClick={() => choose('light')}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <circle cx="8" cy="8" r="3" />
          <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6 13 13M3 13l1.4-1.4M11.6 4.4 13 3" />
        </svg>
        Light
      </button>
      <button type="button" aria-pressed={theme === 'dark'} onClick={() => choose('dark')}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M13.5 10A6 6 0 0 1 6 2.5a6 6 0 1 0 7.5 7.5z" />
        </svg>
        Dark
      </button>
    </div>
  );
}
