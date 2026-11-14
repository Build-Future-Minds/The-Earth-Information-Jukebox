---
name: Axis Specimen
description: The listening game's world. Alignment is set as type weight on cool paper, with one signal orange.
colors:
  signal: "#ff5a1f"
  ink: "#111214"
  ink-2: "#4b515a"
  paper: "#f6f7f8"
  rule: "#d9dce1"
  rule-2: "#eceef1"
  well: "#2a2a2a"
typography:
  numeral:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, Segoe UI, sans-serif"
    fontSize: "clamp(4.5rem, 10vw, 9rem)"
    fontWeight: 500
    lineHeight: 0.78
    letterSpacing: "-0.04em"
    fontVariation: "'wght' 200..800, driven by the alignment value"
  value:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, Segoe UI, sans-serif"
    fontSize: "2.6rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, Segoe UI, sans-serif"
    fontSize: "1.9rem"
    fontWeight: 750
    lineHeight: 1.1
    letterSpacing: "-0.015em"
  status:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, Segoe UI, sans-serif"
    fontSize: "1.35rem"
    fontWeight: 650
    lineHeight: 1.3
  title:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, Segoe UI, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, Segoe UI, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, Segoe UI, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 600
    lineHeight: 1.5
  readout:
    fontFamily: "Atkinson Hyperlegible Mono, ui-monospace, Consolas, monospace"
    fontSize: "0.9rem"
    fontWeight: 400
    fontFeature: "tnum"
  key:
    fontFamily: "Atkinson Hyperlegible Mono, ui-monospace, Consolas, monospace"
    fontSize: "0.8rem"
    fontWeight: 600
    lineHeight: 1.4
rounded:
  key: "3px"
  sm: "4px"
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
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "48px"
  button-hover:
    backgroundColor: "{colors.rule-2}"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "48px"
  button-quiet:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "48px"
  pick:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "60px"
    width: "100%"
  pick-chosen:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.ink}"
  pick-answer:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  key-cap:
    textColor: "currentColor"
    typography: "{typography.key}"
    rounded: "{rounded.key}"
    padding: "0 5px"
  image-well:
    backgroundColor: "{colors.well}"
    rounded: "{rounded.sm}"
---

# Design System: Axis Specimen

Scope: this file covers the listening game's world, `tools/listening_game.html`, and since 14 Nov also Developer B's React app in `web/` (`web/src/styles.css`), agreed by Student B and Developer B. The app keeps its own single-column layout and controls; it takes this system's palette, type, shapes, focus ring, motion and the Weight Is the Value readout.

## Overview

**Creative North Star: "Axis Specimen"**

The page is a type specimen for one measurement. Every alignment number is set in a variable sans whose weight is the value itself: a swirly patch's numeral reads as a hairline, a lined-up one as a slab. The page around those numerals stays still and quiet: cool paper, near-black ink, hairline rules, square 4px corners. One signal orange marks what is live or chosen. The NASA image is the only full-spectrum colour on screen, and the system never competes with it.

Density is a working instrument, not a quiz app. A fixed 400px left rail holds the map, playback, settings and score. The main column holds the status sentence, two equal patch columns and one shared plot. State changes snap in two 90ms steps with no easing, like an acetate overlay being swapped.

**Key Characteristics:**
- Type weight carries data: variable `wght` 200 to 800 maps an alignment of 0 to 1.
- One accent (signal orange) for selection, focus, the live state and the high pulse.
- Flat surfaces, 1px hairline rules, 4px corners, no shadows.
- Mono readouts with tabular figures beside every control and value.
- Keyboard first: every action shows its key in a key cap.

## Colors

A cool, near-monochrome paper-and-ink palette with one hot signal; the image supplies all other colour.

### Primary
- **Signal Orange** (`signal`): the single accent. It fills the chosen pick button, draws the focus ring (3px outline, 3px offset), tints the range thumb on focus, colours text selection and the caret, and draws the high pulse in the rhythm plot. Text on it is always Ink, never white.

### Neutral
- **Ink** (`ink`): text, 2px button borders, the primary button fill, the revealed answer's fill, the low-pulse marks in the plot.
- **Slate Ink** (`ink-2`): secondary text, mono readouts, range tracks, table headers.
- **Cool Paper** (`paper`): page ground; also the halo stroke around the giant numerals and text on Ink fills.
- **Rule Grey** (`rule`): 1px section rules, table rules, plot baselines and beat ticks, the quiet button's border.
- **Faint Rule** (`rule-2`): button hover fill and scrollbar track.
- **Image Well** (`well`): the dark ground behind the map and patch canvases while images load.

### Named Rules
**The One Signal Rule.** Signal Orange is the only accent. It means "chosen, live or focused" and nothing else. No second hue is introduced for right/wrong; the answer is shown in Ink.

**The Image Owns Colour Rule.** The NASA visualization is the only full-spectrum colour. Chrome stays in paper, ink and rule greys so the data image is never repainted or competed with.

## Typography

**Display Font:** Atkinson Hyperlegible Next, variable 200 to 800 (with system-ui, Segoe UI, sans-serif)
**Body Font:** Atkinson Hyperlegible Next
**Label/Mono Font:** Atkinson Hyperlegible Mono, 400 and 600 (with ui-monospace, Consolas, monospace)

**Character:** One legibility-first family does everything, chosen for low-vision testers; the mono sibling sets every live number so readouts never jitter.

### Hierarchy
- **Numeral** (500 at rest, 200 to 800 on reveal, clamp(4.5rem, 10vw, 9rem), 0.78): the giant patch numbers 1 and 2. They overlap the lower edge of their patch image by 0.32em, with a 0.06em Paper stroke painted under the fill to stay legible over the image.
- **Value** (500 at rest, weight set by alignment, 2.6rem, 1; 1.9rem under 640px): the alignment number under each numeral, tabular figures.
- **Headline** (750, 1.9rem, 1.1, -0.015em): the page question in the rail.
- **Status** (650, 1.35rem, 1.3, max 46ch, balanced): the live sentence at the top of main, announced politely to screen readers.
- **Title** (700, 1.05rem): section heads such as Score and the plot heading.
- **Body** (400, 18px, 1.5): prose, at most 60 to 70ch.
- **Label** (600, 0.95rem): control names; buttons use 700 at 1rem.
- **Readout** (Mono 400, 0.9rem, tabular): slider outputs, "alignment / note / wght" lines, table numbers.
- **Key** (Mono 600, 0.8rem): key caps inside buttons.

### Named Rules
**The Weight Is the Value Rule.** Alignment numbers and patch numerals take `font-weight` from the measured alignment (200 at the swirly end, 800 at the lined-up end). Before the answer they sit at a neutral 500 so the page gives nothing away. Never use weight for emphasis on these elements.

**The Mono Readout Rule.** Every number that changes while you watch (slider outputs, alignment note and weight lines, scores) is set in Atkinson Hyperlegible Mono with tabular figures.

## Layout

Two columns on desktop: a fixed 400px rail with a 1px Rule Grey right border, and a fluid main column. The rail is split in two grid areas (top: title, map, credit, playback; bottom: settings, score, Reset) so that below 960px the order becomes top rail, main, bottom rail and the patches come before the settings. Reset score is pushed to the foot of the rail on desktop.

Spacing rhythm: rail padding 32px 28px, main padding 32px 40px 40px; 16px side gutter under 960px. Vertical gap between rail and main blocks is 22px; the two patch columns sit 28px apart (14px under 640px); button groups use a 10px gap. The patch pair is always two equal columns, even on phones; readouts stack under 640px instead.

Sections inside main are divided by a 1px Rule Grey top border with 14 to 16px of padding, never by boxes.

## Elevation & Depth

Flat. There are no shadows anywhere. Depth comes from three things only: the Image Well behind the imagery, the giant numeral overlapping its image's lower edge, and fills (Ink or Signal) on the answer buttons after a round. Section structure is drawn with 1px hairline rules.

### Named Rules
**The Hairline Rule.** Structure is a 1px Rule Grey line, not a card, not a shadow, not a tinted panel.

## Shapes

Square-shouldered: 4px corners on buttons, image wells and the range thumb; 3px on key caps. Buttons carry a 2px Ink border. Range inputs are a 2px Slate Ink track with an 18px square Ink thumb. The disclosure chevron is a drawn 8px corner (two 2px borders) that rotates on open. Map region boxes are a 2px white border inside a 2px black outline with a white number tab, so they read on any part of the image.

## Components

### Buttons
Plain, bordered, keyboard-labelled.
- **Shape:** 4px corners, 2px Ink border, 48px minimum height, 16px side padding, label left and key cap right.
- **Default:** transparent fill, Ink text, 700 weight at 1rem.
- **Primary** (New round): Ink fill, Paper text; hover deepens to #2a2c31.
- **Hover / Focus:** hover fills Faint Rule; focus is the global 3px Signal outline at 3px offset.
- **Quiet** (Reset score): Rule Grey border, Slate Ink text, 600 weight, set apart at the rail's foot.
- **Disabled:** 40% opacity, not-allowed cursor.

### Pick buttons (signature)
The primary action, keyed 1 and 2. Full column width, 60px tall, 1.1rem. After a round the tester's pick floods with Signal Orange (Ink text), and if the pick was wrong the right answer fills Ink with Paper text. Pick buttons lock with `aria-disabled` between rounds and show no hover then.

### Key caps
Mono 600 at 0.8rem, 1.5px currentColor border, 3px corners, 0 5px padding. They inherit the button's text colour, so they invert on filled buttons.

### Inputs / Fields
- **Range:** 28px hit area, 2px Slate Ink track, 18px square Ink thumb with 4px corners; thumb turns Signal on focus. A label row above shows the name left and a Mono readout right.
- **Checkbox switch:** 22px native box with Signal `accent-color`, label and a Mono state readout.

### Patch column (signature)
Image canvas (8:5, 4px corners, Image Well ground), then the giant numeral overlapping its lower edge, then a readout row (Value left, Mono note and weight right), the pick button, and a small Slate Ink location line.

### Rhythm plot (signature)
One shared time axis for both patches, revealed only after the answer. Each row is a 5.5rem label and a 40px-tall SVG: 2px Rule Grey baseline and beat ticks, 6px-wide Ink bars for the low pulse on the beat, shorter 6px Signal bars for the high pulse. A legend uses 4x16px swatches.

### Score table
Full-width, 0.9rem, 1px Rule Grey row rules, Slate Ink 600 headers, numeric columns right-aligned in Mono. The total score sits in Mono at 1.6rem beside the Score heading.

## Do's and Don'ts

### Do:
- **Do** drive the weight of every alignment numeral from the value (200 to 800), and hold it at 500 until the answer is shown.
- **Do** reserve Signal Orange for the chosen, live or focused thing, with Ink text on it.
- **Do** animate state changes as a two-step 90ms snap (`steps(2, jump-end)`), and remove transitions under reduced motion.
- **Do** set live numbers in Atkinson Hyperlegible Mono with tabular figures.
- **Do** show each action's keyboard key in a key cap inside its button.
- **Do** keep the NASA credit directly under the image it credits.

### Don't:
- **Don't** add a second accent or green/red right/wrong colours; the answer is shown with Ink.
- **Don't** use shadows, cards or tinted panels; separate sections with 1px Rule Grey lines.
- **Don't** round corners past 4px.
- **Don't** tint, recolour or overlay colour on the NASA imagery beyond the black-and-white region boxes.
- **Don't** use eased or springy motion; the world snaps.
