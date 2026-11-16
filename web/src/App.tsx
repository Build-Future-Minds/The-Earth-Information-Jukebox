import { type CSSProperties, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ACTIVE, isPractice } from './data/dataset';
import { buildEarthTrack, type TrackStep } from './audio/earthVoice';
import { Transport, type PlayState } from './audio/transport';
import { UserVoice, type InputSource } from './audio/userVoice';
import { DEFAULT_MELODY_INSTRUMENT, DEFAULT_SCAN_SOUND, type MelodyInstrumentId, type ScanSoundId } from './audio/instruments';
import { regionColour, regionLabel, regionStyle } from './components/ExploreControls';
import { PageLinks } from './components/PageLinks';
import { ThemeSwitch } from './components/ThemeSwitch';
import { SourceChoice } from './components/SourceChoice';
import { selectSource } from './data/selection';
import { PICTURES, sourceByKey, SOURCES, type ScanTarget, type SourceKey } from './data/sources';
import { useView, VIEWS } from './views';
import { CompareView } from './views/CompareView';
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
  const [regionId, setRegionId] = useState(SOURCES[0].scene.regions[0].id);
  // What Listen's scan reads: the whole picture, or one region's circle.
  const [target, setTarget] = useState<ScanTarget>('map');
  const [playState, setPlayState] = useState<PlayState>('stopped');
  const [sounding, setSounding] = useState<TrackStep | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [scanDb, setScanDb] = useState(-8);
  const [scanSoundId, setScanSoundId] = useState<ScanSoundId>(DEFAULT_SCAN_SOUND);
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
    const t = new Transport({ onStep: setSounding, onState: setPlayState });
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
  // Listen's needle. Pictures with neutral regions (aerosols, rain) use ink, and so does Listen while
  // it plays the whole picture: no side is playing then.
  const side = view === 'listen' ? (target === 'map' ? null : target) : regionId;
  const live = { ['--live' as string]: look.neutral || !side ? 'var(--ink)' : regionColour(scene.regions, side) } as CSSProperties;

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
        {/* Focus target on a view change, announced by screen readers; the tab already shows it. */}
        <h2 className="view-title" tabIndex={-1} ref={headingRef}>{viewLabel}</h2>

        {(view === 'compare' || view === 'globe') && (
          <div className="pickers">
            <SourceChoice sources={SOURCES} current={sourceKey} onChoose={chooseSource} />
          </div>
        )}

        {view !== 'listen' && <p className="status sr-only" role="status">{status}</p>}
        {view !== 'listen' && missing && playState !== 'stopped' && (
          <p className="missing" role="alert">
            Missing information for {label}: {missing}. The Earth voice is quiet until usable detail returns.
          </p>
        )}

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
            onSpeed={(s) => {
              setSpeed(s);
              transport.current?.setSpeed(s);
            }}
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
          />
        )}
        {view === 'globe' && <GlobeTab source={source} regionId={regionId} onPlayRegion={listenTo} playing={playState === 'playing'} onStop={stop} />}
        {view === 'how' && <HowView source={source} pictures={PICTURES} />}
        {view === 'play' && (
          <PlayView
            scene={scene}
            imageUrl={source.imageUrl}
            rule={source.scan}
            speed={speed}
            scanRef={scan}
            playState={playState}
            onStart={start}
            onPause={pause}
            onStop={stop}
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
