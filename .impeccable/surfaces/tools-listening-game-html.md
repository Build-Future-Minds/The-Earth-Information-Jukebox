---
version: 1
slug: "tools-listening-game-html"
primary_target: "tools/listening_game.html"
related_targets: []
---

# Listening game surface brief

Scope: `tools/listening_game.html`, the practice listening game. Mode: Operate.
Audience: testers in Student B's sessions, playing alone, open-ended rounds; some low-vision or blind.
Task: hear one rhythm, pick which of two NASA ocean patches made it (keys 1/2), then see why.
Must keep: keys 1 / 2 / P / R / Esc, world map with numbered boxes, rhythm fingerprint, score by difference.
Sound: 12 beats; pitch follows alignment, always on (user's decision): one of 11 C-pentatonic notes
C4 to C6, second pulse a fifth above; note length also follows alignment (held 12 % to 95 % of each gap). Labelled in the page as the game's choice; the team rule keeps
pitch fixed until Dev A decides.
Unresolved: final alignment end points and minimum audible difference (Dev A).

## Direction contract

THESIS: Alignment is set as type weight. Every alignment number on the page is drawn in a variable
font whose weight is the value, so a swirly 0.14 reads hairline and a streaky 0.64 reads heavy. It
refuses the quiz-app card grid with coloured answer buttons.

OWN-WORLD: Cool paper #f6f7f8 ground, ink #111214, rule grey #d9dce1, one accent signal orange
#ff5a1f owning selection, the live state and the high pulse. The NASA image is the only
full-spectrum colour. Atkinson Hyperlegible Next (variable 200 to 800) for everything, Atkinson
Hyperlegible Mono for readouts. Flat surfaces, hairline rules, square 4px corners, range inputs with
monospace live readouts.

STORY: The tester sees where the two patches are on the real map, hears one rhythm, picks 1 or 2,
then sees the answer drawn: the weights of the two numerals and one shared plot of both rhythms.
They leave knowing that lined-up streaks sound even and swirls sound short then long.

FIRST VIEWPORT: Left rail 400px: title, NASA map with boxes 1 and 2, credit, New round / Replay /
Stop, Speed and Volume sliders with readouts, a Pitch line, score and by-difference table, Reset score
set apart at the foot. Main: status line; two equal patch columns, each a crop with a giant numeral
(1, 2) overlapping its lower edge and a full-width pick button keyed 1 or 2; under them one shared
plot with both rhythms on a single time axis. Primary action: the two pick buttons.

FORM: Axis Specimen, from the bolder re-roll hand, lead by deal order, chosen by the user.
seed:833f0bd390acb063. Raises: picked patch floods with the accent (from Metro Tiles); one plot owns
the reveal (from Catalog Sleeve); every state change is a two-step 90 ms snap, no easing (from
Acetate Manual).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
