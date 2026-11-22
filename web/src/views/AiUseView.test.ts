// The AI use page: what it says must stay inside what we can stand behind (docs/submission/ai_use_page_draft.md).
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AiUseView } from './AiUseView';

const html = renderToStaticMarkup(createElement(AiUseView));
const text = html.replace(/<[^>]+>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, ' ');

describe('AI use page', () => {
  it('names no people and no roles', () => {
    for (const word of ['Developer', 'Student', 'Teacher', 'Mr. E', 'Team lead', 'Dev A', 'Dev B', 'Lily']) {
      expect(text, word).not.toContain(word);
    }
  });

  it('has the sections of the approved draft, in order', () => {
    const heads = [...html.matchAll(/<h3[^>]*>(.*?)<\/h3>/g)].map((m) => m[1]);
    expect(heads).toEqual([
      'The short version',
      'Where there is no AI',
      'What we used it for',
      'What we decided ourselves',
      'How we checked its work',
      'Where AI got it wrong, and we caught it',
    ]);
  });

  it('makes the three claims of the short version, and the four rules', () => {
    expect(text).toContain('AI did not make the sound.');
    expect(text).toContain('No AI runs in the app.');
    expect(text).toContain('AI helped us write and check the code.');
    const rules = html.match(/<ul class="ai-rules"[^>]*>(.*?)<\/ul>/)![1];
    expect(rules.match(/<li>/g)).toHaveLength(4);
    expect(text).toContain('No cloud AI service anywhere between the picture and your speakers.');
  });

  it('does not link to the log, and has no section on what is not checked yet', () => {
    expect(html).not.toContain('AI_USE');
    expect(text).not.toContain('not checked yet');
  });

  it('says the idea was ours, and has no tips section', () => {
    expect(text).toContain('The idea for the app was ours.');
    expect(text).toContain('The idea was ours.');
    expect(text).not.toContain('If you are using AI on a project');
  });

  it('shows the five steps from the Earth to what you hear', () => {
    expect([...html.matchAll(/class="ai-step"/g)]).toHaveLength(5);
  });
});
