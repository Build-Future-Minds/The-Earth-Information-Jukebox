// Why the picture scan sounds the way it does: for any cell of the score, the place on the
// picture, what was measured there, and how that became a pitch, a loudness and an instrument.
// Pure functions on a ScanScore (no audio, no DOM), like the rule itself, so every sentence can be
// tested against the numbers it quotes. The Earth voice does the same with its `why` record and
// "Explain this rhythm"; this is the scan's equivalent.
//
// A sentence is built from the score, the rule's own constants and the picture being played. It
// cannot say anything the score does not hold, so it cannot disagree with the sound. It speaks of
// one picture only: its own floor, full level, never-read pixels and instrument meanings.
import {
  CHIME_RULE,
  ROOT_PROGRESSION,
  ROOT_STEP_SECONDS,
  bandNote,
  chimeNote,
  chimeVelocity,
  columnMean,
  columnTime,
  noteName,
  rootNoteAt,
  smoothedLevel,
  type Chime,
  type ChimeColour,
  type ScanScore,
} from './scanScore';

export interface WhyContext {
  /** `world`: the picture is a whole-world map (stated for each picture in data/sources.ts,
   *  `scan.worldMap`), so places are longitudes and latitudes. `plain`: any other picture, so
   *  places are shares of the way across and up. */
  geometry: 'world' | 'plain';
  /** The names the screen uses for the sounds of the chosen scan sound. `blue`: the third
   *  instrument, for a picture that has one. */
  names: { held: string; warm: string; cool: string; blue?: string };
  /** The picture being played: what each instrument means in its own legend, and what its
   *  never-read pixels are. With it, sentences say what a note means "in this picture". */
  picture?: { instruments: { warm: string; cool: string; blue?: string }; noData?: string };
}

/** What happens to one cell's peak, if it has one. */
export type ChimeWhy =
  | {
      status: 'struck';
      midi: number;
      name: string;
      instrument: string;
      colour: ChimeColour;
      velocity: number;
      smoothed: number;
      warmShare: number;
      /** Share on the blue side, or null when the picture has no third instrument. */
      blueShare: number | null;
    }
  | { status: 'left out'; reason: 'spacing' | 'column'; by: { column: number; band: number }; smoothed: number }
  | { status: 'none'; reason: 'no data' | 'no colour' | 'below level' | 'not a peak'; smoothed: number };

/** Everything the scan knows about one cell: one band in one column. */
export interface BandWhy {
  column: number;
  band: number;
  shape: ScanScore['shape'];
  /** Seconds into the sweep at speed 1. */
  seconds: number;
  /** Where on the picture, in words: the whole place, then its two parts (along the sweep, and up
   *  the line or out from the centre). */
  place: string;
  across: string;
  along: string;
  /** The band's share of the globe's surface, 0 to 1: only for a map sweep on a world map. */
  groundShare: number | null;
  /** Pixels read (sample points on the radar). 0 is no data. */
  reads: number;
  measure: ScanScore['measure'];
  /** The mean of the measure over what was read, 0 to 1. */
  mean: number;
  /** This picture's floor and full level. */
  floor: number;
  full: number;
  level: number;
  held: { midi: number; name: string };
  chime: ChimeWhy;
  /** What the struck note's instrument means in this picture, or null. */
  meaning: string | null;
  /** What this picture's never-read pixels are, or null. */
  noData: string | null;
}

const trim = (x: number, digits = 1) => x.toFixed(digits).replace(/\.0+$/, '');
const lon = (degrees: number) => (Math.abs(degrees) < 1e-9 || Math.abs(Math.abs(degrees) - 180) < 1e-9 ? `${trim(Math.abs(degrees))}°` : `${trim(Math.abs(degrees))}° ${degrees < 0 ? 'W' : 'E'}`);
const lat = (degrees: number) => (Math.abs(degrees) < 1e-9 ? '0°' : `${trim(Math.abs(degrees))}° ${degrees < 0 ? 'S' : 'N'}`);
const percent = (share: number, digits = 0) => `${trim(100 * share, digits)}%`;

/** Where a cell is, in words, and (for a map sweep on a world map) how much of the globe it is. */
export function placeOf(
  score: ScanScore,
  column: number,
  band: number,
  geometry: WhyContext['geometry'],
): { text: string; across: string; along: string; groundShare: number | null } {
  const { columns, bands } = score.grid;
  const join = (across: string, along: string, groundShare: number | null) => ({ text: `${across}, ${along}`, across, along, groundShare });
  if (score.shape === 'radar') {
    const from = (360 * column) / columns;
    const to = (360 * (column + 1)) / columns;
    return join(
      `${trim(from)}° to ${trim(to)}° round (0° is east, turning anticlockwise)`,
      `${percent(band / bands)} to ${percent((band + 1) / bands)} of the way out from the centre`,
      null,
    );
  }
  if (geometry === 'world') {
    const west = (360 * column) / columns - 180;
    const east = (360 * (column + 1)) / columns - 180;
    const south = -90 + (180 * band) / bands;
    const north = -90 + (180 * (band + 1)) / bands;
    const rad = Math.PI / 180;
    return join(`${lon(west)} to ${lon(east)}`, `${lat(south)} to ${lat(north)}`, (Math.sin(north * rad) - Math.sin(south * rad)) / 2);
  }
  // One decimal: a column is a fraction of a percent wide, and "50% to 50%" says nothing.
  return join(
    `${percent(column / columns, 1)} to ${percent((column + 1) / columns, 1)} of the way across`,
    `${percent(band / bands, 1)} to ${percent((band + 1) / bands, 1)} of the way up`,
    null,
  );
}

/** The name of the instrument that strikes a note of this colour, in the chosen scan sound. */
function instrumentName(colour: ChimeColour, ctx: WhyContext): string {
  return colour === 'warm' ? ctx.names.warm : colour === 'blue' ? (ctx.names.blue ?? ctx.names.cool) : ctx.names.cool;
}

/** What the scan knows about one cell. Columns and bands outside the score are brought inside it. */
export function whyBand(score: ScanScore, column: number, band: number, ctx: WhyContext): BandWhy {
  const { columns, bands } = score.grid;
  column = Math.min(columns - 1, Math.max(0, Math.round(column)));
  band = Math.min(bands - 1, Math.max(0, Math.round(band)));
  const cell = column * bands + band;
  const cyclic = score.shape === 'radar';
  const smoothed = smoothedLevel(score.levels, score.grid, cyclic, column, band, score.reads);
  const place = placeOf(score, column, band, ctx.geometry);

  let chime: ChimeWhy;
  const struck: Chime | undefined = score.chimes.find((c) => c.column === column && c.band === band);
  const dropped = score.dropped.find((d) => d.column === column && d.band === band);
  if (score.reads[cell] === 0) {
    chime = { status: 'none', reason: 'no data', smoothed: 0 };
  } else if (struck) {
    chime = {
      status: 'struck',
      midi: chimeNote(struck),
      name: noteName(chimeNote(struck)),
      instrument: instrumentName(struck.colour, ctx),
      colour: struck.colour,
      velocity: chimeVelocity(struck.level),
      smoothed: struck.level,
      warmShare: score.warmShare[cell],
      blueShare: score.blueClass ? score.blueShare[cell] : null,
    };
  } else if (dropped) {
    chime = { status: 'left out', reason: dropped.reason, by: dropped.by, smoothed: dropped.level };
  } else {
    chime = {
      status: 'none',
      reason: score.levels[cell] === 0 && smoothed === 0 ? 'no colour' : smoothed < CHIME_RULE.minLevel ? 'below level' : 'not a peak',
      smoothed,
    };
  }
  const meanings = ctx.picture?.instruments;
  return {
    column,
    band,
    shape: score.shape,
    seconds: columnTime(score.grid, column),
    place: place.text,
    across: place.across,
    along: place.along,
    groundShare: place.groundShare,
    reads: score.reads[cell],
    measure: score.measure,
    mean: score.means[cell],
    floor: score.floor,
    full: score.grid.fullStrength,
    level: score.levels[cell],
    held: { midi: bandNote(band), name: noteName(bandNote(band)) },
    chime,
    meaning: chime.status === 'struck' && meanings ? (meanings[chime.colour] ?? meanings.cool) : null,
    noData: ctx.picture?.noData ?? null,
  };
}

/** The whole column under the line: the low note, and every band from the lowest up. */
export function whyColumn(score: ScanScore, column: number, ctx: WhyContext) {
  const { columns, bands } = score.grid;
  column = Math.min(columns - 1, Math.max(0, Math.round(column)));
  const root = rootNoteAt(score.grid, column);
  let bandsWithData = 0;
  for (let band = 0; band < bands; band++) if (score.reads[column * bands + band] > 0) bandsWithData++;
  return {
    column,
    seconds: columnTime(score.grid, column),
    root: { midi: root, name: noteName(root), loudness: columnMean(score, column), bandsWithData },
    bands: Array.from({ length: bands }, (_, band) => whyBand(score, column, band, ctx)),
  };
}

const measureName = (m: ScanScore['measure']) => (m === 'colour' ? 'colour strength' : 'brightness');
const num = (x: number, digits = 3) => x.toFixed(digits);
const capital = (s: string) => `${s[0].toUpperCase()}${s.slice(1)}`;

/** Which share of the drawn colour chose the instrument, as a clause. */
function whichSide(c: Extract<ChimeWhy, { status: 'struck' }>): string {
  if (c.blueShare === null) {
    return c.warmShare >= 0.5
      ? `${percent(c.warmShare)} of the colour drawn there is on the red side of yellow (half or more)`
      : c.warmShare === 0
        ? 'none of the colour drawn there is on the red side of yellow'
        : `only ${percent(c.warmShare)} of the colour drawn there is on the red side of yellow (less than half)`;
  }
  const neither = Math.max(0, 1 - c.warmShare - c.blueShare);
  return `of the colour drawn there, ${percent(c.warmShare)} is on the red side of yellow, ${percent(c.blueShare)} on the blue side and ${percent(neither)} neither, and the largest share wins`;
}

/** What the scan did with one cell's peak, as a sentence. */
export function explainChime(why: BandWhy): string {
  const c = why.chime;
  const rule = `a level of ${num(CHIME_RULE.minLevel, 2)} or more once smoothed over three columns, higher than the column before it and at least as high as the one after`;
  if (c.status === 'struck') {
    const meaning = why.meaning ? ` In this picture the ${c.instrument} stands for ${why.meaning}.` : '';
    return (
      `A note is struck here: this cell is a peak (smoothed level ${num(c.smoothed, 2)}; a peak needs ${rule}). ` +
      `${capital(whichSide(c))}, so the note is played on the ${c.instrument}, ` +
      `an octave above the held note: ${c.name}, at strength ${num(c.velocity, 2)} (0.35 + 0.65 × ${num(c.smoothed, 2)}).${meaning}`
    );
  }
  if (c.status === 'left out') {
    const where = c.by.column === why.column ? 'in the same column' : `${Math.abs(c.by.column - why.column)} column${Math.abs(c.by.column - why.column) === 1 ? '' : 's'} ${c.by.column > why.column ? 'later' : 'earlier'}`;
    return c.reason === 'spacing'
      ? `No note is struck here. This cell is a peak (smoothed level ${num(c.smoothed, 2)}), but a stronger one in the same band, ${where}, is closer than ${CHIME_RULE.minGap} columns, so it gives way.`
      : `No note is struck here. This cell is a peak (smoothed level ${num(c.smoothed, 2)}), but a stronger peak in band ${c.by.band + 1} starts in the same column, and a column starts at most ${CHIME_RULE.perColumn} note${CHIME_RULE.perColumn === 1 ? '' : 's'}.`;
  }
  if (c.reason === 'no data') {
    return 'No note is struck here: the cell read nothing, so there is no data to strike.';
  }
  if (c.reason === 'no colour') {
    return `No note is struck here: the cell has no ${why.measure === 'colour' ? 'colour' : 'light'} to speak of (its mean ${num(why.mean)} is at or below the floor, ${num(why.floor)}).`;
  }
  if (c.reason === 'below level') {
    return `No note is struck here: the smoothed level ${num(c.smoothed, 2)} is below the ${num(CHIME_RULE.minLevel, 2)} a peak needs.`;
  }
  return `No note is struck here: the cell is not a peak (it needs to be higher than the column before it and at least as high as the one after).`;
}

/** One cell, in full: place, measurement, held note and what became of its peak. */
export function explainBand(why: BandWhy): string {
  const unit = why.shape === 'radar' ? 'sample points' : 'pixels';
  const ground = why.groundShare !== null ? ` (${percent(why.groundShare, 1)} of the globe's surface)` : '';
  const measure = measureName(why.measure);
  const sentence1 = `Band ${why.band + 1}, ${why.place}${ground}, ${trim(why.seconds)} s into the sweep at normal speed.`;
  if (why.reads === 0) {
    const what = why.noData ? ` (in this picture, ${why.noData})` : ' (masked, or outside the picture)';
    return (
      `${sentence1} The line read nothing there: every ${unit === 'pixels' ? 'pixel' : 'sample point'} of this cell is never read${what}. ` +
      `No data, so the held note ${why.held.name} is silent and no note can be struck. This is not a zero: the picture says nothing here.`
    );
  }
  const sentence2 =
    `The line read ${why.reads.toLocaleString('en')} ${unit} there. Their mean ${measure} is ${num(why.mean)}, so the level is ` +
    `(${num(why.mean)} − ${num(why.floor)}) ÷ (${num(why.full, 2)} − ${num(why.floor)}) = ${num(why.level, 2)}, kept between 0 and 1.`;
  const sentence3 =
    why.level > 0
      ? `The held note ${why.held.name} sounds at ${percent(why.level)} of its full loudness.`
      : `The held note ${why.held.name} is silent here.`;
  return [sentence1, sentence2, sentence3, explainChime(why)].join(' ');
}

/** A cell's struck note in a few words, as the table's "Struck note" column gives it. */
export function chimeSummary(c: ChimeWhy): string {
  if (c.status === 'struck') return `${c.instrument} ${c.name}`;
  if (c.status === 'left out') return c.reason === 'spacing' ? 'peak, left out: too close to a stronger one' : 'peak, left out: a stronger peak in this column';
  if (c.reason === 'no data') return 'none: no data';
  return c.reason === 'no colour' ? 'none: no colour' : c.reason === 'below level' ? 'none: below the peak level' : 'none: not a peak';
}

/** A cell's held note in a few words, as the table's "Held note" column gives it. A cell that read
 *  nothing says so: it is silent because there is no data, not because its level is 0. */
export function heldSummary(why: BandWhy): string {
  if (why.reads === 0) return `${why.held.name}, silent: no data`;
  return why.level > 0 ? `${why.held.name} at ${Math.round(100 * why.level)}%` : `${why.held.name}, silent`;
}

/** Which band of a column is explained in full: the one the listener picked (with the list, or by
 *  clicking the picture), else the loudest struck note, else the loudest held note, else the lowest band. */
export function chosenBand(list: BandWhy[], pick: number | null): BandWhy {
  if (pick !== null && list[pick]) return list[pick];
  const struck = list.filter((b) => b.chime.status === 'struck').sort((a, b) => b.level - a.level)[0];
  return struck ?? [...list].sort((a, b) => b.level - a.level)[0] ?? list[0];
}

/** The struck note nearest a cell in the same band, and how many columns away it is (negative is
 *  earlier). On the radar the distance is taken round the circle, so the ends of the turn are
 *  neighbours. Of two equally near, the earlier wins. Null when the band has no struck note. */
export function nearestStruck(score: ScanScore, column: number, band: number): { chime: Chime; offset: number } | null {
  const { columns } = score.grid;
  let best: { chime: Chime; offset: number } | null = null;
  for (const chime of score.chimes) {
    if (chime.band !== band) continue;
    let offset = chime.column - column;
    if (score.shape === 'radar') {
      offset = ((offset % columns) + columns) % columns; // 0 to columns − 1 later
      if (offset > columns / 2) offset -= columns; // or that many earlier, whichever is nearer
    }
    const nearer = !best || Math.abs(offset) < Math.abs(best.offset) || (Math.abs(offset) === Math.abs(best.offset) && offset < best.offset);
    if (nearer) best = { chime, offset };
  }
  return best;
}

/**
 * The line under the picture about the place being explained: which cell, its held note and its
 * struck note in the table's words. Where no note is struck, the nearest struck note in the same band,
 * so a click on the middle of a spot of colour can find the note that spot made.
 */
export function explainPick(why: BandWhy, score: ScanScore, ctx: WhyContext): string {
  const { columns, seconds } = score.grid;
  const head = `Column ${why.column + 1} of ${columns}, band ${why.band + 1}. Held note: ${heldSummary(why)}. Struck note: ${chimeSummary(why.chime)}.`;
  if (why.chime.status === 'struck') return head;
  const near = nearestStruck(score, why.column, why.band);
  if (!near) return `${head} No note is struck in this band in this sweep.`;
  const steps = Math.abs(near.offset);
  const when = `${steps} column${steps === 1 ? '' : 's'} ${near.offset < 0 ? 'earlier' : 'later'} (${trim((steps * seconds) / columns)} s at normal speed)`;
  const name = `${instrumentName(near.chime.colour, ctx)} ${noteName(chimeNote(near.chime))}`;
  return `${head} Nearest struck note in this band: column ${near.chime.column + 1}, ${when}: ${name}.`;
}

/** The low note: which one, why, and what the picture sets about it. */
export function explainRoot(root: { name: string; loudness: number; bandsWithData?: number }, seconds: number, bands: number): string {
  const withData = root.bandsWithData ?? bands;
  const over =
    withData === bands
      ? `the mean level of the ${bands} bands`
      : withData === 0
        ? `nothing: none of the ${bands} bands read anything here, so it is silent`
        : `the mean level of the ${withData} bands that read something (the other ${bands - withData} have no data)`;
  return (
    `Low note ${root.name}, fixed by a timetable and not by the picture: it steps through ${ROOT_PROGRESSION.join(', ')} in C, one step every ${ROOT_STEP_SECONDS} s ` +
    `(${trim(seconds)} s into the sweep at normal speed). The picture sets only how loud it is: ${over}${withData === 0 ? '' : `, ${percent(root.loudness)}`}.`
  );
}
