// The fixed choices behind the picture scan, for one picture: what each is, why it was made, and
// what supports it, with the same tag the team uses everywhere (CONTRIBUTING.md): Verified, Design
// choice or Unverified. The app shows this list, and a test fails if an entry lacks a reason, a
// source or a tag. Numbers that the rule holds are read from the rule; numbers that were measured
// are read from the picture's own measurements (data/sources.ts, `scan.measured`, which a test
// checks against docs/measurements/scan_pictures.json), so the list cannot drift from either.
//
// Every list is about ONE picture. It quotes that picture's numbers and no other's: each picture is
// drawn and measured with its own settings, and numbers are never compared between pictures.
//
// Two kinds, kept visibly apart on screen:
//   rule        a choice about how the picture becomes sound: it changes what a listener can learn
//   decoration  a choice that carries no data: the picture cannot change it
import { HARP_PLUCK } from './instruments';
import {
  BAND_NOTE_NAMES,
  CHIME_RULE,
  LINE_GRID,
  PAN_WIDTH,
  RADAR_GRID,
  ROOT_NOTES,
  ROOT_PROGRESSION,
  ROOT_STEP_SECONDS,
  SCAN_SCALE,
  noteName,
} from './scanScore';
import type { ScanRule } from '../data/sources';

export type ChoiceTag = 'Verified' | 'Design choice' | 'Unverified';
export type ChoiceKind = 'rule' | 'decoration';

export interface ScanChoice {
  id: string;
  kind: ChoiceKind;
  name: string;
  what: string;
  why: string;
  /** What supports it, or what is missing: a source, a test, or a measurement with its file. */
  evidence: string;
  tag: ChoiceTag;
}

export const CHOICE_TAGS: ChoiceTag[] = ['Verified', 'Design choice', 'Unverified'];

/** The picture a list is about: its rule, and its short name. */
export interface ChoicePicture {
  /** "Ocean", "Aerosols", "Rain", "Practice". */
  label: string;
  scan: ScanRule;
}

const MEASURED = 'docs/measurements/scan_pictures.md';
/** "12 of 255" for a floor of 12/255. */
const of255 = (x: number) => `${Number((x * 255).toFixed(2))} of 255`;
const sounds = (n: number) => (n === 0 ? 'none sounds' : n === 1 ? '1 sounds' : `${n} sound`);

/** A number the picture's measurement wrote. A missing one is an error, never a guess. */
function m(p: ChoicePicture, key: string): number {
  const value = p.scan.measured[key];
  if (value === undefined) throw new Error(`${p.label}: no measured "${key}" (data/sources.ts, scan.measured)`);
  return value;
}
/** The made-up practice picture: it has answers the unit tests know, not measurements. */
const isTest = (p: ChoicePicture) => p.scan.status === 'test input';
/** The ocean picture keeps the evidence it was built with (the uncompressed frame). */
const isOcean = (p: ChoicePicture) => p.scan.measured.exactQuiet90Cells !== undefined;

function stillChoice(p: ChoicePicture): ScanChoice {
  const s = p.scan.still;
  const time = s.time ? ` (${s.time.replace('T', ' ').replace('Z', ' UTC')})` : '';
  return {
    id: 'still',
    kind: 'rule',
    name: 'Which picture is read',
    what: `One still: ${s.frame}${time}, ${s.how}.`,
    why: 'The scan reads one still, so the same picture always gives the same notes.',
    evidence: isTest(p)
      ? 'Made by the code, not NASA data.'
      : p.scan.measured.stillCandidates !== undefined
        ? `Measured (${MEASURED}): compared with each of the ${m(p, 'stillCandidates')} frames, the still is closest to ${s.frame} (${m(p, 'stillDifference')} grey levels a channel on average; the next closest, ${m(p, 'stillRunnerUpDifference')}).`
        : `Measured (${MEASURED}): the still differs from NASA's frame by ${m(p, 'stillDifference')} grey levels a channel on average (it is a compressed, smaller copy).`,
    tag: isTest(p) ? 'Design choice' : 'Verified',
  };
}

function floorChoice(p: ChoicePicture): ScanChoice {
  const what = `A cell whose mean is at or below ${of255(p.scan.floor)} plays nothing.`;
  if (isTest(p) || isOcean(p)) {
    return {
      id: 'floor',
      kind: 'rule',
      name: 'Floor',
      what,
      why: isTest(p)
        ? 'The settings of the NASA picture this made-up picture stands in for.'
        : 'It is the tolerance the team\'s land rule already allows for JPEG noise on grey land, so black sea and grey land stay silent.',
      evidence: isTest(p)
        ? 'TEST INPUT: a made-up picture whose ground is below this floor; the unit tests check that it is silent.'
        : `Measured (${MEASURED}): of the ${m(p, 'exactQuiet90Cells')} cells that are 90% or more grey land or black sea in the uncompressed frame, ${sounds(m(p, 'exactQuiet90Sounding'))}; the largest has a mean of ${m(p, 'exactQuiet90Largest255')} of 255.`,
      tag: 'Design choice',
    };
  }
  const quietSounding = m(p, 'quiet90Sounding');
  return {
    id: 'floor',
    kind: 'rule',
    name: 'Floor',
    what,
    why: `The commonest colour the scan reads in this picture has a colour strength of ${m(p, 'backgroundSpread')} grey levels. The floor is that plus 12, the tolerance for JPEG noise, so where nothing is drawn stays silent.`,
    evidence:
      `Measured (${MEASURED}): of the ${m(p, 'quiet90Cells')} cells that are 90% or more that colour, ${sounds(quietSounding)}${quietSounding > 0 ? ', and the rest of its pixels are drawn data' : ''}.` +
      (p.scan.measured.legend10Cells !== undefined
        ? ` The cost: of the ${m(p, 'legend10Cells')} cells that are 10% or more drawn in a colour of NASA's bar, ${m(p, 'legend10Sounding')} sound.`
        : ''),
    tag: 'Design choice',
  };
}

function fullLevelChoice(p: ChoicePicture): ScanChoice {
  return {
    id: 'full-level',
    kind: 'rule',
    name: 'Full level',
    what: `A map-sweep cell with a mean of ${p.scan.full.line} plays at full loudness; a radar cell, ${p.scan.full.radar}.`,
    why: isTest(p)
      ? 'The settings of the NASA picture this made-up picture stands in for.'
      : isOcean(p)
        ? `The most colourful map-sweep cell of this picture measures ${m(p, 'largestLineMean')}, so 0.5 is its full level. Thin lines can fill the small radar cells up to about ${m(p, 'largestRadarMean')}.`
        : `The most colourful map-sweep cell of this picture measures ${m(p, 'largestLineMean').toFixed(3)} and the most colourful radar cell ${m(p, 'largestRadarMean').toFixed(2)}. Each is rounded up to 0.05, so no cell is clipped.`,
    evidence: isTest(p) ? 'A unit test checks the made-up picture\'s levels.' : `Measured on this picture's still (${MEASURED}). Each picture has its own full level.`,
    tag: 'Design choice',
  };
}

function maskChoice(p: ChoicePicture): ScanChoice | null {
  if (!p.scan.mask) return null;
  const share = isTest(p) ? 'the hatched block of the made-up picture' : `${m(p, 'maskPct')}% of the still`;
  return {
    id: 'mask',
    kind: 'rule',
    name: 'Pixels never read',
    what: `The scan never reads ${p.scan.mask.what} (${share}). A cell that reads nothing is "no data": it is silent, it is never struck, and it is not counted as a zero.`,
    why: 'Colour there is not data: a strongly coloured photo would sound as if it were drawn data.',
    evidence: isTest(p)
      ? 'TEST INPUT: a made-up mask. Unit tests check that a masked cell is no data.'
      : 'The land is exactly what analysis/prepare_scene.py uses for this picture\'s regions (written by analysis/scan_mask.py); inside both circles it matches the regions\' own masks pixel for pixel. Unit tests check that a masked cell is no data.',
    tag: 'Design choice',
  };
}

function chimeRuleChoice(p: ChoicePicture): ScanChoice {
  const circle = (i: number) => {
    const peaks = m(p, `radar${i}Peaks`);
    return peaks === 0 ? 'no peak reaches the chime level on the other' : `${m(p, `radar${i}LeftOut`)} of ${peaks}`;
  };
  return {
    id: 'chime-rule',
    kind: 'rule',
    name: 'Which peaks are struck',
    what: `A peak needs a smoothed level of ${CHIME_RULE.minLevel}; two notes in one band are at least ${CHIME_RULE.minGap} columns apart; a column starts at most ${CHIME_RULE.perColumn} note.`,
    why: 'It keeps the struck notes few enough to hear one by one.',
    evidence: isTest(p)
      ? 'Unit tests check the rule on made-up pictures with known answers.'
      : `Measured (${MEASURED}): on this picture's map sweep it leaves out ${m(p, 'lineLeftOut')} of ${m(p, 'linePeaks')} peaks; on its two circles, ${circle(0)} and ${circle(1)}.`,
    tag: 'Design choice',
  };
}

function instrumentSwitch(p: ChoicePicture): ScanChoice {
  const { warm, cool, blue } = p.scan.instruments;
  const what = blue
    ? 'Each struck note looks at the colour drawn in its cell (the pixels above the floor). Where red is the largest channel (red side of yellow), that colour counts for the warm instrument; where blue is (a tie with green counts as blue), for the third instrument; otherwise for the cool one. The largest share wins.'
    : 'If half or more of the colour drawn in a cell (the pixels above the floor) has red as its largest channel (red and orange), the note is struck on the warm instrument. Otherwise (yellow-green, green, blue) it is struck on the cool one.';
  let evidence: string;
  if (isTest(p)) {
    evidence = 'A unit test checks each dot of the TEST INPUT picture strikes the instrument its colour says.';
  } else if (p.scan.measured.bar0SwitchValue !== undefined) {
    evidence = `On NASA's colour bar for this picture the rule switches at ${m(p, 'bar0SwitchPct')}% of the bar's length, which is ${m(p, 'bar0SwitchValue')} °C if the bar's scale is even (${MEASURED}). Unverified: that the bar's scale is even, and that the lines in the frame use the bar's colours.`;
  } else if (blue) {
    evidence =
      `Measured on NASA's two bars (${MEASURED}): ${m(p, 'bar0WarmSteps')} of the rain bar's ${m(p, 'bar0Steps')} steps are on the warm side, from step ${m(p, 'bar0SwitchStep')} on; ` +
      `${m(p, 'bar1BlueSteps')} of the snow bar's ${m(p, 'bar1Steps')} steps and ${m(p, 'bar0BlueSteps')} of the rain bar's steps are on the blue side, so snow and rain never share an instrument. ` +
      'Unverified: what amount of rain each step stands for (the bar has no numbers; the legend gives them in words).';
  } else {
    evidence = `Measured on NASA's colour bar (${MEASURED}): ${m(p, 'bar0WarmSteps')} of its ${m(p, 'bar0Steps')} swatches is on the warm side. The swatch names were read by eye from the bar.`;
  }
  return {
    id: 'instrument-switch',
    kind: 'rule',
    name: 'Which instrument strikes a note',
    what: `${what} In this picture the warm instrument means ${warm}; the cool one, ${cool}${blue ? `; the third, ${blue}` : ''}.`,
    why: `NASA's own sonifications use one instrument for red and orange stars and another for blue.${blue ? ' This picture\'s legend gives its blue colours (snow) their own meaning, so they have their own instrument (Developer A, 15 Nov).' : ''}`,
    evidence,
    tag: 'Design choice',
  };
}

/** Every fixed choice behind the scan of ONE picture: rules first, then decoration. */
export function scanChoicesFor(p: ChoicePicture): ScanChoice[] {
  const rules: (ScanChoice | null)[] = [
    stillChoice(p),
    {
      id: 'pitch-spacing',
      kind: 'rule',
      name: 'Which note a band plays',
      what: `The ${BAND_NOTE_NAMES.length} held notes are ${BAND_NOTE_NAMES.join(' ')}: far apart at the bottom (a fifth, then a fourth) and close together at the top.`,
      why: 'Notes a step apart sound muddy when they are low, and on the radar every band sounds at once. The first version climbed the scale one step at a time from C3 and its three lowest notes blurred together.',
      evidence:
        'Developer A heard the blur in the first listening round, which is one opinion, not a test. No source has been read for the general claim that low notes blur, so the claim is unverified.',
      tag: 'Unverified',
    },
    floorChoice(p),
    fullLevelChoice(p),
    maskChoice(p),
    {
      id: 'sweep-time',
      kind: 'rule',
      name: 'Length of a sweep',
      what: `The map sweep takes ${LINE_GRID.seconds} s (${LINE_GRID.columns} columns); a radar turn ${RADAR_GRID.seconds} s (${RADAR_GRID.columns} columns), at normal speed.`,
      why: 'Thirty seconds is the length of the Earth rhythm\'s loop, and both scans advance 8 columns a second.',
      evidence: 'Nothing to measure: a choice of pace.',
      tag: 'Design choice',
    },
    chimeRuleChoice(p),
    {
      id: 'chime-octave',
      kind: 'rule',
      name: 'Pitch of a struck note',
      what: 'A struck note is one octave above its band\'s held note, whichever instrument plays it.',
      why: 'Pitch says where the peak is, and the instrument says which colour it is.',
      evidence: 'A unit test checks it for every band and every instrument.',
      tag: 'Design choice',
    },
    instrumentSwitch(p),
  ];
  const decoration: (ScanChoice | null)[] = [
    {
      id: 'scale',
      kind: 'decoration',
      name: 'Scale',
      what: `${SCAN_SCALE}: C D E G A.`,
      why: 'No two of the held notes are a semitone, a tritone or a major seventh apart, so any mix of them sounds without a clash. The melody keys use the same five notes.',
      evidence: 'A unit test checks that none of the 12 held notes clash.',
      tag: 'Design choice',
    },
    {
      id: 'bar-tones',
      kind: 'decoration',
      name: 'Tones of a struck note',
      what: 'A struck note is a few sine tones at the ratios of a vibrating bar: bells 1 : 2.7565 : 5.4039 : 8.9330, music box and kalimba 1 : 6.2669 : 17.5475, marimba 1 : 4 : 9.2.',
      why: 'They are the tones real bars make, so the instruments sound like what they are named after, with no recordings.',
      evidence: 'Solved again from cos x · cosh x = ±1 in a unit test. The marimba\'s 4 and 9.2 are from source S12 in docs/DECISIONS.md.',
      tag: 'Verified',
    },
    p.scan.instruments.blue
      ? {
          id: 'harp-tones',
          kind: 'decoration',
          name: 'Tones of the third instrument',
          what: `The harp is a plucked string: tones 1 : 2 : 3 … 8, tone n as loud as sin(nπp) ÷ n compared with the first, plucked at p = ${HARP_PLUCK} of its length; tone n rings 1 ÷ n as long.`,
          why: 'A string plucked at p starts as a triangle, and the force it puts on the bridge gives each tone that loudness. Harmonic tones sound unlike the three struck bars.',
          evidence:
            'A unit test sums the Fourier series back into the plucked triangle and checks every tone. The pluck point, the number of tones and the fade are our choices. Nobody has listened yet, so that it is easy to tell apart is unverified.',
          tag: 'Design choice',
        }
      : null,
    {
      id: 'low-note',
      kind: 'decoration',
      name: 'The low note\'s steps',
      what: `The low note steps through ${ROOT_PROGRESSION.join(', ')} in C (${ROOT_NOTES.map(noteName).join(', ')}), one step every ${ROOT_STEP_SECONDS} s.`,
      why: 'It makes the scan move like music instead of one long drone. The picture sets only how loud the low note is.',
      evidence:
        'Recorded on 15 Nov: in each of 8 steps the expected root is the strongest of the four root tones. F is not a note of the scale: under it the held E is a major seventh above, the one sharp interval in the scan.',
      tag: 'Design choice',
    },
    {
      id: 'pan',
      kind: 'decoration',
      name: 'Left and right',
      what: `The sound sits where the line is, at most ${PAN_WIDTH} of the way to one speaker: the map sweep travels left to right, the radar swings right, centre, left, centre.`,
      why: 'It repeats what the screen shows, so no fact is given by stereo alone.',
      evidence: 'The position depends only on where the line is, never on the picture. Recorded (docs/measurements/scan_sound.md): the left channel is the louder in the first sixth of the map sweep and the right in the last sixth.',
      tag: 'Design choice',
    },
    {
      id: 'scan-sound',
      kind: 'decoration',
      name: 'Scan sound',
      what: 'Ocean choir, Music box and Plain play the same score: the same notes at the same times. Only the instruments change.',
      why: 'A listener can compare the instruments without the notes changing.',
      evidence: 'A browser test compares the first chime of the three sounds. It does not yet compare a longer stretch.',
      tag: 'Design choice',
    },
  ];
  return [...rules, ...decoration].filter((c): c is ScanChoice => c !== null);
}
