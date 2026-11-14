# Task board

Roles: **A** = Developer A (Mr. E), **B** = Developer B, **SA** = Student A, **SB** = Student B.
Hard deadline: **Sunday 15 Nov, 11:59 PM local**. Target submit: **Sunday 9:00 PM**.
The three checkpoints are the ones in the Team Briefing. Finish standard for every task:
**it runs, the checks have real evidence, a teammate reviewed it, the owner can explain it.**

## Status — Sat 14 Nov, 1:30 PM

`[x]` means built, in git, with evidence. "Needs review" means no teammate has reviewed it yet.
Sources: each person's status page and messages, checked against the repo.

**Next on the critical path:** Dev A's pull request puts the real files in `data/` (scene,
features, rhythm check file) with the fixes from Dev B's review. It is stacked on #6 (circles),
which is stacked on #4 (melody). Merge order: #4, then #6, then Dev A's. After that the app plays
real NASA material, and Dev B checks it in the browser and records the backup at 9 PM.

**Decided on 14 Nov**

- Regions: Equatorial Pacific and Kuroshio, circles of radius 61 px (Dev A). Southern Ocean dropped:
  most of its score comes from the map stretch (`docs/science_review.md` sections 9 and 10).
- One frame per 1 s beat; `rhythm_reference.json` is a checked file; note length is the same for
  every alignment (Dev B, PR #6).

**Still open**

1. **Pulse order name.** The rule plays the long gap first, but the briefing, docs and app call it
   "short–long". Rename the label or move the second pulse; Dev A and Dev B agree one.
2. **"Even" never appears on real data** (it needs alignment 0.76; the highest circle is 0.68).
   Dev B proposes comparison words ("more even than Kuroshio"); Dev A's check is in the PR.
3. **Stretching the rule's end points.** Wait for Student B's listening check on the real pair.
4. **Pitch and note length.** Proposed: not part of the team rule in version one.
5. **Frame numbers in `scene.json`** (`frames.first_index`, `frames.index_step`): Dev B's yes, in the PR.

**Pull requests:** #4 melody and #6 circles (Dev B, need review). #5 draft regions (Student A;
its commits are also in Dev A's PR). Student B's tools are committed on Student B's computer but
not pushed.

## Before Checkpoint 1

- [x] **B** Create public repo, push this kit, enable GitHub Pages — PR #1
- [ ] **A** Confirm event requirements on the live submission form and legal page; fill the "unverified" list in `docs/SUBMISSION_CHECKLIST.md` — *not started; all 7 boxes empty*
- [ ] **All** Read the Team Briefing together; agree the shared input/output format in `docs/CONTRACT.md`

## Checkpoint 1 — Show your piece (Sat 1:00 PM)

Each person shows one input, one working output and one check. Practice data is fine.

- [x] **A** One-page rhythm explanation (`docs/mapping_spec.md`) with one even and one short–long example — *in Dev A's PR*
- [x] **A** `analysis/features.py`: alignment on aligned and mixed practice images — *all Python tests pass; in Dev A's PR*
- [x] **B** App with labelled practice data: Start, Pause, Stop, Replay, region selection — PR #3 (merged without a teammate review)
- [x] **SA** Inspect SVS 3912; record source and credit in `assets/source_manifest.json`; propose a short section and two regions to Dev A — PR #5, needs review
- [x] **SA** `analysis/prepare_scene.py` running on a labelled practice image — *on `sa/scene-regions`; writes `data/scene.json` and masks; needs review*
- [ ] **SB** Practice examples: different rhythms, equal rhythms, missing information, with correct answers — *6 cases built, not pushed*
- [ ] **SB** `tools/build_listening_tasks.py` started — *built with 18 passing tests, not pushed*

## Saturday 6:00 PM — first submission drafts (students)

- [x] **SA** Worksheet parts 1–3 in `docs/submission/student_a_worksheet.md`: NASA data, references, tools — *filled; unknowns marked NOT CHECKED YET; needs review*
- [ ] **SB** Worksheet part 1 in `docs/submission/student_b_worksheet.md`: high-level summary
- [ ] **SB** 30-second script draft in `docs/submission/video_30s.md` (due 9 PM)

## Checkpoint 2 — Connect it (Sat 9:00 PM)

One approved NASA sample moves through preparation, measurement, sound and explanation.

- [x] **A** Approve source, section and two regions — *SVS 3912, frames 23000–23116, Equatorial Pacific and Kuroshio (14 Nov)*
- [ ] **SA** Approved images, exclusion masks, previews, two still crops for the fallback — *`data/preview.jpg` and `data/masks/` done; still crops to do*
- [x] **SA** `analysis/test_prepare_scene.py`: a good input, a bad file (actionable error), an unusable frame (kept in place, marked missing with a reason) — *11 tests pass; needs review*
- [x] **A** All six test cases in `mapping_spec.md` pass; results in `science_review.md` — *practice images; on `a/math-engine`*
- [ ] **A + SA** Checked measurements for both regions — *`data/features.json`: means 0.672 and 0.072, 30 of 30 frames ok, timestamps match NASA's dates file (`science_review.md` section 10); Student A still to go through them with Dev A*
- [ ] **B** Real material in the app; missing information shows a message and silences the Earth voice; replay gives the same rhythm — *real files in Dev A's PR; the app's tests pass on them; Dev B to check in the browser*
- [ ] **SB** Region, replay, stop and explanation controls, reviewed with Dev B
- [ ] **SB** Listening questions exclude ties, weak differences and missing information — *built and tested on practice cases, not pushed*
- [ ] **B** Record a backup capture of the working app with its actual sound

## Sunday morning (10:00 AM)

- [x] **B** Speed and volume controls; setup instructions; Student A tries them from a clean copy — *Student A: npm ci, test, build, dev and preview all worked from a clean clone*
- [ ] **SB** Keyboard and screen-reader checks logged in `docs/ACCESSIBILITY_LOG.md`
- [ ] **SA** 7-slide backup deck drafted from `docs/submission/slides_7.md`
- [ ] **SB** Detailed description drafted in `docs/submission/project_page_draft.md`
- [x] **B** After the core passes: optional keyboard melody with its own volume. MIDI only after that. — *melody in PR #4, needs review; MIDI not built*

## Checkpoint 3 — Rehearse it (Sun 2:00 PM) — feature freeze

- [ ] **All** A fresh person tries the core steps
- [ ] **All** 90 seconds each: your work, a test, one limitation
- [ ] **A** Review all scientific wording in the app and the submission drafts
- [ ] **SA** NASA data, tools: final
- [ ] **SB** Summary and testing paragraph with real counts: final

## Submit (Sun 2:00 PM → 9:00 PM)

- [ ] **B** Final recording of the working app (Sun 3 PM)
- [ ] **SB** Captioned 30-second demo and transcript from Dev B's recording (Sun 5 PM)
- [ ] **SA** References and slide deck final (Sun 4 PM)
- [ ] **All** Own line in `AI_USE.md` and own contribution line (Sun 4 PM)
- [ ] **B** Upload demo to a public link; local fallback ready
- [ ] **A** Review every draft; paste into the form
- [ ] **SA** Open every link signed out and on a phone (Sun 8 PM)
- [ ] **A** Submit; save the confirmation (Sun 9 PM)

## Deferred to a later version

Duet extras, MIDI piano (unless the core is solid), extra sources, Arduino and VEX hardware.
