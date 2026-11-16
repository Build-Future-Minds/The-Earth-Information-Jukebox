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
    ['#globe', 'globe'],
    // A place inside a view: How it's made opened at a section or stage.
    ['#how/s1-5', 'how'],
    ['#how/chain', 'how'],
    ['#nope/s1-5', 'listen'],
  ])('viewFromHash(%j) is %s', (hash, view) => expect(viewFromHash(hash)).toBe(view));

  it('labels in order', () =>
    expect(VIEWS.map((v) => v.label)).toEqual(['Listen', 'Compare', "How it's made", 'Play along', 'Globe']));
});
