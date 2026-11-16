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

---

## D9. Play along: a picture scan and new instruments, kept apart from the Earth voice

**Design choice**, after **Verified** NASA examples. Owner: Dev A, 15 Nov. Code:
`web/src/audio/scanScore.ts`, `scanPlayer.ts`, `instruments.ts`, `components/PictureScan.tsx`, and
`web/src/scan/` (what every view of the scan shares: picture, score, player, drawing loop, controls, legend).
Rule, settings, measurements and limits: `mapping_spec.md`, "The picture scan: what Listen plays".

**What:** the "Play along" section has two extras. "Play the picture" sweeps a line over the
NASA image (west to east over the whole picture, or a radar turn inside a region's circle) and
plays what it crosses. "Your melody" is the melody pad, now with five sounds to choose from.

**Why a scan:** it is the method NASA uses for its own image sonifications, so visitors may
know it, and it lets the whole picture be heard, not only two circles. Position sets pitch [S11],
light sets loudness [S9, S11], colour chooses the instrument, with a choir for the whole image, a
marimba for red and orange and a glockenspiel for blue [S10]. The radar on a circle is the
Caldwell 73 method [S10].

**Why it is kept apart:** the Earth rhythm is the tested claim. The scan has its own clock,
instruments, volume and reverb, and shares nothing with the Earth voice. `web/e2e/scan.e2e.ts`
checks that the Earth notes keep their schedule while it plays. Stop and Esc silence it, echo
included.

**Why these sounds:** the first melody sound was one plain triangle wave with no room. The new
ones are still synthesised by our code (no samples, no generated music): struck bars built from
the tones a real bar makes [S12], a choir pad, and a reverb. Notes come from a five-note
scale, so the picture, the keys and any mix of them never clash.

**Music library:** note names, the scale and the low note's chord steps come from Tonal (MIT),
which is bundled with the app. We did not take a library of recorded instrument samples: those
are fetched from the network when the page runs, the licences of the recordings were not
confirmed, and "all sound is synthesised by our own code" would stop being true.

**Decoration:** the low note steps C, A, F, G on a fixed timetable, and the sound moves left to
right with the line. Neither carries data, and both are named as decoration in the app.

**Note spacing (third round, 15 Nov):** the 12 held notes went from every step of the scale
starting at C3 to a spacing that is wide at the bottom and close at the top. Low notes a step
apart blur together, and on the radar every band sounds at once. Struck notes are now one octave
above their band on either instrument, so pitch says only where a spot is and the instrument
says only which colour. **Source added later the same day [S13, S14]:** Plomp and Levelt found
tones roughest a quarter of a critical bandwidth apart, and low intervals more dissonant. Measured
against their bandwidth curve, the first spacing's lowest neighbours were 0.18 and 0.20 of a
bandwidth apart and the current ones, C3–G3 and G3–C4, are 0.72 and 0.71. A roughness model of the choir gives the
current spacing about half the first one's (`docs/measurements/scan_spacing.md`). Whether it
sounds clearer is still **Unverified**: nobody has listened to compare.

**A sound library:** three scan sounds to choose from (Ocean choir, Music box, Plain), all
synthesised here and all playing the same score. The Plain one is the first version's
instruments, kept so a listener can compare. The bars' tones come from the equations of a
vibrating bar; the numbers and a table are in `mapping_spec.md`.

**A legend:** every mark on the picture and every bar is named beside it, with the same shapes,
in plain text a screen reader reads.

**How it looks, and where it leaves `DESIGN.md`:** the part of the picture not played yet is
dimmed, a white line with a white shape rides over it, and each chime leaves a white mark. This
is black and white only, so the image's colours are never changed, but it does overlay the NASA
image, and the chime rings and bar flashes fade smoothly. `DESIGN.md` says no overlays beyond
the region rings and no eased motion. Developer A asked for the scan to be easier to see and
smoother (15 Nov). **Student B to review**, as the owner of the design rules. With reduced motion
set, the line moves once a second and nothing fades.

**Explaining the scan (Dev A, 15 Nov):** any note can say why it sounds: where on the picture, what
was measured there, and how that became its pitch, loudness and instrument (`scanWhy.ts`, shown in
"Why the scan sounds like this"). The fixed choices are one list with a reason, evidence and tag each
(`scanChoices.ts`); rules for reading the picture are kept apart from decoration, in the fold-out and in
the legend. **Design choice:** a fold-out, not an always-open panel, to keep Dev B's shorter Play
along view; and not a live region, so a screen reader is not interrupted by a sweep that makes
about two notes a second (a radar turn, up to five). **Not decided:** how the fixed choices should
read to someone who has not seen the spec.

**Clicking the picture (Dev A, 15 Nov):** a click or tap on the scan's picture opens "Why the scan
sounds like this" on the place under the pointer: its column, and its band as the one explained in
full, as if they had been chosen with the fold-out's slider and band list. It makes no sound and does
not move the scan. The slider stays the complete keyboard route; the click is a shortcut.
**Design choices**, the four open questions decided by Developer A:
- *While the scan plays,* a click pins the place: the fold-out stops following the line and the scan
  plays on unchanged. A "Follow the line while the scan plays" checkbox pins and unpins from the
  keyboard, and any place chosen (click, slider or buttons) unticks it.
- *The radar's locator map* is not clickable: a radar cell is under a pixel there.
- *Focus* is never moved by a click. A line under the picture names the place in the table's words,
  and its "Read why" button moves focus to the full sentence when pressed. No live region.
- *Where no note is struck* at the place, that line names the nearest struck note in the same band,
  so a click on the middle of a spot of colour finds the note the spot made.

Pointer events, so mouse, touch and pen work alike; nothing happens on hover. The place is outlined
on the picture, black under white with four ticks, which is one more overlay on the NASA image:
**Student B to review** against `DESIGN.md`. Code: `web/src/audio/scanPick.ts` (which cell is under
a point), `components/PictureScan.tsx`, `components/ScanExplanation.tsx`. The geometry and its tests
are in `mapping_spec.md`, "Explaining a note".

**Fixed with it:** on a phone the open fold-out made the whole page scroll sideways (656 pixels wide
in a 390-pixel window, measured 15 Nov; its table is 640 wide, and on the radar the band list was
408). A tap on the picture now opens the fold-out, so this would be met often. The table now scrolls
in its own box and the band list fits; a browser test checks the page width on a phone.

**The scan on the globe (Dev A, 15 Nov):** the Globe tab plays the same scan, drawn round the 3D
globe (`web/src/scan/ScanGlobe.tsx`; the drawing is in Student A's `web/src/globe/`). Same pixels,
same score, same player and sound as Play along: a vertical line on the flat map is a meridian. The
rule and the drawing are in `mapping_spec.md`, "On the globe". Decided by Developer A:
- **Where:** the Globe tab only, not `globe.html` (Student A's region-picking tool), because Stop,
  Esc, the page's speed and "changing view stops the sound" live in the app. When Play along and
  Globe move into Listen (`page_plan.md`, P4), the globe drawing takes the shared scan state as it is.
- **The circle stays the flat-map circle**, shown on the globe as the oval it is on the ground, with
  its ground shape in words under the radar. A true ground circle waits for L7.
- **Turn with the line is on** each time a scan starts; turning the globe yourself turns it off. Named
  so it is not taken for the fold-out's "Follow the line while the scan plays" (from #64), which
  moves the explanation, not the globe.
- **Built for the ocean picture and the TEST INPUT picture first;** the aerosol and rain pictures
  joined when their own settings were measured (P1a, below), through one function, `scanRuleOf`,
  which now returns the picture's own rule from `data/sources.ts`. The globe does not hatch the
  pixels a picture never reads; its legend says so.

**Where it leaves `DESIGN.md`, for Student B and Developer B to accept:** the globe turns by itself
while it follows the line (12° a second at normal speed), which is motion, not a 90 ms step. With
reduced motion it only cuts, once per 45° step. The scan's settings now also hold the page's speed
buttons, on Play along and on Globe, so the speed can change while the scan plays (before, it was set
on Listen only, and changing view stops the sound). **Student A reviews** the shader and the globe
code; **Developer B** the Globe tab and the shell.

**Not decided here:** the Earth pulse keeps its sound. Changing it is task L1 in
`idea_tasks.md` and needs the listening check to be run again.

**Listening:** Developer A listened to the first two versions on 15 Nov and judged them good.
One listener, not a test. The third round was checked by measurement only.

**Audit, 15 Nov (Dev A):** every claim the scan makes is listed and tagged in `mapping_spec.md`,
"Audit of the scan's claims". The picture numbers come from one command, `npm run measure` in
`web/`, which runs the rule in Chromium on the real stills and records the running app's sound
(`web/measure/README.md`). What it
changed: the app no longer says "bright spot" (a struck note is a peak of colour in a whole cell,
and 39% to 61% of peaks are left out); the low note F is no longer said to fit the scale (it is a
major seventh under the held E); and three limits are now written down: warm colours are drawn
stronger than cold ones (**corrected later the same day:** that came from two end pixels of the
printed colour bar; in the frame the strongest warm and cold lines are equally strong, and light
blue lines are the palest), the still is a JPEG that moves single chimes, and equal bands on the
map are not equal shares of the globe. **Design choice:** none of the three is corrected for;
each is stated.

**Decided by Developer A, 15 Nov, not built yet:** the scan will read a lossless WebP of the
frame, a file of its own that only the scan loads, and the JPEG stays for everything else (the
JPEG, a 4:4:4 JPEG at quality 90 and a lossless WebP were measured against the frame in
`docs/measurements/scan_pictures.md`; the still is Student A's, so this is its own pull request).
And the scan is to sound the same on every page load: today a reverb made from random noise and
the held notes' start times change it (`scan_repeat.md`, `scan_timing.md`). The fix is a fixed
reverb echo from our own seeded noise, then one shared start time for the held notes, on a branch
of its own, measured and listened to before it merges. **Not decided:** the rules the aerosol and
rain pictures need before the scan may play them.

**Each picture's own scan rule (15 Nov, Developer A).** Decided after measuring each picture
(`docs/measurements/scan_pictures.md`); rule and limits in `mapping_spec.md`, "Each picture's own
rule". Code: `web/src/data/sources.ts` (`scan`), `analysis/scan_mask.py`.

- **One procedure for the settings** (Design choice). Floor: the colour strength of the picture's
  commonest colour among the pixels read, plus 12 grey levels. Full level: the largest cell mean on
  that scan, rounded up to 0.05. It gives the ocean exactly its floor and map-sweep full level; the
  ocean keeps 0.75 for the radar, where the procedure would give 0.85. Aerosols: 20/255, 0.45 and
  0.8. Rain: 30/255, 0.85 and 0.95. A unit test fails if a setting in `sources.ts` differs from the
  one the report was measured with.
- **Aerosols** (Design choice, its limits accepted): no mask, because aerosol over land is data.
  Sea salt is drawn pale grey-teal on NASA's own bar, so it is quiet: its circle strikes no note.
  Dust (lilac) rings the same instrument as sea salt and sulfate; only black carbon (smoke) strikes
  the other. The app says both.
- **Rain** (Design choice): the land, a satellite photo, is never read (the mask is the land
  `prepare_scene.py` uses for this source), and the floor sits above the navy sea. Neither alone
  works: the mask alone leaves the sea sounding, and a floor alone leaves coloured deserts sounding
  like heavy rain. Cost, stated in the app: no rain is heard over land, and faint rain at sea can be
  too faint to sound.
- **No data** (Design choice): a cell that reads nothing is silent, never struck, left out of the
  smoothing and the low note, and drawn hatched. It is never a zero.
- **Snow has its own instrument** (Design choice): in the rain picture, colours whose largest
  channel is blue (every step of NASA's snow bar, no step of its rain bar: measured) strike a third
  instrument, a plucked string (harp). Its tones are derived from a string plucked at 0.3 of its
  length and checked by a unit test. A vibraphone was considered first; its tuning and tremolo rate
  could not be confirmed from a source we could read, so it was not used. The harp's level in each
  scan sound is set so one struck note is as loud as that sound's cool instrument (recorded).
- **The instrument is chosen by what is drawn**: only pixels above the floor vote. Measured: no
  ocean note changes instrument; without it, the rain picture's navy would turn light rain into snow.
- **The scan follows the picture chosen on Listen** (page plan P1b), and the picture choice also
  shows on Play along. A picture without a measured rule is never scanned.

## D10. The Earth voice plays as music: a piano note over a fixed band

**Design choice.** Owner: Dev A, 15 Nov. Code: `web/src/audio/earthSound.ts`, `earthBand.ts`.
Rule and limits: `mapping_spec.md`, "The Earth voice as music". Measured: `docs/measurements/earth_sound.md`.

**What:** the Earth voice used to be a short drum hit on E4, dry. It is now, by default, a soft
piano note on E4 with a quiet bell on the same note, in a small room, over a band that plays the
listening game's chords (C, Am7, F, Gsus, home to C, two beats each). "Earth sound" on Play along
(next to the Earth rhythm's own Play and Stop) also offers the piano alone and the first version's
plain pulse; the choice applies wherever the Earth voice plays (Compare, Globe). Listen plays the
picture scan since D1, and the picker moves there if P4 brings the Earth voice back to Listen.

**Why:** the picture scan, the melody keys and the listening game all sounded like music, and the
Earth voice, the part the project is about, sounded like a test tone. D4 says tempo, pitch and
timbre are fixed and carry no data. A fixed piano and a fixed band keep that promise: they are the
same for every region, picture and alignment, and only when the second pulse falls carries data.

**How the data stays clear:** the band strikes only on beat starts, where the first pulse already
is, and sits below the Earth note, which is never doubled. Measured on the rendered sound: no
note starts inside a beat, the second pulse is at least 13.9 dB above the band at the NASA data's
1 s beat (7.3 dB at the fastest practice speed), and it still jumps at least 16.5 dB (9.8 dB) out
of the whole sound. The room's echo is made from random noise, so these move by about 1 dB from
run to run. While information is missing the band only holds its chord, with no strike.
While a picture scan plays the band fades out, because the scan's own chords run on another clock.
Each Earth note is held its fixed `dur` and then damped, so how long it rings does not depend on
the gap after it.

**Not done:** a tune for the pulses (the pitch changing from beat to beat, never with the data).
That would change D4 and the pitch column of `rhythm_reference.json`, which Dev B agreed on 14 Nov.

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
| S9 | NASA Scientific Visualization Studio. *Sonification of NGC 1569* (SVS 14156, released 16 May 2022). Sonification: SYSTEM Sounds (M. Russo, A. Santaguida). | https://svs.gsfc.nasa.gov/14156 | Verified (read 15 Nov) | D9 |
| S10 | NASA Scientific Visualization Studio. *Data Sonification: Caldwell 73* (SVS 13786, released 23 Dec 2020). Credit: SYSTEM Sounds (M. Russo, A. Santaguida). | https://svs.gsfc.nasa.gov/13786 | Verified (read 15 Nov) | D9 |
| S11 | Chandra X-ray Center. *A Universe of Sound: Galactic Center.* | https://chandra.si.edu/sound/gcenter.html | Verified (read 15 Nov) | D9 |
| S12 | Stanford CCRMA, Music 150 course notes. *Percussion instruments: rectangular bars (the glockenspiel), the marimba, xylophone and vibraphone.* | https://ccrma.stanford.edu/CCRMA/Courses/150/percussion.html | Verified (read 15 Nov) | D9 |
| S13 | Plomp, R., & Levelt, W. J. M. (1965). Tonal consonance and critical bandwidth. *Journal of the Acoustical Society of America*, 38, 548–560. | https://doi.org/10.1121/1.1909741 (copy read: the Max Planck Institute's record, https://www.mpi.nl/publications/item66382/tonal-consonance-and-critical-bandwidth, which links a scan of the paper) | Read in part by the AI assistant, 15 Nov: pp. 548, 549 and 553–556 of the scan; passages quoted in `web/measure/spacing.ts`. Not yet read by Dev A | D9 |
| S14 | Sethares, W. A. *Relating Tuning and Timbre* (first in *Experimental Musical Instruments*), and the page of its programs (*dissmeasure*). | https://sethares.engr.wisc.edu/consemi.html and https://sethares.engr.wisc.edu/comprog.html | Read by the AI assistant (a fetching sub-agent), 15 Nov: the formula's constants and the minima at simple ratios quoted. Not yet read by Dev A | D9 |

Software used (Tone.js, React, Vite and others) is listed from `web/package.json` in References.
It is not repeated here.

**How these were checked:** an AI research assistant fetched each source on 14 Nov 2026 and
quoted the passages. Dev B reviewed the results. S9 to S12 were fetched and quoted the same way
on 15 Nov for Dev A, who has not yet read them. Logged in `AI_USE.md`.

S13 and S14 (15 Nov, for the note spacing): the scan of S13 has no text layer, so the AI assistant
took its page images out of the PDF and read them as pictures. The critical-bandwidth values come
from the paper's Fig. 9, traced pixel by pixel (`web/measure/spacing.ts` says how). S13 takes the
bandwidth from Zwicker, Flottorp and Stevens (1957), which nobody here has read. Sethares's 1993
paper in the same journal was found but is also a scan without text, and it was not read, so it
is not cited.
