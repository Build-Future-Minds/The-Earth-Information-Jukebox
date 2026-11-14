# Student A — submission worksheet

Status: draft (parts 1–3 filled 14 Nov 2026; final checks Sun)

You already own the source record, so you own the parts of the submission that say
**where things came from**. Replace every `____`. If you do not know, write `NOT CHECKED YET`,
never a guess. About 1 hour Saturday, 2 hours Sunday. Your Python code still comes first.

## Part 1 — NASA data used (draft Sat 6 PM, final Sun 2 PM)

Start from `assets/source_manifest.json`. List only what the finished app actually uses.

| Question | Your answer |
| --- | --- |
| Title of the visualization | Global Sea Surface Currents and Temperature |
| NASA SVS ID and link | 3912 — https://svs.gsfc.nasa.gov/3912 |
| Is it in the Earth Information Center collection? Paste the link where you saw it. | Yes — listed under "EIC Beauty Pieces" at https://svs.gsfc.nasa.gov/gallery/earth-information-center/ (entry links to https://svs.gsfc.nasa.gov/3912/#media_group_349716; checked 2026-11-14) |
| Is it an observation, model output, or artistic rendering? | Model output (ECCO2) |
| What dates does the model run cover? | 25 Mar 2007 – 3 Mar 2008 |
| Exact file or frame set we downloaded | `orig` (2048x1024) frame set, `flat_global_ecco2_2028x1024.NNNNN.tif`, frames 23000–23116 (30 frames) + 25000; plus `flat_ecco2_dates.txt` and `sst_ecco2_cbar.png` |
| Which frames we used (first, last, how many) | 23000 to 23116, every 4th frame: 30 frames, model time 25 Mar 2007 12:00Z to 30 Mar 2007 11:42Z. (Frame 25000 was only used for the camera-motion check.) |
| Region A: name and pixel box | Kuroshio eddies east of Japan (swirly): circle centre [1872, 348], radius 61 px; `box_px` [1811, 287, 122, 122] |
| Region B: name and pixel box | Equatorial Pacific streaks (aligned): circle centre [271, 504], radius 61 px; `box_px` [210, 443, 122, 122] |
| What we excluded with masks (labels, colour bar, land…) | Everything outside the circle, and land plus a 3 px coast margin (0.2% of the Kuroshio circle, none in the equator circle). No labels, colour bar or date text appear in the `orig` frames (checked: no white or neutral-grey pixels in the whole frame), so none needed masking. |
| Credit text, copied exactly | NASA/Goddard Space Flight Center Scientific Visualization Studio |
| Date you checked the page | 14 Nov 2026 |

Write 2–3 sentences for the form:

> We used the "Global Sea Surface Currents and Temperature" visualization from NASA's Scientific
> Visualization Studio (SVS 3912). It shows modelled ocean surface currents, coloured by sea surface
> temperature, from the ECCO2 model for March 2007 to March 2008. We used 30 frames (25–30 March 2007)
> and compared two regions: eddies east of Japan in the Kuroshio and streaks in the equatorial Pacific.

## Part 2 — References (draft Sat 6 PM, final Sun 4 PM)

Every outside thing in the project. Ask Developer B for the library list (`web/package.json`)
and Developer A for the Python list (`requirements.txt`).

| Name | What it is | Link | Licence or credit | Used for |
| --- | --- | --- | --- | --- |
| SVS 3912 | NASA visualization | https://svs.gsfc.nasa.gov/3912 | NASA/Goddard Space Flight Center Scientific Visualization Studio | Source images |
| Tone.js 15.1.22 | Web Audio library | https://tonejs.github.io | MIT | Synthesising and timing every sound in the app |
| React 19.3.1 | UI library | https://react.dev | MIT | The app's interface |
| Vite 8.3.8 | Build tool | https://vite.dev | MIT | Running and building the app |
| TypeScript 7.0.2 | Programming language | https://www.typescriptlang.org | Apache-2.0 | App code and type checks |
| Vitest 5.1.0 | Test runner | https://vitest.dev | MIT | App tests |
| Ajv 8.20.0 | JSON Schema validator | https://ajv.js.org | MIT | Checking data files against `contracts/` in tests |
| GitHub Pages and Actions | Hosting and automation | https://pages.github.com | GitHub service | Testing and publishing the app |
| Python 3.14 | Programming language | https://www.python.org | PSF License | Preparing images and measuring alignment |
| NumPy 2.5.4 | Python library | https://numpy.org | BSD-3-Clause | Array maths |
| OpenCV (opencv-python 5.0.0) | Python library | https://opencv.org | Apache-2.0 | Reading frames, image gradients, masks |
| Matplotlib 3.11.2 | Python library | https://matplotlib.org | Matplotlib License (PSF-based) | Figures in the science review |
| Pillow 13.0.0 | Python library | https://python-pillow.org | MIT-CMU | Reading frames in `check_motion.py`, preview images |
| pytest 9.2.0 | Test runner | https://pytest.org | MIT | Python tests |
| jsonschema 4.26.0 | Python library | https://python-jsonschema.readthedocs.io | MIT | Checking `scene.json` and `features.json` against `contracts/` |
| Claude / Claude Code | AI tool | https://claude.ai | — | see AI_USE.md |

Versions: web from `web/package-lock.json` (Dev B's list in `web/README.md`), Python from the installed packages on 14 Nov 2026. Re-check before final submission.

Check: does the app or video contain any image, sound or font that is not in this table? App: no. Its only image is an SVS 3912 frame, text uses the viewer's own system font (no font files), and every sound is synthesised with Tone.js. Video: NOT CHECKED YET (not made yet).

## Part 3 — Tools, languages, hardware (draft Sat 6 PM, final Sun 2 PM)

Ask each teammate what they actually used. Delete anything we did not use in the end.

- Languages: Python, TypeScript, HTML and CSS, Bash (frame download script)
- Python libraries: NumPy, OpenCV, Matplotlib, Pillow, pytest, jsonschema
- Web libraries: Tone.js, React; build and test with Vite, Vitest, Ajv
- Hardware (only if it is in the final demo): NOT CHECKED YET (ask Dev B whether the MIDI piano is in the final demo)
- Other tools (recording, editing, design): Git and GitHub, GitHub Pages, VS Code. Recording and editing: NOT CHECKED YET (ask Student B)

## Part 4 — Your contribution (final Sun 4 PM)

Two sentences, no name:

> Student A wrote `prepare_scene.py`, which turns 30 NASA frames and the two approved circles into
> the scene file and masks that the measurement and the app both read. It was tested by 11
> automated tests (a good input, six bad inputs, and broken frames run all the way through the
> measurement) and catches missing or broken input files, circles off the map or on land, and
> unusable frames, which keep their place and become a clear "missing" step.

(DRAFT — Student A to read and confirm before Sun 4 PM.)

Your AI-use line for `AI_USE.md`: I used Claude Code to draft the frame checks, `prepare_scene.py`
and its tests, and the source records. I checked it by ____.

## Part 5 — Final link check (Sun 8 PM)

Open each link in a private window, signed out. Then on a phone.

| Link | Opens signed out? | Opens on phone? | Checked at |
| --- | --- | --- | --- |
| Project repo | ____ | ____ | ____ |
| Demo video or slides | ____ | ____ | ____ |
| Live app (if any) | ____ | ____ | ____ |

- [ ] Video length is 30 seconds or less (check the file itself)
- [ ] NASA credit is visible in the app and in the demo
- [ ] No student names, faces or voices anywhere
- [ ] Told Mr. E the result

## Also yours: the 7-slide backup deck

See `slides_7.md`. Draft Sun 10 AM, final Sun 4 PM.
