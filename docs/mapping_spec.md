# Mapping spec: one rhythm rule

> Listen plays the picture scan (section "The picture scan: what Listen plays", decision D1).
> The rhythm rule below is the sound of Compare and the listening game.

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

## The picture scan: what Listen plays

Added 15 Nov by Developer A on "Play along". Since 16 Nov it is **Listen's sound** (decision D1 in
`docs/page_plan.md`; **Design choice**): Listen's three steps choose a NASA picture, then the whole
picture or one region, then play the scan. It is a second rule beside the rhythm rule above, not
a change to it: the rhythm rule stays the rule the listening game tests and the sound of Compare,
and its tests do not change. A browser test proves the Earth notes keep their schedule while the
scan plays (Play along). The rhythm comes back to Listen as a switch in P4.

Each picture is read with **its own settings**, measured on its own still (decision D2; see "Each
picture's own settings" below). The rule is the same for every picture.

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
| Floor | the picture's own (below) | the picture's own |
| Full level | the picture's own (below) | the picture's own |

### Each picture's own settings

The floor, the full levels and the pixels never read are set per picture, measured on that
picture's own still by `npm run measure` (`docs/measurements/scan_pictures.md`, one section per
picture). **Never compare these numbers between pictures**: each picture is drawn differently, so
a floor or a full level means something only for its own picture. The app reads them from
`web/src/data/sources.ts` (`scan`), and a unit test fails if they differ from what was measured.

| Picture | Floor | Full level: map sweep | Full level: radar | Never read | Tag |
| --- | --- | --- | --- | --- | --- |
| Sea surface currents and temperature (SVS 3912) | 12 ÷ 255 | 0.5 | 0.75 | nothing | **Design choice**, measured 15 Nov |
| Aerosols (SVS 5669) | 20 ÷ 255 | 0.45 | 0.8 | nothing | **Design choice**, by the procedure, measured 16 Nov |
| Precipitation, GPM IMERG (SVS 4285) | 30 ÷ 255 | 0.85 | 0.95 | land and ice (`data/imerg/scan_mask.png`) | floor and full levels **Design choice**, by the procedure; the mask **Verified** (below) |

The procedure, the same for every picture since 16 Nov (**Design choice**):

- **Floor:** the colour strength of the commonest colour among the pixels read (what the picture
  draws as "nothing"), plus 12 grey levels for JPEG noise.
- **Full level:** the largest cell mean on that scan (the radar: the larger of the two circles),
  rounded up to 0.05, so no cell is clipped.
- **Never read:** the picture's `scan_mask.png`, if it has one. The rain picture's land and ice are
  a satellite photo, not rain data, and the colour rule would make a desert sound like rain. Its
  mask is the land `analysis/prepare_scene.py` already uses for its regions (the SVS 3912 ocean
  outline plus pixels that never change across the 30 frames). **Verified**: inside each rain
  circle it marks exactly the pixels the region's own mask leaves out (`analysis/scan_mask.py`
  stops on any difference). A cell that reads nothing is no data: silent, never a peak, and not
  counted as a zero.

The ocean picture keeps the settings it was built with on 15 Nov; the procedure would give its
radar 0.85 instead of 0.75 (`scan_pictures.md`, "Ocean").

**Measured, 16 Nov: the app plays what was measured.** On Listen, the score the app builds for
each picture and each scan has the same struck notes as the measuring tool counted: ocean 68 (map
sweep), 56 and 72 (regions A and B); aerosols 36, 34 and 0 (Region D's strongest cell is 0.15,
under the chime level); rain 16, 31 and 7. Read from the running app on real data, not heard.

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
  top, the way a choir is spaced. Notes a step apart sound muddy when they are low. The first
  version climbed step by step from C3, so C3, D3 and E3 blurred together whenever they sounded
  at once, which on the radar is all the time.
- The instruments. "Scan sound" offers three: Ocean choir (choir, marimba, bells), Music box
  (soft organ, kalimba, music box) and Plain (the first version's instruments). All three play
  the same score, the same notes at the same times; a browser test checks it.
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
the Earth voice. "Why the scan sounds like this" (opened by Explain on Listen, and a fold-out on Play along) has four parts:

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

**Other pictures.** The level can be measured by colour strength (the default) or by brightness
(the largest of red, green and blue), for pictures whose data is white or grey on a dark ground.
A scene chooses one; the code never switches by itself. The ocean picture uses colour, because
by brightness its grey land would sound (a test shows this).

The app's scan plays the ocean picture only, whichever picture is chosen on Listen (Dev B's review
of #45). The aerosol and rain stills were measured with the same rule on 15 Nov and are **not
ready**. By colour, the rain picture's empty sea sounds in every cell (it is drawn dark navy, not
black: mean level 0.141) and its land, a photo, sounds in 61% of land cells. On the aerosol still
93% of sea cells sound, and its sea-salt circle gives no chime at all. Each picture needs its own
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
Chromium (two runs; `docs/measurements/scan_sound.md` holds the latest). Ocean choir, default
volumes.

| | First run | Second run | The table above |
| --- | --- | --- | --- |
| Whole picture, one sweep | −25.1 LUFS | −24.4 LUFS | −25.0 LUFS |
| Region A, one turn | −24.7 LUFS | −24.2 LUFS | −24.6 LUFS |
| Region B, one turn | −21.8 LUFS | −21.6 LUFS | −21.4 LUFS |
| Largest sample in the three sweeps | −6.6 dBFS | −7.0 dBFS | −5.6 dBFS |
| Earth voice, map sweep and a four-key chord: largest sample | −5.0 dBFS | −5.2 dBFS | −4.4 dBFS (first instruments) |
| From 0.15 s to 2.15 s after Stop | every sample 0 | every sample 0 | below −84 dB |

So nothing clipped and Stop leaves silence. A loudness on this page is good to about half a
LUFS, not to the decimal it is written with: the same sweep differed by up to 0.7 between two
runs. **Unverified:** why. Our guess is that the held notes' detuned copies start at random
phases.

Loudness follows the level. On a test picture with levels 0.121, 0.251, 0.502 and 1 in one band
and the chime rule switched off, that band's tone rose by 6.2, 6.0 and 5.9 dB in the first run
and 6.5, 6.2 and 6.0 dB in the second. 20·log₁₀ of the level ratios gives 6.3, 6.0 and 6.0 dB.

Checked in a recording of the map sweep:

- Low note: in each of the 8 steps the expected root (C2, A1, F2, G2, twice) is the strongest
  of the four root tones, by 41 dB or more.
- Left and right: in the first 5 s the left channel is 9.5 dB louder than the right, they cross
  between 15 and 20 s, and in the last 5 s the right is 9.3 dB louder.

**Tests.** `web/src/audio/scanScore.test.ts`: 57 tests on made-up pictures (TEST INPUTS). The
main one is a picture with three dots, which must give exactly three chimes: columns 41, 81 and
201, bands 1, 8 and 5, marimba for the red dot and bells for the green and blue ones. Black,
grey and grey with JPEG-sized noise are `missing` and silent. The root steps, the left–right
position, the note spacing and the brightness measure each have their own tests. Three more say
exactly which notes clash (none of the held notes with each other; F under E).
`web/src/audio/instruments.test.ts`: 3 tests solve the two bar equations again and compare the
answers with the ratios the instruments use. `web/src/audio/scanWhy.test.ts`: 27 tests on made-up
pictures: each dot explains itself with its place, numbers and instrument; a peak left out names
the stronger one that took its place, for both reasons; places on a world map, another picture and
the radar; the whole column; and the list of fixed choices. `web/e2e/scan-why.e2e.ts`: 8 browser
tests that do what a person does: open it by keyboard, walk to a column with the arrow keys and
read its table, follow the line while it plays, change the scan sound while it plays, use the radar,
and check nothing in it is announced.
`web/e2e/scan.e2e.ts`: 12 browser tests. They include a radar turn on a test circle, and a check that
the line keeps moving when another scan is chosen while one is playing (it once stood still while
the notes played; found by Developer A and fixed on 15 Nov). The two first chimes sound 5.000 s apart within 5 ms (10 s at half speed), over the roots
A1 and F2; the line on screen is where the audio clock says; a chime leaves one mark; Esc stops
the scan and clears the picture; and all five melody sounds let go of their notes.

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
| The sound gets louder as the level rises | Verified | On a recorded test picture each doubling of the level raised that band's tone by 5.9 to 6.5 dB over two runs; 6.0 is exact |
| Black sea and grey land are silent | Verified for the ocean | Of 746 cells that are 90% or more grey land or black sea in the uncompressed frame, none sounds. Largest cell mean 7.67/255; the floor is 12/255 |
| A peak of colour gives one struck note | Design choice | 39% to 61% of peaks are left out |
| Red and orange strike one instrument, the rest another | Design choice | The switch on NASA's colour bar is measured; what it means in degrees is Unverified |
| The held notes never clash with each other | Verified | A test, with "clash" defined as 1, 6 or 11 semitones apart |
| The low note never clashes with the held notes | Corrected | It did claim this. F under E is a major seventh |
| Wide spacing at the bottom is clearer than close spacing | Unverified | No source. To do: derive it from critical bandwidth, with a source someone has read |
| The bars' tone ratios | Verified | A test solves both equations |
| The low note's steps and the left–right position carry no data | Verified | Recordings above |
| Every scan sound plays the same score | Verified by construction | The browser test compares the first chime only |
| Nothing clips with all three voices, and Stop leaves silence | Verified | Recorded twice with today's instruments: largest sample −5.0 and −5.2 dBFS; every sample 0 from 0.15 s after Stop |
| The counts in "Measured, 15 Nov" | Verified again | The tool gives the same: 60.0% and 68 chimes (53, 15); 98% and 56; 100% and 72 |
| The loudness figures in "Measured, 15 Nov" | Verified to about half a LUFS | Two more runs differ from them, and from each other, by up to 0.7 |
| It sounds good, and a region's character can be heard | Unverified | Needs listeners. The third round has had none |
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
  pixels. On NASA's colour bar the rule switches at 74.4% of the bar's length, which is 23.8 °C
  if the bar's scale is even between its end labels, 0 and 32. We measured the bar, not the sea.
  **Unverified:** that the bar's scale is even (its labels were read by eye), and that the lines
  in the frame use exactly the bar's colours.
- Loudness is how much of a cell is covered by drawn lines and how strongly they are coloured. It
  is not current speed. It is not independent of temperature either: along NASA's colour bar the
  colour strength rises from 0.47 at the cold end to 0.90 at the warm end, so warm water is
  louder than cold water with the same amount of line (1.93 times the cell mean).
- The scan reads a compressed copy. `data/preview.jpg` is a JPEG of frame 23000 with halved
  colour resolution (4:2:0, read from the file's header), which blurs thin coloured lines.
  Against the uncompressed frame, levels differ by 0.043 on average and 0.152 at most, 1727
  cells sound where 1816 would, and 49 of the still's 68 chimes fall on a chime of the
  uncompressed frame (which has 84). The broad picture holds; single chimes do not.
- Bands are equal steps on the flat map (15° of latitude for the line). Along a meridian these
  are equal lengths, but a band's share of the globe's surface is (sin φ₂ − sin φ₁) ÷ 2: 12.9%
  next to the equator and 1.7% next to a pole. Weighting each pixel by cos(latitude) inside its
  cell moves a level by at most 0.13 (in the band from 75° N to the pole) and at most 0.033
  elsewhere, and gives 70 chimes in place of 68. We keep the unweighted rule.
- A circle is round on the flat map, not on the ground: Kuroshio is 0.876 times as wide
  east–west as it is tall, the Equatorial Pacific circle 1.000. So equal turns of the radar are
  not equal compass bearings.
- The scan has its own clock. Its notes can fall close to an Earth pulse, so run the listening
  check with the scan off.
- The chime rule leaves out bright spots that are too close together. The choir still plays them.
