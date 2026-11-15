// Globe spotlight prototype (Student A). Drag or arrow-key the globe to turn it.
// The spotlight is a candidate region: the exact pixel circle that would be measured and played.
// Choose the NASA source (ocean currents or aerosols); each keeps its own circles and numbers.
// Built on Dev B's data loading (data/dataset.ts) and styles. See web/src/globe/README.md.
import { useEffect, useMemo, useState } from 'react';
import { GlobeView } from './GlobeView';
import { boxFor, clamp, landShare, limits, lonLatToPx, pxToLonLat, regionJson, type Spot } from './geo';
import { GLOBE_SOURCES, type GlobeSource } from './sources';

function meanAlignment(source: GlobeSource, regionId: string): number | null {
  const ok = source.features?.steps.filter((s) => s.region === regionId && s.status === 'ok') ?? [];
  if (!ok.length) return null;
  return ok.reduce((sum, s) => sum + (s.alignment ?? 0), 0) / ok.length;
}

function usePixels(url: string | null, frame: { width: number; height: number }) {
  const [pixels, setPixels] = useState<Uint8ClampedArray | null>(null);
  useEffect(() => {
    setPixels(null);
    if (!url) return;
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = frame.width;
      canvas.height = frame.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(image, 0, 0, frame.width, frame.height);
      setPixels(ctx.getImageData(0, 0, frame.width, frame.height).data);
    };
    image.src = url;
  }, [url, frame.width, frame.height]);
  return pixels;
}

function startOf(source: GlobeSource) {
  const r = source.scene.regions[0];
  const { width, height } = source.scene.frames;
  const [lon, lat] = pxToLonLat(r.center_px[0], r.center_px[1], width, height);
  return { lon, lat, radius: r.radius_px };
}

export function GlobePage() {
  const [sourceKey, setSourceKey] = useState(GLOBE_SOURCES[0].key);
  const source = GLOBE_SOURCES.find((s) => s.key === sourceKey) ?? GLOBE_SOURCES[0];
  const { scene, imageUrl } = source;
  const frame = useMemo(() => ({ width: scene.frames.width, height: scene.frames.height }), [scene]);
  const first = scene.regions[0];

  // Start exactly on Region 1 (no rounding), so it is recognised as an approved region.
  const [lon, setLon] = useState(() => startOf(source).lon);
  const [lat, setLat] = useState(() => startOf(source).lat);
  const [radius, setRadius] = useState(() => startOf(source).radius);
  const [faceToken, setFaceToken] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);
  const pixels = usePixels(imageUrl, frame);

  const chooseSource = (key: string) => {
    const next = GLOBE_SOURCES.find((s) => s.key === key);
    if (!next) return;
    const s = startOf(next);
    setSourceKey(key);
    setLon(s.lon);
    setLat(s.lat);
    setRadius(s.radius);
    setCopied(null);
    setFaceToken((n) => n + 1);
  };

  const lim = limits(radius, frame.width, frame.height);
  const safeLon = clamp(lon, lim.lonMin, lim.lonMax);
  const safeLat = clamp(lat, lim.latMin, lim.latMax);
  const spot: Spot = useMemo(
    () => ({ center_px: lonLatToPx(safeLon, safeLat, frame.width, frame.height), radius_px: radius }),
    [safeLon, safeLat, radius, frame],
  );
  const preset = scene.regions.find(
    (r) => r.center_px[0] === spot.center_px[0] && r.center_px[1] === spot.center_px[1] && r.radius_px === radius,
  );
  const land = pixels && source.landRule ? landShare(pixels, frame.width, frame.height, spot, source.landRule) : null;
  const json = JSON.stringify(regionJson('candidate', 'Spotlight candidate', spot, frame.width, frame.height));

  const goTo = (center: [number, number], r: number) => {
    const [l, t] = pxToLonLat(center[0], center[1], frame.width, frame.height);
    setLon(l);
    setLat(t);
    setRadius(r);
    setFaceToken((n) => n + 1);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(`Copied the region. Paste it to Dev A, or into ${source.regionsFile}.`);
    } catch {
      setCopied('Copy did not work here. Select the text below and copy it by hand.');
    }
  };

  const where = `Spotlight centred at ${Math.abs(safeLon).toFixed(1)}°${safeLon < 0 ? 'W' : 'E'}, ${Math.abs(safeLat).toFixed(1)}°${safeLat < 0 ? 'S' : 'N'}, radius ${radius} pixels.`;
  const measured = preset ? meanAlignment(source, preset.id) : null;
  const status = preset
    ? `${source.label}, region ${scene.regions.indexOf(preset) + 1}, ${preset.name}: ` +
      (measured === null ? 'not measured yet (waiting for Dev A).' : `measured alignment ${measured.toFixed(3)}.`)
    : 'A new spotlight. It has not been measured yet; copy it below for Dev A.';

  if (!imageUrl) {
    return (
      <main className="stage">
        <p>The globe needs the real NASA picture: add <code>data/preview.jpg</code>, <code>data/scene.json</code> and <code>data/features.json</code> (see data/README.md).</p>
      </main>
    );
  }

  return (
    <div className="layout">
      <aside className="rail" aria-label="Spotlight controls">
        <div>
          <p className="readout">PROTOTYPE · not in the app yet</p>
          <h1>Globe spotlight</h1>
        </div>
        <p id="globe-help">Drag the globe, or focus it and use the arrow keys. Zoom with the mouse wheel, a pinch, the + and − keys or the buttons on the globe (0 resets). The brighter patch is the spotlight: exactly the part of the picture that would be measured and played.</p>

        {GLOBE_SOURCES.length > 1 && (
          <fieldset className="globe-source">
            <legend>Source</legend>
            {GLOBE_SOURCES.map((s) => (
              <label key={s.key} className="region-choice">
                <input type="radio" name="globe-source" id={`source-${s.key}`} value={s.key}
                  checked={s.key === source.key} onChange={() => chooseSource(s.key)} />
                {s.label} <span className="readout">SVS {s.scene.source.svs_id}</span>
              </label>
            ))}
          </fieldset>
        )}

        <fieldset>
          <legend>Approved regions</legend>
          <div className="row">
            {scene.regions.map((r, i) => (
              <button key={r.id} type="button" onClick={() => goTo(r.center_px, r.radius_px)} aria-pressed={preset?.id === r.id}>
                {i + 1} · {r.name}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="globe-sliders">
          <legend>Spotlight</legend>
          <label className="range">
            <span className="range-row"><span>Longitude</span><span className="readout">{safeLon.toFixed(1)}°</span></span>
            <input id="spot-lon" type="range" min={lim.lonMin} max={lim.lonMax} step={0.5} value={safeLon}
              onChange={(e) => setLon(Number(e.target.value))} />
          </label>
          <label className="range">
            <span className="range-row"><span>Latitude</span><span className="readout">{safeLat.toFixed(1)}°</span></span>
            <input id="spot-lat" type="range" min={lim.latMin} max={lim.latMax} step={0.5} value={safeLat}
              onChange={(e) => setLat(Number(e.target.value))} />
          </label>
          <label className="range">
            <span className="range-row"><span>Radius</span><span className="readout">{radius} px</span></span>
            <input id="spot-radius" type="range" min={20} max={200} step={1} value={radius}
              onChange={(e) => setRadius(Number(e.target.value))} />
          </label>
          <p className="readout">
            The centre can't go within {((radius * 360) / frame.width).toFixed(1)}° of the 180° line or within{' '}
            {((radius * 180) / frame.height).toFixed(1)}° of the poles (hatched on the globe). There the circle would
            run off the edge of the flat NASA map, so it couldn't be measured.
          </p>
          <button type="button" onClick={() => setFaceToken((n) => n + 1)}>Turn to the spotlight</button>
        </fieldset>

      </aside>

      <main className="stage">
        <p className="status" aria-live="polite">{status}</p>
        <figure className="globe-figure">
          <GlobeView imageUrl={imageUrl} frame={frame} spot={spot}
            faceSpotToken={faceToken} describedBy="globe-help" label={`Globe of ${scene.source.title}. ${where}`} />
          <figcaption>
            <span className="credit">Visualization: {scene.source.credit}</span> SVS {scene.source.svs_id}. {source.note}
          </figcaption>
        </figure>

        <section className="globe-data" aria-label="Spotlight as a scene region">
          <h2>As a region in scene.json</h2>
          <dl className="readout globe-dl">
            <dt>source</dt><dd>{source.label} (SVS {scene.source.svs_id}, {frame.width}×{frame.height} px)</dd>
            <dt>center_px</dt><dd>[{spot.center_px.join(', ')}]</dd>
            <dt>radius_px</dt><dd>{radius}{radius !== first.radius_px ? ` (approved regions use ${first.radius_px})` : ''}</dd>
            <dt>box_px</dt><dd>[{boxFor(spot).join(', ')}]</dd>
            <dt>land</dt>
            <dd>
              {!source.landRule ? 'not checked here (the land in this picture is a photo); prepare_scene.py checks it'
                : land === null ? 'checking…' : `about ${(land * 100).toFixed(0)}% of the circle`}
              {land !== null && land > 0.5 ? ' (too much: prepare_scene.py would stop)' : ''}
            </dd>
          </dl>
          <div className="row">
            <button type="button" className="primary" onClick={copy}>Copy region</button>
          </div>
          {copied && <p className="readout" role="status">{copied}</p>}
          <pre className="globe-json">{json}</pre>
        </section>
      </main>
    </div>
  );
}
