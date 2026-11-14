# Student A — submission worksheet

Status: draft

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
| Which frames we used (first, last, how many) | ____ |
| Region A: name and pixel box | ____ |
| Region B: name and pixel box | ____ |
| What we excluded with masks (labels, colour bar, land…) | ____ |
| Credit text, copied exactly | NASA/Goddard Space Flight Center Scientific Visualization Studio |
| Date you checked the page | ____ |

Write 2–3 sentences for the form:

> We used ____ from NASA's Scientific Visualization Studio (SVS ____). It shows ____ from the
> ____ model for ____. We used ____ frames and compared two regions: ____ and ____.

## Part 2 — References (draft Sat 6 PM, final Sun 4 PM)

Every outside thing in the project. Ask Developer B for the library list (`web/package.json`)
and Developer A for the Python list (`requirements.txt`).

| Name | What it is | Link | Licence or credit | Used for |
| --- | --- | --- | --- | --- |
| SVS 3912 | NASA visualization | https://svs.gsfc.nasa.gov/3912 | NASA/GSFC SVS | Source images |
| ____ | library | ____ | ____ | ____ |
| ____ | library | ____ | ____ | ____ |
| ____ | AI tool | ____ | — | see AI_USE.md |

Check: does the app or video contain any image, sound or font that is not in this table? ____

## Part 3 — Tools, languages, hardware (draft Sat 6 PM, final Sun 2 PM)

Ask each teammate what they actually used. Delete anything we did not use in the end.

- Languages: ____
- Python libraries: ____
- Web libraries: ____
- Hardware (only if it is in the final demo): ____
- Other tools (recording, editing, design): ____

## Part 4 — Your contribution (final Sun 4 PM)

Two sentences, no name:

> Student A wrote ____, which ____. It was tested by ____ and catches ____.

Your AI-use line for `AI_USE.md`: I used ____ to ____. I checked it by ____.

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
