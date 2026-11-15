# New tasks from the 14 Nov brainstorm: how to do each one

Owner of this page: Developer A (Mr. E). Written 14 Nov, 2:30 PM. Updated 15 Nov, 12:30 AM:
N1 is mostly delivered by #17; N2 and N3 moved to "only if time remains"; N3 is renamed
"melody pulse lock"; the pattern is called "long–short" (#27).

Each task below is also on the Earth Sonata Tracker. The tracker says who and when. This page
says how. Numbers marked **measured** were run on 14 Nov on the 30 NASA frames (23000 to 23116)
or on test images, with the engine's default settings.

| # | Task | Owner | When |
| --- | --- | --- | --- |
| N1 | Visual beat bar | Developer B | Mostly done in #17; review it |
| N2 | Play both regions at once | Developer B | Only if time remains |
| N3 | Melody pulse lock | Developer B | Only if time remains |
| N4 | Resource list and NASA data links | Student C | Now |
| L1 | Give the first pulse its own fixed sound | Developer B | Only if time remains |
| L2 | Graded listening pairs | Student B | Only if time remains |
| L3 | Say the rhythm as a ratio | Student B | Only if time remains |
| L4 | Slide: the map stretch raised a score and we caught it | Student A | Only if time remains |
| L5 | Travelling circle: measure seven stops | Student A | Only if time remains |
| L6 | Travelling circle: file format and playback | Developer B | Next version |
| L7 | Undo the map stretch with a tested method | Developer A | Before any slide quotes the number |
| L8 | Fourth-harmonic score | Developer B | Next version |
| L9 | A full model year | Student A | Next version |

## Rules for every task

- One short branch per task (`role/short-task`), a pull request, one teammate reviews. `main` always runs.
- Feature freeze is Sunday 2:00 PM. Anything not reviewed and merged by then waits.
- Roles, not names, in files, commits and screenshots.
- Made-up data says `MOCK` or `TEST INPUT` in its file name or first line.
- Write only results you measured. If a check was not run, write "not run".
- If an AI tool helped, add your line to `AI_USE.md`.
- The app's core is the two-region comparison and the explanation. If a task here breaks either one, stop and tell Developer A.

---

## N1. Visual beat bar — Developer B

**Why.** The rhythm is the result, and today it exists only as sound and one sentence. A person
who cannot hear the pulses gets "second pulse at 73% of the beat" and nothing to look at.

**Status 15 Nov.** Mostly delivered by #17 (merged 14 Nov, 2:46 PM, not yet reviewed), in a
different shape: `BeatTrack.tsx` is a beat lane on the audio clock (first pulse a tall ink mark,
second pulse a short orange one, seekable by drag or arrow keys), and `RhythmsPlot.tsx` draws
both regions on one time line with missing beats dashed. No separate one-beat bar is needed.
Use the steps and checks below to review #17. Gaps found so far: the playhead still moves under
reduced motion (`styles.css` only switches off CSS transitions), and no screen-reader check.

**Where.** `web/src/components/BeatTrack.tsx`, `RhythmsPlot.tsx` and `NowPlaying.tsx` on `main`.

**Steps**

1. Draw one horizontal line for one beat. Put a tick at 0% (first pulse) and a tick at
   `long_fraction × 100`% (second pulse). Compute the positions in a pure function so it can be tested.
2. Add a second row for the other region at the same moment. `App.tsx` already finds that step
   for the comparison line (`stepAtSameMoment`). On the real data the two rows show about 58% and 73%.
3. Add a marker that moves across the bar during the beat. `Transport.onStep` already fires when
   the beat really starts sounding, so restart a CSS animation on each step. Its length is
   `step.dur / speed` seconds. `transport.ts` does not need to change.
4. A `missing` step shows no ticks and the words "missing information". Never draw a rhythm that was not measured.
5. With `prefers-reduced-motion: reduce`, hide the moving marker and keep the ticks. Nothing flashes.
   Ticks need 3:1 contrast against the background.

**Checks**

- Unit test: `long_fraction` 0.5 gives a tick at 50%. A missing step gives no ticks.
- Unit test on `data/features.json`, first frame: 73% for Kuroshio and 58% for Equatorial Pacific, the same numbers the explanation prints.
- Browser test: the tick position equals `longFraction` in `window.__earthNotes` for the region playing.
- By hand at 0.5× and 1.25×: the marker reaches the right end as the next beat starts. Paused and Stopped leave no moving marker.

**Review.** Student B (accessibility log), then Developer A for the words.

---

## N2. Play both regions at once — Developer B (only if time remains)

**Status 15 Nov.** Not started; moved to "only if time remains". Student B's listening game
already layers two sounds on a shared beat (#16), which shows the timing works. The app version
below is still open.

**Why.** Today a listener hears one region, switches, and has to remember the first rhythm. With
both playing, the two second pulses land about 150 ms apart (**measured**: 142 ms at the least) and
the difference is heard directly.

**Design. These are fixed choices and carry no data.**

- A third choice in the Region group: "Both", with key 3.
- Each beat has one shared first pulse, then Region A's second pulse and Region B's second pulse.
- The two second pulses need a fixed difference in sound so a listener knows which is which, for
  example a fixed pitch for each region. Do not rely on left and right speakers alone: some people
  listen with one ear or one speaker.
- That difference is a label for the region. Say so in the explanation, and add it to
  `docs/DECISIONS.md` as a new decision.

**Steps**

1. In `web/src/audio/earthVoice.ts` add a pure function, for example `buildBothTrack(features, regionIds)`.
   For each step it returns the first pulse at `t`, then one second pulse per region at
   `t + long_fraction × beat`. Each note keeps its own `why` (region, alignment, long_fraction, rule).
2. Leave `buildEarthTrack` exactly as it is. `rhythmReference.test.ts` uses it to prove the app
   plays what the engine computed.
3. Missing information: if one region's step is `missing`, play only the other region's two
   pulses and say which region is quiet. If both are missing, play nothing.
4. Explanation in Both mode: one sentence per region, then the comparison line that already exists.
   When the two alignments differ by less than `SAME_BELOW` (0.20), keep the words "about as even as".
5. Switching to or from "Both" keeps the playback position, like every other region switch (decision D1).

**Checks**

- Unit test on `data/features.json`: every `ok` step has three notes, at about 0 s, 0.58 s and 0.73 s into the beat.
- Unit tests for one region missing and both missing.
- `npm test` still passes `rhythmReference.test.ts` unchanged.
- Browser test: in Both mode `window.__earthNotes` has three notes per beat, and the two second pulses are `|lfA − lfB| × beat / speed` apart within a few milliseconds.
- Listening, eyes closed: can you say which second pulse belongs to which region? Write down the answer, yes or no.

**Say this limit.** With both playing, a beat has three pulses. "Long–short" describes each
region's own pair, not the mix.

**Review.** Developer A (wording and the new decision), Student B (keyboard and screen reader).

---

## N3. Melody pulse lock — Developer B (only if time remains)

Called "groove lock" until 15 Nov. On this team "groove lock" now means the listening game's
switch (#16), where a second sound joins on the beat of the first. This task is different.

**What it is.** A switch on the melody pad, off by default.

- Off: the melody plays the moment you press, as today.
- On: every melody note you are holding is struck again on each Earth pulse. Your melody takes
  the rhythm of the region that is playing, so the same held notes groove differently on Region A and Region B.

**The rule that must stay true** (`docs/CONTRACT.md`): the melody never changes an Earth note.
The pulse lock only reads the times of the Earth pulses.

**Steps**

1. `web/src/audio/transport.ts`: in the Part callback, where an Earth note is triggered with its
   exact audio `time`, also call an optional listener, for example `onPulse(time)`.
2. `web/src/audio/userVoice.ts`: add `setLock(on)` and `strike(time)`. With the lock on, a press
   still sounds at once, as a short note, so the key responds immediately. Then `strike(time)`
   plays every held note again as a short note at that exact `time`.
3. `App.tsx`: connect `onPulse` to `strike`. `MelodyPad.tsx`: a real checkbox, "Lock melody to
   the Earth pulse", reachable by keyboard.
4. Decide these and write them in the pad's help text:
   - Earth stopped, paused or `missing`: there are no pulses, so held notes are not struck again.
   - In Both mode (N2): strike on every Earth pulse that sounds.
5. Stop and Esc still silence everything, including strikes already queued. Tone queues sound
   about 0.1 s ahead, so cancel them the way `silencePending` does for the Earth voice.
6. Optional: a latch, so one tap keeps a note held until it is tapped again. Only if Developer A asks for it.

**Checks**

- Lock off: every existing test in `userVoice.test.ts` passes unchanged.
- Unit tests with the lock on: two held notes and a pulse at time T give two strikes at T. A released note is not struck. `allOff` stops the strikes.
- Browser test (`web/e2e/melody.e2e.ts`): `window.__earthNotes` is identical with the lock on and with it off. This is the proof that the Earth rhythm did not change.
- By hand: hold one key and switch between Region A and Region B. The melody's rhythm changes with the Earth's.

**Review.** Developer A. Confirm the meaning with Developer A before you build it.

---

## N4. Resource list and NASA data links — Student C

**Why.** The submission form asks for the NASA data we used and for every outside source. Our
links are spread over many files. One checked list means nothing is left out on Sunday.

**What you make.** One new file, `docs/submission/resources.md`. Student A owns the final
"NASA data" and "References" sections and will copy from your list, so tell Student A when it is ready.

**Steps**

1. Set your git name to `Student C` with a GitHub no-reply email. Make a branch: `sc/resource-list`.
2. List every link in the repo. From the repository folder, in Git Bash:

   ```
   git grep -ohE "https?://[^ )>\"'\`]+" -- . ':!web/package-lock.json' | sed 's/[.,;:]*$//' | sort -u
   ```

   On 14 Nov this printed 58 links.
3. Read these files first. They hold most of the real sources:
   `assets/source_manifest.json`, `docs/submission/student_a_worksheet.md` (parts 1 to 3),
   `docs/DECISIONS.md` ("Sources"), `docs/math_notes.md` ("References"), `tools/README.md`, `README.md`.
4. Make one table with these columns:

   | Name | Link | Kind | What we used it for | Where in our repo | Opened signed out on |
   | --- | --- | --- | --- | --- | --- |

   Kind is one of: NASA data, NASA page, paper, software, rules. Put the NASA data rows first.
5. Open each link in a private browser window. Write the date in the last column. If a link does
   not open, or you did not try it, write `NOT CHECKED YET`. Do not guess.
6. For NASA data, also write the exact credit line: `NASA/Goddard Space Flight Center Scientific Visualization Studio`.
   Our main source is SVS 3912, <https://svs.gsfc.nasa.gov/3912>. It is a picture of ECCO2 **model
   output**, not an observation. Use those words.
7. Leave out links that are only in test files or tool settings and are not a source. If you are
   not sure, keep the row and write "not sure" in the "what we used it for" column.

**Checks**

- Every link from step 2 is either in the table or on a short "left out, and why" list under it.
- No student names anywhere in the file.
- A second person opens five rows at random and they all work.

**Review.** Student A, then Developer A.

---

## L1. Give the first pulse its own fixed sound — Developer B

**Why.** Both pulses are the same sound (`EARTH_PITCH` 64, `EARTH_VELOCITY` 0.8, 0.08 s) and the
beats repeat with no pause, so nothing tells the ear which pulse starts the beat. The rule plays
the long gap first, but a listener can just as well hear the two close pulses as a pair, short
then long. **Unverified:** this is our reasoning, and nobody has tested it by listening.

**This changes a fixed setting of the sound rule, so Developer A must say yes first.** The
listening check uses the current sound. Results taken before a change do not carry over.

**Steps**

1. Agree one fixed difference with Developer A, for example a quieter second pulse. It is the
   same in both regions and carries no data.
2. Engine: `analysis/sonata_math/rhythm.py` (`RhythmParams`, `events_for_step`) and
   `rhythm_reference_document` in `export.py`. The check file has one `pitch` and one `vel` today,
   so `contracts/rhythm-reference.schema.json` changes. Follow "Changing the contract" in `CONTRIBUTING.md`.
3. App: `stepToEvents` in `web/src/audio/earthVoice.ts`.
4. Write the check files again with the command in `docs/science_review.md` section 10. Run
   `pytest` in `analysis/` and `npm test` in `web/`. The reference test compares pitch and loudness for every note.
5. Student B gives `tools/listening_quiz_player.html` the same sound.
6. `docs/mapping_spec.md`: add one sentence about the fixed accent.

**Check.** Play ten beats with eyes closed, before and after. Can you tap the start of each beat?

---

## L2. Graded listening pairs — Student B

**Why.** The main listening check tests one large gap (0.60 in alignment, about 150 ms). It does
not tell us how small a gap people can still hear. The "about as even as" cut-off of 0.20 is a
design choice with no listening evidence yet.

**Steps**

1. Save this as `tools/make_graded_pairs.py`. It was run on 14 Nov and wrote 60 steps.

   ```python
   """TEST INPUT (MOCK): pairs of made-up alignments at three gap sizes, for the graded listening check."""
   import json, sys

   GAPS = [0.30, 0.20, 0.10]   # alignment gaps to test: 75, 50 and 25 ms at a 1-second beat
   PER_GAP = 10                # questions per gap
   CENTRE = 0.37               # halfway between the real pair (0.07 and 0.67)

   steps = []
   for frame in range(len(GAPS) * PER_GAP):
       gap = GAPS[frame % len(GAPS)]          # mix the gap sizes instead of playing them in blocks
       for region, alignment in (("test_low", CENTRE - gap / 2), ("test_high", CENTRE + gap / 2)):
           steps.append({"t": float(frame), "frame": frame, "source_time": None, "region": region,
                         "status": "ok", "alignment": round(alignment, 3), "reason": None})

   document = {"schema_version": "0.2", "is_mock": True, "scene": "MOCK graded pairs, not NASA data",
               "step_seconds": 1.0,
               "normalisation": {"gradient_threshold": 12.0, "min_usable_fraction": 0.05, "smoothing_alpha": 1.0},
               "steps": steps}
   with open(sys.argv[1], "w", encoding="utf-8") as f:
       json.dump(document, f, indent=2)
   print(f"wrote {len(steps)} steps to {sys.argv[1]}")
   ```

2. Make the file and the quiz:

   ```
   python tools/make_graded_pairs.py fixtures/mock/features.graded.mock.json
   python tools/build_listening_tasks.py fixtures/mock/features.graded.mock.json --seed 42 --min-difference 0.05 --out listening_tasks.graded.json
   ```

   You should see `30 questions, 0 excluded`. Without `--min-difference 0.05` the ten smallest
   pairs are left out (20 questions, 10 excluded).
3. **Before anyone listens**, write the pass mark in `docs/ACCESSIBILITY_LOG.md` under a new
   heading, "Graded listening check (made-up pairs)". Use the same mark as the main check: 9 or
   more of 10, for each gap. Guessing reaches that in at least one of the three gaps about 3 times in 100.
4. Play it with `tools/listening_quiz_player.html`. The player shows one total, so keep a tally by hand:
   - questions 1, 4, 7, … 28 are the 0.30 gap (75 ms)
   - questions 2, 5, 8, … 29 are the 0.20 gap (50 ms)
   - questions 3, 6, 9, … 30 are the 0.10 gap (25 ms)
5. Log each listener's three scores out of 10. No names.

**How to report it.** "Made-up pairs, real listeners." The pairs are test inputs, so this is a
result about hearing the rhythm rule, not about any NASA region. The player's end screen says
"Practice data: do not report this as a real result" for the same reason.

**What it can show.** If most listeners pass 0.20 and fail 0.10, the 0.20 cut-off is a
reasonable line. If they fail 0.30, the cut-off is too low. Say only what the counts show.

**Review.** Developer A.

---

## L3. Say the rhythm as a ratio — Student B

**Why.** "Second pulse at 73% of the beat" is exact but hard to picture. "The long gap is about
2.7 times the short gap" is the same fact in a form a musician or a 10-year-old can use.

**The sum.** ratio = `long_fraction ÷ (1 − long_fraction)`.

| long_fraction | Ratio | Musicians call it |
| --- | --- | --- |
| 0.50 | 1.0 | straight |
| 0.58 (Equatorial Pacific, **measured** mean 0.582) | 1.4 | |
| 0.67 | 2.0 | triplet swing |
| 0.73 (Kuroshio, **measured** mean 0.732) | 2.7 | |
| 0.75 | 3.0 | dotted |

**Steps**

1. Wait for the "long–short" rename to merge. It edits the same lines.
2. In `web/src/components/RhythmExplanation.tsx`, add one sentence to `explain()`:
   "The long gap is about N times the short gap." Round to one decimal place.
3. Add tests in `RhythmExplanation.test.ts` for 0.50, 0.582, 0.732 and 0.75.
4. The music words in the last column are optional. Developer A decides whether they go in.

**Review.** Developer A checks every sentence.

---

## L4. Slide: the map stretch raised a score and we caught it — Student A

**Why.** It is our best example of checking our own work. The flat map stretches east–west
distances more and more away from the equator, 1.8 times at 56° south. That pulls drawn lines
toward horizontal. The Southern Ocean circle scored 0.60 as drawn, partly because of the map. We
measured the effect and dropped that region.

**Do not write a "corrected" number yet.** Two ways of undoing the stretch give 0.16 and 0.25
(task L7). Wait for Developer A to give you the number and the sentence.

**Steps**

1. Use slide 6 ("What we tested") or slide 7 ("Limits"). The deck stays at 7 slides.
2. Picture: the whole-map score figure. Make it again with
   `cd analysis && python explore_regions.py --map` (about a minute). It writes
   `analysis/out/alignment_map.png`, which git ignores, so copy it to `docs/figures/alignment_map.png`.
   It is drawn over the NASA image, so the credit line goes on the slide.
3. Tag each sentence in your notes: **Verified** (the as-drawn numbers, `docs/science_review.md`
   section 9), **Design choice** (dropping the region), **Unverified** (anything about the corrected number until L7 is done).

**Review.** Developer A.

---

## L5. Travelling circle: measure seven stops — Student A

**Why.** Inside one circle the score barely changes over our 5 model days (about ±0.01). Across
the map it changes a lot. Seven circles down one line show that as a table, and it is the first
step toward a mode where the circle moves and the rhythm changes with it.

**Steps**

1. Run this from `analysis/`. It took 8 seconds on 14 Nov. It replaces
   `analysis/out/regions_report.json`, which git ignores.

   ```
   python explore_regions.py --also path_32n,271,330 --also path_27n,271,360 --also path_21n,271,390 --also path_16n,271,420 --also path_11n,271,450 --also path_05n,271,480 --also path_00n,271,510
   ```

2. Compare with these **measured** means:

   | Stop | x, y | Latitude | Alignment | Second pulse at |
   | --- | --- | --- | --- | --- |
   | `path_32n` | 271, 330 | 32°N | 0.071 | 73% |
   | `path_27n` | 271, 360 | 27°N | 0.181 | 70% |
   | `path_21n` | 271, 390 | 21°N | 0.269 | 68% |
   | `path_16n` | 271, 420 | 16°N | 0.436 | 64% |
   | `path_11n` | 271, 450 | 11°N | 0.533 | 62% |
   | `path_05n` | 271, 480 | 5°N | 0.613 | 60% |
   | `path_00n` | 271, 510 | 0° | 0.660 | 59% |

   Same frames and same settings must give the same numbers to three decimals. If yours differ, stop and ask Developer A.
3. Write `docs/path_measurements.md` with the table, and add from the script's output: the
   spread (sd), the usable fraction, the land share and the number of missing frames for each stop.

**Say these limits in the file.**

- The stops are 30 pixels apart and each circle has a radius of 61, so neighbours share pixels. The seven values are not seven separate facts.
- The numbers are as drawn on the map. The map stretch is 1.18 times at 32°N and none at the equator (task L7).
- This describes the rendering of ECCO2 model output. It does not say the ocean is calmer or faster anywhere.

**Review.** Developer A.

---

## L6. Travelling circle: file format and playback — Developer B

**Goal.** A third thing to play: one circle that moves down the line in L5, one stop per beat,
so the pulse changes from 73% to 59% of the beat as it goes.

**This changes the shared format**, so it needs a yes from Developer A and Developer B, a new
`schema_version`, and updated mock files in the same pull request (`CONTRIBUTING.md`).

**Design to propose**

- Every stop is measured at the **same** model moment, so only the place changes. Say that in the explanation.
- A step may carry its own `center_px`, so the app can draw the circle where the sound comes from.
- Same radius, threshold and sound settings as the two regions (the fair-comparison rule in `docs/mapping_spec.md`).

**Checks.** Contract tests pass on the new mock files. The explanation names the stop that is
sounding. A stop with too little to measure is `missing` and silent.

---

## L7. Undo the map stretch with a tested method — Developer A

**Why this is urgent.** `docs/science_review.md` section 9 says the Southern Ocean circle falls
from 0.60 to about 0.16 once the stretch is undone, and `TASKS.md` says most of its score comes
from the map. That estimate rescales the gradients (`Jxx / c²`, `Jxy / c`, with c = cos latitude).
On test dashes drawn the way a map renderer draws them, at a constant on-screen width, that
method does not return the unstretched score.

**Measured on 14 Nov** (mean of 6 test images of random dashes; the target is the first row):

| Latitude | As drawn | 1. Rescale gradients | 2. Squeeze the image | 3. True angle only | 3b. True angle × true length |
| --- | --- | --- | --- | --- | --- |
| 0° | 0.026 | 0.026 | 0.026 | 0.026 | 0.026 |
| 30° | 0.104 | 0.045 | 0.089 | 0.038 | 0.026 |
| 45° | 0.245 | 0.098 | 0.163 | 0.084 | 0.028 |
| 56.4° | 0.403 | 0.164 | 0.245 | 0.134 | 0.028 |

Dashes spread 20° about one direction: target 0.703; method 1 gives 0.732 at 56.4°; method 3b gives 0.707.

**The same four methods on the NASA circles** (30 frames, radius 61, one latitude per circle):

| Circle | Latitude | As drawn | 1. Rescale gradients | 3. True angle only | 3b. True angle × true length |
| --- | --- | --- | --- | --- | --- |
| Southern Ocean (dropped) | −56.4° | 0.601 | 0.162 | 0.348 | 0.251 |
| Gulf Stream (draft) | +32.3° | 0.217 | 0.071 | 0.140 | 0.103 |
| Kuroshio | +28.8° | 0.073 | 0.066 | 0.024 | 0.037 |
| Equatorial Pacific | +1.4° | 0.671 | 0.671 | 0.671 | 0.671 |

**Method 3b.** For each voting pixel with gradient (gx, gy), m = √(gx² + gy²) and c = cos(latitude):

- true angle θ′ = atan2(gy, gx / c)
- weight w = m × √(gx² + c² gy²)
- score = |Σ w e^(2iθ′)| ÷ Σ w

The angle part is geometry: a line drawn along (cos α, sin α) on the map runs along
(c cos α, sin α) on the ground. The weight part turns "pixels of line on the map" into "length of
line on the ground". Method 1 uses the same angles but multiplies the weight of north–south lines
by up to 1/c². That is right for a photograph that was stretched afterwards and wrong for lines
drawn on the map at a constant width.

**Steps**

1. Add a map-style dash generator to `analysis/sonata_math/synthetic.py` and a table to
   `experiments.py`, so `run_experiments.py` writes the comparison into `science_review.md`.
2. Add a test: random dashes at 56.4° come back within 0.02 of the unstretched score.
3. Replace the rough estimate in `explore_regions.py` (the "map stretch (rough)" block).
4. Update `science_review.md` section 9 (the last column, and item 3 of "What this shows"), limitation 7, and the Southern Ocean sentence in `TASKS.md`.

**Still open after this.** **Unverified:** that NASA drew the lines at a constant on-screen
width. One latitude is used for the whole circle, and across the Southern Ocean circle c runs
from 0.70 to 0.39. A circle on the map is not a circle on the ground.

**What does not change.** The approved pair. The Equatorial Pacific circle is unaffected, and
Kuroshio stays low under every method.

**Decided 15 Nov.** Regions stay circles on the flat map in version one (`science_review.md`
section 6, row 11). True circles on the globe come with this task, in the next version. Student
A's globe prototype (#25, `web/globe.html`) already draws the true measured area.

---

## L8. Fourth-harmonic score — Developer B (Developer A reviews the math)

**Why.** Limitation 1: two tidy sets of lines crossing at 90° score 0, the same as lines every
which way. Alignment adds up arrows at twice each line's angle. A second score at four times the
angle tells those two cases apart.

**The sum.** Over the voting pixels, with z = gx + i·gy and m² = gx² + gy²:

- alignment (as now) = |Σ z²| ÷ Σ m²
- fourth-harmonic score = |Σ z⁴ / m²| ÷ Σ m²

**Measured on test images, 14 Nov** (expected value in brackets):

| Picture | Alignment | Fourth-harmonic score |
| --- | --- | --- |
| Two line families 0° apart | 1.000 (1.000) | 1.000 (1.000) |
| 22.5° apart | 0.924 (0.924) | 0.708 (0.707) |
| 45° apart | 0.704 (0.707) | 0.010 (0.000) |
| 67.5° apart | 0.378 (0.383) | 0.713 (0.707) |
| 90° apart | 0.000 (0.000) | 1.000 (1.000) |
| Horizontal and vertical lines, equal areas | 0.000 | 0.945 |
| Random dashes (mean of 8) | 0.072 | 0.057 |

For two equal families δ apart the expected values are |cos δ| and |cos 2δ|.

**Risk to test first.** A pixel grid looks the same after a quarter turn, so the grid itself can
leak into this score. Random dashes turned by 0°, 15°, 30° and 45° gave 0.089, 0.091, 0.150 and
0.158. That drift needs explaining, or a stated limit, before the score is used for anything.

**Scope.** A diagnostic in the analysis reports only. The app does not play it, and no shared file changes.

---

## L9. A full model year — Student A

**Why.** We measured 5 model days. SVS 3912 covers 25 Mar 2007 to 3 Mar 2008, frames 23000 to
31000. Thirty frames spread over the year show whether a region's rhythm changes with the season.
Either answer is worth reporting.

**Steps**

1. Download 29 more frames, about 180 MB. In `tools/download_frames.sh`, add this loop next to the existing one:

   ```
   for n in $(seq 23000 272 30888); do
   ```

2. Check the map did not move. For each new frame, from the repository folder:

   ```
   python analysis/check_motion.py assets/frames/svs3912/flat_global_ecco2_2028x1024.23000.tif assets/frames/svs3912/flat_global_ecco2_2028x1024.NNNNN.tif
   ```

   Every one must print `PASS`. If one fails, leave that frame out and write down which one.
3. Make a **draft** scene and measure it, from `analysis/`:

   ```
   python prepare_scene.py --first 23000 --last 30888 --step 272 --out out/year/scene.year.json --masks-dir out/year/masks
   python features.py --scene out/year/scene.year.json --out out/year/features.year.json --alpha 1
   ```

   `prepare_scene.py` prints a "Next" line that writes to `../data/`. **Do not run that line.**
   `data/` holds the files the app plays. The same two commands with the 30 short-run frames were
   tested on 14 Nov and left `data/` untouched.
4. `--alpha 1` switches smoothing off. These frames are about 12 days apart, and smoothing would blend moments that have nothing to do with each other.
5. Write `docs/year_measurements.md`: the date and the alignment of each region for all 30 frames, and the lowest and highest value for each region.

**What to compare.** Over 5 days each circle moved by about 0.01 (**measured**: Kuroshio 0.058 to
0.101, Equatorial Pacific 0.652 to 0.689). Does the year move a region by more than that? Write
the numbers, then one sentence. Describe the rendering. Do not explain it with ocean science we have not checked.

**Review.** Developer A.
