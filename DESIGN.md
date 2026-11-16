---
name: Pulse Catalogue
description: A record catalogue. Each NASA picture is an entry and each region a side. White sleeve with black ink (or the matte black sleeve), square boxed controls joined by 1px rules, letterspaced caps, and colour only for the side that is playing.
colors:
  region-a: "oklch(0.52 0.2 295)"
  region-b: "oklch(0.53 0.19 5)"
  on-region: "oklch(0.99 0 0)"
  ink: "oklch(0.15 0 0)"
  ink-2: "oklch(0.42 0 0)"
  paper: "oklch(0.975 0 0)"
  rule: "oklch(0.82 0 0)"
  rule-2: "oklch(0.93 0 0)"
  signal: "oklch(0.15 0 0)"
  on-signal: "oklch(0.975 0 0)"
  action: "oklch(0.15 0 0)"
  action-hover: "oklch(0.3 0 0)"
  on-action: "oklch(0.975 0 0)"
  well: "oklch(0.15 0 0)"
  on-well-2: "oklch(0.78 0 0)"
  white: "#ffffff"
  black: "#000000"
typography:
  numeral:
    fontFamily: "Geist Variable, Geist, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(4.5rem, 10vw, 9rem)"
    fontWeight: 300
    lineHeight: 0.78
    letterSpacing: "-0.04em"
    fontVariation: "wght 200..800, driven by the alignment value"
  value:
    fontFamily: "Geist Variable, Geist, Helvetica Neue, Arial, sans-serif"
    fontSize: "2.6rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontVariation: "wght 200..800, driven by the alignment value"
  brand:
    fontFamily: "Geist Variable, Geist, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "0.32em"
  title:
    fontFamily: "Geist Variable, Geist, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 600
    lineHeight: 1.3
  status:
    fontFamily: "Geist Variable, Geist, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 450
    lineHeight: 1.3
  body:
    fontFamily: "Geist Variable, Geist, Helvetica Neue, Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Geist Variable, Geist, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 600
    lineHeight: 1.5
  caps:
    fontFamily: "Geist Variable, Geist, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.16em"
  readout:
    fontFamily: "Geist Mono Variable, Geist Mono, ui-monospace, Menlo, Consolas, monospace"
    fontSize: "0.9rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "tnum"
rounded:
  none: "0px"
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
    rounded: "{rounded.none}"
    padding: "0 16px"
    height: "48px"
  button-hover:
    backgroundColor: "{colors.rule-2}"
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.on-action}"
    rounded: "{rounded.none}"
    padding: "0 24px 0 16px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.action-hover}"
  button-pressed:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  tab:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    typography: "{typography.caps}"
    rounded: "{rounded.none}"
    padding: "11px 14px"
  tab-current:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    padding: "11px 22px 11px 14px"
  region-badge-a:
    backgroundColor: "{colors.region-a}"
    textColor: "{colors.on-region}"
    rounded: "{rounded.none}"
    size: "1.6em"
  region-badge-b:
    backgroundColor: "{colors.region-b}"
    textColor: "{colors.on-region}"
    rounded: "{rounded.none}"
    size: "1.6em"
  chart-well:
    backgroundColor: "{colors.well}"
    rounded: "{rounded.none}"
  key-cap:
    textColor: "{colors.ink}"
    typography: "{typography.readout}"
    rounded: "{rounded.none}"
---

# Design System: Pulse Catalogue

Scope: the main app (`web/`, styles in `web/src/styles.css`, fonts loaded in `web/src/main.tsx`). This file governs the visual world only. Page layouts are owned per page in `docs/page_plan.md`. The listening game (`tools/listening_game.html`) still uses the Tide Table tokens until its own redesign (`docs/page_plan.md`, P5). It shares the saved theme choice (`localStorage` key `es-theme`) with the app.

## Overview

**Creative North Star: "The Record Catalogue"**

Earth Sonata reads like a record catalogue. Each NASA picture is a catalogue entry and each region is a side. Controls are square boxes joined by 1px rules, like a catalogue index. Labels are letterspaced caps. The rhythm is drawn as hairline pulse lines from the real alignment numbers. Nothing casts a shadow and no corner is rounded.

Two sleeves of one record. Light is a white sleeve with black ink and grey hairlines, with no hue at all. Dark is a matte black sleeve with white ink. The theme follows the saved choice, else the system setting, and is set before first paint so there is no flash. The NASA picture always sits on a black well in both themes.

Colour is held back for the side. It appears only on what is live or chosen, and then it is the playing side's colour: Side A violet or Side B rose. Everything else, including focus, is ink.

The system is keyboard-first. The Tab order follows the screen: the tabs, the theme switch, the picture choice (when there is more than one picture), the region choice, then Play. Colour is never the only cue: every region mark carries its letter.

**Key Characteristics:**
- One face, Geist. Geist Mono only for numbers, coordinates, key caps and readouts.
- Colour is the side: the needle, the played wash, and the end block on the current tab and on the primary buttons.
- Region A violet, Region B rose, both off the NASA picture's blue-to-red temperature scale.
- Square corners and 1px borders everywhere. No shadows, no cards.
- Letterspaced uppercase labels for tabs, the theme switch, legends, icon-button labels, table headers and map tags.
- Type weight carries data: the numeral and the live value run weight 200 to 800 with alignment.
- A missing frame is a break or a dashed flat line, never zero.

## Colors

A one-ink print with no hue, plus two side colours that appear only when a side is live or chosen.

### Primary
- **Side A Violet** (`region-a`) and **Side B Rose** (`region-b`): the region's rings and tab on the picture, its letter badge, its map tag badge, its numeral, its tide curve, its first-pulse marks, and the needle, needle cap, needle dot and played wash on the beat lane. The playing side's colour is also set as `--live` on the top bar and the main column. Dark lifts both (violet oklch 0.73 0.16 295, rose oklch 0.76 0.14 5) and turns `on-region` dark (oklch 0.15 0 0), so letters stay readable on the lighter fill.

### Neutral
- **Sleeve Ink** (`ink`): text, borders on buttons, selects and the player bar, the table header rule, the chosen state of tabs, toggles and speed buttons. Dark: oklch 0.96 0 0.
- **Grey Ink** (`ink-2`): secondary text, unchosen tab and switch labels, graticule labels, second-pulse marks, the range track. Dark: oklch 0.72 0 0.
- **White Sleeve** (`paper`): the ground. Dark: the matte black sleeve, oklch 0.15 0 0.
- **Hairline** (`rule`) and **Faint Hairline** (`rule-2`): section rules, table rules, tab and switch frames and dividers; rule-2 is also the hover fill, the empty note bar and the missing-beat fill. Dark: oklch 0.34 0 0 and 0.22 0 0.
- **Black Well** (`well`): the ground behind the NASA picture, the close-up canvases, the pulse plot and the legend glyphs. Black in both themes (oklch 0.09 0 0 in dark).
- **On-Well Grey** (`on-well-2`): secondary marks drawn on the well (the beat drawing's second pulse and its rules). The same in both themes, because the well is black in both; `rule` is nearly the well's own colour in dark.
- **Picture White and Black** (`white`, `black`): marks drawn over the NASA picture only (ring outlines, the scan needle, compass letters, map tag text). They never change with the theme.
- **Signal** (`signal`) and **Action** (`action`): aliases of ink in the code (`--signal: var(--ink)`, `--action: var(--ink)`). They flip with the theme. `action-hover` is oklch 0.3 0 0 in light and 0.85 0 0 in dark.

Dark values live in `:root[data-theme='dark']` in `web/src/styles.css`; the sidecar carries them.

### Named Rules
**The Colour Is the Side Rule.** Colour appears only on what is live or chosen, and it is always the playing side's colour, set as `--live` from the chosen region. It marks the needle, the played wash, and an end block on the current tab (7px) and on the primary buttons (8px). On pictures with neutral regions, and on Home, where no side is chosen, `--live` is ink, so no colour appears. A new surface does not get a colour of its own.
**The Signal Is Ink Rule.** The marks that used to be red-orange are ink now: the focus ring (2px ink, offset 3px), the chosen picture's underline, the chime flash on a note bar, the held melody key, the tide curves' playing line, text selection and the caret.
**The Off-Scale Rule.** A region colour must not be a colour the picture itself uses for data. On the ocean picture (blue-to-red temperature) the regions are violet and rose, never blue, red, orange or yellow. Pictures whose own colours include those hues get neutral regions: the aerosol picture (regions C and D; blue sea salt, pink dust, orange-red smoke, green sulfates) and the rain picture (regions E and F; a blue-to-red rain scale). Neutral means an ink ring inside a white outline and an ink badge with an `on-region` letter, in both themes.
**The Letter Rule.** A region colour never travels alone; its letter badge or end label goes with it. The end blocks on the current tab and on Play only repeat the side that the now chip and the region choice already name with its letter.

## Typography

**Display and Body Font:** Geist (variable, with Helvetica Neue, Arial, sans-serif)
**Label/Mono Font:** Geist Mono (variable, with ui-monospace, Menlo, Consolas, monospace), for numbers only

Both are bundled with `@fontsource-variable` so the app works offline.

**Character:** A plain grotesque set small and spaced out for labels, large and light for numbers. The weight axis is a data channel, not decoration.

### Hierarchy
- **Numeral** (300 default, 200 to 800 driven, clamp(4.5rem, 10vw, 9rem), 0.78): the giant alignment number, in the region colour with a paper-coloured stroke behind it. On Compare it is clamp(3rem, 6vw, 4.6rem) at 0.9.
- **Value** (500 default, 200 to 800 driven, 2.6rem, 1): the live alignment readout. Mobile 1.9rem.
- **Brand** (600, 0.95rem, uppercase, 0.32em tracking): EARTH SONATA in the top bar.
- **Title** (600, 1.05rem, 1.3): section headings.
- **Home title** (600, clamp 1.9rem to 2.4rem, 1.12, -0.025em, max 21ch): the problem sentence that opens Home, its first sentence at 300 in grey ink. Home's section headings are 600, 1.65rem (1.4rem on phones). Used on Home only.
- **Status** (450, 1.05rem, 1.3, max 46ch): the sentence about what is playing.
- **Body** (400, 17px, 1.55): prose capped at 65 to 70ch.
- **Label** (600, 0.95rem): form labels and button text.
- **Caps** (500, 0.72rem, uppercase, 0.16em `--caps`): tabs, theme switch, legends. Icon-button labels (0.7rem), table headers, map tags and the now chip use the same caps at 0.12em.
- **Readout** (mono 400, 0.9rem, tabular numerals): range values, table numbers, graticule labels (0.75rem), tide axis, beat-lane dates (0.68rem), key caps (500, 0.8rem), region letters (600, 0.8rem).

### Named Rules
**The Weight Is the Value Rule.** Alignment 0 maps to weight 200 and alignment 1 to 800 (`weightFor` in `NowPlaying.tsx`, used by the live value and the Compare numerals). Do not flatten it to one weight.
**The Numbers in Mono Rule.** Coordinates, table cells, axes, dates, region letters and readouts use Geist Mono with tabular figures. Words never do.
**The Caps Label Rule.** Labels that name a control or a column are uppercase and letterspaced (0.12em to 0.16em) at 0.6rem to 0.72rem, weight 500. Headings, prose and button words in the body are not.
**The Math Face Rule.** KaTeX's math faces (pinned with KaTeX 0.19.1, loaded only with How it's made) are the one second face allowed, and only inside formulas. A formula is never set in caps or tracked, even inside a caps label.

## Layout

A sticky top bar (10px 24px padding, 1px rule under it) holds the brand on the left (its title line shows from 1560px up), the tabs, and the theme switch on the right. Below it, one main column capped at 1240px (14px 24px 24px padding, 12px gaps). Between 1024 and 1199px the tab cells tighten so seven tabs fit. Below 1024px the tabs move to a fixed bottom bar, one equal cell per tab, icon over word, with a 1px ink rule on top, and the player bar sticks just above it. At 640px and under the gutters drop to 16px and the chart margin tightens. The page keeps a focused control clear of both bars (`scroll-padding`). Where each page puts its parts is set in `docs/page_plan.md`, not here.

Spacing scale: 10, 16, 22, 28, 40px. Sections are separated by a 1px top rule with 10 to 16px padding, not by gaps alone. The NASA picture sits in a chart frame (1px ink neatline, margin 22px top and 44px left) with ticks every 10 degrees, labelled every 30, and the credit directly under it.

## Elevation & Depth

Flat. There are no drop shadows. Depth is the black well behind the picture and the 1px ink frame around it. Every box-shadow in the code is an outline, never elevation: a 1px inset white ring on the map tag (2px in the region colour when active), a 3px inset underline in the region colour under the current rhythm row's name, a 1px inset ink ring on the active melody pad, a 3px ink ring on a chiming note bar, a 1px dark halo on the pulse plot needle, and a 2px paper ring around a corner step mark.

### Named Rules
**The No Shadow Rule.** Nothing floats. A new surface gets a hairline rule or a 1px frame, not a shadow.

## Shapes

Square corners everywhere (`--r: 0`, `--r-key: 0`): buttons, inputs, tabs, the player bar, wells, region badges, map tags, step marks, key caps and range thumbs. Borders are 1px: ink on controls and frames, hairline on tab and switch strips and on section rules. Joined controls share their 1px dividers. Circles appear only where the thing is a circle: the region rings on the picture, the region choice thumbnail (a 44px crop of the real ring with a 1px ink outline, 3px in the region colour when chosen), the needle's foot dot, the now chip's playing dot, tide dots and chime ripples. The graticule is square ticks (7px major, 4px minor). Picture region rings are drawn in the region colour inside a black outline so they read on any part of the image; the live region's ring and tab are heavier.

## Components

### Buttons
Square, boxed, plain.
- **Shape:** square corners, 1px ink border, 48px minimum height, 0 16px padding, Label type.
- **Primary:** ink fill, paper text, and an 8px end block in `--live` on the right edge (Play and Pause; also the primary button links).
- **Hover:** faint hairline fill; primary goes to `action-hover`.
- **Pressed / expanded:** ink fill, paper text.
- **Focus:** a 2px ink ring offset 3px, global to every focusable element.
- **Motion:** two 90 ms steps, no easing (`--snap`), none under reduced motion.

### Icon button
A line icon over a one-word label. Team rule (15 Nov): more buttons, less text.
- **Shape:** the Buttons border, corners, hover, pressed and focus states; 56px minimum height, 64px minimum width, 6px 10px padding (52px by 56px in the player bar).
- **Icon:** 20px, 2px stroke in `currentColor`, round caps, decorative (`aria-hidden`).
- **Label:** one word under the icon in caps (0.7rem, 500, 0.12em). The word is the button's accessible name: Play, Pause, Stop, Replay, Explain, Sound.
- **Primary:** Play and Pause, with the side's end block.
- **Stop** carries `aria-keyshortcuts="Escape"`; Esc stops from anywhere.

### Page links (tabs)
Seven tabs in the top bar: six views (Home first) and Game (opens the listening game page, which links back), each a 16px line icon and a caps word in grey ink. They are one joined strip with a 1px hairline frame and 1px hairline dividers. The current tab is filled in ink with paper text, carries `aria-current="page"`, and has a 7px `--live` end block. Hover fills with the faint hairline and turns the word ink. Below 1024px the strip becomes the fixed bottom bar.

### Player bar
One framed strip under the picture, like a music player: 1px ink frame, square corners, 10px 12px 12px padding, paper ground. Left: Play / Pause, Stop with a small "Esc" hint in mono (hidden from screen readers; `aria-keyshortcuts` says it), Replay. Middle: the beat lane, taking the free width. Right: Explain and Sound. On phones it sticks above the tabs, the lane takes its own row and the five buttons share one row.

### Sound settings
One Sound icon button shows and hides the speed buttons (½× ¾× 1× 1¼×, mono, the chosen one pressed in ink) and a Volume slider. No decibel numbers on screen; screen readers hear a percentage.

### Theme switch
Two joined buttons (Light, Dark) with 16px line icons and caps words, a 1px hairline frame and divider, the chosen one filled in ink. 40px minimum height. Sits at the right of the top bar, after the tabs in Tab order.

### Inputs / Fields
- **Range:** 2px grey track, 18px square ink thumb (ink on focus too); label row above with the name left and a mono readout right.
- **Select:** 1px ink border, square, 44px height.
- **Radio and checkbox:** 22px, ink accent, 44px hit row.

### Picture choice
A 88 by 50px thumbnail with a 1px ink frame and one word under it. The chosen one has a 3px ink underline and its word turns ink at 600.

### Region badge and map tag
A square in the region colour holding the region letter in mono, used wherever the region is named (choice, table row, close-up, now chip, map tag). The map tag is a square dark tag (black at 82%) with the badge inside and the region name in white caps, ringed by a 1px inset white line; the active region's tag is ringed 2px in its own colour.

### Now chip
The region badge and one caps word (Ready, Playing, Paused). Playing adds an 8px round dot in the region colour.

### Beat lane and needle (signature)
Notes as 4px bars on a 64px lane with a hairline top and an ink baseline: first pulse in the region colour, second pulse in grey and shorter, missing beats a dashed box (faint fill, 3 3 dash in grey). Notes not yet played sit at 16% opacity; a note just played gets a 2px stroke in the region colour. The needle is a 2px line in the side's colour with an 11px square cap on top and a 9px dot at the foot, running on the audio clock. The part of the loop already played is washed in the same colour at 12%. Dates sit under the lane in mono, the current one in ink at 600.

### Pulse plot (signature)
One hairline per model frame, stacked like a record sleeve's pulsar plot, on the black well inside a 1px ink frame at 2:1. Each line is one beat: a peak at the first pulse and a lower peak where the second pulse lands. Lines are white at 92% and 1.1px; while the side plays, the sounding beat's line turns the side's colour at 2.6px and a 2px needle in the side's colour sweeps across the beat. A missing frame is a dashed flat line with no peaks. Ready for Compare (`docs/page_plan.md`, P2); the page owner places it and puts the region's letter beside it.

### Tide table
Ruled columns, hairline row rules, caps headers in grey with an ink rule under them, numbers right-aligned in mono, region row names with badge, the playing region's row marked by weight 700.

### Tide curves
Alignment over the model frames, one 3px rounded curve per region on a 0, 0.5, 1 hairline grid, mono axis labels, each curve named at its right end by letter and last value, a 2px ink line for the playing position. A missing frame lifts the pen: the curve breaks and is never drawn as zero.

### Chart frame and graticule
The NASA picture inside a 1px ink neatline on the black well, with ticks and mono labels outside it.

### Scan overlay and note bars
Marks drawn over the NASA picture are black and white only. The place a click or tap explains is outlined black under white, with four ticks pointing at it, and named in a line under the picture; it is a shape, not a colour, and it does not move. Note bars fill with ink to show loudness and flash ink with a 3px ink ring when their band chimes.

### Melody pad
A 1px ink-bordered pad of 48px square key caps; the active pad gains a 1px inset ink ring and the held key fills with ink.

### Step marks
A square ink block with a mono numeral in paper, used only for the real sequence on Listen (1 Picture, 2 Region, 3 Play).

### Index rows (Home)
The catalogue index: ruled rows under a 1px ink rule, hairlines between, each whole row one link (56px, 48px for quick links). A mono index numeral in grey ink on the left (01 to 05; screen readers hear "Step 1"), the words in the middle, and the page it opens on the right as a caps label with its line icon and an arrow. Hover fills with the faint hairline; focus is the ink ring drawn inside the row. Column labels above a ruled list are caps in grey with an ink rule under them, as in the tide table. Used for How to use it, the quick links and What it is and is not.

### Practice and missing states
Hairline sections, not cards. Missing information is a 1px ink box stated plainly at weight 650, never red. Practice data is an ink band across the top.

### Claim tags and charts (How it's made)
- **Claim tags:** a square box in caps (0.72rem, 500, `--caps`) holding the word, always shown: Verified filled in ink with paper text, Design choice outlined in 1px ink, Unverified outlined with a dashed line. Never a side colour.
- **Formulas:** KaTeX display math, each with an "In words" line under it. A formula wider than its column scrolls inside its own box, fades at the right edge and takes keyboard focus.
- **Charts:** hand-drawn SVG. Marks are ink and predictions grey ink, with no hue. Regions keep their side colours and always carry their letter. The alignment map uses grey ink in 0.1 steps, with hatching where there is no number. Every chart leads with its takeaway and has a "Show the numbers" table.

### One-moment pictures
A picture with a single frame (aerosols) has one value per region. Its tide curve is one dot per region labelled "one moment", never an empty line. Its beat lane repeats one beat as a steady rhythm, with its one date under it.

## Do's and Don'ts

### Do:
- **Do** use 1px borders and hairline rules (`rule`) to separate sections, join controls and rule tables.
- **Do** keep every corner square.
- **Do** show colour only on what is live or chosen, as the playing side's colour through `--live` or `--region`.
- **Do** use ink for focus, selection, the chosen picture, the chime flash and the held key.
- **Do** pair every region colour with its letter.
- **Do** set labels for controls and columns in letterspaced caps.
- **Do** set coordinates, table cells and readouts in Geist Mono with tabular figures.
- **Do** let font weight (200 to 800) carry alignment on the numeral and live value.
- **Do** draw a missing frame as a break, a dashed box or a dashed flat line.
- **Do** give both themes the same structure; only the inks flip.
- **Do** keep the Tab order the same as the screen order: tabs, theme, picture, region, then Play.

### Don't:
- **Don't** round corners or add drop shadows.
- **Don't** put content in cards or floating panels, or add edge stripes. The only edge block is the `--live` end block on the current tab and the primary buttons.
- **Don't** add a hue to the neutrals or give a surface a colour that is not the side's.
- **Don't** colour a region blue, red, orange or yellow.
- **Don't** use a side colour for decoration, errors or missing data.
- **Don't** draw a missing frame as zero.
- **Don't** add a second text face or use the mono face for prose.
- **Don't** let colour be the only cue for a region or a state.
