import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ACTIVE, isPractice } from './data/dataset';
import { buildEarthTrack, type TrackStep } from './audio/earthVoice';
import { Transport, type PlayState } from './audio/transport';
import { UserVoice, type InputSource } from './audio/userVoice';
import { ExploreControls, regionLabel, regionStyle } from './components/ExploreControls';
import { PageLinks } from './components/PageLinks';
import { ThemeSwitch } from './components/ThemeSwitch';
import { stepAtSameMoment } from './components/RhythmExplanation';
import { useView, VIEWS } from './views';
import { CompareView } from './views/CompareView';
import { HowView } from './views/HowView';
import { ListenView } from './views/ListenView';
import { PlayView } from './views/PlayView';

const { scene, features, imageUrl } = ACTIVE;

export function App() {
  const [regionId, setRegionId] = useState(scene.regions[0].id);
  const [playState, setPlayState] = useState<PlayState>('stopped');
  const [sounding, setSounding] = useState<TrackStep | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [volumeDb, setVolumeDb] = useState(-6);
  const [melodyDb, setMelodyDb] = useState(-10);
  const [heldNotes, setHeldNotes] = useState<ReadonlySet<number>>(new Set());
  const transport = useRef<Transport | null>(null);
  const melody = useRef<UserVoice | null>(null);
  const explanationRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const view = useView();
  const viewLabel = VIEWS.find((v) => v.key === view)!.label;

  const track = useMemo(() => buildEarthTrack(features, regionId), [regionId]);

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
    melody.current?.allOff(); // Stop silences everything, melody included
    setSounding(null);
  }, []);
  const replay = useCallback(() => void transport.current?.replay(), []);
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
  }, [stop]);

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

  const label = regionLabel(scene.regions, regionId);
  // For the comparison line: the other region's measurement at the same source moment (two regions only).
  const otherRegion = scene.regions.length === 2 ? scene.regions.find((r) => r.id !== regionId) : undefined;
  const other = otherRegion
    ? {
        label: regionLabel(scene.regions, otherRegion.id),
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

  return (
    <>
      {isPractice(ACTIVE) && (
        <div className="practice-banner" role="note">
          PRACTICE DATA — test input, not NASA data
        </div>
      )}
      {/* Layout: a fixed rail with the title, theme switch and the
          controls, and a main column. The NASA image stays large in the main column: in a 400 px rail
          each region circle would be about 10 px across. Below 960 px the rail stacks on top. */}
      <div className="layout">
        <div className="rail">
          <header>
            <h1>Earth Sonata: Play the Planet</h1>
            <p className="lede">
              Compare two regions of a NASA ocean visualization by ear. More aligned lines, more even pulse.
            </p>
          </header>

          <PageLinks current={view} />

          {view === 'listen' && (
            <ExploreControls
              regions={scene.regions}
              regionId={regionId}
              playState={playState}
              explaining={explaining}
              speed={speed}
              volumeDb={volumeDb}
              onStart={start}
              onPause={pause}
              onStop={stop}
              onReplay={replay}
              onRegion={setRegionId}
              onExplain={() => setExplaining((x) => !x)}
              onSpeed={(s) => {
                setSpeed(s);
                transport.current?.setSpeed(s);
              }}
              onVolume={(db) => {
                setVolumeDb(db);
                transport.current?.setVolume(db);
              }}
            />
          )}

          <ThemeSwitch />
        </div>

        <main className="stage">
          <h2 className="view-title" tabIndex={-1} ref={headingRef}>{viewLabel}</h2>
          {/* In the shell, on every view: sound can start on Listen, Compare and Play along. */}
          <p className="status" role="status">{status}</p>
          {missing && playState !== 'stopped' && (
            <p className="missing" role="alert">
              Missing information for {label}: {missing}. The Earth voice is quiet until usable detail returns.
            </p>
          )}

          {view === 'listen' && (
            <ListenView
              scene={scene}
              imageUrl={imageUrl}
              regionId={regionId}
              label={label}
              colour={regionStyle(scene.regions, regionId)}
              track={track}
              sounding={sounding}
              playState={playState}
              speed={speed}
              getPosition={getPosition}
              onSeek={seek}
              explaining={explaining}
              explanationRef={explanationRef}
              other={other}
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
            />
          )}
          {view === 'how' && <HowView scene={scene} />}
          {view === 'play' && (
            <PlayView
              playState={playState}
              onStart={start}
              onPause={pause}
              onStop={stop}
              heldNotes={heldNotes}
              melodyDb={melodyDb}
              onNoteOn={onMelodyNoteOn}
              onNoteOff={onMelodyNoteOff}
              onAllOff={onMelodyAllOff}
              onMelodyVolume={(db) => {
                setMelodyDb(db);
                melody.current?.setVolume(db);
              }}
            />
          )}
        </main>
      </div>
    </>
  );
}
