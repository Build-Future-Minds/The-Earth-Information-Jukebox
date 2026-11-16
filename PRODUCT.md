# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML/CSS/JS for the listening game while it is being designed (one self-contained page,
served locally with `python -m http.server`). It moves into Developer B's React + Vite + TypeScript
app (`web/`, Tone.js) during integration. The team app's stack is Developer B's.

## Users

Primary user of the listening game: the testers Student B sits with during evaluation sessions
(teammates and, ideally, people outside the team, including blind or low-vision people). Their job
is to listen to one rhythm and say which of two image patches produced it, so the team learns
whether the rhythm difference can actually be heard. Results are recorded in
`docs/ACCESSIBILITY_LOG.md`.

Wider product audience (Earth Sonata app): visitors and NASA Space Apps judges comparing two regions
of a NASA ocean visualization by ear.

## Product Purpose

Earth Sonata: Play the Planet makes NASA Earth imagery explorable through sound. A visitor compares
two regions of one NASA ocean visualization by hearing a rhythm, then understands which image
pattern produced it. The listening game checks the core claim: can people tell the regions apart by
ear? Success is an honest count of right answers against 50 % chance.

## Positioning

One explainable rule links a measured image property to one sound property: how strongly visible
lines share a direction (alignment, 0–1) sets the spacing of two pulses per beat
(second pulse at `0.75 − 0.25 × alignment` of the beat). Every sound can explain itself from the
numbers that made it.

## Operating Context

- NASA Space Apps Challenge 2026, challenge "The Earth Information Jukebox". Deadline Sunday
  15 Nov 2026, 11:59 PM local; team target earlier.
- Source: NASA SVS 3912, Global Sea Surface Currents and Temperature, ECCO2 model output
  (2007-03-25 to 2008-03-03). Frames live in `assets/frames/` and are not committed.
- Image measurement is done ahead of time; sound is synthesized live in the browser.
  In the practice game the measurement runs in the browser and is labelled as practice.
- Sessions are run in person by Student B; the game must also work without a mouse.

## Capabilities and Constraints

- Two-choice question: hear one rhythm, pick which of two patches made it. Rounds are random.
- Pairs that are tied, too close to hear, or missing are left out of scored questions.
- Missing information is never turned into a rhythm or treated as alignment 0.
- In the team's rule, pitch, loudness and tempo carry no data; only pulse spacing does. The
  listening game (Student B's choice, after testing showed spacing alone was too hard to hear) also
  maps alignment to pitch and to note length (lined-up patches hold their notes so the sound keeps
  going), always on and labelled as the game's choice. It becomes part of the
  team's rule only if Developer A changes `docs/mapping_spec.md`.
- No sound before the user presses a control; Stop silences everything.
- Undecided: final alignment end points and minimum audible difference (Developer A).

## Brand Commitments

- Name: "Earth Sonata: Play the Planet". No logo or required colours.
- Credit, visible wherever the image appears: "NASA/Goddard Space Flight Center Scientific
  Visualization Studio". The NASA logo is never used.
- Three honesty lines in public material, word for word (one constant in the app,
  `web/src/data/honesty.ts`; How it's made links each line to the section that backs it):
  1. "It is a visualization of computer model output or satellite estimates, not a photo."
  2. "The rules that turn it into sound are choices we made."
  3. "It describes the drawn picture, not water speed, turbulence, air quality or rain amounts."
- No images, music or video produced by a generative AI model in the product or demo. Sound is
  synthesised by our own code; AI help with that code is listed in `AI_USE.md`.

## Evidence on Hand

- NASA still `flat_global_ecco2_2028x1024.25000.jpg` (model time 2007-06-19T12:00Z), colour bar
  `sst_ecco2_cbar.png`, and `flat_ecco2_dates.txt` in `assets/frames/svs3912/`.
- Practice data: `fixtures/mock/` (synthetic, labelled MOCK).
- Practice measurement on the real frame: most ocean patches score about 0.15–0.60 alignment.
- No tester results yet. Never invent counts, testimonials or accessibility claims.

## Product Principles

1. Honest before impressive: show only what works and label practice data as practice.
2. The sound explains itself: every rhythm can be traced to the numbers that made it.
3. Keyboard and screen reader first: every action has a labelled control and a key.
4. Fair comparison: both patches use the same settings at the same source moment.
5. Privacy: no names, faces or voices of student team members or testers.

## Accessibility & Inclusion

Must work fully by keyboard with visible focus and clear labels, and with a screen reader
(announce control names, states and results). Meaning is never carried by colour or stereo
position alone. Respect reduced motion. The team does not claim WCAG conformance; only real test
results are reported.
