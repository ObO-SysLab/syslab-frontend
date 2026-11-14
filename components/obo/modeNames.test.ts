import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { OboEditorSection } from './OboEditorSection';
import { createDocument } from './runtime/document.mjs';

// The start cards are named 간편 모드 (rule-based simulation) and 자유 모드 (free drawing).
describe('mode names on the start cards', () => {
  const render = (coding: boolean) => renderToStaticMarkup(createElement(OboEditorSection, {
    value: { schemaVersion: 2, mode: 'simulation', simulation: createDocument('P2') }, onChange: () => {}, allowCodingDiff: coding,
  } as never));
  it.each([[true], [false]])('coding=%s shows 간편 모드 and 자유 모드 without the old names', coding => {
    const html = render(coding);
    expect(html).toContain('간편 모드'); expect(html).toContain('자유 모드');
    expect(html).toContain(coding ? '숨김 테스트를 자동으로' : '과정과 그림을 자동으로');
    expect(html).not.toMatch(/규칙 기반|자유 그림/);
  });
});
