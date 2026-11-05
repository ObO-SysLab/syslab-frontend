import { describe, expect, it } from 'vitest';
import type { Node } from '@xyflow/react';
import type { Frame } from '../types';
import { frameEdges } from './frameEdges';
import { applyFrame } from './applyFrame';
import { createResourceAllocationExample } from '../resourceAllocationExample';
import { generateFramesFromTrace } from './trace';

describe('authored resource allocation scenes', () => {
  it('keeps legacy/coding edges, treats empty as none, and ignores unknown IDs without mutation', () => {
    const edges = [{ id: 'one' }, { id: 'two' }];
    const frame: Frame = { id: 'f', label: '', highlightNodes: [], highlightEdges: [] };
    expect(frameEdges(edges, null)).toBe(edges);
    expect(frameEdges(edges, frame)).toBe(edges);
    expect(frameEdges(edges, { ...frame, visibleEdges: [] })).toEqual([]);
    expect(frameEdges(edges, { ...frame, visibleEdges: ['two', 'two', 'missing'] })).toEqual([edges[1]]);
    expect(frameEdges(edges, { ...frame, visibleEdges: 'bad' as unknown as string[] })).toBe(edges);
    expect(edges).toHaveLength(2);
    const blob = createResourceAllocationExample();
    const coding = generateFramesFromTrace([{ overrides: {}, highlightNodes: ['p1'] }], blob.edges);
    expect(frameEdges(blob.edges, coding[0])).toBe(blob.edges);
  });

  it('has a cycle only at deadlock, consistent allocation counts, and real request/assignment directions', () => {
    const blob = createResourceAllocationExample();
    const resourceIds = new Set(blob.nodes.filter(n => n.type === 'resource-square').map(n => n.id));
    // Independent graph traversal validates the authored story, not a product detector.
    blob.frames.forEach((frame, index) => {
      const edges = frameEdges(blob.edges, frame);
      const nodes = applyFrame(blob.nodes as Node[], blob.frames, index);
      for (const node of nodes.filter(n => resourceIds.has(n.id))) {
        expect(edges.filter(e => e.source === node.id)).toHaveLength(Number(node.data.allocated));
        expect(Number(node.data.allocated)).toBeLessThanOrEqual(Number(node.data.instances));
      }
      for (const e of edges) {
        expect(resourceIds.has(e.source)).toBe(e.data?.role === 'allocation');
        expect(resourceIds.has(e.target)).toBe(e.data?.role === 'request');
        expect(edges.some(other => other.source === e.target && other.target === e.source)).toBe(false);
      }
      const cycle = (id: string, path: Set<string>): boolean => {
        if (path.has(id)) return true;
        return edges.filter(e => e.source === id).some(e => cycle(e.target, new Set([...path, id])));
      };
      expect(blob.nodes.some(n => cycle(n.id, new Set()))).toBe(index === blob.frames.length - 1);
    });
  });

  it('preserves visible edges and values through serialization and reverse navigation', () => {
    const original = createResourceAllocationExample();
    const copy = JSON.parse(JSON.stringify(original));
    expect(copy).toEqual(original);
    expect(frameEdges(copy.edges, copy.frames[6])).toHaveLength(4);
    expect(frameEdges(copy.edges, copy.frames[0])).toHaveLength(0);
    expect(applyFrame(copy.nodes, copy.frames, 0).filter((n: Node) => n.type === 'resource-square').map((n: Node) => n.data.allocated)).toEqual([0, 0]);
    expect(frameEdges(copy.edges, undefined)).toHaveLength(6);
    expect(copy).toEqual(original);
  });
});
