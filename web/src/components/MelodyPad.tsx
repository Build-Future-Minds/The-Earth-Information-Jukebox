// Optional melody: a separate "user" voice the visitor plays from the keyboard.
// Keys only play while this pad has focus, so letter keys stay free for screen-reader navigation.
import { useState } from 'react';
import { MELODY_KEYS } from '../audio/userVoice';

interface Props {
  volumeDb: number;
  onNoteOn: (key: string) => void;
  onNoteOff: (key: string) => void;
  onAllOff: () => void;
  onVolume: (db: number) => void;
}

const KEYS = Object.keys(MELODY_KEYS);

export function MelodyPad(p: Props) {
  const [down, setDown] = useState<Set<string>>(new Set());
  const [active, setActive] = useState(false);

  const press = (k: string) => {
    if (!(k in MELODY_KEYS)) return false;
    setDown((s) => new Set(s).add(k));
    p.onNoteOn(k);
    return true;
  };
  const release = (k: string) => {
    if (!(k in MELODY_KEYS)) return false;
    setDown((s) => {
      const n = new Set(s);
      n.delete(k);
      return n;
    });
    p.onNoteOff(k);
    return true;
  };

  return (
    <section className="melody" aria-labelledby="melody-heading">
      <h2 id="melody-heading">Add a melody (optional)</h2>
      <p className="muted">
        Your melody is a separate voice. It never changes the Earth rhythm.
      </p>
      <div
        className={active ? 'pad active' : 'pad'}
        tabIndex={0}
        role="application"
        aria-roledescription="melody keyboard"
        aria-label={`Melody keys. While focused, press ${KEYS.join(' ').toUpperCase()} to play notes. Tab to leave.`}
        onFocus={() => setActive(true)}
        onBlur={() => {
          setActive(false);
          setDown(new Set());
          p.onAllOff();
        }}
        onKeyDown={(e) => {
          if (e.ctrlKey || e.metaKey || e.altKey) return;
          if (press(e.key.toLowerCase())) e.preventDefault();
        }}
        onKeyUp={(e) => {
          if (release(e.key.toLowerCase())) e.preventDefault();
        }}
      >
        <span className="pad-hint">{active ? 'Playing: press the keys below' : 'Tab or click here, then press the keys'}</span>
        <span className="pad-keys" aria-hidden="true">
          {KEYS.map((k) => (
            <kbd key={k} className={down.has(k) ? 'down' : ''}>{k.toUpperCase()}</kbd>
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
