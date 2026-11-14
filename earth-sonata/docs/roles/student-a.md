# Student A — NASA images and preparation

Your briefing page is page 4 of `docs/briefing/Earth_Sonata_Team_Briefing.pdf`. This is the technical companion.
**You own working Python code and its tests.**

## Files you own

- `analysis/prepare_scene.py` — extracts approved images, applies exclusion masks, writes `scene.json`
- `analysis/test_prepare_scene.py` — your tests
- `assets/source_manifest.json` — the source-and-credit record (the briefing calls it `source_manifest.csv`; same job)
- Approved images, masks, previews, two still crops for the fallback
- `docs/submission/student_a_worksheet.md` and `docs/submission/slides_7.md`

## Start here

1. Open <https://svs.gsfc.nasa.gov/3912>. Check the manifest entry against the page.
2. Find it in the Earth Information Center collection and paste that link into the manifest.
3. Download a short run of the 2048×1024 `orig` frames and `flat_ecco2_dates.txt` into
   `assets/frames/svs3912/` (this folder is not committed).
4. Propose a short section and two regions. Show Dev A.
5. Meanwhile, get `prepare_scene.py` working on a practice image labelled `TEST INPUT`.

## What "finished" means

- One documented command prepares the material
- You can trace any app image to its original file and model timestamp
- A bad file gives an error that says what to do
- An unusable frame keeps its place, with a missing measurement and a reason
- Dev A approves what is measured; Dev B can load your outputs
- You can show one valid case and one missing-data case

## Things to check and write down

- Do labels, the colour bar, date text or land sit inside a region? Mask them out.
- Is anything moving that should not (zoom, fade, overlay)? Compare the land in two frames far apart.
- Where is 0° longitude on this map? You need it to place the regions.
- It is ECCO2 **model output**, not a satellite photo.

## Hand-offs

- To Dev A: source, section and regions for approval — before final processing
- To Dev B and Student B: checked outputs plus three sentences on how to use them
- From Dev B: try the app setup instructions from a clean copy and report what broke

## Submission jobs (about 1 hour Saturday, 2 hours Sunday)

Fill in `docs/submission/student_a_worksheet.md`: NASA data used, References, tools list,
your contribution line, the final link check. Build the 7-slide backup deck from `slides_7.md`.

## At review (90 seconds)

One successful run, one problem your code catches, how your output reaches the app.

## Privacy

Git name "Student A". No personal details in commits, files or screenshots.
