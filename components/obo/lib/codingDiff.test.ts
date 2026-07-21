import { describe, it, expect } from 'vitest';
import type { Node } from '@xyflow/react';
import type { OboCodingSchema, OboTraceStep } from '../types';
import { buildCodingDiffPlan } from './codingDiff';

function slotGridNode(id: string): Node {
  return {
    id,
    type: 'slot-grid',
    position: { x: 0, y: 0 },
    data: { slotCount: 3, slots: [null, null, null], faultSlotIndex: null, hitSlotIndex: null },
  };
}

function stateNode(id: string): Node {
  return { id, type: 'state-node', position: { x: 0, y: 0 }, data: { label: id, shape: 'circle' } };
}

function edge(id: string, source: string, target: string) {
  return { id, source, target, sourceHandle: null, targetHandle: null, data: {} };
}

describe('buildCodingDiffPlan — 값 비교 (FIFO 슬롯)', () => {
  const nodes = [slotGridNode('n_1')];

  // FIFO 페이지 교체: 같은 노드(n_1)의 같은 필드(slots)가 스텝마다 다른 정답을 가짐
  const referenceTrace: OboTraceStep[] = [
    { overrides: { n_1: { slots: [7, null, null] } }, highlightNodes: [] },
    { overrides: { n_1: { slots: [7, 0, null] } }, highlightNodes: [] },
    { overrides: { n_1: { slots: [7, 0, 1] } }, highlightNodes: [] },
  ];

  function schema(trace = referenceTrace): OboCodingSchema {
    return { nodes, edges: [], referenceTrace: trace };
  }

  it('all correct → plays through every step to the last one', () => {
    const plan = buildCodingDiffPlan(schema(), referenceTrace);
    expect(plan.stopAtFrameIndex).toBe(2);
    expect(plan.statusByFrameId['f_1'].n_1).toBe('correct');
    expect(plan.statusByFrameId['f_2'].n_1).toBe('correct');
    expect(plan.statusByFrameId['f_3'].n_1).toBe('correct');
  });

  it('carries forward a step that omits the field, same as Frame.nodeDataOverrides', () => {
    const traceWithCarryForward: OboTraceStep[] = [
      { overrides: { n_1: { slots: [7, null, null] } }, highlightNodes: [] },
      { overrides: { n_1: { slots: [7, 0, null] } }, highlightNodes: [] },
      { overrides: {}, highlightNodes: [] }, // slots 생략 → 이전 스텝([7,0,null])에서 carry-forward
    ];
    const submitted: OboTraceStep[] = [
      { overrides: { n_1: { slots: [7, null, null] } }, highlightNodes: [] },
      { overrides: { n_1: { slots: [7, 0, null] } }, highlightNodes: [] },
      { overrides: { n_1: { slots: [7, 0, null] } }, highlightNodes: [] }, // 명시적으로 반복 — 값은 같아야 함
    ];
    const plan = buildCodingDiffPlan(schema(traceWithCarryForward), submitted);
    expect(plan.stopAtFrameIndex).toBe(2);
    expect(plan.statusByFrameId['f_3'].n_1).toBe('correct');
  });

  it('incorrect at a middle step stops there and does not evaluate later steps', () => {
    const submitted: OboTraceStep[] = [
      { overrides: { n_1: { slots: [7, null, null] } }, highlightNodes: [] },
      { overrides: { n_1: { slots: [7, 9, null] } }, highlightNodes: [] }, // 정답([7,0,null])과 다름
      { overrides: { n_1: { slots: [7, 0, 1] } }, highlightNodes: [] },
    ];
    const plan = buildCodingDiffPlan(schema(), submitted);
    expect(plan.stopAtFrameIndex).toBe(1);
    expect(plan.statusByFrameId['f_1'].n_1).toBe('correct');
    expect(plan.statusByFrameId['f_2'].n_1).toBe('incorrect');
    expect(plan.statusByFrameId['f_3']).toBeUndefined();
  });

  it('blob is generated from the submitted trace, not the reference trace', () => {
    const submitted: OboTraceStep[] = [
      { overrides: { n_1: { slots: [7, null, null] } }, highlightNodes: [] },
      { overrides: { n_1: { slots: [7, 9, null] } }, highlightNodes: [] },
      { overrides: { n_1: { slots: [7, 0, 1] } }, highlightNodes: [] },
    ];
    const plan = buildCodingDiffPlan(schema(), submitted);
    expect(plan.blob.frames[1].nodeDataOverrides?.n_1).toEqual({ slots: [7, 9, null] });
  });
});

describe('buildCodingDiffPlan — 강조 집합 비교 (상태 전이)', () => {
  const nodes = ['new', 'ready', 'running', 'waiting', 'terminated'].map(stateNode);
  const edges = [
    edge('e1', 'new', 'ready'),
    edge('e2', 'ready', 'running'),
    edge('e3', 'running', 'waiting'),
    edge('e4', 'running', 'terminated'),
  ];

  // New → Ready → Running → Terminated
  const referenceTrace: OboTraceStep[] = [
    { overrides: {}, highlightNodes: ['new', 'ready'] },
    { overrides: {}, highlightNodes: ['ready', 'running'] },
    { overrides: {}, highlightNodes: ['running', 'terminated'] },
  ];

  function schema(): OboCodingSchema {
    return { nodes, edges, referenceTrace };
  }

  it('all correct → highlights match every step, and connecting edges are auto-highlighted', () => {
    const plan = buildCodingDiffPlan(schema(), referenceTrace);
    expect(plan.stopAtFrameIndex).toBe(2);
    expect(plan.statusByFrameId['f_1'].new).toBe('correct');
    expect(plan.statusByFrameId['f_1'].ready).toBe('correct');
    expect(plan.blob.frames[0].highlightEdges).toEqual(['e1']);
    expect(plan.blob.frames[2].highlightEdges).toEqual(['e4']);
  });

  it('a wrong transition (different node highlighted) stops at that step', () => {
    const submitted: OboTraceStep[] = [
      { overrides: {}, highlightNodes: ['new', 'ready'] },
      { overrides: {}, highlightNodes: ['ready', 'waiting'] }, // 정답은 running인데 waiting으로 잘못 전이
      { overrides: {}, highlightNodes: ['running', 'terminated'] },
    ];
    const plan = buildCodingDiffPlan(schema(), submitted);
    expect(plan.stopAtFrameIndex).toBe(1);
    expect(plan.statusByFrameId['f_1'].new).toBe('correct');
    expect(plan.statusByFrameId['f_2'].ready).toBe('incorrect');
    expect(plan.statusByFrameId['f_2'].waiting).toBe('incorrect');
    expect(plan.statusByFrameId['f_3']).toBeUndefined();
  });

  it('wrong from the first step stops immediately', () => {
    const submitted: OboTraceStep[] = [
      { overrides: {}, highlightNodes: ['new', 'waiting'] }, // 정답은 ready
      { overrides: {}, highlightNodes: ['ready', 'running'] },
      { overrides: {}, highlightNodes: ['running', 'terminated'] },
    ];
    const plan = buildCodingDiffPlan(schema(), submitted);
    expect(plan.stopAtFrameIndex).toBe(0);
    expect(plan.statusByFrameId['f_1'].new).toBe('incorrect');
    expect(plan.statusByFrameId['f_2']).toBeUndefined();
  });
});
