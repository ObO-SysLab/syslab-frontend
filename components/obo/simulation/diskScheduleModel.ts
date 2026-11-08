import type { ModelRun } from '../runtime/index.mjs';
import type { SimulationInstance } from '../runtime/document.mjs';
import { labelOf, requireRule, verifiedPrefix } from './rulePrefix';

export type DsPolicy = 'FCFS' | 'SSTF' | 'SCAN' | 'CSCAN';
export type DsPhase = 'initial' | 'move' | 'service' | 'wrap';
export interface DsRequest { id: string; label: string; position: number; order: number | null; current: boolean }
/** One head position on the path so far; `wrap` marks the C-SCAN jump that ended here, `service` the request handled here. */
export interface DsStop { position: number; service: string | null; wrap: boolean }
export interface DsSnapshot {
  policy: DsPolicy;
  direction: -1 | 1;
  max: number;
  start: number;
  head: number;
  distance: number;
  phase: DsPhase;
  path: DsStop[];
  requests: DsRequest[];
  served: string[];
  finished: boolean;
  summary: string;
}

interface Input { requests: { id: string; position: number }[]; start: number; max: number; policy: DsPolicy; direction: -1 | 1 }
interface Data { from: number; to: number; service: string | null; distance: number }

export const policyNames: Record<DsPolicy, string> = { FCFS: 'FCFS', SSTF: 'SSTF', SCAN: 'SCAN', CSCAN: 'C-SCAN' };
const reasons: Record<DsPolicy, string> = { FCFS: '도착한 순서상 다음', SSTF: '현재 위치에서 가장 가까운', SCAN: '진행 방향의 다음', CSCAN: '진행 방향의 다음' };

export function diskSnapshot(instance: SimulationInstance, execution: ModelRun | null, cursor: number): DsSnapshot {
  const events = verifiedPrefix('DS', instance, execution, cursor);
  const input = instance.input as unknown as Input, label = labelOf(instance);
  const path: DsStop[] = [{ position: input.start, service: null, wrap: false }], served: string[] = [];
  for (const e of events) {
    const d = e.data as unknown as Data;
    if (e.kind === 'service') {
      requireRule(d.service !== null, '처리 사건에 요청이 없습니다.');
      served.push(d.service);
      const at = path.at(-1)!;
      if (at.position === d.to && at.service === null) at.service = d.service; else path.push({ position: d.to, service: d.service, wrap: false });
    } else path.push({ position: d.to, service: null, wrap: e.kind === 'wrap' });
  }
  const last = events.at(-1), d = last?.data as unknown as Data | undefined, phase = (last?.kind ?? 'initial') as DsPhase;
  const order = new Map(served.map((id, i) => [id, i + 1]));
  const requests = input.requests.map(r => ({ id: r.id, label: label(r.id), position: r.position, order: order.get(r.id) ?? null, current: phase === 'service' && d?.service === r.id }));
  const finished = served.length === input.requests.length && events.length > 0;
  const toRequest = phase === 'move' && input.requests.some(r => r.position === d!.to && !order.has(r.id));
  const summaries: Record<DsPhase, string> = {
    initial: '대기 중인 요청을 정책에 따라 어떤 순서로 처리하는지, 헤드가 얼마나 움직이는지 살펴봅니다.',
    move: toRequest ? `${reasons[input.policy]} 요청 위치로 헤드를 옮겼습니다.` : '진행 방향의 디스크 끝까지 헤드를 옮겼습니다.',
    service: '헤드 위치의 요청을 처리했습니다.',
    wrap: '처리하지 않고 반대쪽 끝으로 되돌아갔습니다. 되돌아간 거리도 이동 거리에 포함됩니다.',
  };
  return {
    policy: input.policy, direction: input.direction, max: input.max, start: input.start, head: d?.to ?? input.start, distance: d?.distance ?? 0, phase, path, requests, served, finished,
    summary: finished && phase === 'service' ? '모든 요청을 처리했습니다. 같은 요청이라도 정책에 따라 총 이동 거리가 달라집니다.' : summaries[phase],
  };
}
