// How it's made (Student B's strip, docs/design/student_b_pictures.html): three pictures with a few
// words each, the rule in one line, the three honesty lines, and one credit block per picture.
import { RULE_TEXT } from '../audio/earthVoice';
import { BeatPicture } from '../components/BeatPicture';
import { agree, Key, scatter } from '../components/LookingAt';
import { describesLine, natureLine, type Picture, type Source } from '../data/sources';

export function HowView({ source, pictures }: { source: Source; pictures: Picture[] }) {
  const r = source.scene.regions[0];
  const { width, height } = source.scene.frames;
  return (
    <>
      <ol className="how-strip" aria-label="How a picture becomes a rhythm">
        <li>
          <div className="how-art">
            <span className="how-thumb" role="img" aria-label={`${source.scene.source.title} with a circle on it`}
              style={source.imageUrl ? { backgroundImage: `url(${source.imageUrl})` } : undefined}>
              <i style={{ left: `${(100 * r.center_px[0]) / width}%`, top: `${(100 * r.center_px[1]) / height}%`,
                width: `${(200 * r.radius_px) / width}%`, aspectRatio: '1' }} />
            </span>
          </div>
          <b>A circle on the NASA picture</b>
          <span>{source.label}: {source.scene.source.title}</span>
        </li>
        <li>
          <div className="how-art how-ticks">
            <figure><Key degrees={agree} /><figcaption>Lined up</figcaption></figure>
            <figure><Key degrees={scatter} /><figcaption>Swirly</figcaption></figure>
          </div>
          <b>Which way the lines run</b>
          <span>How much they agree: 0 to 1</span>
        </li>
        <li>
          <div className="how-art how-beats">
            <span className="beat-row"><BeatPicture alignment={0.9} /><span>Lined up: even</span></span>
            <span className="beat-row"><BeatPicture alignment={0.1} /><span>Swirly: long–short</span></span>
          </div>
          <b>Agreement sets the rhythm</b>
          <span>More agreement, more even pulse</span>
        </li>
      </ol>

      <p className="how-rule">
        <b>The rule:</b> the second pulse lands at <span className="mono">0.75 − 0.25 × alignment</span> of the beat.
        <span className="sr-only"> ({RULE_TEXT})</span>
      </p>

      <ul className="how-honest" aria-label="What the sound does not tell you">
        <li>{natureLine(source)}</li>
        <li>The rhythm rule is a choice we made.</li>
        <li>{describesLine(source)}</li>
      </ul>

      <footer className="how-credits" aria-label="Sources and credits">
        {pictures.map((p) => (
          <p key={p.key}>
            <b>{p.label}:</b> <a href={p.scene.source.url}>{p.scene.source.title}</a>. {p.scene.source.credit}.{' '}
            {p.resource === 'eic' ? 'NASA Earth Information Center.' : p.resource === 'challenge' ? 'Challenge resource (not in the EIC gallery).' : ''}
          </p>
        ))}
        <p className="muted">Measured ahead of time; all sound is made in your browser by our own code.</p>
      </footer>
    </>
  );
}
