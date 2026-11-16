// Line icons for the icon buttons (DESIGN.md "Icon button"): 20px, drawn in currentColor so they
// follow the button's ink in both themes. Decorative only: the visible word names the button.
import type { ReactNode } from 'react';

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

export const PlayIcon = () => <Icon><path d="M6 4l10 6-10 6z" /></Icon>;
export const PauseIcon = () => <Icon><path d="M7 4v12M13 4v12" /></Icon>;
export const StopIcon = () => <Icon><rect x="4.5" y="4.5" width="11" height="11" rx="1" /></Icon>;
export const ReplayIcon = () => <Icon><path d="M4 10a6 6 0 1 0 1.8-4.3M4 3v3.5h3.5" /></Icon>;
export const ExplainIcon = () => (
  <Icon>
    <circle cx="10" cy="10" r="7.5" />
    <path d="M7.8 8a2.3 2.3 0 1 1 3.3 2c-.7.4-1.1.8-1.1 1.6" />
    <path d="M10 14.2v.1" />
  </Icon>
);
export const SoundIcon = () => <Icon><path d="M3 8h3l4-3v10l-4-3H3zM13.5 7.5a3.5 3.5 0 0 1 0 5M15.8 5.2a6.8 6.8 0 0 1 0 9.6" /></Icon>;

// Tab icons: what each view is for.
export const ListenIcon = () => <Icon><path d="M4 12v-1a6 6 0 0 1 12 0v1M4 12h2.5v4H4zM13.5 12H16v4h-2.5z" /></Icon>;
export const CompareIcon = () => <Icon><circle cx="6" cy="10" r="3.5" /><circle cx="14" cy="10" r="3.5" /></Icon>;
export const HowIcon = () => <Icon><path d="M3 15h4l2-10 2 10h6" /><path d="M3 5h14" /></Icon>;
export const PlayAlongIcon = () => <Icon><rect x="3" y="4" width="14" height="12" rx="1" /><path d="M7.5 4v7M12.5 4v7M10 11v5" /></Icon>;
export const GlobeIcon = () => <Icon><circle cx="10" cy="10" r="7.5" /><path d="M2.5 10h15M10 2.5c2.5 2.2 2.5 12.8 0 15M10 2.5c-2.5 2.2-2.5 12.8 0 15" /></Icon>;
export const GameIcon = () => <Icon><rect x="2.5" y="5" width="6" height="6" rx="1" /><rect x="11.5" y="9" width="6" height="6" rx="1" /><path d="M5.5 14v2.5M14.5 4.5V7" /></Icon>;
