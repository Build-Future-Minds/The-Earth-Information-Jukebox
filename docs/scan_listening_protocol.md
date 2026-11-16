# Listening to the picture scan: protocol (DRAFT, not run)

Owner: Developer A. **Draft, 15 Nov. Nobody has listened under this protocol yet.** Every claim about how
the scan sounds stays **Unverified** until a session below is logged.

This is **not** the Earth-rhythm listening test. That test, its pass mark and its log belong to
Student B in `docs/ACCESSIBILITY_LOG.md`, and the scan is not part of the rhythm claim. Nothing here
is written into that file, and no result here counts for or against it.

## What it can show, and what it cannot

It can show whether listeners, with the explanation open:

- can tell a struck note's instrument and rough place by ear (task S1);
- can tell the two approved circles apart by ear alone (S2): the claim in `mapping_spec.md`, "a region's character can be heard";
- understand from the app which parts carry data and which are decoration (S3).

It cannot show that the scan is accurate science, that the sound means anything about the ocean,
or which note spacing is clearer (see S4, which cannot be run yet). A few team members are not a
sample of the public: report the counts and say who listened.

## Before anyone listens

- Fix the pass marks below, and do not change them after the first session.
- Use the real pictures (`data/`), not the practice data, and the app's default volumes and speed.
- Scan sound: Ocean choir, unless a task says otherwise.
- **Keep it apart from the rhythm test.** If both run on the same day, run the rhythm test first,
  with the scan off. Write in the notes when a listener did both on one day.
- The Earth voice is off for every task here.
- Headphones or speakers, whichever the listener uses; write which. No task depends on left and right.

## Accessibility

- Every task can be done with the keyboard only. "Play the picture", "Pause the scan" and the
  fold-out "Why the scan sounds like this" are all reachable with Tab and Enter.
- Screen-reader users take part on the same terms. The fold-out is not a live region, so they pause
  the scan and read "Last struck note" with their reader's reading keys.
- With reduced motion set the line moves once a second. That is fine for every task.
- No task asks for a colour or a side (left or right) as its answer.

## Tasks

### S1. Name a struck note (explanation open)

The listener plays the map sweep with "Why the scan sounds like this" open. When they hear a struck
note they pause the scan and say two things:

1. which instrument it was (for Ocean choir, marimba or bells);
2. whether it was high or low (upper or lower half of the map).

Then they read "Last struck note" aloud, or the facilitator reads it, and the facilitator writes
down whether each answer matched. Repeat five times in one sweep or across sweeps.

No pass mark: report how many of five were right, for each of the two answers. Each answer is
right half the time by guessing.

### S2. Which circle is it? (screen covered)

1. **Training.** The listener hears one radar turn of each circle with the screen visible and the
   explanation open: Region A, Kuroshio, then Region B, Equatorial Pacific.
2. **Ten trials.** The screen is covered, or the listener closes their eyes. The facilitator plays
   one radar turn of A or B, chosen in advance by a list made with coin flips. The listener says
   "A" or "B".
3. **Last question.** "What did you listen for?" The facilitator writes the answer in the
   listener's words.

**Pass mark, set now:** 9 or more correct of 10 counts as hearing the difference. Guessing reaches
9 or more about 1 time in 100 (11 in 1024).

Be honest about what a pass means:

- The circles differ in more than one way. Region B is about 3 LU louder in every recording so far
  (`docs/measurements/scan_sound.md`), and it is struck only on the marimba (72 marimba, 0 bells).
  Kuroshio is mostly bells (11 marimba, 45 bells; `docs/measurements/scan_pictures.md`).
- A listener can pass on the instrument alone. A pass shows that the two pictures sound different.
  It does not show which feature was heard: the answer to "What did you listen for?" is the only
  clue.

### S3. What carries data? (after one sweep, explanation open)

The facilitator asks three questions. Each is marked right or wrong, and the listener's own words
are written down.

1. "What decides how high a note is?" (Right: where it is on the map, north high.)
2. "What decides which instrument strikes?" (Right: the colour, red and orange or the rest.)
3. "Does the change of the low note every few seconds mean something in the picture?" (Right: no,
   it is decoration.)

No pass mark. Report how many listeners got each one right. This is the "Not decided" item in
`docs/DECISIONS.md` D9: whether the fixed choices read clearly to someone who has not seen the spec.

### S4. Which note spacing is clearer? (cannot be run yet)

The app plays only the current spacing (C3 G3 C4 E4 G4 A4 C5 D5 E5 G5 A5 C6). The first spacing,
a step at a time from C3, is not in the app. So the claim "the wide spacing at the bottom sounds
clearer" cannot be tested by listening yet.

`docs/measurements/scan_spacing.md` compares the two spacings with a model of hearing only. **Decision
for Developer A:** whether to build a temporary comparison (not for merging) so this task can run. If
it is built:

- the same picture is played with each spacing, in an order set by coin flips;
- the listener says which one lets them hear the separate notes better, or "no difference".

## What is logged

One row per listener. Rules:

- No names, ages, schools, photos or voices. Use a code: T1, T2 … for team members, O1, O2 … for
  outside listeners.
- Do not record audio of the listener. The facilitator writes the answers down.

| Code | Date | Team or outside | Blind / low-vision / other | Assistive tech | Headphones or speakers | Did the rhythm test the same day? | S1 instrument right (of 5) | S1 high/low right (of 5) | S2 correct (of 10) | S2: what they listened for | S3 right (of 3) | Their words | What went wrong |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |

## Sessions

None yet.

## Summary (fill with real numbers; zero is an acceptable answer)

- Listeners: __ team, __ outside (of whom blind or low-vision: __)
- S2, heard the difference (9 or more of 10): __ of __
- S1 and S3: __
- What we did not test: S4 (no way to play the first spacing), and anything not listed above.
