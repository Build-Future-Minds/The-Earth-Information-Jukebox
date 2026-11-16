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
answers with the ratios the instruments use.
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
