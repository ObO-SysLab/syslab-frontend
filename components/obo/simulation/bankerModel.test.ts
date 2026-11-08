import { describe, expect, it } from 'vitest';
import { createInstance } from '../runtime/document.mjs';
import type { SimulationInstance } from '../runtime/document.mjs';
import { grade, run } from '../runtime/index.mjs';
import { bankerSnapshot } from './bankerModel';

const classic = {
  actors: ['P0', 'P1', 'P2', 'P3', 'P4'], resources: ['A', 'B', 'C'], available: [3, 3, 2],
  allocated: [[0, 1, 0], [2, 0, 0], [3, 0, 2], [2, 1, 1], [0, 0, 2]],
  max: [[7, 5, 3], [3, 2, 2], [9, 0, 2], [2, 2, 2], [4, 3, 3]], request: null,
};
function instance(input: SimulationInstance['input'] = classic): SimulationInstance {
  return { ...createInstance('BK'), input: structuredClone(input) };
}
function freeze(value: unknown): void {
  if (value !== null && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
}

describe('Banker visual meaning from the selected trace prefix', () => {
  it('keeps the authored initial state before any event without revealing final results', () => {
    const i = instance(), execution = run('BK', i.input);
    const s = bankerSnapshot(i, execution, -1);
    expect(s.available).toEqual([3, 3, 2]);
    expect(s.work).toEqual([3, 3, 2]);
    expect(s.rows.map(row => row.need)).toEqual([[7, 4, 3], [1, 2, 2], [6, 0, 0], [0, 1, 1], [4, 3, 1]]);
    expect(s.rows.map(row => row.eligible)).toEqual([false, true, false, true, false]);
    expect(s.rows[0].deficits).toEqual([4, 1, 1]);
    expect(s.completedSequence).toEqual([]);
    expect(s.finalSafety).toBeNull();
    expect(s.granted).toBeNull();
    expect(s.current).toBeNull();
    expect(s.requestPhase).toBe('none');
  });

  it('shows only actual finishes, returns resources to Work and keeps Available unchanged', () => {
    const i = instance(), execution = run('BK', i.input);
    const checking = bankerSnapshot(i, execution, 0);
    expect(checking.rows.find(row => row.actor === 'P1')).toMatchObject({ current: true, finished: false, eligible: true });
    const finished = bankerSnapshot(i, execution, 1);
    expect(finished.work).toEqual([5, 3, 2]);
    expect(finished.available).toEqual([3, 3, 2]);
    expect(finished.returned).toEqual([2, 0, 0]);
    expect(finished.rows.find(row => row.actor === 'P1')).toMatchObject({ finished: true, eligible: false, allocated: [2, 0, 0] });
    expect(finished.rows.find(row => row.actor === 'P4')?.eligible).toBe(true);
    expect(finished.completedSequence).toEqual(['P1']);
    expect(finished.finalSafety).toBeNull();
    expect(bankerSnapshot(i, execution, 2).returned).toEqual([0, 0, 0]);
  });

  it('supports exact Need=Work, zero Need, and zero returned allocation', () => {
    const i = instance({ actors: ['P', 'Q'], resources: ['R'], available: [1], allocated: [[0], [0]], max: [[1], [0]], request: null });
    const execution = run('BK', i.input);
    expect(bankerSnapshot(i, execution, -1).rows.map(row => row.eligible)).toEqual([true, true]);
    expect(bankerSnapshot(i, execution, 1).returned).toEqual([0]);
    expect(bankerSnapshot(i, execution, 3).finalSafety).toBe(true);
  });

  it('uses an alternative valid trace sequence and does not expose its future finishes', () => {
    const i = instance(), sequence = ['P3', 'P1', 'P4', 'P0', 'P2'];
    const execution = run('BK', i.input, { preferredSequence: sequence });
    expect(grade('BK', i.input, 'process', JSON.stringify({ v: 1, result: execution.result, events: execution.events })).correct).toBe(true);
    expect(bankerSnapshot(i, execution, 1).completedSequence).toEqual(['P3']);
    expect(bankerSnapshot(i, execution, execution.events.length - 1).completedSequence).toEqual(sequence);
    expect(bankerSnapshot(i, execution, execution.events.length - 1).finalSafety).toBe(true);
    expect(bankerSnapshot(i, execution, 0).completedSequence).toEqual([]);
    expect(bankerSnapshot(i, execution, 0).finalSafety).toBeNull();
    expect(bankerSnapshot(i, execution, -1).rows.every(row => !row.finished && !row.current)).toBe(true);
  });

  it('distinguishes a denied unavailable request from a safe original state', () => {
    const i = instance({ actors: ['P', 'Q'], resources: ['R'], available: [0], allocated: [[1], [0]], max: [[1], [1]], request: { actor: 'Q', values: [1] } });
    const execution = run('BK', i.input);
    expect(execution.result).toEqual({ safe: true, sequence: ['P', 'Q'], granted: false });
    expect(bankerSnapshot(i, execution, -1).requestPhase).toBe('pending');
    expect(bankerSnapshot(i, execution, 0).requestPhase).toBe('requested');
    expect(bankerSnapshot(i, execution, 1)).toMatchObject({ requestPhase: 'denied-unavailable', tentative: false, finalSafety: null, granted: null });
    const last = bankerSnapshot(i, execution, execution.events.length - 1);
    expect(last).toMatchObject({ requestPhase: 'denied-unavailable', finalSafety: true, granted: false });
    expect(last.summary).toContain('기존 상태');
    expect(last.summary).toContain('거절');
  });

  it('reconstructs tentative allocation on an unsafe request without pretending rollback or commitment', () => {
    const i = instance({ ...classic, request: { actor: 'P4', values: [3, 3, 0] } });
    const execution = run('BK', i.input);
    const requested = bankerSnapshot(i, execution, 0);
    expect(requested.rows[4].allocated).toEqual([0, 0, 2]);
    const checking = bankerSnapshot(i, execution, 1);
    expect(checking).toMatchObject({ requestPhase: 'testing', tentative: true, finalSafety: null });
    expect(checking.available).toEqual([0, 0, 2]);
    expect(checking.rows[4].need).toEqual([1, 0, 1]);
    expect(checking.rows[4].allocated).toEqual([3, 3, 2]);
    const denied = bankerSnapshot(i, execution, 2);
    expect(denied).toMatchObject({ requestPhase: 'denied-unsafe', tentative: true, finalSafety: false, granted: false });
    expect(denied.rows[4].allocated).toEqual([3, 3, 2]);
    expect(denied.summary).toContain('가정');
    expect(denied.summary).toContain('교착 확정은 아닙니다');
    expect(denied.completedSequence).toEqual([]);
  });

  it('does not treat an unsafe result as every row being blocked or invent partial finish events', () => {
    const i = instance({ actors: ['P', 'Q'], resources: ['R'], available: [0], allocated: [[1], [0]], max: [[1], [2]], request: null });
    const execution = run('BK', i.input);
    const s = bankerSnapshot(i, execution, 0);
    expect(s.finalSafety).toBe(false);
    expect(s.rows[0].eligible).toBe(true);
    expect(s.rows[1].eligible).toBe(false);
    expect(s.completedSequence).toEqual([]);
    expect(s.rows.every(row => !row.finished)).toBe(true);
    expect(s.work).toEqual([0]);
    expect(s.returned).toEqual([0]);
    expect(s.summary).toContain('전체 완료 순서');
    expect(s.summary).toContain('교착을 확정하지');
  });

  it('marks a permitted request only at the end and retains its tentative values during checking', () => {
    const i = instance({ actors: ['P', 'Q'], resources: ['R'], available: [1], allocated: [[1], [1]], max: [[2], [2]], request: { actor: 'P', values: [1] } });
    const execution = run('BK', i.input);
    expect(bankerSnapshot(i, execution, 1)).toMatchObject({ requestPhase: 'testing', tentative: true, granted: null, finalSafety: null });
    const s = bankerSnapshot(i, execution, execution.events.length - 1);
    expect(s).toMatchObject({ requestPhase: 'granted', tentative: false, granted: true, finalSafety: true });
    expect(s.rows[0].allocated).toEqual([2]);
    expect(s.work).toEqual([3]);
    expect(s.available).toEqual([0]);
  });

  it('never mutates input, execution or labels, and returns detached data', () => {
    const i = instance();
    i.labels.P1 = '프로세스의 아주 긴 이름'; i.labels.A = '주기억장치';
    const execution = run('BK', i.input), before = JSON.stringify({ i, execution });
    freeze(i); freeze(execution);
    const s = bankerSnapshot(i, execution, 1);
    expect(s.rows[1].label).toBe('프로세스의 아주 긴 이름');
    expect(s.resourceLabels[0]).toBe('주기억장치');
    s.work[0] = 99; s.rows[0].need[0] = 99;
    if (s.current) s.current.data.work = [99];
    expect(JSON.stringify({ i, execution })).toBe(before);
    expect(bankerSnapshot(i, execution, 1).work).toEqual([5, 3, 2]);
  });

  it('preserves all 100 rows and columns and exact large values without silently truncating', () => {
    const actors = Array.from({ length: 100 }, (_, n) => `P${n}`);
    const resources = Array.from({ length: 100 }, (_, n) => `R${n}`);
    const i = instance({ actors, resources, available: resources.map(() => Number.MAX_SAFE_INTEGER),
      allocated: actors.map(() => resources.map(() => 0)), max: actors.map(() => resources.map(() => Number.MAX_SAFE_INTEGER)), request: null });
    const s = bankerSnapshot(i, null, -1);
    expect(s.rows).toHaveLength(100); expect(s.resources).toHaveLength(100);
    expect(s.rows[99].need).toHaveLength(100);
    expect(s.rows[99].need[99]).toBe(Number.MAX_SAFE_INTEGER);
    expect(s.rows.every(row => row.eligible)).toBe(true);
  });

  it('reports malformed drafts explicitly instead of filling missing dimensions or negative values', () => {
    const bad = [
      { ...classic, available: [1] }, { ...classic, allocated: [[0]] },
      { ...classic, actors: ['P', 'P'] }, { ...classic, available: [-1, 0, 0] },
      { ...classic, request: { actor: 'absent', values: [0, 0, 0] } },
      { ...classic, request: { actor: 'P1', values: [100, 0, 0] } },
      { ...classic, max: classic.max.map(row => row.map(() => 0)) },
    ];
    for (const input of bad) expect(() => bankerSnapshot(instance(input), null, -1)).toThrow('은행원 표시:');
    expect(() => bankerSnapshot(instance(), null, Number.NaN)).toThrow('사건 위치');
    const i = instance(), execution = run('BK', i.input);
    execution.events[0].data.need = [[0]];
    expect(() => bankerSnapshot(i, execution, 0)).toThrow('Need');
  });

  it('keeps the initial state when a trace is absent or has no recorded events', () => {
    const i = instance();
    expect(bankerSnapshot(i, null, 99)).toMatchObject({ finalSafety: null, completedSequence: [], current: null });
    expect(bankerSnapshot(i, run('BK', i.input, { record: false }), 99)).toMatchObject({ finalSafety: null, granted: null, completedSequence: [], current: null });
  });
});
