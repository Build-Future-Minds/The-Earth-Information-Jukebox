// Why the picture scan sounds the way it does: for any cell of the score, the place on the
// picture, what was measured there, and how that became a pitch, a loudness and an instrument.
// Pure functions on a ScanScore (no audio, no DOM), like the rule itself, so every sentence can be
// tested against the numbers it quotes. The Earth voice does the same with its `why` record and
// "Explain this rhythm"; this is the scan's equivalent.
//
// A sentence is built from the score and the rule's own constants only. It cannot say anything the
// score does not hold, so it cannot disagree with the sound.
import {
  CHIME_RULE,
  ROOT_PROGRESSION,
  ROOT_STEP_SECONDS,
  STRENGTH_FLOOR,
  bandNote,
  chimeNote,
  chimeVelocity,
  columnMean,
  columnTime,
  noteName,
  rootNoteAt,
  smoothedLevel,
  type Chime,
  type ScanScore,
} from './scanScore';

export interface WhyContext {
  /** `world`: the picture is a whole-world equirectangular map, so places are longitudes and
   *  latitudes. `plain`: any other picture, so places are shares of the way across and up. */
  geometry: 'world' | 'plain';
  /** The names the screen uses for the sounds of the chosen scan sound. */
  names: { held: string; warm: string; cool: string };
}

/** What happens to one cell's peak, if it has one. */
export type ChimeWhy =
  | { status: 'struck'; midi: number; name: string; instrument: string; velocity: number; smoothed: number; warmShare: number }
  | { status: 'left out'; reason: 'spacing' | 'column'; by: { column: number; band: number }; smoothed: number }
  | { status: 'none'; reason: 'no colour' | 'below level' | 'not a peak'; smoothed: number };

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
  /** Pixels read (sample points on the radar). */
  reads: number;
  measure: ScanScore['measure'];
  /** The mean of the measure over what was read, 0 to 1. */
  mean: number;
  floor: number;
  full: number;
  level: number;
  held: { midi: number; name: string };
  chime: ChimeWhy;
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

/** What the scan knows about one cell. Columns and bands outside the score are brought inside it. */
export function whyBand(score: ScanScore, column: number, band: number, ctx: WhyContext): BandWhy {
  const { columns, bands } = score.grid;
  column = Math.min(columns - 1, Math.max(0, Math.round(column)));
  band = Math.min(bands - 1, Math.max(0, Math.round(band)));
  const cell = column * bands + band;
  const cyclic = score.shape === 'radar';
  const smoothed = smoothedLevel(score.levels, score.grid, cyclic, column, band);
  const place = placeOf(score, column, band, ctx.geometry);

  let chime: ChimeWhy;
  const struck: Chime | undefined = score.chimes.find((c) => c.column === column && c.band === band);
  const dropped = score.dropped.find((d) => d.column === column && d.band === band);
  if (struck) {
    chime = {
      status: 'struck',
      midi: chimeNote(struck),
      name: noteName(chimeNote(struck)),
      instrument: struck.warm ? ctx.names.warm : ctx.names.cool,
      velocity: chimeVelocity(struck.level),
      smoothed: struck.level,
      warmShare: score.warmShare[cell],
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
    floor: STRENGTH_FLOOR,
    full: score.grid.fullStrength,
    level: score.levels[cell],
    held: { midi: bandNote(band), name: noteName(bandNote(band)) },
    chime,
  };
}

/** The whole column under the line: the low note, and every band from the lowest up. */
export function whyColumn(score: ScanScore, column: number, ctx: WhyContext) {
  const { columns, bands } = score.grid;
  column = Math.min(columns - 1, Math.max(0, Math.round(column)));
  const root = rootNoteAt(score.grid, column);
  return {
    column,
    seconds: columnTime(score.grid, column),
    root: { midi: root, name: noteName(root), loudness: columnMean(score, column) },
    bands: Array.from({ length: bands }, (_, band) => whyBand(score, column, band, ctx)),
  };
}

const measureName = (m: ScanScore['measure']) => (m === 'colour' ? 'colour strength' : 'brightness');
const num = (x: number, digits = 3) => x.toFixed(digits);

/** What the scan did with one cell's peak, as a sentence. */
export function explainChime(why: BandWhy): string {
  const c = why.chime;
  const rule = `a level of ${num(CHIME_RULE.minLevel, 2)} or more once smoothed over three columns, higher than the column before it and at least as high as the one after`;
  if (c.status === 'struck') {
    const side =
      c.warmShare >= 0.5
        ? `${percent(c.warmShare)} of its colour is on the red side of yellow (half or more)`
        : c.warmShare === 0
          ? 'none of its colour is on the red side of yellow'
          : `only ${percent(c.warmShare)} of its colour is on the red side of yellow (less than half)`;
    return (
      `A note is struck here: this cell is a peak (smoothed level ${num(c.smoothed, 2)}; a peak needs ${rule}). ` +
      `${side[0].toUpperCase()}${side.slice(1)}, so the note is played on the ${c.instrument}, ` +
      `an octave above the held note: ${c.name}, at strength ${num(c.velocity, 2)} (0.35 + 0.65 × ${num(c.smoothed, 2)}).`
    );
  }
  if (c.status === 'left out') {
    const where = c.by.column === why.column ? 'in the same column' : `${Math.abs(c.by.column - why.column)} column${Math.abs(c.by.column - why.column) === 1 ? '' : 's'} ${c.by.column > why.column ? 'later' : 'earlier'}`;
    return c.reason === 'spacing'
      ? `No note is struck here. This cell is a peak (smoothed level ${num(c.smoothed, 2)}), but a stronger one in the same band, ${where}, is closer than ${CHIME_RULE.minGap} columns, so it gives way.`
      : `No note is struck here. This cell is a peak (smoothed level ${num(c.smoothed, 2)}), but a stronger peak in band ${c.by.band + 1} starts in the same column, and a column starts at most ${CHIME_RULE.perColumn} note${CHIME_RULE.perColumn === 1 ? '' : 's'}.`;
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
  const sentence2 =
    `The line read ${why.reads.toLocaleString('en')} ${unit} there. Their mean ${measure} is ${num(why.mean)}, so the level is ` +
    `(${num(why.mean)} − ${num(why.floor)}) ÷ (${num(why.full, 2)} − ${num(why.floor)}) = ${num(why.level, 2)}, kept between 0 and 1.`;
  const sentence3 =
    why.level > 0
      ? `The held note ${why.held.name} sounds at ${percent(why.level)} of its full loudness.`
      : `The held note ${why.held.name} is silent here.`;
  return [sentence1, sentence2, sentence3, explainChime(why)].join(' ');
}

/** The low note: which one, why, and what the picture sets about it. */
export function explainRoot(root: { name: string; loudness: number }, seconds: number, bands: number): string {
  return (
    `Low note ${root.name}, fixed by a timetable and not by the picture: it steps through ${ROOT_PROGRESSION.join(', ')} in C, one step every ${ROOT_STEP_SECONDS} s ` +
    `(${trim(seconds)} s into the sweep at normal speed). The picture sets only how loud it is: the mean level of the ${bands} bands, ${percent(root.loudness)}.`
  );
}
