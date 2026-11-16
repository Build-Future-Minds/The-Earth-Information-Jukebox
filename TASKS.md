# Task board

Roles: **A** = Developer A (Mr. E), **B** = Developer B, **SA** = Student A, **SB** = Student B,
**SC** = Student C (submission checks and rules).
Hard deadline: **Sunday 15 Nov, 11:59 PM local**. Target submit: **Sunday 9:00 PM**.
The three checkpoints are the ones in the Team Briefing. Finish standard for every task:
**it runs, the checks have real evidence, a teammate reviewed it, the owner can explain it.**

## Status — Sun 15 Nov, 12:30 AM

`[x]` means built, in git, with evidence. "Needs review" means no teammate has reviewed it yet.
Sources: the repo and pull requests, with each person's status page. The live board is the Earth
Sonata Tracker; this file is the copy in the repo.

**Where we are:** the app plays real NASA data on GitHub Pages, with Student B's design, the beat
lane, the shared time line and the close-ups. On `main`: 165 engine tests, 18 listening-tool
tests and 73 app unit tests pass, and CI (unit, build, browser tests) is green.

**Critical path for Sunday**

1. **Student B: run the listening test** with the listening game (Musical sound off, Rhythm only on) and log the counts. The quiz player was removed on 15 Nov; see `docs/ACCESSIBILITY_LOG.md`.
   No one has listened yet. Slide 6, the testing paragraph and "What we tested" all wait on it.
2. **Reviews of work merged without one:** Dev B's #13 (restyle), #17 (beat lane, time line,
   close-ups) and #19 (game launch). Student B checks the design in the running app; Dev A checks
   the wording.
3. **Dev B: backup recording** of the working app with its sound (planned for Sat 9 PM; not
   reported yet).
4. **Student C:** nothing in the repo yet. Push what exists, even unfinished.

**Decided**

- Regions: Equatorial Pacific and Kuroshio, circles of radius 61 px (Dev A, 14 Nov). Southern
  Ocean dropped: most of its score comes from the map stretch (`docs/science_review.md` section 9).
- One frame per 1 s beat; `rhythm_reference.json` is a checked file; note length is the same for
  every alignment; frame numbers are in `scene.json` (Dev B, PRs #6 and #8).
- Comparison words: "more even", "less even" or "about as even as" when the two alignments
  differ by less than 0.20 (Dev A, 14 Nov; in the app via #11). No stretching of the rule's end
  points, and no pitch or note length in the rule, in version one.
- **The pattern is called "long–short"** (Dev A, 15 Nov): the long gap comes first. Words only;
  PR #27.
- **AI and music** (Dev A, 15 Nov): the rule bans music, images or video produced by a generative
  AI model. Sound synthesised by our own code is allowed, and AI help with that code is listed in
  `AI_USE.md`. The game's Musical sound (#21) waits until the listening test is logged, and then
  needs Dev B's two fixes.
- **MIDI piano** (Dev A, 15 Nov): after the core work. It is in the demo only if it is built and
  tested on the demo laptop before Dev B's final recording.
- **No feature freeze** (Dev A, Sun 9 AM): reviewed work keeps merging after 2 PM. Every change
  still needs a pull request and a teammate's review. The video shows the app as it is when Dev B
  records it, and Student A's 8 PM link check should see the final version.
- **Regions stay circles on the flat map** in version one (Dev A, 15 Nov). The limitation is
  written in `mapping_spec.md` and `science_review.md` section 6. True circles on the globe come
  later, with the map-stretch correction.

**Still open**

1. Dev A and Student A: go through the measurements together. Dev A reran them on 15 Nov and
   every number matched `science_review.md` section 9.
2. Dev A: confirm the live submission rules and the under-18 media rules (the submission guide
   bans images, video, audio or likeness of anyone under 18).
3. Dev A: decision D5 in `docs/DECISIONS.md` (two unread sources for doubling line angles).

**Pull requests:** #27 rename (Dev A; needs Dev B's review). #21 game Musical sound (Student B; on
hold, 2 fixes requested). Merged since Saturday 1:30 PM: #8, #10, #11 and #13 to #26.

**Student C:** a submission kit, a summary template and `check_submission.py` exist on Student C's
computer; none of it is in the repo (no `sc/` branch at Sat 11 PM). The project is **Earth Sonata:
Play the Planet**, not "Interstellar Sonata". The repo stays the single source of truth.

## Before Checkpoint 1

- [x] **B** Create public repo, push this kit, enable GitHub Pages — PR #1
- [ ] **A** Confirm event requirements on the live submission form and legal page; fill the "unverified" list in `docs/SUBMISSION_CHECKLIST.md` — *not started; all 7 boxes empty. Student C now collects the evidence (Sat 6 PM); Dev A confirms and ticks*
- [ ] **All** Read the Team Briefing together; agree the shared input/output format in `docs/CONTRACT.md`

## Checkpoint 1 — Show your piece (Sat 1:00 PM)

Each person shows one input, one working output and one check. Practice data is fine.

- [x] **A** One-page rhythm explanation (`docs/mapping_spec.md`) with one even and one long–short example — *on `main` (#8)*
- [x] **A** `analysis/features.py`: alignment on aligned and mixed practice images — *165 Python tests pass; on `main` (#8), reviewed by Dev B*
- [x] **B** App with labelled practice data: Start, Pause, Stop, Replay, region selection — PR #3 (merged without a teammate review)
- [x] **SA** Inspect SVS 3912; record source and credit in `assets/source_manifest.json`; propose a short section and two regions to Dev A — *merged with #8, reviewed by Dev B*
- [x] **SA** `analysis/prepare_scene.py` running on a labelled practice image — *on `main` (#8); writes `data/scene.json` and masks; reviewed by Dev B*
- [x] **SB** Practice examples: different rhythms, equal rhythms, missing information, with correct answers — *`fixtures/mock/listening.practice.mock.json`, merged in #11 (reviewed by Dev B)*
- [x] **SB** `tools/build_listening_tasks.py` started — *18 tests pass; merged in #11 (reviewed by Dev B)*

## Saturday 6:00 PM — first submission drafts (students)

- [x] **SA** Worksheet parts 1–3 in `docs/submission/student_a_worksheet.md`: NASA data, references, tools — *parts 1–4 on `main` (#14), reviewed by Dev B; unknowns marked NOT CHECKED YET*
- [x] **SB** Worksheet part 1 in `docs/submission/student_b_worksheet.md`: high-level summary — *#10 and #23 (reviewed by Dev B); read-aloud test with someone outside the team still to do*
- [x] **SB** 30-second script draft in `docs/submission/video_30s.md` (due 9 PM) — *#10 (reviewed by Dev B); transcript draft in #23*
- [ ] **SC** Before the first commit: Git name "Student C" and a GitHub no-reply email. The repo is public; no real names
- [ ] **SC** Project name in the submission kit: "Interstellar Sonata" → "Earth Sonata: Play the Planet" (or tell Dev A where the other name came from)
- [ ] **SC** The 7 "Still unverified" rules in `docs/SUBMISSION_CHECKLIST.md`: for each, the link, the exact sentence that answers it and the date checked. Dev A confirms and ticks the boxes

## Checkpoint 2 — Connect it (Sat 9:00 PM)

One approved NASA sample moves through preparation, measurement, sound and explanation.

- [x] **A** Approve source, section and two regions — *SVS 3912, frames 23000–23116, Equatorial Pacific and Kuroshio (14 Nov)*
- [x] **SA** Approved images, exclusion masks, previews, two still crops for the fallback — *`data/preview.jpg`, `data/masks/` and `docs/submission/stills/` (Kuroshio and Equatorial Pacific, frame 23000, with credit); reviewed by Dev B (#14)*
- [x] **SA** `analysis/test_prepare_scene.py`: a good input, a bad file (actionable error), an unusable frame (kept in place, marked missing with a reason) — *11 tests pass; reviewed by Dev B (#8)*
- [x] **A** All six test cases in `mapping_spec.md` pass; results in `science_review.md` — *practice images; on `main` (#8)*
- [ ] **A + SA** Checked measurements for both regions — *`data/features.json`: means 0.672 and 0.072, 30 of 30 frames ok, timestamps match NASA's dates file (`science_review.md` section 10). Dev A reran them on 15 Nov: every number matched. Student A still to go through them with Dev A*
- [x] **B** Real material in the app; missing information shows a message and silences the Earth voice; replay gives the same rhythm — *real data live (PR #8), checked in the browser by Dev B; missing info and replay covered by tests (`docs/dev_b_checks.md`)*
- [ ] **SB** Region, replay, stop and explanation controls, reviewed with Dev B — *Dev B restyled them in #13 (no review yet); Student B reviewing #13 in the running app closes this*
- [x] **SB** Listening questions exclude ties, weak differences and missing information — *merged in #11 (reviewed by Dev B); a test checks each one is left out*
- [ ] **B** Record a backup capture of the working app with its actual sound — *planned for Sat 9 PM; not reported yet*
- [ ] **SC** `tools/check_submission.py` and its tests on branch `sc/submission-checker`. Checks `docs/submission/*.md`, `docs/SUBMISSION_CHECKLIST.md`, `AI_USE.md` and `docs/ACCESSIBILITY_LOG.md` for the repo's real markers: `____`, `NOT CHECKED YET`, `Status: draft`, unticked `- [ ]`. A test proves it skips the "Replace every `____`" instruction lines. First "still blank" list, file by file, posted to the team — *built with 2 passing tests on Student C's computer; not yet run against the repo*
- [ ] **SC** Kit's draft form answers compared with `docs/submission/project_page_draft.md`; suggestions sent to each field's owner, not written over their sections (summary template and storyboard → Student B)

## Sunday morning (10:00 AM)

- [x] **B** Speed and volume controls; setup instructions; Student A tries them from a clean copy — *Student A: npm ci, test, build, dev and preview all worked from a clean clone*
- [ ] **SB** Listening test with the listening game (Musical sound off, Rhythm only on; the quiz player was removed 15 Nov); counts in `docs/ACCESSIBILITY_LOG.md` — *top priority: no one has listened yet*
- [ ] **SB** Keyboard and screen-reader checks logged in `docs/ACCESSIBILITY_LOG.md` — *nothing logged yet; include the beat lane, close-ups and time line from #17*
- [ ] **SB + A** Review Dev B's #13, #17 and #19, merged without a teammate review — *Student B: the design in the running app; Dev A: the wording*
- [ ] **SA** 7-slide backup deck drafted from `docs/submission/slides_7.md` — *slides 1, 2, 3 and 7 drafted outside the repo (`slides_7.md` is still the template). Slide 5 screenshot: `docs/submission/stills/app_live_real_data.png` (#26). Dev A gives the team name and slide 4 wording; slide 6 waits on listening counts*
- [x] **SB** Detailed description drafted in `docs/submission/project_page_draft.md` — *#23 (reviewed by Dev B); Student A's source paragraph and "What we tested" still blank*
- [x] **B** After the core passes: optional keyboard melody with its own volume. MIDI only after that. — *melody merged in PR #4 (Earth rhythm proven unchanged). MIDI after the core work: in the demo only if built and tested on the demo laptop before Dev B's final recording (Dev A, 15 Nov)*

## Checkpoint 3 — Rehearse it (Sun 2:00 PM)

- [ ] **All** A fresh person tries the core steps
- [ ] **All** 90 seconds each: your work, a test, one limitation
- [ ] **A** Review all scientific wording in the app and the submission drafts
- [ ] **SA** NASA data, tools: final
- [ ] **SB** Summary and testing paragraph with real counts: final
- [ ] **SC** Run `check_submission.py` at 12 PM; post what is still blank and whose it is

## Submit (Sun 2:00 PM → 9:00 PM)

- [ ] **B** Final recording of the working app (Sun 3 PM)
- [ ] **SB** Captioned 30-second demo and transcript from Dev B's recording (Sun 5 PM)
- [ ] **SA** References and slide deck final (Sun 4 PM)
- [ ] **All** Own line in `AI_USE.md` and own contribution line (Sun 4 PM)
- [ ] **SC** Collect everyone's AI-use and contribution lines; check each uses a role, not a name (Sun 4 PM)
- [ ] **SC** Run `check_submission.py` again; post what is still blank (Sun 6 PM)
- [ ] **B** Upload demo to a public link; local fallback ready
- [ ] **A** Review every draft; paste into the form
- [ ] **SA** Open every link signed out and on a phone (Sun 8 PM)
- [ ] **A** Submit; save the confirmation (Sun 9 PM)

## Deferred to a later version

Duet extras, MIDI piano (unless the core is solid), extra sources, Arduino and VEX hardware,
true circles on the globe (with the map-stretch correction), both regions playing at once in the
app, the melody pulse lock. How-to for the 14 Nov ideas: `docs/idea_tasks.md`.
