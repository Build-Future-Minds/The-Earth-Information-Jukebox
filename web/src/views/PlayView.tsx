// Play along: the Earth rhythm with your melody on top, and the listening game.
// The Earth voice has its own Start/Stop here, because changing view stops the sound.
import type { PlayState } from '../audio/transport';
import type { InputSource } from '../audio/userVoice';
import { IconButton } from '../components/IconButton';
import { PauseIcon, PlayIcon, StopIcon } from '../components/icons';
import { MelodyPad } from '../components/MelodyPad';
import { PracticeGame } from '../components/PracticeGame';

interface Props {
  playState: PlayState;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  heldNotes: ReadonlySet<number>;
  melodyDb: number;
  onNoteOn: (note: number, source: InputSource) => void;
  onNoteOff: (note: number, source: InputSource) => void;
  onAllOff: () => void;
  onMelodyVolume: (db: number) => void;
}

export function PlayView(p: Props) {
  const playing = p.playState === 'playing';
  return (
    <>
      <section className="controls" aria-label="Earth rhythm">
        <div className="row icon-row">
          {playing ? (
            <IconButton icon={PauseIcon} label="Pause" onClick={p.onPause} />
          ) : (
            <IconButton icon={PlayIcon} label="Play" onClick={p.onStart} primary />
          )}
          <IconButton icon={StopIcon} label="Stop" onClick={p.onStop} keyshortcuts="Escape" />
        </div>
      </section>
      <MelodyPad
        heldNotes={p.heldNotes}
        volumeDb={p.melodyDb}
        onNoteOn={p.onNoteOn}
        onNoteOff={p.onNoteOff}
        onAllOff={p.onAllOff}
        onVolume={p.onMelodyVolume}
      />
      <PracticeGame />
    </>
  );
}
