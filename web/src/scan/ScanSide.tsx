// Beside the scanned picture, in every view: the low note and the twelve held notes as bars, the
// readout of where the line is, and the legend. The bars and the readout are moved by the drawing
// loop (scan/useScanFrame.ts) through the refs in `scan.side`, not by React renders.
import type { CSSProperties, ReactNode } from 'react';
import { ROOT_NOTES, bandNote, noteName } from '../audio/scanScore';
import { ScanLegend } from './ScanLegend';
import type { Scan } from './useScan';

export function ScanSide({ scan, children }: { scan: Scan; children?: ReactNode }) {
  const { side, bands, sound, order, region } = scan;
  return (
    <div className="scan-side">
      {/* The low note and the twelve held notes, low to high: how loud each is right now. A bar
          flashes when its band is struck. It repeats in shapes what the sound and the text say. */}
      <div className="notes" aria-hidden="true">
        <span className="note-bar root" ref={side.rootBar}>
          <i />
          <b ref={side.rootName}>{noteName(ROOT_NOTES[0])}</b>
        </span>
        {Array.from({ length: bands }, (_, band) => (
          <span key={band} className="note-bar" ref={(el) => void (side.bars.current[band] = el)} style={{ '--length': 1 - band * 0.035 } as CSSProperties}>
            <i />
            <b>{noteName(bandNote(band))}</b>
          </span>
        ))}
      </div>
      <span className="readout" aria-hidden="true">
        <span ref={side.readout}>line at the start</span>
        {' · last chime: '}
        <span ref={side.lastChime}>none yet</span>
      </span>

      <details className="scan-legend-box">
        <summary>What the marks mean</summary>
        <ScanLegend sound={sound} order={order} radar={!!region} />
      </details>

      {children}
    </div>
  );
}
