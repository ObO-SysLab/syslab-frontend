import { checkShape, registry } from '../runtime/index.mjs';
import type { ModelRun, SemanticEvent } from '../runtime/index.mjs';
import type { SimulationInstance } from '../runtime/document.mjs';

export type KernelModel = 'K-SYSCALL' | 'K-INTERRUPT';
export type KernelMode = 'user' | 'kernel';
export type KernelState = 'Running' | 'Ready' | 'Waiting';
export type KernelKind = 'enter' | 'interrupt' | 'save' | 'service' | 'handle' | 'return' | 'block' | 'unblock' | 'select' | 'restore';
export type KernelPhase = 'initial' | KernelKind;
export type KernelScalar = string | number | boolean | null;
export interface KernelRegister { key: string; value: KernelScalar }
export interface KernelContext {
  id: string;
  label: string;
  nodeKey: string;
  state: KernelState;
  registers: KernelRegister[];
  /** The context the CPU currently executes (event.data.current), not the event's actor. */
  current: boolean;
  /** The actor of the current event; it can differ from current (unblock) or be no longer running (block). */
  eventActor: boolean;
}
export interface KernelSnapshot {
  model: KernelModel;
  scenario: string;
  mode: KernelMode;
  phase: KernelPhase;
  current: string | null;
  currentLabel: string | null;
  eventActor: string | null;
  eventActorLabel: string | null;
  contexts: KernelContext[];
  /** null until the engine sets it at the `return` event; 0 is a real value. */
  returnValue: number | null;
  /** Mode change performed by the current event only: enter/interrupt → 'enter', restore → 'exit'. */
  transition: 'enter' | 'exit' | null;
  /** timer select: whether another Ready context took over (false = fallback to the same context). */
  switched: boolean | null;
  at: number;
  event: SemanticEvent | null;
  summary: string;
}

interface Input { scenario: string; current: string; blocked: string; contexts: Record<string, Record<string, KernelScalar>>; at: number; returnValue: number }
interface EventData { mode: KernelMode; current: string | null; contexts: Record<string, Record<string, KernelScalar>>; states: Record<string, KernelState>; returnValue: number | null }
interface Expected { kind: KernelKind; actor: string; mode: KernelMode; current: string | null; states: Record<string, KernelState>; returnValue: number | null }

function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`커널 흐름 표시: ${message}`);
}
const isKernelModel = (id: string): id is KernelModel => id === 'K-SYSCALL' || id === 'K-INTERRUPT';

/** The same deterministic sequence as runtime/flows.mjs kernelFlow, used to validate an observed prefix. */
function expectedEvents(input: Input): Expected[] {
  const out: Expected[] = [];
  const states: Record<string, KernelState> = Object.fromEntries(Object.keys(input.contexts).map(id => [id, id === input.current ? 'Running' : id === input.blocked ? 'Waiting' : 'Ready']));
  let current: string | null = input.current, mode: KernelMode = 'kernel', returnValue: number | null = null;
  const push = (kind: KernelKind, actor: string) => out.push({ kind, actor, mode, current, states: { ...states }, returnValue });
  const interrupt = input.scenario === 'io' || input.scenario === 'timer';
  push(interrupt ? 'interrupt' : 'enter', current); push('save', current);
  if (input.scenario === 'io') { push('handle', current); states[input.blocked] = 'Ready'; push('unblock', input.blocked); }
  else if (input.scenario === 'timer') {
    push('handle', current); const previous = current; states[previous] = 'Ready';
    current = Object.keys(states).find(id => id !== previous && states[id] === 'Ready') ?? previous;
    states[current] = 'Running'; push('select', current);
  } else {
    push('service', current);
    if (input.scenario === 'blocking') { const previous = current; states[previous] = 'Waiting'; current = null; push('block', previous); return out; }
    returnValue = input.scenario === 'error' ? -1 : input.returnValue; push('return', current);
  }
  mode = 'user'; push('restore', current!);
  return out;
}

const sameContexts = (a: Input['contexts'], b: Input['contexts']) => {
  const ak = Object.keys(a), bk = Object.keys(b);
  return ak.length === bk.length && ak.every((id, i) => id === bk[i] && Object.hasOwn(b, id)
    && Object.keys(a[id]).length === Object.keys(b[id]).length && Object.keys(a[id]).every(key => Object.hasOwn(b[id], key) && Object.is(a[id][key], b[id][key])));
};
const sameStates = (a: Record<string, KernelState>, b: Record<string, KernelState>) => Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(id => Object.hasOwn(b, id) && a[id] === b[id]);

/** Reconstruct mode, current and event actor for the observed prefix only; never reads execution.result. */
export function kernelSnapshot(instance: SimulationInstance, execution: ModelRun | null, cursor: number): KernelSnapshot {
  const model = instance.scenarioId;
  requireValue(isKernelModel(model), '커널 흐름 모델이 아닙니다.');
  requireValue(Number.isInteger(cursor), '현재 사건 위치를 확인하세요.');
  requireValue(execution === null || execution.id === model, '실행 기록의 모델이 다릅니다.');
  checkShape(registry[model].inputSchema, instance.input, 'input');
  const input = instance.input as unknown as Input;
  requireValue(input.current !== input.blocked, '실행 대상과 대기 대상은 달라야 합니다.');
  requireValue(Object.hasOwn(input.contexts, input.current) && Object.hasOwn(input.contexts, input.blocked), '실행·대기 대상의 문맥이 없습니다.');
  const label = (id: string) => Object.hasOwn(instance.labels, id) ? instance.labels[id] : id;
  const expected = expectedEvents(input);
  const events = execution?.events.slice(0, Math.max(0, cursor + 1)) ?? [];
  requireValue(events.length <= expected.length, '사건 수가 입력의 흐름보다 많습니다.');
  for (const [position, event] of events.entries()) {
    checkShape(registry[model].eventSchema, event, 'event');
    const data = event.data as unknown as EventData, want = expected[position];
    requireValue(event.step === position && event.kind === want.kind && event.actor === want.actor, '사건 순서나 주체가 입력의 흐름과 다릅니다.');
    requireValue(data.mode === want.mode && data.current === want.current && Object.is(data.returnValue, want.returnValue), '모드·실행 주체·반환값이 기록과 다릅니다.');
    requireValue(sameStates(data.states, want.states), '주체 상태가 기록과 다릅니다.');
    requireValue(sameContexts(data.contexts, input.contexts), '문맥 값은 사건 중에 바뀌지 않아야 합니다.');
  }
  const last = events.at(-1), want = last ? expected[events.length - 1] : null;
  const states: Record<string, KernelState> = want?.states ?? Object.fromEntries(Object.keys(input.contexts).map(id => [id, id === input.current ? 'Running' : id === input.blocked ? 'Waiting' : 'Ready']));
  const mode: KernelMode = want?.mode ?? 'user', current = want ? want.current : input.current;
  const phase: KernelPhase = want?.kind ?? 'initial', eventActor = want?.actor ?? null;
  const previousCurrent = events.length > 1 ? expected[events.length - 2].current : null;
  const switched = phase === 'select' ? current !== previousCurrent : null;
  const contexts = Object.keys(input.contexts).map(id => ({
    id, label: label(id), nodeKey: `context:${id}`, state: states[id],
    registers: Object.keys(input.contexts[id]).map(key => ({ key, value: input.contexts[id][key] })),
    current: id === current, eventActor: id === eventActor,
  }));
  const summaries: Record<KernelPhase, string> = {
    initial: '사용자 영역에서 실행 중입니다. 사건을 진행하면 커널 영역으로 들어갑니다.',
    enter: '시스템 호출로 커널 영역에 들어왔습니다. 실행 주체는 그대로입니다.',
    interrupt: '인터럽트가 발생해 커널 영역으로 들어왔습니다. 실행 주체는 그대로입니다.',
    save: '커널이 실행 주체의 문맥을 저장하는 단계입니다. 문맥 값은 바뀌지 않습니다.',
    service: '커널이 요청을 처리하고 있습니다.',
    handle: '커널이 인터럽트 핸들러를 실행하고 있습니다.',
    return: '반환값이 준비되었습니다. 아직 커널 영역에서 처리 중입니다.',
    block: '요청한 주체가 대기 상태가 되었습니다. 지금 실행 중인 주체는 없습니다.',
    unblock: '대기가 풀려 준비 상태가 되었습니다. 현재 실행 주체는 유지됩니다.',
    select: switched ? '다른 준비 주체가 실행 대상으로 선택되었습니다.' : '다른 준비 주체가 없어 같은 주체가 계속 실행됩니다.',
    restore: '문맥을 복원하고 사용자 영역으로 돌아왔습니다.',
  };
  return {
    model, scenario: input.scenario, mode, phase, current, currentLabel: current === null ? null : label(current),
    eventActor, eventActorLabel: eventActor === null ? null : label(eventActor), contexts,
    returnValue: want?.returnValue ?? null,
    transition: phase === 'enter' || phase === 'interrupt' ? 'enter' : phase === 'restore' ? 'exit' : null,
    switched, at: input.at, event: last ? structuredClone(last) : null, summary: summaries[phase],
  };
}
