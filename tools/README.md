# tools/

## `build_listening_tasks.py` — listening questions (owner: Student B)

Makes a two-choice listening quiz from a features file. For each moment where both regions
have a measurement, a listener hears two rhythms and answers:
**"Which one has the more even pulse, the first or the second?"** Guessing gets 50 %.

The answer key comes from the measured alignment: more aligned lines → more even pulse
(`docs/mapping_spec.md`). This rule is a **design choice**; it describes the rendered image,
not water speed, turbulence or ocean health.

### Run (from the repository folder, Python 3.10+, nothing to install)

```
python tools/build_listening_tasks.py fixtures/mock/features.mock.json --seed 42 --out listening_tasks.json
```

| Option | Meaning |
| --- | --- |
| `--seed` | Same seed gives the same quiz. Default 42. |
| `--min-difference` | Alignment gap below this is "too close to hear" and left out. Default 0.20 (to agree with Dev A). |
| `--out` | Output file. Without it, the quiz is printed. |

### Practice game: "Which patch made this rhythm?" (real NASA image)

1. Download the NASA still (once; `assets/frames/` is git-ignored):

   ```
   curl -o assets/frames/svs3912/flat_global_ecco2_2028x1024.25000.jpg https://svs.gsfc.nasa.gov/vis/a000000/a003900/a003912/flat_global_ecco2_2028x1024.25000.jpg
   ```

   SVS 3912, model time 2007-06-19T12:00Z (`flat_ecco2_dates.txt`, frame 25000).
   Credit: NASA/Goddard Space Flight Center Scientific Visualization Studio.
2. From the repository folder: `python -m http.server 8000 --bind 127.0.0.1`
3. Open <http://localhost:8000/tools/listening_game.html>. Stop the server with `Ctrl+C`.

On load, the page measures about 700 random ocean patches with the `mapping_spec.md` alignment
formula (light blur, strongest 40 % of edges vote, patches touching land skipped, under 5 % usable
pixels = missing). Each round shows two patches with no hint about which should sound which way. The
round's difficulty is drawn at random: the two alignments differ by 0.10–0.19 (hard), 0.20–0.29
(medium) or 0.30 or more (easy), and the score table is split the same way. The hard band is
below the quiz builder's 0.20 cut-off on purpose, to find where hearing the difference fails. It plays
**one** sound, made by one of the two patches chosen at random (10 beats, same rule and timing as
Dev B's app, `earthVoice.ts`: beat 0.5 s, second pulse at `0.75 − 0.25 × A`), and you pick which
patch made it. An earlier version also played the other patch
for comparison, but hearing two sounds and answering about only one was confusing to play. After the guess, each patch's numeral and
alignment take a font weight from its alignment (thin = swirly, heavy = lined up) and one plot
shows both rhythms on a shared time line. Keys: `P` new round, `R` replay, `1` / `2` pick, `Esc` stop.

**Learning the sound:** a player who has never heard the sounds cannot say which of two patches made
one of them, so each patch has a **Hear patch 1 / 2** button (`Q` / `W`). Listen to both, then pick
the patch that made the mystery sound. The mystery sound is a different take of the patch's sound
(different note jumps, same character), so matching it means recognising how the patch sounds. The
patches are 192 × 120 image pixels, shown 3 times larger (an earlier 96 × 60 crop shown 6 times
larger was too blocky to read). The **Rounds** menu sets how far apart the two patches are (Easy by
default; Mixed draws hard, medium and easy at random).

**Two sounds at once and Groove lock:** pressing `Q`, `W` or `R` while a sound is playing adds the
new sound on top instead of cutting the first one off, so two patches (or a patch and the mystery
sound) can be heard together. At most two play at once: a third replaces the oldest, and pressing
the same sound again restarts just that one. `P` (new round) and `Esc` still stop everything. With
the **Groove lock** switch on (the default), the joining sound waits for the next beat of the one
already playing and keeps its speed, so both pulse together; off, it starts the moment you press.
The game still plays only one sound by itself; layering happens only when the player asks for it. A
limiter keeps two sounds from clipping (one sound at the default volume is unchanged). For a real
listening test, note that layering the mystery sound with its own patch makes the two line up exactly
in Rhythm only mode, which gives the answer away by ear.

**Musical sound** (on by default): the patch's notes become the melody of a short song. They play
as a soft, piano-like tone (a round fundamental plus a quiet octave through a filter that closes as
the note rings) with a little room echo, over a band: chords that move C, Am, F, G and home to C
(two beats each, so a 10-beat sound is one phrase) and a plucked bass on every beat (the chord's
root, then its fifth). The C pentatonic melody fits all four chords. The band is the same for every
patch and its bass lands on the beat, where the first note of each beat already is, so it carries no
answer and does not blur where the second note falls. Two sounds share one band: a sound that joins
extends it. Timing, pitch and note length still come from the patch exactly as before (checked by
rendering the same patch both ways: the melody notes start at the same moments). Switch it off for
the plain test tone, the strict setting for a real listening test.

**Rhythm only:** switch it on and every patch plays the same two notes (G4 then D5) at one fixed
length, so only the spacing of the pulses carries the answer. That is the team's actual rule
(`docs/mapping_spec.md`) and the setting for the real test. The speed control at 0.5× gives a
1-second beat.

**Line directions on the patches:** after you answer, each patch is drawn with short white ticks,
one per 24 px cell, showing which way the visible lines run there (the same strong pixels that vote
in the alignment measurement). Lined-up patches get ticks that mostly point the same way; swirly
patches get ticks pointing every which way. The **Always show line directions** switch shows them
during the round too.

**Timeline:** under the patches, a timeline works like a video editor's. Each note is a clip, and
a playhead line moves left to right. Each note plays and lights up the moment the line reaches it.
The line can also be dragged (or moved with the left and right arrow keys), and the note under it
sounds as it crosses, so the sound always comes from where the line is. The dot on the line rides
at the note's pitch. The **Show notes while playing** switch hides the clips (the line still
moves), so a real listening test is judged by ear alone.

**Stretch the pulse spacing** (on by default): on this image real patches only span about 0.15 to
0.50 alignment, so the team's rule moves the second pulse from 0.71 to 0.63 of the beat, a shift of
only about 44 ms at a 0.5 s beat (88 ms at a 1 s beat), and less for patches close together. With
the switch on, the game uses where a patch sits in this image's range instead, which gives up to
125 ms (250 ms at 1 s). It is the game's choice, like pitch and length. Turn it off, and turn
**Rhythm only** on, to test the team's exact rule.

**Pitch and note length follow alignment** (always on): stretched across this image's measured
range, alignment picks a base note from E3 to C6 on a C pentatonic scale (C3 to C7); the second
pulse of each beat is two scale steps higher. Lined-up patches stay on the base note and hold each
note for 95 % of the gap, so they sound like one steady tone. Swirly patches jump up to 4 scale
steps away on every note and hold each note for a random 8–58 % of the gap, so they sound jumpy
and choppy. The jumps are seeded by the patch position, so a patch always sounds the same on its Hear button. Pitch
and length are the game's choices, made because spacing alone was too hard to hear. The team's rule (`docs/mapping_spec.md`) still keeps
pitch fixed, so ask Dev A before the real app treats pitch or length as data.

Design: built with the Impeccable skill ("Axis Specimen" direction). Product context lives in
`PRODUCT.md`; the direction contract in `.impeccable/surfaces/`.

These numbers are a **practice measurement in the browser**, not Dev A's checked `features.py`.
Finding to share with Dev A: on this frame, real patches mostly score 0.15–0.60 (about 0.15–0.50 with the
game's larger 192 × 120 crops), so the audible range is narrower than the 0–1 the rule allows.

### Play the quiz (local test player)

Open `tools/listening_quiz_player.html` in a browser (double-click it), choose the
`listening_tasks.json` you made above, then press **Play both rhythms** and answer.
Keyboard: `P` play both, `S` stop, `1` / `2` answer, `N` next. It plays the gaps from the quiz
file at one fixed pitch; only the spacing changes. It is a testing aid, not the Earth Sonata app.
Generated `listening_tasks*.json` files are git-ignored.

### Test

```
python -m unittest discover tools -v
```

### What is left out of the quiz, and why

| Situation | Reason |
| --- | --- |
| A region is `missing` | The Earth voice is silent; nothing to compare. Never treated as 0. |
| Both alignments equal | Tie: no right answer. |
| Difference below `--min-difference` | Too close to hear reliably. |

Every left-out moment is listed in `excluded` with its reason.

### Practice examples (`fixtures/mock/listening.practice.mock.json`, MOCK, not NASA data)

Expected answers written down before the code was run:

| Frame | Region A | Region B | Expected |
| --- | --- | --- | --- |
| 0 | 0.90 | 0.20 | A more even |
| 1 | 0.15 | 0.85 | B more even |
| 2 | 0.50 | 0.50 | Left out: tie |
| 3 | 0.60 | 0.52 | Left out: too close (0.08) |
| 4 | 0.70 | missing | Left out: missing |
| 5 | 0.30 | 0.55 | B more even (0.25 apart) |

`fixtures/mock/features.mock.json` gives 6 questions (frames 0, 1, 2, 5, 6, 7) and leaves out
frames 3 and 4 (missing).

### Answered by the team

- **Is `alignment` in `features.json` the smoothed score?** Yes. It is smoothed (setting 0.3) and
  is exactly what the app turns into rhythm, so the quiz is right to use it.
- **Pulse order:** the rule plays the long gap first (75 %, then 25 % of the beat). The briefing,
  `mapping_spec.md` and the app all call this pattern "short–long". The briefing says it in a
  sentence; there is no table. The quiz file reports `short_gap_s` and `long_gap_s` without an
  order, so the answers do not change. The quiz player now plays the long gap first, like the app.

### Still open

- Final alignment end points and the smallest audible difference (Dev A).
- Whether pitch and note length become part of the team's rule (Dev A).
