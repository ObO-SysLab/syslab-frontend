import { describe, expect, it } from 'vitest';
import { createInstance } from '../runtime/document.mjs';
import type { SimulationInstance } from '../runtime/document.mjs';
import { grade, run } from '../runtime/index.mjs';
import type { ModelRun, SemanticEvent } from '../runtime/index.mjs';
import { boundedBufferSnapshot } from './boundedBufferModel';

const actors = [{ id: 'P', role: 'producer' }, { id: 'C', role: 'consumer' }];
const example = { capacity: 1, initial: [], actors, order: ['P', 'P', 'P', 'C', 'P', 'C', 'C', 'C', 'C'], policy: 'correct' };
function instance(input: SimulationInstance['input'] = example): SimulationInstance {
  return { ...createInstance('PC'), input: structuredClone(input) };
}
function freeze(value: unknown): void {
  if (value !== null && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
}

describe('bounded buffer display follows the observed engine prefix', () => {
  it('starts ready with actual occupied slots, initial permits and no invented transfer', () => {
    const i = instance(), execution = run('PC', i.input), s = boundedBufferSnapshot(i, execution, -1);
    expect(s).toMatchObject({ phase: 'initial', capacity: 1, buffer: [], semaphores: { empty: 1, full: 0, mutex: null }, current: null, transfer: null, event: null, stopReason: 'ready' });
    expect(s.slots).toEqual([{ index: 0, nodeKey: 'slot:0', occupied: false, value: null }]);
    expect(s.actors.map(a => [a.id, a.pc, a.blocked, a.active, a.nextAction, a.waitFor])).toEqual([
      ['P', 0, false, false, 'token', null], ['C', 0, false, false, 'token', null],
    ]);
    expect(s).toEqual(boundedBufferSnapshot(i, null, -1));
  });

  it('reserves an empty permit without filling a slot and acquires mutex in a separate attempt', () => {
    const i = instance(), execution = run('PC', i.input);
    const token = boundedBufferSnapshot(i, execution, 0), mutex = boundedBufferSnapshot(i, execution, 1);
    expect(token).toMatchObject({ phase: 'acquire', buffer: [], semaphores: { empty: 0, full: 0, mutex: null }, transfer: null,
      current: { actor: 'P', stage: 'token', resource: 'empty', resources: ['empty'], beforePc: 0, afterPc: 1 } });
    expect(token.slots[0].occupied).toBe(false);
    expect(mutex).toMatchObject({ phase: 'acquire', buffer: [], semaphores: { empty: 0, full: 0, mutex: 'P' }, transfer: null,
      current: { actor: 'P', stage: 'mutex', resource: 'mutex', beforePc: 1, afterPc: 2 } });
    expect(mutex.actors[0].nextAction).toBe('put');
  });

  it('puts the raw producer ID and waits for release before another actor can acquire full', () => {
    const i = instance(); i.labels.P = '생산 담당';
    const execution = run('PC', i.input), put = boundedBufferSnapshot(i, execution, 2);
    expect(put).toMatchObject({ phase: 'put', buffer: ['P'], semaphores: { full: 0, mutex: 'P' },
      transfer: { kind: 'put', from: 'actor:P', to: 'slot:0', actor: 'P', actorLabel: '생산 담당', payload: 'P', slotIndex: 0 } });
    const wait = boundedBufferSnapshot(i, execution, 3), release = boundedBufferSnapshot(i, execution, 4), wake = boundedBufferSnapshot(i, execution, 5);
    expect(wait).toMatchObject({ phase: 'wait', current: { stage: 'token', resource: 'full', beforePc: 0, afterPc: 0 }, transfer: null });
    expect(wait.actors[1]).toMatchObject({ blocked: true, waitFor: 'full', pc: 0 });
    expect(release).toMatchObject({ phase: 'release', semaphores: { full: 1, mutex: null }, current: { resources: ['mutex', 'full'], resource: null }, transfer: null });
    expect(release.actors[1]).toMatchObject({ blocked: true, waitFor: 'full', pc: 0 });
    expect(wake).toMatchObject({ phase: 'wake', current: { actor: 'C', resource: 'full', stage: 'token' }, buffer: ['P'], transfer: null });
    expect(wake.actors[1]).toMatchObject({ blocked: false, waitFor: null, pc: 1 });
  });

  it('takes the previous FIFO head without releasing empty until the later release', () => {
    const i = instance({ ...example, initial: ['seed'], order: ['P', 'C', 'C', 'C', 'C', 'P'] });
    const execution = run('PC', i.input), wait = boundedBufferSnapshot(i, execution, 0);
    expect(wait).toMatchObject({ phase: 'wait', current: { actor: 'P', resource: 'empty' }, buffer: ['seed'] });
    const take = boundedBufferSnapshot(i, execution, 3);
    expect(take).toMatchObject({ phase: 'take', buffer: [], semaphores: { empty: 0, full: 0, mutex: 'C' },
      transfer: { kind: 'take', from: 'slot:0', to: 'actor:C', payload: 'seed', slotIndex: 0 } });
    expect(take.slots[0].occupied).toBe(false);
    expect(boundedBufferSnapshot(i, execution, 4).semaphores).toEqual({ empty: 1, full: 0, mutex: null });
    expect(boundedBufferSnapshot(i, execution, 5)).toMatchObject({ phase: 'wake', current: { resource: 'empty' }, transfer: null });
  });

  it('distinguishes a mutex wake from token acquisition and preserves other actors state', () => {
    const i = instance({ capacity: 2, initial: [], actors: [...actors, { id: 'P2', role: 'producer' }],
      order: ['P', 'P2', 'P', 'P2', 'P', 'P', 'P2', 'P2', 'P2'], policy: 'correct' });
    const execution = run('PC', i.input), wait = boundedBufferSnapshot(i, execution, 3), released = boundedBufferSnapshot(i, execution, 5), wake = boundedBufferSnapshot(i, execution, 6);
    expect(wait.current).toMatchObject({ actor: 'P2', stage: 'mutex', resource: 'mutex', beforePc: 1, afterPc: 1 });
    expect(wait.actors[2]).toMatchObject({ blocked: true, waitFor: 'mutex', pc: 1 });
    expect(released.actors[2].blocked).toBe(true);
    expect(wake).toMatchObject({ phase: 'wake', current: { actor: 'P2', stage: 'mutex', resource: 'mutex', beforePc: 1, afterPc: 2 },
      semaphores: { empty: 0, full: 1, mutex: 'P2' }, transfer: null });
    expect(wake.actors[0]).toMatchObject({ pc: 0, blocked: false, active: false });
    expect(wake.actors[1]).toMatchObject({ pc: 0, blocked: false, active: false });
  });

  it('follows lock-first acquisition order and exposes deadlock only on the current terminal event', () => {
    const i = instance({ capacity: 1, initial: [], actors, order: ['C', 'C', 'P'], policy: 'lock-first' });
    const execution = run('PC', i.input), first = boundedBufferSnapshot(i, execution, 0), waiting = boundedBufferSnapshot(i, execution, 1), final = boundedBufferSnapshot(i, execution, 2);
    expect(first).toMatchObject({ phase: 'acquire', current: { stage: 'mutex', resource: 'mutex' }, stopReason: 'running' });
    expect(waiting).toMatchObject({ phase: 'wait', current: { resource: 'full' }, semaphores: { empty: 1, full: 0, mutex: 'C' }, stopReason: 'running' });
    expect(final).toMatchObject({ phase: 'wait', current: { actor: 'P', resource: 'mutex' }, stopReason: 'deadlocked', transfer: null });
    expect(final.actors.map(a => [a.id, a.waitFor])).toEqual([['P', 'mutex'], ['C', 'full']]);
    expect(grade('PC', i.input, 'process', JSON.stringify({ v: 1, result: execution.result, events: execution.events })).correct).toBe(true);
    const succeeds = instance({ ...example, order: ['P', 'P', 'P', 'P', 'C', 'C', 'C', 'C'], policy: 'lock-first' });
    const success = boundedBufferSnapshot(succeeds, run('PC', succeeds.input), 7);
    expect(success).toMatchObject({ phase: 'release', buffer: [], stopReason: 'scheduleEnd', semaphores: { empty: 1, full: 0, mutex: null } });
  });

  it('keeps occupied null, false, empty strings and zero as actual FIFO payloads, including after shifting', () => {
    const initial = [null, false, '', 0];
    const i = instance({ capacity: 4, initial, actors: [{ id: 'C', role: 'consumer' }], order: Array(16).fill('C'), policy: 'correct' });
    const execution = run('PC', i.input);
    expect(boundedBufferSnapshot(i, execution, -1).slots.every(slot => slot.occupied)).toBe(true);
    initial.forEach((payload, index) => {
      const s = boundedBufferSnapshot(i, execution, index * 4 + 2);
      expect(s.transfer?.payload).toBe(payload);
      expect(s.buffer).toEqual(initial.slice(index + 1));
      expect(s.slots.filter(slot => slot.occupied)).toHaveLength(3 - index);
    });
    const final = boundedBufferSnapshot(i, execution, 15);
    // The engine can report blocked even without a last wait: no next attempt can proceed.
    expect(final).toMatchObject({ phase: 'release', stopReason: 'blocked', buffer: [] });
    expect(final.actors[0].blocked).toBe(false);
  });

  it('keeps schedule end, blocked and empty-order ready distinct without reading the final result', () => {
    const short = instance({ ...example, order: ['P'] });
    expect(boundedBufferSnapshot(short, run('PC', short.input), 0)).toMatchObject({ stopReason: 'scheduleEnd', phase: 'acquire', buffer: [] });
    const blocked = instance({ ...example, actors: [{ id: 'C', role: 'consumer' }], order: ['C'] });
    expect(boundedBufferSnapshot(blocked, run('PC', blocked.input), 0)).toMatchObject({ phase: 'wait', stopReason: 'blocked' });
    const empty = instance({ ...blocked.input, order: [] }), execution = run('PC', empty.input);
    expect(execution.result.stopReason).toBe('blocked');
    Object.defineProperty(execution, 'result', { get: () => { throw new Error('Final result must not be read'); } });
    expect(boundedBufferSnapshot(empty, execution, 0)).toMatchObject({ phase: 'initial', stopReason: 'ready', current: null, event: null });
  });

  it('reconstructs backward navigation and ignores future event data and final output', () => {
    const i = instance(), execution = run('PC', i.input), earlier = boundedBufferSnapshot(i, execution, 2);
    Object.defineProperty(execution, 'result', { get: () => { throw new Error('No lookahead'); } });
    boundedBufferSnapshot(i, execution, 8);
    expect(boundedBufferSnapshot(i, execution, 2)).toEqual(earlier);
    execution.events[3] = { get data() { throw new Error('Future event'); } } as unknown as SemanticEvent;
    expect(boundedBufferSnapshot(i, execution, 2)).toEqual(earlier);
    expect(boundedBufferSnapshot(i, execution, -1)).toMatchObject({ buffer: [], phase: 'initial', stopReason: 'ready' });
  });

  it('keeps actor labels separate from raw payload and resource IDs and does not filter model data by views', () => {
    const i = instance({ capacity: 2, initial: [null], actors: [{ id: 'full', role: 'producer' }, { id: 'mutex', role: 'consumer' }, { id: 'toString', role: 'producer' }], order: ['full', 'full', 'full'], policy: 'correct' });
    i.labels.full = '생산 표시 이름'; i.labels.mutex = '소비 표시 이름';
    i.views[0] = { ...i.views[0], target: 'mutex', fields: ['없는 항목'], hidden: true };
    const s = boundedBufferSnapshot(i, run('PC', i.input), 2);
    expect(s.buffer).toEqual([null, 'full']);
    expect(s.actors.map(a => [a.nodeKey, a.label])).toEqual([['actor:full', '생산 표시 이름'], ['actor:mutex', '소비 표시 이름'], ['actor:toString', 'toString']]);
    expect(s.transfer).toMatchObject({ from: 'actor:full', to: 'slot:1', payload: 'full', actorLabel: '생산 표시 이름' });
    expect(s.slots[0]).toMatchObject({ occupied: true, value: null });
    expect(s.semaphores.mutex).toBe('full');
    expect(s.mutexOwnerLabel).toBe('생산 표시 이름');
  });

  it('retains all 256 slots and 100 actors with long strings and safe integer extremes', () => {
    const initial = Array.from({ length: 256 }, (_, n) => n === 255 ? 'x'.repeat(256) : n === 0 ? Number.MAX_SAFE_INTEGER : n === 1 ? -Number.MAX_SAFE_INTEGER : n);
    const many = Array.from({ length: 100 }, (_, n) => ({ id: `A${n}`, role: n % 2 ? 'producer' : 'consumer' }));
    const i = instance({ capacity: 256, initial, actors: many, order: [], policy: 'correct' });
    const s = boundedBufferSnapshot(i, run('PC', i.input), -1);
    expect(s.slots).toHaveLength(256); expect(s.actors).toHaveLength(100);
    expect(s.buffer).toEqual(initial); expect(s.slots[255].value).toBe('x'.repeat(256));
    expect(s.actors[99].id).toBe('A99');
    expect(s.semaphores).toEqual({ empty: 0, full: 256, mutex: null });
  });

  it('does not mutate frozen input or events and returns independent data', () => {
    const i = instance(), execution = run('PC', i.input), before = JSON.stringify({ i, execution });
    freeze(i); freeze(execution);
    const s = boundedBufferSnapshot(i, execution, 2);
    s.buffer[0] = 'changed'; s.slots[0].value = false; s.actors[0].pc = 99; s.semaphores.full = 99;
    if (s.event) s.event.data.buffer = [];
    expect(JSON.stringify({ i, execution })).toBe(before);
    expect(boundedBufferSnapshot(i, execution, 2)).toMatchObject({ buffer: ['P'], semaphores: { full: 0 } });
  });

  it('rejects malformed drafts and stale or inconsistent observed traces instead of drawing guessed state', () => {
    const invalidInputs = [
      { ...example, capacity: 0 }, { ...example, initial: [1, 2] }, { ...example, actors: [actors[0], actors[0]] },
      { ...example, order: ['missing'] }, { ...example, policy: 'unknown' }, { ...example, initial: [{}] },
    ];
    for (const input of invalidInputs) expect(() => boundedBufferSnapshot(instance(input), null, -1)).toThrow();
    const i = instance(), execution = run('PC', i.input);
    const wrong = (mutate: (r: ModelRun) => void) => { const r = structuredClone(execution); mutate(r); return r; };
    const stale = [
      wrong(r => { r.events[0].actor = 'C'; }), wrong(r => { r.events[0].kind = 'wake'; }),
      wrong(r => { r.events[0].data.buffer = ['P']; }), wrong(r => { r.events[0].data.stopReason = 'deadlocked'; }),
      wrong(r => { r.events[0].data.semaphores = { empty: 1, full: 0, mutex: null }; }),
      wrong(r => { r.events[0].data.actors = { P: { role: 'producer', pc: 1, blocked: false } }; }),
      wrong(r => { r.events[0].step = 1; }),
    ];
    for (const r of stale) expect(() => boundedBufferSnapshot(i, r, 0)).toThrow();
    expect(() => boundedBufferSnapshot({ ...i, scenarioId: 'CS' }, null, -1)).toThrow();
    expect(() => boundedBufferSnapshot(i, { ...execution, id: 'CS' }, -1)).toThrow();
    expect(() => boundedBufferSnapshot(i, execution, NaN)).toThrow();
  });

  it('uses summaries without hidden actor IDs, payloads, permit counts or terminal verdicts', () => {
    const i = instance({ capacity: 7, initial: ['SecretPayload'], actors: [{ id: 'HiddenActor', role: 'consumer' }], order: Array(4).fill('HiddenActor'), policy: 'correct' });
    i.labels.HiddenActor = '감춰진 이름';
    const execution = run('PC', i.input);
    for (let cursor = -1; cursor < execution.events.length; cursor++) {
      const s = boundedBufferSnapshot(i, execution, cursor);
      expect(s.summary).not.toMatch(/HiddenActor|SecretPayload|감춰진 이름|7|empty|full|mutex|blocked|deadlocked|scheduleEnd/);
    }
  });
});
