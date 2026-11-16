// Explore the globe, inside Play along (loaded only when this view opens): the chosen picture
// wrapped on a globe, with a button for each of its regions. Choosing one turns the globe to it and
// plays it with the same rule as Listen. The team's region-picking tools stay in globe.html.
import { useState } from 'react';
import { regionLabel } from '../components/ExploreControls';
import type { Source } from '../data/sources';
import { GlobeView } from './GlobeView';
import './globe.css';

interface Props {
  source: Source;
  regionId: string;
  onPlayRegion: (regionId: string) => void;
  /** True while the Earth voice plays; the playing region's button then stops it. */
  playing: boolean;
  onStop: () => void;
}

export default function GlobeSection({ source, regionId, onPlayRegion, playing, onStop }: Props) {
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
      <div className="row">
        {scene.regions.map((r) => {
          const label = regionLabel(scene.regions, r.id, source.firstLetter);
          // A toggle, so the Globe has a visible Stop: Esc alone is no help on a phone.
          const live = playing && r.id === region.id;
          return (
            <button key={r.id} type="button" aria-pressed={live}
              onClick={() => { if (live) onStop(); else { onPlayRegion(r.id); setToken((n) => n + 1); } }}>
              {live ? `Stop ${label}` : `Play ${label}: ${r.name}`}
            </button>
          );
        })}
      </div>
      <p className="muted small">Drag to turn, or focus the globe and use the arrow keys. Credit: {scene.source.credit}.</p>
    </div>
  );
}
