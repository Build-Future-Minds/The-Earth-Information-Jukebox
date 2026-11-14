# The shared input/output format

Agree this with all four members before building (Team Briefing, Dev B job 1).
Build against the practice files in `fixtures/mock/` until real ones exist. Schemas are in `contracts/`.

```
NASA frames ─(Student A: prepare_scene.py)─► scene.json + masks + crops
            ─(Dev A: features.py)─► features.json
            ─(Dev B: earthVoice.ts, transport.ts)─► Earth-voice notes ─► sound
            ─(Student B: RhythmExplanation.tsx)─► explanation of the rhythm now sounding
```

## 1. `scene.json` — what we are looking at (Student A writes)

Source (SVS ID, URL, title, exact credit, data kind, dates, limitations), frame list with the
model timestamp of each frame, the legend, and two regions: `id`, spoken `name`, pixel box
`[x, y, width, height]`, mask file, one-line description.

## 2. `features.json` — what we measured (Developer A's code writes)

| Field | Meaning |
| --- | --- |
| `normalisation` | The fixed threshold and smoothing used, identical for both regions |
| `steps[].t` | Seconds from the start of playback |
| `steps[].source_time` | The model timestamp of that frame |
| `steps[].region` | A region `id` from the scene |
| `steps[].status` | `ok` or `missing` |
| `steps[].alignment` | 0–1, how strongly visible lines share a common angle. `null` when missing. |
| `steps[].reason` | Why it is missing. `null` when ok. |

## 3. Earth-voice notes — what you hear (made live in the app)

Each note carries `why`: the region, the alignment value, the pulse split it produced, and the
rule. "Explain this rhythm" is written from `why`, so the explanation always matches the sound
actually playing.

## Where files go

The approved `scene.json`, `features.json` and one `preview` image go in `data/` at the repo root.
The app uses them as soon as both JSON files are there (`data/README.md`). Practice files stay in `fixtures/mock/`.

## Rules

- A practice file has `is_mock: true` and the app shows a PRACTICE DATA banner. Never in the demo.
- A `missing` step makes the Earth voice quiet and shows the reason. Never an invented rhythm.
- An unusable frame keeps its place in the list; it is not dropped.
- The user's melody is a separate `user` voice and never changes `earth` notes.
- Changing a schema: tell the team, get Dev A and Dev B to agree, bump `schema_version`, update the practice files in the same pull request.
