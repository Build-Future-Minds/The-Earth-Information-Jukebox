// Explore the globe, its own tab (loaded only when this view opens): the chosen picture wrapped on a
// globe, with a button for each of its regions, and the picture scan drawn round the globe.
// Choosing a region turns the globe to it and plays it with the same rule as Listen. "Play the
// picture" plays the same scan as Play along (the same pixels, score and sound), with its line drawn
// round the globe, on the picture shown here. The team's region-picking tools stay in globe.html.
import { useCallback, useEffect, useId, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { regionLabel } from '../components/ExploreControls';
import { ScanExplanation, WHY_START, type WhyView } from '../components/ScanExplanation';
import type { Region } from '../data/types';
import type { Source } from '../data/sources';
import { ScanButtons, ScanSettings, ScanStatus } from '../scan/ScanControls';
import { ScanGlobe } from '../scan/ScanGlobe';
import { ScanSide } from '../scan/ScanSide';
import { groundNote } from '../scan/groundNote';
import { NO_SCAN_RULE, scanRuleOf } from '../scan/scanRule';
import { useScan, type ScanHandle, type ScanPicture } from '../scan/useScan';
import { GlobeView } from './GlobeView';
import './globe.css';

interface Props {
  source: Source;
  regionId: string;
  onPlayRegion: (regionId: string) => void;
  /** True while the Earth voice plays; the playing region's button then stops it. */
  playing: boolean;
  onStop: () => void;
  /** The page's speed: the scan follows it, and the speed buttons in Scan settings change it. */
  speed: number;
  onSpeed: (speed: number) => void;
  /** Lets the page's Stop and Esc silence the scan. */
  scanRef?: Ref<ScanHandle>;
}

export default function GlobeSection(props: Props) {
  const rule = scanRuleOf(props.source);
  // A picture with a scan rule gets the scan on the globe, read by that rule; any other picture, the
  // globe and its regions. A new picture remounts the scan (the key): it starts stopped.
  return rule ? <GlobeWithScan key={props.source.key} {...props} picture={props.source as ScanPicture} /> : <GlobeOnly {...props} />;
}

/** The Earth voice's regions: choosing one turns the globe to it and plays it. */
function RegionButtons({ source, region, playing, onPlayRegion, onStop, onTurn }: {
  source: Source; region: Region; playing: boolean; onPlayRegion: (id: string) => void; onStop: () => void; onTurn: () => void;
}) {
  const regions = source.scene.regions;
  return (
    <div className="row">
      {regions.map((r) => {
        const label = regionLabel(regions, r.id, source.firstLetter);
        // A toggle, so the Globe has a visible Stop: Esc alone is no help on a phone.
        const live = playing && r.id === region.id;
        return (
          <button key={r.id} type="button" aria-pressed={live}
            onClick={() => { if (live) onStop(); else { onPlayRegion(r.id); onTurn(); } }}>
            {live ? `Stop ${label}` : `Play ${label}: ${r.name}`}
          </button>
        );
      })}
    </div>
  );
}

/** A picture the scan has no rule for yet: the globe and its regions, as before, and why there is no scan. */
function GlobeOnly({ source, regionId, onPlayRegion, playing, onStop }: Props) {
  const [token, setToken] = useState(0);
  const { scene, imageUrl } = source;
  const region = scene.regions.find((r) => r.id === regionId) ?? scene.regions[0];
  return (
    <div className="globe-section">
      {!imageUrl ? (
        <p className="muted">The globe needs the real NASA picture (practice data has none).</p>
      ) : (
      <GlobeView
        imageUrl={imageUrl}
        frame={{ width: scene.frames.width, height: scene.frames.height }}
        spot={{ center_px: region.center_px, radius_px: region.radius_px }}
        faceSpotToken={token}
        label={`Globe of ${scene.source.title}, turned to ${regionLabel(scene.regions, region.id, source.firstLetter)}.`}
      />
      )}
      <RegionButtons source={source} region={region} playing={playing} onPlayRegion={onPlayRegion} onStop={onStop} onTurn={() => setToken((n) => n + 1)} />
      <p className="muted small">Drag to turn, or focus the globe and use the arrow keys. Credit: {scene.source.credit}.</p>
      <p className="muted small">{NO_SCAN_RULE}</p>
    </div>
  );
}

function GlobeWithScan({ source, regionId, onPlayRegion, playing, onStop, speed, onSpeed, scanRef, picture }: Props & { picture: ScanPicture }) {
  const [token, setToken] = useState(0);
  // Turn with the line: on each time a scan starts from Stop; off when the person turns the globe.
  const [follow, setFollow] = useState(true);
  const [followOff, setFollowOff] = useState(false);
  const { scene, imageUrl } = source;
  const region = scene.regions.find((r) => r.id === regionId) ?? scene.regions[0];
  const scan = useScan({ picture, speed });
  const { state, loaded, region: scanRegion, frame, worldMap, score, why, choices, liveColumn, lastStruck } = scan;

  useImperativeHandle(scanRef, () => ({ stop: scan.stop }), []);

  // What "Why the scan sounds like this" shows, kept as PictureScan keeps it. The globe has no click
  // to choose a place (a press on it turns it), so places are chosen with the fold-out's own controls.
  const [whyView, setWhyView] = useState<WhyView>(WHY_START);
  const changeWhy = useCallback(
    (change: Partial<WhyView>) =>
      setWhyView((v) => ((Object.keys(change) as (keyof WhyView)[]).some((k) => v[k] !== change[k]) ? { ...v, ...change } : v)),
    [],
  );
  // A new score is a new picture or a new scan: the explanation starts again at its first column.
  useEffect(() => changeWhy({ column: 0, pick: null, follow: true }), [score, changeWhy]);
  const bandSentenceId = useId();

  const before = useRef(state);
  useEffect(() => {
    if (before.current === 'stopped' && state === 'playing') {
      setFollow(true);
      setFollowOff(false);
    }
    before.current = state;
  }, [state]);

  // The picture on the globe: the NASA still, or in practice mode the TEST INPUT picture the scan reads.
  const globePicture = imageUrl ?? loaded?.href ?? null;
  const label = loaded?.isTest
    ? `Test picture for the scan, wrapped on a globe: three coloured dots and a grey block on black, not NASA data.`
    : `Globe of ${scene.source.title}, turned to ${regionLabel(scene.regions, region.id, source.firstLetter)}.`;
  // A region's circle on the ground: only on a whole-world map (a test picture claims no ground).
  const ground = scanRegion && worldMap ? groundNote(scanRegion, frame) : null;

  return (
    <div className="globe-section">
      {loaded?.isTest && <span className="scan-test">TEST INPUT — a made-up picture, not NASA data</span>}
      {globePicture ? (
        <ScanGlobe
          scan={scan}
          imageUrl={globePicture}
          spot={{ center_px: region.center_px, radius_px: region.radius_px }}
          sceneFrame={{ width: scene.frames.width, height: scene.frames.height }}
          faceSpotToken={token}
          label={label}
          describedBy="globe-help"
          follow={follow}
          onFollowOff={() => {
            setFollow(false);
            setFollowOff(true);
          }}
        />
      ) : (
        <p className="muted">Loading the picture…</p>
      )}
      <RegionButtons source={source} region={region} playing={playing} onPlayRegion={onPlayRegion} onStop={onStop}
        onTurn={() => {
          setToken((n) => n + 1);
          // Turning to a region is turning the globe yourself.
          if (state !== 'stopped') setFollow(false);
        }} />
      <p id="globe-help" className="muted small">
        Drag to turn, or focus the globe and use the arrow keys. While the scan plays, the globe follows its line; turning
        the globe yourself stops that, and Turn with the line starts it again. Credit: {scene.source.credit}.
      </p>

      <div className="scan globe-scan" role="group" aria-labelledby="scan-heading">
        <h3 id="scan-heading">Play the picture on the globe</h3>
        <p className="muted">
          The same scan as Play along, with its line drawn round the globe: it plays the colours it crosses. A rule we chose;
          the Earth rhythm is unchanged.
        </p>
        <ScanButtons scan={scan}>
          <button type="button" aria-pressed={follow} onClick={() => { setFollow((f) => !f); setFollowOff(false); }}>
            Turn with the line
          </button>
        </ScanButtons>
        <ScanSettings scan={scan} speed={speed} onSpeed={onSpeed} />
        <ScanStatus scan={scan}>
          {followOff && state !== 'stopped' && <p className="scan-status">Turn with the line is off: the globe stays where you turned it.</p>}
        </ScanStatus>
        {ground && <p className="muted small">{ground}</p>}
        <div className="scan-view globe-scan-side">
          <ScanSide scan={scan} hatchDrawn={false} />
        </div>
        {score && (
          <ScanExplanation
            score={score}
            ctx={why}
            choices={choices}
            playing={state === 'playing'}
            getColumn={liveColumn}
            lastStruck={lastStruck}
            view={whyView}
            onChange={changeWhy}
            bandSentenceId={bandSentenceId}
            pickOnPicture={false}
          />
        )}
      </div>
    </div>
  );
}
