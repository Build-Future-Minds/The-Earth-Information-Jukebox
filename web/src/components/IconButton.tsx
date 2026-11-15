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
}

export function IconButton({ icon: Icon, label, onClick, primary, pressed, expanded, controls, keyshortcuts }: Props) {
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
      <Icon />
      <span className="icon-label">{label}</span>
    </button>
  );
}
