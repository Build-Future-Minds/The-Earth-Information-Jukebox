// Your melody: a separate "user" voice, the second half of "Play along". Play it with the computer
// keyboard (while this pad has focus) or by pressing the on-screen keys with a mouse or touch.
// Letter keys only play while the pad has focus, so they stay free for screen readers and speech
// input (docs/DECISIONS.md D8).
// Inputs send MIDI note numbers, so a MIDI piano can later call the same onNoteOn / onNoteOff.
import { useEffect, useState } from 'react';
import { MELODY_INSTRUMENTS, type MelodyInstrumentId } from '../audio/instruments';
import { KEYBOARD_NOTES, type InputSource } from '../audio/userVoice';

interface Props {
  /** Notes held right now by any input (from UserVoice), so the highlight matches the sound. */
  heldNotes: ReadonlySet<number>;
  volumeDb: number;
  instrument: MelodyInstrumentId;
  onNoteOn: (note: number, source: InputSource) => void;
  onNoteOff: (note: number, source: InputSource) => void;
  onAllOff: () => void;
  onVolume: (db: number) => void;
  onInstrument: (id: MelodyInstrumentId) => void;
}

const KEYS = Object.keys(KEYBOARD_NOTES);

export function MelodyPad(p: Props) {
  const [active, setActive] = useState(false);
  const { onAllOff } = p;

  // Switching windows while holding a key never delivers the key-up: release everything.
  useEffect(() => {
    window.addEventListener('blur', onAllOff);
    return () => window.removeEventListener('blur', onAllOff);
  }, [onAllOff]);

  const fromKey = (e: React.KeyboardEvent) => (e.ctrlKey || e.metaKey || e.altKey ? undefined : KEYBOARD_NOTES[e.key.toLowerCase()]);

  return (
    <div className="melody" role="group" aria-labelledby="melody-heading">
      <h3 id="melody-heading">Your melody</h3>
      <p className="muted">
        Your melody is a separate voice. It never changes the Earth rhythm. Its eight keys use the same five-note scale as the
        picture scan, so whatever you play fits.
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
          onAllOff();
        }}
        onKeyDown={(e) => {
          const note = fromKey(e);
          if (note === undefined) return;
          e.preventDefault();
          p.onNoteOn(note, 'key');
        }}
        onKeyUp={(e) => {
          const note = KEYBOARD_NOTES[e.key.toLowerCase()];
          if (note === undefined) return;
          e.preventDefault();
          p.onNoteOff(note, 'key');
        }}
      >
        <span className="pad-hint">
          {active ? 'Playing: press the keys below, or click them' : 'Tab here and press the keys, or click a key'}
        </span>
        <span className="pad-keys" aria-hidden="true">
          {KEYS.map((k) => {
            const note = KEYBOARD_NOTES[k];
            return (
              <kbd
                key={k}
                data-key={k}
                className={p.heldNotes.has(note) ? 'down' : ''}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture?.(e.pointerId);
                  p.onNoteOn(note, 'pointer');
                }}
                onPointerUp={() => p.onNoteOff(note, 'pointer')}
                onPointerCancel={() => p.onNoteOff(note, 'pointer')}
              >
                {k.toUpperCase()}
              </kbd>
            );
          })}
        </span>
      </div>
      <div className="row">
        <label>
          Melody sound{' '}
          <select value={p.instrument} onChange={(e) => p.onInstrument(e.target.value as MelodyInstrumentId)}>
            {MELODY_INSTRUMENTS.map((i) => (
              <option key={i.id} value={i.id}>{i.label}</option>
            ))}
          </select>
        </label>
        <label className="range">
          <span className="range-row">
            <span>Melody volume</span>
            <span className="readout" aria-hidden="true">{p.volumeDb} dB</span>
          </span>
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
      </div>
    </div>
  );
}
