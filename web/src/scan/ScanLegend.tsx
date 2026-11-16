// What the picture scan's marks mean, and how a picture becomes sound, in words. Real text, read by
// screen readers. Shared by every view that shows the scan (Listen's Explain panel, Play along, the
// globe). Two groups, kept apart in words: what comes from the picture, and what is fixed by us.
// Each picture brings its own facts (data/sources.ts, ScanRule): which still is read, what each
// instrument means in its legend, what is never read, and what the scan cannot tell you about it.
import type { ScanSoundDef } from '../audio/instruments';
import type { ScanRule } from '../data/sources';
import type { Scene } from '../data/types';
import { stillTime } from './ScanOverlay';

/** What every mark and bar means, with the same shapes as on the picture. */
export function ScanLegend({ sound, order, radar, bars = 'below' }: { sound: ScanSoundDef; order: string; radar: boolean; bars?: 'below' | 'beside' }) {
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
          <strong>Bars: the 12 held notes ({sound.heldName}),</strong>{' '}
          {bars === 'beside' ? `beside the picture, one beside each band it reads, from ${order}, low to high.` : `from ${order}, low to high.`} The filled
          part is how loud each is now. A bar flashes orange when a note is struck in its band.
        </span>
      </li>
      {bars === 'beside' && (
        <li>
          <svg className="glyph light" viewBox="0 0 30 22" aria-hidden="true">
            <line x1="2" y1="18" x2="28" y2="18" className="g-axis" />
            <circle cx="8" cy="12" r="2" className="g-ink-fill" />
            <rect x="15" y="6" width="3.6" height="3.6" transform="rotate(45 16.8 7.8)" className="g-ink-fill" />
            <line x1="21" y1="2" x2="21" y2="18" className="g-signal-line" />
          </svg>
          <span>
            <strong>The sound line, under the picture.</strong> Every struck note of the scan, by time and pitch, with the same shapes. The orange line is
            where the sound is now.
          </span>
        </li>
      )}
      <li className="legend-group"><strong>Fixed by us, not from the picture</strong></li>
      <li>
        <svg className="glyph light" viewBox="0 0 30 22" aria-hidden="true">
          <rect x="6" y="3" width="18" height="16" className="g-track" />
          <rect x="6" y="10" width="18" height="9" className="g-ink" />
        </svg>
        <span>
          <strong>{bars === 'below' ? 'First bar: the low note.' : 'The low note.'}</strong> It steps C, A, F, G by the clock. That is decoration, not data:
          the picture sets only how loud it is.
        </span>
      </li>
    </ul>
  );
}

/** "How the picture becomes sound": the rule in a few lines, with this picture's own facts. */
export function ScanHow({ scene, rule, isTest }: { scene: Scene; rule: ScanRule | null; isTest: boolean }) {
  return (
    <ul>
      {!isTest && rule && (
        <li>
          <strong>Which picture.</strong> One still: {scene.source.title}
          {stillTime(rule.still.time)} ({rule.still.frame}): {rule.still.how}. Each picture is read with its own settings, measured on its own still.
        </li>
      )}
      <li><strong>Where.</strong> Higher on the picture is a higher note (on the radar: further from the centre). There are 12 bands, on the five notes C, D, E, G and A. Low bands are far apart and high bands close together, as a choir is spaced.</li>
      <li><strong>How much colour.</strong> More colour under the line is louder, and a little brighter in tone. What the picture draws as its background is silent. A soft held note sounds for every band the line is crossing.</li>
      {!isTest && rule?.mask && (
        <li>
          <strong>Never read.</strong> In this picture the scan never reads {rule.mask.what}. A part it never reads is no data: silent, and not counted as
          nothing there.
        </li>
      )}
      <li>
        <strong>Peaks of colour.</strong> When a band has more colour under the line than just before and just after, one note is struck, an octave above that
        band's held note. Peaks that follow each other too closely are left out, so each struck note can be heard.
      </li>
      <li>
        <strong>Which colour.</strong> Where most of that colour is on the red side of yellow (red and orange), the note is struck on one instrument. Where it is
        not (yellow-green, green and blue), it is struck on another.
        {rule && !isTest && <> In this picture the warm instrument plays {rule.instruments.warm}; the cool one plays {rule.instruments.cool}.</>}
      </li>
      {!isTest && rule && rule.limits.length > 0 && (
        <li>
          <strong>What the scan cannot tell you.</strong> {rule.limits.join(' ')}
        </li>
      )}
      <li><strong>Left and right.</strong> The sound sits where the line is: it travels from the left speaker to the right with the line.</li>
      <li>
        <strong>Decoration, not data.</strong> The scale is fixed. The low note steps through C, A, F and G on a fixed timetable, so the same held notes sound
        like four chords. The picture sets only how loud that low note is.
      </li>
      <li>
        <strong>Scan sound.</strong> Every choice plays the same notes at the same times. Only the instruments change, and all of them are made by this page's
        own code.
      </li>
    </ul>
  );
}
