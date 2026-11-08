import { describe, expect, it } from 'vitest';
import { createInstance } from '../runtime/document.mjs';
import type { SimulationInstance } from '../runtime/document.mjs';
import { grade, run } from '../runtime/index.mjs';
import type { Json, ModelRun, SemanticEvent } from '../runtime/index.mjs';
import { ipcSnapshot } from './ipcModel';
import type { IpcOperation, IpcScalar } from './ipcModel';

const op = (actor: string, operation: IpcOperation, extra: Record<string, Json> = {}): Record<string, Json> => ({ actor, op: operation, ...extra });
const example = { actors: ['P', 'Q'], mode: 'pipe', capacity: 1, initial: [], shared: { retained: false },
  operations: [op('Q', 'receive'), op('P', 'send', { value: null }), op('Q', 'receive')] };
function instance(input: SimulationInstance['input'] = example): SimulationInstance {
  return { ...createInstance('IPC'), input: structuredClone(input) };
}
function freeze(value: unknown): void {
  if (value !== null && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
}

describe('IPC display follows actual operations in the observed prefix', () => {
  it('starts with no transfer or reads and preserves inactive shared values and vacant slots', () => {
    const i = instance(), s = ipcSnapshot(i, run('IPC', i.input), -1);
    expect(s).toMatchObject({ mode: 'pipe', phase: 'initial', capacity: 1, channel: [], reads: [], current: null, transfer: null, event: null });
    expect(s.slots).toEqual([{ index: 0, nodeKey: 'channel:0', occupied: false, value: null }]);
    expect(s.shared).toEqual([{ key: 'retained', nodeKey: 'shared:retained', value: false }]);
    expect(s.actors.map(actor => [actor.id, actor.active, actor.blocked, actor.waitOperation])).toEqual([['P', false, false, null], ['Q', false, false, null]]);
    expect(s).toEqual(ipcSnapshot(i, null, -1));
    expect(Object.hasOwn(s, 'stopReason')).toBe(false);
  });

  it('keeps another actor waiting after send and distinguishes successful null from a blocked null observation', () => {
    const i = instance(), execution = run('IPC', i.input), blocked = ipcSnapshot(i, execution, 0);
    expect(blocked).toMatchObject({ phase: 'block', current: { index: 0, op: 'receive', blocked: true, valuePresent: false, value: null, changed: false }, transfer: null, reads: [] });
    expect(blocked.actors[1]).toMatchObject({ blocked: true, waitOperation: 'receive' });
    const sent = ipcSnapshot(i, execution, 1);
    expect(sent).toMatchObject({ phase: 'send', channel: [null], current: { op: 'send', valuePresent: true, value: null, attemptedValuePresent: true, attemptedValue: null },
      transfer: { from: 'actor:P', to: 'channel:0', kind: 'send', payload: null, slotIndex: 0, cellKey: null } });
    expect(sent.slots[0].occupied).toBe(true);
    expect(sent.actors[1]).toMatchObject({ blocked: true, waitOperation: 'receive', active: false });
    const received = ipcSnapshot(i, execution, 2);
    expect(received).toMatchObject({ phase: 'resume', channel: [], current: { index: 2, op: 'receive', blocked: false, valuePresent: true, value: null },
      transfer: { from: 'channel:0', to: 'actor:Q', kind: 'receive', payload: null } });
    expect(received.reads).toEqual([{ index: 2, actor: 'Q', actorLabel: 'Q', op: 'receive', key: null, value: null }]);
    expect(received.actors[1]).toMatchObject({ blocked: false, waitOperation: null });
  });

  it('uses the current operation on resume rather than retrying the previous blocked operation', () => {
    const i = instance({ ...example, actors: ['Same'], operations: [op('Same', 'receive'), op('Same', 'send', { value: 7 }), op('Same', 'receive')] });
    const execution = run('IPC', i.input), s = ipcSnapshot(i, execution, 1);
    expect(s).toMatchObject({ phase: 'resume', channel: [7], reads: [], current: { index: 1, actor: 'Same', op: 'send', changed: true },
      transfer: { from: 'actor:Same', to: 'channel:0', kind: 'send', payload: 7 } });
    expect(s.summary).toContain('이번 송신');
    expect(ipcSnapshot(i, execution, 2)).toMatchObject({ phase: 'receive', reads: [{ index: 2, value: 7 }] });
  });

  it('does not enqueue a failed send payload and resumes with the newly specified value', () => {
    const i = instance({ ...example, mode: 'message', initial: ['seed'], operations: [op('P', 'send', { value: 999 }), op('Q', 'receive'), op('P', 'send', { value: 42 }), op('Q', 'receive')] });
    const execution = run('IPC', i.input), blocked = ipcSnapshot(i, execution, 0);
    expect(blocked).toMatchObject({ channel: ['seed'], phase: 'block', transfer: null,
      current: { valuePresent: false, value: null, attemptedValuePresent: true, attemptedValue: 999 } });
    expect(ipcSnapshot(i, execution, 1).actors[0].blocked).toBe(true);
    const resumed = ipcSnapshot(i, execution, 2);
    expect(resumed).toMatchObject({ phase: 'resume', channel: [42], current: { op: 'send' }, transfer: { payload: 42, kind: 'send' } });
    expect(ipcSnapshot(i, execution, 3).reads.map(read => read.value)).toEqual(['seed', 42]);
  });

  it('preserves typed FIFO values and ignores receive value and channel key inputs unused by the engine', () => {
    const values: IpcScalar[] = [null, false, '', 0];
    const i = instance({ ...example, capacity: 4, initial: values,
      operations: values.map(() => op('P', 'receive', { value: 999, key: 'unused' })) });
    const execution = run('IPC', i.input);
    values.forEach((value, index) => {
      const s = ipcSnapshot(i, execution, index);
      expect(s.current).toMatchObject({ index, valuePresent: true, value, key: null, attemptedValuePresent: false, attemptedValue: null, beforeExists: false, before: null });
      expect(s.transfer?.payload).toBe(value);
      expect(s.channel).toEqual(values.slice(index + 1));
      expect(s.reads.map(read => read.value)).toEqual(values.slice(0, index + 1));
    });
  });

  it('uses the same FIFO computation for pipe and message and retains the original process contract', () => {
    const pipe = instance(), message = instance({ ...example, mode: 'message' });
    const a = run('IPC', pipe.input), b = run('IPC', message.input);
    expect(a.events).toEqual(b.events); expect(a.result).toEqual(b.result);
    expect({ ...ipcSnapshot(pipe, a, 2), mode: 'message' }).toEqual(ipcSnapshot(message, b, 2));
    expect(grade('IPC', pipe.input, 'process', JSON.stringify({ v: 1, result: a.result, events: a.events })).correct).toBe(true);
  });

  it('reads shared values without changing them and ignores irrelevant read payloads', () => {
    const i = instance({ actors: ['P'], mode: 'shared', capacity: 2, initial: [99], shared: { flag: false, nullable: null, '0raw': '' },
      operations: [op('P', 'read', { key: 'flag', value: 777 }), op('P', 'read', { key: 'nullable', value: 888 })] });
    const execution = run('IPC', i.input), first = ipcSnapshot(i, execution, 0), second = ipcSnapshot(i, execution, 1);
    expect(first).toMatchObject({ channel: [99], current: { op: 'read', key: 'flag', value: false, valuePresent: true, beforeExists: true, before: false, changed: false, attemptedValuePresent: false },
      transfer: { from: 'shared:flag', to: 'actor:P', kind: 'read', payload: false, cellKey: 'flag', slotIndex: null } });
    expect(first.slots[0]).toMatchObject({ occupied: true, value: 99 });
    expect(second.current).toMatchObject({ valuePresent: true, value: null, beforeExists: true, before: null, changed: false });
    expect(second.shared).toEqual(first.shared);
    expect(second.shared.find(cell => cell.key === '0raw')?.value).toBe('');
    expect(second.reads.map(read => read.value)).toEqual([false, null]);
  });

  it('distinguishes same-value writes, real value changes and new null keys from an existing null key', () => {
    const i = instance({ actors: ['P'], mode: 'shared', capacity: 1, initial: ['retained'], shared: { flag: false }, operations: [
      op('P', 'write', { key: 'flag', value: false }), op('P', 'write', { key: 'flag', value: 0 }),
      op('P', 'write', { key: 'added', value: null }), op('P', 'write', { key: 'added', value: null }),
    ] });
    const execution = run('IPC', i.input), same = ipcSnapshot(i, execution, 0), changed = ipcSnapshot(i, execution, 1);
    expect(same.current).toMatchObject({ op: 'write', beforeExists: true, before: false, value: false, changed: false });
    expect(same.transfer).toMatchObject({ from: 'actor:P', to: 'shared:flag', kind: 'write', payload: false });
    expect(changed.current).toMatchObject({ beforeExists: true, before: false, value: 0, changed: true });
    expect(ipcSnapshot(i, execution, 2).current).toMatchObject({ key: 'added', beforeExists: false, before: null, value: null, changed: true });
    const repeat = ipcSnapshot(i, execution, 3);
    expect(repeat.current).toMatchObject({ beforeExists: true, before: null, value: null, changed: false });
    expect(repeat.channel).toEqual(['retained']); expect(repeat.reads).toEqual([]);
  });

  it('uses own labels and separate actor, shared-key and channel namespaces without replacing raw scalar data', () => {
    const i = instance({ actors: ['same', 'toString'], mode: 'shared', capacity: 1, initial: ['same'], shared: { same: 'same' },
      operations: [op('same', 'read', { key: 'same' })] });
    i.labels.same = '화면 이름'; i.views[0] = { ...i.views[0], hidden: true, target: 'same', fields: ['없는 표시'] };
    const s = ipcSnapshot(i, run('IPC', i.input), 0);
    expect(s.actors.map(actor => [actor.nodeKey, actor.label])).toEqual([['actor:same', '화면 이름'], ['actor:toString', 'toString']]);
    expect(s.channel).toEqual(['same']); expect(s.shared).toEqual([{ key: 'same', nodeKey: 'shared:same', value: 'same' }]);
    expect(s.current).toMatchObject({ actorLabel: '화면 이름', key: 'same', value: 'same' });
    expect(s.transfer).toMatchObject({ from: 'shared:same', to: 'actor:same', payload: 'same' });
  });

  it('supports empty operations and multiple outstanding waits without inventing completion or deadlock', () => {
    for (const mode of ['pipe', 'shared']) {
      const i = instance({ ...example, mode, operations: [] }), execution = run('IPC', i.input);
      expect(ipcSnapshot(i, execution, 0)).toMatchObject({ phase: 'initial', current: null, transfer: null, reads: [] });
      expect(grade('IPC', i.input, 'result', JSON.stringify({ v: 1, result: execution.result })).correct).toBe(true);
      expect(grade('IPC', i.input, 'process', JSON.stringify({ v: 1, result: execution.result, events: [] })).correct).toBe(false);
    }
    const i = instance({ ...example, operations: [op('P', 'receive'), op('Q', 'receive')] });
    const s = ipcSnapshot(i, run('IPC', i.input), 1);
    expect(s.actors.every(actor => actor.blocked && actor.waitOperation === 'receive')).toBe(true);
    expect(s).toMatchObject({ phase: 'block', transfer: null, reads: [] });
    expect(Object.hasOwn(s, 'stopReason')).toBe(false); expect(s.summary).not.toContain('교착');
  });

  it('keeps all 100 actors, 256 slots and 256 shared entries, long values and integer extremes', () => {
    const values: IpcScalar[] = Array.from({ length: 256 }, (_, n) => n === 0 ? -Number.MAX_SAFE_INTEGER : n === 255 ? 'x'.repeat(256) : n);
    const shared = Object.fromEntries(Array.from({ length: 256 }, (_, n) => [`key${n}`, n === 255 ? Number.MAX_SAFE_INTEGER : n]));
    const i = instance({ actors: Array.from({ length: 100 }, (_, n) => `A${n}`), mode: 'pipe', capacity: 256, initial: values, shared, operations: [op('A99', 'receive')] });
    const s = ipcSnapshot(i, run('IPC', i.input), 0);
    expect(s.actors).toHaveLength(100); expect(s.slots).toHaveLength(256); expect(s.shared).toHaveLength(256);
    expect(s.current?.value).toBe(-Number.MAX_SAFE_INTEGER); expect(s.channel.at(-1)).toBe('x'.repeat(256));
    expect(s.shared.at(-1)?.value).toBe(Number.MAX_SAFE_INTEGER); expect(s.actors[99].active).toBe(true);
  });

  it('preserves all 10000 reads with the supported larger recording budget and retains the default byte-limit error', () => {
    const i = instance({ actors: ['P'], mode: 'shared', capacity: 1, initial: [], shared: { x: null },
      operations: Array.from({ length: 10000 }, () => op('P', 'read', { key: 'x' })) });
    expect(() => run('IPC', i.input)).toThrow();
    // This fixture exercises the count limit without pretending the default 1MiB budget accepts it.
    const execution = run('IPC', i.input, { maxBytes: 4 * 1048576 });
    const s = ipcSnapshot(i, execution, 9999);
    expect(s.reads).toHaveLength(10000); expect(s.reads[9999]).toMatchObject({ index: 9999, op: 'read', key: 'x', value: null });
    expect(s.shared).toEqual([{ key: 'x', nodeKey: 'shared:x', value: null }]);
  // Recording 10000 snapshots shares CPU with the full suite on the authoring machine.
  }, 45000);

  it('reconstructs earlier cursors without inspecting future events or final reads and blocked sets', () => {
    const i = instance(), execution = run('IPC', i.input), earlier = ipcSnapshot(i, execution, 1);
    Object.defineProperty(execution, 'result', { get: () => { throw new Error('No final state lookahead'); } });
    expect(ipcSnapshot(i, execution, 2).reads).toHaveLength(1);
    expect(ipcSnapshot(i, execution, 1)).toEqual(earlier);
    execution.events[2] = { get data() { throw new Error('No future event'); } } as unknown as SemanticEvent;
    expect(ipcSnapshot(i, execution, 1)).toEqual(earlier);
    expect(ipcSnapshot(i, execution, -1)).toMatchObject({ reads: [], channel: [], current: null });
  });

  it('rejects malformed drafts and stale observed events rather than guessing operation, payload or state', () => {
    const invalid = [
      { ...example, actors: ['P', 'P'] }, { ...example, capacity: 0 }, { ...example, initial: [1, 2] },
      { ...example, operations: [op('missing', 'send', { value: 1 })] }, { ...example, operations: [op('P', 'send')] },
      { ...example, operations: [op('P', 'read', { key: 'retained' })] },
      { ...example, mode: 'shared', operations: [op('P', 'read')] }, { ...example, mode: 'shared', operations: [op('P', 'write', { key: 'x' })] },
    ];
    for (const input of invalid) expect(() => ipcSnapshot(instance(input), null, -1)).toThrow();
    const i = instance(), execution = run('IPC', i.input);
    const altered = (change: (r: ModelRun) => void) => { const r = structuredClone(execution); change(r); return r; };
    const traces = [
      altered(r => { r.events[0].data.index = 1; }), altered(r => { r.events[0].actor = 'P'; }),
      altered(r => { r.events[0].kind = 'receive'; }), altered(r => { r.events[0].data.blocked = false; }),
      altered(r => { r.events[0].data.value = false; }), altered(r => { r.events[0].data.channel = [null]; }),
      altered(r => { r.events[0].data.shared = {}; }), altered(r => { r.events[0].step = 2; }),
    ];
    for (const trace of traces) expect(() => ipcSnapshot(i, trace, 0)).toThrow();
    const read = instance({ ...example, mode: 'shared', shared: { x: null }, operations: [op('P', 'read', { key: 'x' })] });
    const readTrace = run('IPC', read.input); read.input.shared = {};
    expect(() => ipcSnapshot(read, readTrace, 0)).toThrow();
    expect(() => ipcSnapshot({ ...i, scenarioId: 'PC' }, null, -1)).toThrow();
    expect(() => ipcSnapshot(i, { ...execution, id: 'PC' }, -1)).toThrow();
    expect(() => ipcSnapshot(i, execution, NaN)).toThrow();
  });

  it('does not mutate frozen source data and keeps summaries free of hidden identities, keys and values', () => {
    const i = instance({ actors: ['HiddenActor'], mode: 'shared', capacity: 1, initial: ['SecretPayload'], shared: { SecretKey: 'SecretValue' }, operations: [op('HiddenActor', 'read', { key: 'SecretKey' })] });
    i.labels.HiddenActor = '감춰진 이름'; const execution = run('IPC', i.input), before = JSON.stringify({ i, execution });
    freeze(i); freeze(execution);
    const s = ipcSnapshot(i, execution, 0);
    expect(s.summary).not.toMatch(/HiddenActor|SecretKey|SecretValue|SecretPayload|감춰진 이름/);
    s.channel[0] = false; s.slots[0].value = null; s.shared[0].value = 99; s.reads[0].value = 'changed'; s.actors[0].blocked = true;
    if (s.event) s.event.data.shared = {};
    expect(JSON.stringify({ i, execution })).toBe(before);
    expect(ipcSnapshot(i, execution, 0).reads[0].value).toBe('SecretValue');
  });
});
