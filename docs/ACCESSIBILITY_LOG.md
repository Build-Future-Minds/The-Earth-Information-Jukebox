# Accessibility and evaluation log

Owner: Student B. Record only what actually happened. Do not publish personal details of participants.
We do not claim WCAG conformance.

## Build checklist

- [ ] Every control is a native button, select or range input with a label
- [ ] Visible focus on every control; tab order is Start, Region, Explain, volumes, speed
- [ ] Whole flow works with keyboard only
- [ ] Screen reader announces control name and state
- [ ] Text legend and on-demand spoken legend
- [ ] No meaning carried by stereo position alone
- [ ] Separate data-voice and user-voice volume and mute
- [ ] Pause, replay last bar, speed 0.5× / 1× / 1.5×
- [ ] No autoplay
- [ ] Speech only when paused; one announcement per region change

## Evaluation tasks

1. Start playback independently.
2. Select the second region.
3. Compare the two patterns and say which is steadier.
4. Explain in your own words what the rhythm encodes.
5. Stop, then replay the last bar.

## Sessions

| # | Participant type (blind / low-vision / sighted team member with screen reader / other) | Assistive tech | T1 | T2 | T3 | T4 | T5 | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |  |  |

## Summary for the submission (fill with real numbers)

- Blind or low-vision participants: __
- Other participants: __
- Tasks completed: __ of __
- What failed: __
- What we did not test: __

A sighted person working with the screen off is not evidence of accessibility. If no blind or
low-vision person tested the project, say exactly that.

## Listening task

**Set before anyone listened (14 Nov, Student B), so the pass mark cannot be moved afterwards.**
The pass mark comes from Dev A's plan.

- **Material:** the real pair from Mr. E's pull request #8: Region A, Kuroshio eddies (alignment
  about 0.07), and Region B, Equatorial Pacific streaks (about 0.67). Made with
  `python tools/build_listening_tasks.py data/features.json --seed 42 --out listening_tasks.json`.
  Result: 30 questions, 0 left out. The two regions differ by 0.57 to 0.62 alignment in every
  question, about 150 ms in where the second pulse lands at a 1-second beat. The 30 questions are
  the same two regions at 30 moments, with the order shuffled, so they test one pair, not ocean
  regions in general.
- **Player (changed 15 Nov, team decision, before anyone listened):** the quiz player is removed.
  The test now runs on the listening game, `tools/listening_game.html`, with **Musical sound off**
  and **Rhythm only on**, so pitch and music give nothing away. Be honest about what changed:
  - Rhythm only is close to, not the same as, the app's rule: each note is held for half its gap,
    so note length still follows the spacing.
  - The game asks "which of two patches made this rhythm?", with patches from across the picture,
    not the 30 prepared questions on the real pair below.
  - **Student B to confirm before the first session** how game rounds are counted against the
    10-question, 9-correct pass mark, and write it here.
- **Question:** "Which one has the more even pulse, the first or the second?" Guessing gets 50%.
- **Each listener answers 10 questions.** **9 or more correct counts as hearing the difference.**
  Guessing reaches 9 or more about 1 time in 100 (11 in 1024, 1.1%).
- **No names.** Team members and outside listeners are counted separately.

### Team members

| # | Assistive tech / listening setup | Correct of 10 | Heard the difference (9 or more)? | Notes |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |

### Outside listeners

| # | Blind / low-vision / other | Assistive tech / listening setup | Correct of 10 | Heard the difference (9 or more)? | Notes |
| --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |

### Summary (fill with real numbers; zero is an acceptable answer)

- Team members who listened: __   Heard the difference (9 or more of 10): __
- Outside listeners: __   Heard the difference (9 or more of 10): __
- Total questions asked: __   Correct: __   Chance level: 50%
- What we did not test: __
