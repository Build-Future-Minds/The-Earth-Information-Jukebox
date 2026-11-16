import { type CSSProperties, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ACTIVE, isPractice } from './data/dataset';
import { buildEarthTrack, type TrackStep } from './audio/earthVoice';
import { Transport, type PlayState } from './audio/transport';
import { UserVoice, type InputSource } from './audio/userVoice';
import { DEFAULT_MELODY_INSTRUMENT, DEFAULT_SCAN_SOUND, type MelodyInstrumentId, type ScanSoundId } from './audio/instruments';
import { DEFAULT_EARTH_SOUND, type EarthSoundId } from './audio/earthSound';
import type { ScanPicture } from './components/PictureScan';
import { regionColour, regionLabel, regionStyle } from './components/ExploreControls';
import { PageLinks } from './components/PageLinks';
import { ThemeSwitch } from './components/ThemeSwitch';
import { SourceChoice } from './components/SourceChoice';
import { selectSource } from './data/selection';
import { PICTURES, sourceByKey, SOURCES, type ScanTarget, type SourceKey } from './data/sources';
import { useView, VIEWS } from './views';
import { CompareView } from './views/CompareView';
import { HomeView } from './views/HomeView';
import { HowView } from './views/HowView';
import { ListenView } from './views/ListenView';
import { PlayView } from './views/PlayView';
import { GlobeTab } from './views/GlobeView';

/** Anything that plays the picture scan: Listen's scan or Play along's. Stop and Esc silence it. */
interface Stoppable {
  stop: () => void;
}

export function App() {
  // The picture being played (the jukebox) and its region. Every comparison uses this one source.
  // The picture scan plays this same picture, with its own settings (P1: the ocean-only lock is gone).
  const [sourceKey, setSourceKey] = useState<SourceKey>(SOURCES[0].key);
  const source = sourceByKey(sourceKey);
  const { scene, features } = source;
  const look = { firstLetter: source.firstLetter, neutral: source.regionStyle === 'neutral' };
  // Play along's scan plays the picture chosen on Listen, with that picture's own measured rule
  // (data/sources.ts, `scan`). A picture whose rule has not been measured is never scanned: Play
  // along keeps one that has a rule, and says so (page plan P1b; Developer A, 15 Nov). Listen
  // says the same on the picture itself and plays nothing.
  const scanPicture = (source.scan ? source : (SOURCES.find((s) => s.scan) ?? source)) as ScanPicture;
  const scanNote = source.scan
    ? null
    : `The ${source.label.toLowerCase()} picture's scan rule has not been measured yet, so the scan plays the ${scanPicture.label.toLowerCase()} picture.`;
  const [regionId, setRegionId] = useState(SOURCES[0].scene.regions[0].id);
  // What Listen's scan reads: the whole picture, or one region's circle.
  const [target, setTarget] = useState<ScanTarget>('map');
  const [playState, setPlayState] = useState<PlayState>('stopped');
  const [sounding, setSounding] = useState<TrackStep | null>(null);
  // Beats since Play: the count the Earth band's chords follow, for Compare's "What you hear now".
  const [soundingBeat, setSoundingBeat] = useState<number | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [scanDb, setScanDb] = useState(-8);
  const [scanSoundId, setScanSoundId] = useState<ScanSoundId>(DEFAULT_SCAN_SOUND);
  // What the Earth voice sounds like wherever it plays (Compare, Globe, Play along); chosen on Play along.
  const [earthSound, setEarthSound] = useState<EarthSoundId>(DEFAULT_EARTH_SOUND);
  const [melodyDb, setMelodyDb] = useState(-10);
  const [melodyInstrument, setMelodyInstrument] = useState<MelodyInstrumentId>(DEFAULT_MELODY_INSTRUMENT);
  const [heldNotes, setHeldNotes] = useState<ReadonlySet<number>>(new Set());
  const transport = useRef<Transport | null>(null);
  const melody = useRef<UserVoice | null>(null);
  const scan = useRef<Stoppable>(null);
  const explanationRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const topbarRef = useRef<HTMLElement>(null);
  const view = useView();
  const viewLabel = VIEWS.find((v) => v.key === view)!.label;

  const track = useMemo(() => buildEarthTrack(features, regionId), [features, regionId]);

  useEffect(() => {
    const t = new Transport({
      onStep: (step, beat) => {
        setSounding(step);
        setSoundingBeat(beat);
      },
      onState: setPlayState,
    });
    const m = new UserVoice(setHeldNotes);
    transport.current = t;
    melody.current = m;
    return () => {
      t.dispose();
      m.dispose();
    };
  }, []);

  useEffect(() => {
    transport.current?.setTrack(track);
    setSounding(null);
  }, [track]);

  // Listen fits the screen under the top bar: where the bar ends (with the practice banner above it,
  // when there is one), for the CSS (styles.css, ".listen-area").
  useLayoutEffect(() => {
    const bar = topbarRef.current;
    if (!bar) return;
    const set = () => document.documentElement.style.setProperty('--chrome', `${bar.offsetTop + bar.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(bar);
    return () => ro.disconnect();
  }, []);

  const start = useCallback(() => void transport.current?.start(), []);
  const pause = useCallback(() => transport.current?.pause(), []);
  const stop = useCallback(() => {
    transport.current?.stop();
    melody.current?.hush(); // Stop silences everything: the melody and its echo,
    scan.current?.stop(); // and the picture scan
    setSounding(null);
    setSoundingBeat(null);
  }, []);
  // The page's speed: the Earth rhythm and the picture scan both follow it. Set on Listen, and in the
  // scan's settings on Play along and Globe, so it can change while the scan plays.
  const changeSpeed = useCallback((s: number) => {
    setSpeed(s);
    transport.current?.setSpeed(s);
  }, []);
  // Melody inputs (keyboard, on-screen keys, later MIDI) all send MIDI note numbers.
  const onMelodyNoteOn = useCallback(
    (note: number, source: InputSource) => void melody.current?.noteOn(note, 0.7, source),
    [],
  );
  const onMelodyNoteOff = useCallback((note: number, source: InputSource) => melody.current?.noteOff(note, source), []);
  const onMelodyAllOff = useCallback(() => melody.current?.allOff(), []);
  // Beat visualizer: read the audio clock.
  const getPosition = useCallback(() => transport.current?.loopPosition() ?? 0, []);
  // "Listen to Region A/B" in the close-ups: choose the region, and start if nothing is playing.
  const listenTo = useCallback((id: string) => {
    setRegionId(id);
    if (transport.current?.getState() !== 'playing') void transport.current?.start();
  }, []);

  // Esc stops everything, from anywhere (DESIGN.md "Stop"). Listen's step 2 has its own number keys.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Escape') stop();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stop]);

  // Choosing another picture is like Stop, then the whole picture and its first region are selected.
  const chooseSource = useCallback(
    (key: SourceKey) => {
      stop();
      const next = selectSource(key);
      setSourceKey(next.sourceKey);
      setRegionId(next.regionId);
      setTarget('map');
    },
    [stop],
  );

  // Choosing what to hear on Listen. A region also becomes the region Compare and Globe show.
  const chooseTarget = useCallback(
    (next: ScanTarget) => {
      setTarget(next);
      if (next !== 'map' && scene.regions.some((r) => r.id === next)) setRegionId(next);
    },
    [scene],
  );

  // Changing view is the same as pressing Stop. Then go to the top and move focus to the view's
  // heading, so a screen reader announces where you are. Not on the first load: Tab starts at the top.
  // Compared with the previous view (not a "first run" flag), because React runs effects twice in dev.
  const shownView = useRef(view);
  useEffect(() => {
    document.title = `${viewLabel} · Earth Sonata`;
    if (shownView.current === view) return;
    shownView.current = view;
    stop();
    window.scrollTo(0, 0);
    headingRef.current?.focus();
  }, [view, viewLabel, stop]);

  // Move focus to the explanation when it opens so a screen reader reads it once.
  useEffect(() => {
    if (explaining) explanationRef.current?.focus();
  }, [explaining]);

  const label = regionLabel(scene.regions, regionId, look.firstLetter);
  const missing = sounding?.step.status === 'missing' ? sounding.step.reason : null;
  // The Earth rhythm's sentence, for the views that play it. Listen has the scan's own (ListenScan).
  // Changes only on real transitions, so the live region does not chatter every beat.
  const status =
    playState === 'stopped'
      ? `Stopped. ${label} selected.`
      : playState === 'paused'
        ? `Paused on ${label}.`
        : missing
          ? `${label}: missing information. The Earth voice is quiet.`
          : `Playing ${label}.`;

  // The playing side's colour (DESIGN.md "Live"): the end block on the current tab and on Play, and
  // Listen's needle. Pictures with neutral regions (aerosols, rain) use ink, and so do Home, where no
  // side is chosen, and Listen while it plays the whole picture: no side is playing then.
  const side = view === 'listen' ? (target === 'map' ? null : target) : regionId;
  const live = {
    ['--live' as string]: look.neutral || view === 'home' || !side ? 'var(--ink)' : regionColour(scene.regions, side),
  } as CSSProperties;

  return (
    <>
      {isPractice(ACTIVE) && (
        <div className="practice-banner" role="note">
          PRACTICE DATA — test input, not NASA data
        </div>
      )}
      {/* Layout (Dev B, after seeing it live): a sticky top bar with the title, the tabs and the
          theme switch (on phones the tabs move to a fixed bottom bar), then one main column. */}
      <header className="topbar" ref={topbarRef} style={live}>
        <div className="brand">
          <h1>Earth Sonata</h1>
          <p className="lede">Choose a NASA picture, then hear it.</p>
        </div>
        <PageLinks current={view} />
        <ThemeSwitch />
      </header>

      <main className={view === 'listen' ? 'stage listen-stage' : 'stage'} style={live}>
        {/* Focus target on a view change, announced by screen readers; the tab already shows it.
            Home has its own visible heading (the problem sentence), which takes this role there. */}
        {view !== 'home' && <h2 className="view-title" tabIndex={-1} ref={headingRef}>{viewLabel}</h2>}

        {/* Listen has its own picture list (step 1). Play along shows the picture choice too: the scan
            and the Earth rhythm there follow it. */}
        {(view === 'compare' || view === 'globe' || (view === 'play' && SOURCES.length > 1)) && (
          <div className="pickers">
            <SourceChoice sources={SOURCES} current={sourceKey} onChoose={chooseSource} />
          </div>
        )}

        {/* In the shell, on every view that plays the Earth rhythm (Compare, Play along, Globe). Home
            has no sound, and Listen's sentence is the scan's own (ListenScan). */}
        {view !== 'home' && view !== 'listen' && <p className="status sr-only" role="status">{status}</p>}
        {view !== 'listen' && missing && playState !== 'stopped' && (
          <p className="missing" role="alert">
            Missing information for {label}: {missing}. The Earth voice is quiet until usable detail returns.
          </p>
        )}

        {/* Home shows the ocean picture whichever picture is chosen elsewhere: it is the one the opening
            sentences and the three pictures describe (the practice frame when practice data is on). */}
        {view === 'home' && <HomeView source={sourceByKey('ocean')} pictures={PICTURES} headingRef={headingRef} />}

        {view === 'listen' && (
          <ListenView
            pictures={SOURCES}
            picture={source}
            onPicture={chooseSource}
            target={target}
            onTarget={chooseTarget}
            look={look}
            scanRef={scan}
            speed={speed}
            onSpeed={changeSpeed}
            volumeDb={scanDb}
            onVolume={setScanDb}
            soundId={scanSoundId}
            onSound={setScanSoundId}
            explaining={explaining}
            onExplain={() => setExplaining((x) => !x)}
            explanationRef={explanationRef}
          />
        )}
        {view === 'compare' && (
          <CompareView
            scene={scene}
            features={features}
            imageUrl={source.imageUrl}
            regionId={regionId}
            playState={playState}
            getPosition={getPosition}
            onListen={listenTo}
            onStop={stop}
            look={look}
            sounding={sounding}
            beat={soundingBeat}
            speed={speed}
            earthSound={earthSound}
            onEarthSound={(id) => {
              setEarthSound(id);
              transport.current?.setSound(id);
            }}
          />
        )}
        {view === 'globe' && (
          <GlobeTab source={source} regionId={regionId} onPlayRegion={listenTo} playing={playState === 'playing'} onStop={stop}
            speed={speed} onSpeed={changeSpeed} scanRef={scan} />
        )}
        {view === 'how' && <HowView />}
        {view === 'play' && (
          <PlayView
            scanPicture={scanPicture}
            scanNote={scanNote}
            speed={speed}
            onSpeed={changeSpeed}
            scanRef={scan}
            playState={playState}
            onStart={start}
            onPause={pause}
            onStop={stop}
            earthSound={earthSound}
            onEarthSound={(id) => {
              setEarthSound(id);
              transport.current?.setSound(id);
            }}
            heldNotes={heldNotes}
            melodyDb={melodyDb}
            melodyInstrument={melodyInstrument}
            onMelodyInstrument={(id) => {
              setMelodyInstrument(id);
              melody.current?.setInstrument(id);
            }}
            onNoteOn={onMelodyNoteOn}
            onNoteOff={onMelodyNoteOff}
            onAllOff={onMelodyAllOff}
            onMelodyVolume={(db) => {
              setMelodyDb(db);
              melody.current?.setVolume(db);
            }}
            regionLetter={label.replace('Region ', '')}
            colour={regionStyle(scene.regions, regionId, look)}
          />
        )}
      </main>
    </>
  );
}
