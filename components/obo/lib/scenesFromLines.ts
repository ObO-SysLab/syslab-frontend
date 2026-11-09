import type { Edge, Node } from '@xyflow/react';
import type { Frame, SimpleOutputFormat } from '../types';
import { parseSimpleOutput } from '../runtime/freeDiagram.mjs';
import { nextFrameId } from './id';

/**
 * Free mode (2026-11-09): plain lines → scenes, one scene per line. The lines use the same rules as a
 * learner's plain output (parseSimpleOutput), so turning the scenes back into lines (formatSimpleOutput)
 * gives the same lines.
 */
export type LinesApplyMode = 'fill' | 'append' | 'replace';
export interface LinesResult { frames: Frame[]; errors: { line: number; message: string }[]; filled: number; created: number; selectId: string | null }

/** Values each element type takes from a line; with them, the per-scene marks the line also sets. */
const LINE_FIELDS: Record<string, string[]> = {
  'slot-grid': ['slots'], 'queue-strip': ['items'], 'counter-badge': ['value'], 'resource-square': ['allocated'], 'text-label': ['text'],
  'table-grid': ['rows', 'activeRow'], 'gantt-lane': ['blocks', 'activeBlockIndex'], 'line-chart': ['series', 'progressIndex', 'activePointIndex'],
};
/** Value-carrying elements first; a status sentence is rarely what the lines should fill. */
export const LINE_TYPE_PRIORITY = ['slot-grid', 'queue-strip', 'table-grid', 'gantt-lane', 'line-chart', 'counter-badge', 'resource-square', 'state-node', 'text-label'];
const ganttGroup = (n: Node) => String((n.data as { ganttGroup?: unknown })?.ganttGroup || '기본 간트');

/** Fields of each element that the lines decide; everything else in a scene stays as the author made it. */
export function lineControlledFields(nodes: Node[], format: SimpleOutputFormat): Map<string, string[]> {
  const target = nodes.find(n => n.id === format.target), out = new Map<string, string[]>();
  if (!target) return out;
  if (target.type === 'gantt-lane') { for (const lane of nodes) if (lane.type === 'gantt-lane' && ganttGroup(lane) === ganttGroup(target)) out.set(lane.id, LINE_FIELDS['gantt-lane']); return out; }
  out.set(target.id, [...(LINE_FIELDS[target.type ?? ''] ?? []), ...(target.type === 'slot-grid' && format.markChanged ? ['faultSlotIndex', 'hitSlotIndex'] : [])]);
  if (format.lineIndexTarget) out.set(format.lineIndexTarget, ['activeSlotIndex']);
  return out;
}

export function scenesFromLines({ nodes, edges, frames, format, text, mode, startFrameId = null }: {
  nodes: Node[]; edges: Edge[]; frames: Frame[]; format: SimpleOutputFormat; text: string; mode: LinesApplyMode; startFrameId?: string | null;
}): LinesResult {
  // Lines never set edge visibility, so edges are not needed to read them (same as the output format panel).
  void edges;
  const { trace, errors } = parseSimpleOutput(text, nodes.map(n => ({ id: n.id, type: n.type, position: n.position, data: n.data })), [], format);
  if (errors.length || !trace.length) return { frames, errors, filled: 0, created: 0, selectId: null };
  const target = nodes.find(n => n.id === format.target), stateIds = new Set(target?.type === 'state-node' ? nodes.filter(n => n.type === 'state-node').map(n => n.id) : []);
  const controlled = lineControlledFields(nodes, format);
  const fresh = (all: Frame[], step: (typeof trace)[number]): Frame => ({ id: nextFrameId(all), label: '', highlightNodes: [...step.highlightNodes], highlightEdges: [], nodeDataOverrides: structuredClone(step.overrides) as Frame['nodeDataOverrides'] });
  const appendAll = (base: Frame[], steps: typeof trace) => { const next = [...base]; for (const step of steps) next.push(fresh(next, step)); return next; };

  if (mode === 'replace') { const next = appendAll([], trace); return { frames: next, errors: [], filled: 0, created: next.length, selectId: next[0]?.id ?? null }; }
  if (mode === 'append') { const next = appendAll(frames, trace); return { frames: next, errors: [], filled: 0, created: trace.length, selectId: next[frames.length]?.id ?? null }; }

  // Fill from the selected scene: lines change only the values they describe, so descriptions and other marks stay.
  // Scenes left out of a coding problem's output are skipped, as the learner does not print them.
  const next = frames.map(f => ({ ...f })), start = Math.max(0, startFrameId ? next.findIndex(f => f.id === startFrameId) : 0);
  let k = start, filled = 0;
  const rest: typeof trace = [];
  for (const step of trace) {
    while (k < next.length && next[k].excludeFromOutput === true) k++;
    if (k >= next.length) { rest.push(step); continue; }
    const frame = next[k++], overrides: Record<string, Record<string, unknown>> = { ...(frame.nodeDataOverrides ?? {}) };
    for (const [id, fields] of controlled) {
      const kept = Object.fromEntries(Object.entries(overrides[id] ?? {}).filter(([key]) => !fields.includes(key)));
      const merged = { ...kept, ...((step.overrides as Record<string, Record<string, unknown>>)[id] ?? {}) };
      if (Object.keys(merged).length) overrides[id] = merged; else delete overrides[id];
    }
    const highlights = stateIds.size ? [...frame.highlightNodes.filter(id => !stateIds.has(id)), ...step.highlightNodes] : frame.highlightNodes;
    next[k - 1] = { ...frame, nodeDataOverrides: overrides, highlightNodes: highlights };
    filled++;
  }
  const all = appendAll(next, rest);
  return { frames: all, errors: [], filled, created: rest.length, selectId: all[start]?.id ?? null };
}

/** Options the existing scenes already use, so the dialog can start from them. */
export function suggestLineFormat(nodes: Node[], frames: Frame[], targets: string[]): SimpleOutputFormat | null {
  const changing = (id: string) => frames.filter(f => Object.keys(f.nodeDataOverrides?.[id] ?? {}).some(k => (LINE_FIELDS[nodes.find(n => n.id === id)?.type ?? ''] ?? []).includes(k))).length;
  // Same choice as the coding output format: among elements whose values change, the most value-like type first.
  const rank = (id: string) => LINE_TYPE_PRIORITY.indexOf(nodes.find(n => n.id === id)?.type ?? '');
  const changed = targets.filter(id => changing(id) > 0);
  const target = [...(changed.length ? changed : targets)].sort((a, b) => rank(a) - rank(b) || changing(b) - changing(a))[0];
  if (!target) return null;
  const format: SimpleOutputFormat = { kind: 'lines-v1', target };
  if (nodes.find(n => n.id === target)?.type !== 'slot-grid') return format;
  const uses = (id: string, field: string) => frames.some(f => (f.nodeDataOverrides?.[id] as Record<string, unknown> | undefined)?.[field] != null);
  const others = nodes.filter(n => n.type === 'slot-grid' && n.id !== target).map(n => n.id);
  const pointer = others.find(id => uses(id, 'activeSlotIndex'));
  if (pointer) format.lineIndexTarget = pointer;
  if (uses(target, 'faultSlotIndex') || uses(target, 'hitSlotIndex')) { format.markChanged = true; if (pointer && uses(target, 'hitSlotIndex')) format.markFoundFrom = pointer; }
  return format;
}
