# Student B — submission worksheet

Status: draft

You own how people understand the app, so you own the parts of the submission that
**explain it to a stranger**. Replace every `____`. If something is not known or not tested,
say so plainly. About 1 hour Saturday, 2 hours Sunday. Your code and controls still come first.

## Part 1 — High-level summary (draft Sat 6 PM, final Sun 2 PM)

Two or three sentences. A person who has never heard of us should understand what it does.
Start from the Team Briefing's "Our goal".

Checklist before you write:

- What does the visitor do? Picks one of two regions of a NASA ocean picture and presses Start to hear it, then asks the app to explain.
- What do they hear? A short repeating rhythm for that region: two pulses per beat, with the second pulse landing earlier or later depending on how much the visible lines in the region run the same way.
- What do they learn? Which pattern in the picture made the sound, and how the two regions compare.

Your draft:

> Earth Sonata lets a visitor compare two regions of a NASA ocean visualization by listening to a short rhythm for each one. The app plays the rhythm, where more lined-up lines in the picture give a more even pulse, and then explains in words which pattern in the image made the sound and how the two regions compare. It uses a NASA computer-model visualization (ECCO2), the rhythm rule is a choice we made, and it describes the picture, not water speed, turbulence or ocean health.

Read it aloud to someone not on the team. What did they not understand? ____ Fix it.
(Not done yet. Needs a real person.)

## Part 2 — Detailed description

Write in `project_page_draft.md`. Draft Sun 10 AM, final Sun 4 PM.

## Part 3 — Testing and feedback paragraph (final Sun 3 PM)

Copy real counts from `docs/ACCESSIBILITY_LOG.md`. Zero is an acceptable answer.

| Question | Real answer |
| --- | --- |
| How many team members tried the app with keyboard only? | ____ |
| Which screen reader did we try, on which computer? | ____ |
| How many people outside the team tried it? | ____ |
| How many of them were blind or low-vision? | ____ |
| Which steps did everyone complete? | ____ |
| Which steps needed help? | ____ |
| Listening questions: how many asked, how many correct? (chance is 50%) | ____ of ____ |
| What did we fix because of testing? | ____ |
| What did we not test? | ____ |

Your paragraph:

> We checked ____ ourselves using ____. ____ people outside the team tried it; ____.
> They could ____ but needed help with ____. We have not tested ____.

Rule: our own checks and outside feedback are reported separately. A sighted person with
the screen off does not show that it works for blind users.

## Part 4 — Your contribution (final Sun 4 PM)

Two sentences, no name:

> Student B wrote the Python listening-quiz builder, a listening game for testing whether the rhythm difference can be heard, and the comparison line in the rhythm explanation, which tell a listener which of two regions has the more even pulse. The quiz builder and the comparison line were tested with unit tests (18 Python tests and 14 web tests, all passing); the game has not yet been tried by listeners.

(Draft from what exists on 14 Nov. Update the testing sentence with real numbers before the final.)

Your AI-use line for `AI_USE.md`: I used ____ to ____. I checked it by ____.

## Part 5 — The 30-second video

See `video_30s.md`. Script Sat 9 PM, finished video Sun 5 PM.
