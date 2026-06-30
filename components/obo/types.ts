export interface Frame {
  id: string;
  label: string;
  highlightNodes: string[];
  highlightEdges: string[];
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
