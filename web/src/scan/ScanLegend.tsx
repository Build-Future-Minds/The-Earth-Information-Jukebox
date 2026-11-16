// What every mark and bar of the picture scan means, with the same shapes as on the picture. Real
// text, read by screen readers. Shared by every view that shows the scan. Two groups, kept apart
// in words: what comes from the picture, and what is fixed by us.
import type { ScanSoundDef } from '../audio/instruments';

export function ScanLegend({ sound, order, radar }: { sound: ScanSoundDef; order: string; radar: boolean }) {
  return (
    <ul className="scan-legend" aria-label="What the marks and bars mean">
      <li className="legend-group"><strong>From the picture</strong></li>
      <li>
        <svg className="glyph" viewBox="0 0 30 22" aria-hidden="true">
          <rect width="15" height="22" fill="#666" />
          <rect x="15" width="15" height="22" fill="#2a2a2a" />
          <line x1="15" y1="0" x2="15" y2="22" stroke="#fff" strokeWidth="2.5" />
        </svg>
        <span><strong>The line.</strong> You hear what is under it. Behind it the picture is bright; the dimmed part is still to come.</span>
      </li>
      <li>
        <svg className="glyph" viewBox="0 0 30 22" aria-hidden="true">
          <path d="M15 1C21 6 21 8 15 11C9 14 23 17 15 21C7 17 21 14 15 11C9 8 9 6 15 1Z" fill="#fff" fillOpacity="0.85" />
          <line x1="15" y1="0" x2="15" y2="22" stroke="#fff" strokeWidth="1.5" />
        </svg>
        <span><strong>White shape on the line.</strong> Wider where that band is louder.</span>
      </li>
      <li>
        <svg className="glyph" viewBox="0 0 30 22" aria-hidden="true">
          <circle cx="15" cy="11" r="5" fill="#fff" stroke="#000" strokeWidth="1.5" />
        </svg>
        <span><strong>Round mark: a {sound.warmName} note.</strong> The line crossed a peak of colour that is mostly red or orange.</span>
      </li>
      <li>
        <svg className="glyph" viewBox="0 0 30 22" aria-hidden="true">
          <rect x="10.5" y="6.5" width="9" height="9" transform="rotate(45 15 11)" fill="#fff" stroke="#000" strokeWidth="1.5" />
        </svg>
        <span><strong>Diamond: a {sound.coolName} note.</strong> The line crossed a peak of colour that is mostly yellow-green, green or blue.</span>
      </li>
      <li>
        <svg className="glyph" viewBox="0 0 30 22" aria-hidden="true">
          <circle cx="15" cy="11" r="8.5" fill="none" stroke="#fff" strokeWidth="1.5" strokeOpacity="0.7" />
          <circle cx="15" cy="11" r="2.5" fill="#fff" />
        </svg>
        <span><strong>Ring.</strong> Spreads from a mark at the moment its note sounds. The mark stays until the sweep ends.</span>
      </li>
      <li>
        <svg className="glyph" viewBox="0 0 30 22" aria-hidden="true">
          <g fill="none" strokeLinecap="round" stroke="#000" strokeWidth="3.5">
            <rect x="13" y="6" width="4" height="10" />
            <path d="M15 1V3.5M15 18.5V21M5 11H10M20 11H25" />
          </g>
          <g fill="none" strokeLinecap="round" stroke="#fff" strokeWidth="1.5">
            <rect x="13" y="6" width="4" height="10" />
            <path d="M15 1V3.5M15 18.5V21M5 11H10M20 11H25" />
          </g>
        </svg>
        <span>
          <strong>Outlined cell with four ticks.</strong> The place explained in “Why the scan sounds like this”, chosen with its
          column slider or by clicking the picture.
        </span>
      </li>
      {radar && (
        <li>
          <svg className="glyph" viewBox="0 0 30 22" aria-hidden="true">
            <circle cx="15" cy="11" r="3.5" fill="none" stroke="#fff" strokeWidth="1" strokeOpacity="0.6" />
            <circle cx="15" cy="11" r="6.5" fill="none" stroke="#fff" strokeWidth="1" strokeOpacity="0.6" />
            <circle cx="15" cy="11" r="9.5" fill="none" stroke="#fff" strokeWidth="1.5" />
          </svg>
          <span><strong>Thin rings.</strong> Every third band. Further from the centre is a higher note.</span>
        </li>
      )}
      <li>
        <svg className="glyph light" viewBox="0 0 30 22" aria-hidden="true">
          <rect x="3" y="3" width="6" height="16" className="g-track" />
          <rect x="3" y="12" width="6" height="7" className="g-ink" />
          <rect x="12" y="5" width="6" height="14" className="g-signal" />
          <rect x="21" y="7" width="6" height="12" className="g-track" />
          <rect x="21" y="15" width="6" height="4" className="g-ink" />
        </svg>
        <span>
          <strong>Bars: the 12 held notes ({sound.heldName}),</strong> from {order}, low to high. The filled part is how loud each is
          now. A bar flashes orange when a note is struck in its band.
        </span>
      </li>
      <li className="legend-group"><strong>Fixed by us, not from the picture</strong></li>
      <li>
        <svg className="glyph light" viewBox="0 0 30 22" aria-hidden="true">
          <rect x="6" y="3" width="18" height="16" className="g-track" />
          <rect x="6" y="10" width="18" height="9" className="g-ink" />
        </svg>
        <span>
          <strong>First bar: the low note.</strong> It steps C, A, F, G by the clock. That is decoration, not data: the picture sets
          only how loud it is.
        </span>
      </li>
    </ul>
  );
}
