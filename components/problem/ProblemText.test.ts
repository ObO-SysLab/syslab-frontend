import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { ProblemText, ProblemInline, problemTextBlocks } from './ProblemText';

const html = (text: string) => renderToStaticMarkup(createElement(ProblemText, { text }));

describe('ProblemText', () => {
  it('keeps plain statements as one pre-wrapped paragraph', () => {
    expect(html('첫 줄\n  둘째 줄')).toBe('<div class="break-words " data-problem-text="true"><p class="whitespace-pre-wrap">첫 줄\n  둘째 줄</p></div>');
  });

  it('styles bold and inline code without showing the marks', () => {
    const out = html('**페이지 폴트 횟수**를 구하고 `ls -a`로 확인');
    expect(out).toContain('<strong class="font-bold">페이지 폴트 횟수</strong>를 구하고 ');
    expect(out).toContain('<code class="rounded bg-raised px-1 py-0.5 font-mono text-[0.9em]">ls -a</code>');
    expect(out).not.toContain('**');
    expect(out).not.toContain('`');
  });

  it('turns fenced blocks into monospace blocks and keeps their spacing', () => {
    const text = '그림을 보세요.\n\n```text\n|  Stack  |\n|    v    |\n```\n\n빈칸은?';
    expect(problemTextBlocks(text)).toEqual([
      { code: false, text: '그림을 보세요.' },
      { code: true, text: '|  Stack  |\n|    v    |' },
      { code: false, text: '빈칸은?' },
    ]);
    expect(html(text)).toContain('<pre class="my-3 overflow-x-auto rounded-lg border border-line bg-canvas p-3 font-mono text-[13px] leading-6 whitespace-pre"><code>|  Stack  |\n|    v    |</code></pre>');
  });

  it('does not style marks inside code blocks and leaves an unclosed fence as text', () => {
    expect(html('```c\nint *p = **q;\n```')).toContain('<code>int *p = **q;</code>');
    expect(html('```\n열기만 함')).toContain('<p class="whitespace-pre-wrap">```\n열기만 함</p>');
  });

  it('turns a leading asterisk into a bullet but keeps multiplication', () => {
    expect(html('* P1: 8ms\n  * 하위\n2 * 3 = 6')).toContain('• P1: 8ms\n  • 하위\n2 * 3 = 6');
  });

  it('escapes markup and renders nothing for empty text', () => {
    expect(html('<b>x</b> **<i>y</i>**')).toContain('&lt;b&gt;x&lt;/b&gt; <strong class="font-bold">&lt;i&gt;y&lt;/i&gt;</strong>');
    expect(renderToStaticMarkup(createElement(ProblemText, { text: '' }))).toBe('');
  });

  it('inline variant styles marks only', () => {
    expect(renderToStaticMarkup(createElement(ProblemInline, { text: '`fork()` 호출' }))).toBe('<code class="rounded bg-raised px-1 py-0.5 font-mono text-[0.9em]">fork()</code> 호출');
  });
});
