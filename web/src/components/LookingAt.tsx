// "What you are looking at": Student B's explainer and tick key from tools/listening_game.html,
// reworded for the app's two circles.
export const agree = [-6, 4, -2, 8, 2, -8, 6, -4];
export const scatter = [20, 100, 150, 60, 130, 10, 80, 170];

export function Key({ degrees }: { degrees: number[] }) {
  return (
    <svg viewBox="0 0 150 64" aria-hidden="true">
      {degrees.map((deg, i) => {
        const cx = 19 + (i % 4) * 37, cy = 17 + Math.floor(i / 4) * 30, r = (deg * Math.PI) / 180;
        const x1 = cx - Math.cos(r) * 14, y1 = cy - Math.sin(r) * 14, x2 = cx + Math.cos(r) * 14, y2 = cy + Math.sin(r) * 14;
        return (
          <g key={i}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#000" strokeWidth={5} strokeLinecap="round" />
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fff" strokeWidth={2.5} strokeLinecap="round" />
          </g>
        );
      })}
    </svg>
  );
}

export function LookingAt() {
  return (
    <section className="intro" aria-labelledby="looking-title">
      <div>
        <h2 id="looking-title">What you are looking at</h2>
        <p>
          The NASA picture draws ocean currents as thin bright streaks. Each circle is a window onto the map. In the close-ups
          below, white ticks show which way the streaks run in each small square. When the ticks mostly agree, the streaks are
          lined up. When they point every which way, the streaks look swirly.
        </p>
        <p>
          The rhythm is made from how much the streaks share one direction: more agreement, more even pulse. This is a rule we
          chose. It describes the picture, not water speed or ocean health.
        </p>
      </div>
      <div className="key" aria-hidden="true">
        <figure>
          <Key degrees={agree} />
          <figcaption>Ticks agree: lined up</figcaption>
        </figure>
        <figure>
          <Key degrees={scatter} />
          <figcaption>Ticks scatter: swirly</figcaption>
        </figure>
      </div>
    </section>
  );
}
