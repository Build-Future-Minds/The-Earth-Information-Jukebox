// AI use: what AI did and did not do in this project, and how we checked it. The wording is the
// approved draft in docs/submission/ai_use_page_draft.md. The page names no people and no roles.
// Plain text on purpose: no chart, nothing that plays, so it needs no lazy loading.
// Layout (DESIGN.md, "Ruled rows and the route"): each section has its heading in a left column and
// its content in a right one; the facts, uses, checks and mistakes are label-and-text rows.
import type { ReactNode } from 'react';
import './aiUse.css';

/** The five steps from the Earth to what you hear. Steps 2 to 4 are our code. */
const ROUTE: { step: string; sub?: string; ours: boolean }[] = [
  { step: 'NASA’s computers make a picture of the oceans.', sub: 'It is model output, not a photo.', ours: false },
  { step: 'Our code measures the picture, pixel by pixel.', ours: true },
  { step: 'A rule we wrote turns those measurements into notes.', ours: true },
  { step: 'Tone generators in your browser play the notes.', ours: true },
  { step: 'You listen.', ours: false },
];

interface Item {
  lead: string;
  text: ReactNode;
}

const FACTS: Item[] = [
  {
    lead: 'AI did not make the sound.',
    text: 'Every note you hear is worked out by our own code from the pixels of a NASA picture, using a rule we wrote down.',
  },
  {
    lead: 'No AI runs in the app.',
    text: 'It does not call an AI service and it has no AI model inside it. The sounds are made by simple tone generators running in your browser.',
  },
  {
    lead: 'AI helped us write and check the code.',
    text: 'We used Claude and Claude Code. Our rule: nobody adds code until they have read it, run it, and can explain it. Every change was then reviewed by a second person on the team.',
  },
];

const RULES: string[] = [
  'No music, pictures or video made by a generative AI model, in the app or in our demo. The only picture is NASA’s, with credit. The drawings are drawn by our own code.',
  'All sound comes from code we can read. It is built from tone generators, not recordings.',
  'No cloud AI service anywhere between the picture and your speakers.',
  'If AI wrote or suggested code, the person who adds it reviews it and tests it.',
];

const USES: Item[] = [
  {
    lead: 'Planning and paperwork',
    text: 'Task plans, the formats of our data files, practice (fake) test data, worksheets, page plans and first drafts of sentences.',
  },
  {
    lead: 'The maths that measures the pictures',
    text: 'The code that measures how strongly the lines in a picture point the same way, its tests, and the experiments and charts that check it works.',
  },
  {
    lead: 'The app',
    text: 'The idea for the app was ours. AI helped us write much of its code: the player and controls, the picture scan that sweeps a line across the picture and plays what it crosses, the globe, the Listen, Compare and Home pages, and the site’s look.',
  },
  {
    lead: 'Some of the musical choices',
    text: (
      <>
        AI helped choose the scale the scan plays in, how the instruments are built, and the chords of the background band. These are
        fixed choices, not data. Each one is written down with its reason on the <a href="#how">How it’s made</a> page, and marked as
        checked, a design choice, or not yet checked. People listened to the band, the tune and the chords and approved them by ear.
      </>
    ),
  },
  {
    lead: 'Checking our own work',
    text: 'AI listed every claim the scan makes, built the tools that measure the pictures and record the app’s sound, and wrote the tests.',
  },
  {
    lead: 'Looking up sources',
    text: 'An AI assistant fetched pages and quoted the passages we cite. When a paper was a scan with no text, it read the page images. Anything it could not read, we marked Unverified.',
  },
];

const CHECKS: Item[] = [
  {
    lead: 'We read it and explained it.',
    text: 'If nobody could explain a piece of code in plain words, it did not go in.',
  },
  {
    lead: 'A second person reviewed it.',
    text: 'Every change was reviewed by someone other than the person who made it.',
  },
  {
    lead: 'Tests.',
    text: 'More than 180 tests of the maths, more than 340 of the app, and more than 120 that drive a real browser. All passed at our last count.',
  },
  {
    lead: 'A second copy.',
    text: 'We wrote the scan’s rule a second time, separately, in Python. It gives the same answers on the real picture. Pixels read back from the graphics card on the globe match the rule too.',
  },
  {
    lead: 'Break it on purpose.',
    text: 'We broke the rule deliberately to see the tests fail. A test that cannot fail is not checking anything.',
  },
  {
    lead: 'Measure the running app.',
    text: 'We recorded the app’s own sound and measured loudness, clipping, silence after Stop, and left–right balance. We also checked the sound meter against standard test signals, so we know the meter itself can be trusted.',
  },
  {
    lead: 'Listen.',
    text: 'AI can measure a sound. It cannot hear one. Whether it sounds good is up to people.',
  },
  {
    lead: 'Write it down.',
    text: 'We kept a log. Every use of AI was written down with the date, the tool, what it was used for, and how a person checked the result.',
  },
];

const WRONG: Item[] = [
  {
    lead: 'A page too wide for a phone.',
    text: 'With one section open, the page was 656 pixels wide in a 390-pixel window. A check found it, we fixed it, and the check now fails if it comes back.',
  },
  {
    lead: 'A test that could never pass.',
    text: 'One browser test waited for something that could never happen, so it was bound to time out. We fixed it.',
  },
  {
    lead: 'Old numbers in our own notes.',
    text: 'When we checked every number in our documents against the measurement reports, some were out of date. We corrected them.',
  },
  {
    lead: 'A sound that changed a little each time.',
    text: 'Recording the same sound again and again showed its loudness was not the same every run. We traced it to two causes: the reverb is made from random noise, and the tone generators do not all start at the same instant.',
  },
  {
    lead: 'Limits we had not written down.',
    text: 'AI listed every claim the picture scan makes and we marked each one Verified, Design choice or Unverified. That showed limits, such as how colour strength relates to temperature, and we added them to the page.',
  },
];

/** Label-and-text rows under a ruled top: the label is the bold first phrase, or a caps name. */
function Ledger({ items, variant }: { items: Item[]; variant?: 'facts' | 'caps' }) {
  return (
    <dl className={variant ? `ai-ledger ai-${variant}` : 'ai-ledger'}>
      {items.map((it) => (
        <div key={it.lead}>
          <dt>{it.lead}</dt>
          <dd>{it.text}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A section: its heading in the left column, its content in the right (stacked on narrow screens). */
function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="ai-section" aria-labelledby={`ai-${id}`}>
      <h3 id={`ai-${id}`}>{title}</h3>
      <div className="ai-body">{children}</div>
    </section>
  );
}

export function AiUseView() {
  return (
    <article className="ai">
      <header className="ai-head">
        {/* The view's heading is App's "AI use" (h2, read by screen readers); this is its visible face. */}
        <p className="ai-title" aria-hidden="true">AI use</p>
        <p className="ai-stand">
          We used AI to help build this project. This page says what it did, what it did not do, and how we checked it.
        </p>
        <p className="ai-note">
          The NASA Space Apps Challenge allows AI tools and asks teams to say how they used them. This page is our answer.
        </p>
      </header>

      <Section id="short" title="The short version">
        <Ledger items={FACTS} variant="facts" />
      </Section>

      <Section id="none" title="Where there is no AI">
        <p>The chain from the Earth to what you hear has five steps:</p>
        <div>
          <ol className="ai-route" role="list">
            {ROUTE.map((r, i) => (
              <li key={r.step} className={r.ours ? 'ours' : undefined}>
                <span className="ai-stop" aria-hidden="true" />
                <span className="ai-n">{i + 1}</span>
                <span className="ai-step">{r.step}</span>
                {r.sub && <span className="ai-sub">{r.sub}</span>}
              </li>
            ))}
          </ol>
          <p className="ai-bracket" aria-hidden="true">Our code · no AI runs here</p>
        </div>
        <p>
          AI wrote some of the code for steps 2 to 4. It is not in any of them while the app runs. You can follow every note back to
          the numbers that made it on the <a href="#how">How it’s made</a> page.
        </p>
        <h4>We set four rules for ourselves at the start, and kept them:</h4>
        <ul className="ai-rules" role="list">
          {RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </Section>

      <Section id="used" title="What we used it for">
        <p>
          We used Claude, a chat assistant, and Claude Code, a version of it that works inside a project: it reads our files, writes
          code and runs our tests when we ask. Both are made by Anthropic.
        </p>
        <Ledger items={USES} variant="caps" />
      </Section>

      <Section id="decided" title="What we decided ourselves">
        <p className="ai-lead-in">AI proposed. We decided.</p>
        <p>
          The idea was ours. We set the rule that turns lines into rhythm from our own findings and research, and chose which parts of
          the picture to listen to. We chose how the click-to-explain feature behaves when a choice came up, and what every page says
          about the limits of the sound. We listened and approved the band, the tune and the chords by ear. We chose the look of the app
          from three mockups.
        </p>
      </Section>

      <Section id="checked" title="How we checked its work">
        <Ledger items={CHECKS} />
      </Section>

      <Section id="wrong" title="Where AI got it wrong, and we caught it">
        <p>AI is quick, and it makes mistakes. These are ones our checks found:</p>
        <Ledger items={WRONG} />
      </Section>
    </article>
  );
}
