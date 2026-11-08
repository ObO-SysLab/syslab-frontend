import { describe, expect, it } from 'vitest';
import { createInstance } from '../runtime/document.mjs';
import type { SimulationInstance } from '../runtime/document.mjs';
import { run } from '../runtime/index.mjs';
import type { ModelRun } from '../runtime/index.mjs';
import { projection, semanticLinks } from '../runtime/projection.mjs';
import { createView } from '../runtime/document.mjs';
import { kernelSnapshot, type KernelModel } from './kernelModel';

type Input = SimulationInstance['input'];
const contexts = () => ({ P: { pc: 42, sp: 4096, flag: false }, Q: { pc: 8, sp: 2048 }, R: { pc: 120, sp: 8192 } });
const input = (scenario: string, extra: Input = {}): Input => ({ scenario, current: 'P', blocked: 'Q', contexts: contexts(), at: 7, returnValue: 0, ...extra });
function setup(model: KernelModel, value: Input) {
  const instance: SimulationInstance = { ...createInstance(model), input: structuredClone(value) };
  const execution = run(model, instance.input);
  const at = (cursor: number) => kernelSnapshot(instance, execution, cursor);
  return { instance, execution, at };
}
const states = (s: ReturnType<typeof kernelSnapshot>) => Object.fromEntries(s.contexts.map(c => [c.id, c.state]));

describe('K-SYSCALL display follows the observed prefix only', () => {
  it('starts in user mode with the engine initial states and no return value', () => {
    const { instance, at } = setup('K-SYSCALL', input('syscall'));
    const s = at(-1);
    expect(s).toMatchObject({ mode: 'user', phase: 'initial', current: 'P', eventActor: null, returnValue: null, transition: null, event: null });
    expect(states(s)).toEqual({ P: 'Running', Q: 'Waiting', R: 'Ready' });
    expect(s).toEqual(kernelSnapshot(instance, null, -1));
  });

  it('keeps kernel mode at return and only returns to user mode at restore', () => {
    const { execution, at } = setup('K-SYSCALL', input('syscall', { returnValue: 0 }));
    expect(execution.events.map(e => e.kind)).toEqual(['enter', 'save', 'service', 'return', 'restore']);
    expect(at(0)).toMatchObject({ mode: 'kernel', phase: 'enter', transition: 'enter', returnValue: null });
    expect(at(2)).toMatchObject({ mode: 'kernel', phase: 'service', transition: null, returnValue: null });
    // 0 is a real return value, distinct from "not yet decided".
    expect(at(3)).toMatchObject({ mode: 'kernel', phase: 'return', transition: null, returnValue: 0, current: 'P' });
    expect(at(4)).toMatchObject({ mode: 'user', phase: 'restore', transition: 'exit', returnValue: 0, current: 'P' });
  });

  it('shows -1 for error regardless of the configured return value', () => {
    const { at } = setup('K-SYSCALL', input('error', { returnValue: 91 }));
    expect(at(2).returnValue).toBeNull();
    expect(at(3)).toMatchObject({ phase: 'return', returnValue: -1, mode: 'kernel' });
  });

  it('blocking ends in kernel with no current and does not run another Ready context', () => {
    const { execution, at } = setup('K-SYSCALL', input('blocking'));
    expect(execution.events.map(e => e.kind)).toEqual(['enter', 'save', 'service', 'block']);
    const s = at(3);
    expect(s).toMatchObject({ mode: 'kernel', phase: 'block', current: null, eventActor: 'P', transition: null, returnValue: null });
    expect(states(s)).toEqual({ P: 'Waiting', Q: 'Waiting', R: 'Ready' });
    expect(s.contexts.find(c => c.id === 'P')).toMatchObject({ current: false, eventActor: true });
  });

  it('never changes context values during save/restore', () => {
    const { at } = setup('K-SYSCALL', input('syscall'));
    const initial = at(-1).contexts.map(c => c.registers);
    for (const cursor of [0, 1, 2, 3, 4]) expect(at(cursor).contexts.map(c => c.registers)).toEqual(initial);
    expect(at(1).contexts.find(c => c.id === 'P')?.registers).toEqual([{ key: 'pc', value: 42 }, { key: 'sp', value: 4096 }, { key: 'flag', value: false }]);
  });

  it('preserves scalar values, inherited-name IDs and own labels only', () => {
    const value = input('syscall', { current: 'toString', contexts: { toString: { zero: 0, flag: false, nullable: null, empty: '', text: 'null', '0raw': 7 }, Q: {}, R: { long: '문맥 값 '.repeat(45) } }, at: Number.MAX_SAFE_INTEGER, returnValue: -Number.MAX_SAFE_INTEGER });
    const { instance, execution } = setup('K-SYSCALL', value);
    instance.labels = { Q: '대기 프로세스' };
    const s = kernelSnapshot(instance, execution, 3);
    expect(s).toMatchObject({ current: 'toString', currentLabel: 'toString', returnValue: -Number.MAX_SAFE_INTEGER });
    const self = s.contexts.find(c => c.id === 'toString')!;
    expect(self.registers.map(r => r.value)).toEqual([0, false, null, '', 'null', 7]);
    expect(s.contexts.find(c => c.id === 'Q')).toMatchObject({ label: '대기 프로세스', registers: [] });
    expect(s.contexts.find(c => c.id === 'R')!.registers[0].value).toBe('문맥 값 '.repeat(45));
  });

  it('rejects stale or altered traces instead of drawing a wrong state', () => {
    const { instance, execution } = setup('K-SYSCALL', input('syscall'));
    const altered = structuredClone(execution) as ModelRun;
    (altered.events[3].data as Record<string, unknown>).mode = 'user';
    expect(() => kernelSnapshot(instance, altered, 3)).toThrow();
    const otherInput = { ...instance, input: input('blocking') };
    expect(() => kernelSnapshot(otherInput, execution, 3)).toThrow();
    const changedContext = structuredClone(execution) as ModelRun;
    ((changedContext.events[1].data as { contexts: Record<string, Record<string, unknown>> }).contexts.P).pc = 43;
    expect(() => kernelSnapshot(instance, changedContext, 1)).toThrow();
  });
});

describe('K-INTERRUPT display keeps current and event actor apart', () => {
  it('io unblock makes Q Ready while P stays current, then restores P', () => {
    const { execution, at } = setup('K-INTERRUPT', input('io'));
    expect(execution.events.map(e => e.kind)).toEqual(['interrupt', 'save', 'handle', 'unblock', 'restore']);
    expect(at(0)).toMatchObject({ mode: 'kernel', transition: 'enter' });
    const s = at(3);
    expect(s).toMatchObject({ phase: 'unblock', current: 'P', eventActor: 'Q', mode: 'kernel' });
    expect(states(s)).toEqual({ P: 'Running', Q: 'Ready', R: 'Ready' });
    expect(at(4)).toMatchObject({ mode: 'user', transition: 'exit', current: 'P' });
  });

  it('timer selects the first other Ready context in key order', () => {
    const { at } = setup('K-INTERRUPT', input('timer'));
    const s = at(3);
    expect(s).toMatchObject({ phase: 'select', current: 'R', eventActor: 'R', switched: true });
    expect(states(s)).toEqual({ P: 'Ready', Q: 'Waiting', R: 'Running' });
  });

  it('timer falls back to the same context when no other is Ready', () => {
    const { at } = setup('K-INTERRUPT', input('timer', { contexts: { P: { pc: 42 }, Q: { pc: 8 } } }));
    expect(at(3)).toMatchObject({ phase: 'select', current: 'P', switched: false });
    expect(states(at(3))).toEqual({ P: 'Running', Q: 'Waiting' });
  });

  it('handles 256 contexts without truncation', () => {
    const many = Object.fromEntries(Array.from({ length: 256 }, (_, i) => [`P${i}`, { pc: i }]));
    const { at } = setup('K-INTERRUPT', input('timer', { current: 'P0', blocked: 'P1', contexts: many }));
    const s = at(4);
    expect(s.contexts).toHaveLength(256);
    expect(s.contexts.at(-1)).toMatchObject({ id: 'P255', registers: [{ key: 'pc', value: 255 }] });
    expect(s.current).toBe('P2');
  });
});

describe('generic kernel views follow the actual mode changes', () => {
  it('relation links: entry at enter/interrupt, return only at restore', () => {
    const sys = setup('K-SYSCALL', input('syscall'));
    expect(semanticLinks(sys.instance, sys.execution, 3).map(l => l.kind)).toEqual(['진입']);
    expect(semanticLinks(sys.instance, sys.execution, 4).map(l => l.kind)).toEqual(['진입', '복귀']);
    const irq = setup('K-INTERRUPT', input('io'));
    expect(semanticLinks(irq.instance, irq.execution, 0).map(l => [l.from, l.to, l.kind])).toEqual([['사용자 영역', '커널 영역', '진입']]);
  });

  it('actor view shows the engine initial states before the first event', () => {
    const { instance, execution } = setup('K-SYSCALL', input('syscall'));
    const rows = projection(instance, execution, -1, createView('actor')).rows;
    expect(rows).toEqual([['P', '실행'], ['Q', '대기'], ['R', '준비']]);
  });

  it('new documents start with one integrated record and a lower annotation', () => {
    for (const model of ['K-SYSCALL', 'K-INTERRUPT'] as const) {
      const views = createInstance(model).views;
      expect(views.map(v => [v.role, v.width, v.height])).toEqual([['record', 900, 500], ['annotation', views[1].width, views[1].height]]);
    }
  });
});
