# Developer B: evidence of the main checks

The checks come from `docs/roles/developer-b.md`. Each row says how it was tested and what was
observed. Updated Sat 14 Nov, 3:30 PM. The app runs on **real NASA data** (`data/`, PR #8). The
browser tests run on the practice data (`fixtures/mock/`), because their expected rhythms come
from it, and the real data was checked in the browser by hand (below).

Run on 14 Nov 2026 with Chrome via Playwright (automated browser) on macOS, dev build and
production build.

## Rerun these checks yourself

```bash
cd web
npm test            # unit tests (67)
npm run test:e2e    # browser tests (26), real key presses; first time: npx playwright install chromium
```

Both run automatically on every pull request (`.github/workflows/ci.yml`). The browser tests
passed 60/60 when each was repeated 3 times (14 Nov), so they are not flaky on this machine.
Two of the bugs listed below were put back on purpose, and the tests failed each time. The first
tables were recorded by hand with one-off browser scripts before the suite existed. The suite now
covers every row (`web/e2e/`).

## How the sound was checked, not just the screen

In development builds only, `transport.ts` records every Earth note it sends to the synth, with
its exact audio time (`window.__earthNotes`). Tests read that log to check the rhythm. To check
silence, they read Tone's amplitude envelope for the next 200 ms. Production builds do not have
the log; that was checked below.

## Results

| Check | How tested | Result |
| --- | --- | --- |
| No sound before Start | Loaded the page, waited 2 s, read the note log | **Pass.** 0 notes. Tone reports the audio context suspended until the key press |
| Start, compare, explain, stop without a mouse | Tab + Enter to Start; on the Region choice, `2` / `1` or arrow keys to switch; Tab to "Explain this rhythm" + Enter; Esc | **Pass.** Focus moves to the explanation when it opens; visible focus outline on every control |
| Rhythm follows the rule | Gap between the two pulses of each beat compared with `long_fraction × beat` | **Pass.** All 8 Region A beats within 1.5 ms (timing grid is 2.6 ms) |
| Replay gives the same rhythm | Note times and values of one loop before and after Replay | **Pass.** Identical |
| Missing step silences the Earth voice and shows a message | Region B (steps at 1.5 s and 2.0 s are `missing`) | **Pass.** First pulses at 0, 0.5, 1, 2.5, 3, 3.5 s, with no notes in the missing window. Alert shown for exactly that window |
| Stop silences everything | 25 Stops at random moments; Tone envelope read for the next 200 ms | **Pass, 25/25.** Peak amplitude 0.0000 (1.0 = a full pulse) |
| Pause silences everything | 15 Pauses at random moments, same probe | **Pass, 15/15.** Peak 0.0000 |
| Explanation follows the sound playing | 25 Stops: explanation resets. 25 region switches at random moments: explanation never shows the old region's values | **Pass, 25/25 and 25/25** |
| Region switch keeps position, on the beat | Switched A → B mid-play; first-pulse spacing across the switch | **Pass.** Sequence A A B B B B B, every beat 0.500 s apart |
| Speed changes tempo, not the rhythm's shape | 0.5×: beat length and the split within each beat | **Pass.** Beat 1.000 s; split equals the rule (0.682/0.682, 0.667/0.667, 0.688/0.688) |
| Works with Wi-Fi off | Production build (`npm run preview`); all network requests listed; bundle scanned for URLs | **Pass (local).** Only `localhost` requests plus one in-memory audio worklet. The bundle's URLs are XML namespaces and error-message links, none fetched. **Still to do:** a real Wi-Fi-off run on the demo laptop |
| Test log absent in production | `window.__earthNotes` in the production build | **Pass.** Not present |
| Setup instructions work from a clean copy | Fresh clone → `npm ci && npm test && npm run build` | **Pass**: Dev B, GitHub's clean machine on every PR, and **Student A on their own** (npm ci, test, build, dev and preview all worked) |
| Unit tests | `npm test` | **Pass, 67** (1 skipped placeholder) |
| App plays exactly what the engine computed | `rhythmReference.test.ts`: every Earth note against Dev A's `data/rhythm_reference.json` | **Pass.** All notes match within 0.1 ms. Moving one real pulse by 20 ms makes it fail |

## Real NASA data (PR #8): checked in the browser

| Check | Result |
| --- | --- |
| Circles in the right places on frame 23000 | **Pass.** Region A Kuroshio (east of Japan), Region B Equatorial Pacific |
| PRACTICE banner gone; NASA credit under the image and in the footer | **Pass** |
| Replay gives the same rhythm | **Pass.** Identical note times and values |
| Rhythm and explanation | Region A 73/27 "long–short", Region B 58/42 "slight lilt"; the comparison line says which is more even |
| Missing information | Can't be checked on real data, because no real frame is missing. Covered by the practice-data tests |

## Student B's visuals in the app (PRs #13, #17, #19): automated in `web/e2e/visuals.e2e.ts`

| Check | Result |
| --- | --- |
| Beat lane idle until Start, then follows the audio clock | **Pass.** The playhead advances with the sound and pulses light up as they play |
| Clicking the lane moves playback | **Pass.** Click at 60% of a 4 s loop → the next pulse is the one at 2.5 s |
| Arrow keys / Home on the lane step through beats | **Pass** |
| Both rhythms on one time line, from the same code as the sound | **Pass.** Practice data shows 2 missing beats; real data 73/27 against 58/42 |
| Close-ups: line ticks match the picture | **Pass** on test pictures (horizontal, vertical and diagonal lines, blank, inside the circle only: `lineTicks.test.ts`). On real data Region A's 52 ticks scatter and Region B's 52 run parallel |
| Listen buttons and the game launch section | **Pass.** Listen picks and plays a region; the game links point to `tools/` |

## Optional melody (branch `devb/melody`): automated in `web/e2e/melody.e2e.ts` and `src/audio/userVoice.test.ts`

| Check | How tested | Result |
| --- | --- | --- |
| Melody leaves the Earth rhythm unchanged | 15 melody key presses during playback; every Earth note checked against the schedule (position in the loop, beat grid, split) | **Pass** |
| Letter keys play only in the pad | All 8 keys pressed with focus on Start (synth already running), then one in the pad; active melody voices counted | **Pass.** 0 outside, 1 inside |
| Quick first tap, held key (auto-repeat), Esc while holding then auto-repeat | Real key presses; voices counted after release | **Pass.** 0 stuck notes in each |
| On-screen keys play with the mouse | Mouse down/up on a key; voices and highlight checked | **Pass** |
| Keyboard + mouse on the same note | Key held, mouse press/release on the same key | **Pass.** The note keeps playing until the key is released |
| Leaving the pad releases notes | Held `H`, pressed Tab | **Pass.** 0 voices |
| `1`/`2` only on the Region choice (WCAG 2.1.4) | Real key presses: `2` on Start; `2` on the radio group; ArrowLeft | **Pass.** Ignored on Start; B selected and focus moved; ArrowLeft back to A |
| Not tested | Screen readers with the pad (`role="application"`); touch screens; a real MIDI piano | Student B's log; demo machine |

## Bugs found and fixed during testing

An independent code review raised three bugs. All three were confirmed and fixed. Two of them
were missed by the first round of browser tests:

1. **A pulse could still sound after Stop or Pause.** Tone schedules notes about 0.1 s ahead,
   and `Tone.now()` is also 0.1 s ahead. Stopping "now" therefore left the queued pulse
   playing. Fix: stop, pause and cancel at `Tone.immediate()`, the real current time.
   Our first probe used `now()` too, so it looked past the problem. The probe was corrected.
2. **The explanation could show a step after Stop, or the old region after a switch.** Screen
   updates queued for cancelled sound now carry a generation number and are ignored once
   cancelled.
3. **Double-pressing Start on first use could create two synths.** Fixed by sharing one setup step.
4. **Melody notes could get stuck (three ways).** A second code review of the melody found them.
   (a) Tone's `releaseAll` leaves voices unmarked, so after Stop a re-pressed note could not be
   released. (b) Tap, release, tap while audio was starting played two notes. (c) Releasing the
   mouse on a note still held by the keyboard silenced it. Also found while rewriting: a quick
   first tap could start a note after its release. Fix: the melody voice now tracks which input
   holds each note, releases notes one by one, and gives each press a token.
   Each case is now a unit test, and two were confirmed by putting the bug back.
5. **Note length could carry data on short beats** (Dev A's catch). For beats shorter than about
   0.36 s the pulse length depended on `long_fraction`. It is now the same for every alignment
   (`earthVoice.test.ts`).
6. **Page-wide `1`/`2` shortcuts did not meet WCAG 2.1.4.** Found while designing the melody keys;
   now active only on the Region choice. Focus also moves to the chosen region, so arrow keys
   continue from it.

## Not tested yet

- **Whether people can hear the difference.** The quiz player and pass mark (9 of 10) are ready
  (`docs/ACCESSIBILITY_LOG.md`), but there are no sessions yet
- Screen readers, including the new beat lane (a slider) and the close-ups (canvases): Student B's log
- The demo laptop: speakers, a Wi-Fi-off run of `npm run preview`
- Safari and Firefox; touch dragging on the beat lane
- A person outside the team trying the core steps (Checkpoint 3)
