// The source image with the two region boxes drawn on it. Without an image (practice data)
// it draws the frame outline and boxes only.
import type { Scene } from '../data/types';
import { regionLabel, regionStyle, type RegionLook } from './ExploreControls';

// Chart graticule around the equirectangular frame: 180°W to 180°E across, 90°N to 90°S down.
const LONS = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150];
const LATS = [60, 30, 0, -30, -60];
const MINOR_LONS = Array.from({ length: 35 }, (_, i) => -170 + i * 10).filter((l) => l % 30 !== 0);
const MINOR_LATS = Array.from({ length: 17 }, (_, i) => 80 - i * 10).filter((l) => l % 30 !== 0);
const lonText = (l: number) => (l === 0 ? '0°' : `${Math.abs(l)}°${l < 0 ? 'W' : 'E'}`);
const latText = (l: number) => (l === 0 ? '0°' : `${Math.abs(l)}°${l < 0 ? 'S' : 'N'}`);
const xPct = (lon: number) => `${((lon + 180) / 360) * 100}%`;
const yPct = (lat: number) => `${((90 - lat) / 180) * 100}%`;

/** Latitude and longitude ticks around a whole-world map, labelled every 30°. Place it inside the
 *  positioned box that holds the picture (`.chart`). Decoration for sighted readers. */
export function Graticule() {
  return (
    <div className="graticule" aria-hidden="true">
      {LONS.map((l) => (
        <span key={`x${l}`} className="g-lon" style={{ left: xPct(l) }}>
          <b>{lonText(l)}</b>
        </span>
      ))}
      {LATS.map((l) => (
        <span key={`y${l}`} className="g-lat" style={{ top: yPct(l) }}>
          <b>{latText(l)}</b>
        </span>
      ))}
      {MINOR_LONS.map((l) => (
        <span key={`mx${l}`} className="g-lon minor" style={{ left: xPct(l) }} />
      ))}
      {MINOR_LATS.map((l) => (
        <span key={`my${l}`} className="g-lat minor" style={{ top: yPct(l) }} />
      ))}
    </div>
  );
}

interface Props {
  scene: Scene;
  imageUrl: string | null;
  regionId: string;
  /** First letter and neutral style of this picture's regions. */
  look?: RegionLook;
  /** Pressing a circle selects that region (keyboard users use the region choice). */
  onSelect?: (regionId: string) => void;
}

export function SceneView({ scene, imageUrl, regionId, look = {}, onSelect }: Props) {
  const { width, height } = scene.frames;
  const active = scene.regions.find((r) => r.id === regionId);
  return (
    <figure className={imageUrl ? 'scene' : 'scene no-image'} style={{ ['--aspect' as string]: width / height }}>
      <div className="chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${scene.source.title}. Selected: ${active ? `${regionLabel(scene.regions, active.id, look.firstLetter)}, ${active.name}. ${active.description}` : 'none'}`}
      >
        {imageUrl ? (
          <image href={imageUrl} width={width} height={height} />
        ) : (
          <rect width={width} height={height} className="frame-placeholder" />
        )}
        {scene.regions.map((r) => {
          const [cx, cy] = r.center_px;
          const on = r.id === regionId;
          return (
            <g key={r.id} className={on ? 'box active' : 'box'} style={regionStyle(scene.regions, r.id, look)}
              data-region={r.id} onClick={onSelect ? () => onSelect(r.id) : undefined}>
              {/* The circle is the exact area measured (inside the mask), drawn in the region's colour
                  inside a black outline so it reads on any part of the image. */}
              <circle className="ring-outline" cx={cx} cy={cy} r={r.radius_px} />
              <circle className="ring" cx={cx} cy={cy} r={r.radius_px} />
            </g>
          );
        })}
      </svg>
        {scene.regions.map((r) => (
          <span
            key={r.id}
            className={r.id === regionId ? 'map-tag active' : 'map-tag'}
            aria-hidden="true"
            style={{
              ...regionStyle(scene.regions, r.id, look),
              left: `${(r.center_px[0] / width) * 100}%`,
              top: `${((r.center_px[1] - r.radius_px) / height) * 100}%`,
            }}
          >
            <b>{regionLabel(scene.regions, r.id, look.firstLetter).replace('Region ', '')}</b>
            <span>{regionLabel(scene.regions, r.id, look.firstLetter)}</span>
          </span>
        ))}
        <Graticule />
      </div>
      <figcaption>
        {/* DESIGN.md: keep the NASA credit directly under the image it credits. */}
        <span className="credit">Visualization: {scene.source.credit}</span>
        {/* The selected region's name is in the region choice right above; screen readers get it
            from the picture's label. */}
      </figcaption>
    </figure>
  );
}
