// Listen, step 1: choose a NASA picture. One ruled row per picture the app can play (data/sources.ts
// finds them: every data/<folder>/scene.json with its features.json). Each row: a thumbnail, the
// team's short name, NASA's own title from scene.json (a link to NASA's page), the kind of data and
// how many frames. A radio group: one Tab stop, arrow keys move between pictures.
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
        {pictures.some((p) => /^https?:/.test(p.scene.source.url)) && <span className="step-hint" aria-hidden="true">Titles link to NASA's pages</span>}
      </legend>
      <div className="step-rows">
        {pictures.map((p) => {
          const on = p.key === current;
          const frames = framesText(p.scene);
          const nasa = /^https?:/.test(p.scene.source.url);
          return (
            <div key={p.key} className={on ? 'pic-row on' : 'pic-row'}>
              <label className="pic-pick">
                <input type="radio" name="picture" value={p.key} checked={on} onChange={() => onChoose(p.key)} />
                <span className="pic-thumb" aria-hidden="true" style={p.imageUrl ? { backgroundImage: `url(${p.imageUrl})` } : undefined} />
                <span className="pic-name">{p.short}</span>
                <span className="pic-kind">
                  <span>{p.kind}</span>
                  <span>
                    <span className="num">{frames.count}</span> {frames.words}
                  </span>
                  {!p.scan && <span className="pic-note">Scan not measured yet</span>}
                </span>
              </label>
              {nasa ? (
                <a className="pic-title" href={p.scene.source.url} target="_blank" rel="noreferrer">
                  {p.scene.source.title}
                  <span className="sr-only"> (NASA's page, opens in a new tab)</span>
                </a>
              ) : (
                <span className="pic-title">{p.scene.source.title}</span>
              )}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
