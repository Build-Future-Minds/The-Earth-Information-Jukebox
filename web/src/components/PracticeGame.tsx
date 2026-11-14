// Launch section for Student B's listening game (tools/listening_game.html, published at /tools/).
// Clearly a separate practice tool: the game uses its own sound settings to make differences easier
// to hear, while this page plays the team's one rule (docs/mapping_spec.md).
import { agree, Key, scatter } from './LookingAt';

const GAME = 'tools/listening_game.html';
const QUIZ = 'tools/listening_quiz_player.html';

export function PracticeGame() {
  return (
    <section className="practice" aria-labelledby="practice-title">
      <div className="practice-text">
        <h2 id="practice-title">Practice: test your ear</h2>
        <p>
          Student B&apos;s listening game: hear one mystery rhythm, then pick which of two ocean patches made it. Patches come
          from all over the NASA picture, from easy to hard.
        </p>
        <p className="muted small">
          A separate practice tool. To make differences easier to hear, it can stretch the pulse spacing and let pitch follow
          the lines; this page plays the team&apos;s one rule. For a scored listening check, use the{' '}
          <a href={QUIZ} target="_blank" rel="noopener">
            quiz player
          </a>
          .
        </p>
        <a className="button-link primary" href={GAME} target="_blank" rel="noopener">
          Open the listening game <span className="small">(new tab)</span>
        </a>
      </div>
      <div className="practice-preview" aria-hidden="true">
        <figure>
          <Key degrees={agree} />
          <figcaption>Patch 1</figcaption>
        </figure>
        <span className="practice-q">?</span>
        <figure>
          <Key degrees={scatter} />
          <figcaption>Patch 2</figcaption>
        </figure>
      </div>
    </section>
  );
}
