# AI use — page draft

Draft copy for the new "AI use" tab. Plain language, no names and no roles.

---

# AI use

We used AI to help build this project. This page says what it did, what it did not do, and how we
checked it.

The NASA Space Apps Challenge allows AI tools and asks teams to say how they used them. This page is
our answer.

## The short version

**AI did not make the sound.** Every note you hear is worked out by our own code from the pixels of a
NASA picture, using a rule we wrote down.

**No AI runs in the app.** It does not call an AI service and it has no AI model inside it. The sounds
are made by simple tone generators running in your browser.

**AI helped us write and check the code.** We used Claude and Claude Code. Our rule: nobody adds code
until they have read it, run it, and can explain it. Every change was then reviewed by a second person
on the team.

## Where there is no AI

The chain from the Earth to what you hear has five steps:

1. NASA's computers make a picture of the oceans. It is model output, not a photo.
2. Our code measures the picture, pixel by pixel.
3. A rule we wrote turns those measurements into notes.
4. Tone generators in your browser play the notes.
5. You listen.

AI wrote some of the code for steps 2 to 4. It is not in any of them while the app runs. You can follow
every note back to the numbers that made it on the [How it's made] page.

We set four rules for ourselves at the start, and kept them:

- No music, pictures or video made by a generative AI model, in the app or in our demo. The only
  picture is NASA's, with credit. The drawings are drawn by our own code.
- All sound comes from code we can read. It is built from tone generators, not recordings.
- No cloud AI service anywhere between the picture and your speakers.
- If AI wrote or suggested code, the person who adds it reviews it and tests it.

## What we used it for

We used Claude, a chat assistant, and Claude Code, a version of it that works inside a project: it
reads our files, writes code and runs our tests when we ask. Both are made by Anthropic.

**Planning and paperwork.** Task plans, the formats of our data files, practice (fake) test data,
worksheets, page plans and first drafts of sentences.

**The maths that measures the pictures.** The code that measures how strongly the lines in a picture
point the same way, its tests, and the experiments and charts that check it works.

**The app.** The idea for the app was ours. AI helped us write much of its code: the player and
controls, the picture scan that sweeps a line across the picture and plays what it crosses, the globe,
the Listen, Compare and Home pages, and the site's look.

**Some of the musical choices.** AI helped choose the scale the scan plays in, how the instruments are
built, and the chords of the background band. These are fixed choices, not data. Each one is written
down with its reason on the How it's made page, and marked as checked, a design choice, or not yet
checked. People listened to the band, the tune and the chords and approved them by ear.

**Checking our own work.** AI listed every claim the scan makes, built the tools that measure the
pictures and record the app's sound, and wrote the tests.

**Looking up sources.** An AI assistant fetched pages and quoted the passages we cite. When a paper was
a scan with no text, it read the page images. Anything it could not read, we marked Unverified.

## What we decided ourselves

AI proposed. We decided.

The idea was ours. We set the rule that turns lines into rhythm from our own findings and research, and
chose which parts of the picture to listen to. We chose how the click-to-explain feature behaves when a choice came up,
and what every page says about the limits of the sound. We listened and approved the band, the tune and
the chords by ear. We chose the look of the app from three mockups.

## How we checked its work

1. **We read it and explained it.** If nobody could explain a piece of code in plain words, it did not
   go in.
2. **A second person reviewed it.** Every change was reviewed by someone other than the person who
   made it.
3. **Tests.** More than 180 tests of the maths, more than 340 of the app, and more than 120 that drive a
   real browser. All passed at our last count.
4. **A second copy.** We wrote the scan's rule a second time, separately, in Python. It gives the same
   answers on the real picture. Pixels read back from the graphics card on the globe match the rule too.
5. **Break it on purpose.** We broke the rule deliberately to see the tests fail. A test that cannot
   fail is not checking anything.
6. **Measure the running app.** We recorded the app's own sound and measured loudness, clipping,
   silence after Stop, and left–right balance. We also checked the sound meter against standard test
   signals, so we know the meter itself can be trusted.
7. **Listen.** AI can measure a sound. It cannot hear one. Whether it sounds good is up to people.
8. **Write it down.** We kept a log. Every use of AI was written down with the date, the tool, what it
   was used for, and how a person checked the result.

## Where AI got it wrong, and we caught it

AI is quick, and it makes mistakes. These are ones our checks found:

- **A page too wide for a phone.** With one section open, the page was 656 pixels wide in a 390-pixel
  window. A check found it, we fixed it, and the check now fails if it comes back.
- **A test that could never pass.** One browser test waited for something that could never happen, so
  it was bound to time out. We fixed it.
- **Old numbers in our own notes.** When we checked every number in our documents against the
  measurement reports, some were out of date. We corrected them.
- **A sound that changed a little each time.** Recording the same sound again and again showed its
  loudness was not the same every run. We traced it to two causes: the reverb is made from random
  noise, and the tone generators do not all start at the same instant.
- **Limits we had not written down.** AI listed every claim the picture scan makes and we marked each
  one Verified, Design choice or Unverified. That showed limits, such as how colour strength relates
  to temperature, and we added them to the page.
