// Play along: the Earth rhythm with the picture scan and your melody on top, and the listening game.
// The Earth voice has its own Start/Stop here, because changing view stops the sound.
// The scan and the melody are extras with their own instruments and volumes: neither can change
// an Earth note (docs/CONTRACT.md), and Stop and Esc silence both.
import type { CSSProperties, Ref } from 'react';
import { NowChip } from '../components/NowChip';
import type { MelodyInstrumentId } from '../audio/instruments';
import type { PlayState } from '../audio/transport';
import type { InputSource } from '../audio/userVoice';
import { PictureScan, type PictureScanHandle, type ScanPicture } from '../components/PictureScan';
import { IconButton } from '../components/IconButton';
import { PauseIcon, PlayIcon, StopIcon } from '../components/icons';
import { MelodyPad } from '../components/MelodyPad';
import { PracticeGame } from '../components/PracticeGame';


interface Props {
  /** The picture the scan plays, with its measured rule: the one chosen on Listen (see App.tsx). */
  scanPicture: ScanPicture;
  /** Said when the chosen picture has no measured rule and the scan plays another; else null. */
  scanNote: string | null;
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
  /** The chosen region's letter and colour, for the Earth rhythm chip. */
  regionLetter: string;
  colour: CSSProperties;
}

export function PlayView(p: Props) {
  const playing = p.playState === 'playing';
  // UI pass (15 Nov): one clear start (Play the picture), then playing along and the game.
  return (
    <div className="play-grid">
      <div className="play-scan">
        {p.scanNote && <p className="muted">{p.scanNote}</p>}
        {/* A new picture remounts the scan: it starts stopped, on the whole picture, with no marks. */}
        <PictureScan key={p.scanPicture.key} ref={p.scanRef} picture={p.scanPicture} speed={p.speed} />
      </div>
      <section className="jam" aria-label="Play along with the Earth rhythm" style={p.colour}>
        <h3>Play along with the Earth rhythm</h3>
        <div className="row icon-row">
          {playing ? (
            <IconButton icon={PauseIcon} label="Pause" onClick={p.onPause} primary />
          ) : (
            <IconButton icon={PlayIcon} label="Play" onClick={p.onStart} primary />
          )}
          <IconButton icon={StopIcon} label="Stop" onClick={p.onStop} keyshortcuts="Escape" hint="Esc" />
          <NowChip letter={p.regionLetter} playState={p.playState} />
        </div>
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
      </section>
      <PracticeGame />
    </div>
  );
}
