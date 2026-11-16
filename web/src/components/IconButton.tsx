// A button that is an icon with a one-word label under it (team rule, 15 Nov: more buttons, less
// text). The visible word is the accessible name; the icon is decorative.
import type { ComponentType } from 'react';

interface Props {
  icon: ComponentType;
  label: string;
  onClick: () => void;
  primary?: boolean;
  pressed?: boolean;
  expanded?: boolean;
  controls?: string;
  keyshortcuts?: string;
  /** A visible key hint ("Esc"), hidden from screen readers: aria-keyshortcuts already says it. */
  hint?: string;
  /** A step number in the corner (Listen: 3 Play); decoration, hidden from screen readers. */
  step?: number;
}

export function IconButton({ icon: Icon, label, onClick, primary, pressed, expanded, controls, keyshortcuts, hint, step }: Props) {
  return (
    <button
      type="button"
      className={primary ? 'icon-button primary' : 'icon-button'}
      onClick={onClick}
      aria-pressed={pressed}
      aria-expanded={expanded}
      aria-controls={controls}
      aria-keyshortcuts={keyshortcuts}
    >
      {step !== undefined && <span className="step-mark corner" aria-hidden="true">{step}</span>}
      <Icon />
      <span className="icon-label">{label}</span>
      {hint && <kbd className="key-hint" aria-hidden="true">{hint}</kbd>}
    </button>
  );
}
