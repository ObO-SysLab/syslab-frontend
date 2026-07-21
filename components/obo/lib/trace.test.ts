import { describe, it, expect } from 'vitest';
import type { OboBlob, OboTraceStep } from '../types';
import { generateFramesFromTrace } from './trace';

function edge(id: string, source: string, target: string, direction?: 'forward' | 'both'): OboBlob['edges'][number] {
  return { id, source, target, sourceHandle: null, targetHandle: null, data: { direction } };
}

describe('generateFramesFromTrace — highlightEdges', () => {
  it('only highlights the edge matching the trace order, not the reverse-direction parallel edge', () => {
    // ready<->running 사이에 서로 다른 방향의 엣지 두 개(dispatch: ready->running, interrupt: running->ready)
    const edges = [
      edge('dispatch', 'ready', 'running'),
      edge('interrupt', 'running', 'ready'),
    ];
    const trace: OboTraceStep[] = [{ overrides: {}, highlightNodes: ['ready', 'running'] }];
    const frames = generateFramesFromTrace(trace, edges);
    expect(frames[0].highlightEdges).toEqual(['dispatch']);
  });

  it('picks the reverse-order edge when the trace lists nodes in the opposite direction', () => {
    const edges = [
      edge('dispatch', 'ready', 'running'),
      edge('interrupt', 'running', 'ready'),
    ];
    const trace: OboTraceStep[] = [{ overrides: {}, highlightNodes: ['running', 'ready'] }];
    const frames = generateFramesFromTrace(trace, edges);
    expect(frames[0].highlightEdges).toEqual(['interrupt']);
  });

  it('a bidirectional (direction: "both") edge matches regardless of trace order', () => {
    const edges = [edge('e1', 'a', 'b', 'both')];
    const forward = generateFramesFromTrace([{ overrides: {}, highlightNodes: ['a', 'b'] }], edges);
    const backward = generateFramesFromTrace([{ overrides: {}, highlightNodes: ['b', 'a'] }], edges);
    expect(forward[0].highlightEdges).toEqual(['e1']);
    expect(backward[0].highlightEdges).toEqual(['e1']);
  });

  it('a forward-only edge does not match when traversed in reverse', () => {
    const edges = [edge('e1', 'a', 'b', 'forward')];
    const backward = generateFramesFromTrace([{ overrides: {}, highlightNodes: ['b', 'a'] }], edges);
    expect(backward[0].highlightEdges).toEqual([]);
  });
});
