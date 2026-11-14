// Optional melody: a separate "user" voice. Play it with the computer keyboard (while this pad
// has focus) or by pressing the on-screen keys with a mouse or touch. Letter keys only play while
// the pad has focus, so they stay free for screen readers and speech input (docs/DECISIONS.md D8).
// Inputs send MIDI note numbers, so a MIDI piano can later call the same onNoteOn / onNoteOff.
import { useEffect, useState } from 'react';
import { KEYBOARD_NOTES } from '../audio/userVoice';

interface Props {
  volumeDb: number;
  onNoteOn: (note: number) => void;
  onNoteOff: (note: number) => void;
  onAllOff: () => void;
  onVolume: (db: number) => void;
}

const KEYS = Object.keys(KEYBOARD_NOTES);

export function MelodyPad(p: Props) {
  const [down, setDown] = useState<Set<string>>(new Set());
  const [active, setActive] = useState(false);
  const { onAllOff } = p;

  const press = (k: string) => {
    const note = KEYBOARD_NOTES[k];
    if (note === undefined) return false;
    setDown((s) => new Set(s).add(k));
    p.onNoteOn(note);
    return true;
  };
  const release = (k: string) => {
    const note = KEYBOARD_NOTES[k];
    if (note === undefined) return false;
    setDown((s) => {
      const n = new Set(s);
      n.delete(k);
      return n;
    });
    p.onNoteOff(note);
    return true;
  };
  const releaseAll = () => {
    setDown(new Set());
    onAllOff();
  };

  // Switching windows while holding a key never delivers the key-up: release everything.
  useEffect(() => {
    const onWindowBlur = () => {
      setDown(new Set());
      onAllOff();
    };
    window.addEventListener('blur', onWindowBlur);
    return () => window.removeEventListener('blur', onWindowBlur);
  }, [onAllOff]);

  return (
    <section className="melody" aria-labelledby="melody-heading">
      <h2 id="melody-heading">Add a melody (optional)</h2>
      <p className="muted">Your melody is a separate voice. It never changes the Earth rhythm.</p>
      <div
        className={active ? 'pad active' : 'pad'}
        tabIndex={0}
        role="application"
        aria-roledescription="melody keyboard"
        aria-label={`Melody keys. While focused, press ${KEYS.join(' ').toUpperCase()} to play notes. Tab to leave.`}
        onFocus={() => setActive(true)}
        onBlur={() => {
          setActive(false);
          releaseAll();
        }}
        onKeyDown={(e) => {
          if (e.ctrlKey || e.metaKey || e.altKey) return;
          if (press(e.key.toLowerCase())) e.preventDefault();
        }}
        onKeyUp={(e) => {
          if (release(e.key.toLowerCase())) e.preventDefault();
        }}
      >
        <span className="pad-hint">
          {active ? 'Playing: press the keys below, or click them' : 'Tab here and press the keys, or click a key'}
        </span>
        <span className="pad-keys" aria-hidden="true">
          {KEYS.map((k) => (
            <kbd
              key={k}
              data-key={k}
              className={down.has(k) ? 'down' : ''}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture?.(e.pointerId);
                press(k);
              }}
              onPointerUp={() => release(k)}
              onPointerCancel={() => release(k)}
            >
              {k.toUpperCase()}
            </kbd>
          ))}
        </span>
      </div>
      <label>
        Melody volume{' '}
        <input
          type="range"
          min={-36}
          max={0}
          step={1}
          value={p.volumeDb}
          onChange={(e) => p.onVolume(Number(e.target.value))}
          aria-valuetext={`${p.volumeDb} decibels`}
        />
      </label>
    </section>
  );
}
