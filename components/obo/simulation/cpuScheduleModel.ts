import { checkShape, registry, run } from '../runtime/index.mjs';
import type { ModelRun, SemanticEvent } from '../runtime/index.mjs';
import type { SimulationInstance } from '../runtime/document.mjs';

export type CpuModel = 'G2' | 'RR' | 'PS';
export type CpuState = 'new' | 'ready' | 'running' | 'blocked' | 'done';
export type CpuKind = 'initial' | 'arrive' | 'dispatch' | 'run' | 'block' | 'unblock' | 'finish' | 'idle' | 'expire' | 'preempt';
export interface CpuSegment { actor: string | null; start: number; end: number }
export interface CpuJob { id: string; label: string; arrival: number; priority: number | null; state: CpuState; remaining: number; waiting: number; current: boolean; eventActor: boolean }
export interface CpuSnapshot {
  model: CpuModel;
  policy: string;
  quantum: number;
  time: number;
  /** Upper bound of the time axis from the input only (arrivals + all bursts), never from future events. */
  horizon: number;
  phase: CpuKind;
  current: string | null;
  eventActor: string | null;
  ready: string[];
  /** RR only: units of the current quantum already used by the running job. */
  quantumUsed: number | null;
  jobs: CpuJob[];
  segments: CpuSegment[];
  /** Average of waiting so far (ready time up to now) over arrived jobs; final average at the last event. */
  averageWaiting: number;
  finished: boolean;
  event: SemanticEvent | null;
  summary: string;
}

interface Job { id: string; arrival: number; bursts: number[]; priority?: number }
interface Input { jobs: Job[]; policy: string; quantum: number }
interface Data { time: number; current: string | null; ready: string[]; remaining: Record<string, number>; states: Record<string, CpuState> }
function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`CPU 스케줄링 표시: ${message}`);
}
const isCpu = (id: string): id is CpuModel => id === 'G2' || id === 'RR' || id === 'PS';
const reasons: Record<string, string> = { FCFS: '먼저 도착한', SJF: '실행 시간이 가장 짧은', SRTF: '남은 실행 시간이 가장 짧은', RR: '준비 큐 맨 앞의', PS: '우선순위가 가장 높은', 'PS-P': '우선순위가 가장 높은' };

/** Build the view state from events [0..count); shared by the validated trace and by independent comparison runs. */
function build(model: CpuModel, instance: SimulationInstance, input: Input, events: SemanticEvent[]): CpuSnapshot {
  const label = (id: string) => Object.hasOwn(instance.labels, id) ? instance.labels[id] : id;
  const waiting: Record<string, number> = Object.fromEntries(input.jobs.map(j => [j.id, 0]));
  const segments: CpuSegment[] = [];
  let prevTime = 0, prevStates: Record<string, CpuState> = Object.fromEntries(input.jobs.map(j => [j.id, 'new' as CpuState])), quantumUsed = 0;
  for (const e of events) {
    const d = e.data as unknown as Data;
    if (d.time > prevTime) for (const id of Object.keys(waiting)) if (prevStates[id] === 'ready') waiting[id] += d.time - prevTime;
    if (e.kind === 'run' || e.kind === 'idle') {
      const actor = e.kind === 'run' ? e.actor : null, last = segments.at(-1);
      if (last && last.actor === actor && last.end === d.time - 1) last.end = d.time; else segments.push({ actor, start: d.time - 1, end: d.time });
    }
    if (e.kind === 'dispatch') quantumUsed = 0; else if (e.kind === 'run') quantumUsed++;
    prevTime = d.time; prevStates = d.states;
  }
  const last = events.at(-1), d = last?.data as unknown as Data | undefined;
  const states = d?.states ?? prevStates, remaining = d?.remaining ?? Object.fromEntries(input.jobs.map(j => [j.id, j.bursts[0]]));
  const current = d?.current ?? null, phase = (last?.kind ?? 'initial') as CpuKind;
  const jobs = input.jobs.map(j => ({ id: j.id, label: label(j.id), arrival: j.arrival, priority: j.priority ?? null, state: states[j.id] ?? 'new', remaining: remaining[j.id] ?? j.bursts[0],
    waiting: waiting[j.id], current: current === j.id, eventActor: last?.actor === j.id }));
  const arrived = jobs.filter(j => j.state !== 'new');
  const finished = input.jobs.length > 0 && jobs.every(j => j.state === 'done');
  const reason = reasons[input.policy] ?? '정책에 맞는';
  const summaries: Record<CpuKind, string> = {
    initial: '작업이 도착하는 대로 정책에 따라 CPU를 나눠 쓰는 과정을 살펴봅니다.',
    arrive: '새 작업이 도착해 준비 큐에 들어왔습니다.',
    dispatch: `준비 큐에서 ${reason} 작업을 골라 CPU에 올렸습니다.`,
    run: 'CPU가 한 단위 실행했습니다.',
    expire: '할당량을 모두 써서 준비 큐 맨 뒤로 갔습니다.',
    preempt: '더 앞서야 할 작업이 와서 실행 중이던 작업을 준비 큐로 내렸습니다.',
    block: 'I/O를 기다리기 위해 대기 상태가 되었습니다.',
    unblock: 'I/O가 끝나 준비 큐로 돌아왔습니다.',
    finish: '작업이 모든 실행을 마쳤습니다.',
    idle: '실행할 준비 작업이 없어 CPU가 쉬었습니다.',
  };
  return {
    model, policy: input.policy, quantum: input.quantum, time: d?.time ?? 0,
    horizon: Math.max(1, ...input.jobs.map(j => j.arrival)) + input.jobs.reduce((s, j) => s + j.bursts.reduce((a, b) => a + b, 0), 0),
    phase, current, eventActor: last?.actor ?? null, ready: d?.ready ?? [], quantumUsed: model === 'RR' && current ? quantumUsed : null,
    jobs, segments, averageWaiting: arrived.length ? arrived.reduce((s, j) => s + j.waiting, 0) / arrived.length : 0, finished,
    event: last ? structuredClone(last) : null, summary: finished && phase === 'finish' ? '모든 작업이 끝났습니다. 정책에 따라 평균 대기 시간이 달라집니다.' : summaries[phase],
  };
}

function validInput(model: CpuModel, instance: SimulationInstance) {
  checkShape(registry[model].inputSchema, instance.input, 'input');
  const input = instance.input as unknown as Input;
  requireValue(new Set(input.jobs.map(j => j.id)).size === input.jobs.length, '작업 ID가 중복됩니다.');
  return input;
}

/** The observed prefix must equal the engine's own run of this input; never reads execution.result. */
export function cpuSnapshot(instance: SimulationInstance, execution: ModelRun | null, cursor: number): CpuSnapshot {
  const model = instance.scenarioId;
  requireValue(isCpu(model), 'CPU 스케줄링 모델이 아닙니다.');
  requireValue(Number.isInteger(cursor), '현재 사건 위치를 확인하세요.');
  requireValue(execution === null || execution.id === model, '실행 기록의 모델이 다릅니다.');
  const input = validInput(model, instance);
  const events = execution?.events.slice(0, Math.max(0, cursor + 1)) ?? [];
  if (events.length) {
    const expected = run(model, instance.input).events;
    requireValue(events.length <= expected.length, '사건 수가 입력의 실행보다 많습니다.');
    for (const [i, e] of events.entries()) {
      checkShape(registry[model].eventSchema, e, 'event');
      requireValue(JSON.stringify(e) === JSON.stringify(expected[i]), '사건이 입력의 실행과 다릅니다.');
    }
  }
  return build(model, instance, input, events);
}

export interface CpuComparisonRow { policy: string; primary: boolean; snapshot: CpuSnapshot }
/**
 * G2 compares FCFS/SJF/SRTF at the same time. The problem's policy row is the validated trace; the others are
 * independent runs of the same jobs cut at the same time (display only, never graded or recorded).
 */
export function cpuComparison(instance: SimulationInstance, execution: ModelRun | null, cursor: number): CpuComparisonRow[] {
  requireValue(instance.scenarioId === 'G2', '정책 비교는 G2 모델에서만 사용합니다.');
  const primary = cpuSnapshot(instance, execution, cursor), input = instance.input as unknown as Input;
  return ['FCFS', 'SJF', 'SRTF'].map(policy => {
    if (policy === input.policy) return { policy, primary: true, snapshot: primary };
    const other = { ...instance, input: { ...instance.input, policy } } as SimulationInstance;
    const events = execution === null ? [] : run('G2', other.input).events.filter(e => (e.data as unknown as Data).time <= primary.time);
    return { policy, primary: false, snapshot: build('G2', other, other.input as unknown as Input, events) };
  });
}
