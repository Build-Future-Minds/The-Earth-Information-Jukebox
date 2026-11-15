# Globe spotlight (prototype)

Owner: Student A. For Dev A and Dev B to take from later. **Not part of the app yet**: it is a
separate page, `web/globe.html`, and `index.html` does not link to it.

Run it: `cd web && npm run dev`, then open `http://localhost:5173/globe.html`.
After a merge to `main` it is also published at `.../globe.html` next to the app.

## What it does

- **Two NASA sources**, chosen at the top: Ocean currents (SVS 3912, `data/`) and Aerosols
  (SVS 5669, one still, `data/aerosols/`). Each keeps its own picture, circles, land rule and
  credit. Alignment numbers are never compared between sources (Dev A, 15 Nov). The aerosol
  source shows "not measured yet" until `data/aerosols/features.json` exists.
- The NASA frame (`data/preview.jpg`) wrapped on a 3D globe. Drag it, or focus it and use the arrow
  keys (Shift for bigger steps). It only moves when you move it.
- Zoom from 0.6× to 6×: mouse wheel or trackpad, two-finger pinch, `+` / `-` keys (`0` resets) or the
  buttons on the globe. Turning slows down as you zoom in.
- A **spotlight**: a candidate region. Sliders set its longitude, latitude and radius. Buttons jump to
  the two approved regions and show their measured alignment from `data/features.json`.
- The spotlight is a **brighter patch** covering the **exact pixel circle** that would be measured
  (scene schema 0.2), worked out in frame pixels, not on the sphere. Near the poles it looks like an oval or teardrop on the globe because the
  flat map stretches east–west there (Dev A's map-stretch point).
- The centre can't go within one radius of the map's edges: about 10.7° either side of the 180° line
  and of each pole for radius 61. Those strips are hatched on the globe and explained under the
  sliders. Regions there would need a scene format change (wrapping across the edge).
- A readout in `scene.json` form (`center_px`, `radius_px`, `box_px`), a rough land share (warns
  above 50%, where `prepare_scene.py` would stop), and **Copy region** for Dev A.
- A night sky behind the globe (stars, a faint Milky Way, a blue atmosphere glow). It is decoration,
  not data. The stars turn with the globe when you drag it and twinkle gently, except when the
  system asks for reduced motion.
- Drawn on demand: a frame only when something changes. The stars twinkle at about 6 frames a
  second, and not at all when the tab is hidden, the globe is off screen or reduced motion is on.
- Keys leave browser shortcuts alone (Ctrl/Cmd + and − still zoom the page). The globe is described
  by the instructions (`aria-describedby`), and `GlobeView` frees its WebGL resources on unmount.
- No new libraries: plain WebGL2, so it still works offline.

## Files

| File | What it is |
| --- | --- |
| `src/globe/geo.ts` | Map maths: lon/lat ↔ pixels, bounding square, slider limits, land share, region JSON. Tested in `geo.test.ts`. |
| `src/globe/globeRenderer.ts` | The WebGL globe, the spotlight shader and the night sky |
| `src/globe/GlobeView.tsx` | React component: drag, arrow keys and zoom. Props: `imageUrl`, `frame`, `spot`, `faceSpotToken`, `label` |
| `src/globe/GlobePage.tsx` | The prototype page: source choice, sliders, presets, readout |
| `src/globe/sources.ts` | The sources the globe can show (ocean from `data/`, aerosols from `data/aerosols/`) |

## For Dev B

`GlobeView` can replace or sit beside `SceneView`: pass the active region as `spot`. One open
question for Student B and Dev B: the spotlight brightens the NASA image inside the circle (and
the rest is very slightly darker), which bends DESIGN.md's "image owns colour" rule.

## For Dev A

The spotlight is not measured live. **Copy region** gives a region you can add to a draft scene and
run through `features.py`. A live score in the browser would mean porting the alignment measure to
TypeScript; worth it only if the team wants free exploration in the final app.
