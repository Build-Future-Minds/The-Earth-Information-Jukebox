# Picture scan: measurements on the NASA pictures

Written by `npm run measure` (in `web/`). Do not edit by hand: run it again.

Measured 2026-11-16 03:03 UTC in Chromium 159.0.8154.6, on commit c5520b2 with uncommitted changes.
The rule is `web/src/audio/scanScore.ts`, run in the browser on the stills the app plays.

**Each picture has its own section, its own settings and its own numbers. No table here holds two pictures. Never compare a number in one section with a number in another.**

The rule, the same for every picture (not a setting):

- Map sweep: 240 columns × 12 bands, 30 s. Radar: 120 columns × 12 bands, 15 s, each cell read at 16 points.
- A chime needs level 0.3, 6 columns from the next in its band, 1 per column.
- A cell that reads nothing (masked, or outside the picture) is no data: silent, never a peak, left out of the smoothing and of the low note.
- The instrument is chosen by the pixels above the floor only, each weighted by its colour strength: warm when red is their largest channel; for a picture with a third instrument, blue when blue is (a tie with green counts as blue); cool otherwise.

Each picture's settings (`web/src/data/sources.ts`, `scan`) were chosen by this procedure, the same for every picture:

- **Floor:** the colour strength of the commonest colour among the pixels read, plus 12 grey levels (the tolerance for JPEG noise).
- **Full level:** the largest cell mean on that scan (the radar: the larger of the two circles), rounded up to 0.05, so no cell is clipped.
- **Mask:** the picture's `scan_mask.png`, if it has one (written by `analysis/scan_mask.py`).

The ocean picture keeps the settings it was built with on 15 Nov; its section shows where they differ from the procedure.

## Ocean (SVS 3912)

Global Sea Surface Currents and Temperature. The still the app plays is 2048 × 1024; NASA's frames are 2048 × 1024.

### Settings

Measured with this picture's rule in `web/src/data/sources.ts`. The last column is what the procedure gives (see the top of this page).

| Setting | Measured with | The procedure gives |
| --- | --- | --- |
| Measure | colour | colour |
| Floor | 12/255 | 12/255 |
| Full level, map sweep | 0.5 | 0.5 |
| Full level, radar | 0.75 | 0.85 |
| Mask (pixels never read) | none | none |
| A third instrument for the blue side | no | (chosen from the legend, not by the procedure) |

### Which still

Compared with NASA's frame 23000 (`assets/frames/svs3912/flat_global_ecco2_2028x1024.23000.png`, 2007-03-25T12:00Z), drawn at the still's size by the browser: mean difference 6.93 grey levels a channel.

### What "nothing drawn" looks like, and the floor

The commonest colour among the pixels the scan reads is RGB (49, 49, 49), colour strength 0.0 grey levels. 32.2% of the pixels read are within 12 grey levels of it on every channel.

| Cells that are this colour | How many | That sound | Largest cell mean |
| --- | --- | --- | --- |
| Every pixel read | 193 | 0 | 0.42/255 |
| 98% of the pixels read or more | 309 | 0 | 0.78/255 |
| 90% of the pixels read or more | 475 | 0 | 4.74/255 |

| Cells where some pixels are not this colour | How many | Sound at this floor (12/255) | Sound at 12/255 |
| --- | --- | --- | --- |
| 1% or more | 2624 | 1727 | 1727 |
| 10% or more | 2405 | 1727 | 1727 |

| Cells where some pixels are drawn in a colour of NASA's bar, above the floor | How many | Sound at this floor (12/255) | Sound at 12/255 |
| --- | --- | --- | --- |
| 1% or more | 2268 | 1727 | 1727 |
| 10% or more | 2054 | 1727 | 1727 |

Grey land by this picture's land rule (mean 30 to 80, channels within 12): 518 cells are 90% or more grey land, 0 of them sound, largest cell mean 4.74/255.

### Pixels never read

None: every pixel is read.

### The map sweep

|  | Cells that sound | No data | At full level | Largest cell mean | Peaks → spaced → played | Left out | Marimba (warm) | Bells (cool) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| colour, as measured with | 60.0% | 0 | 0.0% | 0.463 | 112 → 75 → 68 | 39% | 53 | 15 |
| brightness, same floor and full level (for the record) | 96.8% | 0 | 0.1% | 0.507 | 271 → 174 → 126 | 54% | 60 | 66 |
| colour at the ocean's floor, 12/255 (for the record) | 60.0% | 0 | 0.0% | 0.463 | 112 → 75 → 68 | 39% | 53 | 15 |

"Peaks → spaced → played": peaks at the chime level, then after the spacing rule, then after one per column.

### The radar, each circle

| Circle | Cells that sound | No data | At full level | Largest cell mean | Peaks → spaced → played | Left out | Marimba (warm) | Bells (cool) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Kuroshio eddies east of Japan | 98% | 0 | 0.0% | 0.74 | 102 → 83 → 56 | 45% | 11 | 45 |
| Kuroshio eddies east of Japan, at the ocean's floor 12/255 (for the record) | 98% | 0 | 0.0% | 0.74 | 102 → 83 → 56 | 45% | 11 | 45 |
| Equatorial Pacific streaks | 100% | 0 | 0.2% | 0.80 | 187 → 125 → 72 | 61% | 72 | 0 |
| Equatorial Pacific streaks, at the ocean's floor 12/255 (for the record) | 100% | 0 | 0.2% | 0.80 | 187 → 125 → 72 | 61% | 72 | 0 |

### What each instrument means in this picture

Each struck note is given the colour of NASA's bar that most of its cell's pixels are nearest to. "Nearest" compares the direction of a colour only (the colour minus its smallest channel), so a colour faded into black or grey keeps its direction. A pixel within about 26° of a bar colour (cos 0.9) votes for it, weighted by its colour strength; pixels at or below the floor do not vote.

**Map sweep**

| Colour of the bar | Marimba (warm) | Bells (cool) |
| --- | --- | --- |
| sea surface temperature, 80–90% of the bar | 40 | 0 |
| sea surface temperature, 90–100% of the bar | 11 | 0 |
| sea surface temperature, 70–80% of the bar | 2 | 2 |
| sea surface temperature, 20–30% of the bar | 0 | 4 |
| sea surface temperature, 60–70% of the bar | 0 | 4 |
| sea surface temperature, 50–60% of the bar | 0 | 3 |
| sea surface temperature, 30–40% of the bar | 0 | 2 |

**Kuroshio eddies east of Japan**

| Colour of the bar | Marimba (warm) | Bells (cool) |
| --- | --- | --- |
| sea surface temperature, 70–80% of the bar | 8 | 4 |
| sea surface temperature, 80–90% of the bar | 3 | 0 |
| sea surface temperature, 50–60% of the bar | 0 | 20 |
| sea surface temperature, 30–40% of the bar | 0 | 4 |
| sea surface temperature, 60–70% of the bar | 0 | 15 |
| sea surface temperature, 40–50% of the bar | 0 | 2 |

**Equatorial Pacific streaks**

| Colour of the bar | Marimba (warm) | Bells (cool) |
| --- | --- | --- |
| sea surface temperature, 80–90% of the bar | 71 | 0 |
| sea surface temperature, 70–80% of the bar | 1 | 0 |

Pixels read above the floor, by the colour of the bar they are nearest to: sea surface temperature, 0–10% of the bar 15.2%, sea surface temperature, 10–20% of the bar 8.7%, sea surface temperature, 20–30% of the bar 7.5%, sea surface temperature, 30–40% of the bar 4.9%, sea surface temperature, 40–50% of the bar 8.5%, sea surface temperature, 50–60% of the bar 3.9%, sea surface temperature, 60–70% of the bar 6.2%, sea surface temperature, 70–80% of the bar 8.0%, sea surface temperature, 80–90% of the bar 20.7%, sea surface temperature, 90–100% of the bar 16.3%, no colour of the bar 0.1%.

### NASA's colour bar

`assets/frames/svs3912/sst_ecco2_cbar.png` (310×95), the sea surface temperature bar: read along row 28, coloured (channels spread more than 100) from x 14 to 291.
"Red is the largest channel" is false at the left end and true at the right end, and changes 1 time:
- at 74.4% of the bar's length, from RGB (251, 252, 33) to (251, 250, 33), which is 23.8 °C **if** the bar is linear between its end labels (0 and 32; read by eye, not measured).

Colour strength along the bar, every tenth, left end first: 0.47, 0.64, 0.53, 0.67, 0.76, 0.73, 0.84, 0.87, 0.86, 0.87, 0.90.
For the same share of a cell covered by lines, the cell mean is 1.93 times larger at the right end than at the left end.

### The still against NASA's frame

The same rule and settings on the still and on NASA's frame 23000 (2048 × 1024, read at its own size).

|  | Still | NASA's frame |
| --- | --- | --- |
| Map sweep: cells that sound | 1727 | 1816 |
| Map sweep: chimes | 68 | 84 |
| Map sweep: largest cell mean | 0.463 | 0.507 |
| Radar, Kuroshio eddies east of Japan: chimes | 56 | 75 |
| Radar, Equatorial Pacific streaks: chimes | 72 | 81 |

Levels differ by 0.0432 on average and 0.1521 at most. 49 of the still's 68 map-sweep chimes are at the same column and band, on the same instrument, as a chime of the frame.
Kuroshio eddies east of Japan: 32 of the still's 56 chimes are at the same place, on the same instrument.
Equatorial Pacific streaks: 33 of the still's 72 chimes are at the same place, on the same instrument.

In the uncompressed frame land is exactly grey and empty sea exactly black. Mean difference per colour channel between it and the still: 6.93 grey levels.

| In the uncompressed frame | Pixels | Share of the map | Of these, above the floor in the still |
| --- | --- | --- | --- |
| Grey land (channels within 2, mean 30 to 80) | 701569 | 33.5% | 1.58% |
| Black sea (largest channel 8 or less) | 561994 | 26.8% | 35.86% |

| Cells that are grey land or black sea | How many | That sound | Largest cell mean |
| --- | --- | --- | --- |
| Every pixel of the cell | 235 | 0 | 0.78/255 |
| 98% of the cell or more | 434 | 0 | 2.72/255 |
| 90% of the cell or more | 746 | 0 | 7.67/255 |

### The circles on the ground (derived from the map geometry, not measured)

| Circle | Centre | Radius east–west | Radius north–south | Ground width ÷ height |
| --- | --- | --- | --- | --- |
| Kuroshio eddies east of Japan | 28.8° N, 149.1° E | 10.72° | 10.72° | 0.876 |
| Equatorial Pacific streaks | 1.4° N, 132.4° W | 10.72° | 10.72° | 1.000 |

### Equal latitude bands on a stretched map

"Change" is how far a level moves when each pixel is weighted by cos(latitude) inside its cell. Cells with no data are left out.

| Band | Latitude | Share of the globe | Columns with data | Mean level | Mean change | Largest change |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | -90° to -75° | 1.70% | 240 | 0.000 | 0.0000 | 0.0000 |
| 1 | -75° to -60° | 5.00% | 240 | 0.023 | 0.0078 | 0.0288 |
| 2 | -60° to -45° | 7.95% | 240 | 0.220 | 0.0064 | 0.0267 |
| 3 | -45° to -30° | 10.36% | 240 | 0.219 | 0.0052 | 0.0202 |
| 4 | -30° to -15° | 12.06% | 240 | 0.238 | 0.0019 | 0.0145 |
| 5 | -15° to 0° | 12.94% | 240 | 0.350 | 0.0014 | 0.0044 |
| 6 | 0° to 15° | 12.94% | 240 | 0.419 | 0.0011 | 0.0045 |
| 7 | 15° to 30° | 12.06% | 240 | 0.197 | 0.0024 | 0.0117 |
| 8 | 30° to 45° | 10.36% | 240 | 0.118 | 0.0030 | 0.0239 |
| 9 | 45° to 60° | 7.95% | 240 | 0.040 | 0.0021 | 0.0160 |
| 10 | 60° to 75° | 5.00% | 240 | 0.009 | 0.0019 | 0.0323 |
| 11 | 75° to 90° | 1.70% | 240 | 0.028 | 0.0103 | 0.1296 |

Chimes: 68 as the rule stands, 70 with the weighting.

### Check on this tool

The tool repeats the rule's "which cell is this pixel in" to add weights and masks. Largest difference between its levels and the rule's (must be 0): 0.

## Aerosols (SVS 5669)

GEOS Aerosols (2025). The still the app plays is 2048 × 1152; NASA's frames are 3840 × 2160.

### Settings

Measured with this picture's rule in `web/src/data/sources.ts`. The last column is what the procedure gives (see the top of this page).

| Setting | Measured with | The procedure gives |
| --- | --- | --- |
| Measure | colour | colour |
| Floor | 20/255 | 20/255 |
| Full level, map sweep | 0.45 | 0.45 |
| Full level, radar | 0.8 | 0.8 |
| Mask (pixels never read) | none | none |
| A third instrument for the blue side | no | (chosen from the legend, not by the procedure) |

### Which still

Compared with NASA's full-size still (`assets/frames/svs5669/Aerosols_2025-08-19T20_00_00_3840x2160.png`, 2025-08-19T20:00Z), drawn at the still's size by the browser: mean difference 2.65 grey levels a channel.

### What "nothing drawn" looks like, and the floor

The commonest colour among the pixels the scan reads is RGB (62, 69, 61), colour strength 8.0 grey levels. 12.8% of the pixels read are within 12 grey levels of it on every channel.

| Cells that are this colour | How many | That sound | Largest cell mean |
| --- | --- | --- | --- |
| Every pixel read | 179 | 0 | 11.07/255 |
| 98% of the pixels read or more | 183 | 0 | 11.07/255 |
| 90% of the pixels read or more | 194 | 0 | 11.07/255 |

| Cells where some pixels are not this colour | How many | Sound at this floor (20/255) | Sound at 12/255 |
| --- | --- | --- | --- |
| 1% or more | 2698 | 1583 | 2413 |
| 10% or more | 2686 | 1583 | 2413 |

| Cells where some pixels are drawn in a colour of NASA's bar, above the floor | How many | Sound at this floor (20/255) | Sound at 12/255 |
| --- | --- | --- | --- |
| 1% or more | 2466 | 1583 | 2365 |
| 10% or more | 2221 | 1581 | 2184 |

Grey land by this picture's land rule (mean 30 to 95, channels within 12): 201 cells are 90% or more grey land, 0 of them sound, largest cell mean 10.84/255.

### Pixels never read

None: every pixel is read.

### The map sweep

|  | Cells that sound | No data | At full level | Largest cell mean | Peaks → spaced → played | Left out | Marimba (warm) | Bells (cool) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| colour, as measured with | 55.0% | 0 | 0.0% | 0.429 | 47 → 42 → 36 | 23% | 3 | 33 |
| brightness, same floor and full level (for the record) | 94.8% | 0 | 4.3% | 0.775 | 191 → 151 → 110 | 42% | 8 | 102 |
| colour at the ocean's floor, 12/255 (for the record) | 83.8% | 0 | 0.0% | 0.429 | 62 → 55 → 49 | 21% | 3 | 46 |

"Peaks → spaced → played": peaks at the chime level, then after the spacing rule, then after one per column.

### The radar, each circle

| Circle | Cells that sound | No data | At full level | Largest cell mean | Peaks → spaced → played | Left out | Marimba (warm) | Bells (cool) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Sulfate and sea-salt streaks near Vanuatu | 93% | 0 | 0.0% | 0.77 | 55 → 55 → 34 | 38% | 0 | 34 |
| Sulfate and sea-salt streaks near Vanuatu, at the ocean's floor 12/255 (for the record) | 100% | 0 | 0.0% | 0.77 | 58 → 58 → 37 | 36% | 0 | 37 |
| Sea-salt cells in the southeast Pacific | 79% | 0 | 0.0% | 0.15 | 0 → 0 → 0 | none | 0 | 0 |
| Sea-salt cells in the southeast Pacific, at the ocean's floor 12/255 (for the record) | 100% | 0 | 0.0% | 0.15 | 0 → 0 → 0 | none | 0 | 0 |

### What each instrument means in this picture

Each struck note is given the colour of NASA's bar that most of its cell's pixels are nearest to. "Nearest" compares the direction of a colour only (the colour minus its smallest channel), so a colour faded into black or grey keeps its direction. A pixel within about 26° of a bar colour (cos 0.9) votes for it, weighted by its colour strength; pixels at or below the floor do not vote.

**Map sweep**

| Colour of the bar | Marimba (warm) | Bells (cool) |
| --- | --- | --- |
| black carbon | 3 | 0 |
| sulfate | 0 | 29 |
| dust | 0 | 4 |

**Sulfate and sea-salt streaks near Vanuatu**

| Colour of the bar | Marimba (warm) | Bells (cool) |
| --- | --- | --- |
| sulfate | 0 | 34 |

**Sea-salt cells in the southeast Pacific**

No struck notes.

Pixels read above the floor, by the colour of the bar they are nearest to: black carbon 3.3%, dust 6.0%, sea salt 37.7%, sulfate 50.1%, no colour of the bar 2.8%.

### NASA's colour bar

`assets/frames/svs5669/Aerosols_cbar.png` (1500×300), the aerosol type bar: read along row 162, coloured (channels spread more than 20) from x 212 to 1282, 720 coloured pixels in that span.
"Red is the largest channel" is true at the left end and false at the right end, and changes 1 time:
- at 27.6% of the bar's length, from RGB (149, 70, 53) to (146, 118, 166).

| Step | x | RGB | Colour strength | Instrument |
| --- | --- | --- | --- | --- |
| black carbon | 213–390 | (210, 94, 69) | 0.553 | marimba (warm) |
| dust | 508–685 | (193, 154, 220) | 0.259 | bells (cool) |
| sea salt | 810–987 | (133, 170, 169) | 0.145 | bells (cool) |
| sulfate | 1103–1281 | (83, 220, 52) | 0.659 | bells (cool) |

The step names were read by eye from the labels on the bar.

### The still against NASA's frame

The same rule and settings on the still and on NASA's full-size still (3840 × 2160, read at its own size).

|  | Still | NASA's frame |
| --- | --- | --- |
| Map sweep: cells that sound | 1583 | 1590 |
| Map sweep: chimes | 36 | 37 |
| Map sweep: largest cell mean | 0.429 | 0.433 |
| Radar, Sulfate and sea-salt streaks near Vanuatu: chimes | 34 | 39 |
| Radar, Sea-salt cells in the southeast Pacific: chimes | 0 | 0 |

Levels differ by 0.0020 on average and 0.0460 at most. 35 of the still's 36 map-sweep chimes are at the same column and band, on the same instrument, as a chime of the frame.
Sulfate and sea-salt streaks near Vanuatu: 6 of the still's 34 chimes are at the same place, on the same instrument.
Sea-salt cells in the southeast Pacific: 0 of the still's 0 chimes are at the same place, on the same instrument.

### The circles on the ground (derived from the map geometry, not measured)

| Circle | Centre | Radius east–west | Radius north–south | Ground width ÷ height |
| --- | --- | --- | --- | --- |
| Sulfate and sea-salt streaks near Vanuatu | 19.2° S, 167.8° E | 10.31° | 9.17° | 1.063 |
| Sea-salt cells in the southeast Pacific | 16.7° S, 105.0° W | 10.31° | 9.17° | 1.078 |

### Equal latitude bands on a stretched map

"Change" is how far a level moves when each pixel is weighted by cos(latitude) inside its cell. Cells with no data are left out.

| Band | Latitude | Share of the globe | Columns with data | Mean level | Mean change | Largest change |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | -90° to -75° | 1.70% | 240 | 0.000 | 0.0000 | 0.0000 |
| 1 | -75° to -60° | 5.00% | 240 | 0.001 | 0.0003 | 0.0200 |
| 2 | -60° to -45° | 7.95% | 240 | 0.077 | 0.0042 | 0.0475 |
| 3 | -45° to -30° | 10.36% | 240 | 0.047 | 0.0029 | 0.0222 |
| 4 | -30° to -15° | 12.06% | 240 | 0.068 | 0.0018 | 0.0210 |
| 5 | -15° to 0° | 12.94% | 240 | 0.170 | 0.0008 | 0.0051 |
| 6 | 0° to 15° | 12.94% | 240 | 0.131 | 0.0006 | 0.0032 |
| 7 | 15° to 30° | 12.06% | 240 | 0.194 | 0.0024 | 0.0080 |
| 8 | 30° to 45° | 10.36% | 240 | 0.150 | 0.0043 | 0.0199 |
| 9 | 45° to 60° | 7.95% | 240 | 0.150 | 0.0068 | 0.0330 |
| 10 | 60° to 75° | 5.00% | 240 | 0.090 | 0.0128 | 0.0801 |
| 11 | 75° to 90° | 1.70% | 240 | 0.016 | 0.0137 | 0.1700 |

Chimes: 36 as the rule stands, 39 with the weighting.

### Check on this tool

The tool repeats the rule's "which cell is this pixel in" to add weights and masks. Largest difference between its levels and the rule's (must be 0): 0.

## Rain (SVS 4285)

Near Real-Time Global Precipitation from the Global Precipitation Measurement Constellation. The still the app plays is 2048 × 1024; NASA's frames are 3600 × 1800.

### Settings

Measured with this picture's rule in `web/src/data/sources.ts`. The last column is what the procedure gives (see the top of this page).

| Setting | Measured with | The procedure gives |
| --- | --- | --- |
| Measure | colour | colour |
| Floor | 30/255 | 30/255 |
| Full level, map sweep | 0.85 | 0.85 |
| Full level, radar | 0.95 | 0.95 |
| Mask (pixels never read) | `data/imerg/scan_mask.png` | `data/imerg/scan_mask.png` |
| A third instrument for the blue side | yes | (chosen from the legend, not by the procedure) |

### Which still

Each of NASA's 30 frames was drawn at the still's size by the browser and compared with the still, pixel by pixel. The still is closest to **frame 0** (2026-11-14T00:00Z): mean difference 4.48 grey levels a channel. The next closest, frame 1, differs by 7.84.

| Frame | Time | Mean difference |
| --- | --- | --- |
| frame 0 | 2026-11-14T00:00Z | 4.48 |
| frame 1 | 2026-11-14T01:00Z | 7.84 |
| frame 2 | 2026-11-14T02:00Z | 9.49 |
| frame 3 | 2026-11-14T03:00Z | 10.66 |
| frame 4 | 2026-11-14T04:00Z | 11.56 |

The five closest of 30.

### What "nothing drawn" looks like, and the floor

The commonest colour among the pixels the scan reads is RGB (2, 5, 20), colour strength 18.2 grey levels. 81.7% of the pixels read are within 12 grey levels of it on every channel.

| Cells that are this colour | How many | That sound | Largest cell mean |
| --- | --- | --- | --- |
| Every pixel read | 510 | 0 | 21.64/255 |
| 98% of the pixels read or more | 680 | 0 | 21.64/255 |
| 90% of the pixels read or more | 1108 | 1 | 33.59/255 |

- A cell that is 90% or more this colour and sounds: column 73, band 11; mean 33.59/255, level 0.019; 90.0% of its pixels are this colour, 10.0% are drawn in a colour of NASA's bar above the floor.

| Cells where some pixels are not this colour | How many | Sound at this floor (30/255) | Sound at 12/255 |
| --- | --- | --- | --- |
| 1% or more | 1719 | 511 | 1673 |
| 10% or more | 1227 | 510 | 1186 |

| Cells where some pixels are drawn in a colour of NASA's bar, above the floor | How many | Sound at this floor (30/255) | Sound at 12/255 |
| --- | --- | --- | --- |
| 1% or more | 1352 | 511 | 1349 |
| 10% or more | 742 | 510 | 742 |

### Pixels never read

`data/imerg/scan_mask.png`: 40.21% of the still's pixels are never read. 545 of the map sweep's 2880 cells read nothing (no data).

### The map sweep

|  | Cells that sound | No data | At full level | Largest cell mean | Peaks → spaced → played | Left out | Marimba (warm) | Bells (cool) | Harp (blue) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| colour, as measured with | 17.7% | 545 | 0.0% | 0.810 | 18 → 17 → 16 | 11% | 4 | 7 | 5 |
| brightness, same floor and full level (for the record) | 24.4% | 545 | 0.1% | 0.883 | 26 → 24 → 22 | 15% | 5 | 10 | 7 |
| colour at the ocean's floor, 12/255 (for the record) | 79.4% | 545 | 0.0% | 0.810 | 26 → 23 → 21 | 19% | 5 | 10 | 6 |

"Peaks → spaced → played": peaks at the chime level, then after the spacing rule, then after one per column.

### The radar, each circle

| Circle | Cells that sound | No data | At full level | Largest cell mean | Peaks → spaced → played | Left out | Marimba (warm) | Bells (cool) | Harp (blue) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Long rain band in the South Pacific | 41% | 0 | 0.0% | 0.90 | 50 → 43 → 31 | 38% | 4 | 27 | 0 |
| Long rain band in the South Pacific, at the ocean's floor 12/255 (for the record) | 99% | 0 | 0.0% | 0.90 | 58 → 49 → 37 | 36% | 4 | 33 | 0 |
| Scattered showers on the equator in the central Pacific | 8% | 2 | 0.0% | 0.90 | 11 → 8 → 7 | 36% | 2 | 5 | 0 |
| Scattered showers on the equator in the central Pacific, at the ocean's floor 12/255 (for the record) | 98% | 2 | 0.0% | 0.90 | 13 → 9 → 8 | 38% | 2 | 6 | 0 |

### What each instrument means in this picture

Each struck note is given the colour of NASA's bar that most of its cell's pixels are nearest to. "Nearest" compares the direction of a colour only (the colour minus its smallest channel), so a colour faded into black or grey keeps its direction. A pixel within about 26° of a bar colour (cos 0.9) votes for it, weighted by its colour strength; pixels at or below the floor do not vote.

**Map sweep**

| Colour of the bar | Marimba (warm) | Bells (cool) | Harp (blue) |
| --- | --- | --- | --- |
| rain step 2 of 10 | 1 | 3 | 0 |
| rain step 6 of 10 | 2 | 0 | 0 |
| rain step 4 of 10 | 1 | 2 | 0 |
| rain step 3 of 10 | 0 | 2 | 0 |
| snow step 6 of 10 | 0 | 0 | 3 |
| snow step 4 of 10 | 0 | 0 | 2 |

**Long rain band in the South Pacific**

| Colour of the bar | Marimba (warm) | Bells (cool) | Harp (blue) |
| --- | --- | --- | --- |
| rain step 4 of 10 | 2 | 2 | 0 |
| rain step 5 of 10 | 2 | 2 | 0 |
| rain step 3 of 10 | 0 | 7 | 0 |
| rain step 2 of 10 | 0 | 11 | 0 |
| rain step 1 of 10 | 0 | 5 | 0 |

**Scattered showers on the equator in the central Pacific**

| Colour of the bar | Marimba (warm) | Bells (cool) | Harp (blue) |
| --- | --- | --- | --- |
| rain step 4 of 10 | 1 | 0 | 0 |
| rain step 5 of 10 | 1 | 0 | 0 |
| rain step 3 of 10 | 0 | 4 | 0 |
| rain step 2 of 10 | 0 | 1 | 0 |

Pixels read above the floor, by the colour of the bar they are nearest to: rain step 1 of 10 25.1%, rain step 2 of 10 22.7%, rain step 3 of 10 12.7%, rain step 4 of 10 5.6%, rain step 5 of 10 2.8%, rain step 6 of 10 1.5%, rain step 7 of 10 0.6%, rain step 10 of 10 0.2%, snow step 1 of 10 4.2%, snow step 2 of 10 4.2%, snow step 3 of 10 4.4%, snow step 4 of 10 4.4%, snow step 5 of 10 4.9%, snow step 6 of 10 4.4%, snow step 7 of 10 1.3%, snow step 8 of 10 0.8%, snow step 9 of 10 0.1%.

### NASA's colour bars

`assets/frames/svs4285/rainbarwhite2.png` (440×90), the rain bar: read along row 36, coloured (channels spread more than 60) from x 40 to 416, 374 coloured pixels in that span.
"Red is the largest channel" is false at the left end and true at the right end, and changes 1 time:
- at 28.7% of the bar's length, from RGB (180, 231, 0) to (255, 251, 0).

| Step | x | RGB | Colour strength | Instrument |
| --- | --- | --- | --- | --- |
| rain step 1 of 10 | 40–75 | (0, 179, 48) | 0.702 | bells (cool) |
| rain step 2 of 10 | 76–111 | (96, 211, 0) | 0.827 | bells (cool) |
| rain step 3 of 10 | 112–147 | (180, 231, 0) | 0.906 | bells (cool) |
| rain step 4 of 10 | 148–183 | (255, 251, 0) | 1.000 | marimba (warm) |
| rain step 5 of 10 | 184–219 | (255, 196, 0) | 1.000 | marimba (warm) |
| rain step 6 of 10 | 220–255 | (255, 147, 0) | 1.000 | marimba (warm) |
| rain step 7 of 10 | 256–291 | (255, 73, 0) | 1.000 | marimba (warm) |
| rain step 8 of 10 | 292–327 | (255, 0, 0) | 1.000 | marimba (warm) |
| rain step 9 of 10 | 328–363 | (200, 0, 0) | 0.784 | marimba (warm) |
| rain step 10 of 10 | 364–416 | (145, 0, 0) | 0.569 | marimba (warm) |

"Blue is the largest channel" (the third instrument) is true for 0 of these 10 steps.

`assets/frames/svs4285/snowbarwhite2.png` (440×90), the snow bar: read along row 36, coloured (channels spread more than 60) from x 40 to 416, 374 coloured pixels in that span.
"Red is the largest channel" is false at the left end and false at the right end, and changes 0 times.

| Step | x | RGB | Colour strength | Instrument |
| --- | --- | --- | --- | --- |
| snow step 1 of 10 | 40–75 | (69, 255, 255) | 0.729 | harp (blue) |
| snow step 2 of 10 | 76–111 | (73, 221, 255) | 0.714 | harp (blue) |
| snow step 3 of 10 | 112–147 | (77, 187, 255) | 0.698 | harp (blue) |
| snow step 4 of 10 | 148–183 | (79, 154, 255) | 0.690 | harp (blue) |
| snow step 5 of 10 | 184–219 | (81, 122, 255) | 0.682 | harp (blue) |
| snow step 6 of 10 | 220–255 | (82, 93, 255) | 0.678 | harp (blue) |
| snow step 7 of 10 | 256–291 | (83, 70, 255) | 0.725 | harp (blue) |
| snow step 8 of 10 | 292–327 | (90, 47, 217) | 0.667 | harp (blue) |
| snow step 9 of 10 | 328–363 | (115, 33, 187) | 0.604 | harp (blue) |
| snow step 10 of 10 | 364–416 | (140, 20, 156) | 0.533 | harp (blue) |

"Blue is the largest channel" (the third instrument) is true for 10 of these 10 steps.

### The still against NASA's frame

The same rule and settings on the still and on NASA's frame 0 (3600 × 1800, read at its own size, with the same mask).

|  | Still | NASA's frame |
| --- | --- | --- |
| Map sweep: cells that sound | 511 | 694 |
| Map sweep: chimes | 16 | 22 |
| Map sweep: largest cell mean | 0.810 | 0.921 |
| Radar, Long rain band in the South Pacific: chimes | 31 | 43 |
| Radar, Scattered showers on the equator in the central Pacific: chimes | 7 | 12 |

Levels differ by 0.0127 on average and 0.3259 at most. 13 of the still's 16 map-sweep chimes are at the same column and band, on the same instrument, as a chime of the frame.
Long rain band in the South Pacific: 13 of the still's 31 chimes are at the same place, on the same instrument.
Scattered showers on the equator in the central Pacific: 4 of the still's 7 chimes are at the same place, on the same instrument.

### The circles on the ground (derived from the map geometry, not measured)

| Circle | Centre | Radius east–west | Radius north–south | Ground width ÷ height |
| --- | --- | --- | --- | --- |
| Long rain band in the South Pacific | 17.5° S, 137.5° W | 10.00° | 10.00° | 0.954 |
| Scattered showers on the equator in the central Pacific | 0.0° N, 150.0° W | 10.00° | 10.00° | 1.000 |

### Equal latitude bands on a stretched map

"Change" is how far a level moves when each pixel is weighted by cos(latitude) inside its cell. Cells with no data are left out.

| Band | Latitude | Share of the globe | Columns with data | Mean level | Mean change | Largest change |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | -90° to -75° | 1.70% | 48 | 0.000 | 0.0000 | 0.0000 |
| 1 | -75° to -60° | 5.00% | 240 | 0.078 | 0.0077 | 0.0593 |
| 2 | -60° to -45° | 7.95% | 240 | 0.039 | 0.0041 | 0.0449 |
| 3 | -45° to -30° | 10.36% | 236 | 0.028 | 0.0016 | 0.0266 |
| 4 | -30° to -15° | 12.06% | 205 | 0.008 | 0.0005 | 0.0109 |
| 5 | -15° to 0° | 12.94% | 205 | 0.034 | 0.0003 | 0.0029 |
| 6 | 0° to 15° | 12.94% | 218 | 0.025 | 0.0002 | 0.0041 |
| 7 | 15° to 30° | 12.06% | 194 | 0.016 | 0.0007 | 0.0114 |
| 8 | 30° to 45° | 10.36% | 173 | 0.029 | 0.0020 | 0.0185 |
| 9 | 45° to 60° | 7.95% | 138 | 0.042 | 0.0031 | 0.0290 |
| 10 | 60° to 75° | 5.00% | 198 | 0.023 | 0.0025 | 0.0653 |
| 11 | 75° to 90° | 1.70% | 240 | 0.003 | 0.0117 | 0.2954 |

Chimes: 16 as the rule stands, 17 with the weighting.

### Check on this tool

The tool repeats the rule's "which cell is this pixel in" to add weights and masks. Largest difference between its levels and the rule's (must be 0): 0.
