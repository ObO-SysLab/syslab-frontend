export interface Frame {
  id: string;
  label: string;
  highlightNodes: string[];
  highlightEdges: string[];
}

export type OboMode = 'single' | 'per_choice';

export interface ProblemOboData {
  mode: OboMode;
  single?: OboBlob;
  perChoice?: Record<string, OboBlob>;
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

  if (selectedChoiceIndex == null) return null;
  return normalized.perChoice?.[`choice_${selectedChoiceIndex}`] ?? null;
}
