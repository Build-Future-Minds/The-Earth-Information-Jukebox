# Earth Sonata app (`web/`)

Owner: Developer B. Controls and explanation components: Student B.

React + Vite + TypeScript, with Tone.js bundled locally. All sound is synthesised in the
browser. No server, no cloud service, works with Wi-Fi off once installed.

## Run it (from a clean copy)

You need **Node.js 22.12 or newer** (the LTS from https://nodejs.org works; `node -v` to check).

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

## Real data

Put `scene.json`, `features.json` and `preview.jpg` in the repo-root `data/` folder (see `data/README.md`).
The app picks them up automatically. Restart `npm run dev` after adding them.

## Use it without a mouse

| Key | Action |
| --- | --- |
| Tab / Shift+Tab | Move between controls |
| Enter or Space | Press the focused button |
| Arrow keys, or 1 / 2 | On the Region choice: choose Region A or B (playback continues at the same moment) |
| Esc | Stop all sound |

No sound plays until you press Start.

## Where things are

| File | What it does |
| --- | --- |
| `src/data/dataset.ts` | Chooses `data/` when both real files exist, otherwise the practice files |
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
- **`npm ci` fails:** check `node -v` is 22.12 or newer, then delete `node_modules` and retry.

## Software used (for References)

For Student A: the rows below use the same columns as the References table in
`docs/submission/student_a_worksheet.md` (part 2), so they can be copied straight in.
Versions are from `web/package-lock.json` on 14 Nov 2026. Re-check with
`npm ls --depth=0` before final submission.

| Name | What it is | Link | Licence or credit | Used for |
| --- | --- | --- | --- | --- |
| Tone.js 15.1.22 | Web Audio library | https://tonejs.github.io | MIT | Synthesising and timing every sound in the app |
| React 19.3.1 | UI library | https://react.dev | MIT | The app's interface |
| Vite 8.3.8 | Build tool | https://vite.dev | MIT | Running and building the app |
| TypeScript 7.0.2 | Programming language | https://www.typescriptlang.org | Apache-2.0 | App code and type checks |
| Vitest 5.1.0 | Test runner | https://vitest.dev | MIT | Unit tests |
| Ajv 8.20.0 | JSON Schema validator | https://ajv.js.org | MIT | Checking data files against `contracts/` in tests |
| GitHub Pages and Actions | Hosting and automation | https://pages.github.com | GitHub service | Testing and publishing the app |

Not listed: build-only helpers (`@vitejs/plugin-react`, `@types/*`) and their own dependencies.
They are in `package-lock.json` if the form asks for everything. The app makes no network
requests and uses no AI or cloud service in the audio path.
