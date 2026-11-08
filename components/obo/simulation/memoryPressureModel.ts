import { checkShape, registry } from '../runtime/index.mjs';
import type { ModelRun, SemanticEvent } from '../runtime/index.mjs';
import type { SimulationInstance } from '../runtime/document.mjs';

export interface PressureRef { index: number; id: string; page: number; state: 'past' | 'current' | 'future'; hit: boolean | null }
export interface PressureProcess {
  id: string;
  label: string;
  quota: number;
  frames: { slot: number; page: number | null; current: boolean; incoming: boolean }[];
  workingSet: number;
  faults: number;
  /** Hit/Miss of this process's most recent references (oldest first), up to 8. */
  recent: boolean[];
  /** Observation only: the recent working set needs more frames than the fixed quota. */
  needsMore: boolean;
  current: boolean;
  left: number | null;
}
export interface PressureSnapshot {
  window: number;
  refs: PressureRef[];
  processes: PressureProcess[];
  current: { index: number; id: string; page: number; hit: boolean; victim: number | null } | null;
  event: SemanticEvent | null;
  summary: string;
}

interface Input { stream: { id: string; page: number }[]; quotas: Record<string, number>; window: number; frameBudget: number }
interface EventData { index: number; page: number; faults: number; workingSet: number; frames: (number | null)[] }
function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`메모리 압박 표시: ${message}`);
}

/** Same rule as runtime/memory.mjs memoryPressure: fixed per-process quota, LRU, working set over the last `window` references of that process. */
export function pressureSnapshot(instance: SimulationInstance, execution: ModelRun | null, cursor: number): PressureSnapshot {
  requireValue(instance.scenarioId === 'TH', 'Thrashing 모델이 아닙니다.');
  requireValue(Number.isInteger(cursor), '현재 사건 위치를 확인하세요.');
  requireValue(execution === null || execution.id === 'TH', '실행 기록의 모델이 다릅니다.');
  checkShape(registry.TH.inputSchema, instance.input, 'input');
  const input = instance.input as unknown as Input, ids = Object.keys(input.quotas);
  requireValue(ids.length > 0, '프로세스별 프레임 할당량이 필요합니다.');
  requireValue(Object.values(input.quotas).reduce((a, b) => a + b, 0) <= input.frameBudget, '전체 프레임 예산을 초과했습니다.');
  requireValue(input.stream.every(r => Object.hasOwn(input.quotas, r.id)), '참조하는 프로세스의 할당량이 없습니다.');
  const label = (id: string) => Object.hasOwn(instance.labels, id) ? instance.labels[id] : id;
  const state = Object.fromEntries(ids.map(id => [id, { frames: Array<number | null>(input.quotas[id]).fill(null), used: new Map<number, number>(), counter: 0, faults: 0, history: [] as number[], results: [] as boolean[] }]));
  const events = execution?.events.slice(0, Math.max(0, cursor + 1)) ?? [];
  requireValue(events.length <= input.stream.length, '사건 수가 참조 흐름보다 많습니다.');
  let current: PressureSnapshot['current'] = null, slotOf: number | null = null;
  for (const [position, event] of events.entries()) {
    checkShape(registry.TH.eventSchema, event, 'event');
    const { id, page } = input.stream[position], s = state[id], data = event.data as unknown as EventData;
    const hit = s.frames.includes(page);
    let victim: number | null = null, slot = s.frames.indexOf(page);
    if (!hit) {
      s.faults++; slot = s.frames.indexOf(null);
      if (slot < 0) {
        const order = s.frames.map((value, i) => ({ value: value as number, i })).sort((a, b) => { const x = s.used.get(a.value)!, y = s.used.get(b.value)!; return x === y ? a.i - b.i : x - y; });
        slot = order[0].i; victim = s.frames[slot];
      }
      s.frames[slot] = page;
    }
    s.used.set(page, s.counter++); s.history.push(page); s.results.push(hit);
    const workingSet = new Set(s.history.slice(-input.window)).size;
    requireValue(event.step === position && event.kind === 'reference' && event.actor === id && data.index === position && data.page === page, '참조 순서나 프로세스가 기록과 다릅니다.');
    requireValue(data.faults === s.faults && data.workingSet === workingSet && data.frames.length === s.frames.length && data.frames.every((v, i) => v === s.frames[i]), 'Miss 수·작업 집합·프레임이 기록과 다릅니다.');
    current = { index: position, id, page, hit, victim }; slotOf = slot;
  }
  const at = current?.index ?? -1;
  const processes: PressureProcess[] = ids.map(id => {
    const s = state[id], workingSet = new Set(s.history.slice(-input.window)).size, mine = current?.id === id;
    return { id, label: label(id), quota: input.quotas[id], workingSet, faults: s.faults, recent: s.results.slice(-8), needsMore: workingSet > input.quotas[id], current: mine,
      left: mine && current ? current.victim : null,
      frames: s.frames.map((page, slot) => ({ slot, page, current: mine && page === current!.page, incoming: mine && !current!.hit && slot === slotOf })) };
  });
  const refs: PressureRef[] = input.stream.map((r, index) => ({ index, id: r.id, page: r.page, state: index < at ? 'past' : index === at ? 'current' : 'future', hit: null }));
  // Fill past Hit/Miss marks from each process's own result sequence.
  const seen: Record<string, number> = {};
  for (const ref of refs) { if (ref.index > at) break; const k = seen[ref.id] ?? 0; ref.hit = state[ref.id].results[k]; seen[ref.id] = k + 1; }
  const p = current ? processes.find(x => x.id === current!.id)! : null;
  const summary = !current ? '여러 프로세스가 고정된 프레임을 나눠 쓰며 참조하는 과정을 살펴봅니다.'
    : current.hit ? (p!.needsMore ? 'Hit입니다. 다만 이 프로세스는 최근에 할당보다 많은 페이지를 쓰고 있습니다.' : 'Hit입니다. 최근에 쓰는 페이지가 할당 안에 들어와 있습니다.')
      : p!.needsMore ? 'Miss입니다. 최근에 쓰는 페이지가 할당보다 많아 Miss가 반복되기 쉽습니다.' : 'Miss입니다. 할당 안에서 페이지를 들여왔습니다.';
  return { window: input.window, refs, processes, current, event: events.length ? structuredClone(events[events.length - 1]) : null, summary };
}
