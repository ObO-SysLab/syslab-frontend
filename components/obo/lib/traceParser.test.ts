import { describe, it, expect } from 'vitest';
import type { Node } from '@xyflow/react';
import { parseTraceText, stringifyTrace } from './traceParser';

function stateNode(id: string): Node {
  return { id, type: 'state-node', position: { x: 0, y: 0 }, data: { label: id, shape: 'circle' } };
}

function counterNode(id: string): Node {
  return { id, type: 'counter-badge', position: { x: 0, y: 0 }, data: { label: id, min: 0, max: 10, value: 0 } };
}

describe('parseTraceText', () => {
  it('parses consecutive node-id tokens as a highlight-only step (state transition)', () => {
    const nodes = ['sn_1', 'sn_2', 'sn_3', 'sn_4', 'sn_5'].map(stateNode);
    const text = 'sn_1 sn_2\nsn_2 sn_3\nsn_3 sn_5';
    const steps = parseTraceText(text, nodes);
    expect(steps).toHaveLength(3);
    expect(steps[0]).toEqual({ overrides: {}, highlightNodes: ['sn_1', 'sn_2'] });
    expect(steps[1]).toEqual({ overrides: {}, highlightNodes: ['sn_2', 'sn_3'] });
    expect(steps[2]).toEqual({ overrides: {}, highlightNodes: ['sn_3', 'sn_5'] });
  });

  it('parses "nodeId value" tokens as a field assignment', () => {
    const nodes = ['n_1', 'n_2', 'n_3'].map(counterNode);
    const text = 'n_1 3\nn_2 3\nn_3 4';
    const steps = parseTraceText(text, nodes);
    expect(steps).toHaveLength(3);
    expect(steps[0]).toEqual({ overrides: { n_1: { value: 3 } }, highlightNodes: ['n_1'] });
    expect(steps[1]).toEqual({ overrides: { n_2: { value: 3 } }, highlightNodes: ['n_2'] });
    expect(steps[2]).toEqual({ overrides: { n_3: { value: 4 } }, highlightNodes: ['n_3'] });
  });

  it('handles a mixed line with both a value assignment and highlight-only nodes', () => {
    const nodes = [counterNode('n_1'), stateNode('sn_1'), stateNode('sn_2')];
    const steps = parseTraceText('n_1 3 sn_1 sn_2', nodes);
    expect(steps).toEqual([{ overrides: { n_1: { value: 3 } }, highlightNodes: ['n_1', 'sn_1', 'sn_2'] }]);
  });

  it('ignores blank lines', () => {
    const nodes = ['sn_1', 'sn_2'].map(stateNode);
    const steps = parseTraceText('sn_1 sn_2\n\n\nsn_2 sn_1', nodes);
    expect(steps).toHaveLength(2);
  });

  it('parses array-valued fields as a single bracketed token (no internal spaces)', () => {
    const slotGrid: Node = {
      id: 'frames', type: 'slot-grid', position: { x: 0, y: 0 },
      data: { slotCount: 3, slots: [null, null, null], faultSlotIndex: null, hitSlotIndex: null },
    };
    const steps = parseTraceText('frames [7,null,null]', [slotGrid]);
    expect(steps[0].overrides.frames.slots).toEqual([7, null, null]);
  });

  it('silently ignores a value token following a node with no state field', () => {
    const nodes = [stateNode('sn_1')];
    const steps = parseTraceText('sn_1 3', nodes);
    expect(steps).toEqual([{ overrides: {}, highlightNodes: ['sn_1'] }]);
  });
});

describe('stringifyTrace', () => {
  it('round-trips highlight-only steps', () => {
    const nodes = ['sn_1', 'sn_2', 'sn_3', 'sn_5'].map(stateNode);
    const steps = parseTraceText('sn_1 sn_2\nsn_2 sn_3\nsn_3 sn_5', nodes);
    const restored = stringifyTrace(steps, nodes);
    expect(parseTraceText(restored, nodes)).toEqual(steps);
  });

  it('round-trips value-based steps', () => {
    const nodes = ['n_1', 'n_2'].map(counterNode);
    const steps = parseTraceText('n_1 3\nn_2 4', nodes);
    const restored = stringifyTrace(steps, nodes);
    expect(parseTraceText(restored, nodes)).toEqual(steps);
  });
});
