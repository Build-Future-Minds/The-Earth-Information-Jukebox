// The four page links, in the rail on every view. Real links (#listen …), so the back button and
// shared links work; the current one is marked for screen readers with aria-current="page".
import { VIEWS, type View } from '../views';

export function PageLinks({ current }: { current: View }) {
  return (
    <nav className="page-links" aria-label="Pages">
      <ul>
        {VIEWS.map((v) => (
          <li key={v.key}>
            <a href={`#${v.key}`} aria-current={v.key === current ? 'page' : undefined}>
              {v.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
