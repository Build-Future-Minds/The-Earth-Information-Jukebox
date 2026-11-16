// The picture scan's controls, shared by every view that shows the scan, so each has the same
// buttons, the same labels and the same announcements: Play / Pause / Resume and Stop, the folded
// Scan settings, and the polite status line.
import { SCAN_SOUNDS, type ScanSoundId } from '../audio/instruments';
import { regionLabel } from '../components/ExploreControls';
import type { Scan } from './useScan';

export function ScanButtons({ scan }: { scan: Scan }) {
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
    </div>
  );
}

/** Settings folded away (UI pass, 15 Nov): one clear start, the rest on request. */
export function ScanSettings({ scan }: { scan: Scan }) {
  const { target, setTarget, across, regions, loaded, scene, picture, soundId, setSoundId, volumeDb, setVolumeDb } = scan;
  return (
    <details className="scan-settings">
      <summary>Scan settings</summary>
      <div className="row">
        <label>
          Scan{' '}
          <select value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="map">Whole picture: a line, {across}</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{loaded?.isTest ? 'Test circle' : regionLabel(scene.regions, r.id, picture.firstLetter)}: a radar turn</option>
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
      </div>
    </details>
  );
}

/** Announced politely, and only when the scan starts, pauses or stops. Not role="status": the page
 *  has one status sentence, for the Earth rhythm. */
export function ScanStatus({ scan }: { scan: Scan }) {
  const { status, loadError, score, labelOf, target } = scan;
  return (
    <div aria-live="polite">
      <p className="scan-status">{status}</p>
      {loadError && <p className="missing">The picture scan is not available: {loadError}</p>}
      {score?.status === 'missing' && (
        <p className="missing">
          Nothing to play for {labelOf(target)}: {score.reason}. The scan stays quiet.
        </p>
      )}
    </div>
  );
}
