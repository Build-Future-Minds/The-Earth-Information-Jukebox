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
}

export default function GlobeSection({ source, regionId, onPlayRegion }: Props) {
  const [token, setToken] = useState(0);
  const { scene, imageUrl } = source;
  const region = scene.regions.find((r) => r.id === regionId) ?? scene.regions[0];
  if (!imageUrl) return <p className="muted">The globe needs the real NASA picture (practice data has none).</p>;
  return (
    <div className="globe-section">
      <GlobeView
        imageUrl={imageUrl}
        frame={{ width: scene.frames.width, height: scene.frames.height }}
        spot={{ center_px: region.center_px, radius_px: region.radius_px }}
        faceSpotToken={token}
        label={`Globe of ${scene.source.title}, turned to ${regionLabel(scene.regions, region.id, source.firstLetter)}.`}
      />
      <div className="row">
        {scene.regions.map((r) => (
          <button key={r.id} type="button" aria-pressed={r.id === region.id}
            onClick={() => { onPlayRegion(r.id); setToken((n) => n + 1); }}>
            Play {regionLabel(scene.regions, r.id, source.firstLetter)}: {r.name}
          </button>
        ))}
      </div>
      <p className="muted small">Drag to turn, or focus the globe and use the arrow keys. Credit: {scene.source.credit}.</p>
    </div>
  );
}
