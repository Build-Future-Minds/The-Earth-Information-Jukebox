// Play along: the Earth rhythm with the picture scan and your melody on top, and the listening game.
// The Earth voice has its own Start/Stop here, because changing view stops the sound.
// The scan and the melody are extras with their own instruments and volumes: neither can change
// an Earth note (docs/CONTRACT.md), and Stop and Esc silence both.
import type { Ref } from 'react';
import type { MelodyInstrumentId } from '../audio/instruments';
import type { PlayState } from '../audio/transport';
import type { InputSource } from '../audio/userVoice';
import type { Scene } from '../data/types';
import { PictureScan, type PictureScanHandle } from '../components/PictureScan';
import { IconButton } from '../components/IconButton';
import { PauseIcon, PlayIcon, StopIcon } from '../components/icons';
import { MelodyPad } from '../components/MelodyPad';
import { PracticeGame } from '../components/PracticeGame';

interface Props {
  /** The picture the scan plays: always the ocean picture (see App.tsx), not the one chosen on Listen. */
  scene: Scene;
  /** That picture's NASA still, or null in practice mode. */
  imageUrl: string | null;
  /** The page's speed setting: the picture scan follows it. */
  speed: number;
  /** Lets the page's Stop and Esc silence the scan. */
  scanRef: Ref<PictureScanHandle>;
  playState: PlayState;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  heldNotes: ReadonlySet<number>;
  melodyDb: number;
  melodyInstrument: MelodyInstrumentId;
  onMelodyInstrument: (id: MelodyInstrumentId) => void;
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
      <PictureScan ref={p.scanRef} scene={p.scene} imageUrl={p.imageUrl} speed={p.speed} />
      <MelodyPad
        heldNotes={p.heldNotes}
        volumeDb={p.melodyDb}
        instrument={p.melodyInstrument}
        onInstrument={p.onMelodyInstrument}
        onNoteOn={p.onNoteOn}
        onNoteOff={p.onNoteOff}
        onAllOff={p.onAllOff}
        onVolume={p.onMelodyVolume}
      />
      <PracticeGame />
    </>
  );
}
