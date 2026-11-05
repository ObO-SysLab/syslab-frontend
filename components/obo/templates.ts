import type { Node, Edge } from '@xyflow/react';
import type { Frame } from './types';
import { ROUND_ROBIN_TEMPLATE } from './gantt/roundRobinExample';
import { PAGE_REPLACEMENT_TEMPLATE } from './slots/pageReplacementExample';
import { RESOURCE_ALLOCATION_TEMPLATE } from './resourceAllocationExample';
import { REMAINING_TEMPLATES } from './examples/remaining';

// ── 팔레트 원소 타입 ───────────────────────────────────────────────
export type NodeComponentType =
  | 'state-node'
  | 'resource-square'
  | 'slot-grid'
  | 'queue-strip'
  | 'table-grid'
  | 'memory-range'
  | 'process-box'
  | 'counter-badge';

export type ChartComponentType =
  | 'gantt-lane'
  | 'line-chart';

export type TextComponentType =
  | 'text-label';

export type PaletteComponentType =
  | NodeComponentType
  | ChartComponentType
  | TextComponentType;

// ── Edge 타입 ─────────────────────────────────────────────────────
export type EdgeType =
  | 'directed'
  | 'bidirectional'
  | 'allocation';

// ── 팔레트 메타 ───────────────────────────────────────────────────
export interface PaletteItem {
  type: PaletteComponentType;
  label: string;
  group: 'node' | 'chart' | 'text';
  description: string;
}

export const PALETTE_ITEMS: PaletteItem[] = [
  { type: 'state-node',    group: 'node',  label: 'State Node',      description: '상태/엔터티 (ST2)' },
  { type: 'text-label',    group: 'text',  label: 'Text Label',      description: '텍스트/주석' },
  { type: 'gantt-lane', group: 'chart', label: '간트 줄', description: '프로세스별 실행 구간' },
  { type: 'slot-grid', group: 'node', label: '칸 묶음', description: '칸의 값과 장면별 변화' },
  { type: 'resource-square', group: 'node', label: '자원', description: '자원 개수와 사용 상태' },
  { type: 'counter-badge', group: 'node', label: '숫자 표시', description: '개수와 장면별 값' },
  { type: 'queue-strip', group: 'node', label: '버퍼·큐', description: '용량과 항목 순서' },
  { type: 'table-grid', group: 'node', label: '표', description: '행·열·셀 값' },
  { type: 'memory-range', group: 'node', label: '메모리 구간', description: '주소와 구간 길이' },
  { type: 'process-box', group: 'node', label: '프로세스 영역', description: '공유 공간과 스레드' },
  { type: 'line-chart', group: 'chart', label: '꺾은선 그래프', description: '좌표와 현재 점' },
];

export const PALETTE_GROUPS = [
  { id: 'node', label: 'NODE' },
  { id: 'edge', label: 'EDGE' },
  { id: 'text', label: 'TEXT' },
] as const;

export const EDGE_TYPES: { type: EdgeType; label: string; description: string }[] = [
  { type: 'directed',      label: '단방향',    description: '기본 방향 화살표' },
  { type: 'bidirectional', label: '양방향',    description: '양쪽 화살표' },
  { type: 'allocation',    label: '할당/요청', description: 'RAG 점선 엣지' },
];

// ── 템플릿 인터페이스 ──────────────────────────────────────────────
export interface OBOTemplate {
  id: string;
  name: string;
  category: 'cpu' | 'memory' | 'sync' | 'fs' | 'process';
  description: string;
  defaultNodes: Node[];
  defaultEdges: Edge[];
  defaultFrames?: Frame[];
}

// 전체 템플릿 정의(제거하지 않고 보존). 실제 노출은 아래 ACTIVE_TEMPLATE_IDS로 필터.
// 비활성 템플릿을 직접 참조해야 하는 테스트/내부 용도는 이 배열을 쓴다.
export const ALL_OBO_TEMPLATES: OBOTemplate[] = [
  {
    id: 'ST2',
    name: '프로세스 상태 전이',
    category: 'cpu',
    description: '노드-엣지',
    defaultNodes: [
      {
        id: 'new',
        type: 'state-node',
        position: { x: 50, y: 180 },
        data: { label: 'New', shape: 'circle', fill: '#64748b' },
      },
      {
        id: 'ready',
        type: 'state-node',
        position: { x: 270, y: 70 },
        data: { label: 'Ready', shape: 'circle', fill: '#7c3aed' },
      },
      {
        id: 'running',
        type: 'state-node',
        position: { x: 490, y: 180 },
        data: { label: 'Running', shape: 'circle', fill: '#0d9488' },
      },
      {
        id: 'waiting',
        type: 'state-node',
        position: { x: 270, y: 300 },
        data: { label: 'Waiting', shape: 'circle', fill: '#d97706' },
      },
      {
        id: 'terminated',
        type: 'state-node',
        position: { x: 720, y: 180 },
        data: { label: 'Terminated', shape: 'circle', fill: '#e11d48' },
      },
    ],
    defaultEdges: [
      {
        id: 'e-new-ready',
        source: 'new',       sourceHandle: 'r',
        target: 'ready',     targetHandle: 'l',
        type: 'obo-edge',
        data: { label: 'admitted', direction: 'forward', style: 'solid', role: 'transition', emphasize: false },
      },
      {
        // dispatch: Ready 하단 → Running 좌측 (아래-오른쪽 곡선)
        id: 'e-ready-running',
        source: 'ready',   sourceHandle: 'b',
        target: 'running', targetHandle: 'l',
        type: 'obo-edge',
        data: { label: 'dispatch', direction: 'forward', style: 'solid', role: 'transition', emphasize: false },
      },
      {
        // interrupt: Running 상단 → Ready 우측 (위-왼쪽 곡선)
        id: 'e-running-ready',
        source: 'running', sourceHandle: 't',
        target: 'ready',   targetHandle: 'r',
        type: 'obo-edge',
        data: { label: 'interrupt', direction: 'forward', style: 'solid', role: 'transition', emphasize: false },
      },
      {
        id: 'e-running-waiting',
        source: 'running', sourceHandle: 'b',
        target: 'waiting', targetHandle: 'r',
        type: 'obo-edge',
        data: { label: 'I/O wait', direction: 'forward', style: 'solid', role: 'transition', emphasize: false },
      },
      {
        id: 'e-waiting-ready',
        source: 'waiting', sourceHandle: 't',
        target: 'ready',   targetHandle: 'b',
        type: 'obo-edge',
        data: { label: 'I/O done', direction: 'forward', style: 'solid', role: 'transition', emphasize: false },
      },
      {
        id: 'e-running-terminated',
        source: 'running',    sourceHandle: 'r',
        target: 'terminated', targetHandle: 'l',
        type: 'obo-edge',
        data: { label: 'exit', direction: 'forward', style: 'solid', role: 'transition', emphasize: false },
      },
    ],
  },
  PAGE_REPLACEMENT_TEMPLATE,
  {
    id: 'G1',
    name: 'CPU 스케줄링 (FCFS)',
    category: 'cpu',
    description: '간트 차트',
    defaultNodes: [
      {
        id: 'schedule-title',
        type: 'text-label',
        position: { x: 40, y: 20 },
        data: { text: 'FCFS 예제 · P1 → P2 → P3 · 시간 단위', variant: 'plain', color: '#334155' },
      },
      {
        id: 'status',
        type: 'text-label',
        position: { x: 40, y: 52 },
        data: { text: '같은 시간축에서 비교 · 막대를 눌러 구간 확인', variant: 'plain', color: '#64748b' },
      },
      {
        id: 'track-p1',
        type: 'gantt-lane',
        position: { x: 40, y: 100 },
        data: { trackId: 'P1', ganttGroup: '기본 간트', axisEnd: 9, blocks: [{ start: 0, end: 3, colorKey: 'teal' }], activeBlockIndex: null },
      },
      {
        id: 'track-p2',
        type: 'gantt-lane',
        position: { x: 40, y: 228 },
        data: { trackId: 'P2', ganttGroup: '기본 간트', axisEnd: 9, blocks: [{ start: 3, end: 6, colorKey: 'indigo' }], activeBlockIndex: null },
      },
      {
        id: 'track-p3',
        type: 'gantt-lane',
        position: { x: 40, y: 356 },
        data: { trackId: 'P3', ganttGroup: '기본 간트', axisEnd: 9, blocks: [{ start: 6, end: 9, colorKey: 'amber' }], activeBlockIndex: null },
      },
    ],
    defaultEdges: [],
    defaultFrames: [
      {
        id: 'f_1', label: '시간 0 · P1이 실행을 시작합니다. 실행 구간은 0–3입니다.', cursorTime: 0, highlightNodes: [], highlightEdges: [],
        nodeDataOverrides: {
          'track-p1': { activeBlockIndex: 0 },
        },
      },
      {
        id: 'f_2', label: '시간 3 · P1이 끝나고 P2가 실행을 시작합니다.', cursorTime: 3, highlightNodes: [], highlightEdges: [],
        nodeDataOverrides: {
          'track-p2': { activeBlockIndex: 0 },
        },
      },
      {
        id: 'f_3', label: '시간 6 · P2가 끝나고 P3가 실행을 시작합니다.', cursorTime: 6, highlightNodes: [], highlightEdges: [],
        nodeDataOverrides: {
          'track-p3': { activeBlockIndex: 0 },
        },
      },
      { id: 'f_4', label: '시간 9 · 예제의 모든 실행 구간이 끝났습니다.', cursorTime: 9, highlightNodes: [], highlightEdges: [] },
    ],
  },
  ROUND_ROBIN_TEMPLATE,
  RESOURCE_ALLOCATION_TEMPLATE,
  ...REMAINING_TEMPLATES,
  // 비활성: P2, P3
];

// 검토한 템플릿을 노출하고 나머지는 정의만 보존한다.
const ACTIVE_TEMPLATE_IDS = ['ST2', 'G1', 'G2', 'S1', 'S3', 'C1', 'TLB', 'MF', 'PT', 'IN', 'DS'];

export const OBO_TEMPLATES: OBOTemplate[] = ALL_OBO_TEMPLATES.filter(
  t => ACTIVE_TEMPLATE_IDS.includes(t.id)
);

export const CATEGORIES = [
  { id: 'all', label: '전체', count: 11 },
  { id: 'cpu', label: 'CPU',  count: 3 },
  { id: 'memory', label: '메모리', count: 3 },
  { id: 'sync', label: '동기화', count: 2 },
  { id: 'process', label: '프로세스', count: 1 },
  { id: 'fs', label: '파일·디스크', count: 2 },
] as const;
