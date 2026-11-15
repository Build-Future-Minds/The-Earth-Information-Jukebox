# Project page draft

Status: draft

This is the text Mr. E pastes into the Space Apps project form. Field names below are our best
match; **Mr. E confirms them against the live form** and renames as needed.
Each field shows who drafts it. Replace every `____`.

---

## Project title — Mr. E

Earth Sonata: Play the Planet

## High-level summary — Student B

NASA's pictures of Earth are made to be looked at, so the patterns in them are hard to follow for
people who cannot see the screen, and hard to compare even for people who can. Earth Sonata takes
one NASA computer-model visualization of ocean currents, measures how strongly the visible current
lines in two regions run the same way, and plays each region as a rhythm that is more even where the
lines line up, then explains in words which pattern made the sound. A visitor can compare two parts
of the ocean picture by ear, with only a keyboard if they like, and every sound can be traced back
to the numbers that made it, using a rule we chose and say we chose.

*(Three sentences: the problem, what Earth Sonata does, why it is useful. Drafted 14 Nov from
`PRODUCT.md` and the app on `main`. It replaces the earlier summary; its honesty points (model
visualization, our chosen rule) are in the sentences, and "describes the picture" is in "Limits".
Not yet read aloud to someone outside the team.)*

## Link to final project — Developer B

____ (public repo)

## Link to demo — Developer B

____ (30-second video or 7 slides; opens signed out)

## Detailed description — Student B, with Student A's source paragraph

**What it does** (Student B, 3–4 sentences)

Earth Sonata turns one NASA ocean picture into rhythm, so two regions of it can be compared by ear.
Ahead of time, we measured how strongly the visible current lines inside two circles share one
direction, from 0 (every which way) to 1 (all the same way), in 30 frames of the NASA video. In the
browser, each frame becomes one beat with two pulses: the more the lines line up, the more evenly
the two pulses are spaced. Region A, the Kuroshio eddies east of Japan, has lines running in many
directions and plays a short–long pulse; Region B, streaks in the Equatorial Pacific, has lines
that partly line up and plays a more even pulse.

**How a visitor uses it** (Student B — the four steps: start and listen, compare, ask why, add a melody if it works)

1. **Start and listen.** Press Start. Nothing plays before that. Region A plays one beat a second,
   two pulses a beat, through the 30 frames. Pause, Stop (`Esc`, from anywhere), Replay, a speed
   choice (0.5× to 1.25×) and an Earth volume slider are next to Start.
2. **Compare.** Switch to Region B with the arrow keys, or `1` and `2` while on the Region choice.
   The rhythm continues from the same moment in the video, so the two regions can be heard a few
   seconds apart. Close-ups of both circles, each with a Listen button, and one time line with both
   rhythms help compare them by eye too.
3. **Ask why.** Press "Explain this rhythm". It says, for the beat you are hearing, how lined up
   the region's lines are, where the second pulse falls, and whether the region is more or less
   even than the other one at the same moment.
4. **Add a melody.** Tab to the melody keys and play notes with `A S D F G H J K` on top of the
   Earth rhythm, which keeps playing unchanged. The melody has its own volume.

**The NASA source** (Student A, 2–3 sentences from worksheet part 1)

____

**How the sound is made** (Developer A, 3–4 sentences; Student B checks a beginner can follow it)

____

**How it works for people who cannot see the screen** (Student B)

The data is carried by timing, the spacing of two pulses, so it can be followed by ear alone; no
meaning is carried by colour or by left–right position. Every control is a standard button, radio
choice, menu or slider with a label, so the whole app works with Tab, Enter, Space and the arrow
keys, and `Esc` stops all sound from anywhere. A status line tells a screen reader when playback
starts, pauses or stops, or when a region has missing information, and it stays quiet in between
so it does not talk over every beat. When "Explain this rhythm" opens, the keyboard focus moves to
it so a screen reader reads it once. The NASA image, the region close-ups and the rhythm time line
each have a text description. Single-key shortcuts (`1`/`2`, the melody keys) work only while
their control has focus, so speech-input software cannot set them off by accident.
*We have not yet tested this with a screen reader or with a blind or low-vision person; results go
in "What we tested" below.*

**What we tested and what we found** (Student B, real counts only)

____

**Limits** (Developer A writes; everyone checks)

- It is a visualization of ECCO2 model output, not an observation.
- The rhythm rule is our design choice.
- It describes the rendered image, not water speed, turbulence or ocean health.
- The image analysis is done ahead of time; the sound is made live in the browser.
- ____

**What we would do next** (anyone)

____

## NASA and space agency data used — Student A

____

## Tools, coding languages, hardware and software — Student A

____

## Use of artificial intelligence — everyone, collected by the students, edited by Mr. E

____ (from `AI_USE.md`: which tools, what for, how a person checked the result)

## References — Student A

____

## Team contributions — each person writes their own line, roles not names

- Developer A: ____
- Developer B: ____
- Student A: ____
- Student B: ____

---

## Mr. E's final review

- [ ] Every sentence describes something that works today
- [ ] Scientific wording matches `docs/mapping_spec.md`
- [ ] Test numbers match `docs/ACCESSIBILITY_LOG.md`
- [ ] No student names, faces or voices in any linked material
- [ ] All links open signed out
- [ ] All required form fields filled; originality box read and ticked
- [ ] Submitted at: ____  Confirmation saved: ____
