import { checkShape, registry } from '../runtime/index.mjs';
import type { ModelRun, SemanticEvent } from '../runtime/index.mjs';
import type { SimulationInstance } from '../runtime/document.mjs';

export type ContextSwitchScalar = string | number | boolean | null;
export type ContextSwitchPhase = 'initial' | 'save' | 'restore' | 'select';
export interface ContextSwitchRegister {
  key: string;
  value: ContextSwitchScalar;
  nodeKey: string;
}
export interface ContextSwitchPcb {
  id: string;
  label: string;
  nodeKey: string;
  registers: ContextSwitchRegister[];
  selected: boolean;
  active: boolean;
}
export interface ContextSwitchTransfer {
  kind: 'save' | 'restore';
  from: string;
  to: string;
  actor: string;
  actorLabel: string;
}
export interface ContextSwitchSnapshot {
  phase: ContextSwitchPhase;
  selectedId: string;
  selectedLabel: string;
  loadedId: string;
  loadedLabel: string;
  registers: ContextSwitchRegister[];
  pcbs: ContextSwitchPcb[];
  transfer: ContextSwitchTransfer | null;
  switchIndex: number | null;
  changes: { added: string[]; removed: string[]; changed: string[] };
  event: SemanticEvent | null;
  summary: string;
}
type Registers = Record<string, ContextSwitchScalar>;
type Pcbs = Record<string, Registers>;
interface ContextSwitchInput { pcbs: Pcbs; initialId: string; order: string[] }
interface ContextSwitchEventData { current: string; registers: Registers; pcbs: Pcbs }

function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`문맥 교환 표시: ${message}`);
}
const sameRegisters = (a: Registers, b: Registers) => Object.keys(a).length === Object.keys(b).length
  && Object.keys(a).every(key => Object.hasOwn(b, key) && Object.is(a[key], b[key]));
const samePcbs = (a: Pcbs, b: Pcbs) => Object.keys(a).length === Object.keys(b).length
  && Object.keys(a).every(id => Object.hasOwn(b, id) && sameRegisters(a[id], b[id]));
const noChanges = (): ContextSwitchSnapshot['changes'] => ({ added: [], removed: [], changed: [] });

/** Validate and display only observed context-switch events, never the final result or future work. */
export function contextSwitchSnapshot(instance: SimulationInstance, execution: ModelRun | null, cursor: number): ContextSwitchSnapshot {
  requireValue(instance.scenarioId === 'CS', '문맥 교환 모델이 아닙니다.');
  requireValue(Number.isInteger(cursor), '현재 사건 위치를 확인하세요.');
  requireValue(execution === null || execution.id === 'CS', '실행 기록의 모델이 다릅니다.');
  checkShape(registry.CS.inputSchema, instance.input, 'input');
  const input = instance.input as unknown as ContextSwitchInput;
  requireValue(Object.hasOwn(input.pcbs, input.initialId), '초기 PCB가 없습니다.');
  requireValue(input.order.every(id => Object.hasOwn(input.pcbs, id)), '교환할 PCB가 없습니다.');
  const label = (id: string) => instance.labels[id] ?? id;
  let selectedId = input.initialId, loadedId = input.initialId;
  let cpu = { ...input.pcbs[input.initialId] }, stored = structuredClone(input.pcbs);
  let phase: ContextSwitchPhase = 'initial', transfer: ContextSwitchTransfer | null = null;
  let switchIndex: number | null = null, changes = noChanges();
  const events = execution?.events.slice(0, Math.max(0, cursor + 1)) ?? [];
  const phases = ['save', 'restore', 'select'] as const;
  for (const [position, event] of events.entries()) {
    checkShape(registry.CS.eventSchema, event, 'event');
    const data = event.data as unknown as ContextSwitchEventData;
    const index = Math.floor(position / 3), expectedPhase = phases[position % 3];
    requireValue(index < input.order.length && event.step === position && event.kind === expectedPhase,
      '저장·복원·선택 사건 순서가 입력과 다릅니다.');
    const targetId = input.order[index], actor = expectedPhase === 'save' ? selectedId : targetId;
    requireValue(event.actor === actor, '사건의 주체가 입력과 다릅니다.');
    changes = noChanges();
    transfer = null;
    if (expectedPhase === 'save') {
      stored[actor] = { ...cpu };
      transfer = { kind: 'save', from: 'cpu', to: `pcb:${actor}`, actor, actorLabel: label(actor) };
    } else if (expectedPhase === 'restore') {
      const before = cpu, restored = stored[actor];
      changes = {
        added: Object.keys(restored).filter(key => !Object.hasOwn(before, key)),
        removed: Object.keys(before).filter(key => !Object.hasOwn(restored, key)),
        changed: Object.keys(restored).filter(key => Object.hasOwn(before, key) && !Object.is(before[key], restored[key])),
      };
      cpu = { ...restored };
      loadedId = actor;
      transfer = { kind: 'restore', from: `pcb:${actor}`, to: 'cpu', actor, actorLabel: label(actor) };
    } else {
      selectedId = actor;
    }
    requireValue(data.current === selectedId, '선택된 대상이 현재 단계와 다릅니다.');
    requireValue(sameRegisters(data.registers, cpu), 'CPU 레지스터가 저장·복원 기록과 다릅니다.');
    requireValue(samePcbs(data.pcbs, stored), 'PCB 내용이 저장·복원 기록과 다릅니다.');
    // The event is authoritative after its meaning has been checked against the previous prefix.
    cpu = { ...data.registers };
    stored = structuredClone(data.pcbs);
    phase = expectedPhase;
    switchIndex = index;
  }
  const cells = (registers: Registers, prefix: string): ContextSwitchRegister[] =>
    Object.entries(registers).map(([key, value]) => ({ key, value, nodeKey: `${prefix}:${key}` }));
  const pcbs = Object.keys(input.pcbs).map(id => ({
    id, label: label(id), nodeKey: `pcb:${id}`, registers: cells(stored[id], `pcb-register:${id}`),
    selected: id === selectedId, active: transfer?.actor === id,
  }));
  const summaries: Record<ContextSwitchPhase, string> = {
    initial: '선택된 대상의 문맥이 CPU에 준비되어 있습니다.',
    save: 'CPU의 문맥을 해당 PCB에 저장했습니다.',
    restore: 'PCB의 문맥을 CPU에 복원했습니다. 실행 대상 선택은 다음 단계에서 이루어집니다.',
    select: 'CPU에 복원된 문맥의 주체를 실행 대상으로 선택했습니다.',
  };
  return {
    phase, selectedId, selectedLabel: label(selectedId), loadedId, loadedLabel: label(loadedId),
    registers: cells(cpu, 'cpu-register'), pcbs, transfer, switchIndex, changes,
    event: events.length ? structuredClone(events[events.length - 1]) : null, summary: summaries[phase],
  };
}
