# Earth Sonata: Play the Planet

NASA Space Apps Challenge 2026 — *The Earth Information Jukebox*

**Our goal:** a small app that lets a visitor compare two regions of a NASA ocean
visualization by hearing a rhythm, then understand which image pattern produced the sound.

**Status:** app runs on practice data (Checkpoint 1). Setup: [`web/README.md`](web/README.md).

**Try it:** `cd web && npm ci && npm run dev`

## Read in this order

1. `docs/briefing/Earth_Sonata_Team_Briefing.pdf` — read page 1 together, then your own page
2. `docs/roles/` — the technical companion to your briefing page
3. `docs/CONTRACT.md` — the shared input/output format
4. `TASKS.md` — what is due at each checkpoint
5. `docs/submission/` — what we turn in to NASA and who drafts each part

## Stated honestly

- Source: [NASA SVS 3912, Global Sea Surface Currents and Temperature](https://svs.gsfc.nasa.gov/3912).
  It is a visualization of **ECCO2 model output** (25 Mar 2007 – 3 Mar 2008), not an observation.
- The rhythm rule is **a choice we made**: more aligned lines, more even pulse.
- It describes the rendered image, not water speed, turbulence or ocean health.
- Images are measured ahead of time; the sound is made live in the app.

## Repository map

| Path | What lives here | Owner |
| --- | --- | --- |
| `docs/briefing/` | The Team Briefing (the document that leads) | Dev A |
| `docs/roles/` | One technical brief per member | each member |
| `docs/mapping_spec.md` | The one rhythm rule and its tests | Dev A |
| `docs/CONTRACT.md`, `contracts/` | Shared format and JSON Schemas | Dev A + Dev B |
| `docs/submission/` | Student worksheets, video script, slide outline, project page draft | Students draft, Dev A submits |
| `docs/SUBMISSION_CHECKLIST.md` | Rules and pre-submit checks | Dev A |
| `docs/ACCESSIBILITY_LOG.md` | Real test results | Student B |
| `fixtures/mock/` | **Practice data.** Not NASA data. | Student B |
| `assets/source_manifest.json` | Source-and-credit record | Student A |
| `analysis/` | `prepare_scene.py`, `features.py` and tests | Student A, Dev A |
| `tools/` | `build_listening_tasks.py` and tests | Student B |
| `web/` | The app | Dev B, Student B |
| `AI_USE.md` | Log of AI assistance for the form | everyone |

## Working rules

- Clone **outside** OneDrive, iCloud, Dropbox or any synced folder.
- NASA frames go in `assets/frames/` (not committed).
- Short branches, pull requests, one teammate reviews.
- No student names, faces or voices in anything public. See `CONTRIBUTING.md`.

## Credits

Visualization: NASA/Goddard Space Flight Center Scientific Visualization Studio.
