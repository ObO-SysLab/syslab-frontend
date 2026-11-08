import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createDocument, validateDocument, type SimulationInstance } from '../runtime/document.mjs';
import { registry, run } from '../runtime/index.mjs';
import type { ModelRun } from '../runtime/index.mjs';
import { fitSnapshot } from './memoryFitModel';
import { ragSnapshot } from './resourceGraphModel';
import { dpSnapshot } from './philosophersModel';
import { diskSnapshot } from './diskScheduleModel';
import { MemoryFitExplanation, MemoryFitVisual } from './MemoryFitVisual';
import { ResourceGraphExplanation, ResourceGraphVisual } from './ResourceGraphVisual';
import { PhilosophersExplanation, PhilosophersVisual } from './PhilosophersVisual';
import { DiskScheduleExplanation, DiskScheduleVisual } from './DiskScheduleVisual';
import { hasLowerExplanation } from './lowerExplanations';

type Model = 'MF' | 'S3' | 'DP' | 'DS';
function setup(model: Model, patch: Record<string, unknown> = {}) {
  const doc = createDocument(model), instance: SimulationInstance = doc.instances[0];
  instance.input = { ...instance.input, ...patch } as SimulationInstance['input'];
  const execution = run(model, instance.input);
  return { doc, instance, execution, last: execution.events.length - 1, index: (kind: string, n = 0) => execution.events.filter(e => e.kind === kind)[n].step };
}
const snapshots = { MF: fitSnapshot, S3: ragSnapshot, DP: dpSnapshot, DS: diskSnapshot } as const;
const visuals: Record<Model, ComponentType<{ instance: SimulationInstance; execution: ModelRun | null; cursor: number; view: SimulationInstance['views'][number] }>> = { MF: MemoryFitVisual, S3: ResourceGraphVisual, DP: PhilosophersVisual, DS: DiskScheduleVisual };
const explanations = { MF: MemoryFitExplanation, S3: ResourceGraphExplanation, DP: PhilosophersExplanation, DS: DiskScheduleExplanation } as const;
const tamper = (execution: ModelRun, at: number, change: (data: Record<string, unknown>) => void) => {
  const copy = structuredClone(execution); change(copy.events[at].data as Record<string, unknown>); return copy;
};

describe('authoring defaults for MF/S3/DP/DS', () => {
  it('uses one rule card (plus annotation where the contract has one) and leaves the contract example alone', () => {
    const expected: Record<Model, [string, number, number, boolean]> = { MF: ['memory', 900, 360, true], S3: ['relation', 900, 470, true], DP: ['relation', 900, 470, true], DS: ['storage', 900, 470, false] };
    for (const [model, [role, width, height, note]] of Object.entries(expected) as [Model, [string, number, number, boolean]][]) {
      const doc = createDocument(model), views = doc.instances[0].views;
      expect(validateDocument(doc)).toBe(true);
      expect(views[0]).toMatchObject({ role, width, height });
      expect(views.map(v => v.role)).toEqual(note ? [role, 'annotation'] : [role]);
      expect(hasLowerExplanation(model)).toBe(true);
      expect(registry[model].inputExample).not.toEqual(doc.instances[0].input);
    }
    expect(run('DS', createDocument('DS').instances[0].input).result.distance).toBe(236);
    expect(run('DP', createDocument('DP').instances[0].input).result.stopReason).toBe('deadlocked');
  });
});

describe('MF shows the chosen hole, the freed range and fragmentation', () => {
  it('starts with the whole space free and no request', () => {
    const s = setup('MF').instance, snap = fitSnapshot(s, null, -1);
    expect(snap).toMatchObject({ phase: 'initial', operation: null, candidates: [], highlight: null, freeTotal: 64, largest: 64, holes: 1 });
    expect(snap.operations.every(o => o.status === 'pending')).toBe(true);
  });
  it('lists the holes that fit and the policy that would take each', () => {
    const { instance, execution } = setup('MF'), d = fitSnapshot(instance, execution, 4);
    expect(d.phase).toBe('allocate');
    expect(d.candidates).toEqual([{ start: 10, size: 20, picks: ['first', 'best'] }, { start: 38, size: 26, picks: ['worst'] }]);
    expect(d.highlight).toEqual({ kind: 'placed', start: 10, size: 12 });
    expect(d.summary).toContain('남은 부분');
  });
  it('marks the released range and whether it joined a neighbour', () => {
    const { instance, execution } = setup('MF'), f = fitSnapshot(instance, execution, 3);
    expect(f).toMatchObject({ phase: 'free', highlight: { kind: 'freed', start: 10, size: 20 }, merged: false });
    const m = setup('MF', { operations: [{ op: 'alloc', id: 'A', size: 10 }, { op: 'alloc', id: 'B', size: 10 }, { op: 'free', id: 'B' }] });
    expect(fitSnapshot(m.instance, m.execution, 2)).toMatchObject({ merged: true, holes: 1, freeTotal: 54 });
  });
  it('explains a rejection with enough total free space as external fragmentation', () => {
    const { instance, execution, last } = setup('MF'), r = fitSnapshot(instance, execution, last);
    expect(r).toMatchObject({ phase: 'reject', fragmented: true, freeTotal: 34, largest: 26, candidates: [], highlight: null });
    expect(r.operations.map(o => o.status)).toEqual(['done', 'done', 'done', 'done', 'done', 'current']);
    expect(r.blocks.map(({ start, size, owner }) => ({ start, size, owner }))).toEqual(execution.result.blocks);
    const small = setup('MF', { operations: [{ op: 'alloc', id: 'A', size: 60 }, { op: 'alloc', id: 'B', size: 10 }] });
    expect(fitSnapshot(small.instance, small.execution, 1)).toMatchObject({ phase: 'reject', fragmented: false });
  });
  it('follows every policy to the engine result', () => {
    for (const policy of ['first', 'best', 'worst']) {
      const { instance, execution, last } = setup('MF', { policy });
      expect(fitSnapshot(instance, execution, last).blocks.map(({ start, size, owner }) => ({ start, size, owner }))).toEqual(execution.result.blocks);
    }
  });
});

describe('S3 draws ownership and requests, and marks a deadlock only when detected', () => {
  it('turns a request into ownership and keeps uncovered requests waiting', () => {
    const { instance, execution, index } = setup('S3');
    expect(ragSnapshot(instance, execution, -1).edges).toEqual([]);
    expect(ragSnapshot(instance, execution, index('request')).edges).toEqual([{ kind: 'request', process: 'P1', resource: 'R1', count: 1, deadlocked: false }]);
    expect(ragSnapshot(instance, execution, index('grant')).edges).toEqual([{ kind: 'assign', process: 'P1', resource: 'R1', count: 1, deadlocked: false }]);
    const wait = ragSnapshot(instance, execution, index('request', 2));
    expect(wait).toMatchObject({ phase: 'request', coverable: false, detected: false, deadlocked: [] });
    expect(wait.processes.find(p => p.id === 'P1')?.state).toBe('waiting');
  });
  it('computes the detection result from the current state at detect', () => {
    const { instance, execution, last } = setup('S3'), before = ragSnapshot(instance, execution, last - 1), d = ragSnapshot(instance, execution, last);
    expect(before.processes.some(p => p.state === 'deadlocked')).toBe(false);
    expect(d).toMatchObject({ phase: 'detect', detected: true, deadlocked: execution.result.deadlocked, multiInstance: false });
    expect(d.processes.map(p => p.state)).toEqual(['deadlocked', 'deadlocked', 'waiting']);
    expect(d.edges.filter(e => e.deadlocked).map(e => `${e.kind}:${e.process}-${e.resource}`).sort()).toEqual(['assign:P1-R1', 'assign:P2-R2', 'request:P1-R2', 'request:P2-R1']);
    expect(d.actions.every(a => a.status === 'done')).toBe(true);
  });
  it('does not call a multi-instance cycle a deadlock', () => {
    const input = { actors: ['A', 'B', 'C'], resources: ['X', 'Y'], available: [0, 0], allocated: [[1, 0], [0, 1], [1, 0]], requests: [[0, 1], [1, 0], [0, 0]], actions: [] };
    const { instance, execution, last } = setup('S3', input), d = ragSnapshot(instance, execution, last);
    expect(execution.result.deadlocked).toEqual([]);
    expect(d).toMatchObject({ detected: true, deadlocked: [], multiInstance: true });
    expect(d.summary).toContain('여러 개인 자원');
    expect(d.resources[0].owners).toEqual(['A', 'C']);
  });
});

describe('DP shows forks around the ring and the stop reason', () => {
  it('ends the default two rounds with every philosopher holding the left fork', () => {
    const { instance, execution, last } = setup('DP'), half = dpSnapshot(instance, execution, 4), end = dpSnapshot(instance, execution, last);
    expect(half.philosophers.map(p => p.state)).toEqual(Array(5).fill('hungry'));
    expect(half.forks.every(f => f.owner === null)).toBe(true);
    expect(end.stop).toBe('deadlocked');
    expect(end.philosophers.map(p => [p.forks, p.wants])).toEqual([[[0], 1], [[1], 2], [[2], 3], [[3], 4], [[4], 0]]);
    expect(end.summary).toContain('교착');
    expect(dpSnapshot(instance, execution, last - 1).stop).toBe('running');
  });
  it('counts meals and ends without deadlock under the ordered policy', () => {
    const order = Array.from({ length: 6 }, () => ['A', 'B', 'C', 'D', 'E']).flat();
    const { instance, execution, last } = setup('DP', { policy: 'ordered', order }), s = dpSnapshot(instance, execution, last);
    expect(s.stop).toBe('scheduleEnd');
    expect(s.philosophers.reduce((n, p) => n + p.meals, 0)).toBe(execution.events.filter(e => e.kind === 'release').length);
    expect(s.summary).toContain('보장한다는 뜻은 아닙니다');
  });
  it('stops at the meal goal in find mode and leaves later turns pending', () => {
    const input = { actors: ['A', 'B', 'C'], order: ['A', 'A', 'A', 'A', 'A', 'B', 'C'], policy: 'left', mode: 'findSchedule', thinkTicks: { A: 0, B: 0, C: 0 }, eatTicks: { A: 1, B: 1, C: 1 }, goalMeals: { A: 1 } };
    const { instance, execution, last } = setup('DP', input), s = dpSnapshot(instance, execution, last);
    expect(last).toBe(4);
    expect(s).toMatchObject({ stop: 'goalReached', phase: 'release', turn: 4 });
    expect(s.turns.map(t => t.status)).toEqual(['done', 'done', 'done', 'done', 'current', 'pending', 'pending']);
    expect(s.philosophers[0]).toMatchObject({ meals: 1, goal: 1, forks: [] });
  });
  it('explains an admission wait when the fork itself is free', () => {
    const input = { actors: ['A', 'B', 'C'], order: ['A', 'B', 'C', 'A', 'B', 'C'], policy: 'admission', mode: 'fixedSchedule', thinkTicks: { A: 0, B: 0, C: 0 }, eatTicks: { A: 1, B: 1, C: 1 }, goalMeals: {} };
    const { instance, execution, last } = setup('DP', input), s = dpSnapshot(instance, execution, last);
    expect(s.philosophers[2]).toMatchObject({ state: 'waiting', wants: 2, forks: [] });
    expect(s.forks[2].owner).toBeNull();
    expect(s.summary).toContain('인원이 차서');
  });
});

describe('DS draws the head path so far and the travelled distance', () => {
  it('starts at the start cylinder', () => {
    const { instance } = setup('DS');
    expect(diskSnapshot(instance, null, -1)).toMatchObject({ phase: 'initial', head: 53, distance: 0, path: [{ position: 53, service: null, wrap: false }], served: [] });
  });
  it('matches the engine order and distance for every policy', () => {
    for (const policy of ['FCFS', 'SSTF', 'SCAN', 'CSCAN']) {
      const { instance, execution, last } = setup('DS', { policy }), s = diskSnapshot(instance, execution, last);
      expect(s.served).toEqual(execution.result.services);
      expect(s.distance).toBe(execution.result.distance);
      expect(s.finished).toBe(true);
      expect(s.path.slice(1).map(p => p.position)).toEqual((execution.result.moves as { to: number }[]).map(m => m.to));
    }
  });
  it('marks the far end, the C-SCAN wrap and the current request', () => {
    const scan = setup('DS', { policy: 'SCAN' }), end = scan.execution.events.findIndex(e => e.kind === 'move' && e.data.to === 199);
    expect(diskSnapshot(scan.instance, scan.execution, end)).toMatchObject({ phase: 'move', head: 199 });
    expect(diskSnapshot(scan.instance, scan.execution, end).summary).toContain('끝');
    const c = setup('DS', { policy: 'CSCAN' }), w = c.index('wrap'), s = diskSnapshot(c.instance, c.execution, w);
    expect(s.path.at(-1)).toEqual({ position: 0, service: null, wrap: true });
    expect(s.summary).toContain('되돌아갔습니다');
    const at = diskSnapshot(c.instance, c.execution, c.index('service', 1));
    expect(at.requests.filter(r => r.current).map(r => r.id)).toEqual([at.served.at(-1)]);
  });
  it('serves a request at the head without an extra path stop', () => {
    const { instance, execution } = setup('DS', { policy: 'FCFS', requests: [{ id: 'a', position: 53 }, { id: 'b', position: 60 }] });
    expect(diskSnapshot(instance, execution, 0).path).toEqual([{ position: 53, service: 'a', wrap: false }]);
  });
});

describe('rule visuals render prefixes and refuse tampered traces', () => {
  it('renders every cursor with an explanation free of names and numbers', () => {
    for (const model of ['MF', 'S3', 'DP', 'DS'] as Model[]) {
      const { instance, execution, last } = setup(model);
      for (let c = -1; c <= last; c++) {
        const html = renderToStaticMarkup(createElement(visuals[model], { instance, execution, cursor: c, view: instance.views[0] }));
        expect(html).not.toContain('data-rule-invalid');
        const summary = snapshots[model](instance, execution, c).summary;
        expect(summary).not.toMatch(/[0-9]/);
        for (const id of ['P1', 'P2', 'R1', 'A', 'B', 'a', 'g']) expect(summary.split(/[\s(),.]/)).not.toContain(id);
        expect(renderToStaticMarkup(createElement(explanations[model], { instance, execution, cursor: c }))).toContain(summary);
      }
    }
  });
  it('shows the safe notice for edited events, longer traces and other models', () => {
    const cases: [Model, (d: Record<string, unknown>) => void][] = [
      ['MF', d => { (d.blocks as { size: number }[])[0].size += 1; }],
      ['S3', d => { (d.available as number[])[0] = 9; }],
      ['DP', d => { (d.owners as (string | null)[])[0] = 'B'; }],
      ['DS', d => { d.distance = 1; }],
    ];
    for (const [model, change] of cases) {
      const { instance, execution, last } = setup(model), bad = tamper(execution, last, change);
      expect(() => snapshots[model](instance, bad, last)).toThrow();
      expect(renderToStaticMarkup(createElement(visuals[model], { instance, execution: bad, cursor: last, view: instance.views[0] }))).toContain('data-rule-invalid');
      const longer = structuredClone(execution); longer.events.push(structuredClone(longer.events[last]));
      expect(() => snapshots[model](instance, longer, last + 1)).toThrow();
      expect(() => snapshots[model](instance, { ...execution, id: 'G2' }, last)).toThrow();
    }
  });
  it('shows the safe notice for inputs the engine rejects', () => {
    const mf = setup('MF').instance; mf.input = { ...mf.input, operations: [{ op: 'free', id: 'Z' }] } as SimulationInstance['input'];
    expect(renderToStaticMarkup(createElement(MemoryFitVisual, { instance: mf, execution: null, cursor: -1, view: mf.views[0] }))).toContain('data-rule-invalid');
    const ds = setup('DS').instance; ds.input = { ...ds.input, start: 500 } as SimulationInstance['input'];
    expect(renderToStaticMarkup(createElement(DiskScheduleVisual, { instance: ds, execution: null, cursor: -1, view: ds.views[0] }))).toContain('data-rule-invalid');
  });
  it('keeps many elements inside bounded windows', () => {
    const operations = Array.from({ length: 40 }, (_, i) => ({ op: 'alloc', id: `M${i}`, size: 1 }));
    const mf = setup('MF', { operations }), html = renderToStaticMarkup(createElement(MemoryFitVisual, { instance: mf.instance, execution: mf.execution, cursor: 20, view: mf.instance.views[0] }));
    expect(html.match(/data-fit-op=/g)?.length).toBe(14);
    const requests = Array.from({ length: 60 }, (_, i) => ({ id: `q${i}`, position: (i * 37) % 200 }));
    const ds = setup('DS', { requests }), last = ds.execution.events.length - 1;
    const page = renderToStaticMarkup(createElement(DiskScheduleVisual, { instance: ds.instance, execution: ds.execution, cursor: last, view: ds.instance.views[0] }));
    expect(page).not.toContain('data-rule-invalid');
    expect(page.match(/<li data-status="done">/g)!.length).toBeLessThanOrEqual(12 + 16);
  });
});
