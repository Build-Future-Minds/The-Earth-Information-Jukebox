# Picture scan: measurements on the NASA pictures

Written by `npm run measure` (in `web/`). Do not edit by hand: run it again.

Measured 2026-11-16 04:46 UTC in Chromium 159.0.8154.6, on commit 5049697 with uncommitted changes.
The rule is `web/src/audio/scanScore.ts`, run in the browser on the stills the app plays.
Map sweep: 240 columns × 12 bands. Floor 12/255.
A chime needs level 0.3, 6 columns from the next in its band, 1 per column.

Each picture has its own settings and its own numbers. **Never compare a number in one row with another picture's row.**

## The map sweep, each picture

| Picture | Measure | Cells that sound | Cells at full level | Largest cell mean | Peaks → spaced → played | Left out | Marimba | Bells |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ocean (SVS 3912) | colour | 60.0% | 0.0% | 0.463 | 112 → 75 → 68 | 39% | 53 | 15 |
| ocean (SVS 3912) | brightness | 96.8% | 0.1% | 0.507 | 271 → 174 → 126 | 54% | 63 | 63 |
| aerosols (SVS 5669) | colour | 83.8% | 0.0% | 0.429 | 53 → 47 → 41 | 23% | 3 | 38 |
| aerosols (SVS 5669) | brightness | 99.3% | 3.1% | 0.775 | 210 → 165 → 122 | 42% | 7 | 115 |
| imerg (SVS 4285) | colour | 88.9% | 0.2% | 0.622 | 89 → 73 → 62 | 30% | 15 | 47 |
| imerg (SVS 4285) | brightness | 100.0% | 16.4% | 0.976 | 176 → 138 → 106 | 40% | 28 | 78 |

"Peaks → spaced → played": peaks at the chime level, then after the spacing rule, then after one per column.

## The radar, each approved circle (measured by colour)

| Picture | Circle | Cells that sound | Largest cell mean | Peaks → spaced → played | Left out | Marimba | Bells |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ocean | Kuroshio eddies east of Japan | 98% | 0.74 | 102 → 83 → 56 | 45% | 11 | 45 |
| ocean | Equatorial Pacific streaks | 100% | 0.80 | 187 → 125 → 72 | 61% | 72 | 0 |
| aerosols | Sulfate and sea-salt streaks near Vanuatu | 100% | 0.77 | 60 → 59 → 37 | 38% | 0 | 37 |
| aerosols | Sea-salt cells in the southeast Pacific | 100% | 0.15 | 0 → 0 → 0 | none | 0 | 0 |
| imerg | Long rain band in the South Pacific | 99% | 0.90 | 64 → 51 → 39 | 39% | 1 | 38 |
| imerg | Scattered showers on the equator in the central Pacific | 98% | 0.90 | 15 → 9 → 8 | 47% | 2 | 6 |

## The circles on the ground (derived from the map geometry, not measured)

A circle of r pixels spans r · 360 ÷ width degrees east–west and r · 180 ÷ height north–south.
On the ground the east–west span shrinks by cos(latitude). The last column is width ÷ height on the ground: 1 is round.

| Picture | Circle | Centre | Radius east–west | Radius north–south | Ground width ÷ height |
| --- | --- | --- | --- | --- | --- |
| ocean | Kuroshio eddies east of Japan | 28.8° N, 149.1° E | 10.72° | 10.72° | 0.876 |
| ocean | Equatorial Pacific streaks | 1.4° N, 132.4° W | 10.72° | 10.72° | 1.000 |
| aerosols | Sulfate and sea-salt streaks near Vanuatu | 19.2° S, 167.8° E | 10.31° | 9.17° | 1.063 |
| aerosols | Sea-salt cells in the southeast Pacific | 16.7° S, 105.0° W | 10.31° | 9.17° | 1.078 |
| imerg | Long rain band in the South Pacific | 17.5° S, 137.5° W | 10.00° | 10.00° | 0.954 |
| imerg | Scattered showers on the equator in the central Pacific | 0.0° N, 150.0° W | 10.00° | 10.00° | 1.000 |

## Do land and empty sea stay silent? (the other pictures)

Land here is the ocean still's grey land, used as an outline on the other whole-globe maps.
"Land cells" are 90% or more land by that outline; "sea cells" 10% or less.

| Picture | Cells | How many | That sound | Mean level | Mean colour strength |
| --- | --- | --- | --- | --- | --- |
| aerosols | sea | 1487 | 93% | 0.125 | 0.103 |
| aerosols | land | 518 | 59% | 0.110 | 0.090 |
| imerg | sea | 1489 | 100% | 0.141 | 0.111 |
| imerg | land | 518 | 61% | 0.167 | 0.108 |

| Picture | With land pixels left out: cells that sound | Cells with nothing read | Chimes | Marimba |
| --- | --- | --- | --- | --- |
| aerosols | 81.0% | 253 | 43 | 2 |
| imerg | 86.7% | 253 | 55 | 10 |

## Equal latitude bands on a stretched map (ocean)

"Change" is how far a level moves when each pixel is weighted by cos(latitude) inside its cell.

| Band | Latitude | Share of the globe | Mean level | Mean change | Largest change |
| --- | --- | --- | --- | --- | --- |
| 0 | -90° to -75° | 1.70% | 0.000 | 0.0000 | 0.0000 |
| 1 | -75° to -60° | 5.00% | 0.023 | 0.0078 | 0.0288 |
| 2 | -60° to -45° | 7.95% | 0.220 | 0.0064 | 0.0267 |
| 3 | -45° to -30° | 10.36% | 0.219 | 0.0052 | 0.0202 |
| 4 | -30° to -15° | 12.06% | 0.238 | 0.0019 | 0.0145 |
| 5 | -15° to 0° | 12.94% | 0.350 | 0.0014 | 0.0044 |
| 6 | 0° to 15° | 12.94% | 0.419 | 0.0011 | 0.0045 |
| 7 | 15° to 30° | 12.06% | 0.197 | 0.0024 | 0.0117 |
| 8 | 30° to 45° | 10.36% | 0.118 | 0.0030 | 0.0239 |
| 9 | 45° to 60° | 7.95% | 0.040 | 0.0021 | 0.0160 |
| 10 | 60° to 75° | 5.00% | 0.009 | 0.0019 | 0.0323 |
| 11 | 75° to 90° | 1.70% | 0.028 | 0.0103 | 0.1296 |

Chimes: 68 as the rule stands, 70 with the weighting.

## Which temperature switches the instrument? (ocean)

NASA's colour bar, `assets/frames/svs3912/sst_ecco2_cbar.png` (310×95), read as the file stores it. The file carries a colour profile; the browser's own drawing of it differs from the stored numbers by 0 grey levels at most.
The bar is rows 28 to 67 (they differ by 0 grey levels at most), coloured from x 14 to 291.
"Red is the largest channel" is false at the cold end and true at the warm end, and changes 1 time:
- between x 219 and 220, at 74.4% of the coloured length.

### Where the printed labels sit

The labels are rows 73 to 85. A label's place is the centre of its ink (each pixel weighted by its opacity); the centre of its box is given too.
A straight line x = a + b · T is fitted to the four ink centres by least squares: a = 13.11, b = 8.7308 pixels per °C.

| Label | Pixels | Centre of its ink | Centre of its box | Off the line (ink) | Off the line (box) |
| --- | --- | --- | --- | --- | --- |
| 0 °C | 9 to 16 | 12.66 | 12.5 | -0.45 px (-0.051 °C) | -0.40 px |
| 10 °C | 93 to 108 | 101.04 | 100.5 | +0.62 px (0.071 °C) | +0.44 px |
| 20 °C | 180 to 195 | 187.78 | 187.5 | +0.06 px (0.007 °C) | +0.28 px |
| 32 °C | 284 to 299 | 292.27 | 291.5 | -0.23 px (-0.026 °C) | -0.31 px |

Largest distance of a label from the line: 0.62 px by ink, 0.44 px by box, which is 0.071 and 0.050 °C.
The line puts 0 °C at x 13.11 and 32 °C at x 292.50; the coloured part of the bar runs from x 14 to 291.

The switch (edge at x 219.5) is at:
- 23.64 °C by the line through the four ink centres (23.70 °C through the box centres);
- 23.64 °C between the labels 20 and 32 alone;
- 23.80 °C by the reading used until now (the coloured ends taken as 0 and 32).

Colour strength of single pixels of the bar, every tenth of its length, cold end first: 0.47, 0.64, 0.53, 0.67, 0.76, 0.73, 0.84, 0.87, 0.86, 0.87, 0.90.
The two end pixels differ by 1.93 times. Single pixels are not the frame's colours: the next section measures those.

## Do the frame's lines use the bar's colours? (ocean, uncompressed frame 23000)

Every pixel of the uncompressed frame whose spread (largest − smallest channel) is over 12, the scan's floor: 768999 pixels in 87796 colours.
For each, the bar colour with the nearest hue. Hue does not change when a line is drawn faintly over black (all three channels scaled by the same number), and neither does the angle between two colours seen as (red, green, blue) arrows.
Along the bar the hue runs from 227.9° at the cold end to 354.3° at the warm end: 266 steps down, 1 up, turning back at 100.0% of the bar.
Rounding to whole grey levels moves a pixel's hue by up to 60° ÷ spread for each level, so faint pixels cannot match closely. The table gives the share within 3°, and within 3° or two grey levels' worth (120° ÷ spread), whichever is larger.

| Spread (grey levels) | Pixels | Hue within 3° | Within 3° or two levels | Within 3° by colour angle | Hue gap that half / 90% / 99% are within | Same instrument as the nearest bar colour |
| --- | --- | --- | --- | --- | --- | --- |
| 13 to 31 | 149612 | 100.0% | 100.0% | 1.2% | 0.25° / 0.50° / 0.70° | 98.63% |
| 32 to 63 | 187631 | 100.0% | 100.0% | 1.2% | 0.25° / 0.50° / 0.75° | 99.36% |
| 64 to 127 | 265701 | 100.0% | 100.0% | 1.3% | 0.25° / 0.50° / 0.70° | 99.64% |
| 128 to 255 | 166055 | 100.0% | 100.0% | 1.5% | 0.25° / 0.50° / 0.65° | 99.83% |
| All | 768999 | 100.0% | 100.0% | 1.3% | 0.25° / 0.50° / 0.70° | 99.42% |

Neighbouring bar colours are at most 2.44° apart in hue, so any hue inside the bar's range is within 1.22° of a bar colour. A hue match therefore shows two things only: the frame uses no hue outside the bar's range, and each pixel's hue is on a known side of the switch. It does not show that the frame's colours are the bar's colours. The whole colour (the angle between the arrows) is within 3° for 1.3% of pixels.

Pixels further than 3° from every bar hue: 11 of 768999; further than 3° or two grey levels: 10.
Weighted by colour strength, as the scan weighs them: 100.0% within 3°, 100.0% within 3° or two levels, and 99.65% on the same side of the instrument switch as the nearest bar colour.
Of all the colour, 53.1% is warm by the pixel rule, and 52.8% is nearest to a bar colour past the switch.
Colour on the other side of the switch from its nearest bar colour, by where that bar colour is: 70–75% of the bar, 0.35% of all colour.

How strong and how bright the frame's colours are, by the tenth of the bar their hue belongs to. "Strength" is the spread ÷ 255, the scan's colour strength. "Saturation" is spread ÷ largest channel, which a line drawn faintly over black keeps.

| Tenth of the bar (cold to warm) | Frame pixels | Bar: strength (mean of the tenth) | Frame: strength 99% are below | Frame: strongest | Frame ÷ bar saturation (middle pixel) | Largest brightness ÷ bar colour's |
| --- | --- | --- | --- | --- | --- | --- |
| 0–10% | 88028 | 0.706 | 0.820 | 0.988 | 1.28 | 1.10 |
| 10–20% | 87420 | 0.576 | 0.635 | 0.812 | 1.34 | 1.01 |
| 20–30% | 70457 | 0.603 | 0.749 | 0.925 | 1.34 | 1.06 |
| 30–40% | 43563 | 0.728 | 0.843 | 0.992 | 1.31 | 1.07 |
| 40–50% | 23027 | 0.745 | 0.737 | 0.890 | 1.11 | 1.00 |
| 50–60% | 43631 | 0.782 | 0.816 | 0.890 | 1.07 | 1.00 |
| 60–70% | 58373 | 0.857 | 0.910 | 0.984 | 1.11 | 1.00 |
| 70–80% | 66185 | 0.863 | 0.914 | 1.000 | 1.15 | 1.02 |
| 80–90% | 223536 | 0.865 | 0.976 | 1.000 | 1.12 | 1.03 |
| 90–100% | 64779 | 0.903 | 0.949 | 1.000 | 1.11 | 1.03 |

Warmest tenth ÷ coldest tenth: 1.28 on the bar (tenth means), 1.01 for the frame's strongest pixels, 1.16 for the strength 99% are below.

The colour furthest from the bar (outside 3° or two levels), by 10° of hue, largest first:

| Hue | Share of all colour | Share of the off-bar colour | Pixels | Most common colour (R, G, B) |
| --- | --- | --- | --- | --- |
| 240° to 250° | 0.00% | 24.6% | 2 | 7, 7, 20 |
| 330° to 340° | 0.00% | 24.1% | 2 | 94, 30, 57 |
| 230° to 240° | 0.00% | 17.9% | 2 | 38, 43, 89 |
| 340° to 350° | 0.00% | 17.4% | 1 | 79, 11, 29 |
| 310° to 320° | 0.00% | 6.9% | 1 | 41, 14, 36 |
| 270° to 280° | 0.00% | 5.4% | 1 | 26, 13, 34 |

## The JPEG the app reads against the uncompressed frame (ocean, frame 23000)

Mean difference per colour channel: 6.93 grey levels.

| In the uncompressed frame | Pixels | Share of the map | Of these, above the floor in the JPEG |
| --- | --- | --- | --- |
| Grey land (channels within 2, mean 30 to 80) | 701569 | 33.5% | 1.58% |
| Black sea (largest channel 8 or less) | 561994 | 26.8% | 35.86% |

| Cells that are grey land or black sea | How many | That sound | Largest cell mean (floor 12/255) |
| --- | --- | --- | --- |
| Every pixel of the cell | 235 | 0 | 0.78/255 |
| 98% of the cell or more | 434 | 0 | 2.72/255 |
| 90% of the cell or more | 746 | 0 | 7.67/255 |

|  | JPEG still | Uncompressed frame |
| --- | --- | --- |
| Cells that sound | 1727 | 1816 |
| Chimes | 68 | 84 |
| Largest cell mean | 0.463 | 0.507 |

Levels differ by 0.0432 on average and 0.1521 at most.
49 of the JPEG's 68 chimes are at the same column and band, on the same instrument, as a chime of the uncompressed frame.

## Which still should the scan read? (ocean, frame 23000)

Each copy is read the way the app reads its still, and scanned by the app's rule. "Same place" is the same column and band as a chime of the uncompressed frame; "and instrument" also the same instrument.
The 4:4:4 JPEG (quality=90, subsampling=0) and the lossless WebP (lossless=True, method=6) are made from the TIF with Pillow 12.3.0 (libjpeg-turbo 3.1.4.1). They are git-ignored, beside the frame. The globe land rule is the globe page's: flat grey pixels (`geo.ts`, `landShare`), on the still drawn at the frame's size.

|  | The app's still (`data/preview.jpg`) | JPEG 4:4:4, quality 90 | WebP, lossless | Uncompressed frame |
| --- | --- | --- | --- | --- |
| File | 0.68 MB, JPEG 4:2:0, quality 82 (libjpeg's standard tables) | 1.56 MB, JPEG 4:4:4, quality 90 (libjpeg's standard tables) | 2.43 MB, WebP lossless (method 6) | 3.34 MB, PNG from the TIF (6.30 MB) |
| Largest difference from the uncompressed frame, any pixel and channel (grey levels) | 168 | 69 | 0 | 0 |
| Map sweep: cells that sound | 1727 (60.0%) | 1901 (66.0%) | 1816 (63.1%) | 1816 (63.1%) |
| Map sweep: chimes (marimba, bells) | 68 (53, 15) | 86 (56, 30) | 84 (57, 27) | 84 (57, 27) |
| Of these, same place and instrument as the uncompressed frame | 49 | 76 | 84 | 84 |
| Of these, same place, either instrument | 50 | 77 | 84 | 84 |
| Level change against the uncompressed frame: mean, largest | 0.0432, 0.1521 | 0.0080, 0.0377 | 0.0000, 0.0000 | 0.0000, 0.0000 |
| Radar, Kuroshio eddies east of Japan: cells that sound | 1416 of 1440 | 1414 of 1440 | 1396 of 1440 | 1396 of 1440 |
| Radar, Kuroshio eddies east of Japan: chimes (marimba, bells) | 56 (11, 45) | 74 (15, 59) | 75 (16, 59) | 75 (16, 59) |
| Radar, Kuroshio eddies east of Japan: same place and instrument | 32 | 63 | 75 | 75 |
| Globe land rule, Kuroshio eddies east of Japan: flat grey share of the circle | 0.14% | 0.03% | 0.00% | 0.00% |
| Radar, Equatorial Pacific streaks: cells that sound | 1438 of 1440 | 1439 of 1440 | 1436 of 1440 | 1436 of 1440 |
| Radar, Equatorial Pacific streaks: chimes (marimba, bells) | 72 (72, 0) | 85 (85, 0) | 81 (81, 0) | 81 (81, 0) |
| Radar, Equatorial Pacific streaks: same place and instrument | 33 | 66 | 81 | 81 |
| Globe land rule, Equatorial Pacific streaks: flat grey share of the circle | 0.04% | 0.01% | 0.00% | 0.00% |

## The globe and the flat picture (ocean)

The Globe tab draws the scan round the globe from the same pixels and the same rule as Play along. Each scan was
read in both places in the running app; the globe was drawn by ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver).

| Scan | Cells | Chimes | Same levels, means, chimes and left-out peaks on the globe |
| --- | --- | --- | --- |
| Whole picture: a line, west to east | 2880 | 68 | yes, every number |
| Region A: a radar turn | 1440 | 56 | yes, every number |
| Region B: a radar turn | 1440 | 72 | yes, every number |

## Check on this tool

The tool repeats the rule's "which cell is this pixel in" to add weights and masks. Largest difference between its levels and the rule's, per picture (must be 0):
ocean 0, aerosols 0, imerg 0.
