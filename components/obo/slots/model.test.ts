import { describe, expect, it } from 'vitest';
import { PAGE_REFERENCES, PAGE_SCENES, createPageReplacementExample } from './pageReplacementExample';
import { MAX_SLOTS, parseSlotValue, resizeSlotFrames, resizeSlotData, slotCountOf } from './model';
import { applyFrame } from '../lib/applyFrame';
import { parseTraceText, stringifyTrace } from '../lib/traceParser';
import { generateFramesFromTrace } from '../lib/trace';
import type { Node } from '@xyflow/react';
import type { Frame } from '../types';

describe('page replacement scenes and editable slots', () => {
  it('matches independent FIFO insertion order, including a hit that does not refresh age', () => {
    const memory: (number | null)[] = [null, null, null], order: number[] = [];
    let faults = 0;
    PAGE_REFERENCES.forEach((page, i) => {
      let index = memory.indexOf(page);
      const hit = index !== -1;
      if (!hit) {
        faults++;
        index = memory.indexOf(null);
        if (index === -1) index = order.shift()!;
        memory[index] = page; order.push(index);
      }
      expect(PAGE_SCENES[i]).toMatchObject({ slots: memory, index, hit, pointer: order[0] });
    });
    expect(faults).toBe(7);
    expect(memory).toEqual([4, 3, 0]);
  });
  it('keeps values, resets scene markers at completion, and survives JSON save/reopen', () => {
    const blob = JSON.parse(JSON.stringify(createPageReplacementExample()));
    expect(blob.frames).toHaveLength(10);
    for (let i = 0; i < PAGE_SCENES.length; i++) {
      const nodes = applyFrame(blob.nodes, blob.frames, i + 1);
      const memory = nodes.find(n => n.id === 'frames')!.data;
      expect(memory.slots).toEqual(PAGE_SCENES[i].slots);
      expect(nodes.find(n => n.id === 'ref-string')!.data.activeSlotIndex).toBe(i);
      expect(memory[PAGE_SCENES[i].hit ? 'hitSlotIndex' : 'faultSlotIndex']).toBe(PAGE_SCENES[i].index);
      expect(memory[PAGE_SCENES[i].hit ? 'faultSlotIndex' : 'hitSlotIndex']).toBeNull();
    }
    const complete = applyFrame(blob.nodes, blob.frames, 9);
    expect(complete.find(n => n.id === 'frames')!.data).toMatchObject({ slots: [4, 3, 0], faultSlotIndex: null, hitSlotIndex: null, pointerSlotIndex: null });
    expect(complete.find(n => n.id === 'ref-string')!.data.activeSlotIndex).toBeNull();
    expect(applyFrame(blob.nodes, blob.frames, 0).find(n => n.id === 'frames')!.data.slots).toEqual([null, null, null]);
  });
  it('resizes only this node, preserving absent overrides and the undo snapshot', () => {
    const frames: Frame[] = [
      { id: 'a', label: '', highlightNodes: [], highlightEdges: [], nodeDataOverrides: { grid: { slots: [0, 1, 2], faultSlotIndex: 2 }, other: { slots: [8, 9, 10] } } },
      { id: 'b', label: '', highlightNodes: [], highlightEdges: [], nodeDataOverrides: { grid: { hitSlotIndex: 0 } } },
      { id: 'c', label: '', highlightNodes: [], highlightEdges: [] },
    ];
    const original = structuredClone(frames);
    const shorter = resizeSlotFrames(frames, 'grid', 2);
    expect(shorter[0].nodeDataOverrides!.grid).toEqual({ slots: [0, 1], faultSlotIndex: null });
    expect(shorter[0].nodeDataOverrides!.other).toEqual({ slots: [8, 9, 10] });
    expect(shorter[1].nodeDataOverrides!.grid).toEqual({ hitSlotIndex: 0 });
    expect(shorter[2]).toBe(frames[2]);
    expect(resizeSlotFrames(frames, 'grid', 5)[0].nodeDataOverrides!.grid.slots).toEqual([0, 1, 2, null, null]);
    expect(frames).toEqual(original);
    expect(resizeSlotData({ slotCount: 3, slots: [0, 1, 2], pointerSlotIndex: 2 }, 2)).toMatchObject({ slots: [0, 1], pointerSlotIndex: null });
  });
  it('preserves existing numeric/null coding output without introducing FIFO calculations', () => {
    const nodes: Node[] = [{ id: 'legacy', type: 'slot-grid', position: { x: 0, y: 0 }, data: { slotCount: 3, slots: [null, null, null] } }];
    const text = 'legacy [7,null,null]\nlegacy [7,0,null]\nlegacy [2,0,1]';
    const trace = parseTraceText(text, nodes);
    expect(stringifyTrace(trace, nodes)).toBe(text);
    const frames = generateFramesFromTrace(trace, []);
    expect(applyFrame(nodes, frames, 2)[0].data.slots).toEqual([2, 0, 1]);
    expect(trace.every(step => Object.keys(step.overrides.legacy).join() === 'slots')).toBe(true);
  });
  it('distinguishes empty from zero and rejects nonfinite input; handles empty and bounded grids', () => {
    expect(parseSlotValue('')).toEqual({ valid: true, value: null });
    expect(parseSlotValue('0')).toEqual({ valid: true, value: 0 });
    for (const raw of ['abc', 'NaN', 'Infinity', '1e999']) expect(parseSlotValue(raw).valid).toBe(false);
    expect(slotCountOf({ slots: [] })).toBe(0);
    expect(slotCountOf({ slots: [0, null] })).toBe(2);
    expect(slotCountOf({ slotCount: Infinity })).toBe(0);
    expect(slotCountOf({ slotCount: 9999 })).toBe(MAX_SLOTS);
  });
});
