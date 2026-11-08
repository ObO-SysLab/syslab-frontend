import { describe, expect, it } from 'vitest';
import type { Node } from '@xyflow/react';
import { PRODUCER_CONSUMER, exampleBlob } from '../examples/remaining';
import { applyFrame } from '../lib/applyFrame';
import { frameEdges } from '../lib/frameEdges';
import { diagramFields, parseDiagramTrace, validateFreeDiagram } from '../runtime/freeDiagram.mjs';

const example = () => exampleBlob(PRODUCER_CONSUMER);
const state = (index: number) => {
  const blob = example();
  return Object.fromEntries(applyFrame(blob.nodes as Node[], blob.frames, index).map(node => [node.id, node.data]));
};

describe('C1 visible waiting and independent semaphore values', () => {
  it('shows a blocked item outside the unchanged buffer, then keeps it pending until insertion', () => {
    const blob = example(), blocked = state(5), ready = state(6), inserted = state(7);
    expect(blocked.pending.text).toBe('D');
    expect(blocked.buffer.items).toEqual(['B', 'C']);
    expect(blob.frames[5].highlightNodes).not.toContain('producer');
    expect(frameEdges(blob.edges, blob.frames[5]).map(edge => edge.id)).not.toContain('put');
    expect(ready.pending.text).toBe('D');
    expect(ready.buffer.items).toEqual(['C']);
    expect(frameEdges(blob.edges, blob.frames[6]).map(edge => edge.id)).toContain('put');
    expect(inserted.buffer.items).toEqual(['C', 'D']);
    expect(inserted.pending.text).toBe('');
    expect(blob.frames[7].highlightEdges).toContain('put');
  });

  it('does not present the initially blocked consumer as running or able to take an item', () => {
    const blob = example();
    expect(state(0)['c-status'].text).toContain('대기');
    expect(blob.frames[0].highlightNodes).not.toContain('consumer');
    expect(blob.frames[0].highlightEdges).not.toContain('take');
    expect(frameEdges(blob.edges, blob.frames[0]).map(edge => edge.id)).toEqual(['put']);
    expect(state(0).pending.text).toBe('');
  });

  it('keeps presentation options in base nodes and all scene output within the existing coding contract', () => {
    const blob = example();
    const nodes = new Map(blob.nodes.map(node => [node.id, node]));
    expect(nodes.get('buffer')?.data).toMatchObject({ displayStyle: 'buffer', direction: 'rtl' });
    expect(nodes.get('empty')?.data.displayStyle).toBe('semaphore');
    expect(nodes.get('full')?.data.displayStyle).toBe('semaphore');
    for (const frame of blob.frames) {
      for (const [id, patch] of Object.entries(frame.nodeDataOverrides ?? {})) {
        const type = nodes.get(id)!.type!;
        expect(Object.keys(patch).every(key => diagramFields[type].includes(key))).toBe(true);
      }
    }
    const trace = blob.frames.map(frame => ({ v: 1, overrides: frame.nodeDataOverrides ?? {}, highlightNodes: frame.highlightNodes, visibleEdges: frame.visibleEdges }));
    expect(parseDiagramTrace(trace.map(step => JSON.stringify(step)).join('\n'), blob.nodes, blob.edges).errors).toEqual([]);
    expect(() => validateFreeDiagram(blob)).not.toThrow();
  });

  it('preserves authored semaphore values independently from buffer occupancy during replay and import', () => {
    const blob = example();
    blob.frames = [{ id: 'reserved', label: '독립적인 허용 횟수', highlightNodes: [], highlightEdges: [], nodeDataOverrides: {
      buffer: { items: ['A'] }, empty: { value: 9 }, full: { value: 4 },
    } }, { id: 'later', label: '다음 장면', highlightNodes: [], highlightEdges: [], nodeDataOverrides: { buffer: { items: [] } } }];
    const serialized = JSON.stringify(blob);
    const imported = JSON.parse(serialized);
    expect(() => validateFreeDiagram(imported)).not.toThrow();
    const values = Object.fromEntries(applyFrame(imported.nodes, imported.frames, 1).map(node => [node.id, node.data]));
    expect(values.buffer.items).toEqual([]);
    expect(values.empty.value).toBe(9);
    expect(values.full.value).toBe(4);
    const parsed = parseDiagramTrace(blob.frames.map(frame => JSON.stringify({ v: 1, overrides: frame.nodeDataOverrides, highlightNodes: [] })).join('\n'), blob.nodes, blob.edges);
    expect(parsed.errors).toEqual([]);
    expect(parsed.trace[0].overrides.empty.value).toBe(9);
    expect(parsed.trace[0].overrides.full.value).toBe(4);
    expect(JSON.stringify(imported)).toBe(serialized);
  });
});
