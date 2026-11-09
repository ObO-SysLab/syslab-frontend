import { describe, expect, it } from 'vitest';
import type { Node } from '@xyflow/react';
import type { Frame, SimpleOutputFormat } from '../types';
import { OBO_TEMPLATES } from '../templates';
import { formatSimpleOutput, simpleOutputTypes } from '../runtime/freeDiagram.mjs';
import { scenesFromLines, suggestLineFormat } from './scenesFromLines';

const s1 = OBO_TEMPLATES.find(t => t.id === 'S1')!, s1Frames = s1.defaultFrames ?? [];
const fifo = (refs: number[]) => { const slots: (number | null)[] = [null, null, null], order: number[] = [], out: (number | null)[][] = [];
  for (const p of refs) { if (!slots.includes(p)) { const k = slots.includes(null) ? slots.indexOf(null) : order.shift()!; slots[k] = p; order.push(k); } out.push([...slots]); } return out; };
const asLines = (rows: (number | null)[][]) => rows.map(r => r.map(v => v ?? '-').join(' ')).join('\n');

describe('lines → scenes in free mode (2026-11-09)', () => {
  it('every template element that has a line form comes back as the same lines', () => {
    let checked = 0;
    for (const t of OBO_TEMPLATES) for (const node of t.defaultNodes.filter(n => simpleOutputTypes.includes(n.type ?? ''))) {
      const format: SimpleOutputFormat = { kind: 'lines-v1', target: node.id };
      const before = formatSimpleOutput(t.defaultNodes, t.defaultFrames ?? [], format);
      if (before.issues.length || !before.text) continue;
      const made = scenesFromLines({ nodes: t.defaultNodes, edges: t.defaultEdges, frames: [], format, text: before.text, mode: 'replace' });
      expect(made.errors, `${t.id}/${node.id}`).toEqual([]);
      expect(formatSimpleOutput(t.defaultNodes, made.frames, format).text, `${t.id}/${node.id}`).toBe(before.text);
      checked++;
    }
    expect(checked).toBeGreaterThanOrEqual(11);
  });

  it('fills S1 from scene 2 with a new reference string, keeping descriptions and other values', () => {
    const refs = [1, 2, 3, 1, 4, 1, 5, 2];
    const nodes = s1.defaultNodes.map(n => n.id === 'ref-string' ? { ...n, data: { ...n.data, slots: refs } } : n) as Node[];
    const format = suggestLineFormat(nodes, s1Frames, nodes.filter(n => simpleOutputTypes.includes(n.type ?? '')).map(n => n.id))!;
    expect(format).toEqual({ kind: 'lines-v1', target: 'frames', lineIndexTarget: 'ref-string', markChanged: true, markFoundFrom: 'ref-string' });
    const made = scenesFromLines({ nodes, edges: s1.defaultEdges, frames: s1Frames, format, text: asLines(fifo(refs)), mode: 'fill', startFrameId: s1Frames[1].id });
    expect(made.errors).toEqual([]);
    expect(made.frames).toHaveLength(10); expect(made.filled).toBe(8); expect(made.created).toBe(0);
    const memory = (f: Frame) => f.nodeDataOverrides?.frames as Record<string, unknown>;
    expect(memory(made.frames[8]).slots).toEqual([2, 1, 5]);
    expect(memory(made.frames[4])).toMatchObject({ slots: [1, 2, 3], hitSlotIndex: 0 });
    expect(memory(made.frames[4]).faultSlotIndex).toBeUndefined();
    expect(memory(made.frames[5])).toMatchObject({ slots: [4, 2, 3], faultSlotIndex: 0 });
    expect(made.frames.map(f => f.label)).toEqual(s1Frames.map(f => f.label));
    expect(made.frames[5].nodeDataOverrides?.status).toEqual(s1Frames[5].nodeDataOverrides?.status);
    expect((made.frames[5].nodeDataOverrides?.['ref-string'] as Record<string, unknown>).activeSlotIndex).toBe(4);
    expect(formatSimpleOutput(nodes, made.frames.slice(0, 9), format).lines.slice(1).map(l => l.text).join('\n')).toBe(asLines(fifo(refs)));
  });

  it('adds scenes when lines run past the last scene, skips scenes left out of the output, and appends or replaces on request', () => {
    const format: SimpleOutputFormat = { kind: 'lines-v1', target: 'frames' };
    const frames = s1Frames.map((f, i) => i === 2 ? { ...f, excludeFromOutput: true } : f);
    const filled = scenesFromLines({ nodes: s1.defaultNodes, edges: [], frames, format, text: '1 - -\n1 2 -\n1 2 3', mode: 'fill', startFrameId: frames[8].id });
    expect(filled.frames).toHaveLength(11); expect(filled.filled).toBe(2); expect(filled.created).toBe(1);
    const skipped = scenesFromLines({ nodes: s1.defaultNodes, edges: [], frames, format, text: '9 - -\n9 8 -', mode: 'fill', startFrameId: frames[1].id });
    expect((skipped.frames[2].nodeDataOverrides?.frames as Record<string, unknown>).slots).toEqual([7, 0, null]);
    expect((skipped.frames[3].nodeDataOverrides?.frames as Record<string, unknown>).slots).toEqual([9, 8, null]);
    const appended = scenesFromLines({ nodes: s1.defaultNodes, edges: [], frames, format, text: '1 - -\n1 2 -', mode: 'append' });
    expect(appended.frames).toHaveLength(12); expect(new Set(appended.frames.map(f => f.id)).size).toBe(12);
    expect(appended.selectId).toBe(appended.frames[10].id);
    expect(scenesFromLines({ nodes: s1.defaultNodes, edges: [], frames, format, text: '1 - -', mode: 'replace' }).frames).toHaveLength(1);
  });

  it('reports the line and reason and leaves the scenes as they were', () => {
    const format: SimpleOutputFormat = { kind: 'lines-v1', target: 'frames' };
    const made = scenesFromLines({ nodes: s1.defaultNodes, edges: [], frames: s1Frames, format, text: '1 - -\n1 2 3 4\n1 x -', mode: 'fill' });
    expect(made.frames).toBe(s1Frames);
    expect(made.errors.map(e => e.line)).toEqual([2, 3]);
    expect(made.errors[0].message).toMatch(/칸은 3개/);
  });

  it('keeps other highlights when a line names states', () => {
    const st2 = OBO_TEMPLATES.find(t => t.id === 'ST2')!;
    // ST2 has only state nodes; a note is added so a non-state highlight exists.
    const other = { id: 'note', type: 'text-label', position: { x: 0, y: 0 }, data: { text: '메모' } } as Node, nodes = [...st2.defaultNodes, other];
    const states = nodes.filter(n => n.type === 'state-node');
    const frames: Frame[] = [{ id: 'f_1', label: '설명', highlightNodes: [states[0].id, other.id], highlightEdges: [] }];
    const made = scenesFromLines({ nodes, edges: st2.defaultEdges, frames, format: { kind: 'lines-v1', target: states[0].id }, text: states[1].id, mode: 'fill' });
    expect(made.errors).toEqual([]);
    expect(made.frames[0].highlightNodes).toEqual([other.id, states[1].id]);
  });
});
