# Earth Sonata: four-page redesign

Date: 15 Nov 2026. Owner: Dev B. Design rules: `DESIGN.md` ("Tide Table", Student B, PR #34).
Planning page with every content item, owner and status: https://claude.ai/artifact/TZGxEyNyVZqEEzKZJ77mpa

## Why

The challenge asks for a jukebox where people *select a NASA EIC visualization and experience it
with its soundscape*, with sound that balances data with music, and an explanation of the creative
process. Today the app is one long page with 17 sections. The same number appears in four places,
the honesty lines three times, and team names and file names leak onto the screen. Visitors press
Start before anything tells them what to listen for. The team (meeting 15 Nov) wants the purpose to
be clear at a glance: **more buttons, less text, and every visual explains itself.**

## Goals

1. Four views in one app: **Listen** (home), **Compare**, **How it's made**, **Play along**.
2. Listen holds only: title and one line (item 1), play buttons (2), region choice (3), sound
   settings (4), the NASA picture (5), the beat timeline (8) and Explain (10). Also kept there: the
   spoken status line (6), the missing-data warning (9) and the practice banner (17).
3. A **source choice** (Ocean / Aerosols) makes it a jukebox: pick a picture, pick a region, hear it.
4. Compare shows why the two regions differ: close-ups, weighted numerals, tide table, tide curves.
5. How it's made tells picture → ticks → pulses in pictures, with the rule, honesty lines and credit.
6. Play along: the Earth rhythm with your melody on top, the game card and the globe.
7. Everything still works by keyboard and screen reader, as it does today.

## Non-goals (this round)

- The listening game's own redesign (the Tide Table look for it rides on #21/#34).
- "Make it music" (N3) inside the app. It waits for the listening test and Mr. E's AI-music answer.
  Play along leaves room for it.
- Hearing *any* spot on the globe. That needs Dev A's alignment map (N5). Until then the globe in
  Play along shows the picture and plays the approved regions only.
- The extra Play along feature (N4). Not named yet; no slot is built.
- Changing the sound rule, the measurements or the data files.

## Anti-goals (a failure even if it works)

- Showing or wording an aerosol number next to an ocean number, or any sentence comparing them
  (Dev A, 15 Nov).
- A region told apart by colour alone. Sound before a button press. A paragraph where a picture would do.
- Missing data drawn or said as zero.
- A new routing or UI library.

## Constraints

- PRODUCT.md: NASA credit directly under every picture; the three honesty lines (model, not a photo;
  the rule is our choice; describes the picture, not the ocean or air); practice data labelled.
- The aerosol picture (SVS 5669) is a **challenge resource, not EIC data**, and is credited to
  NASA's GMAO and SVS. Say it that way wherever it is named.
- Static site on GitHub Pages (`base: './'`), no server. Works offline once loaded.
- Builds on PR #34's Tide Table restyle. Its app part has to be on `main` before the page work
  starts (Student B is moving it; see "Order of work").
- Deadline: Sunday 15 Nov, 11:59 PM. The final video records whatever is merged when Dev B records.

## Approaches considered

| | Approach | Trade-off | Verdict |
|---|---|---|---|
| A | One app, four views switched by the URL hash (`#listen`, `#compare`, `#how`, `#play`) | No reload, data loaded once, back button and shared links work, no new dependency | **Chosen**, with the sound stopping on every view change (Dev B's choice) |
| B | Four separate HTML pages, like `globe.html` | Simplest to picture; every change reloads and each page sets up the player again | Not chosen |
| C | A routing library (React Router) | Same result as A plus a dependency to learn and license-check on deadline day | Not chosen |

## Decided

### Views and navigation

- The hash picks the view. No hash or an unknown hash shows Listen. Links are real `<a href="#compare">`.
- **Changing view stops all sound**, exactly like Stop: the Earth voice stops and held melody notes
  are released. Region, source, speed and volume are kept.
- On a view change, focus moves to the view's heading, which is announced, and `document.title`
  becomes "<View> · Earth Sonata". Scroll goes to the top.
- **Page links sit in the rail under the title, on every view.** The current view's link is marked
  with `aria-current="page"`, shown with weight and the signal underline. Tab order on Listen:
  page links, then Start. This replaces DESIGN.md's "Start is the first Tab stop".
- The theme switch from #34 stays at the bottom of the rail on every view.

### Sources (Ocean / Aerosols)

- Two sources. **Ocean currents** is SVS 3912, `data/` (30 frames, regions A and B). **Aerosols** is
  SVS 5669, `data/aerosols/` (one still, regions C and D). Practice mode (`VITE_DATASET=practice`)
  has only the practice source and shows no source choice.
- One shared module loads the sources, used by the app and the globe. It replaces the globe's
  `sources.ts` and extends `dataset.ts`. Each source owns its scene, features, picture, credit,
  letters and region style.
- Region letters come from the source: ocean A, B; aerosols C, D.
- Region style comes from the source: ocean regions are violet and rose (DESIGN.md); **aerosol
  regions are neutral ink-and-white rings and badges with their letters.**
- **No cross-source comparison, enforced in code.** Every comparison (the Explain comparison line,
  the tide table, the curves, the close-ups) takes one source and only pairs regions within it. A
  unit test proves no comparison can receive regions from two sources.
- The source choice is a pair of picture buttons (a small thumbnail of each picture plus a one-word
  label: "Ocean", "Aerosols") in the rail on **Listen and Compare**. Switching source stops the
  sound and selects that source's first region. The chosen source is kept across views.
- A one-frame source plays one beat, repeated as a steady rhythm. This already works: the track
  is one beat long and the player loops it. Its date shows once, with "one moment".

### Listen (home)

- Rail: title and one line (Student B writes the line, at most 10 words), page links, source choice,
  play buttons, region choice, sound settings, theme switch.
- **Play buttons are icon buttons with a one-word label under the icon:** ▶ Play / ❚❚ Pause,
  ■ Stop, ↺ Replay, ? Explain. The visible word is the accessible name. Esc still stops from anywhere.
- **Region choice:** a round thumbnail of each region's real circle, cropped from the picture, with
  its letter badge and short name. It stays a radio group (arrow keys, 1/2 while focused).
- **Clicking a circle on the picture selects that region.** Keyboard users use the region choice; the
  circles are not extra Tab stops.
- **Sound settings** are behind one "Sound" icon button that shows and hides the speed buttons
  (½× ¾× 1× 1¼×) and a volume slider with a speaker icon. No dB numbers are shown.
- Main column: the picture in the chart frame (credit under it), the status line, the beat timeline.
  The timeline's hint paragraph becomes a two-mark legend. The **model date sits under each beat**,
  with the current one marked while playing (N2). Aerosols show a single date.
- **Explain** opens a panel under the timeline. This round it shows today's sentence, trimmed: the
  pulse sentence and the comparison with the other region of the same source. The formula moves to
  How it's made, and the repeated disclaimer is removed. Student B's picture version (item 10)
  replaces the panel's content when it is ready, with no other change.
- The "What you are looking at" section, the close-ups, the rhythm plot, the practice section, the
  melody pad and the footer leave Listen.

### Compare

- Rail: title, page links, source choice, theme switch.
- Main: for each region of the chosen source, side by side: the enlarged close-up with direction
  ticks, the giant weighted numeral (DESIGN.md "Weight Is the Value"), the alignment value, and a
  ▶ button that plays that region from this view.
- Below: #34's tide table and tide curves for the chosen source. A one-frame source draws **one dot
  per region labelled "one moment"**, no line.
- No paragraphs. The close-up note about "Dev A's measurement (features.json)" goes.

### How it's made

- Static content, in order:
  1. A strip of three pictures: picture with a circle → ticks → pulses. Student B supplies the
     pictures and captions (N1); until then it uses today's tick key and close-up crops with
     one-line captions.
  2. The rule in one line, with the formula.
  3. The three honesty lines, one short line each.
  4. Sources and credits: SVS 3912 (EIC) and SVS 5669 (challenge resource), each with its credit,
     data kind and limitations.

### Play along

- Its own Earth rhythm control (▶ / ■) for the chosen source and region, so the melody plays over it.
- The melody pad (item 15), drawn as key caps with their letters; behaviour unchanged.
- The listening game card (item 14): the "?" patch art and a "Play the game" button. No quiz link.
- **The globe (item 18), loaded only when this view opens.** It shows the chosen source's picture on
  the globe, with buttons for its approved regions. Choosing one plays it with the same rule. The
  team-only parts (JSON panel, "copy for Dev A", sliders) stay in `globe.html`, which is unchanged
  and unlinked.

### Icon button component

- Added to DESIGN.md (drafted by Dev B, reviewed by Student B): a 16–20px line icon in `currentColor`
  above a one-word label, 48px minimum height, the same border, hover, pressed and focus states as
  DESIGN.md buttons. Icons are inline SVG in the codebase; no icon font or library.

### DESIGN.md additions (Dev B drafts, Student B reviews)

Icon button; page links in the rail and the new Tab-order rule; neutral C/D rings and the Off-Scale
Rule applied to each picture's own colours; the one-moment dot in the tide curves; a short layout
section for each of the four views.

### Tests

- Unit: view from hash (unknown → Listen); source letters and styles; **no comparison across
  sources**; a one-frame track loops one beat; the date under each beat comes from `source_time`.
- Browser (update the 26 existing tests to the new layout, keeping what each one proves):
  - Earth tests run on `#listen`; the melody tests run on `#play`.
  - The visuals tests move to the view that now shows each thing.
  - "First Tab reaches Start" becomes "page links, then Start".
- Browser (new): page links switch views and change the URL; a view change stops the sound; Esc
  still stops everywhere; Aerosols shows C and D with neutral styling and no ocean numbers; Compare
  shows the tide table for the chosen source only.

## Order of work

0. **Blocking:** Student B moves #34's app part to `main` (steps already sent).
1. DESIGN.md additions PR (Dev B; Student B reviews). It can start now.
2. Shared sources module, letters, styles, the no-cross-comparison test (Dev B).
3. View shell: hash views, page links, stop on view change, focus and title (Dev B).
4. Listen. 5. Compare. 6. How it's made. 7. Play along with the lazy globe (Dev B).
8. Browser tests updated and added (Dev B).
9. Student B's content drops in when ready (Explain picture, N1 strip, title line, numerals, game
   card, credit lines); then Student B runs the five-second check (N6).

Each step is its own small PR with tests, so a partial result can still ship before the deadline.

## Left to the builder

File and component names, exact icon drawings, CSS within DESIGN.md's tokens, how the thumbnails are
cropped (canvas or CSS), and how the lazy globe is split out.
