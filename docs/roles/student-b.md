# Student B — controls and understanding

Your briefing page is page 5 of `docs/briefing/Earth_Sonata_Team_Briefing.pdf`. This is the technical companion.
**You own Python listening-question code and working controls.**

## Files you own

- `tools/build_listening_tasks.py` and its tests — makes listening questions with checked answers
- `web/src/components/ExploreControls.tsx` — region, replay, stop, explanation controls (Dev B reviews)
- `web/src/components/RhythmExplanation.tsx` — explains the rhythm currently sounding
- `docs/ACCESSIBILITY_LOG.md` — what was really tested and what people really said
- `docs/submission/student_b_worksheet.md` and `docs/submission/video_30s.md`

## Start here

1. Make practice examples: two different rhythms, two equal rhythms, one with missing
   information. Write the correct answer for each. `fixtures/mock/features.mock.json` is a start.
2. Begin `build_listening_tasks.py`: read a features file, pick pairs, write questions and an answer key.

## What "finished" means

- Questions compare the two regions at the **same source moment**
- Answers use the values that actually produced the sound
- Ties, weak differences and missing information are left out of scored questions
- The same seed gives the same questions
- Start, choose, compare, explain, stop and replay all work by keyboard, with visible focus and clear labels
- The log says who tried what and what help they needed, with our own checks kept apart from outside feedback

## Explanation wording (starting point — make it clearer)

- "The pulse is even because most visible lines in this region run the same way."
- "The pulse is short–long because the visible lines in this region run in many directions."
- "There is not enough visible detail here to make a rhythm, so the Earth voice is quiet."
- Always available: "This is a visualization of a computer model. The rhythm rule is our choice.
  It describes the image, not water speed, turbulence or ocean health."

Ask Dev A to check each sentence means what the code does.

## Controls checklist

Real buttons with labels; visible focus; Tab order makes sense; no sound until Start;
Stop silences everything; spoken explanation only after the written one works and only when paused.

## Hand-offs

- From Dev A: examples with correct answers; a check of your answer meaning
- With Dev B: integrate and review controls together
- From Student A: checked material when ready
- From Dev B: recordings for the video

## Submission jobs (about 1 hour Saturday, 2 hours Sunday)

Fill in `docs/submission/student_b_worksheet.md`: summary, testing paragraph, your contribution
line. Write the detailed description in `project_page_draft.md`. Assemble the captioned
30-second video and transcript using `video_30s.md`.

## At review (90 seconds)

Your code, one question with a defensible answer, a complete run using only the keyboard.

## Privacy

Git name "Student B". Do not record testers' names. No personal details in commits or recordings.
