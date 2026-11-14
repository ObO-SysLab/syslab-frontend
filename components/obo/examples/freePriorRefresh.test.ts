import { describe, expect, it } from 'vitest';
import { applyFrame } from '../lib/applyFrame';
import { createSt2Preview } from '../lib/st2Preview';
import { diagramFields, parseDiagramTrace, validateDiagramBlob } from '../runtime/freeDiagram.mjs';
import { ALL_OBO_TEMPLATES, OBO_TEMPLATES } from '../templates';
import { AUTHORING_FIELDS } from '../authoring/model';
import { INODE_ACCESS, exampleBlob } from './remaining';

// Free ST2 starts with its scenes everywhere, and a removed state-node reads as removed, not as the active item.
describe('free ST2 template scenes', () => {
  const st2 = ALL_OBO_TEMPLATES.find(t => t.id === 'ST2')!;
  it('carries the eight authored scenes on the template itself', () => {
    expect(st2.defaultFrames).toHaveLength(8);
    expect(st2.defaultFrames!.map(f => f.highlightEdges[0])).toEqual(['e-new-ready', 'e-ready-running', 'e-running-waiting', 'e-waiting-ready', 'e-ready-running', 'e-running-ready', 'e-ready-running', 'e-running-terminated']);
    expect(OBO_TEMPLATES.find(t => t.id === 'ST2')?.defaultFrames).toHaveLength(8);
    expect(() => validateDiagramBlob({ nodes: st2.defaultNodes, edges: st2.defaultEdges, frames: st2.defaultFrames })).not.toThrow();
  });
  it('gives the dedicated ST2 page exactly the template scenes', () => {
    expect(createSt2Preview().frames).toEqual(st2.defaultFrames);
  });
});

describe('state-node removed mark', () => {
  const node = (data: Record<string, unknown>) => ({ id: 'a', type: 'state-node', position: { x: 0, y: 0 }, data: { label: 'a.txt', shape: 'box', ...data } });
  it('is an optional boolean state field for authored scenes and coding output', () => {
    expect(diagramFields['state-node']).toEqual(['label', 'removed']);
    expect(AUTHORING_FIELDS['state-node']).toContain('removed');
    expect(() => validateDiagramBlob({ nodes: [node({})], edges: [], frames: [{ id: 'f', label: '', highlightNodes: ['a'], highlightEdges: [], nodeDataOverrides: { a: { removed: true } } }] })).not.toThrow();
    expect(() => validateDiagramBlob({ nodes: [node({ removed: 'yes' })], edges: [], frames: [] })).toThrow();
    expect(() => validateDiagramBlob({ nodes: [node({})], edges: [], frames: [{ id: 'f', label: '', highlightNodes: [], highlightEdges: [], nodeDataOverrides: { a: { removed: 1 } } }] })).toThrow();
    expect(parseDiagramTrace('{"v":1,"overrides":{"a":{"removed":true}},"highlightNodes":["a"]}', [node({})], []).errors).toEqual([]);
    expect(parseDiagramTrace('{"v":1,"overrides":{"a":{"removed":"no"}},"highlightNodes":["a"]}', [node({})], []).errors.length).toBeGreaterThan(0);
  });
  it('marks the deleted name in the free IN example and keeps it marked afterwards', () => {
    const blob = exampleBlob(INODE_ACCESS), frames = blob.frames;
    const at = (i: number) => applyFrame(blob.nodes, frames, i).find(n => n.id === 'name-a')!.data;
    const deleted = frames.findIndex(f => f.id === 'in-5');
    expect(at(deleted - 1).removed).toBeUndefined();
    expect(at(deleted)).toMatchObject({ label: 'a.txt', removed: true });
    expect(at(frames.length - 1).removed).toBe(true);
    expect(applyFrame(blob.nodes, frames, deleted).find(n => n.id === 'links')!.data.value).toBe(1);
  });
});
