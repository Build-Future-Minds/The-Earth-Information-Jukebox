// The listening game, as a one-line card on Play along (Student B's card, docs/design/student_b_pictures.html).
// It opens in the same tab and has a way back.
import { agree, Key, scatter } from './LookingAt';

const GAME = 'tools/listening_game.html';

export function PracticeGame() {
  return (
    <section className="game-card" aria-label="Test your ear">
      <div className="game-art" aria-hidden="true">
        <Key degrees={agree} />
        <span className="game-q">?</span>
        <Key degrees={scatter} />
      </div>
      <p><b>Test your ear.</b> Hear a mystery rhythm, then pick the patch that made it.</p>
      <a className="button-link primary" href={GAME}>Play the listening game</a>
    </section>
  );
}
