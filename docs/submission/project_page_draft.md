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
directions and plays a long–short pulse; Region B, streaks in the Equatorial Pacific, has lines
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

We used the "Global Sea Surface Currents and Temperature" visualization from NASA's Scientific
Visualization Studio (SVS 3912), which is part of NASA's Earth Information Center collection. It
shows ocean surface currents computed by the ECCO2 ocean model for March 2007 to March 2008, drawn
as flow lines coloured by modelled sea surface temperature; it is model output, not a satellite
photo. We used 30 frames (25–30 March 2007) and compared two circles of the same size: eddies
east of Japan in the Kuroshio, and streaks in the Equatorial Pacific.

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

- **Global Sea Surface Currents and Temperature**, NASA Scientific Visualization Studio, SVS 3912:
  https://svs.gsfc.nasa.gov/3912
  - Listed in NASA's Earth Information Center gallery ("EIC Beauty Pieces"):
    https://svs.gsfc.nasa.gov/gallery/earth-information-center/
  - Credit: NASA/Goddard Space Flight Center Scientific Visualization Studio
  - What it is: ECCO2 (MIT/JPL) ocean model output, surface flows only, 25 Mar 2007 to 3 Mar 2008.
    Flow lines are coloured by modelled sea surface temperature. Not an observation.
  - What we used: the 2048×1024 `orig` frame set, frames 23000 to 23116 (every 4th frame, 30 frames,
    model time 25 Mar 2007 12:00Z to 30 Mar 2007 11:42Z), and NASA's per-frame date file
    `flat_ecco2_dates.txt`. Frame 25000 was used only to check that the camera does not move.
  - Two regions, circles of radius 61 pixels: Kuroshio eddies east of Japan (centre 149°E, 29°N)
    and Equatorial Pacific streaks (centre 132°W, 1°N). Land is left out of the measurement.
- **GEOS Aerosols (2025)**, SVS 5669: https://svs.gsfc.nasa.gov/5669/ — a challenge resource ("GEOS
  Aerosols" in the challenge's resource list); not in the Earth Information Center gallery.
  - Credit: NASA's Global Modeling and Assimilation Office (GMAO) and NASA's Scientific Visualization Studio (SVS)
  - What it is: GEOS-FP model output, one still for 19 Aug 2025 20:00 UTC; colours show aerosol type
    (blue sea salt, pink dust, orange/red smoke, green sulfates). Not an observation.
  - What we used: the lossless 3840×2160 still. Two circles of radius 110 pixels over open ocean:
    sulfate and sea-salt streaks near Vanuatu (168°E, 19°S) and sea-salt cells in the southeast
    Pacific (105°W, 17°S). Measured at its own setting; its numbers are never compared with the ocean's.
- **Near Real-Time Global Precipitation (GPM IMERG)**, SVS 4285: https://svs.gsfc.nasa.gov/4285/ — listed
  in the Earth Information Center "Daily Visualizations" dashboard.
  - Credit: NASA's Scientific Visualization Studio
  - What it is: satellite rain estimates from the GPM constellation, a flat 3600×1800 map every 30 minutes.
  - What we used: 30 hourly frames, 14 Nov 2026 00:00 to 15 Nov 2026 05:00 UTC (saved, because NASA keeps
    only the latest week). Two circles of radius 100 pixels over open ocean: a long rain band in the South
    Pacific (138°W, 18°S) and scattered showers on the equator (150°W, 0°).
- The ocean currents (SVS 3912) are the main source in the app; all three can be explored on the globe page.
  No other NASA or space agency data is used.

## Tools, coding languages, hardware and software — Student A

- **Languages:** Python, TypeScript, HTML and CSS, GLSL (the globe's shaders), Bash (frame download script)
- **Python libraries:** NumPy, OpenCV, Matplotlib, Pillow, pytest, jsonschema
- **Web libraries:** Tone.js (all sound), React; Atkinson Hyperlegible Next and Mono fonts; built and
  tested with Vite, Vitest, Ajv and Playwright. The globe uses the browser's own WebGL2, no library.
- **Services:** GitHub, GitHub Actions and GitHub Pages (code, tests, the published app)
- **Hardware:** none. The MIDI piano is not in the final demo (Dev B, 15 Nov); the melody is played with the computer keyboard or the on-screen keys.
- **Other tools:** VS Code. Recording and editing the video: NOT CHECKED YET (Student B)
- **AI tools:** see "Use of artificial intelligence" and `AI_USE.md`
- The app makes no network requests and uses no AI or cloud service to make sound.

## Use of artificial intelligence — everyone, collected by the students, edited by Mr. E

____ (from `AI_USE.md`: which tools, what for, how a person checked the result)

## References — Student A

| Name | What it is | Link | Licence or credit | Used for |
| --- | --- | --- | --- | --- |
| SVS 3912 | NASA visualization | https://svs.gsfc.nasa.gov/3912 | NASA/Goddard Space Flight Center Scientific Visualization Studio | Source images |
| SVS 5669 | NASA visualization (GEOS Aerosols) | https://svs.gsfc.nasa.gov/5669/ | NASA's Global Modeling and Assimilation Office (GMAO) and NASA's Scientific Visualization Studio (SVS) | Second source (one still) |
| SVS 4285 | NASA visualization (GPM IMERG precipitation) | https://svs.gsfc.nasa.gov/4285/ | NASA's Scientific Visualization Studio | Third source (30 hourly frames) |
| Tone.js 15.1.22 | Web Audio library | https://tonejs.github.io | MIT | Synthesising and timing every sound in the app |
| React 19.3.1 | UI library | https://react.dev | MIT | The app's interface |
| Atkinson Hyperlegible Next 5.3.0 | Font (via Fontsource) | https://github.com/googlefonts/atkinson-hyperlegible-next | SIL Open Font License 1.1, © The Atkinson Hyperlegible Next Project Authors | Text in the app and listening game |
| Atkinson Hyperlegible Mono 5.3.0 | Font (via Fontsource) | https://github.com/googlefonts/atkinson-hyperlegible-next-mono | SIL Open Font License 1.1, © The Atkinson Hyperlegible Mono Project Authors | Numbers and readouts |
| Google Fonts | Font service | https://fonts.google.com | Google service | Loads the two fonts in the listening game page |
| Vite 8.3.8 | Build tool | https://vite.dev | MIT | Running and building the app |
| TypeScript 7.0.2 | Programming language | https://www.typescriptlang.org | Apache-2.0 | App code and type checks |
| Vitest 5.1.0 | Test runner | https://vitest.dev | MIT | App unit tests |
| Playwright 1.65.1 | Browser test tool | https://playwright.dev | Apache-2.0 | Browser tests of the app |
| Ajv 8.20.0 | JSON Schema validator | https://ajv.js.org | MIT | Checking data files against `contracts/` in tests |
| GitHub Pages and Actions | Hosting and automation | https://pages.github.com | GitHub service | Testing and publishing the app |
| Python 3.14 | Programming language | https://www.python.org | PSF License | Preparing images and measuring alignment |
| NumPy 2.5.4 | Python library | https://numpy.org | BSD-3-Clause | Array maths |
| OpenCV (opencv-python 5.0.0) | Python library | https://opencv.org | Apache-2.0 | Reading frames, image gradients, masks |
| Matplotlib 3.11.2 | Python library | https://matplotlib.org | Matplotlib License (PSF-based) | Figures in the science review |
| Pillow 13.0.0 | Python library | https://python-pillow.org | MIT-CMU | Reading frames in `check_motion.py`, preview images |
| pytest 9.2.0 | Test runner | https://pytest.org | MIT | Python tests |
| jsonschema 4.26.0 | Python library | https://python-jsonschema.readthedocs.io | MIT | Checking `scene.json` and `features.json` against `contracts/` |
| Claude / Claude Code | AI tool | https://claude.ai | — | See "Use of artificial intelligence" and `AI_USE.md` |

Versions checked on 15 Nov 2026 (web: installed packages from `package-lock.json`; Python: installed
packages). The app's only image is an SVS 3912 frame, every sound is synthesised by our own code with
Tone.js, and its only fonts are the two above. The video is NOT CHECKED YET (not made yet).

## Team contributions — each person writes their own line, roles not names

- Developer A: ____
- Developer B: ____
- Student A: wrote `prepare_scene.py`, which turns NASA frames and approved circles into the scene files and masks the measurement and app read, for three sources (ocean currents, aerosols, rain); checked every source and region (camera, land, labels, dates); built the 3D globe page; and wrote the NASA data, tools and references sections.
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
