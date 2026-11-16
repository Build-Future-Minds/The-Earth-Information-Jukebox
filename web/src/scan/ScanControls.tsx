// The picture scan's controls, shared by every view that shows the scan, so each has the same
// buttons, the same labels and the same announcements: Play / Pause / Resume and Stop, the folded
// Scan settings, and the polite status line.
import type { ReactNode } from 'react';
import { SCAN_SOUNDS, type ScanSoundId } from '../audio/instruments';
import { regionLabel, SPEED_LABEL, SPEEDS } from '../components/ExploreControls';
import type { Scan } from './useScan';

/** Play / Pause / Resume and Stop. A view may add its own buttons after them (the globe: Turn with the line). */
export function ScanButtons({ scan, children }: { scan: Scan; children?: ReactNode }) {
  const { state, ready, player } = scan;
  return (
    <div className="row">
      {state === 'playing' ? (
        <button type="button" onClick={() => player.current?.pause()}>Pause the scan</button>
      ) : (
        <button type="button" className="primary" disabled={!ready} onClick={() => void player.current?.start()}>
          {state === 'paused' ? 'Resume the scan' : 'Play the picture'}
        </button>
      )}
      <button type="button" disabled={state === 'stopped'} onClick={() => player.current?.stop()}>Stop the scan</button>
      {children}
    </div>
  );
}

interface SettingsProps {
  scan: Scan;
  /** The page's speed. With `onSpeed`, the settings show the speed buttons: the scan and the Earth
   *  rhythm both follow them, as they follow the ones on Listen. */
  speed?: number;
  onSpeed?: (speed: number) => void;
}

/** Settings folded away (UI pass, 15 Nov): one clear start, the rest on request. */
export function ScanSettings({ scan, speed, onSpeed }: SettingsProps) {
  const { target, setTarget, across, regions, loaded, scene, soundId, setSoundId, volumeDb, setVolumeDb } = scan;
  return (
    <details className="scan-settings">
      <summary>Scan settings</summary>
      <div className="row">
        <label>
          Scan{' '}
          <select value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="map">Whole picture: a line, {across}</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{loaded?.isTest ? 'Test circle' : regionLabel(scene.regions, r.id)}: a radar turn</option>
            ))}
          </select>
        </label>
        <label>
          Scan sound{' '}
          <select value={soundId} onChange={(e) => setSoundId(e.target.value as ScanSoundId)}>
            {SCAN_SOUNDS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </label>
        <label className="range">
          <span className="range-row">
            <span>Scan volume</span>
            <span className="readout" aria-hidden="true">{volumeDb} dB</span>
          </span>
          <input
            type="range"
            min={-36}
            max={0}
            step={1}
            value={volumeDb}
            onChange={(e) => setVolumeDb(Number(e.target.value))}
            aria-valuetext={`${volumeDb} decibels`}
          />
        </label>
        {onSpeed && (
          // The page's speed: changing it while the scan plays keeps the scan going at the new speed.
          <div className="row" role="group" aria-label="Speed">
            {SPEEDS.map((v) => (
              <button key={v} type="button" className="speed" aria-pressed={speed === v} onClick={() => onSpeed(v)}>
                {SPEED_LABEL[v]}
              </button>
            ))}
          </div>
        )}
      </div>
    </details>
  );
}

/** Announced politely, and only when the scan starts, pauses or stops. Not role="status": the page
 *  has one status sentence, for the Earth rhythm. A view may add a sentence of its own (the globe:
 *  that Turn with the line has been turned off). */
export function ScanStatus({ scan, children }: { scan: Scan; children?: ReactNode }) {
  const { status, loadError, score, labelOf, target } = scan;
  return (
    <div aria-live="polite">
      <p className="scan-status">{status}</p>
      {children}
      {loadError && <p className="missing">The picture scan is not available: {loadError}</p>}
      {score?.status === 'missing' && (
        <p className="missing">
          Nothing to play for {labelOf(target)}: {score.reason}. The scan stays quiet.
        </p>
      )}
    </div>
  );
}
