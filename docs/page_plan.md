# Page redesign: one plan per page

Owner of this page: Developer A (Mr. E). Written 15 Nov 2026 from Developer A's notes on each page.

The tracker says who and when. This page says what and how. Each task has: why (Developer A's
words), what is there today, what to build, the files, the checks, and who reviews.

| # | Page | Owner | Starts after |
| --- | --- | --- | --- |
| P0 | Landing page (new): the problem, the idea, how to use it | Developer B | nothing |
| P1 | Listen: choose a NASA picture, then a region, then play the picture scan | Developer A | the two decisions below |
| P2 | Compare: a new layout that shows the difference at a glance | Developer B | nothing |
| P3 | How it's made: the methods, the math and the checks | Developer A | nothing |
| P4 | Play along and Globe move into Listen | Developer A | P1 merged |
| P5 | Game: fewer buttons, less text | Developer B (Student B reviews) | nothing |

**Tabs when all six are done:** Home · Listen · Compare · How it's made · Game (five tabs, down
from six). Old links to `#play` and `#globe` still work: they open Listen (P4).

## Two decisions before P1 starts (Developer A)

**D1. What happens to the Earth rhythm.** Today Listen plays the Earth rhythm: two short pulses per
beat, spaced by alignment (`earthVoice.ts`). P1 makes the picture scan Listen's main sound. The
Earth rhythm is still the rule the game tests and the numbers Compare shows.
Recommended: Listen plays the scan; the Earth rhythm stays on Listen as a switch ("Add the Earth
rhythm", P4), and stays the sound of Compare and the Game. Then `PRODUCT.md` ("Positioning"),
`docs/mapping_spec.md` (its scan section is titled "an extra, not part of the rule") and How it's
made (P3) must say that Listen plays the scan.

**D2. How the scan reads the aerosol and rain pictures.** The scan's settings were measured on the
ocean picture only (`scanChoices.ts`: "Each picture needs its own full level; only the ocean
picture has been measured"), which is why `App.tsx` locks Play along to the ocean picture.
Recommended for this round: keep the same rule (colour strength sets loudness, red-side colours
play the warm instrument) and measure each picture's own full level and land check (P1a). Later,
maybe: a colour-to-instrument rule read from each NASA legend (for example one instrument per
aerosol type). Not before it is measured.

## Rules for every task

- One branch per task (`role/short-task`), a pull request, one teammate reviews. `main` always runs.
- Roles, not names, in files, commits and screenshots.
- Follow `DESIGN.md` (Tide Table): hairline rules, no boxes or shadows, the red-orange signal only for
  live, chosen or focused, a region colour never without its letter, keyboard first.
- Follow `PRODUCT.md`: no sound before a press; Stop and Esc silence everything; the NASA credit
  wherever a NASA picture appears; no images, music or video made by a generative AI model; never
  invent counts, testimonials or accessibility claims.
- Never compare numbers between pictures. Each is drawn and measured with its own settings.
- Every pull request shows before and after screenshots at 1440 × 900 and at phone width (390 px),
  and passes `npm test`, `npm run build` and `npm run test:e2e` (from `web/`).
- If an AI tool helped, add your line to `AI_USE.md`.
- **Shared files.** P0, P1 and P4 all change `web/src/views.ts`, `PageLinks.tsx` and `App.tsx`.
  P0 adds the Home tab; P4 removes two tabs. Whoever merges second merges `main` first and fixes
  the small conflict.

---

## P0. Landing page — Developer B

**Why.** "Make it clear what we are solving, and show it through different components, almost like
selling our product but more selling our idea. Walk them through the steps of how to use it, and
have quick links for them to click and learn."

**Today.** There is no landing page. The site opens on Listen, with one line under the title.

**What to build.** A Home view at `#home`, shown when the address has no `#`. Top to bottom:

1. **Opening.** One sentence for the problem, one for the idea, one primary button "Start
   listening" (to `#listen`). Beside it, the NASA ocean picture with its two region circles and the
   credit under it. Draft words (Developer A checks them):
   - Problem: "NASA shows the Earth in pictures. If you cannot see the picture, or cannot spot the
     pattern, the data stays closed."
   - Idea: "Earth Sonata turns the patterns in NASA pictures into sound, by rules you can check."
2. **The idea in three pictures.** Reuse the drawings from How it's made: a circle on the picture,
   the line-direction ticks (`LookingAt.tsx`: lined up and swirly), and the beat drawings
   (`BeatPicture.tsx`: even and long–short). One short line under each.
3. **How to use it, in five steps.** Each step is one line with a link:
   1. Choose a NASA picture (Listen)
   2. Choose a region, or the whole picture (Listen)
   3. Press Play; open Explain to see where each note came from (Listen)
   4. Compare the two regions side by side (Compare)
   5. Test your ear (Game)
4. **Quick links.** One row: Listen, Compare, How it's made, Game, and the NASA pages of the three
   pictures (SVS 3912, 5669, 4285, from each `scene.json`).
5. **What it is and is not.** The three honesty lines (reuse `natureLine` and `describesLine` from
   `HowView.tsx` and `sources.ts`), then the credits.

**Where.** New `web/src/views/HomeView.tsx`; `web/src/views.ts` (add `home` and make it the default
for an empty address; `#listen` and the other links keep working); `PageLinks.tsx` and `icons.tsx`
(a Home tab); `App.tsx` (no picture or region choice on Home); `styles.css`.
`docs/submission/first_time_visitor.md` has wording you can reuse.

**Do not.** Play sound on load (an optional "Hear a 10-second sample" button is fine). Use stock
photos or AI images: only NASA stills (with credit) and the app's own drawings. Quote tester
numbers until they are in `docs/ACCESSIBILITY_LOG.md`.

**Checks**

- Browser test: opening the site with no `#` shows Home; "Start listening" opens Listen; every quick
  link works; no sound starts before a button is pressed.
- A shared `#listen` link still opens Listen directly.
- One `h1`, headings in order; the picture has a text description and the credit.
- At 1440 × 900 the opening fits without scrolling; at 390 px nothing scrolls sideways.

**Review.** Developer A (words and honesty), Student B (keyboard and screen reader).

---

## P1. Listen: choose a picture, then a region, then play — Developer A

**Why.** "Be clear first what the source or type of visual is. Use NASA's names. Once it is chosen,
show the regions in that visual, then the sound line, with the big visual showing. Use what Mr. E
worked on, since it is more accurate with the sound: the real sounds we added, not the old one.
This page should list all the sources we have."

**Today.** Listen plays the Earth voice: two short pulses on one note (E4) from one plain synth
(`earthVoice.ts`). The picture scan with its instruments (struck bars, choir, bass and room in
`instruments.ts`; the score in `scanScore.ts`; the player in `scanPlayer.ts`; "why this note" in
`ScanExplanation.tsx`) plays only on Play along, and only the ocean picture. The picture buttons say
"Ocean", "Aerosols", "Rain".

**What to build.** Three steps on one page, in this order, each numbered on screen.

**Step 1. Choose a NASA picture.** A list of every picture the app has (`PICTURES` in
`sources.ts`), one row each: a thumbnail, NASA's title, a short name, what kind of data it is,
how many frames, and a link to its NASA page. Titles come from each `scene.json`, never typed by hand.

| Short name | NASA title (from `scene.json`) | NASA page | Kind |
| --- | --- | --- | --- |
| Sea surface currents and temperature | Global Sea Surface Currents and Temperature | SVS 3912 | ECCO2 model output, 30 frames |
| Aerosols | GEOS Aerosols (2025) | SVS 5669 | GEOS-FP model output, one still |
| Precipitation (GPM IMERG) | Near Real-Time Global Precipitation from the Global Precipitation Measurement Constellation | SVS 4285 | Satellite estimates, 30 hourly frames |

A new picture shows up by itself when `data/<name>/scene.json` and `features.json` exist: change
`sources.ts` to find every `data/*/scene.json` instead of naming `aerosols` and `imerg`.

**Step 2. Choose what to hear.** Shown once a picture is chosen. "Whole picture" (the map sweep, a
line crossing west to east in 30 s) or one of the picture's regions by name (the radar, turning
around the circle in 15 s), for example "Region A: Kuroshio eddies east of Japan". The circles are
drawn on the picture at the same moment.

**Step 3. Play.** The player bar under the picture: Play, Pause, Stop, speed, volume, and the
scan's moving line as the "sound line". Explain opens `ScanExplanation` (#60): choose any note to
see its place, what was measured, and how that became pitch, loudness and instrument.

The picture is the biggest thing on the page, capped to the screen height (`DESIGN.md`, Layout),
with the credit under it.

**Sub-tasks, in order**

- **P1a. Measure the scan on the aerosol and rain pictures** (decision D2). Extend
  `web/measure/pictures.measure.ts`, which measures the ocean picture only, to all three: each
  picture's strongest cell (sets its full level), how many land and empty-sea cells would sound,
  and where the warm/cool switch falls on its NASA colour bar. Watch the rain picture: its land is
  a satellite photo, which has colour, so the colour rule may make land sound. Write the results
  to `docs/measurements/scan_pictures.md` and tag each setting in `scanChoices.ts` (Verified /
  Design choice / Unverified).
- **P1b. The scan follows the chosen picture.** Remove the ocean-only lock in `App.tsx`
  (`scanPicture`). `PictureScan` takes the picture's own settings from P1a and labels regions with
  the picture's letters (C and D for aerosols, E and F for rain).
- **P1c. The three-step layout.** A picture list replaces `SourceChoice.tsx`; the region step adds
  "Whole picture" to `RegionChoice`; the player bar drives the scan player.
- **P1d. Words.** `PRODUCT.md`, `docs/mapping_spec.md` and the honesty lines say that Listen plays
  the picture scan (decision D1).

**Checks**

- Unit tests: each picture's scan uses its own full level; the picture list has one row per `scene.json`.
- `npm run measure` reports all three pictures.
- Browser test, for each picture: choose it, its regions appear, press Play, and notes for that
  picture appear in `window.__scanNotes`; Stop and Esc silence them. Choosing another picture stops the sound.
- Keyboard: Tab goes step 1, step 2, Play. A screen reader hears "Step 2 of 3: choose what to hear".
- No sound before Play.

**Review.** Developer B (app and audio code), Student A (picture and region facts).

---

## P2. Compare: a layout that shows the difference — Developer B

**Why.** "It is hard to see how they are comparing. Make the page clear and the comparison easy.
The layout is the issue; try a different layout."

**Today.** Two close-ups side by side, each with a giant letter, its number and a "Listen to Region"
button; below them, the table and the two curves over time. The difference between the two regions
is never said in words, the matching facts are not on the same line, and the curves are a scroll away.

**What to build.** A mirrored layout: Region A on the left, Region B on the right, the row name in
the middle, so the eye goes straight across. Top to bottom:

1. **One sentence that says the difference**, built from the numbers at the same moment:
   "Region B's streaks are more lined up (0.67) than Region A's (0.08), so B's pulse is more even."
   If a region is missing at that moment, the sentence says so.
2. **One shared scale** from 0 (swirly) to 1 (lined up), with the A and B letters placed on it. The
   gap between the letters is the difference.
3. **Matching rows:** close-up | line directions | alignment | one beat (`BeatPicture`) | hear.
   Each row is the same height on both sides.
4. **Three listen buttons:** "Hear A", "Hear B" and "A then B" (one loop of each, back to back),
   because comparing by ear means hearing them one after the other.
5. **Over time:** one chart with both regions' alignment on the same axes (the existing curves),
   the current moment marked. Choosing a moment on the chart updates rows 1 to 3.

On phones (below 1024 px) keep A and B side by side, narrower, with each row's name above it.

**Where.** `web/src/views/CompareView.tsx`, `RegionCloseups.tsx`, `RhythmsPlot.tsx`, `compare.ts`
(the sentence: a pure function with a unit test), `styles.css`. Compare keeps playing the Earth
rhythm (decision D1): it is the sound the alignment numbers drive.

**Do not.** Compare two pictures. Use colour alone (letters on everything). Draw a missing frame as 0
(the curve breaks).

**Checks**

- Unit test: the sentence's numbers equal `features.json` for that moment, and a missing step gives
  the "missing" sentence.
- Browser test: the sentence, the scale and the rows show the same numbers; "A then B" plays A's
  notes, then B's (`window.__earthNotes`).
- At 1440 × 900, rows 1 to 4 fit without scrolling; at 390 px nothing scrolls sideways.
- A screen reader reads a row as "Alignment: A 0.08, B 0.67".

**Review.** Developer A (the sentence and the numbers), Student B (accessibility).

---

## P3. How it's made: the methods — Developer A

**Why.** "Make this page more abstract and use the methods, theorems, math, algorithms, and any
learning models the app needs to get its calculations."

**Today.** Three pictures with a few words each, the rule in one line, the honesty lines and the
credits (`HowView.tsx`).

**One fact to state on the page.** No learning model is used anywhere: nothing is trained, and there
are no model weights. Every number comes from a formula that is written down and tested, so the same
picture always gives the same sound. Say this plainly as a strength; do not add a machine-learning
section that suggests one is used.

**What to build.** Two pipelines drawn as simple flow diagrams (inline SVG, hairlines). Each stage
opens to show, in this order: one plain sentence, the method, the formula, the property or theorem
it rests on, and how it was checked (with its tag and a link to the test or measurement). Source for
every number: `docs/math_notes.md`, `docs/mapping_spec.md`, `scanChoices.ts`, `instruments.ts`.

Pipeline 1, the Earth rhythm (alignment):

1. Picture and mask: the circle; land, legend and edges left out (`math_notes.md` §7).
2. Brightness changes: Sobel filters approximate the derivatives ∂I/∂x and ∂I/∂y (§2–3).
3. Structure tensor J, built from the gradients, and its eigenvalues λ₁ ≥ λ₂ (§4). J is symmetric
   and positive semi-definite, so both eigenvalues are real and not negative.
4. Alignment C = (λ₁ − λ₂) / (λ₁ + λ₂), which equals a doubled-angle vote |Σ m² e^{2iφ}| / Σ m²
   (§5). Between 0 and 1; unchanged by rotation or contrast. Show the table of predictions against
   measurements, and the chance level: n lines at random score about 0.886/√n, not 0.
5. Too little information is not low alignment: missing steps stay silent (§6).
6. The rule: the second pulse lands at 0.75 − 0.25 × alignment of the beat (a design choice).

Pipeline 2, the picture scan:

1. The grid: 240 columns × 12 bands for the map sweep (30 s), 120 × 12 cells for the radar (15 s).
2. Colour strength of a pixel: (largest channel − smallest channel) / 255; a cell's mean, against
   its full level.
3. Which cells chime, and their pitch (a band's place in C major pentatonic), loudness (colour
   strength) and instrument (warm or cool colour).
4. The instruments: struck bars whose overtones come from the beam equations (cos x cosh x = 1 for
   a free bar, −1 for a clamped one); the choir, bass and chord changes, which are decoration and
   carry no data.

Then **How we check it**: the unit tests (counts taken from a real test run), the measurements in
`docs/measurements/`, and the listening game (right answers against 50 % chance, only results from
`docs/ACCESSIBILITY_LOG.md`; if there are none yet, say "not run yet"). Keep the honesty lines and
the credits.

Write the formulas in MathML (built into current browsers, no new library), each with a plain-words
line that a screen reader can read.

**Checks**

- A unit test reads the constants shown on the page from the code (as `RULE_TEXT` does), so the page
  cannot disagree with the sound.
- Every claim carries its tag (Verified / Design choice / Unverified).
- A student reads the page and retells each stage in one sentence; anything they cannot retell is rewritten.
- Keyboard: every stage opens and closes; a screen reader reads each formula's plain-words line.

**Review.** Developer B (layout and code), Student A or Student B (the beginner read).

---

## P4. Play along and Globe move into Listen — Developer A

**Why.** "Play along should be with the Listen page, all together, and the Globe."

**Today.** Play along (`PlayView.tsx`) has the picture scan, the melody keys, an Earth rhythm player
and the game card. Globe (`GlobeView.tsx`) has the picture on a globe with its own region buttons.
Both are separate tabs. Starts after P1 is merged.

**What to build**

1. **Map | Globe** on Listen's big picture: the same picture, the same regions, the same chosen
   region. The globe code loads only when Globe is chosen (as `GlobeTab` does now). Playing a region
   from the globe plays the same Listen sound.
2. **A Play along panel** under the player bar, closed until opened: the melody keys (`MelodyPad`),
   their instrument and volume, and a switch "Add the Earth rhythm" (decision D1).
3. **Remove the Play along and Globe tabs** (`views.ts`, `PageLinks.tsx`, `icons.tsx`). `#play`
   opens Listen with the Play along panel open; `#globe` opens Listen showing the globe.
4. **The game card** (`PracticeGame.tsx`) leaves; the Game tab and Home link to the game.
5. **One Stop.** Stop and Esc silence the scan, the Earth rhythm and the melody (`stop()` in `App.tsx` already does this).
6. **Update the browser tests** that open these pages: `helpers.ts`, `melody`, `scan`, `scan-why`,
   `views`, `pages`, `skim` and `visuals` in `web/e2e/`.

**Checks**

- Old `#play` and `#globe` links open Listen with the right panel.
- The melody keys work on Listen, and their keys do not clash with others (1 and 2 work only on the region choice, as now).
- The globe's code is not downloaded until Globe is chosen (a browser test watches the network).
- No sound before a press; one Stop silences everything.
- At 1440 × 900 the picture and the player bar fit; on phones the panel opens below the player.

**Review.** Developer B.

---

## P5. Game: fewer buttons, less text — Developer B

**Why.** "Make it more simple, with fewer buttons and less text."

**Today.** `tools/listening_game.html` (Student B's page) shows 10 buttons (New round, Replay, Stop,
two theme buttons, Reset score, Hear patch 1 and 2, Patch 1 and 2 made it) and 10 more controls
(speed, volume, rounds, and seven switches: groove lock, musical, keep music, show notes, show lines,
rhythm only, stretch timing), plus the score, a time-line plot and a "How the rhythm is made" section.

**What to build.** One round is three moments, each with one main action:

1. **"Play the mystery sound"**, one big button.
2. **Two pictures; choose the one that made it.** The pictures are the answer buttons. A small play
   icon on each picture plays what that patch sounds like.
3. **Right or wrong in one line, then "Next round".** The score sits in a corner ("3 of 5").

Everything else goes behind one **Settings** button (speed, volume, rounds, the seven switches,
theme, reset score). The time-line plot and the explanation go behind a "How it works" link shown
after an answer. On the main screen: a title of six words or fewer, one line of instructions, no paragraphs.

**Do not.** Change what is scored, which pairs are left out, or how a rhythm sounds. If Student B is
running test sessions, keep the switches' default settings, or log the change and its date in
`docs/ACCESSIBILITY_LOG.md`, so results stay comparable. Every key that works today keeps working.

**Checks**

- During a round, at most four controls are visible (Play, the two pictures, Settings). Count them
  and the words on screen, before and after, and put both counts in the pull request.
- The same answers give the same score as before: play five rounds by hand on both versions with
  the same answers. The pair builder is not touched (`python -m unittest discover tools` still passes).
- A full round works by keyboard alone; a screen reader announces right or wrong.
- The game still reads the shared theme (`es-theme`) and still has a way back to the app.

**Review.** Student B (owner of the game), Developer A (scoring and honesty).

---

## Order

- **Now, in parallel:** P1a, P3 (Developer A); P0, P2, P5 (Developer B). They touch different files,
  apart from the tab list.
- **After P1a:** P1b to P1d (Developer A).
- **After P1 is merged:** P4 (Developer A), which removes the last two old tabs.
