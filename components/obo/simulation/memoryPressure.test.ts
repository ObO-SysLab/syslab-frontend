import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createDocument, validateDocument, type SimulationInstance } from '../runtime/document.mjs';
import { run } from '../runtime/index.mjs';
import type { ModelRun } from '../runtime/index.mjs';
import { pressureSnapshot } from './memoryPressureModel';
import { MemoryPressureExplanation, MemoryPressureVisual } from './MemoryPressureVisual';

function setup(quotas = { P: 2, Q: 2 }, budget = 4) {
  const doc = createDocument('TH'), instance: SimulationInstance = doc.instances[0];
  instance.input = { ...instance.input, quotas, frameBudget: budget };
  const execution = run('TH', instance.input);
  return { doc, instance, execution, at: (c: number) => pressureSnapshot(instance, execution, c) };
}
const byId = (s: ReturnType<typeof pressureSnapshot>) => Object.fromEntries(s.processes.map(p => [p.id, p]));

describe('TH shows each process against its fixed quota using only the observed prefix', () => {
  it('starts empty', () => {
    const s = setup().at(-1);
    expect(s.current).toBeNull();
    expect(s.processes.map(p => [p.id, p.faults, p.workingSet, p.frames.map(f => f.page)])).toEqual([['P', 0, 0, [null, null]], ['Q', 0, 0, [null, null]]]);
  });
  it('matches the engine misses and flags only a working set larger than the quota', () => {
    const end = byId(setup().at(15));
    expect([end.P.faults, end.Q.faults]).toEqual([8, 2]);
    expect([end.P.workingSet, end.Q.workingSet]).toEqual([4, 2]);
    expect([end.P.needsMore, end.Q.needsMore]).toEqual([true, false]);
    const enough = byId(setup({ P: 4, Q: 2 }, 6).at(15));
    expect([enough.P.faults, enough.P.needsMore]).toEqual([4, false]);
  });
  it('shows the replaced page with the same LRU rule and Q hitting while P keeps missing', () => {
    const s = setup().at(4);
    expect(s.current).toMatchObject({ id: 'P', page: 3, hit: false, victim: 1 });
    expect(byId(s).P.left).toBe(1);
    expect(setup().at(5).current).toMatchObject({ id: 'Q', page: 7, hit: true });
    expect(byId(setup().at(15)).Q.recent.slice(-3)).toEqual([true, true, true]);
  });
  it('marks past references with each process own Hit/Miss', () => {
    const s = setup().at(5);
    expect(s.refs.slice(0, 6).map(r => [r.id, r.hit])).toEqual([['P', false], ['Q', false], ['P', false], ['Q', false], ['P', false], ['Q', true]]);
    expect(s.refs[6].hit).toBeNull();
  });
  it('rejects altered traces and inputs that break the engine rules', () => {
    const { instance, execution } = setup();
    const altered = structuredClone(execution) as ModelRun;
    (altered.events[3].data as { faults: number }).faults = 9;
    expect(() => pressureSnapshot(instance, altered, 3)).toThrow();
    expect(() => pressureSnapshot({ ...instance, input: { ...instance.input, frameBudget: 3 } }, null, -1)).toThrow();
  });
  it('renders the warning only for the pressured process and keeps the explanation free of page numbers', () => {
    const { instance, execution, doc } = setup();
    const html = renderToStaticMarkup(createElement(MemoryPressureVisual, { instance, execution, cursor: 15, view: doc.instances[0].views[0] }));
    expect(html).toMatch(/data-pressure-process="P"[^>]*data-pressure-needs-more="true"/);
    expect(html).toMatch(/data-pressure-process="Q"[^>]*data-pressure-needs-more="false"/);
    expect((html.match(/data-pressure-warning/g) ?? []).length).toBe(1);
    expect(html).not.toMatch(/스래싱|CPU/);
    const note = renderToStaticMarkup(createElement(MemoryPressureExplanation, { instance, execution, cursor: 4 }));
    expect(note).toContain('Miss가 반복되기 쉽습니다');
  });
  it('new TH documents use the two-process example with memory and annotation', () => {
    const doc = createDocument('TH');
    expect(doc.instances[0].input.quotas).toEqual({ P: 2, Q: 2 });
    expect((doc.instances[0].input.stream as unknown[]).length).toBe(16);
    expect(doc.instances[0].views.map(v => v.role)).toEqual(['memory', 'annotation']);
    expect(() => validateDocument(doc)).not.toThrow();
  });
});
