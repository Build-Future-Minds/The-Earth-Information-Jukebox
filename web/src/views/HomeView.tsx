// Home, the landing page (docs/page_plan.md, P0): the problem and the idea, the ocean picture with its
// two circles, the 30-second video, why it matters, the idea in three pictures, how to use the app in
// five steps, quick links, and what the sound is and is not. Every link here only moves to a page. The
// only sound on Home is the video's, and only after its own Play is pressed; Esc pauses it.
// All sentences are drafts for Developer A to check (honesty) before they go to judges.
import { useEffect, useRef, type ComponentType, type ReactNode, type RefObject } from 'react';
import { BeatPicture } from '../components/BeatPicture';
import { regionLabel, regionStyle } from '../components/ExploreControls';
import { ArrowIcon, CompareIcon, ExternalIcon, GameIcon, HowIcon, ListenIcon } from '../components/icons';
import { Key, agree, scatter } from '../components/LookingAt';
import { SceneView } from '../components/SceneView';
import { describesLine, NASA_PAGES, natureLine, type Picture, type Source } from '../data/sources';
import videoUrl from '../media/earth-sonata-30s.mp4?url';
import posterUrl from '../media/earth-sonata-30s-poster.jpg?url';
import { GAME_HREF } from '../views';

interface Props {
  /** The picture the opening shows: the ocean (the practice frame in tests). */
  source: Source;
  /** Every picture the app has, for the honesty rows and credits. */
  pictures: Picture[];
  /** Focus moves here when Home is opened from another page. */
  headingRef: RefObject<HTMLHeadingElement | null>;
}

interface Step {
  text: string;
  href: string;
  page: string;
  Icon: ComponentType;
}

// True for the app as it is today. When Listen gains "Whole picture" and the scan's Explain (P1),
// steps 2 and 3 change with it.
const STEPS: Step[] = [
  { text: 'Choose a NASA picture.', href: '#listen', page: 'Listen', Icon: ListenIcon },
  { text: 'Choose a region on the picture.', href: '#listen', page: 'Listen', Icon: ListenIcon },
  { text: 'Press Play. Open Explain to see how the rhythm was made.', href: '#listen', page: 'Listen', Icon: ListenIcon },
  { text: 'Compare the two regions side by side.', href: '#compare', page: 'Compare', Icon: CompareIcon },
  { text: 'Test your ear in the listening game.', href: GAME_HREF, page: 'Game', Icon: GameIcon },
];

const APP_LINKS: { href: string; label: string; Icon: ComponentType }[] = [
  { href: '#listen', label: 'Listen', Icon: ListenIcon },
  { href: '#compare', label: 'Compare', Icon: CompareIcon },
  { href: '#how', label: "How it's made", Icon: HowIcon },
  { href: GAME_HREF, label: 'Game', Icon: GameIcon },
];

const COUNT_WORD = ['no circles', 'one circle', 'two circles', 'three circles'];

// The public code. The same address as How it's made (how/parts.tsx), kept here so Home does not
// load How it's made's code (and KaTeX) up front.
const REPO_URL = 'https://github.com/Build-Future-Minds/The-Earth-Information-Jukebox';

// What the 30-second video shows and says, moment by moment, for anyone who cannot see it or hear
// it (web/src/media/README.md). Times and pulse gaps are read from the recording itself.
const VIDEO_MOMENTS: { at: string; see: string; hear: string }[] = [
  { at: '0:00', see: 'The app’s Home page: “NASA shows the Earth in pictures. If you cannot see the picture, or cannot spot the pattern, the data stays closed.” Beside it, NASA’s map of ocean currents, blue (cold) to red (warm), with two circles: Region A east of Japan and Region B in the equatorial Pacific. The view moves in on the map.',
    hear: 'Voice: “NASA’s Earth pictures are made for eyes. Can we hear one?”' },
  { at: '0:05', see: 'The Compare page, close on Region A, “Kuroshio eddies east of Japan”: short white lines pointing many ways, the number 0.08, and “Swirly · second pulse at 73% of the beat”.',
    hear: 'Voice: “Region A: scattered lines, so long, then short.”' },
  { at: '0:08', see: 'Enter is pressed. The button changes from “Listen to Region A” to “Stop Region A”, and a sound line draws one bar for each pulse.',
    hear: 'Region A’s rhythm: seven short drum-like pulses, a long gap (0.73 s) then a short gap (0.27 s), three times over.' },
  { at: '0:11', see: 'Enter stops the sound. Tab moves to Region B, “Equatorial Pacific streaks”: white lines mostly running left to right, the number 0.67, and “Partly lined up · second pulse at 58% of the beat”.',
    hear: 'Voice: “Region B: lines partly line up, so more even.”' },
  { at: '0:15', see: 'Enter is pressed. The button changes to “Stop Region B”, and the sound line draws Region B’s pulses.',
    hear: 'Region B’s rhythm: seven pulses of the same sound, gaps of 0.58 s and 0.42 s, closer to equal than Region A’s.' },
  { at: '0:18', see: 'Enter stops the sound. The view pulls back to both regions side by side, with their numbers 0.08 and 0.67.',
    hear: 'Voice: “We measured how lined up the lines are.”' },
  { at: '0:21', see: 'Home’s “The idea in three pictures”: a circle on the NASA picture, lines that are lined up or swirly, two beats (“Lined up: even”, “Swirly: long–short”), and the rule: the second pulse lands at 0.75 − 0.25 × alignment of the beat.',
    hear: 'Voice: “Earth Sonata plays that as a rhythm, live.”' },
  { at: '0:24', see: 'The view rises back to the NASA map with its two circles.',
    hear: 'Voice: “So you can compare the places by ear, and not just by eye.”' },
  { at: '0:28', see: 'End card: “A model; the rule is ours. The picture is a computer model, not a photo. The rhythm rule is a choice we made.” The NASA map with its name (Global Sea Surface Currents and Temperature, NASA SVS 3912, ECCO2 model output), its credit, and the addresses of the app and the code.',
    hear: 'Voice: “A model; the rule is ours.”' },
];

interface Why {
  who: string;
  change: string;
  check: ReactNode;
}

// Why it matters: who it helps. Each "check" points at the page or code that backs the claim. No
// tester counts until they are in docs/ACCESSIBILITY_LOG.md; no school, place or person is named.
const WHY: Why[] = [
  {
    who: 'People who are blind or have low vision',
    change: 'A map of ocean currents says nothing if you cannot see it. Here each region becomes a rhythm, every sound is explained in words, and a keyboard is enough.',
    check: <>Every control has a label and works from the keyboard. Explain says why each sound is what it is: <a href="#listen">Listen</a>.</>,
  },
  {
    who: 'Students and teachers',
    change: 'One number from the picture sets where the second pulse lands: a rule you can work out and check yourself, then test your ear in the listening game.',
    check: <>The rule and every measurement, step by step: <a href="#how">How it’s made</a>.</>,
  },
  {
    who: 'Anyone comparing two places',
    change: 'A second way to notice a pattern: listen to both regions, then look again to see why they differ.',
    check: <>Both regions side by side, each with its own Listen button: <a href="#compare">Compare</a>.</>,
  },
  {
    who: 'Students like us',
    change: 'Made by a student team, for students. It is free, with no sign-in and nothing to install, so any class with a browser can use it, and nothing plays until you press Play.',
    check: <>The code is public: <a href={REPO_URL}>the code on GitHub<ExternalIcon /><span className="sr-only"> (GitHub website)</span></a>.</>,
  },
];

export function HomeView({ source, pictures, headingRef }: Props) {
  const { scene, imageUrl } = source;
  const look = { firstLetter: source.firstLetter, neutral: source.regionStyle === 'neutral' };
  const regions = scene.regions.map((r) => ({ r, label: regionLabel(scene.regions, r.id, look.firstLetter) }));
  const first = scene.regions[0];
  const { width, height } = scene.frames;

  // Esc stops all sound (App.tsx), and on Home the only sound is the video, so Esc pauses it too.
  // Leaving Home removes the video, which stops it.
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Escape') videoRef.current?.pause();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="home">
      {/* Not a named landmark: its heading is two sentences long, too long to announce as a region name. */}
      <section className="home-open">
        <div className="home-pitch">
          <h2 id="home-title" tabIndex={-1} ref={headingRef}>
            <span className="home-lead">NASA shows the Earth in pictures.</span>{' '}
            If you cannot see the picture, or cannot spot the pattern, the data stays closed.
          </h2>
          <p className="home-idea-line">
            Earth Sonata turns the patterns in NASA pictures into sound, by rules you can check.
          </p>
          <a className="button-link primary home-start" href="#listen">
            <ListenIcon />
            Start listening
          </a>
          <p className="home-quiet">Nothing plays until you press Play.</p>
        </div>
        <SceneView
          scene={scene}
          imageUrl={imageUrl}
          regionId=""
          look={look}
          label={`${scene.source.title}, with ${COUNT_WORD[regions.length] ?? `${regions.length} circles`}: ${regions
            .map(({ r, label }) => `${label}, ${r.name}`)
            .join('; ')}.`}
          caption={
            <ul className="home-key" aria-hidden="true">
              {regions.map(({ r, label }) => (
                <li key={r.id}>
                  <span className="region-badge" style={regionStyle(scene.regions, r.id, look)}>{label.replace('Region ', '')}</span>
                  {r.name}
                </li>
              ))}
            </ul>
          }
        />
      </section>

      <section className="home-section" aria-labelledby="home-video-title">
        <h2 id="home-video-title">See it in 30 seconds</h2>
        <div className="home-video">
          <div className="home-video-text">
            <p className="home-video-line">
              The real app, played with the keyboard: Region A, then Region B, then why the two sound different.
            </p>
            <p className="home-quiet">The video plays only when you press its Play button. Esc pauses it.</p>
          </div>
          <figure className="home-film">
            {/* No autoplay, loop or muted: nothing sounds until its own Play is pressed. */}
            <video
              ref={videoRef}
              src={videoUrl}
              poster={posterUrl}
              controls
              preload="metadata"
              playsInline
              aria-label="Earth Sonata in 30 seconds: a video with a voice, captions and the app’s sound"
            />
            <figcaption className="home-credit">
              In the video: Global Sea Surface Currents and Temperature (NASA SVS 3912), ECCO2 model output. Credit:
              NASA/Goddard Space Flight Center Scientific Visualization Studio.
            </figcaption>
          </figure>
        </div>
        <details className="home-transcript">
          <summary>Read what the video shows and says</summary>
          <p>
            Throughout, a band along the bottom shows the spoken words as captions, the page on screen and the NASA
            credit. The only sounds are the voice and the app’s own rhythm.
          </p>
          <div className="home-transcript-head" aria-hidden="true">
            <span>Time</span><span>On screen</span><span>Sound</span>
          </div>
          <ol className="home-transcript-rows" role="list">
            {VIDEO_MOMENTS.map((m) => (
              <li key={m.at}>
                <span className="home-transcript-at"><span className="sr-only">At </span>{m.at}</span>
                <p><span className="sr-only">On screen: </span>{m.see}</p>
                <p><span className="sr-only">Sound: </span>{m.hear}</p>
              </li>
            ))}
          </ol>
        </details>
      </section>

      <section className="home-section" aria-labelledby="home-why-title">
        <h2 id="home-why-title">Why it matters</h2>
        <p className="home-choice">NASA shares its pictures of Earth with everyone. Earth Sonata lets you hear them too.</p>
        <div className="home-why-head" aria-hidden="true">
          <span>Who</span><span>What changes</span><span>How you can check</span>
        </div>
        <ul className="home-why" role="list">
          {WHY.map((w) => (
            <li key={w.who}>
              <h3>{w.who}</h3>
              <p>{w.change}</p>
              <p className="home-why-check">{w.check}</p>
            </li>
          ))}
        </ul>
        <p className="home-why-note">We have not yet tested it with blind or low-vision listeners.</p>
      </section>

      <section className="home-section" aria-labelledby="home-idea-title">
        <h2 id="home-idea-title">The idea in three pictures</h2>
        <ol className="home-strip">
          <li>
            <div className="home-art" aria-hidden="true">
              <span className="home-thumb" style={{ ['--a' as string]: width / height, backgroundImage: imageUrl ? `url(${imageUrl})` : undefined }}>
                {first && (
                  <i style={{ left: `${(100 * first.center_px[0]) / width}%`, top: `${(100 * first.center_px[1]) / height}%`,
                    width: `${(200 * first.radius_px) / width}%`, ...regionStyle(scene.regions, first.id, look) }}>
                    <b className="region-badge">{regions[0].label.replace('Region ', '')}</b>
                  </i>
                )}
              </span>
            </div>
            <h3>A circle on the NASA picture</h3>
            <p>Only the lines inside the circle are measured.</p>
          </li>
          <li>
            <span className="home-arrow" aria-hidden="true"><ArrowIcon /></span>
            <div className="home-art home-ticks" aria-hidden="true">
              <figure><Key degrees={agree} /><figcaption>Lined up</figcaption></figure>
              <figure><Key degrees={scatter} /><figcaption>Swirly</figcaption></figure>
            </div>
            <h3>Which way the lines run</h3>
            <p>How much they agree is the alignment: 0 (swirly) to 1 (lined up).</p>
          </li>
          <li>
            <span className="home-arrow" aria-hidden="true"><ArrowIcon /></span>
            <div className="home-art home-beats" aria-hidden="true">
              <span className="beat-row"><BeatPicture alignment={0.9} /><span>Lined up: even</span></span>
              <span className="beat-row"><BeatPicture alignment={0.1} /><span>Swirly: long–short</span></span>
            </div>
            <h3>Alignment sets the rhythm</h3>
            <p>Each beat has two pulses: even when lined up, long–short when swirly.</p>
          </li>
        </ol>
        <p className="home-rule">
          <b>The rule:</b> the second pulse lands at <span className="mono">0.75 − 0.25 × alignment</span> of the beat.{' '}
          <a href="#how">See how it's made</a>
        </p>
      </section>

      <section className="home-section" aria-labelledby="home-use-title">
        <h2 id="home-use-title">How to use it</h2>
        <ol className="home-steps" role="list">
          {STEPS.map((s, i) => (
            <li key={s.text}>
              <a href={s.href}>
                {/* A catalogue index numeral (01 to 05) for the eye; "Step 1:" for screen readers. */}
                <span className="home-step-n">
                  <span aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                  <span className="sr-only">Step {i + 1}:</span>
                </span>
                <span className="home-step-text">{s.text}</span>
                <span className="home-step-page">
                  <s.Icon />
                  <span className="sr-only">(</span>{s.page}<span className="sr-only"> page)</span>
                  <ArrowIcon />
                </span>
              </a>
            </li>
          ))}
        </ol>
        <p className="home-keys">
          Keys: <kbd>Tab</kbd> moves, <kbd>Enter</kbd> presses, <kbd>Esc</kbd> stops all sound.
        </p>
      </section>

      <section className="home-section" aria-labelledby="home-links-title">
        <h2 id="home-links-title">Quick links</h2>
        <div className="home-links">
          <div>
            <h3 id="home-app-links">In this app</h3>
            <ul className="home-app-links" role="list" aria-labelledby="home-app-links">
              {APP_LINKS.map(({ href, label, Icon }) => (
                <li key={href}>
                  <a href={href}><Icon /><span className="home-app-name">{label}</span><ArrowIcon /></a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 id="home-nasa-links">NASA pages</h3>
            <ul className="home-nasa-links" role="list" aria-labelledby="home-nasa-links">
              {NASA_PAGES.map((p) => (
                <li key={p.svsId}>
                  <a href={p.url}>
                    <span className="home-svs">SVS {p.svsId}</span>
                    <span className="home-nasa-title">{p.title}</span>
                    <ExternalIcon />
                    <span className="sr-only"> (NASA website)</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="home-section" aria-labelledby="home-facts-title">
        <h2 id="home-facts-title">What it is and is not</h2>
        <p className="home-choice">The rhythm rule is a choice we made.</p>
        <div className="home-facts-head" aria-hidden="true">
          <span>Picture</span><span>What it is</span><span>What the sound describes</span><span>Credit</span>
        </div>
        <ul className="home-facts" role="list">
          {pictures.map((p) => (
            <li key={p.key}>
              <h3>{p.label}</h3>
              <p>{natureLine(p)}</p>
              <p>{describesLine(p)}</p>
              {/* Plain text: the NASA pages are linked once, in Quick links just above. */}
              <p className="home-credit">{p.scene.source.title}. {p.scene.source.credit}.</p>
            </li>
          ))}
        </ul>
        <p className="home-quiet">Measured ahead of time; all sound is made in your browser by our own code.</p>
      </section>
    </div>
  );
}
