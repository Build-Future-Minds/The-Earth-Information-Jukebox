# Four-Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the one-page Earth Sonata app into four hash views (Listen, Compare, How it's made, Play along) with an Ocean / Aerosols source choice, icon buttons and page links, without losing any keyboard, screen-reader or honesty behaviour.

**Architecture:** One React app. `location.hash` picks the view, and the player (Transport, UserVoice) stays owned by `App`. Every view change calls the same stop as the Stop button. A new `data/sources.ts` loads every source (ocean `data/`, aerosols `data/aerosols/`, or practice only), and every comparison takes one source, so regions from two pictures can never meet.

**Tech Stack:** React 19, TypeScript, Vite, Tone.js, Vitest (pure-function tests, node environment, no DOM library), Playwright (browser tests, always on the practice data).

**Spec:** `docs/superpowers/specs/2026-11-15-four-page-redesign-design.md`

## Global Constraints

- No new dependencies (no router, icon or UI library). Icons are inline SVG.
- Hash views: `#listen` (default and fallback), `#compare`, `#how`, `#play`. Link labels: "Listen", "Compare", "How it's made", "Play along". `document.title` is "<label> · Earth Sonata".
- Changing view = Stop: the Earth voice stops and every held melody note is released. Region, source, speed and volume are kept.
- Region letters: ocean A, B; aerosols C, D; practice A, B. Aerosol regions use the neutral style (ink and white), never violet or rose.
- No sentence, table or curve may pair regions from two sources.
- SVS 5669 is described as a "challenge resource" (not EIC), credit "NASA's Global Modeling and Assimilation Office (GMAO) and NASA's Scientific Visualization Studio (SVS)".
- Credit stays directly under every picture. No sound before a button press. Esc stops from anywhere. Missing data is never drawn or said as zero.
- Visible button text is the accessible name: "Play", "Pause", "Stop", "Replay", "Explain", "Sound".
- Styling uses DESIGN.md (Tide Table) tokens only.
- Browser tests run with `VITE_DATASET=practice` (one source). Aerosol behaviour is proven by unit tests.

## Review Focus

1. Changing view while playing, paused, or holding a melody key: silence within one beat, no stuck note (Task 4 test `view change silences everything`).
2. The back button or a typed garbage hash: the right view, or Listen; the back button also stops sound (Task 3 `viewFromHash` tests, Task 4 test `back button changes view and stops`).
3. Switching source while playing: sound stops, the region becomes the new source's first, and Explain never names the old source's region (Task 6 `selectSource` tests).
4. A one-frame source: the track loops one beat, the curve shows a dot and not an empty path, one date label (Task 1 and Task 8 tests).
5. Keyboard on Listen: page links, then Play; 1/2 only inside the region group; focus moves to the view heading on change (Task 4 tests).

---

## Phase 1: works on today's `main` (no need to wait for #34)

### Task 1: Sources module

**Files:**
- Create: `web/src/data/sources.ts`
- Create: `web/src/data/sources.test.ts`
- Modify: `web/src/globe/sources.ts` (build `GLOBE_SOURCES` from `SOURCES`; keep its exported shape)
- Modify: `web/src/components/ExploreControls.tsx:25` (`regionLabel` gains a first-letter parameter)

**Interfaces:**
- Produces:
  - `type SourceKey = 'ocean' | 'aerosols' | 'practice'`
  - `interface Source extends Dataset { key: SourceKey; label: string; firstLetter: 'A' | 'C'; regionStyle: 'hue' | 'neutral'; resource: 'eic' | 'challenge' | 'practice'; landRule: LandRule }` (`label` is one word: "Ocean", "Aerosols", "Practice")
  - `const SOURCES: Source[]` (practice mode: `[practice]`; otherwise `[ocean]`, plus `aerosols` when `data/aerosols/scene.json` and `features.json` exist)
  - `function sourceByKey(key: SourceKey): Source` (unknown key → `SOURCES[0]`)
  - `function regionLetter(source: Source, regionId: string): string`
  - `function regionLabel(regions: Region[], id: string, firstLetter = 'A'): string` in ExploreControls ("Region C")
  - `function otherRegionOf(source: Source, regionId: string): Region | undefined` (only that source's regions; `undefined` unless the source has exactly two)
  - `function dayLabels(track: EarthTrack): (string | null)[]` (one entry per track step: "25 Mar" on the first step of each UTC day, else `null`; a step with no `source_time` gives `null`)

- [ ] **Step 1: Write the failing tests** in `sources.test.ts`

```ts
it('lists ocean then aerosols', () => expect(SOURCES.map((s) => s.key)).toEqual(['ocean', 'aerosols']));
it('letters come from the source', () => {
  const [ocean, aero] = SOURCES;
  expect(ocean.scene.regions.map((r) => regionLetter(ocean, r.id))).toEqual(['A', 'B']);
  expect(aero.scene.regions.map((r) => regionLetter(aero, r.id))).toEqual(['C', 'D']);
});
it('aerosols are neutral and a challenge resource', () => {
  const aero = sourceByKey('aerosols');
  expect([aero.regionStyle, aero.resource, aero.label]).toEqual(['neutral', 'challenge', 'Aerosols']);
  expect(sourceByKey('ocean').resource).toBe('eic');
});
it('the other region always comes from the same source', () => {
  for (const s of SOURCES) for (const r of s.scene.regions) {
    const o = otherRegionOf(s, r.id)!;
    expect(s.scene.regions).toContain(o);
    expect(o.id).not.toBe(r.id);
  }
});
it('a comparison across sources finds nothing', () => {
  const ocean = sourceByKey('ocean'), aero = sourceByKey('aerosols');
  const step = ocean.features.steps.find((s) => s.status === 'ok')!;
  expect(stepAtSameMoment(ocean.features.steps, step, aero.scene.regions[0].id)).toBeNull();
});
it('a one-frame source loops one beat', () => {
  const aero = sourceByKey('aerosols');
  const track = buildEarthTrack(aero.features, aero.scene.regions[0].id);
  expect(track.steps).toHaveLength(1);
  expect(track.length).toBe(aero.features.step_seconds);
  expect(track.steps[0].events).toHaveLength(2);
});
it('day labels mark each new day', () => {
  const ocean = sourceByKey('ocean');
  const labels = dayLabels(buildEarthTrack(ocean.features, ocean.scene.regions[0].id)).filter(Boolean);
  expect(labels[0]).toBe('25 Mar');
  expect(new Set(labels).size).toBe(labels.length);
  const aero = sourceByKey('aerosols');
  expect(dayLabels(buildEarthTrack(aero.features, aero.scene.regions[0].id))).toEqual(['19 Aug']);
});
```

- [ ] **Step 2: Run** `cd web && npx vitest run src/data/sources.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement** `sources.ts`. Reuse `dataset.ts`'s `import.meta.glob` pattern for `data/aerosols/`. Ocean and practice come from `ACTIVE`; keep `ACTIVE` exported for existing code. Use `landRule` values from `globe/sources.ts` (ocean `OCEAN_LAND`, aerosols `[30, 95, 12]`). Then make `globe/sources.ts` map `SOURCES` to `GlobeSource`, keeping its `note` strings.
- [ ] **Step 4: Run** `npx vitest run` and `npm run build`. Expected: all pass, `tsc` clean.
- [ ] **Step 5: Commit** `feat(data): one sources module for ocean, aerosols and practice`

### Task 2: Contract test covers every source

**Files:**
- Modify: `web/src/data/contract.test.ts:17-20` (loop over `SOURCES` as well as practice)

**Interfaces:** Consumes `SOURCES` (Task 1).

- [ ] **Step 1: Change the loop** to `[['practice', mockScene, mockFeatures], ...SOURCES.map((s) => [s.key, s.scene, s.features])]`. Keep every existing assertion. This closes the #32 follow-up (no automated check of `data/aerosols/`).
- [ ] **Step 2: Run** `npx vitest run src/data/contract.test.ts`. Expected: PASS, with "aerosols scene.json is valid" in the list.
- [ ] **Step 3: Commit** `test(data): contract test covers the aerosol source`

### Task 3: Views from the hash

**Files:**
- Create: `web/src/views.ts`
- Create: `web/src/views.test.ts`

**Interfaces:**
- Produces:
  - `type View = 'listen' | 'compare' | 'how' | 'play'`
  - `const VIEWS: { key: View; label: string }[]` in that order, with the labels from Global Constraints
  - `function viewFromHash(hash: string): View`
  - `function useView(): View` (React hook: reads `location.hash` and updates on `hashchange`)

- [ ] **Step 1: Write the failing tests**

```ts
it.each([['#compare', 'compare'], ['#how', 'how'], ['#play', 'play'], ['#listen', 'listen'],
         ['', 'listen'], ['#', 'listen'], ['#nope', 'listen'], ['#Compare', 'listen'], ['#compare?x=1', 'listen']])(
  'viewFromHash(%j) is %s', (hash, view) => expect(viewFromHash(hash)).toBe(view));
it('labels in order', () => expect(VIEWS.map((v) => v.label)).toEqual(['Listen', 'Compare', "How it's made", 'Play along']));
```

- [ ] **Step 2: Run** `npx vitest run src/views.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `views.ts`. An exact match on the key only.
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat: views from the URL hash`

Open PR 1 (Tasks 1–3) to `main`.

---

## Phase 2: after #34's app part is on `main`

Start from `main` once Student B's `sb/tide-table-app` PR has merged. Each task below is a separate PR.

### Task 4: View shell, page links, stop on change

**Files:**
- Modify: `web/src/App.tsx` (shell: rail with title, `PageLinks`, the view's rail content, `ThemeSwitch`; main shows the view)
- Create: `web/src/components/PageLinks.tsx`
- Create: `web/src/views/ListenView.tsx`, `CompareView.tsx`, `HowView.tsx`, `PlayView.tsx` (this task only moves existing components into them, as below)
- Modify: `web/e2e/helpers.ts` (`openApp(page, view: View = 'listen')` goes to `/#${view}`)
- Modify: `web/e2e/earth.e2e.ts`, `visuals.e2e.ts`, `melody.e2e.ts` (each test opens the view that now shows what it checks)

**Interfaces:**
- Consumes: `useView`, `VIEWS` (Task 3).
- Produces: `PageLinks({ current }: { current: View })`. Each view gets `ViewProps = { source: Source; regionId: string; playState: PlayState; sounding: TrackStep | null; track: EarthTrack; player: { start(): void; pause(): void; stop(): void; replay(): void; seek(t: number): void; getPosition(): number; setSpeed(s: number): void; setVolume(db: number): void }; onRegion(id: string): void }`, exported from `views/types.ts`.

What moves where in this task: Listen gets SceneView, NowPlaying, BeatTrack and Explain. The status line and the missing-data alert move into the shell, under the main column's top, on every view. Compare gets RegionCloseups and RhythmsPlot. How it's made gets LookingAt and the source footer. Play along gets its own Play/Stop for the Earth voice, MelodyPad and PracticeGame.

- [ ] **Step 1: Write the new browser tests** in `web/e2e/views.e2e.ts`
  - `page links switch views and the URL`: click "Compare", expect URL `#compare`, heading "Compare" focused, `document.title` "Compare · Earth Sonata", and the link has `aria-current="page"`.
  - `view change silences everything`: on `#listen` start; hold melody key `a` on `#play`; click "Listen", then expect `earthPeakAhead(page)` < 0.05 and `melodyVoices(page)` 0.
  - `back button changes view and stops`: Listen → start → click "Compare" → `page.goBack()`; expect URL `#listen`, status "Stopped".
  - `Esc stops on every view`: on each view with sound, press Escape; silence.
  - `Tab order on Listen: page links, then Play`: from page load, Tab 4 times through the links, then the next Tab reaches "Play" (replaces the old "first Tab reaches Start" test). With real data the picture choice sits between them; practice data has none.
  - `status line on every view`: start on `#play`; the status role reads "Playing Region A".
- [ ] **Step 2: Run** `npx playwright test e2e/views.e2e.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the shell. One `stopAll` callback, used by Stop, Esc and a `useEffect` on `view`. On a view change: `stopAll()`, `window.scrollTo(0, 0)`, focus the view's `h1` (`tabIndex={-1}`), set `document.title`. Use the "Start" / "Play" wording as it stands until Task 5.
- [ ] **Step 4: Update the existing 26 tests** so each opens the view that shows what it checks (melody tests on `#play`, which has its own Earth Play). Every assertion stays as it was.
- [ ] **Step 5: Run** `npx vitest run && npx playwright test && npm run build`. Expected: all pass.
- [ ] **Step 6: Commit and open PR** `feat: four views with page links; changing view stops the sound`

### Task 5: Icon buttons, sound settings, DESIGN.md additions

**Files:**
- Create: `web/src/components/IconButton.tsx`, `web/src/components/icons.tsx` (`PlayIcon`, `PauseIcon`, `StopIcon`, `ReplayIcon`, `ExplainIcon`, `SoundIcon`: 20px, `currentColor`, `aria-hidden`)
- Modify: `web/src/components/ExploreControls.tsx` (icon buttons; a "Sound" toggle shows speed buttons ½× ¾× 1× 1¼× and a volume slider with no dB readout)
- Modify: `DESIGN.md` (icon button; page links and the Tab-order rule "page links, then Play"; neutral C/D rings, with the Off-Scale Rule applied to each picture's own colours; the one-moment dot; one short layout paragraph per view)
- Modify: `web/e2e/*.ts` and `helpers.ts` (button names "Start" → "Play")

**Interfaces:** Produces `IconButton({ icon, label, pressed?, expanded?, primary?, onClick })`. The label is rendered visibly under the icon and is the accessible name.

- [ ] **Step 1: Write the browser tests**: `play controls are icon buttons with one-word names` (buttons named exactly Play, Stop, Replay, Explain, Sound, each with an `svg` child); `Sound shows speed and volume` (Sound has `aria-expanded=false`, click, then the "1×" button has `aria-pressed=true` and a slider named "Volume" is present).
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement**, then update the "Start" names in the existing tests.
- [ ] **Step 4: Run** the full suite and the build. Expected: PASS.
- [ ] **Step 5: Commit and open PR**. Ask Student B to review the DESIGN.md part.

### Task 6: Source choice, region thumbnails, clickable circles

**Files:**
- Create: `web/src/components/SourceChoice.tsx` (radio group named "Picture": a thumbnail of each source's picture and its one-word label; not rendered when `SOURCES.length === 1`)
- Create: `web/src/data/selection.ts`, `web/src/data/selection.test.ts`
- Modify: `web/src/components/ExploreControls.tsx` (region choice shows a round crop of each circle, the letter badge and the short name; still a radio group)
- Modify: `web/src/components/SceneView.tsx` (`onSelect(regionId)` when a circle is clicked; circles are not Tab stops; neutral style when `source.regionStyle === 'neutral'`)
- Modify: `web/src/App.tsx` (`sourceKey` state; the source choice in the rail on Listen and Compare)

**Interfaces:**
- Produces: `function selectSource(key: SourceKey): { sourceKey: SourceKey; regionId: string }` (the first region of that source), and `function thumbCss(region: Region, frame: { width: number; height: number }, size: number): { backgroundSize: string; backgroundPosition: string }` (centres the circle in a `size`-px square).

- [ ] **Step 1: Write the failing unit tests**: `selectSource('aerosols')` returns the aerosol source's first region id; `selectSource('ocean')` returns the ocean's; `selectSource('practice' as SourceKey)` with no practice source falls back to `SOURCES[0]`; `thumbCss` for a region at `[100, 50]`, r 25, frame 400×200, size 50 gives `backgroundSize: '800px 400px'` and `backgroundPosition: '-150px -50px'`.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement.** Switching source calls `stopAll()`, then applies `selectSource`. The Explain panel and the comparison take the current `source` only, via `otherRegionOf`.
- [ ] **Step 4: Browser test** `clicking a circle on the picture selects that region` (practice data).
- [ ] **Step 5: Run** everything and the build. **Commit and open PR.**

### Task 6b: Tabs and player bar (layout change, Dev B 15 Nov)

**Files:** `web/src/App.tsx`, `web/src/components/PageLinks.tsx` (tabs with icons), `web/src/components/ExploreControls.tsx` (split into `PlayerBar` and `RegionChoice`), `web/src/views/ListenView.tsx`, `web/src/styles.css`, `DESIGN.md` (Layout, Page links, Tab order), `web/e2e/layout.e2e.ts`.

- [ ] Browser tests first: `page links are tabs with icons`; `Listen fits one screen at 1440x900` (scrollHeight <= innerHeight + 2); `on a phone the tabs sit at the bottom` (390x844: nav bottom >= 840); `on a phone the picture starts on the first screen` (picture top < 500); `the player bar holds the controls and the timeline`; `Stop shows its Esc hint`; Tab order updated to tabs, theme, region, then Play.
- [ ] Implement, update the existing tests' Tab order, run everything, commit, open PR.

### Task 7: Dates under the beats, trimmed Explain

**Files:**
- Modify: `web/src/components/BeatTrack.tsx` (the hint paragraph becomes a two-mark legend; `dayLabels` under the beats; the current day label gets weight 700 while playing)
- Modify: `web/src/components/RhythmExplanation.tsx` and `RhythmExplanation.test.ts` (`explain()` drops "(rule: …)"; the panel drops the `DISCLAIMER` paragraph; `RULE_TEXT` and `DISCLAIMER` stay exported for Task 9)

- [ ] **Step 1: Update the unit test:** `explain()` output does not contain "rule:", and still contains "Alignment is" and the comparison sentence.
- [ ] **Step 2: Run** it. Expected: FAIL. **Step 3: Implement.** **Step 4: Run** everything. Expected: PASS.
- [ ] **Step 5: Commit and open PR.**

### Task 8: Compare view

**Files:**
- Create: `web/src/components/tideCurve.ts`, `web/src/components/tideCurve.test.ts`
- Modify: `web/src/components/RhythmsPlot.tsx` (use `tideCurve`; draw `dots` as 4px circles labelled "one moment" when the source has one frame)
- Modify: `web/src/views/CompareView.tsx` (per region: close-up, giant weighted numeral, alignment value, a Play/Stop toggle for that region (`aria-pressed` while that region plays), and that region's rhythm row on the shared clock; below: tide table and curves for the current source only; no paragraphs)
- Modify: `web/src/components/RegionCloseups.tsx` (remove the "Dev A's measurement" note)

**Interfaces:** Produces `function tideCurve(steps: Step[], width: number, height: number): { path: string; dots: { x: number; y: number }[] }`. An ok step with no ok neighbour (including a one-frame source) goes in `dots` and starts no path segment. A missing step lifts the pen.

- [ ] **Step 1: Write the failing tests**: one ok step → `path === ''` and one dot at `x 0`; ok, ok, missing, ok → path has one `M…L…` segment and one dot for the last step; all missing → no path, no dots.
- [ ] **Step 2: Run.** FAIL. **Step 3: Implement.** **Step 4: Run** everything, plus the browser tests `Compare shows the tide table and a play toggle per region` and the existing `both rhythms are drawn on one time line, from the same rule as the sound` (now on `#compare`, reading the rows under the close-ups).
- [ ] **Step 5: Commit and open PR.**

### Task 9: How it's made view

**Files:**
- Modify: `web/src/views/HowView.tsx`

Content, in order:
1. The three-picture strip: today's tick key and the two close-up crops as placeholders, captions "The picture", "Which way the lines run", "The rhythm". Student B's N1 pictures replace these later.
2. "The rule: " + `RULE_TEXT`.
3. The three honesty lines from `DISCLAIMER`, one per line.
4. One credit block per `SOURCES` entry: title, credit, data kind, limitations, and "NASA Earth Information Center visualization" or "Challenge resource (not in the EIC gallery)" from `resource`.

- [ ] **Step 1: Browser test** `How it's made shows the rule, the honesty lines and the credit`.
- [ ] **Step 2: Run.** FAIL. **Step 3: Implement.** **Step 4: Run** everything. **Step 5: Commit and open PR.**

### Task 10: Play along view with the lazy globe

**Files:**
- Modify: `web/src/views/PlayView.tsx` (Earth Play/Stop icon buttons for the current source and region; MelodyPad; the game card with a "Play the game" link to `tools/listening_game.html` and no quiz link; the globe section)
- Create: `web/src/globe/GlobeSection.tsx` (`GlobeView` plus one button per approved region of the current source; choosing one calls `onRegion(id)` and starts the Earth voice). Load it with `React.lazy`.
- Modify: `web/src/components/PracticeGame.tsx` (card version: art and one button)

- [ ] **Step 1: Browser tests**: `Play along has its own Earth Play and the melody keys`; `no link to the quiz player in the app`; `the globe loads only on Play along` (no globe chunk requested on `#listen`; on `#play` a canvas named "Globe of…" appears).
- [ ] **Step 2: Run.** FAIL. **Step 3: Implement.** **Step 4: Run** everything and the build; check that the main JS chunk does not grow by the globe's size. **Step 5: Commit and open PR.**

### Task 11b: No dead ends; accessibility on every page

- [ ] `globe.html` and the quiz player get a "← Back to Earth Sonata" link (the listening game has one).
- [ ] Keyboard and screen-reader check of every published page (app views, globe, listening game, quiz player): every control has a name, the focus order follows the screen, and nothing is reachable only by mouse. Fix what fails, each fix with a test.

### Task 11: Final pass

- [ ] Run `npx vitest run`, `npx playwright test` and `npm run build` on `main` after the last merge. Expected: all pass.
- [ ] By hand, with real data (`npm run dev` without `VITE_DATASET`): both sources, C/D neutral, no ocean numbers on the aerosol views, light and dark, a 390 px width.
- [ ] Update the planning page cards to done, and tell Student B the pages are ready for the five-second check (N6).
