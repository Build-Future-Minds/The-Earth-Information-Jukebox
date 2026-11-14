// The source image with the two region boxes drawn on it. Without an image (practice data)
// it draws the frame outline and boxes only.
import type { Scene } from '../data/types';
import { regionLabel } from './ExploreControls';

interface Props {
  scene: Scene;
  imageUrl: string | null;
  regionId: string;
}

export function SceneView({ scene, imageUrl, regionId }: Props) {
  const { width, height } = scene.frames;
  const active = scene.regions.find((r) => r.id === regionId);
  return (
    <figure className={imageUrl ? 'scene' : 'scene no-image'}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${scene.source.title}. Selected: ${active ? `${regionLabel(scene.regions, active.id)}, ${active.name}. ${active.description}` : 'none'}`}
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
            <g key={r.id} className={on ? 'box active' : 'box'}>
              {/* The circle is the exact area measured (inside the mask). Black and white only, never a
                  colour on the NASA image (DESIGN.md "Don't tint the imagery"); the live region's tab
                  is inverted to ink. */}
              <circle className="ring-outline" cx={cx} cy={cy} r={r.radius_px} />
              <circle className="ring" cx={cx} cy={cy} r={r.radius_px} />
              <rect className="tab" x={cx - 92} y={cy - r.radius_px - 66} width={184} height={50} rx={4} />
              <text x={cx} y={cy - r.radius_px - 31} textAnchor="middle">{regionLabel(scene.regions, r.id)}</text>
            </g>
          );
        })}
      </svg>
      <figcaption>
        {/* DESIGN.md: keep the NASA credit directly under the image it credits. */}
        <span className="credit">Visualization: {scene.source.credit}</span>
        {active && (
          <>
            <strong>{regionLabel(scene.regions, active.id)}: {active.name}.</strong> {active.description}
          </>
        )}
      </figcaption>
    </figure>
  );
}
