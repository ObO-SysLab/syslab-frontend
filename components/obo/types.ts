import { generateFramesFromTrace } from './lib/trace';

export interface Frame {
  id: string;
  label: string;
  highlightNodes: string[];
  highlightEdges: string[];
  /** Complete edge visibility for this scene; omitted means all base edges (legacy). */
  visibleEdges?: string[];
  nodeDataOverrides?: Record<string, Record<string, unknown>>;
  cursorTime?: number;
}

export type OboMode = 'single' | 'per_choice' | 'coding_diff' | 'simulation';

// 트레이스 한 스텝. overrides는 그 시점의 nodeDataOverrides(Frame.nodeDataOverrides와 같은 모양,
// carry-forward 대상)이고, highlightNodes는 그 스텝에서 강조되는 노드 id들(carry-forward 없음).
// 표시용 기록이다. 서버의 문제별 의미 채점 계약과 분리한다.
export interface OboTraceStep {
  overrides: Record<string, Record<string, unknown>>;
  highlightNodes: string[];
  visibleEdges?: string[];
}

export interface OboCodingSchema {
  nodes: OboBlob['nodes'];
  edges: OboBlob['edges'];
  referenceTrace: OboTraceStep[]; // 출제자가 공개하는 참고 재생 기록. 의미 정답의 정의가 아니다.
  sourceTraceText?: string; // Preserve incomplete author input in browser drafts; rejected at publish if invalid.
}

export interface ProblemOboData {
  mode: OboMode;
  schemaVersion?: 2;
  simulation?: import('./runtime/document.mjs').SimulationDocument;
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
  if ('mode' in data && data.mode === 'simulation') return null;

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

/** All authored explanations remain navigable after server-side disclosure; selected choices come first. */
export function listOboExplanations(data: ProblemOboData | OboBlob | null, selectedAnswers: number[] = []) {
  if (!data) return [];
  if ('mode' in data && data.mode === 'per_choice') {
    const selected = new Set(selectedAnswers);
    return Object.entries(data.perChoice ?? {}).map(([key, blob]) => {
      const index = Number(key.replace(/^choice_/, ''));
      return { id: key, label: Number.isInteger(index) ? `보기 ${index}` : key, selected: selected.has(index), blob };
    }).sort((a, b) => Number(b.selected) - Number(a.selected) || a.id.localeCompare(b.id, undefined, {numeric: true}));
  }
  const blob = resolveOboBlob(data);
  return blob ? [{id: 'common', label: '공통 해설', selected: false, blob}] : [];
}
