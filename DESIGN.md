---
name: Tide Table
description: A tide table printed on a sea chart. Navy ink on almanac white (or the night edition), hairline rules, one live red-orange, violet and rose for the two regions.
colors:
  signal: "oklch(0.55 0.18 33)"
  on-signal: "oklch(0.99 0 0)"
  ink: "oklch(0.26 0.05 260)"
  ink-2: "oklch(0.46 0.04 255)"
  paper: "oklch(0.972 0.004 230)"
  rule: "oklch(0.87 0.015 245)"
  rule-2: "oklch(0.94 0.008 240)"
  action: "oklch(0.48 0.13 255)"
  action-hover: "oklch(0.42 0.13 255)"
  on-action: "oklch(0.99 0 0)"
  region-a: "oklch(0.47 0.15 300)"
  region-b: "oklch(0.52 0.17 5)"
  on-region: "oklch(0.99 0 0)"
  well: "oklch(0.20 0.03 262)"
typography:
  numeral:
    fontFamily: "Atkinson Hyperlegible Next Variable, Atkinson Hyperlegible Next, system-ui, Segoe UI, sans-serif"
    fontSize: "clamp(4.5rem, 10vw, 9rem)"
    fontWeight: 500
    lineHeight: 0.78
    letterSpacing: "-0.04em"
    fontVariation: "wght 200..800, driven by the alignment value"
  value:
    fontFamily: "Atkinson Hyperlegible Next Variable, Atkinson Hyperlegible Next, system-ui, Segoe UI, sans-serif"
    fontSize: "2.6rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Atkinson Hyperlegible Next Variable, Atkinson Hyperlegible Next, system-ui, Segoe UI, sans-serif"
    fontSize: "1.9rem"
    fontWeight: 750
    lineHeight: 1.1
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Atkinson Hyperlegible Next Variable, Atkinson Hyperlegible Next, system-ui, Segoe UI, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 700
    lineHeight: 1.3
  status:
    fontFamily: "Atkinson Hyperlegible Next Variable, Atkinson Hyperlegible Next, system-ui, Segoe UI, sans-serif"
    fontSize: "1.35rem"
    fontWeight: 650
    lineHeight: 1.3
  body:
    fontFamily: "Atkinson Hyperlegible Next Variable, Atkinson Hyperlegible Next, system-ui, Segoe UI, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Atkinson Hyperlegible Next Variable, Atkinson Hyperlegible Next, system-ui, Segoe UI, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 600
    lineHeight: 1.5
  readout:
    fontFamily: "Atkinson Hyperlegible Mono Variable, Atkinson Hyperlegible Mono, ui-monospace, Consolas, monospace"
    fontSize: "0.9rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  key: "3px"
  base: "4px"
  pill: "999px"
spacing:
  xs: "10px"
  sm: "16px"
  md: "22px"
  lg: "28px"
  xl: "40px"
components:
  button:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.base}"
    padding: "0 16px"
    height: "48px"
  button-hover:
    backgroundColor: "{colors.rule-2}"
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.on-action}"
    rounded: "{rounded.base}"
    padding: "0 16px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.action-hover}"
  button-pressed:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  region-badge-a:
    backgroundColor: "{colors.region-a}"
    textColor: "{colors.on-region}"
    rounded: "{rounded.pill}"
    size: "1.5em"
  region-badge-b:
    backgroundColor: "{colors.region-b}"
    textColor: "{colors.on-region}"
    rounded: "{rounded.pill}"
    size: "1.5em"
  chart-well:
    backgroundColor: "{colors.well}"
    rounded: "{rounded.base}"
  key-cap:
    textColor: "{colors.ink}"
    typography: "{typography.readout}"
    rounded: "{rounded.key}"
---

# Design System: Tide Table

Scope: the main app (`web/`) and the listening game (`tools/listening_game.html`). They share one world: the same tokens (the game names its two slots `--patch-1` and `--patch-2`, the same values as `--region-a` and `--region-b`), the same graticule, the same theme switch, and one saved theme choice (`localStorage` key `es-theme`).

## Overview

**Creative North Star: "The Tide Table on the Chart"**

Earth Sonata reads like a tide table printed on a sea chart. The NASA picture sits inside a chart frame with latitude and longitude ticks, and each region's numbers are set in ruled columns. Structure is 1px hairline rules, never boxes, cards or side stripes. Corners are 4px, nothing casts a shadow, and depth comes from rules, ink and the dark well behind the picture.

Two editions of one print. Light is almanac white with navy ink and tide-blue actions. Dark is the night edition: deep navy ground with the same inks lifted. The theme follows the saved choice, else the system setting, and is set before first paint so there is no flash. One red-orange, the signal, is the only loud colour and it means live, chosen or focused, nothing else.

The system is keyboard-first. The Tab order follows the screen: the six tabs, the theme switch, then on Listen step 1 (the picture list, then its NASA title links), step 2 (what to hear), then Play. Colour is never the only cue: every region mark carries its letter.

**Key Characteristics:**
- One face, Atkinson Hyperlegible Next. Atkinson Hyperlegible Mono only for numbers, coordinates and readouts.
- Signal red-orange is live, chosen or focused only.
- Region A violet, Region B rose, both off the NASA picture's blue-to-red temperature scale, so a region colour is never read as warm or cold.
- Hairline rules for structure; no boxes, no side stripes.
- Type weight carries data: the giant numeral and the live value run weight 200 to 800 with alignment.
- A missing frame breaks a tide curve and is never drawn as zero.

## Colors

A two-ink print: navy ink on cool almanac white, one blue for actions, one red-orange for live, and two off-scale hues for the regions.

### Primary
- **Tide Blue** (frontmatter `action`; hover `action-hover`): every primary action (Play, the game's primary links) and the accent on checkbox and radio controls. In dark it lifts to a pale blue with navy text.

### Secondary
- **High-Water Signal** (`signal`): the playhead and playing marker, the focus ring, the active melody pad border and held key, the current region's underline, the live position line across the tide curves, text selection and caret. Never an error colour, never decoration. Dark lifts it to a lighter orange (oklch 0.72 0.17 42).

### Tertiary
- **Region A Violet** (`region-a`) and **Region B Rose** (`region-b`): the region's rings, tab, map tag, letter badge, numeral, tide curve and first-pulse marks. Dark lifts both (violet oklch 0.77 0.11 300, rose oklch 0.79 0.11 0). Always paired with the region letter.

### Neutral
- **Navy Ink** (`ink`): text, neatlines, button outlines, table header rule, the chosen state of toggles.
- **Slate Ink** (`ink-2`): secondary text, graticule labels, second-pulse marks, the range track.
- **Almanac White** (`paper`): the ground.
- **Hairline** (`rule`) and **Faint Hairline** (`rule-2`): section rules, table rules, tide gridlines; rule-2 is also the button hover fill and the missing-frame fill.
- **Chart Well** (`well`): the dark panel behind the NASA picture, close-up canvases and legend swatches. Deep navy in both themes (darker still in night).

Dark values live in `:root[data-theme='dark']` in `web/src/styles.css`; the sidecar carries them.

### Named Rules
**The Live Only Rule.** Signal red-orange appears only on something live, chosen or focused. If it is decoration, it is wrong.
**The Off-Scale Rule.** A region colour must not be a colour the picture itself uses for data. On the ocean picture (blue-to-red temperature) the regions are violet and rose, never blue, red, orange or yellow. Pictures whose own colours include those hues get neutral regions: the aerosol picture (regions C and D; blue sea salt, pink dust, orange-red smoke, green sulfates) and the rain picture (regions E and F; a blue-to-red rain scale). Neutral means an ink ring inside a white outline and an ink badge with a paper letter, in both themes.
**The Letter Rule.** A region colour never travels alone; its letter badge or end label goes with it.

## Typography

**Display and Body Font:** Atkinson Hyperlegible Next (variable, with system-ui, Segoe UI, sans-serif)
**Label/Mono Font:** Atkinson Hyperlegible Mono (with ui-monospace, Consolas, monospace), for numbers only

**Character:** One highly legible humanist face, large and plain. The weight axis is a data channel, not decoration.

### Hierarchy
- **Numeral** (500 default, 200 to 800 driven, clamp(4.5rem, 10vw, 9rem), 0.78): the giant alignment number under each region's patch, in the region colour with a paper-coloured stroke behind it.
- **Value** (500, 2.6rem, 1): the live alignment readout; its weight follows alignment (200 = every which way, 800 = all one way). Mobile 1.9rem.
- **Headline** (750, 1.9rem, 1.1): page title; 1.6rem on mobile.
- **Title** (700, 1.05rem, 1.3): section headings.
- **Status** (650, 1.35rem, 1.3, max 46ch): the sentence about what is playing.
- **Body** (400, 18px, 1.5): prose capped at 65 to 70ch.
- **Label** (600, 0.95rem): form labels, legends, table headers (0.85rem).
- **Readout** (mono 400, 0.9rem, tabular numerals): range values, table numbers, graticule labels (0.75rem), tide axis, key caps (600, 0.8rem).

### Named Rules
**The Weight Is the Value Rule.** Alignment 0 maps to weight 200 and alignment 1 to 800, so the numeral's weight still carries alignment. Do not flatten it to one weight.
**The Numbers in Mono Rule.** Coordinates, table cells, axes and readouts use the mono face with tabular figures. Words never do.

## Layout

A sticky top bar (10px 24px padding, 1px rule under it) holds the title on the left (the title line shows from 1560px up), the six tabs, and the theme switch on the right. Below it, one main column capped at 1240px (14px 24px 24px padding). On Listen, steps 1 and 2 sit side by side as two ruled lists above the picture; the picture takes the rest of the screen (a size container: the screen minus the top bar and the steps) so the whole view fits a 1440 x 900 screen; the player bar sits right under the picture, its sound line in the same column as the picture, and the twelve held-note bars stand in the right gutter beside the bands they read. Below 1024px wide or 640px tall the page scrolls and the picture takes the column's width. Below 900px the title line hides. Below 1024px the tabs move to a fixed bottom bar (six equal cells, icon over word), the player bar sticks just above it, and the chart margin tightens.

Spacing scale: 10, 16, 22, 28, 40px. Sections are separated by a 1px top rule with 16px padding, not by gaps alone. The NASA picture sits in a chart frame (1px ink neatline, margin 22px top and 44px left) with ticks every 10 degrees, labelled every 30, and the credit directly under it.

## Elevation & Depth

Flat. There are no drop shadows. Depth is the dark chart well behind the picture and the ink neatline around it. The only box-shadow uses are a black 2px ring around the map tag (an outline so it reads on any part of the picture) and an inset 3px signal underline marking the current region's name; both are outlines, not elevation.

### Named Rules
**The No Shadow Rule.** Nothing floats. A new surface gets a hairline rule or a neatline, not a shadow.

## Shapes

4px corners on buttons, inputs, pads, thumbs, wells and the missing-information box (3px on key caps). Region badges and map tags are circles or pills. The graticule is square ticks (7px major, 4px minor). Outlines are 2px ink on controls, 1px on structure. Picture region rings are drawn in the region colour inside a black outline so they read on any part of the image; the live region's ring and tab are heavier.

## Components

### Buttons
Plain, bordered, confident.
- **Shape:** 4px corners, 2px ink border, 48px minimum height, 0 16px padding, 700 weight.
- **Primary:** tide-blue fill, near-white text (Play; also the game's primary links).
- **Hover:** faint hairline fill; primary deepens.
- **Pressed / expanded:** ink fill, paper text.
- **Focus:** a 3px signal outline offset 3px, global to every focusable element.
- **Motion:** two 90 ms steps, no easing (`--snap`), none under reduced motion.

### Icon button
A line icon over a one-word label. Team rule (15 Nov): more buttons, less text.
- **Shape:** the Buttons border, corners, hover, pressed and focus states; 56px minimum height, 64px minimum width, 6px 10px padding.
- **Icon:** 20px, 2px stroke in `currentColor`, round caps, decorative (`aria-hidden`).
- **Label:** one word under the icon, 0.85rem, weight 700. The word is the button's accessible name: Play, Pause, Stop, Replay, Explain, Sound.
- **Primary:** Play uses the tide-blue fill.
- **Stop** carries `aria-keyshortcuts="Escape"`; Esc stops from anywhere.

### Page links (tabs)
Six tabs in the top bar: Listen, Compare, How it's made, Play along, Globe (five views) and Game (opens the listening game page, which links back), each a 20px line icon and a word. They are one joined strip with a 2px ink frame and 2px ink dividers, 8px corners; the current tab is filled in ink with paper text and carries `aria-current="page"`; hover fills with the faint hairline. On phones the strip becomes a fixed bottom bar of four equal cells, icon over word.

### Player bar
One framed strip under the picture, like a music player: 2px ink frame, 10px corners, 8px 10px padding. Left: Play (tide blue) / Pause, Stop with a small visible "Esc" hint (hidden from screen readers; `aria-keyshortcuts` says it), and Replay where it exists (not on Listen's scan: Stop then Play does the same). Middle: the timeline, taking the free width. Right: Explain and Sound. On Listen the bar's middle column is the picture's own column, so the sound line runs exactly under the picture, and its name for screen readers is "Step 3 of 3: play". On phones it sticks above the tabs and the timeline takes its own row.

### Picture list (Listen, step 1)
One ruled row per picture (ink rule on top, hairlines between): radio, a 64 x 32 thumbnail with an ink hairline, the team's short name (700), NASA's own title under it as a link to NASA's page (0.82rem slate), and on the right the kind of data and the frame count (the number in mono). The chosen row's name gets the 3px signal underline. A picture whose scan has not been measured says so in its row.

### What to hear (Listen, step 2)
The same ruled rows: "Whole picture" with a small sweep drawing (a framed well with a line across it), then each region with its round crop, letter badge and name, and one line on what you will hear ("A line crosses it west to east in 30 s" / "A radar line turns once around the circle in 15 s", following the speed). Number keys 1, 2, 3 work while the group has focus. On phones the rows become chips (icon and short name, the chosen one filled in ink) with the chosen option's full name spelled out under them.

### Sound line (signature)
The scan's timeline in the player bar: every struck note of the score as a 5px mark, x by time (on the map sweep the picture's own x, so the playhead stands under the scan line; on the radar the turn, 0 to 360 from east), y by pitch, round for the warm instrument and a diamond for the cool one, the same shapes as on the picture. Notes still to come are slate at 35%; played notes are ink (a clip at the playhead); the playhead is the 2px signal line with a square cap. Mono axis labels: longitudes, or E N W S. Above it, the now chip and the mono time (0:13 / 0:30).

### Held-note bars
Twelve thin bars in the right gutter, highest note at the top, each beside the band of the picture it reads (on the radar, beside the zoomed circle, centre low and rim high). The ink fill is how loud that held note is now; a bar flashes signal when a note is struck in its band. Empty while stopped. Hidden on phones; the sound line carries the notes there.

### Sound settings
One Sound icon button shows and hides the speed buttons (½× ¾× 1× 1¼×, mono, the chosen one pressed in ink) and a Volume slider. No decibel numbers on screen; screen readers hear a percentage.

### Theme switch
Two joined buttons (Light, Dark) with 16px line icons, 2px ink frame, the chosen one filled in ink. 40px minimum height. Sits at the right of the top bar, after the tabs in Tab order.

### Inputs / Fields
- **Range:** 2px slate track, 18px square ink thumb, signal thumb on focus; label row above with the name left and a mono readout right.
- **Select:** 2px ink border, 4px corners, 44px height.
- **Radio and checkbox:** 22px, tide-blue accent, 44px hit row.

### Region badge and map tag
A circle in the region colour holding the region letter, used wherever the region is named (choice, table row, map tag). The map tag is a pill with the badge inside and a black ring.

### Tide table
Ruled columns, hairline row rules, header rule in ink, numbers right-aligned in mono, region row names with badge, the playing region's row marked by weight 700.

### Tide curves (signature)
Alignment over the model frames, one 3px rounded curve per region on a 0, 0.5, 1 hairline grid, mono axis labels, each curve named at its right end by letter and last value, a 2px signal line for the playing position. A missing frame lifts the pen: the curve breaks and is never drawn as zero.

### Chart frame and graticule
The NASA picture inside a 1px ink neatline with ticks and mono labels outside it.

### Beat lane and rhythm rows
Notes as 4px bars: first pulse in the region colour, second pulse in slate and shorter, missing beats a dashed hatched box. The live lane has a signal playhead with a square cap and a signal dot.

### Melody pad
A 2px ink-bordered pad of 48px key caps; the active pad border and the held key turn signal.

### Practice and missing states
Hairline sections, not cards. Missing information is a 2px ink box stated plainly, never red.

### One-moment pictures
A picture with a single frame (aerosols) has one value per region. Its tide curve is one 4px dot per region labelled "one moment", never an empty line. Its beat timeline repeats one beat as a steady rhythm, with its one date under it.

## Views

The app has five views, one per tab, plus the Game tab, which opens the listening game page. Changing view stops all sound, moves focus to the view's heading, and changes the tab title to "<view> · Earth Sonata".
- **Listen (home):** three numbered steps (P1): 1 Choose a NASA picture and 2 Choose what to hear side by side, then the picture in its chart frame (or, for a region, the zoomed circle with a locator map and the region's description beside it) with the credit under it, the held-note bars beside it, and the player bar with the sound line (3 Play). It plays the picture scan (decision D1). Explain opens a hairline section under the player: the three honesty lines for the picture, "Why the scan sounds like this", what the marks mean and how the picture becomes sound. Fits one desktop screen.
- **Compare:** for the chosen picture only, its two regions side by side: close-up with ticks, the giant numeral, the value, a Play/Stop toggle and the region's rhythm row; then the tide table and curves.
- **How it's made:** the three-picture strip (picture, ticks, pulses), the rule in one line, the three honesty lines, and a credit block for each picture.
- **Play along:** Play the picture (the scan, its settings and legend folded away; click or tap the picture to explain a place, which is outlined in black and white with four ticks and named in a line under the picture), one panel with the Earth rhythm's Play and Stop, a now chip and the melody keys, and a one-line game card.
- **Globe:** the chosen picture on a large globe, with a Play/Stop toggle per region.

State is shown, not narrated: a now chip (region badge plus Ready, Playing or Paused) in the player; the status sentence is for screen readers only. The missing-information message sits at the top of the main column on every view.

## Do's and Don'ts

### Do:
- **Do** use hairline rules (1px `rule`) to separate sections and table rows.
- **Do** reserve signal for live, chosen and focused.
- **Do** pair every region colour with its letter.
- **Do** set coordinates, table cells and readouts in the mono face with tabular figures.
- **Do** let font weight (200 to 800) carry alignment on the numeral and live value.
- **Do** draw a missing frame as a break or hatched gap.
- **Do** give both themes the same structure; only the inks lift.
- **Do** keep the Tab order the same as the screen order: tabs, theme, step 1, step 2, then Play.

### Don't:
- **Don't** put content in boxes, cards or floating panels, or add side stripes.
- **Don't** add drop shadows.
- **Don't** colour a region blue, red, orange or yellow.
- **Don't** use signal for decoration, errors or missing data.
- **Don't** draw a missing frame as zero.
- **Don't** add a second text face or use the mono face for prose.
- **Don't** let colour be the only cue for a region or a state.
