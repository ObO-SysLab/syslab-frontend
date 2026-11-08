import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createDocument, createInstance, createView, validateDocument, type SimulationInstance, type SimulationView } from '../runtime/document.mjs';
import { run } from '../runtime/index.mjs';
import type { ModelRun } from '../runtime/index.mjs';
import { projection } from '../runtime/projection.mjs';
import { pageSnapshot, type PageModel } from './pageReplacementModel';
import { PageReplacementExplanation, PageReplacementVisual } from './PageReplacementVisual';

type Input = SimulationInstance['input'];
const refs = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3];
const input = (policy: string, extra: Input = {}): Input => ({ refs, frameCount: 3, policy, initial: [], ...extra });
function setup(model: PageModel, value: Input) {
  const instance: SimulationInstance = { ...createInstance(model), input: structuredClone(value) };
  const execution = run(model, instance.input);
  return { instance, execution, at: (cursor: number) => pageSnapshot(instance, execution, cursor) };
}
const pages = (s: ReturnType<typeof pageSnapshot>) => s.frames.map(f => f.page);

describe('page replacement snapshot follows the observed prefix', () => {
  it('starts with empty frames and no faults', () => {
    const { instance, at } = setup('P2', input('FIFO'));
    expect(at(-1)).toMatchObject({ phase: 'initial', faults: 0, hits: 0, current: null });
    expect(pages(at(-1))).toEqual([null, null, null]);
    expect(at(-1).refs.every(r => r.state === 'future')).toBe(true);
    expect(at(-1)).toEqual(pageSnapshot(instance, null, -1));
  });

  it('distinguishes loading into an empty slot, a hit and a replacement', () => {
    const { at } = setup('P2', input('FIFO'));
    expect(at(0)).toMatchObject({ phase: 'load', faults: 1, current: { page: 7, victim: null, slot: 0 } });
    expect(at(4)).toMatchObject({ phase: 'hit', faults: 4, hits: 1, current: { page: 0, hit: true } });
    expect(at(4).frames.find(f => f.current)).toMatchObject({ page: 0, incoming: false, left: null });
    const r = at(3);
    expect(r).toMatchObject({ phase: 'replace', current: { page: 2, victim: 7, slot: 0 } });
    expect(r.frames[0]).toMatchObject({ page: 2, incoming: true, left: 7 });
  });

  it('matches the engine fault totals for FIFO, LRU and OPT', () => {
    expect(setup('P2', input('FIFO')).at(11).faults).toBe(10);
    expect(setup('P2', input('LRU')).at(11).faults).toBe(9);
    expect(setup('OPT', input('OPT')).at(11).faults).toBe(7);
  });

  it('explains the choice with the policy basis', () => {
    const fifo = setup('P2', input('FIFO')).at(5), lru = setup('P2', input('LRU')).at(5), opt = setup('OPT', input('OPT')).at(5);
    // FIFO evicts 0 (entered 2nd); LRU evicts 1 (last used 3rd).
    expect(fifo.current).toMatchObject({ page: 3, victim: 0 });
    expect(lru.current).toMatchObject({ page: 3, victim: 1 });
    expect(fifo.frames.map(f => f.loadedAt)).toEqual([4, 6, 3]);
    expect(lru.frames.map(f => f.usedAt)).toEqual([4, 5, 6]);
    expect(opt.frames.every(f => f.page === null || f.nextUse === null || f.nextUse > 6)).toBe(true);
    expect(lru.summary).toContain('가장 오래 사용하지 않은');
  });

  it('marks pre-loaded pages as present from the start and handles page 0 and an empty string', () => {
    const pre = setup('P2', { refs: [3, 1, 4], frameCount: 3, policy: 'FIFO', initial: [1, 2] }).at(-1);
    expect(pre.frames.map(f => [f.page, f.loadedAt])).toEqual([[1, 0], [2, 0], [null, null]]);
    expect(setup('P2', { refs: [0, 0, 1], frameCount: 1, policy: 'FIFO', initial: [] }).at(1)).toMatchObject({ phase: 'hit', current: { page: 0 } });
    expect(setup('P2', { refs: [], frameCount: 3, policy: 'FIFO', initial: [] }).at(-1).refs).toEqual([]);
  });

  it('rejects altered or mismatched traces', () => {
    const { instance, execution } = setup('P2', input('FIFO'));
    const altered = structuredClone(execution) as ModelRun;
    (altered.events[3].data as { victim: number }).victim = 1;
    expect(() => pageSnapshot(instance, altered, 3)).toThrow();
    expect(() => pageSnapshot({ ...instance, input: input('LRU') }, execution, 5)).toThrow();
  });
});

describe('page replacement view', () => {
  function render(value: Input, cursor: number, fields: string[] = []) {
    const doc = createDocument('P2'), instance = doc.instances[0];
    instance.input = value;
    const view: SimulationView = { ...instance.views[0], fields };
    return renderToStaticMarkup(createElement(PageReplacementVisual, { instance, execution: run('P2', value), cursor, view }));
  }
  it('shows the current reference, the incoming slot and the page that left', () => {
    const html = render(input('FIFO'), 3);
    expect(html).toContain('data-page-ref="3" data-page-ref-state="current"');
    expect(html).toMatch(/data-page-slot="0"[^>]*data-page-incoming="true"/);
    expect(html).toContain('data-page-left="7"');
    expect(html).toContain('Miss · 교체');
    expect(html).toContain('data-page-faults="4"');
  });
  it('hides groups without re-exposing them, and maps saved raw keys', () => {
    const framesOnly = render(input('FIFO'), 3, ['frames']);
    expect(framesOnly).toContain('data-page-frames');
    expect(framesOnly).not.toContain('data-page-refs');
    expect(framesOnly).not.toContain('data-page-faults');
    expect(framesOnly).not.toContain('페이지 2 참조');
    const refsOnly = render(input('FIFO'), 3, ['참조열']);
    expect(refsOnly).toContain('data-page-refs');
    expect(refsOnly).not.toContain('data-page-frames');
    expect(refsOnly).not.toContain('data-page-ref-hit');
  });
  it('shows a 16-reference window instead of scrolling for long strings', () => {
    const long = Array.from({ length: 80 }, (_, i) => i % 7);
    const html = render({ refs: long, frameCount: 3, policy: 'LRU', initial: [] }, 60);
    expect((html.match(/data-page-ref=/g) ?? []).length).toBe(16);
    expect(html).toContain('data-page-ref="60" data-page-ref-state="current"');
  });
  it('keeps the lower explanation free of page numbers and shows a notice for broken input', () => {
    const doc = createDocument('P2'), instance = doc.instances[0];
    const html = renderToStaticMarkup(createElement(PageReplacementExplanation, { instance, execution: run('P2', instance.input), cursor: 3 }));
    expect(html).toContain('가장 먼저 들어온 페이지');
    expect(html).not.toMatch(/>[^<]*\b7\b[^<]*</);
    const broken = { ...instance, input: { ...instance.input, initial: [1, 1] } };
    expect(renderToStaticMarkup(createElement(PageReplacementVisual, { instance: broken, execution: null, cursor: -1, view: instance.views[0] }))).toContain('data-page-invalid');
  });
  it('new P2 documents use the textbook example with record and annotation, and records use meaning keys', () => {
    const doc = createDocument('P2'), instance = doc.instances[0];
    expect(instance.input).toEqual({ refs, frameCount: 3, policy: 'FIFO', initial: [] });
    expect(instance.views.map(v => v.role)).toEqual(['record', 'annotation']);
    expect(() => validateDocument(doc)).not.toThrow();
    const rows = projection(instance, run('P2', instance.input), 3, createView('record')).rows;
    expect(rows.map(([k]) => k)).toEqual(['참조열', '프레임', 'Hit/Miss']);
  });
});
