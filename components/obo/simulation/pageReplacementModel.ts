import { checkShape, registry, run } from '../runtime/index.mjs';
import type { ModelRun, SemanticEvent } from '../runtime/index.mjs';
import type { SimulationInstance } from '../runtime/document.mjs';

export type PageModel = 'P2' | 'OPT';
export type PagePolicy = 'FIFO' | 'LRU' | 'OPT';
export type PagePhase = 'initial' | 'hit' | 'load' | 'replace';
export interface PageRef { index: number; page: number; state: 'past' | 'current' | 'future'; hit: boolean | null }
export interface PageFrame {
  slot: number;
  page: number | null;
  /** The page referenced by the current event sits in this slot. */
  current: boolean;
  /** This slot was filled by the current event (empty slot or replacement). */
  incoming: boolean;
  /** Page that left this slot at the current event, if any. */
  left: number | null;
  /** 1-based reference number when the page entered (FIFO) or was last used (LRU); 0 means pre-loaded. */
  loadedAt: number | null;
  usedAt: number | null;
  /** OPT: 1-based reference number of the next use after the current position, or null if never used again. */
  nextUse: number | null;
}
export interface PageSnapshot {
  model: PageModel;
  policy: PagePolicy;
  phase: PagePhase;
  refs: PageRef[];
  frames: PageFrame[];
  faults: number;
  hits: number;
  current: { index: number; page: number; hit: boolean; victim: number | null; slot: number } | null;
  event: SemanticEvent | null;
  summary: string;
}

interface Input { refs: number[]; frameCount: number; policy: PagePolicy; initial: number[] }
interface EventData { index: number; page: number; hit: boolean; victim: number | null; frames: (number | null)[] }
function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`페이지 교체 표시: ${message}`);
}
const isPageModel = (id: string): id is PageModel => id === 'P2' || id === 'OPT';

/** Same rule as runtime/memory.mjs pageReplacement; used to validate the observed prefix and to explain the choice. */
function replay(input: Input, steps: number) {
  requireValue(new Set(input.initial).size === input.initial.length, '초기 페이지가 중복되었습니다.');
  requireValue(input.initial.length <= input.frameCount, '초기 페이지가 프레임 수보다 많습니다.');
  const frames: (number | null)[] = [...input.initial, ...Array(input.frameCount - input.initial.length).fill(null)];
  const loaded = new Map(input.initial.map((x, i) => [x, i - input.initial.length]));
  const used = new Map(input.initial.map((x, i) => [x, i - input.initial.length]));
  const expected: EventData[] = [];
  let faults = 0, last: { slot: number; left: number | null } | null = null;
  for (let index = 0; index < steps; index++) {
    const page = input.refs[index], hit = frames.includes(page);
    let victim: number | null = null, slot = frames.indexOf(page);
    if (!hit) {
      faults++; slot = frames.indexOf(null);
      if (slot < 0) {
        const score = (p: number) => {
          if (input.policy === 'OPT') { const next = input.refs.indexOf(p, index + 1); return next < 0 ? Infinity : next; }
          return (input.policy === 'FIFO' ? loaded : used).get(p)!;
        };
        const candidates = frames.map((value, i) => ({ value: value as number, i }));
        candidates.sort((a, b) => { const x = score(a.value), y = score(b.value); return x === y ? a.i - b.i : input.policy === 'OPT' ? (x > y ? -1 : 1) : x - y; });
        slot = candidates[0].i; victim = frames[slot];
      }
      frames[slot] = page; loaded.set(page, index);
    }
    used.set(page, index);
    expected.push({ index, page, hit, victim, frames: [...frames] });
    last = { slot, left: victim };
  }
  return { frames, loaded, used, faults, expected, last };
}

/** Reconstruct the page-replacement state for the observed prefix only; never reads execution.result. */
export function pageSnapshot(instance: SimulationInstance, execution: ModelRun | null, cursor: number): PageSnapshot {
  const model = instance.scenarioId;
  requireValue(isPageModel(model), '페이지 교체 모델이 아닙니다.');
  requireValue(Number.isInteger(cursor), '현재 사건 위치를 확인하세요.');
  requireValue(execution === null || execution.id === model, '실행 기록의 모델이 다릅니다.');
  checkShape(registry[model].inputSchema, instance.input, 'input');
  const input = instance.input as unknown as Input;
  const events = execution?.events.slice(0, Math.max(0, cursor + 1)) ?? [];
  requireValue(events.length <= input.refs.length, '사건 수가 참조열보다 많습니다.');
  const s = replay(input, events.length);
  for (const [position, event] of events.entries()) {
    checkShape(registry[model].eventSchema, event, 'event');
    const data = event.data as unknown as EventData, want = s.expected[position];
    requireValue(event.step === position && event.kind === 'reference' && data.index === position, '사건 순서가 참조열과 다릅니다.');
    requireValue(data.page === want.page && data.hit === want.hit && data.victim === want.victim, 'Hit/Miss·교체가 기록과 다릅니다.');
    requireValue(data.frames.length === want.frames.length && data.frames.every((v, i) => v === want.frames[i]), '프레임 내용이 기록과 다릅니다.');
  }
  const position = events.length - 1, current = position >= 0 ? s.expected[position] : null;
  const phase: PagePhase = !current ? 'initial' : current.hit ? 'hit' : current.victim === null ? 'load' : 'replace';
  const slot = current ? s.last!.slot : -1;
  const nextUse = (p: number) => { const next = input.refs.indexOf(p, position + 1); return next < 0 ? null : next + 1; };
  const order = (n: number | undefined) => n === undefined ? null : n < 0 ? 0 : n + 1;
  const frames: PageFrame[] = s.frames.map((page, i) => ({
    slot: i, page, current: current !== null && page === current.page, incoming: current !== null && !current.hit && i === slot,
    left: current !== null && i === slot ? current.victim : null,
    loadedAt: page === null ? null : order(s.loaded.get(page)), usedAt: page === null ? null : order(s.used.get(page)),
    nextUse: page === null || input.policy !== 'OPT' ? null : nextUse(page),
  }));
  const refs: PageRef[] = input.refs.map((page, index) => ({ index, page, state: index < position ? 'past' : index === position ? 'current' : 'future', hit: index <= position ? s.expected[index].hit : null }));
  const reasons: Record<PagePolicy, string> = { FIFO: '가장 먼저 들어온 페이지를 내보냈습니다.', LRU: '가장 오래 사용하지 않은 페이지를 내보냈습니다.', OPT: '앞으로 가장 늦게 쓰이거나 다시 쓰이지 않는 페이지를 내보냈습니다.' };
  const summary = phase === 'initial' ? '참조열을 차례로 따라가며 프레임이 어떻게 바뀌는지 살펴봅니다.'
    : phase === 'hit' ? '찾는 페이지가 이미 프레임에 있어 Hit입니다. 프레임은 그대로입니다.'
      : phase === 'load' ? 'Miss가 일어나 빈 칸에 페이지를 적재했습니다.' : `Miss가 일어나 페이지를 교체했습니다. ${reasons[input.policy]}`;
  return {
    model, policy: input.policy, phase, refs, frames, faults: s.faults, hits: events.length - s.faults,
    current: current ? { index: current.index, page: current.page, hit: current.hit, victim: current.victim, slot } : null,
    event: events.length ? structuredClone(events[events.length - 1]) : null, summary,
  };
}

export interface PageComparisonRow { policy: PagePolicy; primary: boolean; snapshot: PageSnapshot }
/**
 * OPT compares the three policies at the same reference position. The problem's own policy row is validated against
 * its recorded trace; the other rows are independent runs of the same input with only the policy changed (display only,
 * never graded or recorded).
 */
export function pageComparison(instance: SimulationInstance, execution: ModelRun | null, cursor: number): PageComparisonRow[] {
  requireValue(instance.scenarioId === 'OPT', '정책 비교는 OPT 모델에서만 사용합니다.');
  const primary = pageSnapshot(instance, execution, cursor), input = instance.input as unknown as Input;
  return (['FIFO', 'LRU', 'OPT'] as PagePolicy[]).map(policy => {
    if (policy === input.policy) return { policy, primary: true, snapshot: primary };
    const other = { ...instance, input: { ...instance.input, policy } } as SimulationInstance;
    return { policy, primary: false, snapshot: pageSnapshot(other, execution === null ? null : run('OPT', other.input), cursor) };
  });
}

export type BeladyStatus = 'waiting' | 'running' | 'done';
export interface BeladyRow { capacity: number; status: BeladyStatus; faults: number | null; snapshot: PageSnapshot | null }
export interface BeladySnapshot {
  policy: PagePolicy;
  rows: BeladyRow[];
  running: BeladyRow | null;
  finished: boolean;
  /** Adjacent capacities (ascending) where more frames produced more misses; only judged once every capacity has run. */
  increases: { from: number; to: number; before: number; after: number }[];
  event: SemanticEvent | null;
  summary: string;
}
interface BeladyInput { refs: number[]; capacities: number[]; policy: PagePolicy }

/**
 * P3 runs the whole reference string once per capacity in ascending order. Each segment is exactly the single-capacity
 * rule (OPT model, frameCount = capacity), so each observed segment is validated with pageSnapshot. Capacities that
 * have not run yet stay 'waiting' with no values (no future results).
 */
export function beladySnapshot(instance: SimulationInstance, execution: ModelRun | null, cursor: number): BeladySnapshot {
  requireValue(instance.scenarioId === 'P3', 'Belady 모델이 아닙니다.');
  requireValue(Number.isInteger(cursor), '현재 사건 위치를 확인하세요.');
  requireValue(execution === null || execution.id === 'P3', '실행 기록의 모델이 다릅니다.');
  checkShape(registry.P3.inputSchema, instance.input, 'input');
  const input = instance.input as unknown as BeladyInput;
  requireValue(new Set(input.capacities).size === input.capacities.length, '프레임 수 범위가 중복되었습니다.');
  const caps = [...input.capacities].sort((a, b) => a - b), n = input.refs.length;
  const events = execution?.events.slice(0, Math.max(0, cursor + 1)) ?? [];
  requireValue(events.length <= caps.length * n, '사건 수가 실행 범위보다 많습니다.');
  for (const [position, event] of events.entries()) {
    checkShape(registry.P3.eventSchema, event, 'event');
    const data = event.data as unknown as EventData & { capacity: number };
    requireValue(event.step === position && event.kind === 'reference' && data.capacity === caps[Math.floor(position / n)] && data.index === position % n, '프레임 수별 실행 순서가 기록과 다릅니다.');
  }
  const current = events.length ? Math.floor((events.length - 1) / n) : -1;
  const rows: BeladyRow[] = caps.map((capacity, k) => {
    const segment = events.slice(k * n, (k + 1) * n);
    if (n === 0) return { capacity, status: 'done', faults: 0, snapshot: null };
    if (!segment.length) return { capacity, status: 'waiting', faults: null, snapshot: null };
    const single = { ...instance, scenarioId: 'OPT', input: { refs: input.refs, frameCount: capacity, policy: input.policy, initial: [] } } as unknown as SimulationInstance;
    const trace = { id: 'OPT', events: segment.map((e, i) => { const { capacity: _c, ...data } = e.data as Record<string, unknown>; return { ...e, step: i, data }; }) } as unknown as ModelRun;
    const snapshot = pageSnapshot(single, trace, segment.length - 1);
    return { capacity, status: k === current ? 'running' : 'done', faults: snapshot.faults, snapshot };
  });
  const finished = events.length === caps.length * n;
  const increases = finished ? rows.slice(1).flatMap((row, i) => row.faults! > rows[i].faults! ? [{ from: rows[i].capacity, to: row.capacity, before: rows[i].faults!, after: row.faults! }] : []) : [];
  const running = rows.find(r => r.status === 'running') ?? null;
  const summary = !events.length ? '같은 참조열을 프레임 수만 바꿔 차례로 실행합니다.'
    : finished ? (increases.length ? '프레임을 늘렸는데 Miss가 늘었습니다. 이 입력과 정책에서 Belady 현상이 나타났습니다.' : '이 입력과 정책에서는 프레임을 늘려도 Miss가 늘지 않았습니다.')
      : running!.snapshot!.summary;
  return { policy: input.policy, rows, running, finished, increases, event: events.length ? structuredClone(events[events.length - 1]) : null, summary };
}
