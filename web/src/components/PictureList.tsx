// Listen, step 1: choose a NASA picture. One ruled row per picture the app can play (data/sources.ts
// finds them: every data/<folder>/scene.json with its features.json). Each row: a thumbnail, the
// team's short name, NASA's own title from scene.json, the kind of data and how many frames, and a
// link to NASA's page. A radio group: one Tab stop, arrow keys move between pictures. The whole row
// but the link chooses the picture, so a tap on the title never leaves the app.
import { framesText, type Source, type SourceKey } from '../data/sources';

interface Props {
  pictures: Source[];
  current: SourceKey;
  onChoose: (key: SourceKey) => void;
}

export function PictureList({ pictures, current, onChoose }: Props) {
  return (
    <fieldset className="step step-pictures">
      <legend>
        <span className="step-mark" aria-hidden="true">1</span>
        <span className="sr-only">Step 1 of 3: </span>Choose a NASA picture
      </legend>
      <div className="step-rows">
        {pictures.map((p) => {
          const on = p.key === current;
          const frames = framesText(p.scene);
          const { url, title, svs_id } = p.scene.source;
          const nasa = /^https?:/.test(url);
          const framesWords = `${frames.count} ${frames.words}`;
          return (
            <div key={p.key} className={on ? 'pic-row on' : 'pic-row'}>
              <label className="pic-pick">
                <input
                  type="radio"
                  name="picture"
                  value={p.key}
                  checked={on}
                  onChange={() => onChoose(p.key)}
                  aria-label={`${p.short}. NASA's title: ${title}. ${p.kind}, ${framesWords}.${p.scan ? '' : ' Scan not measured yet.'}`}
                />
                <span className="pic-thumb" aria-hidden="true" style={p.imageUrl ? { backgroundImage: `url(${p.imageUrl})` } : undefined} />
                <span className="pic-name" aria-hidden="true">{p.short}</span>
                <span className="pic-title" aria-hidden="true">{title}</span>
                <span className="pic-kind" aria-hidden="true">
                  <span>{p.kind}</span>
                  <span>
                    <span className="num">{frames.count}</span> {frames.words}
                  </span>
                  {!p.scan && <span className="pic-note">Scan not measured yet</span>}
                </span>
              </label>
              {nasa && (
                <a className="pic-link" href={url} target="_blank" rel="noreferrer">
                  <span className="num">SVS {svs_id}</span>
                  <svg viewBox="0 0 12 12" aria-hidden="true">
                    <path d="M4.5 2.5H9.5V7.5M9.5 2.5L3 9" />
                  </svg>
                  <span className="sr-only">: NASA's page for {title}, opens in a new tab</span>
                </a>
              )}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
