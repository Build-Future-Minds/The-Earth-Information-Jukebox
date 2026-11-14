# Task board

Roles: **A** = Developer A (Mr. E), **B** = Developer B, **SA** = Student A, **SB** = Student B.
Hard deadline: **Sunday 15 Nov, 11:59 PM local**. Target submit: **Sunday 9:00 PM**.
The three checkpoints are the ones in the Team Briefing. Finish standard for every task:
**it runs, the checks have real evidence, a teammate reviewed it, the owner can explain it.**

## Before Checkpoint 1

- [ ] **B** Create public repo, push this kit, enable GitHub Pages
- [ ] **A** Confirm event requirements on the live submission form and legal page; fill the "unverified" list in `docs/SUBMISSION_CHECKLIST.md`
- [ ] **All** Read the Team Briefing together; agree the shared input/output format in `docs/CONTRACT.md`

## Checkpoint 1 — Show your piece (Sat 1:00 PM)

Each person shows one input, one working output and one check. Practice data is fine.

- [ ] **A** One-page rhythm explanation (`docs/mapping_spec.md`) with one even and one short–long example
- [ ] **A** `analysis/features.py`: alignment on aligned and mixed practice images
- [ ] **B** App with labelled practice data: Start, Pause, Stop, Replay, region selection
- [ ] **SA** Inspect SVS 3912; record source and credit in `assets/source_manifest.json`; propose a short section and two regions to Dev A
- [ ] **SA** `analysis/prepare_scene.py` running on a labelled practice image
- [ ] **SB** Practice examples: different rhythms, equal rhythms, missing information, with correct answers
- [ ] **SB** `tools/build_listening_tasks.py` started

## Saturday 6:00 PM — first submission drafts (students)

- [ ] **SA** Worksheet parts 1–3 in `docs/submission/student_a_worksheet.md`: NASA data, references, tools
- [ ] **SB** Worksheet part 1 in `docs/submission/student_b_worksheet.md`: high-level summary
- [ ] **SB** 30-second script draft in `docs/submission/video_30s.md` (due 9 PM)

## Checkpoint 2 — Connect it (Sat 9:00 PM)

One approved NASA sample moves through preparation, measurement, sound and explanation.

- [ ] **A** Approve source, section and two regions
- [ ] **SA** Approved images, exclusion masks, previews, two still crops for the fallback
- [ ] **SA** `analysis/test_prepare_scene.py`: a good input, a bad file (actionable error), an unusable frame (kept in place, marked missing with a reason)
- [ ] **A** All six test cases in `mapping_spec.md` pass; results in `science_review.md`
- [ ] **A + SA** Checked measurements for both regions
- [ ] **B** Real material in the app; missing information shows a message and silences the Earth voice; replay gives the same rhythm
- [ ] **SB** Region, replay, stop and explanation controls, reviewed with Dev B
- [ ] **SB** Listening questions exclude ties, weak differences and missing information
- [ ] **B** Record a backup capture of the working app with its actual sound

## Sunday morning (10:00 AM)

- [ ] **B** Speed and volume controls; setup instructions; Student A tries them from a clean copy
- [ ] **SB** Keyboard and screen-reader checks logged in `docs/ACCESSIBILITY_LOG.md`
- [ ] **SA** 7-slide backup deck drafted from `docs/submission/slides_7.md`
- [ ] **SB** Detailed description drafted in `docs/submission/project_page_draft.md`
- [ ] **B** After the core passes: optional keyboard melody with its own volume. MIDI only after that.

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
