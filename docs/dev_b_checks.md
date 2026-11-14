# Developer B: evidence of the main checks

The checks come from `docs/roles/developer-b.md`. Each row says how it was tested and what was
observed. Practice data only (`fixtures/mock/`). **Not yet tested on real NASA material.**

Run on 14 Nov 2026 with Chrome via Playwright (automated browser) on macOS, dev build and
production build.

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
| Setup instructions work from a clean copy | Fresh clone → `npm ci && npm test && npm run build` | **Pass** for Dev B. **Still to do:** Student A follows `web/README.md` alone |
| Unit tests | `npm test` | **Pass, 19/19** |

## Optional melody (branch `devb/melody`)

| Check | How tested | Result |
| --- | --- | --- |
| Melody leaves the Earth rhythm unchanged | One Earth loop recorded without melody, then one while playing 15 melody notes; times, values and pulse order compared | **Pass.** 16 vs 16 Earth notes, identical to 0.1 ms |
| Melody keys play only in the pad | Pressed all 8 keys with focus on a button (synth already running), then one key in the pad; counted active melody voices | **Pass.** 0 voices outside, 1 inside |
| Leaving the pad releases held notes | Held `D`, moved focus away | **Pass.** 0 voices after |
| Stop / `Esc` silences the melody | Held `F`, pressed `Esc` | **Pass.** 0 voices; Earth voice stopped |
| `1`/`2` only on the Region choice (WCAG 2.1.4) | Real key presses: `2` on Start; `2` on the radio group; ArrowLeft; `2` inside the pad | **Pass.** Ignored on Start; B selected and focus moved to it; ArrowLeft back to A; ignored in the pad |

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
4. **Page-wide `1`/`2` shortcuts did not meet WCAG 2.1.4.** Found while designing the melody keys;
   now active only on the Region choice. Focus also moves to the chosen region, so arrow keys
   continue from it.

## Not tested yet

- Real NASA scene and features (Checkpoint 2)
- Listening by ear on the demo machine's speakers, Safari and Firefox
- Screen readers: Student B's log in `docs/ACCESSIBILITY_LOG.md`
- A person outside the team trying the core steps (Checkpoint 3)
