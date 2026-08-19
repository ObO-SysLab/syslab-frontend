import type { Node, Edge } from '@xyflow/react';
import type { Frame } from './types';

// ── 팔레트 원소 타입 ───────────────────────────────────────────────
export type NodeComponentType =
  | 'state-node'
  | 'resource-square'
  | 'slot-grid'
  | 'counter-badge';

export type ChartComponentType =
  | 'gantt-chart'
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
  { type: 'gantt-chart',   group: 'chart', label: 'Gantt Chart',     description: '스케줄링 타임라인 박스 (G1)' },
  { type: 'text-label',    group: 'text',  label: 'Text Label',      description: '텍스트/주석' },
  // 비활성: slot-grid, counter-badge, resource-square, line-chart
];

export const PALETTE_GROUPS = [
  { id: 'node', label: 'NODE' },
  { id: 'chart', label: 'CHART' },
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
        // 제목·행·시간축을 한 박스가 통째로 들고 있다 — 행을 늘려도 축이 알아서 같이 늘어난다.
        // 참고 이미지처럼 위에서 아래로 P3 → P2 → P1(x축과 맞닿음) 순서로 쌓는다.
        id: 'schedule',
        type: 'gantt-chart',
        position: { x: 40, y: 40 },
        data: {
          title: 'FCFS 스케줄링',
          axisMax: 9,
          // 행마다 고유 색을 줘서(블록에 colorKey 생략 시 이 색을 따름) 같은 프로세스가
          // 여러 프레임에 걸쳐도 항상 같은 색으로 보인다.
          rows: [
            { trackId: 'P3', blocks: [], color: 'amber' },
            { trackId: 'P2', blocks: [], color: 'indigo' },
            { trackId: 'P1', blocks: [], color: 'teal' },
          ],
          activeRowIndex: null,
          activeBlockIndex: null,
        },
      },
    ],
    defaultEdges: [],
    defaultFrames: [
      {
        id: 'f_1', label: 'P1 디스패치 (0~3)', highlightNodes: [], highlightEdges: [],
        nodeDataOverrides: {
          schedule: {
            rows: [
              { trackId: 'P3', blocks: [], color: 'amber' },
              { trackId: 'P2', blocks: [], color: 'indigo' },
              { trackId: 'P1', blocks: [{ start: 0, end: 3 }], color: 'teal' },
            ],
            activeRowIndex: 2, activeBlockIndex: 0,
          },
        },
      },
      {
        id: 'f_2', label: 'P2 디스패치 (3~6)', highlightNodes: [], highlightEdges: [],
        nodeDataOverrides: {
          schedule: {
            rows: [
              { trackId: 'P3', blocks: [], color: 'amber' },
              { trackId: 'P2', blocks: [{ start: 3, end: 6 }], color: 'indigo' },
              { trackId: 'P1', blocks: [{ start: 0, end: 3 }], color: 'teal' },
            ],
            activeRowIndex: 1, activeBlockIndex: 0,
          },
        },
      },
      {
        id: 'f_3', label: 'P3 디스패치 (6~9) · 모든 프로세스 완료', highlightNodes: [], highlightEdges: [],
        nodeDataOverrides: {
          schedule: {
            rows: [
              { trackId: 'P3', blocks: [{ start: 6, end: 9 }], color: 'amber' },
              { trackId: 'P2', blocks: [{ start: 3, end: 6 }], color: 'indigo' },
              { trackId: 'P1', blocks: [{ start: 0, end: 3 }], color: 'teal' },
            ],
            activeRowIndex: 0, activeBlockIndex: 0,
          },
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

// 현재 활성 템플릿: ST2, G1. 나머지(S1, C1)는 정의는 보존하되 팔레트/사이드바에 노출하지 않음.
const ACTIVE_TEMPLATE_IDS = ['ST2', 'G1'];

export const OBO_TEMPLATES: OBOTemplate[] = ALL_OBO_TEMPLATES.filter(
  t => ACTIVE_TEMPLATE_IDS.includes(t.id)
);

export const CATEGORIES = [
  { id: 'all', label: '전체', count: 2 },
  { id: 'cpu', label: 'CPU',  count: 2 },
] as const;