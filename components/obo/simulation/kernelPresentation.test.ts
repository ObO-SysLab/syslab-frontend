import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createDocument, createView, validateDocument, type SimulationInstance, type SimulationView } from '../runtime/document.mjs';
import { run } from '../runtime/index.mjs';
import { KernelExplanation, KernelVisual } from './KernelVisual';

type Input = SimulationInstance['input'];
const contexts = () => ({ P: { pc: 42, sp: 4096 }, Q: { pc: 8 }, R: { pc: 120 } });
const input = (scenario: string, extra: Input = {}): Input => ({ scenario, current: 'P', blocked: 'Q', contexts: contexts(), at: 7, returnValue: 0, ...extra });
function fixture(model: 'K-SYSCALL' | 'K-INTERRUPT', value: Input) {
  const doc = createDocument(model), instance = doc.instances[0], view = instance.views[0];
  instance.input = value;
  const execution = run(model, value);
  const render = (cursor: number, selected: SimulationView = view) => renderToStaticMarkup(createElement(KernelVisual, { instance, execution, cursor, view: selected }));
  return { doc, instance, view, execution, render };
}
const attr = (html: string, name: string) => html.match(new RegExp(`${name}="([^"]*)"`))?.[1];

describe('kernel record view', () => {
  it('return is drawn inside the kernel region without a return-to-user link', () => {
    const { render } = fixture('K-SYSCALL', input('syscall'));
    const html = render(3);
    expect(html).toContain('data-kernel-region="kernel" data-kernel-region-active="true"');
    expect(html).toContain('data-kernel-region="user" data-kernel-region-active="false"');
    expect(attr(html, 'data-kernel-mode-link')).toBe('none');
    expect(html).not.toContain('<span>복귀</span>');
    expect(html).toMatch(/data-kernel-return-value="true">0<\/strong>/);
    expect(html).toContain('아직 복귀 전');
  });

  it('restore draws the kernel→user link and the user region becomes current', () => {
    const { render } = fixture('K-SYSCALL', input('syscall'));
    const html = render(4);
    expect(attr(html, 'data-kernel-mode-link')).toBe('exit');
    expect(html).toContain('<span>복귀</span>');
    expect(html).toContain('data-kernel-region="user" data-kernel-region-active="true"');
    expect(html).not.toContain('아직 복귀 전');
  });

  it('enter draws the user→kernel link only on the enter step', () => {
    const { render } = fixture('K-SYSCALL', input('syscall'));
    expect(attr(render(0), 'data-kernel-mode-link')).toBe('enter');
    expect(attr(render(1), 'data-kernel-mode-link')).toBe('none');
    expect(render(-1)).toContain('data-kernel-return="pending"');
  });

  it('blocking shows no runner and P waiting without promoting R', () => {
    const { render } = fixture('K-SYSCALL', input('blocking'));
    const html = render(3);
    expect(html).toContain('data-kernel-runner="none"');
    expect(html).toContain('현재 실행 없음');
    expect(html).toMatch(/data-kernel-context="context:P" data-kernel-state="Waiting" data-kernel-current="false" data-kernel-event-actor="true"/);
    expect(html).toMatch(/data-kernel-context="context:R" data-kernel-state="Ready"/);
  });

  it('io unblock shows Q as event target while P keeps running', () => {
    const { render } = fixture('K-INTERRUPT', input('io'));
    const html = render(3);
    expect(html).toContain('data-kernel-runner="P"');
    expect(html).toContain('data-kernel-event-actor="Q"');
    expect(html).toMatch(/data-kernel-context="context:Q" data-kernel-state="Ready" data-kernel-current="false" data-kernel-event-actor="true"/);
    // Interrupt flows have no return value box.
    expect(html).not.toContain('data-kernel-return');
  });

  it('hidden contexts and groups are not re-exposed elsewhere', () => {
    const { render, view } = fixture('K-INTERRUPT', input('io'));
    const html = render(3, { ...view, fields: ['모드', 'P'] });
    expect(html).not.toContain('context:Q');
    expect(html).not.toContain('data-kernel-event-actor="Q"');
    expect(html).toContain('data-kernel-runner="P"');
    const onlyReturn = fixture('K-SYSCALL', input('syscall')).render(3, { ...view, fields: ['반환값'] });
    expect(onlyReturn).not.toContain('data-kernel-region');
    expect(onlyReturn).not.toContain('data-kernel-mode-badge');
    expect(onlyReturn).not.toContain('data-kernel-context=');
    expect(onlyReturn).toMatch(/data-kernel-return-value="true">0<\/strong>/);
    const runnerHidden = fixture('K-SYSCALL', input('syscall')).render(3, { ...view, fields: ['모드'] });
    expect(runnerHidden).toContain('data-kernel-runner="hidden"');
    expect(runnerHidden).not.toContain('"P"');
    expect(runnerHidden).not.toContain('>P<');
  });

  it('long values use an expandable original and invalid input shows a safe notice', () => {
    const { render } = fixture('K-SYSCALL', input('syscall', { contexts: { P: { note: '문맥 값 '.repeat(45) }, Q: {} } }));
    const html = render(1);
    expect(html).toContain('data-kernel-value-details="context:P:note"');
    expect(html).toContain('레지스터 값 없음');
    const { instance, execution, view } = fixture('K-SYSCALL', input('syscall'));
    const broken = { ...instance, input: { ...instance.input, blocked: 'P' } };
    expect(renderToStaticMarkup(createElement(KernelVisual, { instance: broken, execution, cursor: 1, view }))).toContain('data-kernel-invalid');
  });

  it('lower explanation states meaning without leaking values', () => {
    const { instance, execution } = fixture('K-SYSCALL', input('syscall', { returnValue: 31337 }));
    const html = renderToStaticMarkup(createElement(KernelExplanation, { instance, execution, cursor: 3 }));
    expect(html).toContain('아직 커널 영역에서 처리 중입니다.');
    expect(html).not.toContain('31337');
  });

  it('new default documents validate with record and annotation', () => {
    for (const model of ['K-SYSCALL', 'K-INTERRUPT'] as const) {
      const { doc } = fixture(model, input(model === 'K-SYSCALL' ? 'syscall' : 'io'));
      expect(() => validateDocument(doc)).not.toThrow();
      expect(doc.instances[0].views.map(v => v.role)).toEqual(['record', 'annotation']);
    }
    expect(createView('record').fields).toEqual([]);
  });
});
