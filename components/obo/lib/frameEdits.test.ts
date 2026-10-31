import { describe, expect, it } from 'vitest';
import type { Frame } from '../types';
import { duplicateFrame, moveFrame } from './frameEdits';
import { applyFrame } from './applyFrame';

const example = (): Frame[] => [
  { id: 'f_7', label: '준비', highlightNodes: ['ready'], highlightEdges: ['dispatch'], cursorTime: 3,
    nodeDataOverrides: { grid: { slots: [7, null] } } },
  { id: 'custom', label: '실행', highlightNodes: ['running'], highlightEdges: [] },
];

describe('authored scene editing', () => {
  it('copies all authored data with an independent ID and nested values', () => {
    const frames = example();
    const next = duplicateFrame(frames, 'f_7');
    expect(next.map(frame => frame.id)).toEqual(['f_7', 'f_8', 'custom']);
    expect(next[1]).toEqual({ ...frames[0], id: 'f_8' });
    next[1].highlightNodes.push('waiting');
    next[1].highlightEdges.length = 0;
    (next[1].nodeDataOverrides!.grid.slots as unknown[])[0] = 99;
    expect(frames).toEqual(example());
    expect(duplicateFrame(next, 'f_8')[2].id).toBe('f_9');
  });

  it('moves a scene without changing its authored data or mutating the old order', () => {
    const frames = example();
    const next = moveFrame(frames, 'custom', -1);
    expect(next).toEqual([frames[1], frames[0]]);
    expect(moveFrame(next, 'custom', 1)).toEqual(frames);
    expect(frames).toEqual(example());
  });

  it('keeps missing IDs, empty lists and boundary moves unchanged', () => {
    const frames = example();
    expect(moveFrame(frames, 'f_7', -1)).toBe(frames);
    expect(moveFrame(frames, 'custom', 1)).toBe(frames);
    expect(moveFrame(frames, 'missing', 1)).toBe(frames);
    expect(duplicateFrame(frames, 'missing')).toBe(frames);
    expect(moveFrame([], 'f_7', 1)).toEqual([]);
    expect(duplicateFrame([], 'f_7')).toEqual([]);
  });

  it('retains the existing accumulated-value semantics after moving a scene', () => {
    const nodes = [{ id: 'grid', type: 'slot-grid', position: { x: 0, y: 0 }, data: { slots: [null, null] } }];
    const frames = example();
    expect(applyFrame(nodes, frames, 1)[0].data.slots).toEqual([7, null]);
    const moved = moveFrame(frames, 'custom', -1);
    expect(applyFrame(nodes, moved, 0)[0].data.slots).toEqual([null, null]);
    expect(applyFrame(nodes, moved, 1)[0].data.slots).toEqual([7, null]);
  });
});
