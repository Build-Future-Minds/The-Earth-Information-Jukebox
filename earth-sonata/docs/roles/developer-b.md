# Developer B — app and audio

Your briefing page is page 3 of `docs/briefing/Earth_Sonata_Team_Briefing.pdf`. This is the technical companion.

## Files you own

- `web/src/audio/earthVoice.ts` — turns `features.json` into Earth-voice notes with a `why` record
- `web/src/audio/transport.ts` — start, pause, stop, replay, speed, timing
- `README.md` — setup instructions a teammate can follow
- The recording of the working app, the public links, the local fallback

## Start here

Create the repo and push this kit. Build the app on `fixtures/mock/*.json` with a PRACTICE DATA
banner. Make Start, Pause, Stop, Replay and region selection work before real NASA material or a piano.

## Suggested stack

React + Vite + TypeScript, Tone.js bundled locally, synthesised sounds only. Static hosting on
GitHub Pages. No server and no cloud service in the audio path. Fallback: one plain HTML page.

## Checks to pass

- Start, compare regions, explain, and stop all notes without a mouse
- Replay gives the same Earth rhythm
- A `missing` step shows a clear message and silences the Earth voice
- The explanation follows the rhythm actually sounding
- No sound before the Start press; works with Wi-Fi off
- Student A can follow your setup instructions from a clean copy

## After the core passes

1. Optional keyboard melody with its own volume; show that the Earth rhythm is unchanged.
2. Only then, MIDI piano: needs https or localhost and a permission prompt; test on the demo
   machine's browser. A MIDI message proves input only. If the piano is unplugged, fall back to
   the computer keyboard and say so once.

## Hand-offs

- From Dev A: the rule. From Student A: prepared material. From Student B: controls (review together).
- To Student B: recordings for the 30-second video — the clip list is in `docs/submission/video_30s.md`. Backup capture Sat 9 PM, final Sun 3 PM.
- To Student A: the dependency list for References.

## Honest label

Image analysis is done ahead of time; sound is made live. Say "cached image measurements with
live sound", not "real-time analysis". If you quote a latency number, measure it and say how.

## At review (90 seconds)

Your work, a test, one limitation.
