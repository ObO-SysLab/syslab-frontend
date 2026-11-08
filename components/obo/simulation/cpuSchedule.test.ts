import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createDocument, validateDocument, type SimulationInstance } from '../runtime/document.mjs';
import { run } from '../runtime/index.mjs';
import type { ModelRun } from '../runtime/index.mjs';
import { cpuComparison, cpuSnapshot, type CpuModel } from './cpuScheduleModel';
import { CpuScheduleExplanation, CpuScheduleVisual } from './CpuScheduleVisual';

function setup(model: CpuModel, patch: Partial<SimulationInstance['input']> = {}) {
  const doc = createDocument(model), instance: SimulationInstance = doc.instances[0];
  instance.input = { ...instance.input, ...patch } as SimulationInstance['input'];
  const execution = run(model, instance.input);
  const last = execution.events.length - 1;
  return { doc, instance, execution, last, at: (c: number) => cpuSnapshot(instance, execution, c) };
}

describe('CPU scheduling snapshot follows the observed prefix', () => {
  it('starts with no segments and every job before arrival', () => {
    const s = setup('RR').at(-1);
    expect(s).toMatchObject({ time: 0, phase: 'initial', current: null, segments: [], averageWaiting: 0 });
    expect(s.jobs.map(j => j.state)).toEqual(['new', 'new', 'new', 'new']);
  });
  it('matches the engine waiting times at the last event for every policy', () => {
    for (const [model, policy] of [['G2', 'FCFS'], ['G2', 'SJF'], ['G2', 'SRTF'], ['RR', 'RR'], ['PS', 'PS'], ['PS', 'PS-P']] as const) {
      const { at, last, execution } = setup(model, { policy });
      const s = at(last), final = (execution.result as { metrics: Record<string, { waiting: number }> }).metrics;
      expect(Object.fromEntries(s.jobs.map(j => [j.id, j.waiting]))).toEqual(Object.fromEntries(Object.entries(final).map(([k, v]) => [k, v.waiting])));
      expect(s.finished).toBe(true);
      expect(s.segments.filter(x => x.actor)).toEqual((execution.result as { segments: unknown[] }).segments);
    }
  });
  it('draws only what has run so far and keeps the time axis from the input', () => {
    const { at, execution } = setup('RR');
    const i = execution.events.findIndex(e => e.kind === 'expire');
    const s = at(i);
    expect(s.phase).toBe('expire');
    expect(s.segments).toEqual([{ actor: 'P1', start: 0, end: 2 }]);
    expect(s.ready.at(-1)).toBe('P1');
    expect(s.horizon).toBe(3 + 5 + 3 + 1 + 2);
  });
  it('tracks the RR quantum and PS priorities, and marks preemption', () => {
    const rr = setup('RR'), run1 = rr.execution.events.findIndex(e => e.kind === 'run');
    expect(rr.at(run1)).toMatchObject({ current: 'P1', quantumUsed: 1 });
    const ps = setup('PS'), p = ps.execution.events.findIndex(e => e.kind === 'preempt');
    expect(ps.at(p)).toMatchObject({ phase: 'preempt', eventActor: 'P1' });
    expect(ps.at(p).jobs.find(j => j.id === 'P2')?.priority).toBe(1);
  });
  it('handles I/O bursts with blocked jobs and idle CPU time', () => {
    const { at, last } = setup('G2', { jobs: [{ id: 'A', arrival: 0, bursts: [2, 3, 1] }, { id: 'B', arrival: 0, bursts: [2] }], policy: 'FCFS' });
    const s = at(last);
    expect(s.segments.some(x => x.actor === null)).toBe(true);
    expect(Object.fromEntries(s.jobs.map(j => [j.id, j.waiting]))).toEqual({ A: 0, B: 2 });
  });
  it('rejects a trace that does not match the input', () => {
    const { instance, execution } = setup('RR');
    const altered = structuredClone(execution) as ModelRun;
    (altered.events[1].data as { current: string }).current = 'P2';
    expect(() => cpuSnapshot(instance, altered, 1)).toThrow();
  });
});

describe('G2 comparison and the view', () => {
  it('compares FCFS/SJF/SRTF at the same time with the problem policy marked', () => {
    const { instance, execution, last } = setup('G2');
    const rows = cpuComparison(instance, execution, last);
    expect(rows.map(r => [r.policy, r.primary])).toEqual([['FCFS', false], ['SJF', true], ['SRTF', false]]);
    expect(rows.map(r => r.snapshot.averageWaiting)).toEqual([4, 3.25, 2.25]);
    expect(rows.every(r => r.snapshot.time === rows[1].snapshot.time)).toBe(true);
  });
  it('renders lanes, CPU, queue and the comparison; explanations stay free of job names', () => {
    const { doc, instance, execution } = setup('G2');
    const html = renderToStaticMarkup(createElement(CpuScheduleVisual, { instance, execution, cursor: 8, view: doc.instances[0].views[0] }));
    expect(html).toContain('data-cpu-lane="P1"');
    expect(html).toContain('data-cpu-policy-row="SJF" data-cpu-primary="true"');
    const rr = setup('RR'), rrHtml = renderToStaticMarkup(createElement(CpuScheduleVisual, { instance: rr.instance, execution: rr.execution, cursor: 4, view: rr.doc.instances[0].views[0] }));
    expect(rrHtml).toContain('data-cpu-quantum="2/2"');
    expect(rrHtml).toContain('data-cpu-jobs');
    const note = renderToStaticMarkup(createElement(CpuScheduleExplanation, { instance, execution, cursor: 1 }));
    expect(note).not.toMatch(/P[1-4]/);
    const broken = { ...instance, input: { ...instance.input, jobs: [{ id: 'A', arrival: 0, bursts: [1] }, { id: 'A', arrival: 0, bursts: [1] }] } };
    expect(renderToStaticMarkup(createElement(CpuScheduleVisual, { instance: broken, execution: null, cursor: -1, view: doc.instances[0].views[0] }))).toContain('data-cpu-invalid');
  });
  it('new documents use the four-job example', () => {
    for (const [model, policy, roles] of [['G2', 'SJF', ['timeline', 'annotation']], ['RR', 'RR', ['timeline']], ['PS', 'PS-P', ['timeline']]] as const) {
      const doc = createDocument(model);
      expect(doc.instances[0].input).toMatchObject({ policy, quantum: 2 });
      expect((doc.instances[0].input.jobs as unknown[]).length).toBe(4);
      expect(doc.instances[0].views.map(v => v.role)).toEqual(roles);
      expect(() => validateDocument(doc)).not.toThrow();
    }
  });
});
