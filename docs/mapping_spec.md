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

**Our version. Design choices.** The method is the same for every picture and both regions; each
picture has its own settings (floor, full levels, pixels never read, what each instrument means),
measured on its own still ("Each picture's own rule", below).

| What the line crosses | What you hear |
| --- | --- |
| Where along the line: height on the map, north high (radar: distance from the centre) | Pitch. 12 bands, from C3 up to C6: C3 G3 C4 E4 G4 A4 C5 D5 E5 G5 A5 C6 |
| How much colour: the mean colour strength of the cell | Loudness of that band's held note. A louder line is also a little brighter in tone |
| A bright spot: a peak along the line's path | One struck note, an octave above that band's held note |
| The spot's colour: red side of yellow, or not (the rain picture also: blue side) | Which instrument strikes it: marimba, or bells (rain: or harp, for snow) |
| The whole line: mean level of the 12 bands that read something | Loudness of one low note |
| Where the line is, left to right | The sound's place between the left and right speakers |

Colour strength of a pixel is `(largest − smallest of red, green, blue) ÷ 255`. Black sea, grey
land and white score 0. A pure colour scores 1. It is the same "spread" the team's land rule uses.
A cell's mean strength `s` becomes a level `(s − floor) ÷ (full − floor)`, kept between 0 and 1,
with the picture's own floor and full level.

**The instrument is chosen by what is drawn** (Design choice, 15 Nov). Only the pixels of a cell
above the picture's floor vote, each weighted by its colour strength. A note is warm (marimba)
when half or more of that colour has red as its largest channel; otherwise cool (bells). For a
picture with a third class (rain), the largest of three shares wins: red largest (warm), blue
largest (a tie with green counts as blue: the harp) or neither (cool); a tie goes to warm, then
cool. Measured: voting above the floor changes no ocean note; without it, the rain picture's navy
sea (blue largest) would turn light rain into snow.

**No data** (Design choice, 15 Nov). A cell that reads nothing, because its pixels are masked or
outside the picture, is no data. It is silent, never a peak, left out of the three-column
smoothing (its neighbours share the weights) and out of the low note's mean, and a cell next to
it is compared only with the neighbour that has data. The picture is hatched there, its bar is
hatched, and every sentence says "no data". It is never written or played as a zero.

| Setting | Whole picture (line) | Region (radar) |
| --- | --- | --- |
| Path | Left to right: west to east on a world map | From 3 o'clock, anticlockwise |
| Columns × bands | 240 × 12 | 120 × 12 |
| One sweep at speed 1 | 30 s, the Earth loop's length | 15 s |
| How a cell is read | Every pixel once, except pixels never read | 16 points, 4 along the radius × 4 along the arc |
| Floor and full level | Each picture's own (below) | Each picture's own (below) |

A chime needs a level of 0.3 or more at its peak, after smoothing over three columns with
weights 1, 2, 1. Two chimes in one band are at least 6 columns (0.75 s) apart, and one column
starts at most one chime; the stronger spot wins. A "spot" here is a whole cell: on the map sweep
1.5° of longitude wide and 15° of latitude tall. The rule leaves many peaks out; each picture's
section says how many.

**Decoration that carries no data.** Three musical choices are fixed and the picture cannot
change them. The app says so in "How the picture becomes sound".

- The scale, C major pentatonic. It has no clashing pair of notes, and the melody keys use it too.
- How the 12 notes are spaced: far apart at the bottom (a fifth, then a fourth) and close at the
  top, the way a choir is spaced. Notes a step apart sound muddy when they are low. The first
  version climbed step by step from C3, so C3, D3 and E3 blurred together whenever they sounded
  at once, which on the radar is all the time.
- The instruments. "Scan sound" offers three: Ocean choir (choir, marimba, bells), Music box
  (soft organ, kalimba, music box) and Plain (the first version's instruments). All three play
  the same score, the same notes at the same times; a browser test checks it. A picture with a
  third class (rain: snow) strikes its third notes on a harp in all three.
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
- *Look at a column.* While the scan plays this follows the line, a few times a second. Paused or
  stopped, a slider and two buttons choose a column; this makes no sound and does not move the scan.
  A table gives every band in that column: place, pixels read, mean, level, held note, struck note.
- *Explain band.* One band in full, in words, with the arithmetic: level = (mean − floor) ÷ (full −
  floor), and the chime rule's numbers. A peak the chime rule left out says which stronger peak took
  its place and why (too close in the same band, or a stronger peak in the same column).
- *Fixed by us, for this picture.* Every fixed choice, with its reason, its evidence and its tag.
  Choices that change how the picture is read ("rules") are listed apart from choices that carry no
  data ("decoration"). The list is `scanChoicesFor(picture)` in `web/src/audio/scanChoices.ts`: it
  quotes only that picture's settings and measured numbers, which a unit test checks against
  `docs/measurements/scan_pictures.json`. A test fails if an entry has no reason, no evidence or no
  tag, or if one picture's list names another picture.

The sentences are built from the score and the rule's own constants (`web/src/audio/scanWhy.ts`),
so they cannot say anything the score does not hold. The score keeps each cell's mean and number
of pixels read, and every peak the rule left out. The fold-out is not a live region: nothing in it
is announced while the scan plays. A note already played keeps the instrument it had when it
sounded, even if the scan sound is changed afterwards. On a whole-world map a place is a longitude
and latitude range and a band's share of the globe's surface (12.9% at the equator, 1.7% at a
pole); on any other picture it is a share of the way across and up, and no ground is claimed. The
legend and the fold-out each keep "From the picture" apart from "Fixed by us" in words, not colour.

**Checked on the real picture, 15 Nov.** Five cells of the ocean picture were explained in the running
app (a struck marimba note, a struck bells note, a peak left out for spacing, a peak left out for
the column, a silent cell) and recomputed from `data/preview.jpg` in Python with an independent copy
of the rule. The cell means, the pixels read and the levels agreed to six decimals, and the winner of
both left-out peaks was the same. The Python script was a one-off and is not in the repo; the unit
tests on made-up pictures are what stays.

**Measure: colour or brightness.** The level can be measured by colour strength (the default) or
by brightness (the largest of red, green and blue), for pictures whose data is white or grey on a
dark ground. A picture's rule chooses one; the code never switches by itself. All three pictures
use colour. By brightness the ocean's grey land would sound (a test shows this); each picture's
section of the report gives the brightness numbers for the record.

### Each picture's own rule

Added 15 Nov by Developer A. The scan plays the picture chosen on Listen, with that picture's own
rule (`web/src/data/sources.ts`, `scan`); the picture choice also shows on Play along. A picture
whose rule has not been measured is never scanned: the scan keeps one that has a rule, and says so.
Every number below was measured by `npm run measure` (`docs/measurements/scan_pictures.md`, one
section per picture). **The numbers of one picture are never compared with another's**: each table
here is one picture's.

**The procedure, the same for every picture** (Design choice). Floor: the colour strength of the
commonest colour among the pixels the scan reads, plus 12 grey levels (the tolerance for JPEG
noise). Full level: the largest cell mean on that scan (the radar: the larger of the two circles),
rounded up to 0.05, so no cell is clipped. Mask: pixels whose colour is not data. A unit test
(`web/src/data/scanRules.test.ts`) fails if a picture's settings, or any number the app quotes
about it, differ from what the report was measured with.

Each rule also states whether the picture is a whole-world map (all three are, by the map checks in
`assets/source_manifest.json`; it is no longer found by searching a scene's limitations for a
word), which still it reads, what each instrument means in its own legend, and its limits.

#### Ocean (SVS 3912)

| Setting | Value | Tag and evidence |
| --- | --- | --- |
| Still | Frame 23000, 2007-03-25 12:00 UTC | Verified: the still differs from NASA's frame by 6.93 grey levels a channel on average (a JPEG) |
| Floor | 12 ÷ 255 | Design choice, the one the scan was built with; the procedure gives the same (its commonest colour, grey land, has strength 0). Of 746 cells that are 90% or more grey land or black sea in the uncompressed frame, none sounds; the largest has a mean of 7.67 ÷ 255 |
| Full level | 0.5 map sweep, 0.75 radar | Design choice, kept. The procedure gives 0.5 and 0.85 (largest cell means 0.463 and 0.80) |
| Pixels never read | None | Design choice |
| Instruments | Marimba: lines drawn red or orange (the warm end of NASA's bar). Bells: the rest | Design choice. The switch falls at 74.4% of NASA's bar, 23.8 °C if the bar's scale is even (Unverified) |

#### Aerosols (SVS 5669)

| Setting | Value | Tag and evidence |
| --- | --- | --- |
| Still | The one still, 2025-08-19 20:00 UTC, scaled down | Verified: 2.65 grey levels a channel from NASA's PNG on average |
| Floor | 20 ÷ 255 | Design choice, by the procedure: the commonest colour is the grey-green land, strength 8. Of 194 cells that are 90% or more that colour, none sounds (largest 11.07 ÷ 255) |
| Full level | 0.45 map sweep, 0.8 radar | Design choice, by the procedure (largest cell means 0.429 and 0.77) |
| Pixels never read | None: aerosol over land is data | Design choice |
| Instruments | Marimba: black carbon (smoke from fires), drawn orange-red. Bells: dust (lilac), sea salt (pale grey-teal) and sulfate (green) | Design choice. Measured on NASA's bar: 1 of its 4 swatches (black carbon) is on the warm side. Swatch names read by eye from the bar |

Measured with these settings: the map sweep strikes 36 notes (3 marimba, all black-carbon colour;
33 bells, 29 sulfate and 4 dust colour); the Vanuatu circle 34, all bells, all sulfate colour; the
sea-salt circle none (its most colourful cell measures 0.15, so its loudest held note is about a
tenth of full loudness). Recorded, one turn of the sea-salt circle measures −53.5 LUFS in both
runs, with a largest sample of −38.0 and −38.6 dBFS: it is nearly silent, not just without struck
notes. **Accepted by Developer A, 15 Nov, and said in the app:** sea salt is quiet, because NASA
draws it pale; dust rings the same instrument as sea salt and sulfate. NASA's bar names the orange swatch "Black Carbon"; the scene's
legend, from the source page, says "smoke from fires".

#### Rain (SVS 4285)

| Setting | Value | Tag and evidence |
| --- | --- | --- |
| Still | Frame 0, 2026-11-14 00:00 UTC | Verified: compared with each of the 30 frames, the still is closest to frame 0 (4.48 grey levels a channel; the next closest 7.84) |
| Pixels never read | Land, which is a satellite photo here (40.21% of the still) | Design choice. `data/imerg/scan_mask.png`, written by `analysis/scan_mask.py`: exactly the land `prepare_scene.py` uses for this picture's regions (the SVS 3912 grey-land outline plus pixels bright and unchanged over the 30 frames, grown by the coast margin). Inside both circles it matches the regions' own masks pixel for pixel |
| Floor | 30 ÷ 255 | Design choice, by the procedure: the commonest colour read is the navy sea, RGB (2, 5, 20), strength 18.2. Of 1,108 cells that are 90% or more navy, 1 sounds, and 10% of its pixels are drawn rain |
| Full level | 0.85 map sweep, 0.95 radar | Design choice, by the procedure (largest cell means 0.810 and 0.90) |
| Instruments | Marimba: rain drawn yellow, orange or red. Bells: rain drawn green or yellow-green. Harp: snow, drawn cyan to purple | Design choice. Measured on NASA's bars: rain steps 4 to 10 of 10 are warm, steps 1 to 3 cool; all 10 snow steps and no rain step are on the blue side |

Both are needed: the mask alone leaves the navy sea sounding almost everywhere (79.4% of cells at
the ocean's floor), and a floor alone cannot silence a coloured photo of a desert. **The cost**,
said in the app: no rain is heard over land (no data, not "no rain"), and of the 742 map cells that
are 10% or more drawn in a rain or snow colour, 510 sound. Measured with these settings: the map
sweep strikes 16 notes (4 marimba, 7 bells, 5 harp; every harp note is in a snow-coloured cell).
**Unverified:** which amount of rain a colour step stands for. NASA's bar has no numbers on it;
the legend's words put yellow at 0.5 to 1 mm an hour.

All instruments are synthesised by our code. A struck note is a few sine tones at the ratios
of a vibrating bar, `(xₙ / x₁)²`, or (the harp) of a plucked string, each fading at its own speed:

| Instrument | How it vibrates | Equation | Tones |
| --- | --- | --- | --- |
| Bells (glockenspiel) | A bar free at both ends | `cos x · cosh x = 1` | 1 : 2.7565 : 5.4039 : 8.9330 |
| Music box, kalimba | A bar clamped at one end | `cos x · cosh x = −1` | 1 : 6.2669 : 17.5475 |
| Marimba | A free bar, carved to be in tune | (tuned by the maker) | 1 : 4 : 9.2 |
| Harp (rain picture: snow) | A string plucked at p = 0.3 of its length | `bₙ = 2h·sin(nπp) ÷ (n²π²·p(1 − p))` | 1 : 2 : 3 … 8, tone n as loud as sin(nπp) ÷ n |

The first two rows were computed on 15 Nov; source S12 gives the free bar as 1 : 2.76 : 5.40 and
the marimba's 4.0 and 9.2. The harp's row: a string pulled to height h at p and let go starts as a
triangle, whose Fourier sine coefficients are the bₙ above; the sound comes from the force on the
bridge, T·∂y/∂x at the string's end, which is nπ·bₙ for tone n, so tone n is as loud as
sin(nπp) ÷ n compared with the first. A unit test sums the series back into the triangle and checks
every tone. p = 0.3 (so no tone below the tenth is missing), eight tones and tone n ringing 1 ÷ n
as long are design choices; nobody has listened yet. A vibraphone was considered first and not
used: its tuning (1 : 4 : 10) and tremolo rate could not be confirmed from a source we could read. The marimba has a few milliseconds of soft noise for the mallet, and
the bells a second, quieter copy of the lowest tone 1.3 Hz above it, which gives a slow shimmer.
The held notes are slightly detuned saw waves through a low-pass filter, with a little vibrato
at three speeds. The low note is played with its octave and its fifth, and a new low note fades
in while the old one fades out.

**Measured, 15 Nov (the ocean picture)**, on `data/preview.jpg` (frame 23000) in Chromium, with
the ocean's settings. Sound levels come from recordings of the running app at its default volumes.
The aerosol and rain pictures' sweeps are recorded in their own sections of
`docs/measurements/scan_sound.md`.

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
Two later runs, with each picture's own rule in place, gave 5.84, 5.68 and 5.34 dB, then 6.18,
5.77 and 5.65 dB. The tone always rises, but by 5.3 to 6.5 dB a doubling over the four runs.
**Unverified:** why the runs differ (the code on this path did not change between them).

**The harp's level** (Design choice, measured). One struck C6 at full strength on each
instrument, alone (`scan_sound.md`, "One struck note on each instrument, alone"): the harp's level
in each scan sound was set so its note is as loud as that sound's cool instrument. Measured after
the change: Ocean choir harp −19.4 LUFS and bells −19.6; Music box harp −21.5 and music box −21.6;
Plain harp −19.6 and bells −19.6. Before it, the harp was 1.8 to 3.2 LU quieter.

Checked in a recording of the map sweep:

- Low note: in each of the 8 steps the expected root (C2, A1, F2, G2, twice) is the strongest
  of the four root tones, by 41 dB or more.
- Left and right: in the first 5 s the left channel is 9.5 dB louder than the right, they cross
  between 15 and 20 s, and in the last 5 s the right is 9.3 dB louder.

**Tests.** `web/src/audio/scanScore.test.ts`: 89 tests on made-up pictures (TEST INPUTS). The
main one is a picture with three dots, which must give exactly three chimes: columns 41, 81 and
201, bands 1, 8 and 5, marimba for the red dot and bells for the green and blue ones. Black,
grey and grey with JPEG-sized noise are `missing` and silent. The root steps, the left–right
position, the note spacing and the brightness measure each have their own tests. Three more say
exactly which notes clash (none of the held notes with each other; F under E). Added 15 Nov for
each picture's own rule: a floor above a navy ground, a mask (a masked cell is no data; a
half-masked cell has the mean of what it read; a mask of the wrong size is an error; the radar cuts
the mask with the circle), the no-data neighbour rule, `resampleMask`, and the three colour classes
on the colours of NASA's rain and snow bars, including that a navy sea below the floor never turns
light rain into snow.
`web/src/audio/instruments.test.ts`: 7 tests. Three solve the two bar equations again and compare
the answers with the ratios the instruments use; four check the harp: the plucked string's Fourier
series sums back into its triangle, each tone's loudness, no missing tone, and the fade.
`web/src/data/scanRules.test.ts`: 18 tests: each picture's settings and every number the app quotes
about it equal `docs/measurements/scan_pictures.json`; the aerosol and rain settings are what the
procedure gives; no picture's words name another picture. `analysis/tests/test_scan_mask.py`: 6
tests on made-up frames for the rain picture's mask. `web/src/audio/scanWhy.test.ts`: 52 tests on
made-up pictures: each dot explains itself with its place, numbers and instrument; a peak left out
names the stronger one that took its place, for both reasons; places on a world map, another picture
and the radar; the whole column; a cell with no data; the third instrument; and each picture's own
list of fixed choices. `web/e2e/scan-pictures.e2e.ts`: 8 browser tests on made-up pictures read
with the real rain and aerosol rules (`VITE_DATASET=practice-pictures`, its own Playwright project):
the rain picture's notes on three instruments, its land never read; changing the picture while the
scan plays; changing the scan sound while it plays; the radar's no-data cells in the table and the
bars; reduced motion; the explanation in each picture's own numbers, never announced; the Earth
rhythm's schedule while the rain picture is scanned; and every picture's notes and Esc.
`web/e2e/scan-why.e2e.ts`: 8 browser
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
| The line runs west to east and the readout gives its longitude | Verified for each picture | Each picture's rule states it is a whole-world map (`worldMap`), from the map checks in `assets/source_manifest.json` (Student A: a grid overlay on each). It is no longer found by searching a scene's limitations for a word. A made-up TEST INPUT picture is never a world map |
| Each picture's settings were measured before they were written | Verified | A unit test compares every rule in `sources.ts`, and every number the app quotes about a picture, with `scan_pictures.json` |
| Which still each picture plays | Verified | Ocean: frame 23000. Aerosols: the one still. Rain: frame 0, the closest of its 30 frames (each picture's own section of the report) |
| Pitch is height on the map, in 12 equal bands | Design choice | Limits in "What we do not claim" |
| Loudness is a cell's mean colour strength | Design choice | Limits in "What we do not claim" |
| The sound gets louder as the level rises | Verified | On a recorded test picture each doubling of the level raised that band's tone by 5.3 to 6.5 dB over four runs; 6.0 is exact. Why the runs differ is Unverified |
| Black sea and grey land are silent (ocean) | Verified | Of 746 cells that are 90% or more grey land or black sea in the uncompressed frame, none sounds. Largest cell mean 7.67/255; the floor is 12/255 |
| Grey land is silent (aerosols) | Verified | Of 194 cells that are 90% or more the commonest colour (the grey-green land), none sounds at its floor, 20/255 |
| The navy sea is silent and the land is never read (rain) | Verified, with one exception explained | Of 1,108 cells that are 90% or more navy, 1 sounds: 10% of its pixels are drawn rain. The mask matches the regions' own masks pixel for pixel inside both circles |
| A cell with nothing read is no data, never a zero | Verified | Unit tests (smoothing, low note, explanation) and browser tests (table, bars, hatch) on made-up pictures |
| A peak of colour gives one struck note | Design choice | 39% to 61% of peaks are left out |
| Red and orange strike one instrument, the rest another | Design choice | The switch on each picture's NASA bar is measured; what it means in degrees (ocean) or mm an hour (rain) is Unverified |
| Snow strikes its own instrument (rain) | Design choice | Measured on NASA's bars: all 10 snow steps and no rain step are on the blue side. In the still, every harp note is in a snow-coloured cell |
| The harp's tones are a plucked string's | Verified | A unit test sums the plucked string's Fourier series back into its triangle and checks each tone; the pluck point and the fade are design choices |
| Only what is drawn chooses the instrument | Design choice | Measured: no ocean note changes instrument when pixels below the floor stop voting |
| The held notes never clash with each other | Verified | A test, with "clash" defined as 1, 6 or 11 semitones apart |
| The low note never clashes with the held notes | Corrected | It did claim this. F under E is a major seventh |
| Wide spacing at the bottom is clearer than close spacing | Unverified | No source. To do: derive it from critical bandwidth, with a source someone has read |
| The bars' tone ratios | Verified | A test solves both equations |
| The low note's steps and the left–right position carry no data | Verified | Recordings above |
| Every scan sound plays the same score | Verified by construction | The browser test compares the first chime only |
| Nothing clips with all three voices, and Stop leaves silence | Verified | Recorded twice with today's instruments: largest sample −5.0 and −5.2 dBFS; every sample 0 from 0.15 s after Stop. Recorded twice more with each picture's own rule, each picture in its own section of `scan_sound.md`: every largest sample below −4 dBFS, and every sample 0 from 0.15 s after Stop |
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
- **Aerosols.** The scan reads how strongly the plumes are coloured, not how much aerosol there is.
  Sea salt is drawn pale grey-teal on NASA's own bar, so it is quiet: the sea-salt circle strikes no
  note. Dust, sea salt and sulfate ring the same instrument; only black carbon (smoke) strikes the
  other. A struck note's aerosol type is the colour of NASA's bar its cell is nearest to (measured
  for every note); a cell can hold more than one.
- **Rain.** Over land the scan reads nothing, because the land is a photo: no rain is heard there.
  That is no data, not "no rain". Faint rain at sea can be below the floor: 510 of the 742 map
  cells that are 10% or more rain or snow colour sound. Snow and light rain no longer share an
  instrument, but nobody has listened to tell the harp apart yet. The colours describe the drawn
  picture of satellite estimates, not how much it rains.
- Each picture's numbers are its own: a louder rain sweep says nothing about the ocean or the air.
