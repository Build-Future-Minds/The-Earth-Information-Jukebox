// How it's made: the methods, the math and the checks (docs/page_plan.md, P3). The page, its
// formulas (KaTeX) and its charts load only when the view is opened, the way the globe does, so
// Listen stays fast. The page itself is web/src/how/HowPage.tsx.
import { Component, lazy, Suspense, type ReactNode } from 'react';

const HowPage = lazy(() => import('../how/HowPage'));

/** If the page cannot load (offline, a bad build), say so here instead of blanking the whole app. */
class LoadFailure extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <p className="missing" role="alert">
        How it’s made could not be loaded. Reload the page to try again; the other pages still work.
      </p>
    ) : (
      this.props.children
    );
  }
}

export function HowView() {
  return (
    <LoadFailure>
      <Suspense fallback={<p className="muted">Loading How it’s made…</p>}>
        <HowPage />
      </Suspense>
    </LoadFailure>
  );
}
