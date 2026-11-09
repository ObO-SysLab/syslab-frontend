import { describe, expect, it } from 'vitest';
import { PROCESS_THREADS } from '../examples/remaining';
import { applyFrame } from '../lib/applyFrame';
import { processChanges, type ProcessData, type Thread } from './model';

const template = PROCESS_THREADS.template;
const scene = (index: number, id = 'p1'): ProcessData =>
  applyFrame(template.defaultNodes, template.defaultFrames ?? [], index).find(node => node.id === id)!.data;
const thread = (id: string, overrides: Partial<Thread> = {}): Thread =>
  ({ id, label: id, pc: 'read', register: '0', stack: 'local 0', ...overrides });

describe('PT value changes between logical scenes', () => {
  it('highlights only the values changed by T1 in the second scene', () => {
    const changes = processChanges(scene(0), scene(1));
    expect(changes.sections).toEqual(new Set([1]));
    expect(changes.threads).toEqual({ t1: new Set(['pc', 'register', 'stack']) });
    expect(processChanges(scene(0, 'p2'), scene(1, 'p2')).sections.size).toBe(0);
    expect(Object.keys(processChanges(scene(0, 'p2'), scene(1, 'p2')).threads)).toEqual([]);
  });

  it('does not highlight unchanged T2 stack or the carried shared value in the third scene', () => {
    const changes = processChanges(scene(1), scene(2));
    expect(changes.sections.size).toBe(0);
    expect(changes.threads).toEqual({ t2: new Set(['pc', 'register']) });
  });

  it('uses the supplied logical predecessor after jumping forward or moving back', () => {
    const expected = processChanges(scene(0), scene(1));
    processChanges(scene(3), scene(4));
    processChanges(scene(1), scene(2));
    expect(processChanges(scene(0), scene(1))).toEqual(expected);
    expect(processChanges(scene(2), scene(3)).sections.size).toBe(0);
    expect(Object.keys(processChanges(scene(2), scene(3)).threads)).toEqual([]);
  });

  it('does not mark an initial scene or newly introduced items as changes', () => {
    expect(processChanges(undefined, scene(1)).sections.size).toBe(0);
    expect(Object.keys(processChanges(undefined, scene(1)).threads)).toEqual([]);
    const before: ProcessData = { sections: [{ name: 'data' }], threads: [thread('t1')] };
    const after: ProcessData = {
      sections: [{ name: 'data', value: '1' }, { name: 'heap', value: 'object' }],
      threads: [thread('t1'), thread('t2', { register: '5' })],
    };
    expect(processChanges(before, after).sections.size).toBe(0);
    expect(Object.keys(processChanges(before, after).threads)).toEqual([]);
    expect(processChanges({}, { sections: [{ name: 'Data', value: '1' }] }).sections.size).toBe(0);
  });

  it('matches reordered sections by name and duplicate occurrence, and threads by ID', () => {
    const before: ProcessData = {
      sections: [{ name: 'data', value: 0 }, { name: 'code', value: 'main' }, { name: 'data', value: 4 }],
      threads: [thread('t1'), thread('t2', { stack: 'local 9' })],
    };
    const after: ProcessData = {
      sections: [{ name: 'code', value: 'main' }, { name: 'data', value: 0 }, { name: 'data', value: 5 }, { name: 'data', value: 8 }],
      threads: [thread('t2', { stack: 'local 9' }), thread('t1', { register: '1' })],
    };
    expect(processChanges(before, after)).toEqual({ sections: new Set([2]), threads: { t1: new Set(['register']) } });
  });

  it('keeps changes independent of visibility and leaves both documents untouched', () => {
    const before = scene(0);
    const after: ProcessData = {
      ...scene(1), hiddenSectionNames: ['데이터'], hiddenThreadIds: ['t1'], threadFields: [],
      sectionLayout: 'column', threadLayout: 'column', showSharedLinks: false, width: 500,
    };
    const serialized = JSON.stringify([before, after]);
    const changes = processChanges(before, after);
    expect(changes).toEqual(processChanges(scene(0), scene(1)));
    expect(JSON.stringify([before, after])).toBe(serialized);
    changes.sections.clear();
    changes.threads.t1.clear();
    expect(processChanges(before, after).sections).toEqual(new Set([1]));
    expect(processChanges(before, after).threads.t1.size).toBe(3);
  });
});
