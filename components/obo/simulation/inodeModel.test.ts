import { describe, expect, it } from 'vitest';
import { createInstance } from '../runtime/document.mjs';
import type { SimulationInstance } from '../runtime/document.mjs';
import { run } from '../runtime/index.mjs';
import type { ModelRun, SemanticEvent } from '../runtime/index.mjs';
import { inodeSnapshot } from './inodeModel';

const path = {
  fs: {
    blockSize: 4,
    directory: { report: 'i1', alias: 'i1', empty: 'i2' },
    inodes: { i1: { size: 10, direct: ['b0'], indirect: 'p1' }, i2: { size: 0, direct: [], indirect: null } },
    indirect: { p1: ['b1', 'b2'] }, blocks: { b0: 'ABCD', b1: false, b2: null },
  },
  accesses: [
    { name: 'report', offset: 0 }, { name: 'report', offset: 4 }, { name: 'alias', offset: 9 },
    { name: 'report', offset: 10 }, { name: 'empty', offset: 0 },
  ],
};
function instance(input: SimulationInstance['input'] = path): SimulationInstance {
  return { ...createInstance('IN'), input: structuredClone(input) };
}
function freeze(value: unknown): void {
  if (value !== null && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
}

describe('inode visual meaning from the selected trace prefix', () => {
  it('shows the complete authored structure initially without selecting a future access', () => {
    const i = instance(), execution = run('IN', i.input);
    const initial = inodeSnapshot(i, execution, -1);
    expect(initial.nodes).toHaveLength(9);
    expect(initial.links).toHaveLength(7);
    expect(initial).toMatchObject({ blockSize: 4, current: null, access: null, result: null, currentNodeKey: null, activeNodeKeys: [], activeLinkKeys: [] });
    expect(initial).toEqual(inodeSnapshot(i, null, -1));
    expect(initial.nodes.find(node => node.key === 'inode:i1')).toMatchObject({ names: ['report', 'alias'], size: 10, direct: ['b0'], indirect: 'p1' });
  });

  it('reveals only the visited direct path and uses zero as a real block offset', () => {
    const i = instance(), execution = run('IN', i.input);
    expect(inodeSnapshot(i, execution, 0)).toMatchObject({ activeNodeKeys: ['name:report'], activeLinkKeys: [], currentNodeKey: 'name:report', result: null });
    expect(inodeSnapshot(i, execution, 1)).toMatchObject({ activeNodeKeys: ['name:report', 'inode:i1'], activeLinkKeys: ['name-link:report'], currentNodeKey: 'inode:i1', result: null });
    const data = inodeSnapshot(i, execution, 2);
    expect(data).toMatchObject({
      activeNodeKeys: ['name:report', 'inode:i1', 'block:b0'], activeLinkKeys: ['name-link:report', 'direct:i1:0'],
      currentNodeKey: 'block:b0', access: { index: 0, name: 'report', fileOffset: 0 },
      result: { inode: 'i1', logical: 0, block: 'b0', offset: 0, eof: false },
    });
    expect(data.summary).toContain('블록 내 위치 0');
  });

  it('shows the indirect pointer before its data and shares one inode across directory aliases', () => {
    const i = instance(), execution = run('IN', i.input);
    const indirect = inodeSnapshot(i, execution, 5);
    expect(indirect).toMatchObject({
      activeNodeKeys: ['name:report', 'inode:i1', 'indirect:p1'], activeLinkKeys: ['name-link:report', 'indirect:i1'],
      currentNodeKey: 'indirect:p1', result: null,
    });
    expect(inodeSnapshot(i, execution, 6).activeLinkKeys).toEqual(['name-link:report', 'indirect:i1', 'indirect-data:p1:0']);
    const alias = inodeSnapshot(i, execution, 10);
    expect(alias.activeNodeKeys).toEqual(['name:alias', 'inode:i1', 'indirect:p1', 'block:b2']);
    expect(alias.activeLinkKeys).toEqual(['name-link:alias', 'indirect:i1', 'indirect-data:p1:1']);
    expect(alias.result).toEqual({ inode: 'i1', logical: 2, block: 'b2', offset: 1, eof: false });
    expect(alias.nodes.filter(node => node.key === 'inode:i1')).toHaveLength(1);
  });

  it('resets the path for the next access and reproduces earlier cursors without reading final results', () => {
    const i = instance(), execution = run('IN', i.input);
    Object.defineProperty(execution, 'result', { get: () => { throw new Error('Do not read final results'); } });
    const before = inodeSnapshot(i, execution, 1);
    inodeSnapshot(i, execution, 16);
    expect(inodeSnapshot(i, execution, 1)).toEqual(before);
    expect(inodeSnapshot(i, execution, 3)).toMatchObject({
      activeNodeKeys: ['name:report'], activeLinkKeys: [], currentNodeKey: 'name:report', result: null,
      access: { index: 1, fileOffset: 4 },
    });
    expect(inodeSnapshot(i, execution, -1).access).toBeNull();
  });

  it('stops at the inode for exact EOF and for an empty file without illuminating data or indirect blocks', () => {
    const i = instance(), execution = run('IN', i.input);
    const eof = inodeSnapshot(i, execution, 13);
    expect(eof).toMatchObject({
      currentNodeKey: 'inode:i1', activeNodeKeys: ['name:report', 'inode:i1'], activeLinkKeys: ['name-link:report'],
      result: { inode: 'i1', logical: null, block: null, offset: null, eof: true },
    });
    expect(eof.summary).toContain('데이터 블록에 접근하지 않습니다');
    const empty = inodeSnapshot(i, execution, 16);
    expect(empty).toMatchObject({ currentNodeKey: 'inode:i2', activeNodeKeys: ['name:empty', 'inode:i2'], activeLinkKeys: ['name-link:empty'] });
    expect(empty.result?.eof).toBe(true);
  });

  it('preserves namespace collisions, scalar false/null/zero, and authored labels', () => {
    const i = instance({
      fs: { blockSize: 1, directory: { same: 'same' }, inodes: { same: { size: 2, direct: ['same'], indirect: 'same' } }, indirect: { same: ['next'] }, blocks: { same: false, next: null, zero: 0 } },
      accesses: [{ name: 'same', offset: 0 }, { name: 'same', offset: 1 }],
    });
    i.labels.same = '같은 ID, 서로 다른 역할';
    const execution = run('IN', i.input), s = inodeSnapshot(i, execution, 6);
    expect(s.nodes.filter(node => node.id === 'same').map(node => node.key)).toEqual(['name:same', 'inode:same', 'indirect:same', 'block:same']);
    expect(s.nodes.filter(node => node.id === 'same').every(node => node.label === i.labels.same)).toBe(true);
    expect(s.nodes.filter(node => node.kind === 'block').map(node => node.value)).toEqual([false, null, 0]);
    expect(s.activeNodeKeys).toEqual(['name:same', 'inode:same', 'indirect:same', 'block:next']);
    expect(s.currentNodeKey).toBe('block:next');
  });

  it('distinguishes repeated pointer slots and direct versus indirect references to one data block', () => {
    const i = instance({
      fs: { blockSize: 4, directory: { file: 'i' }, inodes: { i: { size: 12, direct: ['b', 'b'], indirect: 'p' } }, indirect: { p: ['b'] }, blocks: { b: 'same data' } },
      accesses: [{ name: 'file', offset: 4 }, { name: 'file', offset: 8 }],
    });
    const execution = run('IN', i.input), direct = inodeSnapshot(i, execution, 2), indirect = inodeSnapshot(i, execution, 6);
    expect(direct.activeLinkKeys).toEqual(['name-link:file', 'direct:i:1']);
    expect(indirect.activeLinkKeys).toEqual(['name-link:file', 'indirect:i', 'indirect-data:p:0']);
    expect(indirect.nodes.filter(node => node.kind === 'block')).toHaveLength(1);
    expect(indirect.links.filter(link => link.to === 'block:b')).toHaveLength(3);
  });

  it('accepts the existing empty filesystem and unused dangling indirect entry semantics', () => {
    const i = instance({ fs: { blockSize: 4, directory: {}, inodes: {}, indirect: { orphan: ['missing'] }, blocks: {} }, accesses: [] });
    const execution = run('IN', i.input), s = inodeSnapshot(i, execution, -1);
    expect(execution.result).toEqual({ accesses: [] });
    expect(s.nodes).toEqual([{ key: 'indirect:orphan', id: 'orphan', label: 'orphan', kind: 'indirect', blocks: ['missing'] }]);
    expect(s.links[0]).toMatchObject({ from: 'indirect:orphan', to: 'block:missing' });
    expect(s.currentNodeKey).toBeNull();
    const empty = instance({ fs: { blockSize: 1, directory: {}, inodes: {}, indirect: {}, blocks: {} }, accesses: [] });
    expect(inodeSnapshot(empty, run('IN', empty.input), -1).nodes).toEqual([]);
  });

  it('retains all 256 pointers and nodes, large scalar numbers, and complete labels', () => {
    const ids = Array.from({ length: 256 }, (_, n) => `b${n}`);
    const i = instance({
      fs: { blockSize: 1, directory: { file: 'i' }, inodes: { i: { size: 256, direct: ids, indirect: null } }, indirect: {}, blocks: Object.fromEntries(ids.map(id => [id, Number.MAX_SAFE_INTEGER])) },
      accesses: [{ name: 'file', offset: 255 }],
    });
    i.labels.file = '긴 파일 표시 이름 '.repeat(20);
    const s = inodeSnapshot(i, run('IN', i.input), 2);
    expect(s.nodes.filter(node => node.kind === 'block')).toHaveLength(256);
    expect(s.nodes.find(node => node.key === 'inode:i')).toMatchObject({ direct: ids });
    expect(s.nodes.find(node => node.key === 'block:b255')).toMatchObject({ value: Number.MAX_SAFE_INTEGER });
    expect(s.access?.label).toBe(i.labels.file);
    expect(s.activeLinkKeys).toContain('direct:i:255');
    expect(s.result?.logical).toBe(255);
  });

  it('does not mutate the input or trace and returns detached arrays and event results', () => {
    const i = instance(), execution = run('IN', i.input);
    const before = JSON.stringify({ i, execution });
    freeze(i); freeze(execution);
    const s = inodeSnapshot(i, execution, 10);
    const inode = s.nodes.find(node => node.kind === 'inode');
    if (inode?.kind === 'inode') { inode.direct.push('different'); inode.names.push('different'); }
    const pointer = s.nodes.find(node => node.kind === 'indirect');
    if (pointer?.kind === 'indirect') pointer.blocks.push('different');
    s.result!.block = 'different';
    s.current!.data.target = 'different';
    (s.current!.data.result as Record<string, unknown>).block = 'different';
    expect(JSON.stringify({ i, execution })).toBe(before);
    expect(inodeSnapshot(i, execution, 10).result?.block).toBe('b2');
  });

  it('rejects malformed drafts explicitly while preserving the accepted input contract', () => {
    const missing = structuredClone(path); delete (missing.fs.blocks as Record<string, unknown>).b1;
    expect(() => inodeSnapshot(instance(missing), null, -1)).toThrow('데이터 블록');
    const oversized = structuredClone(path); oversized.fs.inodes.i1.size = 13;
    expect(() => inodeSnapshot(instance(oversized), null, -1)).toThrow('파일 크기');
    const unknown = structuredClone(path); unknown.accesses[0].name = 'unknown';
    expect(() => inodeSnapshot(instance(unknown), null, -1)).toThrow('파일 이름');
    const operation = { ...structuredClone(path), accesses: [{ name: 'report', offset: 0, op: 'unlink' }] };
    expect(() => run('IN', operation)).toThrow();
    expect(() => inodeSnapshot(instance(operation), null, -1)).toThrow();
    expect(() => inodeSnapshot(instance({}), null, -1)).toThrow();
    expect(() => inodeSnapshot(instance(), null, 0.5)).toThrow('위치');
  });

  it('rejects stale current trace data but never inspects an event beyond the cursor', () => {
    const i = instance(), execution = run('IN', i.input);
    const stale = (change: (trace: ModelRun) => void, cursor: number) => {
      const trace = structuredClone(execution); change(trace);
      expect(() => inodeSnapshot(i, trace, cursor)).toThrow();
    };
    stale(trace => { trace.events[0].data.index = 99; }, 0);
    stale(trace => { trace.events[0].data.target = 'alias'; }, 0);
    stale(trace => { trace.events[1].actor = 'i1'; }, 1);
    stale(trace => { (trace.events[2].data.result as Record<string, unknown>).offset = 1; }, 2);
    stale(trace => { (trace.events[13].data.result as Record<string, unknown>).block = 'b0'; }, 13);
    const expected = inodeSnapshot(i, execution, 1);
    execution.events[2] = { get data() { throw new Error('Future event'); } } as unknown as SemanticEvent;
    expect(inodeSnapshot(i, execution, 1)).toEqual(expected);
  });
});
