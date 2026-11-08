import type { ModelRun } from '../runtime/index.mjs';
import type { SimulationInstance } from '../runtime/document.mjs';
import { labelOf, requireRule, verifiedPrefix } from './rulePrefix';

export type FitPolicy = 'first' | 'best' | 'worst';
export type FitPhase = 'initial' | 'allocate' | 'free' | 'reject';
export interface FitBlock { start: number; size: number; owner: string | null; label: string | null }
/** A hole of the state before the current request that is large enough; `picks` lists the policies that would choose it. */
export interface FitCandidate { start: number; size: number; picks: FitPolicy[] }
export interface FitOperation { index: number; op: 'alloc' | 'free'; id: string; label: string; size: number | null; status: 'done' | 'rejected' | 'current' | 'pending' }
export interface FitSnapshot {
  policy: FitPolicy;
  total: number;
  phase: FitPhase;
  blocks: FitBlock[];
  operation: FitOperation | null;
  operations: FitOperation[];
  candidates: FitCandidate[];
  /** Range placed (allocate) or released (free) by the current request. */
  highlight: { kind: 'placed' | 'freed'; start: number; size: number } | null;
  freeTotal: number;
  largest: number;
  holes: number;
  /** Rejected although the free total could hold the request: external fragmentation. */
  fragmented: boolean;
  /** The released block joined a neighbouring hole. */
  merged: boolean;
  summary: string;
}

interface Op { op: 'alloc' | 'free'; id: string; size?: number }
interface Input { total: number; initial: { start: number; size: number; owner: string | null }[]; operations: Op[]; policy: FitPolicy }
type Raw = { start: number; size: number; owner: string | null };

export const policyNames: Record<FitPolicy, string> = { first: 'First fit', best: 'Best fit', worst: 'Worst fit' };
const reasons: Record<FitPolicy, string> = { first: '주소가 가장 앞선', best: '들어갈 수 있는 것 중 가장 작은', worst: '가장 큰' };

function merged(blocks: Raw[]) {
  const out: Raw[] = [];
  for (const b of blocks) { const last = out.at(-1); if (last && last.owner === null && b.owner === null) last.size += b.size; else out.push({ ...b }); }
  return out;
}
/** Same ordering as the engine: first by address, best by smallest size, worst by largest size; ties by address. */
function choose(policy: FitPolicy, holes: Raw[]) {
  return [...holes].sort((a, b) => (policy === 'first' ? a.start - b.start : policy === 'best' ? a.size - b.size : b.size - a.size) || a.start - b.start)[0] ?? null;
}

export function fitSnapshot(instance: SimulationInstance, execution: ModelRun | null, cursor: number): FitSnapshot {
  const events = verifiedPrefix('MF', instance, execution, cursor);
  const input = instance.input as unknown as Input, label = labelOf(instance);
  const states: Raw[][] = [merged(input.initial), ...events.map(e => (e.data as unknown as { blocks: Raw[] }).blocks)];
  const before = states.at(-2) ?? states[0], blocks = states.at(-1)!;
  const last = events.at(-1), phase = (last?.kind ?? 'initial') as FitPhase, at = last ? (last.data as unknown as { index: number }).index : -1;
  requireRule(!last || input.operations[at]?.id === last.actor, '요청과 사건이 맞지 않습니다.');
  const operations: FitOperation[] = input.operations.map((o, index) => ({
    index, op: o.op, id: o.id, label: label(o.id), size: o.op === 'alloc' ? o.size ?? null : null,
    // Each operation emits exactly one event, so events[index] is that operation's outcome.
    status: index < at ? (events[index].kind === 'reject' ? 'rejected' : 'done') : index === at ? 'current' : 'pending',
  }));
  const operation = at >= 0 ? operations[at] : null;
  let candidates: FitCandidate[] = [], highlight: FitSnapshot['highlight'] = null, isMerged = false;
  if (operation?.op === 'alloc') {
    const fits = before.filter(b => b.owner === null && b.size >= operation.size!);
    const picks = Object.fromEntries((['first', 'best', 'worst'] as FitPolicy[]).map(p => [p, choose(p, fits)?.start ?? null]));
    candidates = fits.map(b => ({ start: b.start, size: b.size, picks: (['first', 'best', 'worst'] as FitPolicy[]).filter(p => picks[p] === b.start) }));
    const placed = blocks.find(b => b.owner === operation.id);
    if (phase === 'allocate' && placed) highlight = { kind: 'placed', start: placed.start, size: placed.size };
  } else if (operation?.op === 'free') {
    const old = before.find(b => b.owner === operation.id);
    if (old) { highlight = { kind: 'freed', start: old.start, size: old.size }; isMerged = !blocks.some(b => b.owner === null && b.start === old.start && b.size === old.size); }
  }
  const holes = blocks.filter(b => b.owner === null), freeTotal = holes.reduce((s, b) => s + b.size, 0), largest = Math.max(0, ...holes.map(b => b.size));
  const fragmented = phase === 'reject' && operation?.size != null && freeTotal >= operation.size;
  const remainder = highlight?.kind === 'placed' ? (candidates.find(c => c.start === highlight!.start)?.size ?? highlight.size) - highlight.size : 0;
  const summaries: Record<FitPhase, string> = {
    initial: '요청이 오는 순서대로 빈 구멍을 골라 연속 공간을 나눠 주는 과정을 살펴봅니다.',
    allocate: `${reasons[input.policy]} 빈 구멍을 골라 요청 크기만큼 할당했습니다.${remainder > 0 ? ' 남은 부분은 더 작은 구멍으로 남습니다.' : ''}`,
    free: isMerged ? '블록을 해제했습니다. 이웃한 빈 구멍과 합쳐져 더 큰 구멍이 되었습니다.' : '블록을 해제해 빈 구멍이 되었습니다.',
    reject: fragmented ? '빈 공간의 합은 충분하지만 요청을 담을 만큼 큰 구멍이 없어 할당하지 못했습니다(외부 단편화).' : '남은 빈 공간이 요청보다 작아 할당하지 못했습니다.',
  };
  return {
    policy: input.policy, total: input.total, phase, operation, operations, candidates, highlight, freeTotal, largest, holes: holes.length, fragmented, merged: isMerged,
    blocks: blocks.map(b => ({ ...b, label: b.owner === null ? null : label(b.owner) })), summary: summaries[phase],
  };
}
