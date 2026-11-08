import { describe, expect, it } from 'vitest';
import { createInstance } from '../runtime/document.mjs';
import type { SimulationInstance } from '../runtime/document.mjs';
import { grade, run } from '../runtime/index.mjs';
import type { ModelRun, SemanticEvent } from '../runtime/index.mjs';
import { contextSwitchSnapshot } from './contextSwitchModel';
import type { ContextSwitchRegister, ContextSwitchScalar } from './contextSwitchModel';

const example = {
  pcbs: {
    P: { pc: 10, sp: 100, flag: false, note: null },
    Q: { pc: 20, sp: 200, mode: 'user', zero: 0, empty: '' },
    R: {},
  },
  initialId: 'P', order: ['Q', 'R', 'P', 'P'],
};
function instance(input: SimulationInstance['input'] = example): SimulationInstance {
  return { ...createInstance('CS'), input: structuredClone(input) };
}
const values = (registers: ContextSwitchRegister[]) => Object.fromEntries(registers.map(cell => [cell.key, cell.value]));
function freeze(value: unknown): void {
  if (value !== null && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
}

describe('context switch visual meaning from the selected trace prefix', () => {
  it('loads the initial context without selecting future work or creating a transfer', () => {
    const i = instance(), execution = run('CS', i.input), s = contextSwitchSnapshot(i, execution, -1);
    expect(s).toMatchObject({ phase: 'initial', selectedId: 'P', loadedId: 'P', transfer: null, switchIndex: null, event: null, changes: { added: [], removed: [], changed: [] } });
    expect(values(s.registers)).toEqual(example.pcbs.P);
    expect(s.pcbs.map(pcb => [pcb.id, pcb.selected, pcb.active])).toEqual([['P', true, false], ['Q', false, false], ['R', false, false]]);
    expect(s).toEqual(contextSwitchSnapshot(i, null, -1));
  });

  it('shows CPU-to-PCB save even when the stored values are unchanged', () => {
    const i = instance(), execution = run('CS', i.input), s = contextSwitchSnapshot(i, execution, 0);
    expect(s).toMatchObject({ phase: 'save', selectedId: 'P', loadedId: 'P', switchIndex: 0,
      transfer: { kind: 'save', from: 'cpu', to: 'pcb:P', actor: 'P' }, changes: { added: [], removed: [], changed: [] } });
    expect(values(s.pcbs.find(pcb => pcb.id === 'P')!.registers)).toEqual(example.pcbs.P);
    expect(values(s.registers)).toEqual(example.pcbs.P);
    expect(s.pcbs.filter(pcb => pcb.active).map(pcb => pcb.id)).toEqual(['P']);
    expect(s.summary).toContain('저장했습니다');
  });

  it('distinguishes the still-selected process from the restored CPU context and preserves different key sets', () => {
    const i = instance(), execution = run('CS', i.input), s = contextSwitchSnapshot(i, execution, 1);
    expect(s).toMatchObject({ phase: 'restore', selectedId: 'P', loadedId: 'Q', transfer: { kind: 'restore', from: 'pcb:Q', to: 'cpu', actor: 'Q' } });
    expect(values(s.registers)).toEqual(example.pcbs.Q);
    expect(s.registers.some(cell => cell.key === 'flag' || cell.key === 'note')).toBe(false);
    expect(s.changes).toEqual({ added: ['mode', 'zero', 'empty'], removed: ['flag', 'note'], changed: ['pc', 'sp'] });
    expect(s.pcbs.find(pcb => pcb.id === 'P')).toMatchObject({ selected: true, active: false });
    expect(s.pcbs.find(pcb => pcb.id === 'Q')).toMatchObject({ selected: false, active: true });
    expect(values(s.pcbs.find(pcb => pcb.id === 'P')!.registers)).toEqual(example.pcbs.P);
  });

  it('changes selection only at select and ends the transfer without inventing another copy', () => {
    const i = instance(), execution = run('CS', i.input), restored = contextSwitchSnapshot(i, execution, 1), selected = contextSwitchSnapshot(i, execution, 2);
    expect(selected).toMatchObject({ phase: 'select', selectedId: 'Q', loadedId: 'Q', transfer: null, changes: { added: [], removed: [], changed: [] } });
    expect(selected.registers).toEqual(restored.registers);
    expect(selected.pcbs.filter(pcb => pcb.selected).map(pcb => pcb.id)).toEqual(['Q']);
    expect(selected.pcbs.every(pcb => !pcb.active)).toBe(true);
    expect(grade('CS', i.input, 'process', JSON.stringify({ v: 1, result: execution.result, events: execution.events })).correct).toBe(true);
  });

  it('restores an empty context by removing old keys without filling in zeros or nulls', () => {
    const i = instance(), execution = run('CS', i.input), restored = contextSwitchSnapshot(i, execution, 4), selected = contextSwitchSnapshot(i, execution, 5);
    expect(restored).toMatchObject({ phase: 'restore', selectedId: 'Q', loadedId: 'R', registers: [], changes: { added: [], removed: ['pc', 'sp', 'mode', 'zero', 'empty'], changed: [] } });
    expect(values(restored.pcbs.find(pcb => pcb.id === 'Q')!.registers)).toEqual(example.pcbs.Q);
    expect(selected).toMatchObject({ selectedId: 'R', loadedId: 'R', registers: [], transfer: null });
  });

  it('preserves all three phases for repeated self-switches without pretending values changed', () => {
    const i = instance(), execution = run('CS', i.input);
    const save = contextSwitchSnapshot(i, execution, 9), restore = contextSwitchSnapshot(i, execution, 10), select = contextSwitchSnapshot(i, execution, 11);
    expect(save.transfer).toMatchObject({ kind: 'save', from: 'cpu', to: 'pcb:P' });
    expect(restore.transfer).toMatchObject({ kind: 'restore', from: 'pcb:P', to: 'cpu' });
    expect(select.transfer).toBeNull();
    for (const s of [save, restore, select]) {
      expect(s).toMatchObject({ selectedId: 'P', loadedId: 'P', switchIndex: 3, changes: { added: [], removed: [], changed: [] } });
      expect(values(s.registers)).toEqual(example.pcbs.P);
    }
  });

  it('retains scalar types, actual null and absent keys as distinct values during restore', () => {
    const i = instance({ pcbs: {
      P: { x: false, flag: 0, text: 'false', none: null, absentLater: 1 },
      Q: { x: 0, flag: false, text: 'null', none: '', fresh: null },
    }, initialId: 'P', order: ['Q'] });
    const s = contextSwitchSnapshot(i, run('CS', i.input), 1);
    expect(values(s.registers)).toEqual({ x: 0, flag: false, text: 'null', none: '', fresh: null });
    expect(s.changes).toEqual({ added: ['fresh'], removed: ['absentLater'], changed: ['x', 'flag', 'text', 'none'] });
    expect(s.registers.find(cell => cell.key === 'fresh')?.value).toBeNull();
    expect(s.registers.find(cell => cell.key === 'absentLater')).toBeUndefined();
    expect(values(s.pcbs.find(pcb => pcb.id === 'P')!.registers)).toEqual({ x: false, flag: 0, text: 'false', none: null, absentLater: 1 });
  });

  it('reconstructs earlier cursors independently of navigation and never inspects future events or final results', () => {
    const i = instance(), execution = run('CS', i.input), earlier = contextSwitchSnapshot(i, execution, 1);
    Object.defineProperty(execution, 'result', { get: () => { throw new Error('Do not read final context'); } });
    contextSwitchSnapshot(i, execution, 11);
    expect(contextSwitchSnapshot(i, execution, 1)).toEqual(earlier);
    expect(contextSwitchSnapshot(i, execution, -1)).toMatchObject({ selectedId: 'P', loadedId: 'P', transfer: null });
    execution.events[2] = { get data() { throw new Error('Future event'); } } as unknown as SemanticEvent;
    expect(contextSwitchSnapshot(i, execution, 1)).toEqual(earlier);
  });

  it('supports empty order, empty initial registers and IDs that collide with CPU or register names', () => {
    const i = instance({ pcbs: { cpu: { cpu: null }, P: {} }, initialId: 'P', order: [] });
    const empty = contextSwitchSnapshot(i, run('CS', i.input), 0);
    expect(empty).toMatchObject({ phase: 'initial', selectedId: 'P', loadedId: 'P', registers: [], event: null });
    expect(empty.pcbs.map(pcb => pcb.id)).toEqual(['cpu', 'P']);
    const named = instance({ pcbs: { cpu: { cpu: null }, P: {} }, initialId: 'cpu', order: ['cpu'] });
    named.labels.cpu = '표시 이름';
    named.views[0] = { ...named.views[0], target: 'cpu', fields: ['표시 이름'], hidden: true };
    const s = contextSwitchSnapshot(named, run('CS', named.input), 1);
    expect(s).toMatchObject({ selectedId: 'cpu', selectedLabel: '표시 이름', loadedId: 'cpu', loadedLabel: '표시 이름' });
    expect(s.registers[0]).toEqual({ key: 'cpu', value: null, nodeKey: 'cpu-register:cpu' });
    expect(s.pcbs[0].nodeKey).toBe('pcb:cpu');
    expect(s.pcbs[0].registers[0].nodeKey).toBe('pcb-register:cpu:cpu');
    expect(s.transfer).toMatchObject({ from: 'pcb:cpu', to: 'cpu', actor: 'cpu', actorLabel: '표시 이름' });
    expect(s.pcbs).toHaveLength(2);
  });

  it('retains all 256 PCB rows and register fields, full long labels/strings and safe integer extremes', () => {
    const pcbs: Record<string, Record<string, ContextSwitchScalar>> = Object.fromEntries(Array.from({ length: 256 }, (_, n) => [`P${n}`, { r: n }]));
    pcbs.P0 = Object.fromEntries(Array.from({ length: 256 }, (_, n) => [`r${n}`, n === 255 ? 'x'.repeat(256) : n === 0 ? Number.MAX_SAFE_INTEGER : n === 1 ? -Number.MAX_SAFE_INTEGER : n]));
    const i = instance({ pcbs, initialId: 'P255', order: ['P0'] });
    i.labels.P0 = '긴 표시 이름 '.repeat(24);
    const s = contextSwitchSnapshot(i, run('CS', i.input), 1);
    expect(s.pcbs).toHaveLength(256);
    expect(s.registers).toHaveLength(256);
    expect(s.pcbs[0].registers).toHaveLength(256);
    expect(s.pcbs[255].id).toBe('P255');
    expect(s.loadedLabel).toBe(i.labels.P0);
    expect(values(s.registers)).toEqual(pcbs.P0);
    expect(s.changes.added).toHaveLength(256);
    expect(s.changes.removed).toEqual(['r']);
  });

  it('does not mutate input/trace and detaches all returned register cells, flags and event state', () => {
    const i = instance(), execution = run('CS', i.input), original = JSON.stringify({ i, execution });
    freeze(i); freeze(execution);
    const s = contextSwitchSnapshot(i, execution, 1);
    s.registers[0].value = 'different';
    s.pcbs[0].registers[0].value = 'different';
    s.pcbs[0].selected = false;
    s.transfer!.actor = 'different';
    s.changes.added.push('different');
    (s.event!.data.registers as Record<string, unknown>).pc = 'different';
    expect(JSON.stringify({ i, execution })).toBe(original);
    expect(values(contextSwitchSnapshot(i, execution, 1).registers)).toEqual(example.pcbs.Q);
  });

  it('rejects invalid input references and stale CPU/PCB/current snapshots without inventing execution', () => {
    expect(() => contextSwitchSnapshot(instance({ ...example, initialId: 'missing' }), null, -1)).toThrow('초기 PCB');
    expect(() => contextSwitchSnapshot(instance({ ...example, order: ['missing'] }), null, -1)).toThrow('교환할 PCB');
    expect(() => contextSwitchSnapshot(instance({ pcbs: {}, initialId: 'P', order: [] }), null, -1)).toThrow();
    expect(() => contextSwitchSnapshot(instance({ ...example, operations: [] }), null, -1)).toThrow();
    expect(() => contextSwitchSnapshot(instance(), null, 0.5)).toThrow('위치');
    const i = instance(), execution = run('CS', i.input);
    const stale = (change: (trace: ModelRun) => void, cursor: number) => {
      const trace = structuredClone(execution); change(trace);
      expect(() => contextSwitchSnapshot(i, trace, cursor)).toThrow();
    };
    stale(trace => { trace.events[0].kind = 'restore'; }, 0);
    stale(trace => { trace.events[0].actor = null; }, 0);
    stale(trace => { trace.events[1].actor = 'P'; }, 1);
    stale(trace => { trace.events[1].step = 2; }, 1);
    stale(trace => { trace.events[1].data.current = 'Q'; }, 1);
    stale(trace => { (trace.events[1].data.registers as Record<string, unknown>).pc = 21; }, 1);
    stale(trace => { (trace.events[1].data.registers as Record<string, unknown>).flag = false; }, 1);
    stale(trace => { ((trace.events[0].data.pcbs as Record<string, unknown>).P as Record<string, unknown>).pc = 999; }, 0);
    stale(trace => { (trace.events[2].data.pcbs as Record<string, unknown>).Extra = {}; }, 2);
    stale(trace => { trace.events[2].data.time = 1; }, 2);
  });

  it('keeps automatic explanations about phases without exposing hidden IDs, keys or scalar values', () => {
    const i = instance(), execution = run('CS', i.input);
    i.labels.P = 'private-process-name';
    for (let cursor = -1; cursor < execution.events.length; cursor++) {
      const summary = contextSwitchSnapshot(i, execution, cursor).summary;
      expect(summary).not.toMatch(/[0-9]/);
      expect(summary).not.toContain('private-process-name');
      expect(summary).not.toContain('flag');
      expect(summary).not.toContain('user');
    }
    expect(contextSwitchSnapshot(i, execution, 1).summary).toContain('다음 단계');
    expect(contextSwitchSnapshot(i, execution, 2).summary).toContain('선택했습니다');
  });
});
