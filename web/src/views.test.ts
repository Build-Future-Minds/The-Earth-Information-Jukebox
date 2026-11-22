// Which view the URL hash picks. An empty or unknown address shows Home, the landing page.
import { describe, expect, it } from 'vitest';
import { VIEWS, viewFromHash } from './views';

describe('views', () => {
  it.each([
    ['#home', 'home'],
    ['#compare', 'compare'],
    ['#how', 'how'],
    ['#play', 'play'],
    ['#listen', 'listen'],
    ['', 'home'],
    ['#', 'home'],
    ['#nope', 'home'],
    ['#Compare', 'home'],
    ['#compare?x=1', 'home'],
    ['#globe', 'globe'],
    ['#ai', 'ai'],
    // A place inside a view: How it's made opened at a section or stage.
    ['#how/s1-5', 'how'],
    ['#how/chain', 'how'],
    ['#nope/s1-5', 'home'],
  ])('viewFromHash(%j) is %s', (hash, view) => expect(viewFromHash(hash)).toBe(view));

  it('labels in order', () =>
    expect(VIEWS.map((v) => v.label)).toEqual(['Home', 'Listen', 'Compare', "How it's made", 'Play along', 'Globe', 'AI use']));
});
