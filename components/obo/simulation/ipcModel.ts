import { checkShape, registry } from '../runtime/index.mjs';
import type { ModelRun, SemanticEvent } from '../runtime/index.mjs';
import type { SimulationInstance } from '../runtime/document.mjs';

export type IpcScalar = string | number | boolean | null;
export type IpcMode = 'pipe' | 'message' | 'shared';
export type IpcOperation = 'send' | 'receive' | 'read' | 'write';
export type IpcPhase = 'initial' | IpcOperation | 'block' | 'resume';
export interface IpcSlot { index: number; nodeKey: string; occupied: boolean; value: IpcScalar }
export interface IpcSharedCell { key: string; nodeKey: string; value: IpcScalar }
export interface IpcActor {
  id: string;
  label: string;
  nodeKey: string;
  active: boolean;
  blocked: boolean;
  waitOperation: 'send' | 'receive' | null;
}
export interface IpcCurrent {
  index: number;
  actor: string;
  actorLabel: string;
  op: IpcOperation;
  key: string | null;
  blocked: boolean;
  valuePresent: boolean;
  value: IpcScalar;
  /** Previous shared-cell existence/value; unrelated channel operations leave these false/null. */
  beforeExists: boolean;
  before: IpcScalar;
  changed: boolean;
  /** Input payload for send/write only; read/receive ignore their unused input value. */
  attemptedValuePresent: boolean;
  attemptedValue: IpcScalar;
}
export interface IpcTransfer {
  from: string;
  to: string;
  kind: IpcOperation;
  payload: IpcScalar;
  slotIndex: number | null;
  cellKey: string | null;
}
export interface IpcRead {
  index: number;
  actor: string;
  actorLabel: string;
  op: 'receive' | 'read';
  key: string | null;
  value: IpcScalar;
}
export interface IpcSnapshot {
  mode: IpcMode;
  capacity: number;
  phase: IpcPhase;
  channel: IpcScalar[];
  slots: IpcSlot[];
  shared: IpcSharedCell[];
  actors: IpcActor[];
  current: IpcCurrent | null;
  transfer: IpcTransfer | null;
  reads: IpcRead[];
  event: SemanticEvent | null;
  summary: string;
}

interface Operation { actor: string; op: IpcOperation; key?: string; value?: IpcScalar }
interface Input { actors: string[]; mode: IpcMode; capacity: number; initial: IpcScalar[]; shared: Record<string, IpcScalar>; operations: Operation[] }
interface EventData { index: number; channel: IpcScalar[]; shared: Record<string, IpcScalar>; value: IpcScalar; blocked: boolean }
function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`프로세스 간 통신 표시: ${message}`);
}
const sameValues = (a: Record<string, IpcScalar>, b: Record<string, IpcScalar>) => Object.keys(a).length === Object.keys(b).length
  && Object.keys(a).every(key => Object.hasOwn(b, key) && Object.is(a[key], b[key]));

/** Reconstruct successful reads and outstanding waits from this prefix, never from execution.result. */
export function ipcSnapshot(instance: SimulationInstance, execution: ModelRun | null, cursor: number): IpcSnapshot {
  requireValue(instance.scenarioId === 'IPC', '프로세스 간 통신 모델이 아닙니다.');
  requireValue(Number.isInteger(cursor), '현재 사건 위치를 확인하세요.');
  requireValue(execution === null || execution.id === 'IPC', '실행 기록의 모델이 다릅니다.');
  checkShape(registry.IPC.inputSchema, instance.input, 'input');
  const input = instance.input as unknown as Input;
  requireValue(new Set(input.actors).size === input.actors.length, '주체 ID가 중복됩니다.');
  requireValue(input.initial.length <= input.capacity, '초기 채널이 용량을 초과합니다.');
  const sharedMode = input.mode === 'shared';
  for (const operation of input.operations) {
    requireValue(input.actors.includes(operation.actor), '통신 주체가 없습니다.');
    requireValue((sharedMode ? ['read', 'write'] : ['send', 'receive']).includes(operation.op), '통신 모드와 동작이 맞지 않습니다.');
    if (sharedMode) requireValue(Object.hasOwn(operation, 'key'), '공유값 필드가 필요합니다.');
    if (operation.op === 'send' || operation.op === 'write') requireValue(Object.hasOwn(operation, 'value'), '보내거나 쓸 값이 필요합니다.');
  }
  const label = (id: string) => Object.hasOwn(instance.labels, id) ? instance.labels[id] : id;
  let channel = [...input.initial], shared = { ...input.shared };
  const waiting = new Map<string, 'send' | 'receive'>(), reads: IpcRead[] = [];
  let phase: IpcPhase = 'initial', current: IpcCurrent | null = null, transfer: IpcTransfer | null = null;
  const events = execution?.events.slice(0, Math.max(0, cursor + 1)) ?? [];
  for (const [position, event] of events.entries()) {
    checkShape(registry.IPC.eventSchema, event, 'event');
    const data = event.data as unknown as EventData;
    requireValue(position < input.operations.length && event.step === position && data.index === position, '현재 동작의 순서가 입력과 다릅니다.');
    const operation = input.operations[position], { actor, op } = operation;
    requireValue(event.actor === actor, '사건의 주체가 현재 동작과 다릅니다.');
    const key = sharedMode ? operation.key! : null;
    const beforeExists = key !== null && Object.hasOwn(shared, key), before = beforeExists ? shared[key!] : null;
    const attemptedValuePresent = op === 'send' || op === 'write';
    const attemptedValue = attemptedValuePresent ? operation.value! : null;
    let value: IpcScalar = null, blocked = false, changed = false, slotIndex: number | null = null;
    if (sharedMode) {
      if (op === 'write') {
        value = operation.value!;
        changed = !beforeExists || !Object.is(before, value);
        shared[key!] = value;
      } else {
        requireValue(beforeExists, '읽을 공유값 필드가 없습니다.');
        value = shared[key!];
      }
    } else if (op === 'send') {
      blocked = channel.length === input.capacity;
      if (!blocked) { slotIndex = channel.length; value = operation.value!; channel.push(value); changed = true; }
    } else {
      blocked = channel.length === 0;
      if (!blocked) { slotIndex = 0; value = channel[0]; channel.shift(); changed = true; }
    }
    const expectedPhase = blocked ? 'block' : waiting.has(actor) ? 'resume' : op;
    requireValue(event.kind === expectedPhase && data.blocked === blocked, '현재 동작의 대기·재개 상태가 기록과 다릅니다.');
    requireValue(Object.is(data.value, value), '현재 동작의 값이 실제 송수신·읽기·쓰기와 다릅니다.');
    requireValue(data.channel.length === channel.length && data.channel.every((item, index) => Object.is(item, channel[index])), '채널의 FIFO 내용이 실제 동작과 다릅니다.');
    requireValue(sameValues(data.shared, shared), '공유값이 현재 동작과 다릅니다.');
    if (blocked) {
      requireValue(op === 'send' || op === 'receive', '공유값 동작에는 채널 대기를 만들 수 없습니다.');
      waiting.set(actor, op);
      transfer = null;
    } else {
      waiting.delete(actor);
      if (op === 'read' || op === 'receive') reads.push({ index: position, actor, actorLabel: label(actor), op, key, value });
      const endpoint = sharedMode ? `shared:${key}` : `channel:${slotIndex}`;
      const outgoing = op === 'send' || op === 'write';
      transfer = { from: outgoing ? `actor:${actor}` : endpoint, to: outgoing ? endpoint : `actor:${actor}`,
        kind: op, payload: value, slotIndex, cellKey: key };
    }
    current = { index: position, actor, actorLabel: label(actor), op, key, blocked, valuePresent: !blocked, value,
      beforeExists, before, changed, attemptedValuePresent, attemptedValue };
    channel = [...data.channel];
    shared = { ...data.shared };
    phase = expectedPhase;
  }
  const operationNames: Record<IpcOperation, string> = { send: '송신', receive: '수신', read: '읽기', write: '쓰기' };
  const summaries: Record<IpcOperation, string> = { send: '채널 뒤쪽에 값을 보냈습니다.', receive: '채널 앞쪽의 값을 받았습니다.', read: '공유값을 읽었습니다.', write: '공유값 쓰기를 수행했습니다.' };
  const summary = !current ? '현재 입력으로 통신 과정을 살펴볼 준비가 되었습니다.'
    : phase === 'block' ? '현재 주체가 이번 통신 동작을 진행하지 못하고 대기합니다.'
      : phase === 'resume' ? `대기하던 주체가 이번 ${operationNames[current.op]} 동작을 수행했습니다.` : summaries[current.op];
  return {
    mode: input.mode, capacity: input.capacity, phase, channel,
    slots: Array.from({ length: input.capacity }, (_, index) => ({ index, nodeKey: `channel:${index}`, occupied: index < channel.length, value: index < channel.length ? channel[index] : null })),
    shared: Object.entries(shared).map(([key, value]) => ({ key, nodeKey: `shared:${key}`, value })),
    actors: input.actors.map(id => ({ id, label: label(id), nodeKey: `actor:${id}`, active: current?.actor === id,
      blocked: waiting.has(id), waitOperation: waiting.get(id) ?? null })),
    current, transfer, reads, event: events.length ? structuredClone(events[events.length - 1]) : null, summary,
  };
}
