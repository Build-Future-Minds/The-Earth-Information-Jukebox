// The jukebox: which NASA picture to play (Ocean, Aerosols, Rain). A radio group of picture
// buttons, each a thumbnail and one word. Hidden when there is only one picture (practice data).
import type { Source, SourceKey } from '../data/sources';

interface Props {
  sources: Source[];
  current: SourceKey;
  onChoose: (key: SourceKey) => void;
}

export function SourceChoice({ sources, current, onChoose }: Props) {
  if (sources.length < 2) return null;
  return (
    <fieldset className="source-choice">
      <legend>Picture</legend>
      <div className="row">
        {sources.map((s) => (
          <label key={s.key} className={s.key === current ? 'source-option current' : 'source-option'}>
            <input type="radio" name="source" value={s.key} checked={s.key === current} onChange={() => onChoose(s.key)} />
            <span className="source-thumb" aria-hidden="true" style={s.imageUrl ? { backgroundImage: `url(${s.imageUrl})` } : undefined} />
            <span className="source-label">{s.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
