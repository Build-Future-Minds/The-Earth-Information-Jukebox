# tools/

## `build_listening_tasks.py` — listening questions (owner: Student B)

Makes a two-choice listening quiz from a features file. For each moment where both regions
have a measurement, a listener hears two rhythms and answers:
**"Which one has the more even pulse, the first or the second?"** Guessing gets 50 %.

The answer key comes from the measured alignment: more aligned lines → more even pulse
(`docs/mapping_spec.md`). This rule is a **design choice**; it describes the rendered image,
not water speed, turbulence or ocean health.

### Run (from the `earth-sonata` folder, Python 3.10+, nothing to install)

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
2. From the `earth-sonata` folder: `python -m http.server 8000 --bind 127.0.0.1`
3. Open <http://localhost:8000/tools/listening_game.html>. Stop the server with `Ctrl+C`.

On load, the page measures about 700 random ocean patches with the `mapping_spec.md` alignment
formula (light blur, strongest 40 % of edges vote, patches touching land skipped, under 5 % usable
pixels = missing). Each round shows one swirly and one streaky patch at least 0.30 apart, plays one
with the same rule and timing as Dev B's app (`earthVoice.ts`: beat 0.5 s, second pulse at
`0.75 − 0.25 × A`), and you guess which. Each beat is a low pulse then a high pulse; those two
pitches are the same for every patch and carry no data. After the guess, each patch's numeral and
alignment take a font weight equal to its alignment (thin = swirly, heavy = lined up) and one plot
shows both rhythms on a shared time line. Keys: `P` new round, `R` replay, `1` / `2` pick, `Esc` stop.

**Pitch hint** (off by default): raises the pitch with alignment, so lined-up patches sound
higher. It is a practice aid, not part of the team's rule (`docs/mapping_spec.md` keeps pitch
fixed), and its rounds are scored in a separate row. Ask Dev A before treating pitch as data.

Design: built with the Impeccable skill ("Axis Specimen" direction). Product context lives in
`PRODUCT.md`; the direction contract in `.impeccable/surfaces/`.

These numbers are a **practice measurement in the browser**, not Dev A's checked `features.py`.
Finding to share with Dev A: on this frame, real patches mostly score 0.15–0.60, so the audible
range is narrower than the 0–1 the rule allows.

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

### Open questions for Dev A and Dev B

- Is `alignment` in `features.json` already the **smoothed** score the listener hears? The
  questions must use the value that actually drove the sound.
- Pulse order: the briefing table says short then long (0.25 s, 0.75 s); `mapping_spec.md`'s
  `long_fraction` reads as long then short. The quiz only reports the short and long gap, so
  the answer is the same either way, but the app should pick one.
