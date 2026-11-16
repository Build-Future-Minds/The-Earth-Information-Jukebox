# Picture scan: measurements on the NASA pictures

Written by `npm run measure` (in `web/`). Do not edit by hand: run it again.

Measured 2026-11-16 00:31 UTC in Chromium 159.0.8154.6, on commit cdca469 with uncommitted changes.
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

NASA's colour bar, `assets/frames/svs3912/sst_ecco2_cbar.png` (310×95), row 28, coloured from x 14 to 291.
"Red is the largest channel" is false at the cold end and true at the warm end, and changes 1 time:
- at 74.4% of the bar's length, which is 23.8 °C **if** the bar is linear between its end labels (0 and 32; read by eye, not measured).

Colour strength along the bar, every tenth, cold end first: 0.47, 0.64, 0.53, 0.67, 0.76, 0.73, 0.84, 0.87, 0.86, 0.87, 0.90.
For the same share of a cell covered by lines, the cell mean is 1.93 times larger at the warm end than at the cold end.

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

## Check on this tool

The tool repeats the rule's "which cell is this pixel in" to add weights and masks. Largest difference between its levels and the rule's, per picture (must be 0):
ocean 0, aerosols 0, imerg 0.
