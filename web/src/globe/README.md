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
| `src/globe/geo.ts` | Map maths: lon/lat ↔ pixels, bounding square, slider limits, land share, region JSON; and the globe on screen (`viewRotation`, `globeScale`, `projectToScreen`), turning with the line, a circle's ground shape, the scan's shading rule. Tested in `geo.test.ts`. |
| `src/globe/globeRenderer.ts` | The WebGL globe, the spotlight shader, the picture scan's shader and the night sky |
| `src/globe/GlobeView.tsx` | React component: drag, arrow keys and zoom; the scan's marks layer and Turn with the line. Props: `imageUrl`, `frame`, `spot`, `faceSpotToken`, `label`, and `scan`, `follow`, `onFollowOff` for the scan |
| `src/globe/GlobeSection.tsx` | The app's Globe tab: the chosen picture on the globe, its regions, and the picture scan |
| `src/globe/GlobePage.tsx` | The prototype page: source choice, sliders, presets, readout |
| `src/globe/sources.ts` | The sources the globe can show (ocean from `data/`, aerosols from `data/aerosols/`) |

## The picture scan on the globe (Dev A, 15 Nov)

On the app's Globe tab, "Play the picture" plays the same scan as Play along (the same pixels, the
same score, the same player: `src/scan/`) and draws it round the globe. A vertical line on the flat
map is a meridian, so nothing about the sound changes. `globe.html` does not have the scan.

- **Drawn in the shader** (`uMode` 1 and 2), in frame pixels like the spotlight, so the globe shows
  exactly the cells being played: the part not played yet dimmed (0.42 toward black, soft edge), a
  white glow behind the line, the white line with a black edge at a constant width on screen (the
  shader turns map distances into screen distances with `dFdx`/`dFdy`), the white shape riding the
  line, and for the radar the dimmed outside and sector not reached yet, three range rings, the rim,
  the part of the rim passed, and the needle. Black and white only: the picture's colours are never
  changed. The spotlight, the 0.85 darkening and the blue rim tint are off while the scan shows.
  The spotlight code is unchanged (`uMode` 0).
- **Drawn in an SVG layer** over the canvas: the chime marks (round or diamond, as on the flat
  picture), the needle's ends and the compass letters. `projectToScreen` places them with the same
  rotation and scale the shader gets; marks on the far side are hidden.
- **Turn with the line** (a toggle, on each time a scan starts): the line sits 20° east of the middle,
  so the part already played is in view; a radar turns the globe once to its circle and zooms to it.
  Dragging, an arrow key or turning to a region turns it off. With reduced motion the globe only
  cuts, once per step of the low note (45° of longitude), and the line moves once a second.
- **The stars hold still** while the scan shows: the sky is drawn once into a texture and copied.
  Measured on 15 Nov in headless Chromium (software rendering): the sky alone takes 5.4 ms a frame at
  400 × 400 pixels and 20.2 ms at 800 × 800, and the scan redraws every frame.
- **A circle on the flat map is an oval on the globe**, and the radar's needle turns unevenly on it
  (about 30% faster near east and west on the Kuroshio circle). That is the true ground shape of the
  area the Earth voice measures; regions stay flat in version one.
- **For tests**, in development only: `window.__globe` gives what the globe shows (`state`), where a
  place is drawn (`project`), the drawn colour at a place (`probe`) and the WebGL renderer's name.
  In practice mode the globe wraps the TEST INPUT picture (240 × 120) so the browser tests can run.

## For Dev B

`GlobeView` can replace or sit beside `SceneView`: pass the active region as `spot`. One open
question for Student B and Dev B: the spotlight brightens the NASA image inside the circle (and
the rest is very slightly darker), which bends DESIGN.md's "image owns colour" rule.

## For Dev A

The spotlight is not measured live. **Copy region** gives a region you can add to a draft scene and
run through `features.py`. A live score in the browser would mean porting the alignment measure to
TypeScript; worth it only if the team wants free exploration in the final app.
