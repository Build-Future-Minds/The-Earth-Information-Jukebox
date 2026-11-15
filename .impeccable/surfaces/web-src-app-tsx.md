---
version: 1
slug: "web-src-app-tsx"
primary_target: "web/src/App.tsx"
related_targets: ["web/src/styles.css"]
---

# Earth Sonata app (web/)

Scope: the main app, `web/src` (App.tsx and its components, styles.css). Mode: Operate.
Audience: visitors and Space Apps judges comparing two NASA ocean regions by ear; testers incl. low-vision, keyboard and screen-reader users.
Constraints: PRODUCT.md honesty lines and credit; keyboard first; colour never the only cue; light and dark themes with a switch.

## Direction contract

THESIS: Earth Sonata reads like a tide table printed on a sea chart: the NASA picture sits inside a chart graticule, and each region's numbers are set in ruled columns. It refuses the category default of a dark map viewer with floating panels and coloured cards.

OWN-WORLD: Two-ink tide-table print. Light: cool almanac white ground, navy ink, tide blue for actions, high-water red-orange only for live and focus, violet Region A and rose Region B (both off the NASA temperature scale). Dark is the night edition: deep navy ground, the same inks lifted. Structure is 1px hairline rules only, no boxes, no side stripes, 4px corners. One face, Atkinson Hyperlegible Next, mono for numbers.

STORY: The visitor sees where the two regions are on Earth, presses Start, hears the rhythm, reads the numbers in the table, and sees alignment over the 30 model frames as two tide curves.

FIRST VIEWPORT: Rail left: title, Light/Dark switch, playback buttons (Start in tide blue), region choice with A/B badges. Main: the NASA picture large inside a chart frame with latitude ticks left and right and longitude ticks top and bottom (every 30°), region rings in their colours; credit under it; status line.

FORM: Tide Table, assigned (candidate 5 of 7), fused with the user's pick of Nautical Chart's graticule. seed:02fbaf580729fa0a. Signature move: alignment over the 30 frames drawn as two tide curves on one time line, inside the rhythm section.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
