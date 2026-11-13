import { checkShape, registry } from '../runtime/index.mjs';
import type { ModelRun, SemanticEvent } from '../runtime/index.mjs';
import type { SimulationInstance } from '../runtime/document.mjs';

export type ProcessStructureScalar = string | number | boolean | null;
export interface ProcessStructureCell {
  key: string;
  value: ProcessStructureScalar;
  nodeKey: string;
}
export interface ProcessStructureThread {
  id: string;
  label: string;
  process: string;
  nodeKey: string;
  registers: ProcessStructureCell[];
  stack: ProcessStructureScalar[];
}
export interface ProcessStructureProcess {
  id: string;
  label: string;
  nodeKey: string;
  shared: ProcessStructureCell[];
  threads: ProcessStructureThread[];
}
export interface ProcessStructureCurrent {
  index: number;
  actor: string;
  actorLabel: string;
  process: string;
  processLabel: string;
  kind: 'read' | 'write';
  scope: 'shared' | 'private';
  key: string;
  cellKey: string;
  before: ProcessStructureScalar;
  value: ProcessStructureScalar;
  changed: boolean;
}
export interface ProcessStructureSnapshot {
  processes: ProcessStructureProcess[];
  threads: ProcessStructureThread[];
  current: ProcessStructureCurrent | null;
  event: SemanticEvent | null;
  reads: ProcessStructureScalar[];
  summary: string;
}
interface ProcessStructureInput {
  spaces: Record<string, Record<string, ProcessStructureScalar>>;
  threads: Record<string, {
    process: string;
    registers: Record<string, ProcessStructureScalar>;
    stack: ProcessStructureScalar[];
  }>;
  operations: {
    op: 'read' | 'write'; thread: string; scope: 'shared' | 'private';
    key: string; value?: ProcessStructureScalar;
  }[];
}

function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`프로세스·스레드 표시: ${message}`);
}

/** Presentation only: replay the selected event prefix, never compute a future operation. */
export function processSnapshot(instance: SimulationInstance, execution: ModelRun | null, cursor: number): ProcessStructureSnapshot {
  requireValue(instance.scenarioId === 'PT', '프로세스·스레드 구조 모델이 아닙니다.');
  requireValue(Number.isInteger(cursor), '현재 사건 위치를 확인하세요.');
  requireValue(execution === null || execution.id === 'PT', '실행 기록의 모델이 다릅니다.');
  checkShape(registry.PT.inputSchema, instance.input, 'input');
  const input = instance.input as unknown as ProcessStructureInput;
  requireValue(Object.keys(input.threads).length > 0, '스레드가 필요합니다.');
  for (const thread of Object.values(input.threads)) {
    requireValue(Object.hasOwn(input.spaces, thread.process), '스레드의 주소 공간이 없습니다.');
  }
  // Keys cannot be created by PT operations, so draft references can be checked without replay.
  for (const operation of input.operations) {
    requireValue(Object.hasOwn(input.threads, operation.thread), '작업의 스레드가 없습니다.');
    const thread = input.threads[operation.thread];
    const target = operation.scope === 'shared' ? input.spaces[thread.process] : thread.registers;
    requireValue(Object.hasOwn(target, operation.key), '읽거나 쓸 필드가 없습니다.');
    requireValue(operation.op !== 'write' || Object.hasOwn(operation, 'value'), '쓸 값이 없습니다.');
  }
  const spaces = structuredClone(input.spaces), states = structuredClone(input.threads);
  const events = execution?.events.slice(0, Math.max(0, cursor + 1)) ?? [];
  const label = (id: string) => Object.hasOwn(instance.labels, id) ? instance.labels[id] : id;
  const reads: ProcessStructureScalar[] = [];
  let current: ProcessStructureCurrent | null = null;
  for (const [position, event] of events.entries()) {
    checkShape(registry.PT.eventSchema, event, 'event');
    const operation = input.operations[position];
    requireValue(operation && event.step === position && event.data.index === position,
      '사건의 작업 순서가 입력과 다릅니다.');
    requireValue(event.actor === operation.thread && event.kind === operation.op
      && event.data.scope === operation.scope && event.data.key === operation.key,
    '사건의 스레드·접근 영역·필드가 입력과 다릅니다.');
    const thread = states[operation.thread];
    const target = operation.scope === 'shared' ? spaces[thread.process] : thread.registers;
    const before = target[operation.key], value = event.data.value as ProcessStructureScalar;
    if (operation.op === 'write') {
      requireValue(Object.is(value, operation.value), '쓰는 값이 입력과 다릅니다.');
      target[operation.key] = value;
    } else {
      requireValue(Object.is(value, before), '읽은 값이 현재 저장값과 다릅니다.');
      reads.push(value);
    }
    current = {
      index: position, actor: operation.thread, actorLabel: label(operation.thread),
      process: thread.process, processLabel: label(thread.process), kind: operation.op, scope: operation.scope,
      key: operation.key,
      cellKey: operation.scope === 'shared' ? `shared:${thread.process}:${operation.key}` : `register:${operation.thread}:${operation.key}`,
      before, value, changed: operation.op === 'write' && !Object.is(before, value),
    };
  }
  const cells = (values: Record<string, ProcessStructureScalar>, prefix: string): ProcessStructureCell[] =>
    Object.entries(values).map(([key, value]) => ({ key, value, nodeKey: `${prefix}:${key}` }));
  const threads: ProcessStructureThread[] = Object.entries(states).map(([id, thread]) => ({
    id, label: label(id), process: thread.process, nodeKey: `thread:${id}`,
    registers: cells(thread.registers, `register:${id}`), stack: [...thread.stack],
  }));
  const processes: ProcessStructureProcess[] = Object.entries(spaces).map(([id, values]) => ({
    id, label: label(id), nodeKey: `process:${id}`, shared: cells(values, `shared:${id}`),
    threads: threads.filter(thread => thread.process === id),
  }));
  let summary = '같은 프로세스의 스레드는 공유 영역을 함께 사용하고 레지스터와 스택은 각자 유지합니다.';
  if (current) {
    const target = current.scope === 'shared' ? `${current.processLabel}의 공유 ${current.key}` : `자신의 레지스터 ${current.key}`;
    const value = JSON.stringify(current.value);
    summary = current.kind === 'read'
      ? `${current.actorLabel}의 읽기: ${target}의 값은 ${value}입니다.`
      : `${current.actorLabel}의 쓰기: ${target} = ${value}. ${current.changed ? `이전 값은 ${JSON.stringify(current.before)}입니다.` : '이전 값과 같습니다.'}`;
  }
  return { processes, threads, current, event: events.length ? structuredClone(events[events.length - 1]) : null, reads, summary };
}
