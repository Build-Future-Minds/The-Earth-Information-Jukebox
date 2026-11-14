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
    <figure className="scene">
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
          const [x, y, w, h] = r.box_px;
          const on = r.id === regionId;
          return (
            <g key={r.id} className={on ? 'box active' : 'box'}>
              <rect x={x} y={y} width={w} height={h} />
              <text x={x + 8} y={y - 12}>{regionLabel(scene.regions, r.id)}</text>
            </g>
          );
        })}
      </svg>
      <figcaption>
        {active && (
          <>
            <strong>{regionLabel(scene.regions, active.id)}: {active.name}.</strong> {active.description}
          </>
        )}
      </figcaption>
    </figure>
  );
}
