import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { FirstBloodPanel } from './FirstBloodPanel';

const html = (props: { user?: string | null; date?: string | null }) => renderToStaticMarkup(createElement(FirstBloodPanel, props));

describe('FirstBloodPanel', () => {
  it('invites the reader when nobody has solved the problem yet', () => {
    for (const props of [{}, { user: '' }, { user: null, date: '' }]) {
      const out = html(props);
      expect(out).toContain('첫 번째 해결자가 되어 보세요');
      expect(out).toContain('아직 푼 사람이 없습니다.');
      expect(out).not.toContain('rounded-full bg-line');
    }
  });

  it('shows the first solver and the date', () => {
    const out = html({ user: 'diver', date: '11월 14일' });
    expect(out).toContain('>diver<');
    expect(out).toContain('>d<');
    expect(out).toContain('11월 14일');
    expect(out).not.toContain('첫 번째 해결자가 되어 보세요');
  });
});
