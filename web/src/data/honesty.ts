// The three honesty lines (PRODUCT.md, "Brand Commitments"), in one place for every page that shows
// them: How it's made puts them at the top, each linked to the section that backs it, and Home (P0)
// can show the same three. A unit test checks that PRODUCT.md says the same words.
//
// `href` is a link into How it's made: #how/<section>. The app routes on the part before the slash
// (views.ts), and How it's made scrolls to the part after it.

export interface HonestyLine {
  id: 'not-a-photo' | 'our-rules' | 'the-drawing';
  text: string;
  /** Link to the section on How it's made that backs the line. */
  href: string;
  /** Words for that link. */
  evidence: string;
}

export const HONESTY_LINES: readonly HonestyLine[] = [
  {
    id: 'not-a-photo',
    text: 'It is a visualization of computer model output or satellite estimates, not a photo.',
    href: '#how/chain',
    evidence: 'The chain from the Earth to our pixels',
  },
  {
    id: 'our-rules',
    text: 'The rules that turn it into sound are choices we made.',
    href: '#how/s1-7',
    evidence: 'The rule, drawn, beside another rule made from the same number',
  },
  {
    id: 'the-drawing',
    text: 'It describes the drawn picture, not water speed, turbulence, air quality or rain amounts.',
    href: '#how/drawing',
    evidence: 'Four cases where the drawing changed the number and the Earth did not',
  },
];
