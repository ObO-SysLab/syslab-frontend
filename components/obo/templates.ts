import type { Node, Edge } from '@xyflow/react';
import type { Frame } from './types';

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
  // 비활성: slot-grid, gantt-lane, counter-badge, resource-square, line-chart
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
  {
    id: 'S1',
    name: '페이지 교체 (FIFO)',
    category: 'memory',
    description: 'Slot Grid',
    defaultNodes: [
      {
        id: 'ref-string',
        type: 'text-label',
        position: { x: 40, y: 30 },
        data: { text: '참조열: 7 0 1 2 0 3 0 4  (프레임 3개, FIFO)', variant: 'plain', color: '#334155' },
      },
      {
        id: 'status',
        type: 'text-label',
        position: { x: 40, y: 62 },
        data: { text: '프레임 탭에서 재생해 보세요 →', variant: 'pill', color: '#6366f1' },
      },
      {
        id: 'frames',
        type: 'slot-grid',
        position: { x: 40, y: 110 },
        data: { slotCount: 3, slots: [null, null, null], faultSlotIndex: null, hitSlotIndex: null },
      },
    ],
    defaultEdges: [],
    defaultFrames: [
      {
        id: 'f_1', label: '참조 7 (fault)', highlightNodes: [], highlightEdges: [],
        nodeDataOverrides: {
          frames: { slots: [7, null, null], faultSlotIndex: 0 },
          status: { text: '참조 7 → FAULT · slot 0에 적재' },
        },
      },
      {
        id: 'f_2', label: '참조 0 (fault)', highlightNodes: [], highlightEdges: [],
        nodeDataOverrides: {
          frames: { slots: [7, 0, null], faultSlotIndex: 1 },
          status: { text: '참조 0 → FAULT · slot 1에 적재' },
        },
      },
      {
        id: 'f_3', label: '참조 1 (fault)', highlightNodes: [], highlightEdges: [],
        nodeDataOverrides: {
          frames: { slots: [7, 0, 1], faultSlotIndex: 2 },
          status: { text: '참조 1 → FAULT · slot 2에 적재 (프레임 가득 참)' },
        },
      },
      {
        id: 'f_4', label: '참조 2 (fault, 교체)', highlightNodes: [], highlightEdges: [],
        nodeDataOverrides: {
          frames: { slots: [2, 0, 1], faultSlotIndex: 0 },
          status: { text: '참조 2 → FAULT · 가장 먼저 들어온 slot 0(7) 교체' },
        },
      },
      {
        id: 'f_5', label: '참조 0 (hit)', highlightNodes: [], highlightEdges: [],
        nodeDataOverrides: {
          frames: { hitSlotIndex: 1 },
          status: { text: '참조 0 → HIT · slot 1' },
        },
      },
      {
        id: 'f_6', label: '참조 3 (fault, 교체)', highlightNodes: [], highlightEdges: [],
        nodeDataOverrides: {
          frames: { slots: [2, 3, 1], faultSlotIndex: 1 },
          status: { text: '참조 3 → FAULT · 가장 먼저 들어온 slot 1(0) 교체' },
        },
      },
      {
        id: 'f_7', label: '참조 0 (fault, 교체)', highlightNodes: [], highlightEdges: [],
        nodeDataOverrides: {
          frames: { slots: [2, 3, 0], faultSlotIndex: 2 },
          status: { text: '참조 0 → FAULT · 가장 먼저 들어온 slot 2(1) 교체' },
        },
      },
      {
        id: 'f_8', label: '참조 4 (fault, 교체)', highlightNodes: [], highlightEdges: [],
        nodeDataOverrides: {
          frames: { slots: [4, 3, 0], faultSlotIndex: 0 },
          status: { text: '참조 4 → FAULT · 가장 먼저 들어온 slot 0(2) 교체 · 총 7 fault / 1 hit' },
        },
      },
    ],
  },
  {
    id: 'G1',
    name: 'CPU 스케줄링 (FCFS)',
    category: 'cpu',
    description: 'Timeline Block',
    defaultNodes: [
      {
        id: 'schedule-title',
        type: 'text-label',
        position: { x: 40, y: 20 },
        data: { text: 'FCFS 스케줄링 · P1(3) → P2(3) → P3(3)', variant: 'plain', color: '#334155' },
      },
      {
        id: 'status',
        type: 'text-label',
        position: { x: 40, y: 52 },
        data: { text: '프레임 탭에서 재생해 보세요 →', variant: 'pill', color: '#6366f1' },
      },
      {
        id: 'track-p1',
        type: 'gantt-lane',
        position: { x: 40, y: 100 },
        data: { trackId: 'P1', blocks: [], activeBlockIndex: null },
      },
      {
        id: 'track-p2',
        type: 'gantt-lane',
        position: { x: 40, y: 160 },
        data: { trackId: 'P2', blocks: [], activeBlockIndex: null },
      },
      {
        id: 'track-p3',
        type: 'gantt-lane',
        position: { x: 40, y: 220 },
        data: { trackId: 'P3', blocks: [], activeBlockIndex: null },
      },
    ],
    defaultEdges: [],
    defaultFrames: [
      {
        id: 'f_1', label: 'P1 디스패치 (0~3)', highlightNodes: [], highlightEdges: [],
        nodeDataOverrides: {
          'track-p1': { blocks: [{ start: 0, end: 3, colorKey: 'teal' }], activeBlockIndex: 0 },
          status: { text: 'P1 디스패치 (0~3)' },
        },
      },
      {
        id: 'f_2', label: 'P2 디스패치 (3~6)', highlightNodes: [], highlightEdges: [],
        nodeDataOverrides: {
          'track-p2': { blocks: [{ start: 3, end: 6, colorKey: 'indigo' }], activeBlockIndex: 0 },
          status: { text: 'P1 종료 → P2 디스패치 (3~6)' },
        },
      },
      {
        id: 'f_3', label: 'P3 디스패치 (6~9)', highlightNodes: [], highlightEdges: [],
        nodeDataOverrides: {
          'track-p3': { blocks: [{ start: 6, end: 9, colorKey: 'amber' }], activeBlockIndex: 0 },
          status: { text: 'P2 종료 → P3 디스패치 (6~9) · 모든 프로세스 완료' },
        },
      },
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
  // 비활성: G2, P2, P3, S3
];

// 현재 활성 템플릿: ST2만. 나머지(S1, G1, C1)는 정의는 보존하되 팔레트/사이드바에 노출하지 않음.
const ACTIVE_TEMPLATE_IDS = ['ST2'];

export const OBO_TEMPLATES: OBOTemplate[] = ALL_OBO_TEMPLATES.filter(
  t => ACTIVE_TEMPLATE_IDS.includes(t.id)
);

export const CATEGORIES = [
  { id: 'all', label: '전체', count: 1 },
  { id: 'cpu', label: 'CPU',  count: 1 },
] as const;