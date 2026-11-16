import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ACTIVE, isPractice } from './data/dataset';
import { buildEarthTrack, type TrackStep } from './audio/earthVoice';
import { Transport, type PlayState } from './audio/transport';
import { UserVoice, type InputSource } from './audio/userVoice';
import { DEFAULT_MELODY_INSTRUMENT, type MelodyInstrumentId } from './audio/instruments';
import type { PictureScanHandle } from './components/PictureScan';
import { BeatTrack } from './components/BeatTrack';
import { PlayerBar, RegionChoice, regionColour, regionLabel, regionStyle } from './components/ExploreControls';
import { PageLinks } from './components/PageLinks';
import { ThemeSwitch } from './components/ThemeSwitch';
import { stepAtSameMoment } from './components/RhythmExplanation';
import { SourceChoice } from './components/SourceChoice';
import { selectSource } from './data/selection';
import { otherRegionOf, PICTURES, sourceByKey, SOURCES, type SourceKey } from './data/sources';
import { useView, VIEWS } from './views';
import { CompareView } from './views/CompareView';
import { HomeView } from './views/HomeView';
import { HowView } from './views/HowView';
import { ListenView } from './views/ListenView';
import { PlayView } from './views/PlayView';
import { GlobeTab } from './views/GlobeView';


export function App() {
  // The picture being played (the jukebox) and its region. Every comparison uses this one source.
  const [sourceKey, setSourceKey] = useState<SourceKey>(SOURCES[0].key);
  const source = sourceByKey(sourceKey);
  const { scene, features, imageUrl } = source;
  const look = { firstLetter: source.firstLetter, neutral: source.regionStyle === 'neutral' };
  // The picture scan (Play along) always plays the ocean picture, whichever picture is chosen on
  // Listen: its colour rule was built and checked on the ocean's temperature colours only, and the
  // ocean's regions are A and B, as the scan labels them (Dev B's review of #45).
  const scanPicture = sourceByKey('ocean');
  const [regionId, setRegionId] = useState(SOURCES[0].scene.regions[0].id);
  const [playState, setPlayState] = useState<PlayState>('stopped');
  const [sounding, setSounding] = useState<TrackStep | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [volumeDb, setVolumeDb] = useState(-6);
  const [melodyDb, setMelodyDb] = useState(-10);
  const [melodyInstrument, setMelodyInstrument] = useState<MelodyInstrumentId>(DEFAULT_MELODY_INSTRUMENT);
  const [heldNotes, setHeldNotes] = useState<ReadonlySet<number>>(new Set());
  const transport = useRef<Transport | null>(null);
  const melody = useRef<UserVoice | null>(null);
  const scan = useRef<PictureScanHandle>(null);
  const explanationRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
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

  const start = useCallback(() => void transport.current?.start(), []);
  const pause = useCallback(() => transport.current?.pause(), []);
  const stop = useCallback(() => {
    transport.current?.stop();
    melody.current?.hush(); // Stop silences everything: the melody and its echo,
    scan.current?.stop(); // and the picture scan
    setSounding(null);
  }, []);
  const replay = useCallback(() => void transport.current?.replay(), []);
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
  // Beat visualizer (Student B's lane): read the audio clock, and jump within the loop.
  const getPosition = useCallback(() => transport.current?.loopPosition() ?? 0, []);
  const seek = useCallback((t: number) => transport.current?.seek(t), []);
  // "Listen to Region A/B" in the close-ups: choose the region, and start if nothing is playing.
  const listenTo = useCallback((id: string) => {
    setRegionId(id);
    if (transport.current?.getState() !== 'playing') void transport.current?.start();
  }, []);

  // Keyboard shortcuts on top of the normal Tab / Enter / Space controls.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Escape') return stop();
      // 1/2 work only while focus is on the Region choice, the control they operate, so number keys
      // elsewhere stay free for speech input and other tools (WCAG 2.2 SC 2.1.4; docs/DECISIONS.md D8).
      if (!(e.target instanceof Element) || !e.target.closest('.region-group')) return;
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= scene.regions.length) {
        const id = scene.regions[n - 1].id;
        setRegionId(id);
        // Move focus with the selection, as arrow keys do, so the next arrow press starts from here.
        document.querySelector<HTMLInputElement>(`input[name="region"][value="${id}"]`)?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stop, scene]);

  // Choosing another picture is like Stop, then its first region is selected.
  const chooseSource = useCallback(
    (key: SourceKey) => {
      stop();
      const next = selectSource(key);
      setSourceKey(next.sourceKey);
      setRegionId(next.regionId);
    },
    [stop],
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
  // For the comparison line: the other region's measurement at the same source moment (two regions only).
  const otherRegion = otherRegionOf(source, regionId);
  const other = otherRegion
    ? {
        label: regionLabel(scene.regions, otherRegion.id, look.firstLetter),
        step: sounding ? stepAtSameMoment(features.steps, sounding.step, otherRegion.id) : null,
      }
    : null;
  const missing = sounding?.step.status === 'missing' ? sounding.step.reason : null;
  // Changes only on real transitions, so the live region does not chatter every beat.
  const status =
    playState === 'stopped'
      ? `Stopped. ${label} selected.`
      : playState === 'paused'
        ? `Paused on ${label}.`
        : missing
          ? `${label}: missing information. The Earth voice is quiet.`
          : `Playing ${label}.`;

  // The playing side's colour (DESIGN.md "Live"): the end block on the current tab and on Play.
  // Pictures with neutral regions (aerosols, rain) use ink, and so does Home, where no side is chosen.
  const live = {
    ['--live' as string]: look.neutral || view === 'home' ? 'var(--ink)' : regionColour(scene.regions, regionId),
  } as CSSProperties;

  return (
    <>
      {isPractice(ACTIVE) && (
        <div className="practice-banner" role="note">
          PRACTICE DATA — test input, not NASA data
        </div>
      )}
      {/* Layout (Dev B, after seeing it live): a sticky top bar with the title, four tabs and the
          theme switch (on phones the tabs move to a fixed bottom bar), then one main column. */}
      <header className="topbar" style={live}>
        <div className="brand">
          <h1>Earth Sonata</h1>
          {/* Student B's title line (docs/design/student_b_pictures.html), made picture-neutral
              now that the app plays three pictures. */}
          <p className="lede">Hear two regions. Lined-up streaks play an even pulse.</p>
        </div>
        <PageLinks current={view} />
        <ThemeSwitch />
      </header>

      <main className="stage" style={live}>
        {/* Focus target on a view change, announced by screen readers; the tab already shows it.
            Home has its own visible heading (the problem sentence), which takes this role there. */}
        {view !== 'home' && <h2 className="view-title" tabIndex={-1} ref={headingRef}>{viewLabel}</h2>}

        {(view === 'listen' || view === 'compare' || view === 'globe') && (
          <div className="pickers">
            <SourceChoice sources={SOURCES} current={sourceKey} onChoose={chooseSource} />
            {view === 'listen' && (
              <RegionChoice
                step={SOURCES.length > 1 ? 2 : 1}
                regions={scene.regions}
                regionId={regionId}
                onRegion={setRegionId}
                look={look}
                imageUrl={imageUrl}
                frame={scene.frames}
              />
            )}
          </div>
        )}

        {/* In the shell, on every view that has sound (not Home, which has none): sound can start on
            Listen, Compare and Play along. */}
        {view !== 'home' && <p className="status sr-only" role="status">{status}</p>}
        {missing && playState !== 'stopped' && (
          <p className="missing" role="alert">
            Missing information for {label}: {missing}. The Earth voice is quiet until usable detail returns.
          </p>
        )}

        {/* Home shows the ocean picture whichever picture is chosen elsewhere: it is the one the opening
            sentences and the three pictures describe (the practice frame when practice data is on). */}
        {view === 'home' && <HomeView source={sourceByKey('ocean')} pictures={PICTURES} headingRef={headingRef} />}

        {view === 'listen' && (
          <ListenView
            scene={scene}
            imageUrl={imageUrl}
            regionId={regionId}
            label={label}
            look={look}
            onSelect={setRegionId}
            sounding={sounding}
            explaining={explaining}
            explanationRef={explanationRef}
            other={other}
            explainRows={[
              { region: scene.regions.find((r) => r.id === regionId)!, step: sounding?.step ?? null, playing: true },
              ...(otherRegion ? [{ region: otherRegion, step: other?.step ?? null, playing: false }] : []),
            ].map((row) => {
              const l = regionLabel(scene.regions, row.region.id, look.firstLetter);
              return { ...row, label: l, letter: l.replace('Region ', ''), colour: regionStyle(scene.regions, row.region.id, look) };
            })}
            player={
              <PlayerBar
                step={SOURCES.length > 1 ? 3 : 2}
                playState={playState}
                explaining={explaining}
                speed={speed}
                volumeDb={volumeDb}
                onStart={start}
                onPause={pause}
                onStop={stop}
                onReplay={replay}
                onExplain={() => setExplaining((x) => !x)}
                onSpeed={changeSpeed}
                onVolume={(db) => {
                  setVolumeDb(db);
                  transport.current?.setVolume(db);
                }}
              >
                <BeatTrack
                  track={track}
                  colour={regionStyle(scene.regions, regionId, look)}
                  regionLabel={label}
                  playState={playState}
                  speed={speed}
                  getPosition={getPosition}
                  onSeek={seek}
                />
              </PlayerBar>
            }
          />
        )}
          {view === 'compare' && (
            <CompareView
              scene={scene}
              features={features}
              imageUrl={imageUrl}
              regionId={regionId}
              playState={playState}
              getPosition={getPosition}
              onListen={listenTo}
              onStop={stop}
              look={look}
            />
          )}
          {view === 'globe' && (
            <GlobeTab source={source} regionId={regionId} onPlayRegion={listenTo} playing={playState === 'playing'} onStop={stop}
              speed={speed} onSpeed={changeSpeed} scanRef={scan} />
          )}
          {view === 'how' && <HowView source={source} pictures={PICTURES} />}
          {view === 'play' && (
            <PlayView
              scene={scanPicture.scene}
              imageUrl={scanPicture.imageUrl}
              speed={speed}
              onSpeed={changeSpeed}
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
