import { describe, expect, it } from 'vitest';
import { createInstance } from '../runtime/document.mjs';
import type { SimulationInstance } from '../runtime/document.mjs';
import { grade, run } from '../runtime/index.mjs';
import type { ModelRun, SemanticEvent } from '../runtime/index.mjs';
import { tlbSnapshot } from './tlbModel';

const example = {
  addresses: [5, 1, 13, 1, 9, 9], pageSize: 4, table: [7, 3, null, 0], capacity: 2,
  initialTlb: [{ page: 0, frame: 7 }],
};
function instance(input: SimulationInstance['input'] = example): SimulationInstance {
  return { ...createInstance('TLB'), input: structuredClone(input) };
}
function freeze(value: unknown): void {
  if (value !== null && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
}

describe('TLB visual meaning from the selected trace prefix', () => {
  it('preserves initial cache/table without selecting a future address or result', () => {
    const i = instance(), execution = run('TLB', i.input), s = tlbSnapshot(i, execution, -1);
    expect(s).toMatchObject({ pageSize: 4, capacity: 2, phase: 'initial', current: null, result: null, event: null, inserted: null, evicted: null, lookupTlb: null });
    expect(s.tlb).toEqual([{ page: 0, frame: 7 }]);
    expect(s.pageTable).toEqual([
      { page: 0, frame: 7, field: '페이지 0', nodeKey: 'page-table:0', active: false },
      { page: 1, frame: 3, field: '페이지 1', nodeKey: 'page-table:1', active: false },
      { page: 2, frame: null, field: '페이지 2', nodeKey: 'page-table:2', active: false },
      { page: 3, frame: 0, field: '페이지 3', nodeKey: 'page-table:3', active: false },
    ]);
    expect(s).toEqual(tlbSnapshot(i, null, -1));
  });

  it('keeps lookup MISS after insertion and exposes a result only at translate', () => {
    const i = instance(), execution = run('TLB', i.input);
    const lookup = tlbSnapshot(i, execution, 0), pageTable = tlbSnapshot(i, execution, 1), translated = tlbSnapshot(i, execution, 2);
    expect(lookup).toMatchObject({ phase: 'lookup', current: { index: 0, address: 5, page: 1, offset: 1, hit: false, pageTableVisited: false }, result: null, inserted: null, evicted: null });
    expect(lookup.pageTable.every(row => !row.active)).toBe(true);
    expect(pageTable).toMatchObject({ phase: 'pageTable', current: { hit: false, pageTableVisited: true }, result: null, inserted: null, evicted: null });
    expect(pageTable.tlb).toEqual(lookup.tlb);
    expect(pageTable.pageTable.filter(row => row.active).map(row => row.page)).toEqual([1]);
    expect(translated).toMatchObject({ phase: 'translate', current: { hit: false, pageTableVisited: true }, result: { hit: false, fault: false, physical: 13, frame: 3 }, inserted: { page: 1, frame: 3 }, evicted: null });
    expect(translated.lookupTlb).toEqual([{ page: 0, frame: 7 }]);
    expect(translated.tlb).toEqual([{ page: 0, frame: 7 }, { page: 1, frame: 3 }]);
  });

  it('takes the hit path without visiting the page table or changing FIFO order', () => {
    const i = instance(), execution = run('TLB', i.input), lookup = tlbSnapshot(i, execution, 3), translated = tlbSnapshot(i, execution, 4);
    expect(lookup).toMatchObject({ current: { index: 1, address: 1, page: 0, offset: 1, hit: true, pageTableVisited: false }, result: null, inserted: null, evicted: null });
    expect(translated.result).toEqual({ hit: true, fault: false, physical: 29, frame: 7 });
    expect(translated.tlb).toEqual(lookup.tlb);
    expect(translated.tlb.map(entry => entry.page)).toEqual([0, 1]);
    expect(translated).toMatchObject({ inserted: null, evicted: null, current: { pageTableVisited: false } });
    expect(translated.pageTable.every(row => !row.active)).toBe(true);
  });

  it('evicts the oldest entry even if it just hit, without predicting eviction before translate', () => {
    const i = instance(), execution = run('TLB', i.input);
    expect(tlbSnapshot(i, execution, 5)).toMatchObject({ current: { index: 2, hit: false }, result: null, inserted: null, evicted: null });
    expect(tlbSnapshot(i, execution, 6)).toMatchObject({ result: null, inserted: null, evicted: null });
    const translated = tlbSnapshot(i, execution, 7);
    expect(translated).toMatchObject({ current: { hit: false }, inserted: { page: 3, frame: 0 }, evicted: { page: 0, frame: 7 }, result: { hit: false, fault: false, physical: 1, frame: 0 } });
    expect(translated.tlb).toEqual([{ page: 1, frame: 3 }, { page: 3, frame: 0 }]);
    expect(translated.lookupTlb).toEqual([{ page: 0, frame: 7 }, { page: 1, frame: 3 }]);
    expect(tlbSnapshot(i, execution, 8)).toMatchObject({ current: { index: 3, page: 0, hit: false }, result: null, inserted: null, evicted: null });
    expect(translated.summary).toContain('가장 먼저 들어온');
  });

  it('distinguishes MISS from page fault and never inserts or loads a missing page', () => {
    const i = instance(), execution = run('TLB', i.input);
    expect(tlbSnapshot(i, execution, 11)).toMatchObject({ phase: 'lookup', current: { index: 4, hit: false, pageTableVisited: false }, result: null });
    const pageTable = tlbSnapshot(i, execution, 12);
    expect(pageTable.result).toBeNull();
    expect(pageTable.pageTable.find(row => row.page === 2)).toMatchObject({ frame: null, active: true });
    const fault = tlbSnapshot(i, execution, 13), repeated = tlbSnapshot(i, execution, 16);
    expect(fault).toMatchObject({ phase: 'fault', current: { hit: false, pageTableVisited: true }, result: { hit: false, fault: true, physical: null, frame: null }, inserted: null, evicted: null });
    expect(fault.tlb).toEqual(fault.lookupTlb);
    expect(repeated.result).toEqual(fault.result);
    expect(repeated.tlb).toEqual(fault.tlb);
    expect(repeated.current?.index).toBe(5);
    const next = tlbSnapshot(i, execution, 14);
    expect(next.result).toBeNull();
    expect(next.pageTable.every(row => !row.active)).toBe(true);
    expect(grade('TLB', i.input, 'process', JSON.stringify({ v: 1, result: execution.result, events: execution.events })).correct).toBe(true);
  });

  it('reconstructs any earlier cursor and ignores future events and final translations', () => {
    const i = instance(), execution = run('TLB', i.input), earlier = tlbSnapshot(i, execution, 1);
    Object.defineProperty(execution, 'result', { get: () => { throw new Error('Do not read final translations'); } });
    tlbSnapshot(i, execution, 16);
    expect(tlbSnapshot(i, execution, 1)).toEqual(earlier);
    expect(tlbSnapshot(i, execution, -1)).toMatchObject({ current: null, result: null, inserted: null, evicted: null });
    execution.events[2] = { get data() { throw new Error('Future event'); } } as unknown as SemanticEvent;
    expect(tlbSnapshot(i, execution, 1)).toEqual(earlier);
  });

  it('handles an empty address list with empty or populated initial cache', () => {
    for (const initialTlb of [[], [{ page: 0, frame: 0 }]]) {
      const i = instance({ addresses: [], pageSize: 1, table: [0], capacity: 1, initialTlb });
      const execution = run('TLB', i.input), s = tlbSnapshot(i, execution, -1);
      expect(execution.result).toEqual({ translations: [] });
      expect(s).toMatchObject({ phase: 'initial', current: null, result: null, event: null });
      expect(s.tlb).toEqual(initialTlb);
      expect(tlbSnapshot(i, execution, 0)).toEqual(s);
    }
  });

  it('preserves frame and physical address zero, shared frames and capacity one', () => {
    const i = instance({ addresses: [0, 0, 1], pageSize: 1, table: [0, 0], capacity: 1, initialTlb: [] });
    const execution = run('TLB', i.input), first = tlbSnapshot(i, execution, 2), hit = tlbSnapshot(i, execution, 4), last = tlbSnapshot(i, execution, 7);
    expect(first.result).toEqual({ hit: false, fault: false, physical: 0, frame: 0 });
    expect(hit.result).toEqual({ hit: true, fault: false, physical: 0, frame: 0 });
    expect(hit.evicted).toBeNull();
    expect(last).toMatchObject({ result: { hit: false, fault: false, physical: 0, frame: 0 }, inserted: { page: 1, frame: 0 }, evicted: { page: 0, frame: 0 } });
    expect(last.pageTable.map(row => row.nodeKey)).toEqual(['page-table:0', 'page-table:1']);
  });

  it('retains all 256 cache/table rows, raw memory field keys and large safe values independently of view filtering', () => {
    const table = Array.from({ length: 256 }, (_, page) => Number.MAX_SAFE_INTEGER - page);
    const initialTlb = table.map((frame, page) => ({ page, frame }));
    const i = instance({ addresses: [255], pageSize: 1, table, capacity: 256, initialTlb });
    i.views[0] = { ...i.views[0], target: 'ignored', fields: ['페이지 255'], hidden: true };
    const s = tlbSnapshot(i, run('TLB', i.input), 1);
    expect(s.pageTable).toHaveLength(256);
    expect(s.tlb).toHaveLength(256);
    expect(s.lookupTlb).toHaveLength(256);
    expect(s.pageTable[255]).toEqual({ page: 255, frame: table[255], field: '페이지 255', nodeKey: 'page-table:255', active: false });
    expect(s.result?.physical).toBe(Number.MAX_SAFE_INTEGER - 255);
    expect(s.tlb[0].frame).toBe(Number.MAX_SAFE_INTEGER);
    const hugePage = instance({ addresses: [Number.MAX_SAFE_INTEGER - 1], pageSize: Number.MAX_SAFE_INTEGER, table: [0], capacity: 1, initialTlb: [{ page: 0, frame: 0 }] });
    expect(tlbSnapshot(hugePage, run('TLB', hugePage.input), 1).result?.physical).toBe(Number.MAX_SAFE_INTEGER - 1);
  });

  it('leaves input/trace unchanged and detaches returned cache, rows, result and event', () => {
    const i = instance(), execution = run('TLB', i.input), original = JSON.stringify({ i, execution });
    freeze(i); freeze(execution);
    const s = tlbSnapshot(i, execution, 7);
    s.tlb[0].frame = 99;
    s.lookupTlb![0].frame = 98;
    s.pageTable[0].frame = 97;
    s.current!.address = 96;
    s.inserted!.frame = 95;
    s.evicted!.frame = 94;
    s.result!.physical = 93;
    (s.event!.data.tlb as { page: number; frame: number }[])[0].frame = 92;
    expect(JSON.stringify({ i, execution })).toBe(original);
    expect(tlbSnapshot(i, execution, 7).result?.physical).toBe(1);
    expect(tlbSnapshot(i, execution, 7).tlb).toEqual([{ page: 1, frame: 3 }, { page: 3, frame: 0 }]);
  });

  it('rejects invalid drafts and separates out-of-range inputs and unsafe physical values from page fault', () => {
    expect(() => tlbSnapshot(instance({ ...example, addresses: [16] }), null, -1)).toThrow('주소 범위');
    expect(() => tlbSnapshot(instance({ ...example, initialTlb: [{ page: 0, frame: 7 }, { page: 0, frame: 7 }] }), null, -1)).toThrow('중복');
    expect(() => tlbSnapshot(instance({ ...example, initialTlb: [{ page: 0, frame: 99 }] }), null, -1)).toThrow('일치');
    expect(() => tlbSnapshot(instance({ ...example, initialTlb: [{ page: 2, frame: 0 }] }), null, -1)).toThrow('일치');
    expect(() => tlbSnapshot(instance({ ...example, capacity: 1, initialTlb: [{ page: 0, frame: 7 }, { page: 1, frame: 3 }] }), null, -1)).toThrow('용량');
    expect(() => tlbSnapshot(instance({ ...example, capacity: 0 }), null, -1)).toThrow();
    expect(() => tlbSnapshot(instance({ ...example, table: [] }), null, -1)).toThrow();
    expect(() => tlbSnapshot(instance({}), null, -1)).toThrow();
    expect(() => tlbSnapshot(instance(), null, 0.5)).toThrow('위치');
    const overflow = instance({ addresses: [0], pageSize: 2, table: [Number.MAX_SAFE_INTEGER], capacity: 1, initialTlb: [] });
    expect(() => run('TLB', overflow.input)).toThrow();
    const trace = run('TLB', { ...overflow.input, table: [0] });
    (trace.events[2].data.tlb as { page: number; frame: number }[])[0].frame = Number.MAX_SAFE_INTEGER;
    expect(() => tlbSnapshot(overflow, trace, 2)).toThrow('안전한 정수');
  });

  it('rejects stale identities, reordered hit cache and non-FIFO eviction instead of inventing a path', () => {
    const i = instance(), execution = run('TLB', i.input);
    const stale = (change: (trace: ModelRun) => void, cursor: number) => {
      const trace = structuredClone(execution); change(trace);
      expect(() => tlbSnapshot(i, trace, cursor)).toThrow();
    };
    stale(trace => { trace.events[0].actor = 'P'; }, 0);
    stale(trace => { trace.events[0].data.address = 1; }, 0);
    stale(trace => { trace.events[0].data.page = 0; }, 0);
    stale(trace => { trace.events[0].data.offset = 0; }, 0);
    stale(trace => { trace.events[0].data.index = 99; }, 0);
    stale(trace => { trace.events[1].step = 3; }, 1);
    stale(trace => { trace.events[1].kind = 'fault'; }, 1);
    stale(trace => { trace.events[0].data.tlb = [{ page: 0, frame: 7 }, { page: 1, frame: 3 }]; }, 0);
    stale(trace => { trace.events[4].data.tlb = [{ page: 1, frame: 3 }, { page: 0, frame: 7 }]; }, 4);
    stale(trace => { trace.events[7].data.tlb = [{ page: 0, frame: 7 }, { page: 3, frame: 0 }]; }, 7);
    stale(trace => { trace.events[13].data.tlb = [{ page: 1, frame: 3 }, { page: 0, frame: 7 }]; }, 13);
    stale(trace => { trace.events[2].data.hit = true; }, 2);
  });

  it('keeps automatic explanations about phases without exposing hidden numeric mappings', () => {
    const i = instance(), execution = run('TLB', i.input);
    for (let cursor = -1; cursor < execution.events.length; cursor++) {
      expect(tlbSnapshot(i, execution, cursor).summary).not.toMatch(/[0-9]/);
    }
    expect(tlbSnapshot(i, execution, 0).summary).toContain('조회가 필요');
    expect(tlbSnapshot(i, execution, 1).summary).toContain('확인합니다');
    expect(tlbSnapshot(i, execution, 3).summary).toContain('필요하지 않습니다');
    expect(tlbSnapshot(i, execution, 13).summary).toContain('변환할 수 없습니다');
  });
});
