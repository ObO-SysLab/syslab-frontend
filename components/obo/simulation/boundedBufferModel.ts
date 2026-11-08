import { checkShape, registry } from '../runtime/index.mjs';
import type { ModelRun, SemanticEvent } from '../runtime/index.mjs';
import type { SimulationInstance } from '../runtime/document.mjs';

export type BoundedBufferScalar = string | number | boolean | null;
export type BoundedBufferPhase = 'initial' | 'acquire' | 'wait' | 'wake' | 'put' | 'take' | 'release';
export type BoundedBufferAction = 'token' | 'mutex' | 'put' | 'take' | 'release';
export type BoundedBufferResource = 'empty' | 'full' | 'mutex';
export type BoundedBufferStopReason = 'ready' | 'running' | 'scheduleEnd' | 'blocked' | 'deadlocked';
type Role = 'producer' | 'consumer';
type Policy = 'correct' | 'lock-first';
interface ActorState { role: Role; pc: number; blocked: boolean }
interface Semaphores { empty: number; full: number; mutex: string | null }
export interface BoundedBufferActor extends ActorState {
  id: string;
  label: string;
  nodeKey: string;
  active: boolean;
  nextAction: BoundedBufferAction;
  waitFor: BoundedBufferResource | null;
}
export interface BoundedBufferSlot {
  index: number;
  nodeKey: string;
  occupied: boolean;
  /** An occupied null value is distinct from a vacant slot; always inspect occupied. */
  value: BoundedBufferScalar;
}
export interface BoundedBufferCurrent {
  actor: string;
  actorLabel: string;
  stage: BoundedBufferAction;
  resource: BoundedBufferResource | null;
  resources: BoundedBufferResource[];
  beforePc: number;
  afterPc: number;
}
export interface BoundedBufferTransfer {
  kind: 'put' | 'take';
  from: string;
  to: string;
  actor: string;
  actorLabel: string;
  payload: BoundedBufferScalar;
  slotIndex: number;
}
export interface BoundedBufferSnapshot {
  capacity: number;
  policy: Policy;
  phase: BoundedBufferPhase;
  buffer: BoundedBufferScalar[];
  slots: BoundedBufferSlot[];
  actors: BoundedBufferActor[];
  semaphores: Semaphores;
  mutexOwnerLabel: string | null;
  current: BoundedBufferCurrent | null;
  transfer: BoundedBufferTransfer | null;
  stopReason: BoundedBufferStopReason;
  event: SemanticEvent | null;
  summary: string;
}

interface Input {
  capacity: number;
  initial: BoundedBufferScalar[];
  actors: { id: string; role: Role }[];
  order: string[];
  policy: Policy;
}
interface EventData {
  buffer: BoundedBufferScalar[];
  actors: Record<string, ActorState>;
  semaphores: Semaphores;
  stopReason: Exclude<BoundedBufferStopReason, 'ready'>;
}
function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`생산자·소비자 표시: ${message}`);
}
const token = (actor: ActorState): 'empty' | 'full' => actor.role === 'producer' ? 'empty' : 'full';
const releasedToken = (actor: ActorState): 'empty' | 'full' => actor.role === 'producer' ? 'full' : 'empty';
function action(actor: ActorState, policy: Policy): BoundedBufferAction {
  if (actor.pc === 0) return policy === 'correct' ? 'token' : 'mutex';
  if (actor.pc === 1) return policy === 'correct' ? 'mutex' : 'token';
  return actor.pc === 2 ? actor.role === 'producer' ? 'put' : 'take' : 'release';
}
function resourceFor(actor: ActorState, policy: Policy): BoundedBufferResource | null {
  const stage = action(actor, policy);
  return stage === 'token' ? token(actor) : stage === 'mutex' ? 'mutex' : null;
}
function canProceed(actor: ActorState, policy: Policy, semaphores: Semaphores): boolean {
  const resource = resourceFor(actor, policy);
  return resource === 'mutex' ? semaphores.mutex === null : resource ? semaphores[resource] > 0 : true;
}
function terminalReason(actors: Record<string, ActorState>, policy: Policy, semaphores: Semaphores): EventData['stopReason'] {
  if (Object.values(actors).some(actor => canProceed(actor, policy, semaphores))) return 'scheduleEnd';
  const owner = semaphores.mutex === null ? null : actors[semaphores.mutex];
  return owner && action(owner, policy) === 'token'
    && Object.values(actors).some(actor => actor.role !== owner.role && action(actor, policy) === 'mutex') ? 'deadlocked' : 'blocked';
}
function sameActors(a: Record<string, ActorState>, b: Record<string, ActorState>): boolean {
  return Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(id => Object.hasOwn(b, id)
    && a[id].role === b[id].role && a[id].pc === b[id].pc && a[id].blocked === b[id].blocked);
}

/** A display snapshot of the observed prefix; no final result or unobserved event is consulted. */
export function boundedBufferSnapshot(instance: SimulationInstance, execution: ModelRun | null, cursor: number): BoundedBufferSnapshot {
  requireValue(instance.scenarioId === 'PC', '생산자·소비자 모델이 아닙니다.');
  requireValue(Number.isInteger(cursor), '현재 사건 위치를 확인하세요.');
  requireValue(execution === null || execution.id === 'PC', '실행 기록의 모델이 다릅니다.');
  checkShape(registry.PC.inputSchema, instance.input, 'input');
  const input = instance.input as unknown as Input;
  requireValue(new Set(input.actors.map(actor => actor.id)).size === input.actors.length, '주체 ID가 중복됩니다.');
  requireValue(input.initial.length <= input.capacity, '초기 버퍼가 용량을 초과합니다.');
  let actors: Record<string, ActorState> = Object.fromEntries(input.actors.map(actor => [actor.id, { role: actor.role, pc: 0, blocked: false }]));
  requireValue(input.order.every(id => Object.hasOwn(actors, id)), '행동할 주체가 없습니다.');
  let buffer = [...input.initial];
  let semaphores: Semaphores = { empty: input.capacity - buffer.length, full: buffer.length, mutex: null };
  const label = (id: string) => Object.hasOwn(instance.labels, id) ? instance.labels[id] : id;
  let phase: BoundedBufferPhase = 'initial', stopReason: BoundedBufferStopReason = 'ready';
  let current: BoundedBufferCurrent | null = null, transfer: BoundedBufferTransfer | null = null;
  const events = execution?.events.slice(0, Math.max(0, cursor + 1)) ?? [];
  for (const [position, event] of events.entries()) {
    checkShape(registry.PC.eventSchema, event, 'event');
    requireValue(position < input.order.length && event.step === position && event.actor === input.order[position], '사건 순서나 주체가 입력과 다릅니다.');
    const id = input.order[position], actor = actors[id], stage = action(actor, input.policy);
    const resource = resourceFor(actor, input.policy), beforePc = actor.pc, wasBlocked = actor.blocked;
    let expectedPhase: Exclude<BoundedBufferPhase, 'initial'>;
    actor.blocked = false;
    transfer = null;
    if (!canProceed(actor, input.policy, semaphores)) {
      actor.blocked = true;
      expectedPhase = 'wait';
    } else if (stage === 'token') {
      semaphores[token(actor)]--;
      actor.pc++;
      expectedPhase = wasBlocked ? 'wake' : 'acquire';
    } else if (stage === 'mutex') {
      semaphores.mutex = id;
      actor.pc++;
      expectedPhase = wasBlocked ? 'wake' : 'acquire';
    } else if (stage === 'put' || stage === 'take') {
      requireValue(semaphores.mutex === id, '전송 주체가 뮤텍스를 소유하지 않았습니다.');
      requireValue(stage === 'put' ? buffer.length < input.capacity : buffer.length > 0, '버퍼의 전송 조건이 맞지 않습니다.');
      const slotIndex = stage === 'put' ? buffer.length : 0;
      const payload = stage === 'put' ? id : buffer[0];
      transfer = { kind: stage, from: stage === 'put' ? `actor:${id}` : 'slot:0',
        to: stage === 'put' ? `slot:${slotIndex}` : `actor:${id}`, actor: id, actorLabel: label(id), payload, slotIndex };
      if (stage === 'put') buffer.push(id);
      else buffer.shift();
      actor.pc++;
      expectedPhase = stage;
    } else {
      requireValue(semaphores.mutex === id, '반납 주체가 뮤텍스를 소유하지 않았습니다.');
      semaphores.mutex = null;
      semaphores[releasedToken(actor)]++;
      actor.pc = 0;
      expectedPhase = 'release';
    }
    const data = event.data as unknown as EventData;
    requireValue(event.kind === expectedPhase, '현재 시도의 사건 종류가 맞지 않습니다.');
    requireValue(data.buffer.length === buffer.length && data.buffer.every((value, index) => Object.is(value, buffer[index])), '버퍼 내용이 실제 전송과 다릅니다.');
    requireValue(sameActors(data.actors, actors), '주체 상태가 현재 시도와 다릅니다.');
    requireValue(data.semaphores.empty === semaphores.empty && data.semaphores.full === semaphores.full && data.semaphores.mutex === semaphores.mutex, '허용 수 또는 뮤텍스 소유자가 현재 시도와 다릅니다.');
    const expectedReason = position === input.order.length - 1 ? terminalReason(actors, input.policy, semaphores) : 'running';
    requireValue(data.stopReason === expectedReason, '진행 상태가 현재 사건과 다릅니다.');
    current = { actor: id, actorLabel: label(id), stage, resource, resources: stage === 'release' ? ['mutex', releasedToken(actor)] : resource ? [resource] : [], beforePc, afterPc: actor.pc };
    buffer = [...data.buffer];
    actors = structuredClone(data.actors);
    semaphores = { ...data.semaphores };
    phase = expectedPhase;
    stopReason = data.stopReason;
  }
  const summaries: Record<BoundedBufferPhase, string> = {
    initial: '현재 입력으로 재생할 준비가 되었습니다.',
    acquire: '현재 주체가 진행에 필요한 자원을 획득했습니다.',
    wait: '현재 주체가 다음 단계로 진행하지 못하고 대기합니다.',
    wake: '대기하던 주체가 자원을 획득하고 다시 진행합니다.',
    put: '버퍼 뒤쪽에 값을 넣었습니다.',
    take: '버퍼 앞쪽에서 값을 꺼냈습니다.',
    release: '현재 주체의 한 번의 작업 주기가 끝났습니다.',
  };
  return {
    capacity: input.capacity, policy: input.policy, phase, buffer,
    slots: Array.from({ length: input.capacity }, (_, index) => ({ index, nodeKey: `slot:${index}`, occupied: index < buffer.length, value: index < buffer.length ? buffer[index] : null })),
    actors: input.actors.map(({ id }) => ({ id, label: label(id), nodeKey: `actor:${id}`, ...actors[id], active: current?.actor === id,
      nextAction: action(actors[id], input.policy), waitFor: actors[id].blocked ? resourceFor(actors[id], input.policy) : null })),
    semaphores, mutexOwnerLabel: semaphores.mutex === null ? null : label(semaphores.mutex), current, transfer, stopReason,
    event: events.length ? structuredClone(events[events.length - 1]) : null, summary: summaries[phase],
  };
}
