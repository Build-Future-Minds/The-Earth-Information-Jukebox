// The building blocks of How it's made: formulas (KaTeX, read by screen readers as MathML), claim
// tags, stages that open and close, and the "Show the numbers" table under every chart.
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';

const render = (tex: string, displayMode: boolean) =>
  katex.renderToString(tex, { output: 'htmlAndMathml', displayMode, throwOnError: true });

/** Inline math. KaTeX writes MathML (what a screen reader reads) and a drawn copy hidden from it. */
export function M({ t }: { t: string }) {
  const html = useMemo(() => render(t, false), [t]);
  return <span className="how-m" dangerouslySetInnerHTML={{ __html: html }} />;
}

/**
 * A displayed formula with its plain-words line. A formula wider than its column scrolls inside
 * its own box, which then takes keyboard focus so it can be scrolled without a mouse.
 */
export function Formula({ tex, words }: { tex: string; words: ReactNode }) {
  const html = useMemo(() => render(tex, true), [tex]);
  const box = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(false);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const check = () => setWide(el.scrollWidth > el.clientWidth + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div className="how-formula">
      <div
        ref={box}
        className="how-math"
        tabIndex={wide ? 0 : undefined}
        role={wide ? 'group' : undefined}
        aria-label={wide ? 'Formula, scrolls sideways' : undefined}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <p className="how-words">
        <span className="how-words-label">In words:</span> {words}
      </p>
    </div>
  );
}

export type ClaimTag = 'Verified' | 'Design choice' | 'Unverified';
/** Tags always appear in this order, so a stage's row reads the same way everywhere. */
const TAG_ORDER: ClaimTag[] = ['Design choice', 'Verified', 'Unverified'];

/** CONTRIBUTING.md's three tags. The word is always shown; the shape only repeats it. */
export function Tag({ t }: { t: ClaimTag }) {
  const kind = t === 'Verified' ? 'verified' : t === 'Design choice' ? 'design' : 'unverified';
  return <span className={`how-tag how-tag-${kind}`}>{t}</span>;
}

/** "s1-5" when the address is #how/s1-5. */
export function hashPlace(): string {
  return window.location.hash.replace(/^#/, '').split('/')[1] ?? '';
}

function Chevron() {
  return (
    <svg className="how-chevron" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false">
      <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * One step of a pipeline. The heading holds a button that opens and closes the step (it stays in
 * the page's list of headings); the plain sentence is always shown. A link to #how/s1-5 opens it.
 */
export function Stage({ n, name, plain, tags, children }: {
  n: string;
  name: string;
  plain: ReactNode;
  tags: ClaimTag[];
  children: ReactNode;
}) {
  const place = `s${n.replace('.', '-')}`;
  const [open, setOpen] = useState(() => hashPlace() === place);
  useEffect(() => {
    const onHash = () => {
      if (hashPlace() === place) setOpen(true);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [place]);
  return (
    <section className={`how-stage${open ? ' open' : ''}`} id={`how-${place}`} aria-labelledby={`how-${place}-h`}>
      <h4 className="how-stage-h" id={`how-${place}-h`}>
        <button type="button" aria-expanded={open} aria-controls={`how-${place}-body`} onClick={() => setOpen((o) => !o)}>
          <span className="how-stage-n">{n}</span>
          <span className="how-stage-name">{name}</span>
          <span className="how-tags">
            {[...tags].sort((a, b) => TAG_ORDER.indexOf(a) - TAG_ORDER.indexOf(b)).map((t) => (
              <Tag key={t} t={t} />
            ))}
          </span>
          <Chevron />
        </button>
      </h4>
      <p className="how-plain">{plain}</p>
      <div className="how-stage-body" id={`how-${place}-body`} hidden={!open}>
        {children}
      </div>
    </section>
  );
}

/** The fields of a stage, always in this order: formula, why it holds, how we use it, check. */
export function Entry({ children }: { children: ReactNode }) {
  return <dl className="how-entry">{children}</dl>;
}
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

export interface Col {
  label: ReactNode;
  num?: boolean;
}

/** A ruled table (DESIGN.md "Tide table"): numbers right-aligned in the mono face. */
export function Table({ caption, cols, rows, className }: {
  caption?: ReactNode;
  cols: Col[];
  rows: ReactNode[][];
  className?: string;
}) {
  return (
    <div className="how-table-wrap">
      <table className={`how-table${className ? ` ${className}` : ''}`}>
        {caption && <caption>{caption}</caption>}
        <thead>
          <tr>
            {cols.map((c, i) => (
              <th key={i} scope="col" className={c.num ? 'num' : undefined}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((cell, j) =>
                j === 0 && !cols[0].num ? (
                  <th key={j} scope="row">
                    {cell}
                  </th>
                ) : (
                  <td key={j} className={cols[j]?.num ? 'num' : undefined}>
                    {cell}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** "Show the numbers": the table behind a chart, closed until asked for. */
export function ShowNumbers(props: { cols: Col[]; rows: ReactNode[][] }) {
  return (
    <details className="how-numbers">
      <summary>Show the numbers</summary>
      <Table {...props} />
    </details>
  );
}

/** A number inside a sentence: the body face with tabular figures. (Table cells, axes and readouts use the
 *  mono face, DESIGN.md "Numbers in Mono"; in prose the mono face's wide full stop reads as "0 . 12".) */
export function N({ children }: { children: ReactNode }) {
  return <span className="how-num">{children}</span>;
}

/** Fixed decimals, with a true minus sign. */
export function fmt(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '–';
  const s = Math.abs(v).toFixed(digits);
  return v < 0 && Number(s) !== 0 ? `−${s}` : s;
}

/** "the test name" as a code link to where it lives in the repository. */
export function TestName({ name, file }: { name: string; file: string }) {
  return (
    <a className="how-test" href={`${REPO}/blob/main/${file}`}>
      {name}
    </a>
  );
}

export const REPO = 'https://github.com/Build-Future-Minds/The-Earth-Information-Jukebox';

/** A link to a file in the repository. */
export function RepoLink({ path, children }: { path: string; children?: ReactNode }) {
  return <a href={`${REPO}/blob/main/${path}`}>{children ?? path}</a>;
}
