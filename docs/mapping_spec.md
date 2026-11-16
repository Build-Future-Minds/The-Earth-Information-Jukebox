# Mapping spec: one rhythm rule

Owner: Developer A. This follows the Team Briefing. Everything here is a **sound rule we choose**.
It describes the rendered image. It does not measure water speed, turbulence or ocean health.

## Version one: one rule

**We measure how strongly visible lines line up along a common angle.**
More alignment gives more even pulse spacing. Less alignment gives stronger long–short spacing.

"Long–short" names the order you hear: a long gap after the first pulse, then a short gap. The
Team Briefing and drafts before 15 Nov call it "short–long"; that was renamed on 15 Nov (words
only: no number, sound or file changed).

### Measurement: alignment `A`, 0 to 1

For each still frame, inside the region and outside the exclusion mask:

1. Brightness is the largest of red, green and blue, so a line counts the same whatever its
   colour. Blur lightly, then compute the image gradient at each pixel (Sobel). Its strength
   is `mᵢ`, in grey levels per pixel; the line direction is the angle `θᵢ` at right angles to
   the gradient.
2. A line at 10° and a line at 190° are the same line, so double the angle before averaging.
3. `A = ‖Σ mᵢ² (cos 2θᵢ, sin 2θᵢ)‖ / Σ mᵢ²`, using only pixels with `mᵢ` above a threshold.

Plain language: every bit of visible line votes with an arrow along its angle, and stronger
lines get longer arrows. Add the arrows tip to tail. If the lines all run the same way, the
total is as long as it can be and `A` is 1. If they run every which way, the arrows cancel and
`A` is near 0.

Step 3 is the standard "structure tensor coherence",
`√((Jxx − Jyy)² + 4 Jxy²) / (Jxx + Jyy)`. The first draft weighted each pixel by `mᵢ`; it is now
`mᵢ²`. Both were tested and rank the test pictures the same way (`science_review.md` section 5).
Derivation: `math_notes.md`. Code: `analysis/sonata_math/image_analysis.py`.

### Sound: pulse spacing

Each beat is split into two pulses. `A` sets where the second pulse falls.

| `A` | Split of the beat | Sounds like |
| --- | --- | --- |
| 1.0 | 50 / 50 | Even |
| 0.5 | about 62 / 38 | Slight lilt |
| 0.0 | 75 / 25 | Strong long–short |

Starting formula: `long_fraction = 0.75 − 0.25 × A`. Tune the end points by ear, then freeze them.
Tempo, pitch, timbre and loudness stay fixed and carry no data.

One measured step is one beat. Pulse 1 starts the beat. Pulse 2 falls at `long_fraction` of the
way through it. The two gaps always add up to one beat, so the tempo never changes.

### Two worked examples (practice images — TEST INPUTS, not NASA data)

Measured by the engine, with a 1-second beat:

| Picture | `A` | `long_fraction` | Pulses in the beat | Gaps | Sounds like |
| --- | --- | --- | --- | --- | --- |
| Parallel lines | 1.00 | 0.50 | 0.00 s and 0.50 s | 0.50 s, 0.50 s | Even |
| Dashes at random angles | 0.09 | 0.73 | 0.00 s and 0.73 s | 0.73 s, 0.27 s | Strong long–short |

Pictures and timeline: `figures/math/02_test_gallery.png`, `figures/math/07_two_rhythms.png`.

### Missing information

If fewer than 5% of the circle's pixels pass the threshold (blank, masked or featureless crop), the step is marked
`missing` with a reason. The Earth voice goes **quiet** and the app shows a clear message.
Never invent a rhythm and never report `A = 0` for missing data.

### Fair comparison

Both regions use the same threshold, the same smoothing and the same sound settings, at the
same source moment. Both regions are circles of the same radius (61 px on the NASA frames):
small regions score higher by chance (`science_review.md` section 3), and the Kuroshio score
changes with the radius (section 9). Only pixels inside the circle are measured.

## Tests (practice images — TEST INPUTS, not NASA data)

| Case | Expected |
| --- | --- |
| Aligned: parallel stripes | `A` near 1; even pulses |
| Mixed: lines at random angles | `A` near 0; strong long–short |
| Reversed: stripes flipped 180° | Same `A` as aligned |
| Blank image | `missing`, reason given, Earth voice quiet |
| Masked: everything excluded | `missing`, reason given |
| Repeated: same image twice | Identical result both times |

Record expected and observed values for each in `science_review.md`.

Status 14 Nov: all six pass on practice images (`science_review.md` section 1; `pytest` in
`analysis/`). Draft circles on NASA frames: `science_review.md` section 9. The approved pair,
Equatorial Pacific and Kuroshio, and the files the app plays: section 10.

## What we do not claim

- Low alignment is **lines pointing different ways in a drawing**, not turbulence. A tidy swirl
  or two tidy sets of crossing lines also score low.
- Nothing here is a speed, a temperature or a statement about ocean health.
- The source is ECCO2 model output for one modelled year, not an observation and not a trend.
- Each region is a circle on the flat map, not on the Earth. Away from the equator it covers less
  ground east–west than north–south: the Kuroshio circle (28.8° N) is about 12% narrower
  east–west. Version one keeps flat circles (`science_review.md` section 6, row 11).
- Labels, colour bars, date stamps and land edges also have lines. Student A's mask must exclude them.
- Compression can add or blur edges. Use the downloadable frame set, not a compressed video.

## Later, only after version one passes

A second feature (for example on-screen motion between frames, or legend colour band) may
control a second sound property. It needs its own tests and its own honest wording first.

## Play along: the picture scan (an extra, not part of the rule)

Added 15 Nov by Developer A, in the app's "Play along" section. It is a second way to listen and
it is **not** the rhythm rule above: the Earth voice, its tests and the listening check do not
change. A browser test proves the Earth notes keep their schedule while the scan plays.

**Where the idea comes from. Verified** (read on NASA's pages, 15 Nov; sources S9 to S11 in
`DECISIONS.md`). NASA's image sonifications, made by SYSTEM Sounds (M. Russo, A. Santaguida),
sweep a line over a picture and turn what it crosses into sound:

- NGC 1569: "a bottom to top scan. Brighter light is higher pitched and louder."
- Caldwell 73: a radar line turns around the centre; "stars farther from the center are higher
  pitched"; "the entire image is converted to the sound of a choir", "the orange and red stars
  are represented by a marimba", "the blue stars are represented by a glockenspiel".
- Chandra's Galactic Center: left to right; "objects located towards the top of the image are
  heard as higher pitches while the intensity of the light controls the volume".

**Our version. Design choices**, the same for every picture and both regions.

| What the line crosses | What you hear |
| --- | --- |
| Where along the line: height on the map, north high (radar: distance from the centre) | Pitch. 12 bands, from C3 up to C6: C3 G3 C4 E4 G4 A4 C5 D5 E5 G5 A5 C6 |
| How much colour: the mean colour strength of the cell | Loudness of that band's held note. A louder line is also a little brighter in tone |
| A bright spot: a peak along the line's path | One struck note, an octave above that band's held note |
| The spot's colour: red side of yellow, or not | Which instrument strikes it: marimba, or bells |
| The whole line: mean level of the 12 bands | Loudness of one low note |
| Where the line is, left to right | The sound's place between the left and right speakers |

Colour strength of a pixel is `(largest − smallest of red, green, blue) ÷ 255`. Black sea, grey
land and white score 0, so they are silent. A pure colour scores 1. It is the same "spread" the
team's land rule uses. A cell's mean strength `s` becomes a level
`(s − floor) ÷ (full − floor)`, kept between 0 and 1.

| Setting | Whole picture (line) | Region (radar) |
| --- | --- | --- |
| Path | Left to right: west to east | From 3 o'clock, anticlockwise |
| Columns × bands | 240 × 12 | 120 × 12 |
| One sweep at speed 1 | 30 s, the Earth loop's length | 15 s |
| How a cell is read | Every pixel once | 16 points, 4 along the radius × 4 along the arc |
| Floor | 12 ÷ 255 | 12 ÷ 255 |
| Full level | 0.5 | 0.75 |

A chime needs a level of 0.3 or more at its peak, after smoothing over three columns with
weights 1, 2, 1. Two chimes in one band are at least 6 columns (0.75 s) apart, and one column
starts at most one chime; the stronger spot wins. A "spot" here is a whole cell: on the map sweep
1.5° of longitude wide and 15° of latitude tall. The rule leaves many peaks out. **Measured, 15 Nov**,
on the ocean still: 44 of 112 peaks on the map sweep, 46 of 102 on the Kuroshio radar and 115 of 187
on the Equatorial Pacific radar (`docs/measurements/scan_pictures.md`).

**Decoration that carries no data.** Three musical choices are fixed and the picture cannot
change them. The app says so in "How the picture becomes sound".

- The scale, C major pentatonic. It has no clashing pair of notes, and the melody keys use it too.
- How the 12 notes are spaced: far apart at the bottom (a fifth, then a fourth) and close at the
  top, the way a choir is spaced. The first version climbed step by step from C3, so C3, D3 and E3
  blurred together whenever they sounded at once, which on the radar is all the time.
  **Source, read 15 Nov (S13 in `DECISIONS.md`):** Plomp and Levelt (1965) found two pure tones
  most dissonant a quarter of a critical bandwidth apart and consonant from a whole bandwidth on
  (p. 555), and wrote that below about 500 Hz "the intervals become more and more dissonant", which
  "reflects the musical practice to avoid thirds at low frequencies and to use mostly octaves or
  wider intervals" (p. 556). **Measured, 15 Nov** (`docs/measurements/scan_spacing.md`), with their
  bandwidth curve:
  - the first version's lowest neighbours, C3–D3 and D3–E3, were 0.18 and 0.20 of a bandwidth
    apart, close to the roughest point;
  - the current C3–G3 and G3–C4 are 0.72 and 0.71;
  - 8 of the first spacing's 11 neighbouring pairs were closer than half a bandwidth, and 1 of the
    current's 11 is.

  Over the choir's real partials, with all twelve notes at full level, Sethares's roughness formula
  (S14) gives the current spacing 0.49 of the first spacing's roughness. Summed only over
  neighbouring partials, as Plomp and Levelt did, it gives 0.66. **Unverified:** that the current
  spacing sounds clearer. These are calculations from a model of hearing; nobody has listened to
  compare, and the app cannot play the first spacing.
- The instruments. "Scan sound" offers three: Ocean choir (choir, marimba, bells), Music box
  (soft organ, kalimba, music box) and Plain (the first version's instruments). All three play
  the same score, the same notes at the same times. A browser test compares every chime in 10 s
  on the test picture, and `npm run measure` compares the 21 chimes in the first 10 s of the
  ocean picture's map sweep.
- Which low note sounds. It steps through the roots of four chords, I, VIm, IV and V in C (the
  notes C2, A1, F2, G2), one every 3.75 s. The same held notes are heard over four roots, as
  four chords, so the scan moves like music. C, A and G are notes of the scale. F is not: under
  F the held E is a major seventh above it, the one sharp interval in the scan (a test names the
  two pairs, F2 with E4 and F2 with E5). The picture sets only how loud the low note is. The band
  notes never change: a place always gives the same pitch.
- How far left or right: at most 0.7 of the way to one speaker. The map sweep travels left to
  right with the line; the radar swings right, centre, left, centre. It repeats what the screen
  shows, so no fact is given by stereo alone.

Note names, the scale and the chord steps are written with Tonal, a music-theory library (MIT),
so the code says "C major pentatonic" and "I, VIm, IV, V" and a test checks the note names.

**Explaining a note.** The app can say why any note sounds, the way "Explain this rhythm" does for
the Earth voice. The fold-out "Why the scan sounds like this" (Play along) has four parts:

- *Last struck note.* The place on the picture, what was measured there, and how that became the
  held note's loudness and the struck note's pitch, instrument and strength.
- *Look at a column.* While the scan plays this follows the line, a few times a second, until a
  place is chosen. A slider and two buttons choose a column; choosing one stops the following, and a
  checkbox, "Follow the line while the scan plays", turns it off and on from the keyboard. None of
  this makes a sound or moves the scan. A table gives every band in that column: place, pixels read,
  mean, level, held note, struck note.
- *Explain band.* One band in full, in words, with the arithmetic: level = (mean − floor) ÷ (full −
  floor), and the chime rule's numbers. A peak the chime rule left out says which stronger peak took
  its place and why (too close in the same band, or a stronger peak in the same column).
- *Fixed by us.* Every fixed choice, with its reason, its evidence and its tag. Choices that change
  how the picture is read ("rules") are listed apart from choices that carry no data
  ("decoration"). The list is `web/src/audio/scanChoices.ts`; a test fails if an entry has no reason,
  no evidence or no tag, and the numbers in an entry are read from the rule so they cannot drift.

The sentences are built from the score and the rule's own constants (`web/src/audio/scanWhy.ts`),
so they cannot say anything the score does not hold. The score keeps each cell's mean and number
of pixels read, and every peak the rule left out. The fold-out is not a live region: nothing in it
is announced while the scan plays. A note already played keeps the instrument it had when it
sounded, even if the scan sound is changed afterwards. On a whole-world map a place is a longitude
and latitude range and a band's share of the globe's surface (12.9% at the equator, 1.7% at a
pole); on any other picture it is a share of the way across and up, and no ground is claimed. The
legend and the fold-out each keep "From the picture" apart from "Fixed by us" in words, not colour.

**Pick a place on the picture.** A click or tap on the scan's picture opens the fold-out on the cell
under the pointer: its column, and its band as the one explained in full, exactly as if they had been
chosen with the slider and the band list. It makes no sound and does not move the scan; while the scan
plays it stops the following, and the scan plays on. A point outside the picture, or outside the
radar's circle, does nothing. The slider and the list remain the complete keyboard route: the click
reaches nothing they cannot.

- *Which cell.* Map sweep: the point is taken to the still's pixel under it, and that pixel to the
  cell it was counted in, with the same two expressions the score uses. Radar: the bearing from the
  centre (0° east, anticlockwise) gives the column, and the distance gives the band, so the cell is
  the ring sector that holds all 16 points the radar read for it (`web/src/audio/scanPick.ts`).
  **Verified by unit tests** (`scanPick.test.ts`): on the map sweep, counting every pixel's cell gives
  the score's own pixel counts, cell for cell, at the test picture's size (240 × 120), the ocean
  frame's (2048 × 1024) and a still smaller than its frame (1000 × 500 in 2048 × 1024), and every point
  inside a pixel gives that pixel's cell; on the radar, every one of the 16 points read for every cell
  gives that cell back, for the test circle and both ocean regions; a chime mark's centre gives its own
  cell back; and the circle the radar reads is the circle drawn, which holds because the still and the
  frames are both 2048 × 1024 (the test fails if that changes).
- *What shows.* The cell is outlined on the picture, black under white, with four ticks pointing at it
  so a column one or two screen pixels wide can be found. It is a shape, not a colour, and it never
  moves. One line under the picture names the cell in the table's words; where no note is struck
  there, it also names the nearest struck note in the same band (on the radar, round the circle), so a
  click on the middle of a spot of colour finds the note the spot made. The outline and the line show
  whenever the fold-out is open and not following the line, whichever way the place was chosen.
- *Words, focus and pointers.* **Design choices** (Developer A, 15 Nov): a click never moves focus;
  the line under the picture is plain text, not a live region, and its "Read why" button moves focus
  to the band's full sentence when pressed. The picture is described to a screen reader by the same
  sentence that is on screen: click or tap, or use the column slider. Mouse, touch and pen all send
  pointer events; a press that moves more than 10 CSS pixels before it lets go is a drag and picks
  nothing; nothing happens on hover. The radar's locator map is not clickable.
- *Limit: precision on a phone.* **Measured, 15 Nov**, in Chromium at 390 × 844 pixels: the map
  picture is 358 CSS pixels wide, so one column is 1.49 pixels; on the radar one column is 8.1 pixels
  of arc at the rim and 0.34 at the middle of the innermost band. A fingertip covers many columns, so
  a tap picks the cell under the touch point, the outline shows which, and the buttons step to the one
  wanted.
- *Checked on the real picture, 15 Nov.* In the running app with the ocean still, a click on the
  centre of a struck cell explained exactly that cell (column, band, and its struck note) for two cells
  of the map sweep, one marimba and one bells, and one cell in each radar circle; a click on the
  radar's locator map changed nothing. The check script was a one-off and is not in the repo; the
  browser tests run on the TEST INPUT picture.
- *Not checked:* a real phone or tablet, a real pen and a real screen reader. The browser tests
  (`web/e2e/scan-click.e2e.ts`) use Chromium with touch emulation and synthetic pen events.

**Checked on the real picture, 15 Nov.** Five cells of the ocean picture were explained in the running
app (a struck marimba note, a struck bells note, a peak left out for spacing, a peak left out for
the column, a silent cell) and recomputed from `data/preview.jpg` in Python with an independent copy
of the rule. The cell means, the pixels read and the levels agreed to six decimals, and the winner of
both left-out peaks was the same. The Python script was a one-off and is not in the repo; the unit
tests on made-up pictures are what stays.

**On the globe (Developer A, 15 Nov).** The Globe tab plays the same scan, drawn round the 3D globe.
A vertical line on the flat map is a meridian, so the score, the player and the sound are the same:
both views use one module, `web/src/scan/`, that loads the picture, builds the score and plays it.
What changes is only the drawing and the turning of the globe.

- *What is drawn.* Everything that wraps the sphere is drawn by the globe's shader, in frame pixels,
  so the globe shows exactly the cells being played: the part not played yet dimmed, a glow behind
  the line, the white line with a black edge at a constant width on screen, and the white shape on
  it; for a radar, the dimmed outside and the sector not reached yet, three range rings, the rim and
  the part of it passed, and the needle. The chime marks (round for warm, diamond for cool), the
  needle's ends and the compass letters are an SVG layer placed by the same rotation and scale the
  shader gets (`projectToScreen` in `web/src/globe/geo.ts`); marks on the far side are hidden. Black
  and white only, as on the flat picture. **Design choice.**
- *Turn with the line.* On each time a scan starts: the line sits 20° east of the middle of the globe,
  so the part already played is in view, and the globe turns with it (12° of longitude a second at
  normal speed). A radar turns the globe once to face its circle and zooms to it. Dragging the globe,
  an arrow key or turning to a region turns it off; the button turns it back on. The button is not
  called "Follow the line": the fold-out's checkbox "Follow the line while the scan plays" moves the
  explanation with the line, not the globe. With reduced
  motion the globe never turns: it cuts once per step of the low note (every 45° of longitude), and
  the line moves once a second as on the flat map. **Design choice.**
- *The circle stays the flat-map circle.* On the globe it is an oval, the true ground shape of the
  area the Earth voice measures, and the needle turns unevenly on it: on the Kuroshio circle about 30%
  faster near east and west than near north and south. The text under the radar gives the circle's
  ground width over height and the largest gap between equal turns and compass bearings (3.8° on
  Kuroshio, 0.0° on the Equatorial Pacific), computed from the scene, not typed in. **Derived** from
  the map geometry (`groundShape`, tested against `docs/measurements/scan_pictures.md`). A true
  ground circle would read pixels outside the measured area and needs a region-format change; it
  belongs with task L7.
- *Which pictures.* The globe scans the picture shown on the globe, with that picture's own rule.
  Until the aerosol and rain pictures have their own measured settings (`docs/page_plan.md`, P1a),
  only the ocean picture (and the TEST INPUT picture in practice mode) can be scanned there; the
  other two say so.
- *Picking a place.* Not built on the globe: a press on the globe turns it, so a click there does
  not open "Why the scan sounds like this" on a cell, and the fold-out's words on the Globe tab do not
  offer it. Its slider, buttons and band list choose a place, as on Play along.
- *A note that sounds always shows.* Found while testing the globe, 15 Nov: the player told the
  screen about a chime through Tone's Draw, which drops an update more than 0.25 s late. A page busy
  for longer than that (in the test, the globe drawn in software while another test run loaded the
  machine) played the note with no mark, no bar flash and no "last chime". The player now shows every
  chime once its moment has passed, however late. This changes the screen only, on both views, not
  the sound. A browser test keeps the page busy for 0.7 s as the red dot sounds: it failed with the
  old player and needs the mark.

**Other pictures.** The level can be measured by colour strength (the default) or by brightness
(the largest of red, green and blue), for pictures whose data is white or grey on a dark ground.
A scene chooses one; the code never switches by itself. The ocean picture uses colour, because
by brightness its grey land would sound (a test shows this).

The app's scan plays the ocean picture only, whichever picture is chosen on Listen (Dev B's review
of #45). The aerosol and rain stills were measured with the same rule on 15 Nov and are **not
ready**. By colour, the rain picture's empty sea sounds in every cell (it is drawn dark navy, not
black: mean level 0.141) and its land, a photo, sounds in 61% of land cells. On the aerosol still
93% of sea cells sound, and its circle of sea-salt cells in the southeast Pacific gives no chime at
all. Each picture needs its own
floor, land rule and legend before the scan may play it, and its numbers are never compared with
another picture's.

All instruments are synthesised by our code. A struck note is a few sine tones at the ratios
of a vibrating bar, `(xₙ / x₁)²`, each fading at its own speed:

| Instrument | How the bar is held | Equation for x | Tones |
| --- | --- | --- | --- |
| Bells (glockenspiel) | Free at both ends | `cos x · cosh x = 1` | 1 : 2.7565 : 5.4039 : 8.9330 |
| Music box, kalimba | Clamped at one end | `cos x · cosh x = −1` | 1 : 6.2669 : 17.5475 |
| Marimba | Free, and carved to be in tune | (tuned by the maker) | 1 : 4 : 9.2 |

The first two rows were computed on 15 Nov; source S12 gives the free bar as 1 : 2.76 : 5.40 and
the marimba's 4.0 and 9.2. The marimba has a few milliseconds of soft noise for the mallet, and
the bells a second, quieter copy of the lowest tone 1.3 Hz above it, which gives a slow shimmer.
The held notes are slightly detuned saw waves through a low-pass filter, with a little vibrato
at three speeds. The low note is played with its octave and its fifth, and a new low note fades
in while the old one fades out.

**Measured, 15 Nov**, on `data/preview.jpg` (frame 23000) in Chromium, with the settings above.
Sound levels come from recordings of the running app at its default volumes.

| Scan | Cells that sound | Chimes in one sweep | Marimba | Bells | Loudness |
| --- | --- | --- | --- | --- | --- |
| Whole picture | 60% | 68 (2.3 a second) | 53 | 15 | −25.0 LUFS |
| Region A, Kuroshio | 98% | 56 (3.7 a second) | 11 | 45 | −24.6 LUFS |
| Region B, Equatorial Pacific | 100% | 72 (4.8 a second) | 72 | 0 | −21.4 LUFS |

The loudness column is the Ocean choir sound, measured after every change on this page. On the
whole picture the three scan sounds are level with each other: Ocean choir −25.0, Music box
−24.7, Plain −25.0 LUFS. The loudest peak in these five recordings is −5.6 dBFS (Region B).

For comparison the Earth pulse alone is −23.5 LUFS. With the Earth voice, the scan and a
four-note melody chord together, the loudest peak was −4.4 dBFS, so nothing clipped, and after
Stop the output was below −84 dB from 0.15 s on. These last two figures were measured with the
first instruments; the next paragraph repeats them with today's.

**Measured again, 15 Nov**, by `npm run measure`, which records the running app in headless
Chromium (four runs; `docs/measurements/scan_sound.md` holds the fourth, on the code merged with
the globe scan). Ocean choir, default volumes.

| | First run | Second run | Third run | Fourth run | The table above |
| --- | --- | --- | --- | --- | --- |
| Whole picture, one sweep | −25.1 LUFS | −24.4 LUFS | −24.9 LUFS | −24.9 LUFS | −25.0 LUFS |
| Region A, one turn | −24.7 LUFS | −24.2 LUFS | −24.8 LUFS | −24.2 LUFS | −24.6 LUFS |
| Region B, one turn | −21.8 LUFS | −21.6 LUFS | −21.9 LUFS | −21.6 LUFS | −21.4 LUFS |
| Largest sample in the three sweeps | −6.6 dBFS | −7.0 dBFS | −5.4 dBFS | −5.0 dBFS | −5.6 dBFS |
| Earth voice, map sweep and a four-key chord: largest sample | −5.0 dBFS | −5.2 dBFS | −3.1 dBFS | −4.9 dBFS | −4.4 dBFS (first instruments) |
| From 0.15 s to 2.15 s after Stop | every sample 0 | every sample 0 | every sample 0 | every sample 0 | below −84 dB |

So nothing clipped and Stop leaves silence. A loudness on this page is good to about half a
LUFS, not to the decimal it is written with.

**The same sweep is not equally loud twice. Measured, 15 Nov** (`docs/measurements/scan_repeat.md`):
the map sweep recorded 10 times, each in a page loaded afresh as the app is, has a mean of
−24.79 LUFS, a standard deviation of 0.24 LU (95% interval 0.16 to 0.44) and a range of 0.66 LU.
Ten recordings fix a standard deviation only to within about −30% and +80%.

Why: each time a page builds the scan's sound, two things fall out by chance. Neither comes from
the picture.

- **The reverb.** Tone.js makes the reverb's echo from random noise (`Reverb.generate` starts its
  noise at a random point of a buffer filled with random numbers), a new echo for each page.
  Offline, the 12 held notes through 20 new reverbs vary in loudness by 0.16 LU (standard
  deviation; range 0.58), and the level around each note moves by 2.4 to 5.4 dB; without the
  reverb, two renders are identical. In the app, with the page's random numbers fixed (so the
  reverb is the same every time), the level around E4, A4 and D5 repeats within 0.4 dB from one
  sweep to the next; as the app is, it moves by 2.2 to 2.9 dB.
- **When each held oscillator starts.** Each one starts at "now", read as it is made, and the
  audio clock moves while they are made. In 20 real builds, the 21 oscillators of the held notes
  started at 8 to 14 different moments, 61 ms from the first to the last (middle of the 20). Two
  notes that share a partial at exactly the same frequency add it with a different phase each
  time: notes an octave apart, and the low note, whose octave and fifth are C3 and G3 on its first
  root and whose root's second and fourth harmonics are C3 and C4 (`instruments.ts`, RichBass).
  Rendered offline at the start times of those 20 builds, without a reverb, the held notes and
  the low note vary in loudness by 0.24 LU (standard deviation; range 0.91); started at one time,
  two renders are identical. Around E4, A4 and D5, where no other oscillator has a partial at the same frequency,
  the level moved 0.03 dB at most. Around C3 it moved 9.9 dB and around G3 6.2 dB, both only
  with the low note playing (`docs/measurements/scan_timing.md`).

This replaces the guess written here before, that the held notes' detuned copies start at random
phases. They do not: Tone.js starts them at 0°, 120° and 240° (`FatOscillator`), the same every time.

**Not settled:**

- How the spread of a whole sweep divides between the two causes. With the page's random numbers
  fixed, the standard deviation was 0.11 LU (range 0.34) against 0.24 as the app is: a difference
  just past chance at the 5% level (ratio of variances 4.8, where 4.0 is needed), in one run of 10
  sweeps each.
- What is left in one page, where the reverb and the start times stay the same: 10 sweeps played
  one after another still have a standard deviation of 0.09 LU (range 0.29). Its cause was not
  measured. One candidate is the low note, whose phase against the choir depends on how long it
  has sounded since it was built.
- Whether anyone can hear differences of this size. Nobody listened.

**Decided, 15 Nov (Developer A), not built yet:** the scan is to sound the same on every page
load. On a branch of its own, in two steps, each measured with `npm run measure` and listened to
by Developer A before it merges: first a fixed reverb echo made from our own seeded noise, the
seed chosen for the most even gain across the 12 held notes; then one shared start time for every
held oscillator, with the scan's clock started at that time too.

Loudness follows the level. On a test picture with levels 0.121, 0.251, 0.502 and 1 in one band
and the chime rule switched off, that band's tone rose by 6.2, 6.0 and 5.9 dB in the first run,
6.5, 6.2 and 6.0 dB in the second, 6.1, 5.9 and 5.5 dB in the third, and 6.4, 6.2 and 6.0 dB in
the fourth (`scan_sound.md`). 20·log₁₀ of the level ratios gives 6.3, 6.0 and 6.0 dB. The third
run's last step was 0.4 dB short of that; why was not looked into.

Checked in a recording of the map sweep:

- Low note: in each of the 8 steps the expected root (C2, A1, F2, G2, twice) is the strongest
  of the four root tones, by 41 dB or more. This is from an earlier recording the same day;
  `npm run measure` does not repeat it.
- Left and right: in the first sixth of the sweep (5 s) the left channel is 8.3 dB louder than
  the right, and in the last sixth the right is 10.2 dB louder (`scan_sound.md`, the fourth run;
  the third gave 9.0 and 9.9). An earlier recording the same day gave 9.5 and 9.3 dB, with the
  two channels crossing between 15 and 20 s; the tool does not measure the crossing.

**Tests.** `web/src/audio/scanScore.test.ts`: 57 tests on made-up pictures (TEST INPUTS). The
main one is a picture with three dots, which must give exactly three chimes: columns 41, 81 and
201, bands 1, 8 and 5, marimba for the red dot and bells for the green and blue ones. Black,
grey and grey with JPEG-sized noise are `missing` and silent. The root steps, the left–right
position, the note spacing and the brightness measure each have their own tests. Three more say
exactly which notes clash (none of the held notes with each other; F under E).
`web/src/audio/instruments.test.ts`: 3 tests solve the two bar equations again and compare the
answers with the ratios the instruments use. `web/src/audio/scanWhy.test.ts`: 34 tests on made-up
pictures: each dot explains itself with its place, numbers and instrument; a peak left out names
the stronger one that took its place, for both reasons; places on a world map, another picture and
the radar; the whole column; the list of fixed choices; and, for a place picked on the picture,
the few words under it and the nearest struck note. `web/e2e/scan-why.e2e.ts`: 8 browser
tests that do what a person does: open it by keyboard, walk to a column with the arrow keys and
read its table, follow the line while it plays, change the scan sound while it plays, use the radar,
and check nothing in it is announced.
`web/e2e/scan.e2e.ts`: 13 browser tests. They include a radar turn on a test circle, and a check that
the line keeps moving when another scan is chosen while one is playing (it once stood still while
the notes played; found by Developer A and fixed on 15 Nov). The two first chimes sound 5.000 s apart within 5 ms (10 s at half speed), over the roots
A1 and F2; the line on screen is where the audio clock says; a chime leaves one mark, even when the
page is busy for 0.7 s as it sounds; Esc stops the scan and clears the picture; and all five melody
sounds let go of their notes. All three scan sounds play the same chimes, at the same times after
the first, for 10 s (two chimes on the test picture; 15 Nov). The scan-why test that changes the
sound while it plays waited 10 s for a text that never appears, then raced the next chime; it now
waits only for the first chime (15 Nov).
`web/measure/spacing.test.ts`: 14 tests check the spacing and roughness functions against their
sources: Sethares's dips at 2:1, 3:2, 4:3, 5:4 and 5:3 for a harmonic tone, the peak of his formula,
and the bandwidth curve's shape. `web/measure/meter.test.ts` checks the faster band meter against
the slower one.

**Tests of the scan on the globe.** `web/src/globe/geo.test.ts`: the projection against the vertex
shader's sums and the globe's own mesh (the place faced lands in the middle, places 90° away on the
edge, further ones hidden), Turn with the line (the 20° offset, the 45° cuts under reduced motion), each approved
circle's ground shape against `docs/measurements/scan_pictures.md`, and the shading rule.
`web/src/scan/scanGlobeWords.test.ts`: the sentence under the radar, and which pictures have a rule.
`web/e2e/globe.e2e.ts`: 13 browser tests in practice mode, on the TEST INPUT picture. The flat
picture and the globe make the same score, number for number, and the globe plays it by the rule;
a pixel read back from the GPU is the picture's own grey behind the line, 0.58 of it ahead and white
on the line; a chime mark sits where the projection says and the GPU draws the dot that made it there;
Turn with the line keeps the line 20° east of the middle; a drag or an arrow key turns it off while the line
and the sound go on; changing scan, sound or speed while it plays keeps both going; Esc stops it;
reduced motion gives cuts only; every control is reached by Tab; the Earth rhythm keeps its schedule.
In headless Chromium the globe is drawn by SwiftShader (software), and the first test logs it.

**Audit of the scan's claims, 15 Nov.** Every picture number below comes from `npm run measure`
(in `web/`), which runs the rule in Chromium on the stills the app plays and writes
`docs/measurements/scan_pictures.md`. The sound numbers come from the same command, which records
the running app and writes `docs/measurements/scan_sound.md`. Nobody listened.

| Claim | Tag | Evidence, or what is still to measure |
| --- | --- | --- |
| The method is NASA's: a line or a radar, position to pitch, light to loudness, colour to instrument | Verified | S9 to S11 |
| The Earth rhythm is unchanged while the scan plays | Verified | Browser test |
| The line runs west to east and the readout gives its longitude | Verified for the ocean | Map geometry checked by Student A, 14 Nov. The app finds a world map by the word "equirectangular" in a scene's limitations; the aerosol and rain scenes lack the word, so this must be fixed before either is played |
| Pitch is height on the map, in 12 equal bands | Design choice | Limits in "What we do not claim" |
| Loudness is a cell's mean colour strength | Design choice | Limits in "What we do not claim" |
| The sound gets louder as the level rises | Verified | On a recorded test picture each doubling of the level raised that band's tone by 5.5 to 6.5 dB over four runs; the exact steps are 6.3, 6.0 and 6.0 |
| Black sea and grey land are silent | Verified for the ocean | Of 746 cells that are 90% or more grey land or black sea in the uncompressed frame, none sounds. Largest cell mean 7.67/255; the floor is 12/255 |
| A peak of colour gives one struck note | Design choice | 39% to 61% of peaks are left out |
| Red and orange strike one instrument, the rest another | Design choice | The rule is ours. Where it falls was **measured** below |
| NASA's colour bar is even, and the switch falls at about 23.6 °C on it | Verified (15 Nov) | The four printed labels lie on one straight line within 0.07 °C; the switch is at 23.64 °C by that line (`scan_pictures.md`). The figure before, 23.8 °C, assumed the coloured ends were 0 and 32: **corrected** |
| The frame's lines use the bar's colours, so the switch means "warmer than about 23.6 °C" | Verified for the hue, which is all the rule reads (15 Nov) | 99.65% of the frame's colour (by strength) is on the same side of the switch as the bar colour of its hue. Not the bar's exact colours: the frame's are more saturated. A hue match cannot show where NASA's palette came from |
| Warm water sounds louder than cold with the same amount of line (1.93 times) | **Corrected** (15 Nov) | That came from two end pixels of the printed bar. In the frame, the strongest warm and cold lines are equally strong (1.01 times); the palest lines are light blue (0.81 at their strongest) |
| The held notes never clash with each other | Verified | A test, with "clash" defined as 1, 6 or 11 semitones apart |
| The low note never clashes with the held notes | Corrected | It did claim this. F under E is a major seventh |
| Low notes a step apart are rough, because they are a fraction of a critical bandwidth apart | Verified (source read, 15 Nov) | S13, pp. 555–556. The first spacing's C3–D3 and D3–E3 were 0.18 and 0.20 of a bandwidth apart; the current lowest pairs, C3–G3 and G3–C4, are 0.72 and 0.71 (`scan_spacing.md`) |
| The current spacing makes the choir less rough | Verified as a calculation (15 Nov) | Sethares's formula (S14) over the choir's partials, all notes at full level: current ÷ first 0.49 (every pair), 0.66 (neighbouring partials only). The model of the partials matches a recording of the real choir (`scan_spacing.md`) |
| Wide spacing at the bottom sounds clearer | Unverified | Nobody has listened to compare, and the app cannot play the first spacing (`scan_listening_protocol.md`, task S4) |
| The bars' tone ratios | Verified | A test solves both equations |
| The low note's steps and the left–right position carry no data | Verified | Recordings above |
| Every scan sound plays the same score | Verified (15 Nov) | The browser test compares every chime in 10 s from the first (two on the test picture); `npm run measure` compares the 21 chimes in the first 10 s of the ocean picture: same columns, bands, instruments, notes, roots, left–right places and times |
| The globe plays the same score as the flat picture | Verified | `npm run measure`: the ocean line and both radars, every level, mean and chime equal; a recorded sweep on the globe has the same chimes at the same moments. A browser test does the same on the TEST INPUT picture |
| The globe draws the scan where the score reads | Verified on the TEST INPUT picture | Pixels read back from the GPU match the rule's copy in TypeScript within 3 grey levels; marks sit on the dot that made them |
| Nothing clips with all three voices, and Stop leaves silence | Verified | Recorded twice with today's instruments: largest sample −5.0 and −5.2 dBFS; every sample 0 from 0.15 s after Stop. Two later runs: −3.1 dBFS, and in the latest (`scan_sound.md`) −4.9 dBFS, both under full scale, with silence after Stop. The tool now fails if part of this recording is missing, since a gap there could hide the largest sample |
| The counts in "Measured, 15 Nov" | Verified again | The tool gives the same: 60.0% and 68 chimes (53, 15); 98% and 56; 100% and 72 |
| The loudness figures in "Measured, 15 Nov" | Verified to about half a LUFS | The same map sweep recorded 10 times as the app is: standard deviation 0.24 LU, range 0.66 (`scan_repeat.md`). The table's −25.0 LUFS is inside that range (−25.19 to −24.53). The regions were recorded in four runs; they differ by up to 0.6 |
| The same sweep varies in loudness because of the reverb and the held notes' start times, not the picture | Verified as causes (15 Nov); how a sweep's spread divides between them is not settled | Offline, each one alone changes the loudness (20 reverbs: standard deviation 0.16 LU; the start times of 20 real builds: 0.24), and without them two renders are identical (`scan_repeat.md`, `scan_timing.md`). In the app, a fixed reverb made the level around E4, A4 and D5 repeat within 0.4 dB, where it moved 2.2 to 2.9 dB |
| It sounds good, and a region's character can be heard | Unverified | Needs listeners. The third round has had none. A protocol is drafted, not run: `docs/scan_listening_protocol.md` |
| The scan reads a still close enough to NASA's frame | Measured; decided 15 Nov, not built yet | The JPEG the app reads puts 49 of its 68 chimes at the same place and on the same instrument as a chime of the uncompressed frame (84). A 4:4:4 JPEG at quality 90 would put 76 of 86 there; a lossless WebP is the frame itself. Developer A chose a lossless WebP read by the scan alone (15 Nov) |
| A click on the picture explains the cell the scan read there | Verified | Unit tests (`scanPick.test.ts`), and a one-off check in the running app on the ocean still: see "Pick a place on the picture" |
| A click makes no sound and does not move the scan | Verified | Browser tests, stopped, paused and playing. A click while playing leaves the first two notes with the same columns, instruments, 5 s spacing, low notes and left–right places that `scan.e2e.ts` checks without a click |
| A click works by mouse, touch and pen | Verified in emulation only | Chromium touch emulation and synthetic pen events. No real phone, tablet or pen tried |

**What we do not claim.**

- One listener so far. Developer A listened on 15 Nov to the first two versions and judged them
  good. That is one opinion, not a test. **Unverified:** by ear, the third round (the note
  spacing, the richer instruments, the Music box sound), and that anyone can hear a region's
  character in it.
- The root steps and the left–right position are decoration. A listener could take a chord change
  for something in the picture; the app's explanation and this page say it is not.
- The scan reads colours in a picture. NASA's legend says the colour shows modelled sea surface
  temperature, but we do not turn colours into degrees. "Red side of yellow" is a rule about
  pixels, and it depends on a colour's hue alone. **Measured, 15 Nov** (`docs/measurements/scan_pictures.md`):
  - On NASA's colour bar the rule switches between x 219 and 220. The bar's four printed labels
    (0, 10, 20, 32) lie on one straight line to within 0.62 px, which is 0.07 °C, so the bar's
    scale is even. By that line the switch is at **23.6 °C** (23.64 by the ink centres of the
    labels, 23.70 by their box centres). The figure written here before, 23.8 °C, assumed the
    bar's coloured ends were 0 and 32; they sit just inside the labels.
  - The frame's lines use the bar's hues. Every coloured pixel of the uncompressed frame 23000
    has a hue inside the bar's range: 99% are within 0.7° of a bar hue, and 11 pixels of 768,999
    are more than 3° from every bar hue. Weighted by colour strength, as the scan weighs them, 99.65% of
    the frame's colour is on the same side of the switch as the bar colour of its hue.
  - The frame does not use the bar's exact colours. At full brightness its colours are as bright
    as the bar's (1.00 to 1.10 times) but more saturated (the middle pixel 1.07 to 1.34 times):
    the printed bar is a paler copy of the same palette. And because the bar's hues run without a
    gap, any hue inside their range matches some bar hue; the match shows which side of the
    switch a colour is on, not that NASA drew it from this bar.

  So "the switch is at about 23.6 °C" means that a cell strikes the warm instrument when most of
  its colour has the hue NASA's bar gives to water warmer than 23.6 °C. We measured the bar and
  the picture's colours, not the sea.
- Loudness is how much of a cell is covered by drawn lines and how strongly they are coloured. It
  is not current speed. It depends a little on colour: at their strongest, the frame's lines in
  the light-blue tenth of the bar (10% to 20% of its length) reach a colour strength of 0.81, in
  the green to yellow-green tenths (40% to 60%) 0.89, in the turquoise tenth (20% to 30%) 0.93,
  and in every other tenth 0.98 to 1.00. **Corrected, 15 Nov:** this page said
  warm water is 1.93 times louder than cold water with the same amount of line. That figure came
  from two single pixels at the ends of the printed bar, not from the frame. In the frame, the
  strongest warm and cold lines are equally strong (1.01 times).
- A band's loudness is not exactly its level from one page load to the next. The reverb and the
  held notes' start times change the level around a note each time a page builds the sound: as
  the app is, by 2.2 to 2.9 dB around E4, A4 and D5, and by 13.2 dB around C3, where the low
  note's partials fall (`docs/measurements/scan_repeat.md`; the causes are under "Measured again"
  above). Within one sweep the instruments do not change, and a band still gets louder as its
  level rises.
- The scan reads a compressed copy. `data/preview.jpg` is a JPEG of frame 23000 with halved
  colour resolution (4:2:0) at quality 82 (libjpeg's standard tables, read from the file), which
  blurs thin coloured lines. Against the uncompressed frame, levels differ by 0.043 on average and
  0.152 at most, 1727 cells sound where 1816 would, and 49 of the still's 68 chimes fall at the
  same place and on the same instrument as a chime of the uncompressed frame (which has 84; 50 at
  the same place on either instrument). On the radar, 32 of 56 chimes (Kuroshio) and 33 of 72
  (Equatorial Pacific) do. The broad picture holds; single chimes do not.
  **Measured, 15 Nov:** a 4:4:4 JPEG at quality 90 (1.56 MB) puts 76 of its 86 chimes at the same
  place and on the same instrument as the uncompressed frame's, and 63 of 74 and 66 of 85 on the
  radar. A lossless WebP (2.43 MB) is the uncompressed frame, pixel for pixel. The still is also
  the picture on Listen, the close-ups on Compare and the globe's texture and land check, and
  `data/README.md` asks for under about 1 MB; the Earth voice reads NASA's frames, not the still.
  **Decided, 15 Nov (Developer A), not built yet:** the scan will read a lossless WebP of the
  frame, a file of its own that only the scan loads; the JPEG stays for everything else. It needs
  its own pull request, with Student A, whose folder `data/` is.
- Bands are equal steps on the flat map (15° of latitude for the line). Along a meridian these
  are equal lengths, but a band's share of the globe's surface is (sin φ₂ − sin φ₁) ÷ 2: 12.9%
  next to the equator and 1.7% next to a pole. Weighting each pixel by cos(latitude) inside its
  cell moves a level by at most 0.13 (in the band from 75° N to the pole) and at most 0.032
  elsewhere, and gives 70 chimes in place of 68. We keep the unweighted rule.
- A circle is round on the flat map, not on the ground: Kuroshio is 0.876 times as wide
  east–west as it is tall, the Equatorial Pacific circle 1.000. So equal turns of the radar are
  not equal compass bearings: a map angle θ points along the ground bearing atan2(sin θ, 0.876 cos θ),
  at most 3.8° away on Kuroshio, and a 3° column covers 3.4° of bearing near east and west and 2.6°
  near north and south. Bands are equal map distances too, so on Kuroshio the same ground distance
  east and north of the centre plays up to 1.5 bands apart. The other approved circles differ by at
  most 2.1° and 0.9 bands. Derived from the map geometry at each centre; across the Kuroshio circle
  the ratio itself runs from 0.77 at its north edge to 0.95 at its south edge.
- The scan has its own clock. Its notes can fall close to an Earth pulse, so run the listening
  check with the scan off.
- The chime rule leaves out bright spots that are too close together. The choir still plays them.
