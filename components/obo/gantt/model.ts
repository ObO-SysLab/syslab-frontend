import type { Node, NodeChange } from '@xyflow/react';
import type { Frame } from '../types';
export interface GanttBlock { start: number; end: number; colorKey: string; }
export interface GanttLayout { end: number; width: number; ticks: number[]; x: number; y: number; }
export const groupOf = (node: Node) => String(node.data.ganttGroup || '기본 간트');
export const validBlock = (b: GanttBlock) => Number.isFinite(b.start) && Number.isFinite(b.end) && b.start >= 0 && b.end > b.start;
export const blocksOf = (data: Record<string, unknown>): GanttBlock[] => Array.isArray(data.blocks) ? data.blocks as GanttBlock[] : [];
export function ganttLayouts(nodes: Node[], frames: Frame[]): Record<string, GanttLayout> {
  const groups = new Map<string, Node[]>();
  for (const node of nodes.filter(n => n.type === 'gantt-lane')) {
    const key = groupOf(node); groups.set(key, [...(groups.get(key) ?? []), node]);
  }
  const result: Record<string, GanttLayout> = {};
  for (const rows of groups.values()) {
    let end = 1;
    for (const node of rows) {
      if (Number.isFinite(node.data.axisEnd)) end = Math.max(end, Number(node.data.axisEnd));
      const sets = [node.data, ...frames.map(f => f.nodeDataOverrides?.[node.id]).filter(Boolean)];
      for (const data of sets) for (const block of blocksOf(data!)) if (validBlock(block)) end = Math.max(end, block.end);
    }
    for (const frame of frames) if (typeof frame.cursorTime === 'number' && Number.isFinite(frame.cursorTime)) end = Math.max(end, frame.cursorTime);
    const rough = end / 8, power = 10 ** Math.floor(Math.log10(rough));
    const step = ([1, 2, 5, 10].find(n => n * power >= rough) ?? 10) * power;
    const ticks = [0];
    for (let i = 1; i * step < end && i < 12; i++) ticks.push(Number((i * step).toPrecision(12)));
    if (end - ticks[ticks.length - 1] < step * .4 && ticks.length > 1) ticks.pop();
    ticks.push(end);
    const layout = { end, width: Math.min(720, Math.max(360, end * 48)), ticks, x: rows[0].position.x };
    let bottom = -Infinity;
    for (const node of [...rows].sort((a, b) => a.position.y - b.position.y)) {
      const y = Math.max(node.position.y, bottom);
      result[node.id] = { ...layout, y }; bottom = y + 128;
    }
  }
  return result;
}
export function alignGanttRows(nodes: Node[], layouts: Record<string, GanttLayout>): Node[] {
  return nodes.map(node => layouts[node.id] ? { ...node, position: { x: layouts[node.id].x, y: layouts[node.id].y } } : node);
}
export function expandGanttMoves(changes: NodeChange[], nodes: Node[]): NodeChange[] {
  const expanded = [...changes], seen = new Set<string>();
  for (const change of changes) {
    if (change.type !== 'position' || !change.position) continue;
    const node = nodes.find(n => n.id === change.id);
    if (!node || node.type !== 'gantt-lane' || seen.has(groupOf(node))) continue;
    seen.add(groupOf(node));
    const dx = change.position.x - node.position.x, dy = change.position.y - node.position.y;
    for (const row of nodes.filter(n => n.type === 'gantt-lane' && groupOf(n) === groupOf(node))) {
      if (changes.some(c => c.type === 'position' && c.id === row.id)) continue;
      expanded.push({ type: 'position', id: row.id, position: { x: row.position.x + dx, y: row.position.y + dy }, dragging: change.dragging });
    }
  }
  return expanded;
}
