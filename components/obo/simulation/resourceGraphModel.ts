import type { ModelRun } from '../runtime/index.mjs';
import type { SimulationInstance } from '../runtime/document.mjs';
import { labelOf, requireRule, verifiedPrefix } from './rulePrefix';

export type RagPhase = 'initial' | 'request' | 'grant' | 'release' | 'detect';
export type RagState = 'idle' | 'holding' | 'waiting' | 'deadlocked';
export interface RagProcess { id: string; label: string; holds: number[]; wants: number[]; state: RagState; eventActor: boolean }
export interface RagResource { id: string; label: string; total: number; available: number; owners: (string | null)[] }
export interface RagEdge { kind: 'assign' | 'request'; process: string; resource: string; count: number; deadlocked: boolean }
export interface RagAction { index: number; actor: string; label: string; op: 'request' | 'release'; values: number[]; status: 'done' | 'current' | 'pending' }
export interface RagSnapshot {
  phase: RagPhase;
  actor: string | null;
  processes: RagProcess[];
  resources: RagResource[];
  edges: RagEdge[];
  actions: RagAction[];
  action: RagAction | null;
  /** Detection result computed from the current allocation/request/available, only at the detect event. */
  detected: boolean;
  deadlocked: string[];
  /** Some resource has several instances, so a cycle alone does not decide a deadlock. */
  multiInstance: boolean;
  /** At a request: whether the current available vector covers it (the grant itself is the next event). */
  coverable: boolean | null;
  summary: string;
}

interface Input { actors: string[]; resources: string[]; available: number[]; allocated: number[][]; requests: number[][]; actions: { actor: string; op: 'request' | 'release'; values: number[] }[] }
interface Data { available: number[]; allocations: number[][]; requests: number[][] }
const fits = (a: number[], b: number[]) => a.every((v, i) => v <= b[i]);

/** Detection algorithm on the given state (requests as the outstanding need); same rule as the engine's detect step. */
export function detectDeadlock(available: number[], allocations: number[][], requests: number[][]) {
  const work = [...available], done = new Set<number>();
  for (let changed = true; changed;) {
    changed = false;
    for (let p = 0; p < allocations.length; p++) if (!done.has(p) && fits(requests[p], work)) { allocations[p].forEach((v, i) => { work[i] += v; }); done.add(p); changed = true; }
  }
  return allocations.map((_, p) => p).filter(p => !done.has(p) && allocations[p].some(v => v > 0));
}

export function ragSnapshot(instance: SimulationInstance, execution: ModelRun | null, cursor: number): RagSnapshot {
  const events = verifiedPrefix('S3', instance, execution, cursor);
  const input = instance.input as unknown as Input, label = labelOf(instance);
  requireRule(input.allocated.length === input.actors.length && input.requests.length === input.actors.length, '행렬의 프로세스 수를 확인하세요.');
  const last = events.at(-1), phase = (last?.kind ?? 'initial') as RagPhase;
  const d: Data = last ? last.data as unknown as Data : { available: input.available, allocations: input.allocated, requests: input.requests };
  // Map events to actions: a request may be followed by its grant; detect comes after every action.
  let at = -1;
  for (const e of events) if (e.kind === 'request' || e.kind === 'release') at++;
  const actions: RagAction[] = input.actions.map((a, index) => ({ index, actor: a.actor, label: label(a.actor), op: a.op, values: a.values, status: index < at || phase === 'detect' ? 'done' : index === at ? 'current' : 'pending' }));
  const action = phase !== 'detect' && at >= 0 ? actions[at] : null;
  const totals = input.resources.map((_, i) => input.available[i] + input.allocated.reduce((s, row) => s + row[i], 0));
  const detected = phase === 'detect', deadlocked = detected ? detectDeadlock(d.available, d.allocations, d.requests).map(p => input.actors[p]) : [];
  const dead = new Set(deadlocked);
  const processes: RagProcess[] = input.actors.map((id, p) => {
    const holds = d.allocations[p], wants = d.requests[p];
    const state: RagState = dead.has(id) ? 'deadlocked' : wants.some(v => v > 0) ? 'waiting' : holds.some(v => v > 0) ? 'holding' : 'idle';
    return { id, label: label(id), holds, wants, state, eventActor: last?.actor === id };
  });
  const resources: RagResource[] = input.resources.map((id, i) => {
    const owners: (string | null)[] = [];
    input.actors.forEach((p, k) => { for (let n = 0; n < d.allocations[k][i]; n++) owners.push(p); });
    while (owners.length < totals[i]) owners.push(null);
    return { id, label: label(id), total: totals[i], available: d.available[i], owners };
  });
  const edges: RagEdge[] = [];
  input.actors.forEach((p, k) => input.resources.forEach((r, i) => {
    if (d.allocations[k][i] > 0) edges.push({ kind: 'assign', process: p, resource: r, count: d.allocations[k][i], deadlocked: dead.has(p) });
    if (d.requests[k][i] > 0) edges.push({ kind: 'request', process: p, resource: r, count: d.requests[k][i], deadlocked: dead.has(p) });
  }));
  const multiInstance = totals.some(t => t > 1);
  const coverable = phase === 'request' && last?.actor ? fits(d.requests[input.actors.indexOf(last.actor)], d.available) : null;
  const summaries: Record<RagPhase, string> = {
    initial: '프로세스가 자원을 요청하고 할당받는 관계를 그래프로 살펴봅니다. 실선은 보유, 점선은 요청입니다.',
    request: coverable ? '자원을 요청했습니다. 가용 자원이 충분해 바로 할당할 수 있습니다.' : '자원을 요청했지만 가용 자원이 부족해 요청한 채로 기다립니다.',
    grant: '가용 자원에서 요청한 만큼 할당했습니다. 요청 점선이 보유 실선으로 바뀝니다.',
    release: '보유하던 자원을 반납해 가용 자원이 늘었습니다.',
    detect: deadlocked.length
      ? `검출 알고리즘으로 확인한 결과, 강조된 프로세스들은 서로가 보유한 자원을 기다려 더 진행할 수 없는 교착 상태입니다.${multiInstance ? ' 여러 개인 자원이 있어 순환만 보고 판단하지 않고 가용량으로 계산했습니다.' : ''}`
      : `검출 알고리즘으로 확인한 결과 교착 상태인 프로세스가 없습니다.${multiInstance && edges.some(e => e.kind === 'request') ? ' 여러 개인 자원은 순환이 있어도 교착이 아닐 수 있습니다.' : ''}`,
  };
  return { phase, actor: last?.actor ?? null, processes, resources, edges, actions, action, detected, deadlocked, multiInstance, coverable, summary: summaries[phase] };
}
