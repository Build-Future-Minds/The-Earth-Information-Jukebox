// Which of the four views the URL hash picks. Anything unknown shows Listen, the home view.
import { describe, expect, it } from 'vitest';
import { VIEWS, viewFromHash } from './views';

describe('views', () => {
  it.each([
    ['#compare', 'compare'],
    ['#how', 'how'],
    ['#play', 'play'],
    ['#listen', 'listen'],
    ['', 'listen'],
    ['#', 'listen'],
    ['#nope', 'listen'],
    ['#Compare', 'listen'],
    ['#compare?x=1', 'listen'],
  ])('viewFromHash(%j) is %s', (hash, view) => expect(viewFromHash(hash)).toBe(view));

  it('labels in order', () =>
    expect(VIEWS.map((v) => v.label)).toEqual(['Listen', 'Compare', "How it's made", 'Play along']));
});
