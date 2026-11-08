import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createDocument, validateDocument, type SimulationInstance, type SimulationView } from '../runtime/document.mjs';
import { run } from '../runtime/index.mjs';
import type { ModelRun } from '../runtime/index.mjs';
import { pageComparison } from './pageReplacementModel';
import { PageReplacementVisual } from './PageReplacementVisual';

const refs = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3];
function setup(policy = 'OPT') {
  const doc = createDocument('OPT'), instance: SimulationInstance = doc.instances[0];
  instance.input = { refs, frameCount: 3, policy, initial: [] };
  const execution = run('OPT', instance.input);
  return { doc, instance, execution, view: instance.views[0] };
}
const render = (instance: SimulationInstance, execution: ModelRun | null, cursor: number, view: SimulationView) => renderToStaticMarkup(createElement(PageReplacementVisual, { instance, execution, cursor, view }));

describe('OPT compares three policies at the same reference', () => {
  it('orders rows FIFO, LRU, OPT, marks the problem policy and matches each engine run', () => {
    for (const policy of ['FIFO', 'LRU', 'OPT']) {
      const { instance, execution } = setup(policy), rows = pageComparison(instance, execution, 11);
      expect(rows.map(r => [r.policy, r.primary])).toEqual(['FIFO', 'LRU', 'OPT'].map(p => [p, p === policy]));
      expect(rows.map(r => r.snapshot.faults)).toEqual([10, 9, 7]);
    }
  });
  it('shows each policy choice at the same position (FIFO evicts 0, LRU and OPT evict 1)', () => {
    const { instance, execution } = setup(), rows = pageComparison(instance, execution, 5);
    expect(rows.map(r => r.snapshot.current?.victim)).toEqual([0, 1, 1]);
    expect(rows.every(r => r.snapshot.current?.page === 3)).toBe(true);
  });
  it('validates only the recorded policy trace and still compares before the first event', () => {
    const { instance, execution } = setup('LRU');
    const altered = structuredClone(execution) as ModelRun;
    (altered.events[5].data as { victim: number }).victim = 0;
    expect(() => pageComparison(instance, altered, 5)).toThrow();
    expect(pageComparison(instance, null, -1).every(r => r.snapshot.phase === 'initial')).toBe(true);
  });
  it('renders rows, the OPT note and hides groups', () => {
    const { instance, execution, view } = setup();
    const html = render(instance, execution, 5, view);
    expect(html).toContain('data-page-policy-row="FIFO" data-page-primary="false"');
    expect(html).toContain('data-page-policy-row="OPT" data-page-primary="true"');
    expect(html).toContain('Miss · 0 나감');
    expect(html).toContain('미래 참조를 아는 교육용 기준');
    const counts = render(instance, execution, 5, { ...view, fields: ['Hit/Miss'] });
    expect(counts).toContain('data-page-faults');
    expect(counts).not.toContain('data-page-refs');
    expect(counts).not.toContain('나감');
  });
  it('new OPT documents use the textbook string with the OPT policy and one record', () => {
    const doc = createDocument('OPT');
    expect(doc.instances[0].input).toEqual({ refs, frameCount: 3, policy: 'OPT', initial: [] });
    expect(doc.instances[0].views.map(v => [v.role, v.width, v.height])).toEqual([['record', 900, 420]]);
    expect(() => validateDocument(doc)).not.toThrow();
  });
});
