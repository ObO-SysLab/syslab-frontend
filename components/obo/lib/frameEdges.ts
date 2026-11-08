import type { Frame } from '../types';

/** Visibility is a scene snapshot, never cumulative. The stored graph stays intact. */
export function frameEdges<T extends { id: string }>(edges: T[], frame: Frame | null | undefined): T[] {
  if (!Array.isArray(frame?.visibleEdges)) return edges;
  const visible = new Set(frame.visibleEdges);
  return edges.filter(edge => visible.has(edge.id));
}
