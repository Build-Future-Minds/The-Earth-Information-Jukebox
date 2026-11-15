# AI use log

The submission form asks whether and how we used AI tools. Add a line every time you use one.
Use role labels, not names. A human must read, understand and be able to explain anything merged.

Rules:

- Use only accounts you are eligible and authorised to use.
- No music, images or video produced by a generative AI model in the product or demo. All sound
  is synthesised by our own code. Where AI helped write that code or choose its notes (for
  example the listening game's chords), the row below says so (Mr. E's reading, 15 Nov).
- No cloud AI service in the audio path.
- If AI wrote or suggested code, the person merging it reviews and tests it.

| Date | Role | Tool | What it was used for | Human review |
| --- | --- | --- | --- | --- |
| 2026-11-14 | Team lead | Claude | Planning documents, task breakdown, JSON schemas, practice fixtures, submission worksheets, source-page fact checks | Team reads and corrects the plan; unverified items are flagged |
| 2026-11-14 | Developer A | Claude Code | Math engine in `analysis/` (image analysis, rhythm rule, tests, synthetic test images, verification experiments and figures), `docs/math_notes.md`, `docs/science_review.md`, edits to `docs/mapping_spec.md` and `docs/CONTRACT.md` | Pending: Developer A to read, run `pytest` and `run_experiments.py`, and be able to explain it before merge |
| 2026-11-14 | Dev B | Claude Code | Wrote the app code in `web/` (transport, Earth voice, controls v1, explanation v1), tests, the Pages workflow and setup instructions. Chose the region-switch behaviour with Dev B | Dev B reviewed it. 19 unit tests, clean-clone install/test/build, and keyboard-only browser run all passed (PR #2). Teammate review pending |
| 2026-11-14 | Dev B | Claude Code (research sub-agent) | Fetched and quoted sources for `docs/DECISIONS.md`. Flagged sources it could not read | Dev B checked the quotes. Sources not yet read are tagged Unverified |
| 2026-11-14 | Student A | Claude Code | Source checks against the SVS page, frame download script, `check_motion.py`, region search and preview images, `prepare_scene.py` and its tests, worksheet parts 1–4 drafts, still crops, review notes, backup slide draft, globe spotlight prototype (`web/globe.html`, `web/src/globe/`, branch `sa/globe-prototype`) | Student A ran `pytest tests/test_prepare_scene.py` (11 passed), read `prepare_scene.py` and can explain what it does, and reviewed all drafted items. Student A tested the globe prototype in the browser (turning, zoom, spotlight sliders, region buttons) and it works; its map-maths tests pass. Dev A re-measured the motion check and regions with their own code |
| 2026-11-14 | Student B | Claude Code | Pages step that publishes the listening game and quiz player (PR #15); the game's Groove lock and two-sounds-at-once (PR #16); the game's optional Musical sound (PR #21), including the chord choices, the design of its tone, the four instrument sounds and the background pad; drafts of the Student B sections of `docs/submission/project_page_draft.md` | Pending: Student B to listen to the game, read the drafts against the app, and be able to explain them. Claude's own checks: offline audio renders (melody timing unchanged, no clipping) and browser runs of the game. Mr. E's answer (15 Nov): sound synthesised by our own code is allowed, with AI help listed here. |
|  |  |  |  |  |

## Summary for the submission form (edit before submitting)

We used AI assistants for planning, drafting documentation, suggesting code and tests, and
checking wording. All analysis and synthesis code was reviewed and tested by team members.
The sonification itself uses explainable signal processing (a measure of how strongly the
lines in each image share one direction), not a trained model, and all audio is synthesised by
our own code.
