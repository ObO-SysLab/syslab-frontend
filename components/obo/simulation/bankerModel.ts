import type { ModelRun, SemanticEvent } from '../runtime/index.mjs';
import type { SimulationInstance } from '../runtime/document.mjs';

export type BankerRequestPhase = 'none' | 'pending' | 'requested' | 'testing'
  | 'denied-unavailable' | 'denied-unsafe' | 'granted';

export interface BankerRow {
  actor: string;
  label: string;
  need: number[];
  allocated: number[];
  max: number[];
  finished: boolean;
  eligible: boolean;
  deficits: number[];
  current: boolean;
}

export interface BankerSnapshot {
  resources: string[];
  resourceLabels: string[];
  available: number[];
  work: number[];
  rows: BankerRow[];
  completedSequence: string[];
  returned: number[];
  current: SemanticEvent | null;
  request: { actor: string; label: string; values: number[] } | null;
  requestPhase: BankerRequestPhase;
  tentative: boolean;
  finalSafety: boolean | null;
  granted: boolean | null;
  summary: string;
}

function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`은행원 표시: ${message}`);
}

function identifiers(value: unknown, label: string): string[] {
  requireValue(Array.isArray(value) && value.length > 0 && value.length <= 100
    && value.every(id => typeof id === 'string' && id.trim().length > 0), `${label} 목록을 확인하세요.`);
  requireValue(new Set(value).size === value.length, `${label} ID가 중복되었습니다.`);
  return [...value];
}

function vector(value: unknown, size: number, label: string): number[] {
  requireValue(Array.isArray(value) && value.length === size
    && value.every(n => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0), `${label}의 자원 수와 수량을 확인하세요.`);
  return [...value];
}

function matrix(value: unknown, actors: number, resources: number, label: string): number[][] {
  requireValue(Array.isArray(value) && value.length === actors, `${label}의 프로세스 수를 확인하세요.`);
  return value.map(row => vector(row, resources, label));
}

function record(value: unknown, label: string): Record<string, unknown> {
  requireValue(value !== null && typeof value === 'object' && !Array.isArray(value), `${label}을 확인하세요.`);
  return value as Record<string, unknown>;
}

/** Presentation only: use the authored input and events through the current cursor. */
export function bankerSnapshot(instance: SimulationInstance, execution: ModelRun | null, cursor: number): BankerSnapshot {
  requireValue(instance.scenarioId === 'BK', '은행원 모델이 아닙니다.');
  requireValue(Number.isInteger(cursor), '현재 사건 위치를 확인하세요.');
  const input = instance.input;
  const actors = identifiers(input.actors, '프로세스');
  const resources = identifiers(input.resources, '자원');
  const initialAvailable = vector(input.available, resources.length, 'Available');
  const initialAllocation = matrix(input.allocated, actors.length, resources.length, 'Allocation');
  const maximum = matrix(input.max, actors.length, resources.length, 'Max');
  const initialNeed = maximum.map((row, p) => row.map((n, r) => {
    requireValue(n >= initialAllocation[p][r], '최대 요구보다 현재 할당이 큽니다.');
    return n - initialAllocation[p][r];
  }));
  const label = (id: string) => Object.hasOwn(instance.labels, id) ? instance.labels[id] : id;
  let request: BankerSnapshot['request'] = null;
  if (input.request !== null) {
    const raw = record(input.request, '추가 요청');
    requireValue(typeof raw.actor === 'string' && actors.includes(raw.actor), '추가 요청의 프로세스를 확인하세요.');
    const values = vector(raw.values, resources.length, '추가 요청');
    requireValue(values.every((n, r) => n <= initialNeed[actors.indexOf(raw.actor as string)][r]), '추가 요청이 남은 요구를 초과했습니다.');
    request = { actor: raw.actor, label: label(raw.actor), values };
  }
  requireValue(execution === null || execution.id === 'BK', '실행 기록의 모델이 다릅니다.');
  const events = execution?.events.slice(0, Math.max(0, cursor + 1)) ?? [];
  const current = events.at(-1) ?? null;
  const data = current?.data;
  const available = data ? vector(data.available, resources.length, '현재 Available') : [...initialAvailable];
  const work = data ? vector(data.work, resources.length, '현재 Work') : [...initialAvailable];
  const need = data ? matrix(data.need, actors.length, resources.length, '현재 Need') : initialNeed;
  const finish = data ? record(data.finish, 'Finish') : Object.fromEntries(actors.map(id => [id, false]));
  const completedSequence: string[] = [];
  for (const event of events) {
    requireValue(['request', 'check', 'finish', 'deny'].includes(event.kind)
      && (event.actor === null || actors.includes(event.actor)), '사건 종류와 프로세스를 확인하세요.');
    if (event.kind === 'finish') {
      requireValue(event.actor !== null && !completedSequence.includes(event.actor), '완료 순서에 누락 또는 중복이 있습니다.');
      completedSequence.push(event.actor);
    }
  }
  const rows: BankerRow[] = actors.map((actor, p) => {
    requireValue(typeof finish[actor] === 'boolean', '프로세스별 Finish를 확인하세요.');
    const allocated = maximum[p].map((n, r) => {
      requireValue(need[p][r] <= n, '현재 Need가 Max보다 큽니다.');
      return n - need[p][r];
    });
    const deficits = need[p].map((n, r) => Math.max(0, n - work[r]));
    const finished = finish[actor] as boolean;
    return { actor, label: label(actor), need: [...need[p]], allocated, max: [...maximum[p]],
      finished, eligible: !finished && deficits.every(n => n === 0), deficits, current: current?.actor === actor };
  });
  let returned = resources.map(() => 0);
  if (current?.kind === 'finish') {
    const previous = events.at(-2);
    const previousWork = previous ? vector(previous.data.work, resources.length, '직전 Work') : initialAvailable;
    returned = work.map((n, r) => {
      requireValue(n >= previousWork[r], '완료 후 Work가 감소했습니다.');
      return n - previousWork[r];
    });
  }
  const atEnd = execution !== null && execution.events.length > 0 && cursor >= execution.events.length - 1;
  let finalSafety: boolean | null = null;
  let granted: boolean | null = null;
  if (atEnd) {
    requireValue(typeof execution.result.safe === 'boolean', '최종 안전성 결과를 확인하세요.');
    requireValue(execution.result.granted === null || typeof execution.result.granted === 'boolean', '최종 요청 결과를 확인하세요.');
    finalSafety = execution.result.safe;
    granted = execution.result.granted;
  }
  let requestPhase: BankerRequestPhase = request ? 'pending' : 'none';
  if (request && events.length) {
    const denied = events.some(event => event.kind === 'deny');
    if (denied) requestPhase = request.values.some((n, r) => n > initialAvailable[r]) ? 'denied-unavailable' : 'denied-unsafe';
    else if (granted === true) requestPhase = 'granted';
    else requestPhase = current?.kind === 'request' ? 'requested' : 'testing';
  }
  const tentative = requestPhase === 'testing' || requestPhase === 'denied-unsafe';
  let summary = '추가로 필요한 자원(Need)을 검사에 쓸 수 있는 자원(Work)과 비교합니다.';
  if (current?.kind === 'request' && request) summary = `${request.label}의 추가 요청을 확인합니다. 아직 배정을 확정한 상태는 아닙니다.`;
  else if (current?.kind === 'check' && current.actor) summary = `${label(current.actor)}의 Need가 모든 자원에서 Work 이하인지 확인합니다.`;
  else if (current?.kind === 'finish' && current.actor) summary = `${label(current.actor)}의 완료를 가정해 보유 자원을 Work에 돌려주는 검사 단계입니다.`;
  if (requestPhase === 'denied-unavailable') summary = '현재 가용량보다 큰 추가 요청은 거절되었습니다. 기존 상태의 안전성 검사는 별도로 진행합니다.';
  if (finalSafety === false || requestPhase === 'denied-unsafe') {
    summary = requestPhase === 'denied-unsafe'
      ? '가정 배정 상태에서 전체 완료 순서를 찾지 못해 요청을 거절했습니다. 표시된 수치는 가정 검사 값이며 교착 확정은 아닙니다.'
      : '전체 완료 순서를 찾지 못했습니다. 일부 프로세스가 완료 가능해도 전체가 안전하다는 뜻은 아닙니다. 교착을 확정하지 않습니다.';
    if (requestPhase === 'denied-unavailable') summary = '추가 요청은 현재 가용량 부족으로 거절되었습니다. 기존 상태에서도 전체 완료 순서를 찾지 못했습니다. 교착 확정은 아닙니다.';
  } else if (finalSafety === true) {
    summary = granted === false ? '추가 요청은 거절되었지만 기존 상태의 전체 완료 순서는 확인했습니다.'
      : granted === true ? '가정 배정 뒤 전체 완료 순서를 확인해 추가 요청을 허용합니다.'
        : '전체 프로세스의 완료를 가정할 수 있는 순서를 확인했습니다. 가능한 안전 순서는 여러 개일 수 있습니다.';
  } else if (tentative) summary += ' 추가 요청을 가정 배정한 상태를 검사하고 있습니다.';
  return { resources, resourceLabels: resources.map(label), available, work, rows, completedSequence, returned,
    current: current ? structuredClone(current) : null, request, requestPhase, tentative, finalSafety, granted, summary };
}
