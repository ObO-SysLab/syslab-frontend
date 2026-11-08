import { checkShape, registry } from '../runtime/index.mjs';
import type { ModelRun, SemanticEvent } from '../runtime/index.mjs';
import type { SimulationInstance } from '../runtime/document.mjs';

export type TlbPhase = 'initial' | 'lookup' | 'pageTable' | 'translate' | 'fault';
export interface TlbEntry { page: number; frame: number }
export interface TlbPageTableRow {
  page: number;
  frame: number | null;
  field: string;
  nodeKey: string;
  active: boolean;
}
export interface TlbCurrent {
  index: number;
  address: number;
  page: number;
  offset: number;
  hit: boolean;
  pageTableVisited: boolean;
}
export interface TlbResult {
  hit: boolean;
  fault: boolean;
  physical: number | null;
  frame: number | null;
}
export interface TlbSnapshot {
  pageSize: number;
  capacity: number;
  phase: TlbPhase;
  pageTable: TlbPageTableRow[];
  tlb: TlbEntry[];
  lookupTlb: TlbEntry[] | null;
  current: TlbCurrent | null;
  result: TlbResult | null;
  inserted: TlbEntry | null;
  evicted: TlbEntry | null;
  event: SemanticEvent | null;
  summary: string;
}
interface TlbInput {
  addresses: number[];
  pageSize: number;
  table: (number | null)[];
  capacity: number;
  initialTlb: TlbEntry[];
}
interface TlbEventData {
  index: number;
  address: number;
  page: number;
  offset: number;
  tlb: TlbEntry[];
}

function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`TLB 표시: ${message}`);
}
const copyCache = (entries: TlbEntry[]) => entries.map(entry => ({ ...entry }));
const sameCache = (a: TlbEntry[], b: TlbEntry[]) => a.length === b.length
  && a.every((entry, index) => entry.page === b[index].page && entry.frame === b[index].frame);

/** Display the selected trace prefix; final translations and future operations are never read. */
export function tlbSnapshot(instance: SimulationInstance, execution: ModelRun | null, cursor: number): TlbSnapshot {
  requireValue(instance.scenarioId === 'TLB', '주소 변환 모델이 아닙니다.');
  requireValue(Number.isInteger(cursor), '현재 사건 위치를 확인하세요.');
  requireValue(execution === null || execution.id === 'TLB', '실행 기록의 모델이 다릅니다.');
  checkShape(registry.TLB.inputSchema, instance.input, 'input');
  const input = instance.input as unknown as TlbInput;
  const { addresses, pageSize, table, capacity } = input;
  const validateCache = (cache: TlbEntry[]) => {
    requireValue(cache.length <= capacity, 'TLB 용량을 초과했습니다.');
    requireValue(new Set(cache.map(entry => entry.page)).size === cache.length, 'TLB 페이지가 중복되었습니다.');
    requireValue(cache.every(entry => entry.page < table.length && table[entry.page] !== null
      && entry.frame === table[entry.page]), 'TLB와 페이지 테이블이 일치하지 않습니다.');
  };
  validateCache(input.initialTlb);
  requireValue(addresses.every(address => address < pageSize * table.length), '주소 범위를 벗어났습니다.');
  const events = execution?.events.slice(0, Math.max(0, cursor + 1)) ?? [];
  let tlb = copyCache(input.initialTlb), lookupTlb: TlbEntry[] | null = null;
  let phase: TlbPhase = 'initial', current: TlbCurrent | null = null, result: TlbResult | null = null;
  let inserted: TlbEntry | null = null, evicted: TlbEntry | null = null;
  for (const [position, event] of events.entries()) {
    checkShape(registry.TLB.eventSchema, event, 'event');
    const data = event.data as unknown as TlbEventData;
    const kind = event.kind as Exclude<TlbPhase, 'initial'>;
    requireValue(event.step === position && event.actor === null, '사건 순서와 주체를 확인하세요.');
    requireValue(data.index < addresses.length && data.address === addresses[data.index]
      && data.page === Math.floor(data.address / pageSize) && data.offset === data.address % pageSize,
    '사건의 주소·페이지·오프셋이 입력과 다릅니다.');
    validateCache(data.tlb);
    if (kind === 'lookup') {
      requireValue((phase === 'initial' || phase === 'translate' || phase === 'fault')
        && data.index === (current === null ? 0 : current.index + 1), '주소 조회 순서가 올바르지 않습니다.');
      requireValue(sameCache(data.tlb, tlb), '조회 전 TLB 내용이 실행 기록과 다릅니다.');
      lookupTlb = copyCache(data.tlb);
      current = { index: data.index, address: data.address, page: data.page, offset: data.offset,
        hit: lookupTlb.some(entry => entry.page === data.page), pageTableVisited: false };
      result = null;
      inserted = null;
      evicted = null;
    } else {
      requireValue(current !== null && lookupTlb !== null && data.index === current.index,
        '현재 주소의 조회 사건이 없습니다.');
      if (kind === 'pageTable') {
        requireValue(phase === 'lookup' && !current.hit && sameCache(data.tlb, lookupTlb),
          '페이지 테이블 조회가 현재 TLB 조회와 다릅니다.');
        current.pageTableVisited = true;
      } else if (kind === 'fault') {
        requireValue(phase === 'pageTable' && !current.hit && table[current.page] === null
          && sameCache(data.tlb, lookupTlb), '페이지 부재 사건이 입력 또는 조회 기록과 다릅니다.');
        result = { hit: false, fault: true, physical: null, frame: null };
      } else {
        requireValue(current.hit ? phase === 'lookup' : phase === 'pageTable', '주소 변환의 조회 순서가 다릅니다.');
        const frame = table[current.page];
        requireValue(frame !== null, '부재 페이지는 물리 주소로 변환할 수 없습니다.');
        if (current.hit) {
          requireValue(sameCache(data.tlb, lookupTlb), 'TLB hit에서 FIFO 순서가 바뀌었습니다.');
        } else {
          // Validate only an observed translate, then describe its actual FIFO insertion/eviction.
          const expected = copyCache(lookupTlb);
          if (expected.length === capacity) evicted = { ...expected.shift()! };
          inserted = { page: current.page, frame };
          expected.push(inserted);
          requireValue(sameCache(data.tlb, expected), 'TLB 삽입 또는 FIFO 교체 기록이 다릅니다.');
        }
        const physical = frame * pageSize + current.offset;
        requireValue(Number.isSafeInteger(physical), '물리 주소가 안전한 정수 범위를 벗어났습니다.');
        result = { hit: current.hit, fault: false, physical, frame };
      }
    }
    tlb = copyCache(data.tlb);
    phase = kind;
  }
  const pageTable = table.map((frame, page) => ({
    page, frame, field: `페이지 ${page}`, nodeKey: `page-table:${page}`,
    active: current !== null && current.pageTableVisited && current.page === page,
  }));
  // Explanations describe phases without leaking numbers from a hidden view group.
  let summary = '가상 주소를 페이지와 오프셋으로 나눈 뒤 TLB에서 매핑을 찾습니다.';
  if (phase === 'lookup') summary = current?.hit
    ? 'TLB에서 매핑을 찾았습니다. 페이지 테이블 조회가 필요하지 않습니다.'
    : 'TLB에 매핑이 없습니다. 페이지 테이블 조회가 필요합니다.';
  else if (phase === 'pageTable') summary = 'TLB에서 찾지 못한 매핑을 페이지 테이블에서 확인합니다.';
  else if (phase === 'fault') summary = '페이지 테이블에 프레임이 없어 주소를 변환할 수 없습니다. TLB의 내용은 그대로입니다.';
  else if (phase === 'translate') summary = current?.hit
    ? 'TLB의 매핑으로 물리 주소 변환을 완료했습니다.'
    : evicted ? '주소 변환을 완료하고, 가장 먼저 들어온 TLB 항목을 새 매핑으로 교체했습니다.'
      : '페이지 테이블의 매핑으로 주소를 변환하고 TLB에 새 항목을 추가했습니다.';
  return { pageSize, capacity, phase, pageTable, tlb, lookupTlb, current, result, inserted, evicted,
    event: events.length ? structuredClone(events[events.length - 1]) : null, summary };
}
