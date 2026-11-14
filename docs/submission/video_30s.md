# 30-second demo video

Status: draft

Owner: **Student B** assembles the captioned video and transcript.
**Developer B** records the working app with its actual sound. **Mr. E** approves.

## Hard rules

- 30 seconds or less. Aim for 28.
- Only sound made by our app. No background music.
- Captions carry the words. No student voice, face or name. Hands and screen only.
- NASA credit visible for at least 3 seconds.
- Show only what really works on Sunday afternoon.
- Upload where anyone can watch without signing in.

## Step 1 — What Developer B must record (ask for these clips)

| Clip | What happens on screen | Length needed |
| --- | --- | --- |
| 1 | App open, source image and credit visible, nothing playing | 5 s |
| 2 | Press Start with the keyboard; Region A rhythm plays | 8 s |
| 3 | Switch to Region B with the keyboard; rhythm changes | 8 s |
| 4 | Press "Explain this rhythm"; explanation appears | 6 s |
| 5 | (only if working) melody added while the Earth rhythm stays the same | 6 s |

Record at 1080p with system audio. Make the browser text large.

## Step 2 — Script and captions (draft Sat 9 PM)

Captions should be short enough to read in the time shown. Fill in or rewrite.

| Time | Clip | What we hear | Caption |
| --- | --- | --- | --- |
| 0–4 s | 1 | Silence | Earth Sonata: hear two regions of one NASA ocean image |
| 4–11 s | 2 | Region A rhythm | Region A: lines run in many directions — the less even pulse |
| 11–18 s | 3 | Region B rhythm | Region B: lines partly line up — the more even pulse |
| 18–24 s | 4 | Paused | Ask why: it explains each rhythm and compares the two regions |
| 24–28 s | 1 or 5 | One closing rhythm | A model visualization. The rhythm rule is our choice. |
| 28–30 s | end card | Silence | Credit: NASA/GSFC Scientific Visualization Studio · repo link |

### What the real app says

Checked on 14 Nov by running the app's own explanation code on the real data in Mr. E's pull
request #8 (`data/features.json`, first frame). Region A is **Kuroshio eddies east of Japan**.
Region B is **Equatorial Pacific streaks**. This is the app's text, not a recording of the screen,
so **confirm it against Dev B's recording** before the captions are final.

| Region | What the app says |
| --- | --- |
| A | "The pulse is short–long because the visible lines in this region run in many directions. Alignment is 0.08 (0 = every which way, 1 = all the same way), so the second pulse falls 73% of the way through the beat (rule: long_fraction = 0.75 - 0.25 * alignment). Compared with Region B at the same moment, this region is less even, more short–long (second pulse at 73% of the beat, against 58% for Region B)." |
| B | "The pulse has a slight lilt because the visible lines in this region partly share a direction. Alignment is 0.67 (0 = every which way, 1 = all the same way), so the second pulse falls 58% of the way through the beat (rule: long_fraction = 0.75 - 0.25 * alignment). Compared with Region A at the same moment, this region is more even (second pulse at 58% of the beat, against 73% for Region A)." |

- **Neither region says "even".** Real alignment values are about 0.08 and 0.67, and the app only
  says "even" at about 0.76 or more. Do not caption either region as "even".
- The captions use the comparison words "more even" and "less even" until Mr. E and Dev B choose
  the name for the pulse.
- The two rhythms differ by about 150 ms in where the second pulse lands (73% against 58% of a
  1-second beat). Whether a listener can hear that is what the listening check measures
  (`docs/ACCESSIBILITY_LOG.md`, "Listening task"). **Do not caption "you can hear the difference"
  until there are counts to back it.**

Check before the captions are final:

- Do the words on Dev B's recording match the table above? ____
- With the screen off, can you hear that the two rhythms differ? ____ (Your own impression is not a listening result.)

## Step 3 — Assemble (Sun 3–5 PM)

- [ ] Trim clips to the times above
- [ ] Add captions: large, high contrast, at the bottom, not covering the controls
- [ ] Watch with the sound **off**: does it still make sense?
- [ ] Listen with eyes **closed**: can you hear the two rhythms differ?
- [ ] Check the file length is 30.0 s or less
- [ ] Dev B review, then Mr. E approval

## Step 4 — Transcript (Sun 5 PM)

Save as `docs/submission/video_transcript.md`. For each moment write the time, the caption,
and a description of the sound and picture, so someone who cannot see or hear the video still
gets it.

```
0:00  [Picture: app with NASA ocean currents image. No sound.]
      Caption: ____
0:04  [Sound: ____ rhythm, ____ pulses.]
      Caption: ____
```

## Editing tools

Use whatever free editor the team already has on the recording computer. If an AI tool helps
with captions, log it in `AI_USE.md` and check every word.
