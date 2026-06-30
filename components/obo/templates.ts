import type { Node, Edge } from '@xyflow/react';

// ── 팔레트 원소 타입 ───────────────────────────────────────────────
export type NodeComponentType =
  | 'state-node'
  | 'resource-square'
  | 'slot-grid';

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
  { type: 'state-node', group: 'node', label: 'State Node', description: '상태/엔터티 (ST2)' },
  { type: 'text-label', group: 'text', label: 'Text Label', description: '텍스트/주석' },
  // 비활성: resource-square, slot-grid, gantt-lane, line-chart
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
}

export const OBO_TEMPLATES: OBOTemplate[] = [
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
        data: { label: 'admitted', direction: 'forward', style: 'solid', role: 'transition', highlight: false },
      },
      {
        // dispatch: Ready 하단 → Running 좌측 (아래-오른쪽 곡선)
        id: 'e-ready-running',
        source: 'ready',   sourceHandle: 'b',
        target: 'running', targetHandle: 'l',
        type: 'obo-edge',
        data: { label: 'dispatch', direction: 'forward', style: 'solid', role: 'transition', highlight: false },
      },
      {
        // interrupt: Running 상단 → Ready 우측 (위-왼쪽 곡선)
        id: 'e-running-ready',
        source: 'running', sourceHandle: 't',
        target: 'ready',   targetHandle: 'r',
        type: 'obo-edge',
        data: { label: 'interrupt', direction: 'forward', style: 'solid', role: 'transition', highlight: false },
      },
      {
        id: 'e-running-waiting',
        source: 'running', sourceHandle: 'b',
        target: 'waiting', targetHandle: 'r',
        type: 'obo-edge',
        data: { label: 'I/O wait', direction: 'forward', style: 'solid', role: 'transition', highlight: false },
      },
      {
        id: 'e-waiting-ready',
        source: 'waiting', sourceHandle: 't',
        target: 'ready',   targetHandle: 'b',
        type: 'obo-edge',
        data: { label: 'I/O done', direction: 'forward', style: 'solid', role: 'transition', highlight: false },
      },
      {
        id: 'e-running-terminated',
        source: 'running',    sourceHandle: 'r',
        target: 'terminated', targetHandle: 'l',
        type: 'obo-edge',
        data: { label: 'exit', direction: 'forward', style: 'solid', role: 'transition', highlight: false },
      },
    ],
  },
  // 비활성: G2, P2, P3, S3
];

export const CATEGORIES = [
  { id: 'all', label: '전체', count: 1 },
  { id: 'cpu', label: 'CPU',  count: 1 },
] as const;