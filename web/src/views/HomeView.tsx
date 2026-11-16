// Home, the landing page (docs/page_plan.md, P0): the problem and the idea, the ocean picture with its
// two circles, the idea in three pictures, how to use the app in five steps, quick links, and what
// the sound is and is not. Every link here only moves to a page: nothing on Home makes a sound.
// All sentences are drafts for Developer A to check (honesty) before they go to judges.
import type { ComponentType, RefObject } from 'react';
import { BeatPicture } from '../components/BeatPicture';
import { regionLabel, regionStyle } from '../components/ExploreControls';
import { ArrowIcon, CompareIcon, ExternalIcon, GameIcon, HowIcon, ListenIcon } from '../components/icons';
import { Key, agree, scatter } from '../components/LookingAt';
import { SceneView } from '../components/SceneView';
import { describesLine, NASA_PAGES, natureLine, type Picture, type Source } from '../data/sources';
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

export function HomeView({ source, pictures, headingRef }: Props) {
  const { scene, imageUrl } = source;
  const look = { firstLetter: source.firstLetter, neutral: source.regionStyle === 'neutral' };
  const regions = scene.regions.map((r) => ({ r, label: regionLabel(scene.regions, r.id, look.firstLetter) }));
  const first = scene.regions[0];
  const { width, height } = scene.frames;

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
