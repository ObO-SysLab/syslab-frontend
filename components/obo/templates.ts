import type { Node, Edge } from '@xyflow/react';
import type { Frame } from './types';
import { ROUND_ROBIN_TEMPLATE } from './gantt/roundRobinExample';
import { PAGE_REPLACEMENT_TEMPLATE } from './slots/pageReplacementExample';

// ── 팔레트 원소 타입 ───────────────────────────────────────────────
export type NodeComponentType =
  | 'state-node'
  | 'resource-square'
  | 'slot-grid'
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
  // 비활성: counter-badge, resource-square, line-chart
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
  {
    id: 'C1',
    name: '세마포어 (생산자-소비자)',
    category: 'sync',
    description: 'Counter Badge',
    defaultNodes: [
      {
        id: 'producer',
        type: 'state-node',
        position: { x: 40, y: 140 },
        data: { label: 'Producer', shape: 'box', fill: '#0d9488' },
      },
      {
        id: 'empty-badge',
        type: 'counter-badge',
        position: { x: 280, y: 80 },
        data: { label: 'empty', min: 0, max: 3, value: 3, delta: null },
      },
      {
        id: 'full-badge',
        type: 'counter-badge',
        position: { x: 280, y: 200 },
        data: { label: 'full', min: 0, max: 3, value: 0, delta: null },
      },
      {
        id: 'consumer',
        type: 'state-node',
        position: { x: 520, y: 140 },
        data: { label: 'Consumer', shape: 'box', fill: '#7c3aed' },
      },
    ],
    defaultEdges: [
      {
        id: 'e-producer-empty',
        source: 'producer', sourceHandle: 'r',
        target: 'empty-badge', targetHandle: 'l',
        type: 'obo-edge',
        data: { label: 'wait(empty)', direction: 'forward', style: 'dashed', role: 'request', emphasize: false },
      },
      {
        id: 'e-producer-full',
        source: 'producer', sourceHandle: 'r',
        target: 'full-badge', targetHandle: 'l',
        type: 'obo-edge',
        data: { label: 'signal(full)', direction: 'forward', style: 'solid', role: 'allocation', emphasize: false },
      },
      {
        id: 'e-consumer-full',
        source: 'consumer', sourceHandle: 'l',
        target: 'full-badge', targetHandle: 'r',
        type: 'obo-edge',
        data: { label: 'wait(full)', direction: 'forward', style: 'dashed', role: 'request', emphasize: false },
      },
      {
        id: 'e-consumer-empty',
        source: 'consumer', sourceHandle: 'l',
        target: 'empty-badge', targetHandle: 'r',
        type: 'obo-edge',
        data: { label: 'signal(empty)', direction: 'forward', style: 'solid', role: 'allocation', emphasize: false },
      },
    ],
  },
  ROUND_ROBIN_TEMPLATE,
  // 비활성: P2, P3, S3
];

// 검토한 ST2/G1/G2/S1을 노출하고 나머지는 정의만 보존한다.
const ACTIVE_TEMPLATE_IDS = ['ST2', 'G1', 'G2', 'S1'];

export const OBO_TEMPLATES: OBOTemplate[] = ALL_OBO_TEMPLATES.filter(
  t => ACTIVE_TEMPLATE_IDS.includes(t.id)
);

export const CATEGORIES = [
  { id: 'all', label: '전체', count: 4 },
  { id: 'cpu', label: 'CPU',  count: 3 },
  { id: 'memory', label: '메모리', count: 1 },
] as const;
