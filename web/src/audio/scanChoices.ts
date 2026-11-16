// The fixed choices behind the picture scan, in one list: what each is, why it was made, and what
// supports it, with the same tag the team uses everywhere (CONTRIBUTING.md): Verified, Design
// choice or Unverified. The app shows this list, and a test fails if an entry lacks a reason, a
// source or a tag. Numbers that the rule holds are read from the rule, so the list cannot drift
// from the code. Numbers that were measured are cited with the file they came from.
//
// Two kinds, kept visibly apart on screen:
//   rule        a choice about how the picture becomes sound: it changes what a listener can learn
//   decoration  a choice that carries no data: the picture cannot change it
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
  STRENGTH_FLOOR,
  noteName,
} from './scanScore';

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

export const SCAN_CHOICES: ScanChoice[] = [
  {
    id: 'pitch-spacing',
    kind: 'rule',
    name: 'Which note a band plays',
    what: `The ${BAND_NOTE_NAMES.length} held notes are ${BAND_NOTE_NAMES.join(' ')}: far apart at the bottom (a fifth, then a fourth) and close together at the top.`,
    why: 'Notes a step apart sound rough when they are low, and on the radar every band sounds at once. The first version climbed the scale one step at a time from C3 and its three lowest notes blurred together.',
    evidence:
      'Plomp and Levelt (1965, source S13) found two tones roughest when they are a quarter of a critical bandwidth apart, and that intervals grow more dissonant below about 500 Hz, which "reflects the musical practice to avoid thirds at low frequencies". Measured on 15 Nov (docs/measurements/scan_spacing.md): the first version\'s lowest neighbours were 0.18 and 0.20 of a critical bandwidth apart, the current ones (C3–G3, G3–C4) 0.72 and 0.71; a roughness model of the choir with all notes at full level gives the current spacing 0.49 of the first\'s. Developer A heard the blur in the first listening round: one opinion, not a test. Unverified: that the new spacing sounds clearer. Nobody has listened to compare.',
    tag: 'Design choice',
  },
  {
    id: 'floor',
    kind: 'rule',
    name: 'Floor',
    what: `A cell whose mean is at or below ${Math.round(STRENGTH_FLOOR * 255)} of 255 plays nothing.`,
    why: 'It is the tolerance the team\'s land rule already allows for JPEG noise on grey land, so black sea and grey land stay silent.',
    evidence:
      'Measured on 15 Nov (docs/measurements/scan_pictures.md): of the 746 ocean cells that are 90% or more grey land or black sea in the uncompressed frame, none sounds; the largest has a mean of 7.67 of 255.',
    tag: 'Design choice',
  },
  {
    id: 'full-level',
    kind: 'rule',
    name: 'Full level',
    what: `A map-sweep cell with a mean of ${LINE_GRID.fullStrength} plays at full loudness; a radar cell, ${RADAR_GRID.fullStrength}.`,
    why: 'The most colourful map-sweep cell on the ocean picture measures 0.463, so 0.5 is its full level. Thin lines can fill the small radar cells up to about 0.8.',
    evidence:
      'Measured on 15 Nov (docs/measurements/scan_pictures.md). Each picture needs its own full level, and it is set only for the ocean picture, the one the scan plays. By colour, the most colourful map-sweep cell of the aerosol still measures 0.429 and of the rain still 0.622.',
    tag: 'Design choice',
  },
  {
    id: 'sweep-time',
    kind: 'rule',
    name: 'Length of a sweep',
    what: `The map sweep takes ${LINE_GRID.seconds} s (${LINE_GRID.columns} columns); a radar turn ${RADAR_GRID.seconds} s (${RADAR_GRID.columns} columns), at normal speed.`,
    why: 'Thirty seconds is the length of the Earth rhythm\'s loop, and both scans advance 8 columns a second.',
    evidence: 'Nothing to measure: a choice of pace.',
    tag: 'Design choice',
  },
  {
    id: 'chime-rule',
    kind: 'rule',
    name: 'Which peaks are struck',
    what: `A peak needs a smoothed level of ${CHIME_RULE.minLevel}; two notes in one band are at least ${CHIME_RULE.minGap} columns apart; a column starts at most ${CHIME_RULE.perColumn} note.`,
    why: 'It keeps the struck notes few enough to hear one by one.',
    evidence:
      'Measured on 15 Nov (docs/measurements/scan_pictures.md): on the ocean map sweep it leaves out 44 of 112 peaks, and on the two radar circles 46 of 102 and 115 of 187.',
    tag: 'Design choice',
  },
  {
    id: 'chime-octave',
    kind: 'rule',
    name: 'Pitch of a struck note',
    what: 'A struck note is one octave above its band\'s held note, whichever instrument plays it.',
    why: 'Pitch says where the peak is, and the instrument says which colour it is.',
    evidence: 'A unit test checks it for every band and both instruments.',
    tag: 'Design choice',
  },
  {
    id: 'instrument-switch',
    kind: 'rule',
    name: 'Which instrument strikes a note',
    what: 'If half or more of a cell\'s colour has red as its largest channel (red and orange), the note is struck on the warm instrument. Otherwise (yellow-green, green, blue) it is struck on the cool one.',
    why: 'NASA\'s own sonifications use one instrument for red and orange stars and another for blue.',
    evidence:
      'Measured on 15 Nov (docs/measurements/scan_pictures.md): on NASA\'s colour bar for the ocean picture the rule switches at 23.6 °C; the bar\'s four printed labels lie on one straight line within 0.07 °C. The picture\'s lines use the bar\'s hues: 99.65% of their colour is on the same side of the switch as the bar colour of the same hue. They are not the bar\'s exact colours (they are more saturated), and we measured colours, not the sea.',
    tag: 'Design choice',
  },
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
    evidence: 'Recorded on 15 Nov (docs/measurements/scan_sound.md): the left channel is 8.3 dB louder in the first sixth of the map sweep, the right 10.2 dB louder in the last sixth.',
    tag: 'Design choice',
  },
  {
    id: 'scan-sound',
    kind: 'decoration',
    name: 'Scan sound',
    what: 'Ocean choir, Music box and Plain play the same score: the same notes at the same times. Only the instruments change.',
    why: 'A listener can compare the instruments without the notes changing.',
    evidence:
      'Every chime in 10 s is compared across the three sounds: where, which instrument, which note, over which root, left or right, and when. A browser test does it on the test picture (two chimes); npm run measure does it on the ocean picture, 21 chimes in the first 10 s of the map sweep, all the same (docs/measurements/scan_sound.md).',
    tag: 'Design choice',
  },
];
