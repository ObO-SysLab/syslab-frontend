import { generateFramesFromTrace } from './lib/trace';

export interface Frame {
  id: string;
  label: string;
  highlightNodes: string[];
  highlightEdges: string[];
  nodeDataOverrides?: Record<string, Record<string, unknown>>;
  cursorTime?: number;
}

export type OboMode = 'single' | 'per_choice' | 'coding_diff';

// 트레이스 한 스텝. overrides는 그 시점의 nodeDataOverrides(Frame.nodeDataOverrides와 같은 모양,
// carry-forward 대상)이고, highlightNodes는 그 스텝에서 강조되는 노드 id들(carry-forward 없음).
// 채점 대상(어떤 노드/필드를 비교할지)은 별도로 저장하지 않고 트레이스에 실제로 등장하는 값/강조에서 자동 도출한다.
export interface OboTraceStep {
  overrides: Record<string, Record<string, unknown>>;
  highlightNodes: string[];
}

export interface OboCodingSchema {
  nodes: OboBlob['nodes'];
  edges: OboBlob['edges'];
  referenceTrace: OboTraceStep[]; // 정답 코드 실행 트레이스 — 프레임/채점 대상 전부 이걸로부터 자동 파생됨
}

export interface ProblemOboData {
  mode: OboMode;
  single?: OboBlob;
  perChoice?: Record<string, OboBlob>;
  codingDiff?: OboCodingSchema;
}

export interface OboBlob {
  nodes: Array<{
    id: string;
    type?: string;
    position: { x: number; y: number };
    data: Record<string, unknown>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
    data?: Record<string, unknown>;
  }>;
  frames: Frame[];
}

// 서버가 pass-through로 저장한 OBO JSON은 mode 래퍼(ProblemOboData) 또는
// 과거 형식(OboBlob 자체)일 수 있어, 렌더링 직전에 항상 이 함수로 정규화한다.
export function resolveOboBlob(
  data: ProblemOboData | OboBlob | null | undefined,
  selectedChoiceIndex?: number | null
): OboBlob | null {
  if (!data) return null;

  const normalized: ProblemOboData = (data as ProblemOboData).mode
    ? (data as ProblemOboData)
    : { mode: 'single', single: data as OboBlob };

  if (normalized.mode === 'single') {
    return normalized.single ?? null;
  }

  if (normalized.mode === 'coding_diff') {
    const schema = normalized.codingDiff;
    if (!schema) return null;
    return { nodes: schema.nodes, edges: schema.edges, frames: generateFramesFromTrace(schema.referenceTrace, schema.edges) };
  }

  if (selectedChoiceIndex == null) return null;
  return normalized.perChoice?.[`choice_${selectedChoiceIndex}`] ?? null;
}
