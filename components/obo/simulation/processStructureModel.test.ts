import { describe, expect, it } from 'vitest';
import { createInstance } from '../runtime/document.mjs';
import type { SimulationInstance } from '../runtime/document.mjs';
import { grade, run } from '../runtime/index.mjs';
import type { Json, ModelRun, SemanticEvent } from '../runtime/index.mjs';
import { processSnapshot } from './processStructureModel';
import type { ProcessStructureScalar, ProcessStructureSnapshot } from './processStructureModel';

const example: {
  spaces: Record<string, Record<string, ProcessStructureScalar>>;
  threads: Record<string, { process: string; registers: Record<string, ProcessStructureScalar>; stack: ProcessStructureScalar[] }>;
  operations: Record<string, Json>[];
} = {
  spaces: { P: { x: 0, flag: true, nullable: 'old' }, Q: { x: 0 } },
  threads: {
    T1: { process: 'P', registers: { r: 0 }, stack: [0, false, null] },
    T2: { process: 'P', registers: { r: 9 }, stack: [] },
    T3: { process: 'Q', registers: { r: 0 }, stack: [] },
  },
  operations: [
    { op: 'write', thread: 'T1', scope: 'shared', key: 'x', value: 1 },
    { op: 'read', thread: 'T2', scope: 'shared', key: 'x' },
    { op: 'read', thread: 'T3', scope: 'shared', key: 'x' },
    { op: 'write', thread: 'T1', scope: 'private', key: 'r', value: 5 },
    { op: 'read', thread: 'T2', scope: 'private', key: 'r' },
    { op: 'read', thread: 'T1', scope: 'private', key: 'r' },
    { op: 'write', thread: 'T2', scope: 'shared', key: 'flag', value: false },
    { op: 'read', thread: 'T1', scope: 'shared', key: 'flag' },
    { op: 'write', thread: 'T1', scope: 'shared', key: 'nullable', value: null },
    { op: 'read', thread: 'T2', scope: 'shared', key: 'nullable' },
    { op: 'write', thread: 'T1', scope: 'shared', key: 'x', value: 0 },
    { op: 'read', thread: 'T2', scope: 'shared', key: 'x' },
    { op: 'write', thread: 'T2', scope: 'private', key: 'r', value: 9 },
    { op: 'read', thread: 'T2', scope: 'private', key: 'r', value: 777 },
  ],
};
function instance(input: SimulationInstance['input'] = example): SimulationInstance {
  return { ...createInstance('PT'), input: structuredClone(input) };
}
const shared = (s: ProcessStructureSnapshot, process: string, key: string) =>
  s.processes.find(item => item.id === process)?.shared.find(cell => cell.key === key)?.value;
const register = (s: ProcessStructureSnapshot, thread: string, key: string) =>
  s.threads.find(item => item.id === thread)?.registers.find(cell => cell.key === key)?.value;
function freeze(value: unknown): void {
  if (value !== null && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
}

describe('process structure visual state from the selected trace prefix', () => {
  it('keeps the authored initial structure without selecting future work or exposing reads', () => {
    const i = instance(), execution = run('PT', i.input), s = processSnapshot(i, execution, -1);
    expect(s).toMatchObject({ current: null, event: null, reads: [] });
    expect(s.processes.map(process => [process.id, process.threads.map(thread => thread.id)])).toEqual([['P', ['T1', 'T2']], ['Q', ['T3']]]);
    expect(shared(s, 'P', 'x')).toBe(0);
    expect(register(s, 'T1', 'r')).toBe(0);
    expect(s).toEqual(processSnapshot(i, null, -1));
  });

  it('shares one process cell across its threads while keeping another process independent', () => {
    const i = instance(), execution = run('PT', i.input);
    const written = processSnapshot(i, execution, 0);
    expect(written.current).toMatchObject({ actor: 'T1', process: 'P', scope: 'shared', kind: 'write', key: 'x', cellKey: 'shared:P:x', before: 0, value: 1, changed: true });
    expect(shared(written, 'P', 'x')).toBe(1);
    expect(shared(written, 'Q', 'x')).toBe(0);
    expect(written.processes.find(process => process.id === 'P')?.shared.filter(cell => cell.key === 'x')).toHaveLength(1);
    expect(processSnapshot(i, execution, 1).current).toMatchObject({ actor: 'T2', process: 'P', before: 1, value: 1, changed: false, kind: 'read', cellKey: 'shared:P:x' });
    expect(processSnapshot(i, execution, 2).current).toMatchObject({ actor: 'T3', process: 'Q', before: 0, value: 0, changed: false, cellKey: 'shared:Q:x' });
  });

  it('writes only the acting thread registers and keeps every stack static', () => {
    const i = instance(), execution = run('PT', i.input), s = processSnapshot(i, execution, 3);
    expect(s.current).toMatchObject({ actor: 'T1', kind: 'write', scope: 'private', cellKey: 'register:T1:r', before: 0, value: 5, changed: true });
    expect(register(s, 'T1', 'r')).toBe(5);
    expect(register(s, 'T2', 'r')).toBe(9);
    expect(shared(s, 'P', 'x')).toBe(1);
    for (let cursor = -1; cursor < execution.events.length; cursor++) {
      expect(processSnapshot(i, execution, cursor).threads.map(thread => thread.stack)).toEqual([[0, false, null], [], []]);
    }
    expect(processSnapshot(i, execution, 4).current).toMatchObject({ actor: 'T2', value: 9, changed: false });
  });

  it('distinguishes read, changed write and same-value write, and ignores the optional read input value', () => {
    const i = instance(), execution = run('PT', i.input);
    const same = processSnapshot(i, execution, 12);
    expect(same.current).toMatchObject({ actor: 'T2', kind: 'write', scope: 'private', before: 9, value: 9, changed: false });
    expect(same.summary).toContain('쓰기');
    expect(same.summary).toContain('이전 값과 같습니다');
    const read = processSnapshot(i, execution, 13);
    expect(read.current).toMatchObject({ kind: 'read', before: 9, value: 9, changed: false });
    expect(read.reads).toEqual([1, 0, 9, 5, false, null, 0, 9]);
    expect(read.summary).toContain('읽기');
    expect(read.summary).not.toContain('777');
    expect(grade('PT', i.input, 'process', JSON.stringify({ v: 1, result: execution.result, events: execution.events })).correct).toBe(true);
  });

  it('uses the immediately preceding value and restores earlier state independently of navigation order', () => {
    const i = instance(), execution = run('PT', i.input);
    Object.defineProperty(execution, 'result', { get: () => { throw new Error('Do not read final result'); } });
    const before = processSnapshot(i, execution, 0), later = processSnapshot(i, execution, 10);
    expect(later.current).toMatchObject({ before: 1, value: 0, changed: true });
    expect(later.reads).toEqual([1, 0, 9, 5, false, null]);
    expect(processSnapshot(i, execution, 0)).toEqual(before);
    expect(processSnapshot(i, execution, 1).current?.changed).toBe(false);
    expect(processSnapshot(i, execution, -1)).toMatchObject({ current: null, reads: [] });
  });

  it('retains scalar types and values including false, null, zero, empty text and similarly spelled strings', () => {
    const values: ProcessStructureScalar[] = [0, false, null, '', '0', 'false', 'null'];
    const i = instance({ spaces: { P: { x: 'initial' } }, threads: { T: { process: 'P', registers: {}, stack: values } },
      operations: values.flatMap((value): Record<string, Json>[] => [
        { op: 'write', thread: 'T', scope: 'shared', key: 'x', value },
        { op: 'read', thread: 'T', scope: 'shared', key: 'x' },
      ]),
    });
    const execution = run('PT', i.input);
    values.forEach((value, index) => {
      const write = processSnapshot(i, execution, index * 2), read = processSnapshot(i, execution, index * 2 + 1);
      expect(write.current).toMatchObject({ value, before: index === 0 ? 'initial' : values[index - 1], changed: true });
      expect(shared(write, 'P', 'x')).toBe(value);
      expect(read.current).toMatchObject({ value, before: value, changed: false });
      expect(read.reads).toEqual(values.slice(0, index + 1));
      expect(read.threads[0].stack).toEqual(values);
    });
    expect(processSnapshot(i, execution, 6).summary).toContain('""');
    expect(processSnapshot(i, execution, 12).summary).toContain('"null"');
  });

  it('namespaces identical process, thread and field IDs without altering labels or hiding unselected data', () => {
    const i = instance({ spaces: { same: { same: 1 } }, threads: { same: { process: 'same', registers: { same: 2 }, stack: [3] } }, operations: [{ op: 'read', thread: 'same', scope: 'private', key: 'same' }] });
    i.labels.same = '표시 이름';
    i.views[0] = { ...i.views[0], target: 'same', fields: ['표시 이름'], hidden: true, when: { kind: 'write', actor: 'same' } };
    const s = processSnapshot(i, run('PT', i.input), 0), process = s.processes[0], thread = s.threads[0];
    expect([process.nodeKey, thread.nodeKey, process.shared[0].nodeKey, thread.registers[0].nodeKey]).toEqual(['process:same', 'thread:same', 'shared:same:same', 'register:same:same']);
    expect(process.shared[0]).toMatchObject({ key: 'same', value: 1 });
    expect(thread.registers[0]).toMatchObject({ key: 'same', value: 2 });
    expect(process.label).toBe('표시 이름');
    expect(s.current).toMatchObject({ actor: 'same', actorLabel: '표시 이름', process: 'same', processLabel: '표시 이름', cellKey: 'register:same:same' });
    expect(thread.stack).toEqual([3]);
  });

  it('accepts empty spaces/registers/stacks, unused processes and an empty operation list', () => {
    const i = instance({ spaces: { P: {}, Unused: {} }, threads: { T: { process: 'P', registers: {}, stack: [] } }, operations: [] });
    const execution = run('PT', i.input), s = processSnapshot(i, execution, -1);
    expect(execution.events).toEqual([]);
    expect(s).toMatchObject({ current: null, event: null, reads: [] });
    expect(s.processes).toMatchObject([{ id: 'P', shared: [], threads: [{ id: 'T', registers: [], stack: [] }] }, { id: 'Unused', shared: [], threads: [] }]);
    expect(processSnapshot(i, execution, 0)).toEqual(s);
    expect(() => processSnapshot(instance({ spaces: {}, threads: {}, operations: [] }), null, -1)).toThrow('스레드가 필요합니다');
  });

  it('preserves all 256 processes/threads/cells/stack entries and full long labels and safe integers', () => {
    const names = Array.from({ length: 256 }, (_, n) => `k${n}`);
    const spaces = Object.fromEntries(names.map((_, n) => [`P${n}`, n === 0 ? Object.fromEntries(names.map(key => [key, Number.MAX_SAFE_INTEGER])) : {}]));
    const stack = names.map((_, n) => n === 255 ? '긴 값'.repeat(85) : n);
    const threads = Object.fromEntries(names.map((_, n) => [`T${n}`, { process: `P${n}`, registers: n === 0 ? Object.fromEntries(names.map(key => [key, -Number.MAX_SAFE_INTEGER])) : {}, stack: n === 0 ? stack : [] }]));
    const i = instance({ spaces, threads, operations: [
      { op: 'write', thread: 'T0', scope: 'private', key: 'k255', value: Number.MAX_SAFE_INTEGER },
      { op: 'read', thread: 'T0', scope: 'shared', key: 'k255' },
    ] });
    i.labels.T0 = '긴 표시 이름 '.repeat(30);
    const s = processSnapshot(i, run('PT', i.input), 1);
    expect(s.processes).toHaveLength(256);
    expect(s.threads).toHaveLength(256);
    expect(s.processes[0].shared).toHaveLength(256);
    expect(s.threads[0].registers).toHaveLength(256);
    expect(s.threads[0].stack).toEqual(stack);
    expect(s.threads[0].label).toBe(i.labels.T0);
    expect(register(s, 'T0', 'k254')).toBe(-Number.MAX_SAFE_INTEGER);
    expect(register(s, 'T0', 'k255')).toBe(Number.MAX_SAFE_INTEGER);
    expect(s.current?.cellKey).toBe('shared:P0:k255');
    expect(s.reads).toEqual([Number.MAX_SAFE_INTEGER]);
  });

  it('keeps input/trace immutable and detaches returned cells, stacks and the current event', () => {
    const i = instance(), execution = run('PT', i.input), before = JSON.stringify({ i, execution });
    freeze(i); freeze(execution);
    const s = processSnapshot(i, execution, 3);
    s.processes[0].shared[0].value = 'different';
    s.threads[0].registers[0].value = 'different';
    s.threads[0].stack.push('different');
    s.current!.value = 'different';
    s.event!.data.value = 'different';
    s.reads.push('different');
    expect(JSON.stringify({ i, execution })).toBe(before);
    expect(register(processSnapshot(i, execution, 3), 'T1', 'r')).toBe(5);
  });

  it('rejects malformed drafts without extending operations to stacks or creating absent keys', () => {
    const badProcess = structuredClone(example); badProcess.threads.T1.process = 'missing';
    expect(() => processSnapshot(instance(badProcess), null, -1)).toThrow('주소 공간');
    const badThread = structuredClone(example); badThread.operations[0].thread = 'missing';
    expect(() => processSnapshot(instance(badThread), null, -1)).toThrow('스레드');
    const badKey = structuredClone(example); badKey.operations[0].key = 'newKey';
    expect(() => processSnapshot(instance(badKey), null, -1)).toThrow('필드');
    const noValue = { ...structuredClone(example), operations: [{ op: 'write', thread: 'T1', scope: 'shared', key: 'x' }] };
    expect(() => processSnapshot(instance(noValue), null, -1)).toThrow('쓸 값');
    const stackAccess = { ...structuredClone(example), operations: [{ op: 'read', thread: 'T1', scope: 'stack', key: 'x' }] };
    expect(() => run('PT', stackAccess)).toThrow();
    expect(() => processSnapshot(instance(stackAccess), null, -1)).toThrow();
    expect(() => processSnapshot(instance({}), null, -1)).toThrow();
    expect(() => processSnapshot(instance(), null, 0.5)).toThrow('위치');
    expect(() => processSnapshot({ ...instance(), scenarioId: 'IN' }, null, -1)).toThrow('모델');
  });

  it('rejects stale prefix identities/values and does not inspect a future event or final result', () => {
    const i = instance(), execution = run('PT', i.input);
    const stale = (change: (trace: ModelRun) => void, cursor: number) => {
      const trace = structuredClone(execution); change(trace);
      expect(() => processSnapshot(i, trace, cursor)).toThrow();
    };
    stale(trace => { trace.events[0].data.index = 1; }, 0);
    stale(trace => { trace.events[0].actor = 'T2'; }, 0);
    stale(trace => { trace.events[0].data.scope = 'private'; }, 0);
    stale(trace => { trace.events[0].data.value = 9; }, 0);
    stale(trace => { trace.events[1].data.value = 0; }, 1);
    stale(trace => { trace.events[1].step = 7; }, 1);
    const expected = processSnapshot(i, execution, 0);
    Object.defineProperty(execution, 'result', { get: () => { throw new Error('Future result'); } });
    execution.events[1] = { get data() { throw new Error('Future event'); } } as unknown as SemanticEvent;
    expect(processSnapshot(i, execution, 0)).toEqual(expected);
  });
});
