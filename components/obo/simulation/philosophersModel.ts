import type { ModelRun } from '../runtime/index.mjs';
import type { SimulationInstance } from '../runtime/document.mjs';
import { labelOf, requireRule, verifiedPrefix } from './rulePrefix';

export type DpPolicy = 'left' | 'ordered' | 'admission';
export type DpPhase = 'initial' | 'think' | 'request' | 'acquire' | 'eat' | 'release';
export type DpState = 'thinking' | 'hungry' | 'waiting' | 'eating';
export type DpStop = 'running' | 'scheduleEnd' | 'goalReached' | 'deadlocked';
export interface DpPhilosopher { id: string; label: string; state: DpState; forks: number[]; wants: number | null; meals: number; goal: number | null; eventActor: boolean }
/** Fork i lies between philosopher i and philosopher i+1 on the logical ring. */
export interface DpFork { index: number; owner: string | null }
export interface DpTurn { index: number; actor: string; label: string; status: 'done' | 'current' | 'pending' }
export interface DpSnapshot {
  policy: DpPolicy;
  mode: 'fixedSchedule' | 'findSchedule';
  phase: DpPhase;
  actor: string | null;
  philosophers: DpPhilosopher[];
  forks: DpFork[];
  turns: DpTurn[];
  turn: number;
  stop: DpStop | null;
  summary: string;
}

interface Input { actors: string[]; order: string[]; policy: DpPolicy; mode: 'fixedSchedule' | 'findSchedule'; thinkTicks: Record<string, number>; eatTicks: Record<string, number>; goalMeals: Record<string, number> }
interface Data { owners: (string | null)[]; states: Record<string, DpState>; stopReason: DpStop }

export const policyNames: Record<DpPolicy, string> = { left: '왼쪽 포크 먼저', ordered: '번호가 작은 포크 먼저', admission: '동시에 n−1명까지만' };

/** Fork order each philosopher follows, as in the engine: own index then the next; `ordered` takes the smaller number first. */
export function forkOrder(policy: DpPolicy, n: number, p: number) {
  const r = [p, (p + 1) % n];
  return policy === 'ordered' ? r.sort((a, b) => a - b) : r;
}

export function dpSnapshot(instance: SimulationInstance, execution: ModelRun | null, cursor: number): DpSnapshot {
  const events = verifiedPrefix('DP', instance, execution, cursor);
  const input = instance.input as unknown as Input, label = labelOf(instance), n = input.actors.length;
  const last = events.at(-1), d = last?.data as unknown as Data | undefined;
  const owners = d?.owners ?? Array<string | null>(n).fill(null);
  requireRule(owners.length === n, '포크 수가 철학자 수와 다릅니다.');
  const states = d?.states ?? Object.fromEntries(input.actors.map(id => [id, 'thinking' as DpState]));
  const meals: Record<string, number> = Object.fromEntries(input.actors.map(id => [id, 0]));
  for (const e of events) if (e.kind === 'release' && e.actor) meals[e.actor]++;
  const philosophers: DpPhilosopher[] = input.actors.map((id, p) => {
    const forks = owners.flatMap((o, f) => o === id ? [f] : []), state = states[id];
    const wants = (state === 'hungry' || state === 'waiting') && forks.length < 2 ? forkOrder(input.policy, n, p).find(f => !forks.includes(f)) ?? null : null;
    return { id, label: label(id), state, forks, wants, meals: meals[id], goal: Object.hasOwn(input.goalMeals, id) ? input.goalMeals[id] : null, eventActor: last?.actor === id };
  });
  // Events follow the order one turn each (a findSchedule run stops early once the goal is reached).
  const turn = events.length - 1;
  const turns: DpTurn[] = input.order.map((actor, index) => ({ index, actor, label: label(actor), status: index < turn ? 'done' : index === turn ? 'current' : 'pending' }));
  const phase = (last?.kind ?? 'initial') as DpPhase, stop = d?.stopReason ?? null;
  const me = philosophers.find(p => p.id === last?.actor);
  // The engine waits when the next fork is taken, or (admission) when the fork is free but the seat limit is reached.
  const seatLimited = me?.state === 'waiting' && me.wants !== null && owners[me.wants] === null;
  const summaries: Record<DpPhase, string> = {
    initial: '철학자들이 정해진 순서대로 양쪽 포크를 집어 식사하는 과정을 살펴봅니다. 이웃한 철학자는 사이의 포크 하나를 함께 씁니다.',
    think: '생각하는 중입니다. 생각을 마치면 배가 고파집니다.',
    request: me?.state === 'waiting' ? (seatLimited ? '포크는 비어 있지만 동시에 포크를 집을 수 있는 인원이 차서 기다립니다.' : '집으려는 포크를 이웃이 들고 있어 기다립니다.') : '배가 고파져 포크를 집으려 합니다.',
    acquire: '포크 하나를 집었습니다.',
    eat: '양쪽 포크를 모두 들고 식사합니다.',
    release: '식사를 마치고 두 포크를 내려놓았습니다. 이웃이 포크를 쓸 수 있습니다.',
  };
  const ends: Partial<Record<DpStop, string>> = {
    deadlocked: '모든 철학자가 다음 포크를 기다려 아무도 진행할 수 없습니다(교착).',
    scheduleEnd: '정해진 순서가 끝났습니다. 이 순서에서는 교착이 없었지만, 다른 순서까지 보장한다는 뜻은 아닙니다.',
    goalReached: '식사 목표에 도달했습니다.',
  };
  const summary = stop && stop !== 'running' ? `${summaries[phase]} ${ends[stop]}` : summaries[phase];
  return { policy: input.policy, mode: input.mode, phase, actor: last?.actor ?? null, philosophers, forks: owners.map((owner, index) => ({ index, owner })), turns, turn, stop, summary };
}
