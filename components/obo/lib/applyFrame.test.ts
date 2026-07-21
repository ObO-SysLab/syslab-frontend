import { describe, it, expect } from 'vitest';
import type { Node } from '@xyflow/react';
import type { Frame } from '../types';
import { applyFrame } from './applyFrame';

function slotGridNode(id: string): Node {
  return {
    id,
    type: 'slot-grid',
    position: { x: 0, y: 0 },
    data: { slotCount: 3, slots: [null, null, null], faultSlotIndex: null, hitSlotIndex: null },
  };
}

function frame(id: string, overrides?: Frame['nodeDataOverrides']): Frame {
  return { id, label: '', highlightNodes: [], highlightEdges: [], nodeDataOverrides: overrides };
}

describe('applyFrame', () => {
  it('carries forward state fields not mentioned in later frames', () => {
    const nodes = [slotGridNode('n_1')];
    const frames: Frame[] = [
      frame('f_1', { n_1: { slots: [7, null, null] } }),
      frame('f_2', {}), // slots 언급 안 됨 → 이전 값 유지
    ];
    const result = applyFrame(nodes, frames, 1);
    expect((result[0].data as any).slots).toEqual([7, null, null]);
  });

  it('replaces array fields whole-key, not partial patch', () => {
    const nodes = [slotGridNode('n_1')];
    const frames: Frame[] = [
      frame('f_1', { n_1: { slots: [7, 3, null] } }),
      frame('f_2', { n_1: { slots: [7, null, null] } }), // index 1 통째로 사라짐
    ];
    const result = applyFrame(nodes, frames, 1);
    expect((result[0].data as any).slots).toEqual([7, null, null]);
  });

  it('resets event fields to null every frame unless overridden this frame', () => {
    const nodes = [slotGridNode('n_1')];
    const frames: Frame[] = [
      frame('f_1', { n_1: { faultSlotIndex: 0 } }),
      frame('f_2', {}), // faultSlotIndex 미언급 → null로 리셋
    ];
    const atF1 = applyFrame(nodes, frames, 0);
    expect((atF1[0].data as any).faultSlotIndex).toBe(0);

    const atF2 = applyFrame(nodes, frames, 1);
    expect((atF2[0].data as any).faultSlotIndex).toBeNull();
  });

  it('returns base data untouched when currentFrameIndex is -1', () => {
    const nodes = [slotGridNode('n_1')];
    const frames: Frame[] = [frame('f_1', { n_1: { slots: [9, null, null] } })];
    const result = applyFrame(nodes, frames, -1);
    expect((result[0].data as any).slots).toEqual([null, null, null]);
  });
});
