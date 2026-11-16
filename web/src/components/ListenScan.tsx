// Listen, the picture and step 3: the picture scan played with the page's player bar (P1, decision
// D1: Listen's sound is the scan; the Earth rhythm stays the sound of Compare and the game).
//
// The picture is framed by its own two sound axes:
//   - under it, the sound line: every struck note of the scan, by time and pitch, with the playhead.
//     On the map sweep its x is the picture's x, so the playhead stands under the scan line;
//   - beside it, the twelve held notes, each next to the band of the picture it reads.
// The picture, the score, the player and the drawing loop are the ones every view of the scan shares
// (web/src/scan/), so Listen plays exactly what Play along plays. The score uses the chosen picture's
// own settings (data/sources.ts, ScanRule), never another picture's.
// No sound before Play; Stop and Esc (App) silence it; choosing another picture stops it (App, and
// ListenView gives each picture its own ListenScan, whose player is disposed with it).
import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { SCAN_SOUNDS, type ScanSoundId } from '../audio/instruments';
import { scanChoicesFor } from '../audio/scanChoices';
import type { ScanState } from '../audio/scanPlayer';
import { bandNote, noteName, type ScanScore } from '../audio/scanScore';
import { factsOf, regionLetter, scanRegions, targetName, type ScanTarget, type Source } from '../data/sources';
import type { Region } from '../data/types';
import { ScanHow, ScanLegend } from '../scan/ScanLegend';
import { ScanOverlay, drawSweep, viewOf } from '../scan/ScanOverlay';
import { longitude, useScan, type ScanHandle } from '../scan/useScan';
import { useScanFrame } from '../scan/useScanFrame';
import { PlayerBar, regionStyle, type RegionLook } from './ExploreControls';
import { ScanExplanation, WHY_START, type WhyView } from './ScanExplanation';
import { Graticule } from './SceneView';

export type ListenScanHandle = ScanHandle;

interface Props {
  picture: Source;
  target: ScanTarget;
  look: RegionLook;
  speed: number;
  onSpeed: (speed: number) => void;
  volumeDb: number;
  onVolume: (db: number) => void;
  soundId: ScanSoundId;
  onSound: (id: ScanSoundId) => void;
  explaining: boolean;
  onExplain: () => void;
  explanationRef: RefObject<HTMLElement | null>;
  /** Pressing a circle on the picture chooses it in step 2 (keyboard users use step 2). */
  onPickRegion: (regionId: string) => void;
}

const WORD: Record<ScanState, string> = { stopped: 'Ready', paused: 'Paused', playing: 'Playing' };

/** "0:13": minutes and seconds. */
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export const ListenScan = forwardRef<ListenScanHandle, Props>(function ListenScan(p, ref) {
  const { picture, target } = p;
  const rule = picture.scan;
  const scan = useScan({ scene: picture.scene, imageUrl: picture.imageUrl, speed: p.speed, rule });
  const { loaded, loadError, state, traces, frame, region, worldMap, score, bands, sound, why, liveColumn, lastStruck, side, setTarget, setVolumeDb, setSoundId } = scan;
  // Step 2, the volume and the instruments are the page's (App); the shared scan follows them.
  useEffect(() => setTarget(target), [target, setTarget]);
  useEffect(() => setVolumeDb(p.volumeDb), [p.volumeDb, setVolumeDb]);
  useEffect(() => setSoundId(p.soundId), [p.soundId, setSoundId]);
  useImperativeHandle(ref, () => ({ stop: scan.stop }), [scan.stop]);

  const sweep = useRef<SVGGElement>(null);
  const profile = useRef<SVGPathElement>(null);
  const unplayed = useRef<SVGPathElement>(null);
  const played = useRef<SVGPathElement>(null);
  const sweepRefs = useMemo(() => ({ sweep, profile, unplayed, played }), []);
  const lane = useRef<HTMLDivElement>(null);
  const whereText = useRef<HTMLSpanElement>(null);
  const timeText = useRef<HTMLSpanElement>(null);
  const textAt = useRef(0);
  const speedRef = useRef(p.speed);
  speedRef.current = p.speed;

  const test = !!loaded?.isTest || !picture.imageUrl;
  const regions = scanRegions(picture);
  const name = targetName(picture, region ? region.id : 'map');
  const seconds = score?.grid.seconds ?? 30;

  // The line, the sound line's playhead and the time, moved every frame by the shared loop (which
  // also fills the held notes' bars: they are registered in `side.bars`).
  useScanFrame(scan, ({ position, levels, region: r, frame: f, playing, grid }) => {
    drawSweep(sweepRefs, f, r, position, levels);
    lane.current?.style.setProperty('--pos', position.toFixed(4));
    const now = performance.now();
    if (now - textAt.current < 240 && playing) return; // a few times a second is enough to read
    textAt.current = now;
    const total = grid.seconds / speedRef.current;
    if (timeText.current) timeText.current.textContent = `${clock(position * total)} / ${clock(total)}`;
    if (whereText.current) {
      whereText.current.textContent = !playing && position === 0
        ? ''
        : r
          ? `line at ${Math.round(position * 360)}°`
          : worldMap
            ? `line at ${longitude(position)}`
            : `line ${Math.round(position * 100)}% across`;
    }
  });

  // "Why the scan sounds like this": folded under Explain until asked for. Explain opens on the key
  // to the marks, which is what a first look needs (critique, 16 Nov).
  const [whyView, setWhyView] = useState<WhyView>(WHY_START);
  const changeWhy = useCallback(
    (change: Partial<WhyView>) =>
      setWhyView((v) => ((Object.keys(change) as (keyof WhyView)[]).some((k) => v[k] !== change[k]) ? { ...v, ...change } : v)),
    [],
  );
  useEffect(() => changeWhy({ column: 0, pick: null, follow: true }), [score, changeWhy]);
  const bandSentenceId = useId();
  const choices = useMemo(() => scanChoicesFor(rule ? factsOf(rule) : undefined), [rule]);

  const across = worldMap ? 'west to east' : 'left to right';
  const fullName = region && !test ? `${name}, ${region.name}` : region ? name : 'the whole picture';
  // One sentence for screen readers, only on real changes (DESIGN.md: state is shown, not narrated).
  const status =
    state === 'playing'
      ? region
        ? `Playing ${fullName}: a radar line turns around the circle, again until you stop.`
        : `Playing the whole picture: a line moves ${across}, again until you stop.`
      : state === 'paused'
        ? `Paused on ${fullName}.`
        : `Stopped. ${region ? fullName : 'The whole picture'} selected.`;

  const order = region ? 'the centre to the rim' : worldMap ? 'south to north' : 'bottom to top';
  const letter = region && !test ? regionLetter(picture, region.id) : null;
  const axis = region
    ? worldMap
      ? ['0° E', '90° N', '180° W', '270° S', '360° E']
      : ['0°', '90°', '180°', '270°', '360°']
    : worldMap
      ? ['180°', '120° W', '60° W', '0°', '60° E', '120° E', '180°']
      : ['left edge', 'middle', 'right edge'];
  const aspect = frame.width / frame.height;
  const figureState = [state, scan.reducedMotion ? 'still' : ''].join(' ').trim();

  return (
    <div className={`listen-scan ${region ? 'radar' : 'line'} ${state}`} style={{ '--aspect': aspect } as CSSProperties}>
      <div className="listen-area">
        <div className="listen-axes">
          {region ? (
            <div className="listen-radar">
              <figure className={`listen-figure scan-view radar ${figureState}`}>
                <div className="zoom">
                  <RadarPicture frame={frame} region={region} href={loaded?.href ?? null} label={`${test ? 'Test picture' : picture.scene.source.title}, zoomed to ${fullName}.`}>
                    <ScanOverlay frame={frame} region={region} bands={bands} traces={traces} worldMap={worldMap} refs={sweepRefs} />
                  </RadarPicture>
                </div>
              </figure>
              <div className="listen-where" style={regionStyle(picture.scene.regions, region.id, p.look)}>
                <p className="where-name">
                  {letter && <span className="region-badge" aria-hidden="true">{letter}</span>}
                  {test ? name : `${name}: ${region.name}`}
                </p>
                <p className="where-desc">The radar reads only inside this circle: the centre is low, the rim high.</p>
                {loaded && !test && (
                  <svg className="where-map" viewBox={`0 0 ${frame.width} ${frame.height}`} role="img" aria-label={`Where ${name} is on the whole picture.`}>
                    <image href={loaded.href} width={frame.width} height={frame.height} preserveAspectRatio="none" />
                    <g className="box active">
                      <circle className="ring-outline" cx={region.center_px[0]} cy={region.center_px[1]} r={region.radius_px * 1.6} />
                      <circle className="ring" cx={region.center_px[0]} cy={region.center_px[1]} r={region.radius_px * 1.6} />
                    </g>
                  </svg>
                )}
              </div>
            </div>
          ) : (
            <figure className={`listen-figure scan-view line ${figureState}`}>
              <div className="chart">
                <svg
                  viewBox={`0 0 ${frame.width} ${frame.height}`}
                  role="img"
                  aria-label={
                    test
                      ? 'Test picture for the scan: three coloured dots and a grey block on black.'
                      : `${picture.scene.source.title}, with ${regions.length} regions: ${regions.map((r) => `${targetName(picture, r.id)}, ${r.name}`).join('; ')}.`
                  }
                >
                  {loaded ? (
                    <image href={loaded.href} width={frame.width} height={frame.height} preserveAspectRatio="none" />
                  ) : (
                    <rect width={frame.width} height={frame.height} className="frame-placeholder" />
                  )}
                  {loaded &&
                    regions.map((r) => (
                      <g key={r.id} className="box" style={regionStyle(picture.scene.regions, r.id, p.look)} data-region={r.id} onClick={() => p.onPickRegion(r.id)}>
                        <circle className="ring-outline" cx={r.center_px[0]} cy={r.center_px[1]} r={r.radius_px} />
                        <circle className="ring" cx={r.center_px[0]} cy={r.center_px[1]} r={r.radius_px} />
                      </g>
                    ))}
                  <ScanOverlay frame={frame} bands={bands} traces={traces} worldMap={worldMap} refs={sweepRefs} />
                </svg>
                {!test && <MapTags picture={picture} regions={regions} frame={frame} look={p.look} />}
                {worldMap && <Graticule />}
              </div>
            </figure>
          )}

          {/* The y axis: the twelve held notes, highest at the top, each beside the band it reads.
              Filled by the shared drawing loop through `side.bars`; empty while stopped (styles.css). */}
          <div className="band-meter" aria-hidden="true">
            <span className="meter-cap">Held notes</span>
            {Array.from({ length: bands }, (_, i) => bands - 1 - i).map((band) => (
              <span key={band} className="band" ref={(el) => void (side.bars.current[band] = el)}>
                <b>{noteName(bandNote(band))}</b>
                <i />
              </span>
            ))}
          </div>

          <div className="listen-under">
            {test ? (
              <span className="scan-test">TEST INPUT — a made-up picture, not NASA data</span>
            ) : (
              <span className="credit">
                Visualization: {picture.scene.source.credit}
                {rule?.mask && <span className="never-read"> · The scan never reads {rule.mask.what}.</span>}
              </span>
            )}
            <div className="listen-notes" aria-live="polite">
              {loadError && <p className="missing">The picture did not load: {loadError}. The scan stays quiet.</p>}
              {!rule && <p className="missing">The scan has not been measured on this picture yet, so it does not play it.</p>}
              {score?.status === 'missing' && <p className="missing">Nothing to play for {fullName}: {score.reason}. The scan stays quiet.</p>}
            </div>
          </div>
        </div>

        <PlayerBar
          className="axis"
          label="Step 3 of 3: play"
          step={3}
          playState={state}
          canPlay={scan.ready}
          explaining={p.explaining}
          speed={p.speed}
          volumeDb={p.volumeDb}
          onStart={() => void scan.player.current?.start()}
          onPause={() => scan.player.current?.pause()}
          onStop={scan.stop}
          onExplain={p.onExplain}
          onSpeed={p.onSpeed}
          onVolume={p.onVolume}
          settings={
            <label className="scan-sound">
              Instruments{' '}
              <select value={p.soundId} onChange={(e) => p.onSound(e.target.value as ScanSoundId)}>
                {SCAN_SOUNDS.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </label>
          }
        >
          <div className="sound-line" aria-hidden="true">
            <div className="sl-head">
              <span className={`now-chip ${state}`}>
                {letter ? <b className="region-badge" style={regionStyle(picture.scene.regions, region!.id, p.look)}>{letter}</b> : <span className={region ? 'circle-icon small' : 'sweep-icon small'} />}
                <span>{name} · {WORD[state]}</span>
              </span>
              <span className="sl-where" ref={whereText} />
              <span className="sl-key">
                <i className="warm" /> red or orange <i className="cool" /> other colours
              </span>
              <span className="sl-time" ref={timeText}>0:00 / {clock(seconds / p.speed)}</span>
            </div>
            <div className={state === 'stopped' ? 'sl-lane idle' : 'sl-lane'} ref={lane}>
              {/* Pulse's needle in the side's colour (--live), and the part already played washed in it. */}
              <span className="sl-wash" />
              <SoundMarks score={score} />
              <SoundMarks score={score} played />
              <span className="sl-needle" />
            </div>
            <div className="sl-axis">
              {axis.map((t, i) => (
                <span key={i} style={{ left: `${(100 * i) / (axis.length - 1)}%` }}>{t}</span>
              ))}
            </div>
          </div>
        </PlayerBar>
      </div>

      <p className="status sr-only" role="status">{status}</p>

      {p.explaining && (
        <section className="explain-scan" ref={p.explanationRef} tabIndex={-1} aria-labelledby="explain-scan-title">
          {/* The honesty lines are said once, on How it's made (team rule), not in every explanation.
              First the key to what is on screen, open; the full working, folded, for whoever wants it. */}
          <h3 id="explain-scan-title">Explain</h3>
          <div className="explain-key">
            <h4>What the marks mean</h4>
            <ScanLegend sound={sound} order={order} radar={!!region} bars="beside" />
          </div>
          {score ? (
            <ScanExplanation
              score={score}
              ctx={why}
              playing={state === 'playing'}
              getColumn={liveColumn}
              lastStruck={lastStruck}
              view={whyView}
              onChange={changeWhy}
              bandSentenceId={bandSentenceId}
              choices={choices}
            />
          ) : (
            <p className="muted">Nothing to explain yet: the scan has no score for this picture.</p>
          )}
          <details className="scan-how">
            <summary>How the picture becomes sound</summary>
            <ScanHow scene={picture.scene} rule={rule} isTest={test} />
          </details>
        </section>
      )}
    </div>
  );
});

/** The zoomed circle for the radar. */
function RadarPicture({ frame, region, href, label, children }: { frame: { width: number; height: number }; region: Region; href: string | null; label: string; children: React.ReactNode }) {
  const { view } = viewOf(frame, region);
  return (
    <svg viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} role="img" aria-label={label}>
      {href ? <image href={href} width={frame.width} height={frame.height} preserveAspectRatio="none" /> : <rect width={frame.width} height={frame.height} className="frame-placeholder" />}
      {children}
    </svg>
  );
}

/** Every struck note of the score on the sound line: x is time (the picture's x on the map sweep, the
 *  turn on the radar), y is pitch. The second copy shows the notes already played, clipped at the playhead. */
function SoundMarks({ score, played = false }: { score: ScanScore | null; played?: boolean }) {
  if (!score) return <div className={played ? 'sl-marks played' : 'sl-marks'} />;
  const { columns, bands } = score.grid;
  return (
    <div className={played ? 'sl-marks played' : 'sl-marks'}>
      {score.chimes.map((c) => (
        <i
          key={`${c.column}-${c.band}`}
          className={c.warm ? 'warm' : 'cool'}
          style={{ left: `${(100 * (c.column + 0.5)) / columns}%`, top: `${100 * (1 - (c.band + 0.5) / bands)}%` }}
        />
      ))}
    </div>
  );
}

/** Region tags on the map: above each circle, or below it when the space above runs into another
 *  circle (the rain picture's two circles sit close together). */
function MapTags({ picture, regions, frame, look }: { picture: Source; regions: Region[]; frame: { width: number; height: number }; look: RegionLook }) {
  // A tag is about 90 × 24 px on a picture about 800 px wide: its size in the frame's own pixels.
  const tagW = (90 / 800) * frame.width;
  const tagH = (24 / 800) * frame.width;
  const gap = (6 / 800) * frame.width;
  const hits = (x0: number, y0: number, self: Region) =>
    regions.some((o) => {
      if (o === self) return false;
      const nx = Math.max(x0, Math.min(o.center_px[0], x0 + tagW));
      const ny = Math.max(y0, Math.min(o.center_px[1], y0 + tagH));
      return Math.hypot(nx - o.center_px[0], ny - o.center_px[1]) < o.radius_px;
    });
  return (
    <>
      {regions.map((r) => {
        const [cx, cy] = r.center_px;
        const below = hits(cx - tagW / 2, cy - r.radius_px - gap - tagH, r);
        // Near an edge the tag slides in, so it never runs into the graticule.
        const x = Math.min(frame.width - tagW / 2, Math.max(tagW / 2, cx));
        const letter = regionLetter(picture, r.id);
        return (
          <span
            key={r.id}
            className={below ? 'map-tag below' : 'map-tag'}
            aria-hidden="true"
            style={{
              ...regionStyle(picture.scene.regions, r.id, look),
              left: `${(x / frame.width) * 100}%`,
              top: `${((below ? cy + r.radius_px : cy - r.radius_px) / frame.height) * 100}%`,
            }}
          >
            <b>{letter}</b>
            <span>Region {letter}</span>
          </span>
        );
      })}
    </>
  );
}
