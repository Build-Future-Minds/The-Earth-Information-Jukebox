# Earth Sonata app (`web/`)

Owner: Developer B. Controls and explanation components: Student B.

React + Vite + TypeScript, with Tone.js bundled locally. All sound is synthesised in the
browser. No server, no cloud service, works with Wi-Fi off once installed.

## Run it (from a clean copy)

You need **Node.js 20 or newer** (`node -v` to check; install from https://nodejs.org).

```bash
git clone https://github.com/Build-Future-Minds/The-Earth-Information-Jukebox.git
cd The-Earth-Information-Jukebox/web
npm ci          # installs exact versions from package-lock.json (needs internet once)
npm run dev     # prints a local address, usually http://localhost:5173
```

Open the address it prints. You should see the app with a yellow **PRACTICE DATA** banner
until real data is connected.

| Command | What it does |
| --- | --- |
| `npm test` | Unit tests: the rhythm rule, missing steps, replay, and data against `contracts/` |
| `npm run build` | Type-check and build to `web/dist/` |
| `npm run preview` | Serve the built `dist/` locally (this is the **local fallback** for the demo) |

## Use it without a mouse

| Key | Action |
| --- | --- |
| Tab / Shift+Tab | Move between controls |
| Enter or Space | Press the focused button |
| 1, 2 | Choose Region A or B (playback continues at the same moment) |
| Esc | Stop all sound |

No sound plays until you press Start.

## Where things are

| File | What it does |
| --- | --- |
| `src/data/dataset.ts` | **The one place** that chooses which scene and features file the app plays |
| `src/audio/earthVoice.ts` | Turns `features.json` steps into Earth-voice notes, each with a `why` record |
| `src/audio/transport.ts` | Start, pause, stop, replay, region switch, speed, volume (Tone.js) |
| `src/components/ExploreControls.tsx` | Buttons, region choice, speed, volume (Student B) |
| `src/components/RhythmExplanation.tsx` | "Explain this rhythm", written from the notes now playing (Student B) |
| `src/components/SceneView.tsx` | Source image with the region boxes |

## Deploy

Every push to `main` runs the tests, builds, and publishes to GitHub Pages
(`.github/workflows/pages.yml`).

## Troubleshooting

- **No sound:** check the system volume and the Earth volume slider. Click the page once;
  browsers block audio until you interact.
- **`npm ci` fails:** check `node -v` is 20 or newer, then delete `node_modules` and retry.
