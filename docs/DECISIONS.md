# Decisions and the sources behind them

Why the app behaves the way it does, so anyone on the team can explain a choice in the
90-second review. Tags follow `CONTRIBUTING.md`:

- **Verified**: a team member read the source at the link, and it says what we say it says.
- **Design choice**: our choice. A source may inform it, but no source proves it.
- **Unverified**: not yet checked. Do not quote it publicly until someone reads it.

Only decisions visible in the app belong here. Sources feed the References table in
`docs/submission/student_a_worksheet.md` (part 2).

---

## D1. Switching region keeps the playback position

**Design choice**, informed by verified sources. Owner: Dev B. Code: `web/src/audio/transport.ts` `setTrack()`.

**What:** if you press `2` while Region A is playing, Region B continues from the same step.
That means the same source moment, on the same beat grid. It does not restart from the beginning.

**Why:**
- **Fair comparison.** `docs/mapping_spec.md` says both regions are compared "at the same source
  moment". Keeping the position does that automatically.
- **Short hearing memory.** Darwin, Turvey and Crowder (1972) found an auditory store with
  "a useful life of around two seconds" (some benefit up to about 4 s). **Verified** [S1].
  *Our inference:* compare A and B close together in time, not after a restart.
  Their test used spoken letters and digits, not rhythms.
- **Listening-test practice.** The ITU standard for comparing audio says:
  "Since long- and medium-term aural memory is unreliable, the test procedure should rely
  exclusively on short-term memory. This is best done if a near-instantaneous switching...
  method is used." It also says listeners should "switch freely". **Verified** [S2].
  It is written for codec testing, so it is a precedent for us, not proof about our app.
- **Responsive controls feel better.** Shneiderman (1983) lists, as a property of interfaces
  that attract "enthusiastic users": "Rapid, incremental, reversible operations whose impact on
  the object of interest is immediately visible." **Verified** [S3]. Pressing `1`/`2` is that kind
  of action: the rhythm you hear changes on the next beat, and pressing again undoes it.

**Measured:** in the browser, pressing `2` about 1.2 s into the loop led to Region B's missing
step 0.5 s later, at loop position ~1.5 s. A restart would have put it 1.5 s later.

**Limitation:** the switch can land in a missing step, so the first thing heard is silence.
The on-screen message explains why. BS.1116 prefers a ~40 ms fade at the switch to avoid clicks.
We do not cut a sounding note, because each pulse rings out, so we use no fade.

## D2. No sound until the visitor presses Start

**Verified** (browser rule) + **Design choice**. Code: `transport.ts` `start()`.

- Chrome blocks Web Audio until a user gesture: a context created before one is "suspended"
  and must be resumed after the gesture. **Verified** [S4]. This is Chrome's documentation;
  Safari and Firefox have their own similar rules, which we have not checked.
- WCAG 1.4.2 Audio Control applies to audio that plays *automatically* for more than 3 s.
  Our audio never starts on its own, so this criterion is **not triggered by design**. We also
  provide Stop, Pause and an Earth volume control. **Verified** [S5].

## D3. Everything works by keyboard, with visible focus and announced status

**Verified** standards. Owner: Dev B + Student B. Evidence: `docs/ACCESSIBILITY_LOG.md`.

| WCAG 2.2 | Level | What it asks | How the app meets it |
| --- | --- | --- | --- |
| 2.1.1 Keyboard | A | All functions work from a keyboard | Real buttons; arrow keys or `1`/`2` choose a region; `Esc` stops |
| 2.1.4 Character Key Shortcuts | A | Single-character shortcuts can be turned off, remapped, or work only while their control has focus | See D8 |
| 2.4.7 Focus Visible | AA | The keyboard focus can be seen | 3 px focus outline on every control |
| 4.1.3 Status Messages | AA | Status changes are announced without moving focus | `role="status"` line; `role="alert"` for missing information |

All **Verified** [S5]. The status line changes only on real transitions (playing, paused,
missing). This keeps a screen reader from chattering on every beat. That part is a **Design choice**.

## D4. The rhythm rule is our choice

**Design choice.** Owner: Dev A. Spec: `docs/mapping_spec.md`.

More alignment gives a more even pulse: `long_fraction = 0.75 − 0.25 × A`. The rule
describes the rendered image, not water speed, turbulence or ocean health. Tempo, pitch
and timbre are fixed and carry no data.

Background reading on choosing data-to-sound mappings: Walker and Nees (2011). **Unverified** [S6]:
the chapter exists at the link, but no one has read it yet to confirm a specific claim.

## D5. Doubling line angles before averaging

**Unverified. Dev A to confirm.** Code: `analysis/features.py`.

A line at 10° and at 190° is the same line, so angles are doubled before averaging. The length
of the averaged arrow (0–1) is the alignment `A`. This is standard for "axial" data in
directional statistics [S7] and related to orientation estimation in images [S8]. The
publication details of both are confirmed. The content claims have not been checked against
the texts. Dev A: read the relevant sections and change the tag to Verified, or replace them.

## D6. Speed changes the tempo, never the rhythm's shape

**Design choice.** Code: `transport.ts` (notes scheduled in transport ticks, speed sets bpm).

Changing speed stretches the whole timeline evenly, so the long/short split, which is the data,
is identical at every speed. Tested indirectly: the note times come from the same pure
function at every speed (`earthVoice.test.ts`).

## D7. The explanation follows the sound actually playing

**Design choice.** Code: `RhythmExplanation.tsx`, `transport.ts` (`Tone.Draw`).

Every Earth note carries a `why` record (region, alignment, split, rule). The screen updates
when the audio reaches that note, not when it is scheduled. So the explanation cannot describe
a rhythm other than the one you hear. Missing steps make no notes and show their reason.

---

## D8. Melody keys and number shortcuts work only while their control has focus

**Verified** standard + **Design choice**. Owner: Dev B. Code: `MelodyPad.tsx`, `App.tsx` (key handler).

**What:** the melody keys `A S D F G H J K` play only while the melody pad has focus. `1`/`2`
choose a region only while focus is on the Region choice. `Esc` (not a character key) stops
everything from anywhere.

**Why:** WCAG 2.2 SC 2.1.4 (Level A) says a shortcut made of only letter, punctuation, number or
symbol characters needs a way to turn it off or remap it, or must be "only active when that
component has focus". **Verified** [S5]. W3C's reason: "some of the software used by this user
group [speech input] converts any speech into simulated key presses, which can lead to unintended
activations." Our first version had page-wide `1`/`2` shortcuts, which did not meet this. They
were narrowed to the Region choice on 14 Nov.

**Our interpretation:** W3C's text does not discuss composite groups. We treat the radio group as
the one control for "choose a region". The pad is one control.

**Melody:** a separate `user` voice with its own synth and volume, played immediately rather than
on the Earth schedule, so it cannot move an Earth note (`docs/CONTRACT.md`). Pentatonic scale, an
octave above the Earth pulse: any combination sounds consonant, and the two voices stay distinct.
Both are **Design choices**. Tabbing away from the pad, switching windows, Stop or `Esc` silences the melody.

**Ready for a MIDI piano:** the melody voice takes MIDI note numbers and the name of the input
(`key`, `pointer`, later `midi`). A note stops only when every input holding it lets go. A Web MIDI
input can call the same `noteOn` / `noteOff` with no other change. Web MIDI needs https or
localhost and a permission prompt, and Safari does not support it. **Unverified for our demo
browser.** Test on the demo machine before relying on it.

## Sources

| ID | Citation | Link | Status | Used in |
| --- | --- | --- | --- | --- |
| S1 | Darwin, C. J., Turvey, M. T., & Crowder, R. G. (1972). An auditory analogue of the Sperling partial report procedure: Evidence for brief auditory storage. *Cognitive Psychology*, 3(2), 255–267. | https://doi.org/10.1016/0010-0285(72)90007-2 | Verified (read) | D1 |
| S2 | ITU-R Recommendation BS.1116-3 (02/2015). *Methods for the subjective assessment of small impairments in audio systems.* | https://www.itu.int/rec/R-REC-BS.1116/en | Verified (read) | D1 |
| S3 | Shneiderman, B. (1983). Direct Manipulation: A Step Beyond Programming Languages. *Computer*, 16(8), 57–69. | https://doi.org/10.1109/MC.1983.1654471 (readable copy: https://www.cl.cam.ac.uk/~pr10/iui/shneiderman83.pdf) | Verified (read) | D1 |
| S4 | Chrome for Developers. *Autoplay policy changes.* | https://developer.chrome.com/blog/autoplay | Verified (read) | D2 |
| S5 | W3C. *Understanding WCAG 2.2*: 1.4.2, 2.1.1, 2.1.4, 2.4.7, 4.1.3. | https://www.w3.org/WAI/WCAG22/Understanding/ | Verified (read) | D2, D3, D8 |
| S6 | Walker, B. N., & Nees, M. A. (2011). Theory of Sonification. In T. Hermann, A. Hunt & J. G. Neuhoff (Eds.), *The Sonification Handbook* (ch. 2). Logos, Berlin. | https://sonification.de/handbook/index.php/chapters/chapter2 | Unverified (exists; not read) | D4 |
| S7 | Mardia, K. V., & Jupp, P. E. (2000). *Directional Statistics.* Wiley. ISBN 978-0-471-95333-3. | n/a | Unverified (publication details only) | D5 |
| S8 | Bigün, J., & Granlund, G. H. (1987). Optimal orientation detection of linear symmetry. *Proc. 1st ICCV*, London, 433–438. | n/a | Unverified (publication details only) | D5 |

Software used (Tone.js, React, Vite and others) is listed from `web/package.json` in References.
It is not repeated here.

**How these were checked:** an AI research assistant fetched each source on 14 Nov 2026 and
quoted the passages. Dev B reviewed the results. Logged in `AI_USE.md`.
