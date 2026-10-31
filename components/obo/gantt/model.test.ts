import { describe, it, expect } from 'vitest';
import type { Node } from '@xyflow/react';
import type { Frame } from '../types';
import { ganttLayouts, alignGanttRows, expandGanttMoves, validBlock } from './model';
const row = (id: string, y: number, data: Record<string, unknown> = {}): Node => ({ id, type: 'gantt-lane', position: { x: 20, y }, data: { blocks: [], ...data } });
describe('Gantt shared time layout', () => {
  it('uses stable range from authored scenes and fixed name offset without mutating source', () => {
    const nodes = [row('a', 0, { trackId: 'P1' }), row('b', 60, { trackId: 'very long name' })];
    const frames: Frame[] = [{ id: 'f', label: '', highlightNodes: [], highlightEdges: [], nodeDataOverrides: { b: { blocks: [{ start: 6, end: 9, colorKey: 'teal' }] } } }];
    const layout = ganttLayouts(nodes, frames);
    expect(layout.a.end).toBe(9); expect(layout.a.width).toBe(layout.b.width);
    expect(alignGanttRows(nodes, layout).map(n => n.position)).toEqual([{ x: 20, y: 0 }, { x: 20, y: 128 }]);
    expect(nodes[1].position.y).toBe(60);
    expect(ganttLayouts(nodes, [])[0]).toBeUndefined();
    expect(ganttLayouts(nodes, []).a.end).toBe(1);
  });
  it('keeps independent groups separate and bounds ticks/width on large ranges', () => {
    const layout = ganttLayouts([row('a', 0, { ganttGroup: 'one', axisEnd: 1e9 }), row('b', 200, { ganttGroup: 'two', axisEnd: 9 })], []);
    expect(layout.a.width).toBeLessThanOrEqual(720); expect(layout.a.ticks.length).toBeLessThanOrEqual(13);
    expect(layout.b.end).toBe(9); expect(layout.a.end).toBe(1e9);
  });
  it('moves only rows in the same group, once, preserving other node changes', () => {
    const nodes = [row('a', 0), row('b', 128), row('other', 300, { ganttGroup: 'separate' })];
    const changes = expandGanttMoves([{ type: 'position', id: 'b', position: { x: 52, y: 160 }, dragging: true }], nodes);
    expect(changes).toHaveLength(2);
    expect(changes[1]).toMatchObject({ id: 'a', position: { x: 52, y: 32 } });
    expect(expandGanttMoves([{ type: 'select', id: 'a', selected: true }], nodes)).toHaveLength(1);
  });
  it('rejects reversed, non-finite and negative intervals while allowing fractional time', () => {
    for (const [start, end] of [[3, 2], [0, 0], [-1, 3], [0, Infinity], [NaN, 3]]) expect(validBlock({ start, end, colorKey: 'teal' })).toBe(false);
    expect(validBlock({ start: .1, end: .2, colorKey: 'teal' })).toBe(true);
  });
});
