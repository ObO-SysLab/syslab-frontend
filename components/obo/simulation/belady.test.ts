import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createDocument, validateDocument, type SimulationInstance } from '../runtime/document.mjs';
import { run } from '../runtime/index.mjs';
import type { ModelRun } from '../runtime/index.mjs';
import { beladySnapshot } from './pageReplacementModel';
import { PageReplacementExplanation, PageReplacementVisual } from './PageReplacementVisual';

const refs = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5];
function setup(policy = 'FIFO', capacities = [3, 4], r = refs) {
  const doc = createDocument('P3'), instance: SimulationInstance = doc.instances[0];
  instance.input = { refs: r, capacities, policy };
  const execution = run('P3', instance.input);
  return { doc, instance, execution, at: (c: number) => beladySnapshot(instance, execution, c) };
}
const status = (b: ReturnType<typeof beladySnapshot>) => b.rows.map(r => [r.capacity, r.status, r.faults]);

describe('P3 shows one row per frame count using only the observed prefix', () => {
  it('starts with every row waiting', () => {
    expect(status(setup().at(-1))).toEqual([[3, 'waiting', null], [4, 'waiting', null]]);
  });
  it('keeps later capacities waiting with no values while the first one runs', () => {
    const b = setup().at(7);
    expect(status(b)).toEqual([[3, 'running', 7], [4, 'waiting', null]]);
    expect(b.running?.snapshot?.current?.page).toBe(1);
    expect(b.finished).toBe(false);
  });
  it('shows the finished first row and the running second row', () => {
    expect(status(setup().at(12 + 5))).toEqual([[3, 'done', 9], [4, 'running', 4]]);
  });
  it('flags Belady only when more frames actually gave more misses', () => {
    const fifo = setup().at(23);
    expect(fifo.finished).toBe(true);
    expect(fifo.increases).toEqual([{ from: 3, to: 4, before: 9, after: 10 }]);
    expect(fifo.summary).toContain('Belady 현상이 나타났습니다');
    for (const policy of ['LRU', 'OPT']) {
      const b = setup(policy).at(23);
      expect(b.increases).toEqual([]);
      expect(b.summary).toContain('늘지 않았습니다');
    }
  });
  it('runs capacities in ascending order regardless of input order, and handles one capacity and an empty string', () => {
    expect(setup('FIFO', [4, 3]).at(23).rows.map(r => [r.capacity, r.faults])).toEqual([[3, 9], [4, 10]]);
    expect(status(setup('FIFO', [3]).at(11))).toEqual([[3, 'running', 9]]);
    const empty = setup('FIFO', [3, 4], []).at(-1);
    expect(empty.finished).toBe(true);
    expect(empty.rows.every(r => r.faults === 0)).toBe(true);
  });
  it('rejects a trace with a wrong capacity order', () => {
    const { instance, execution } = setup();
    const altered = structuredClone(execution) as ModelRun;
    (altered.events[0].data as { capacity: number }).capacity = 4;
    expect(() => beladySnapshot(instance, altered, 0)).toThrow();
  });
  it('renders running, waiting and the final result without page numbers in the explanation', () => {
    const { instance, execution, doc } = setup();
    const view = doc.instances[0].views[0];
    const mid = renderToStaticMarkup(createElement(PageReplacementVisual, { instance, execution, cursor: 7, view }));
    expect(mid).toContain('data-page-capacity="3" data-page-status="running"');
    expect(mid).toContain('data-page-capacity="4" data-page-status="waiting"');
    expect(mid).toContain('대기 · 아직 실행 전');
    expect(mid).not.toContain('data-page-belady-result');
    const end = renderToStaticMarkup(createElement(PageReplacementVisual, { instance, execution, cursor: 23, view }));
    expect(end).toContain('data-page-belady-result="increase"');
    expect(end).toContain('3칸 → 4칸: Miss 9 → 10');
    expect(end).toContain('마지막 참조');
    expect(end).not.toContain('진행 중');
    expect(mid).toContain('진행 중');
    const note = renderToStaticMarkup(createElement(PageReplacementExplanation, { instance, execution, cursor: 23 }));
    expect(note).toContain('Belady 현상');
  });
  it('new P3 documents use the textbook Belady example with memory and annotation', () => {
    const doc = createDocument('P3');
    expect(doc.instances[0].input).toEqual({ refs, capacities: [3, 4], policy: 'FIFO' });
    expect(doc.instances[0].views.map(v => v.role)).toEqual(['memory', 'annotation']);
    expect(() => validateDocument(doc)).not.toThrow();
  });
});
