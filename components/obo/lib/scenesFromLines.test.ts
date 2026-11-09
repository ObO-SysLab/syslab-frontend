import { describe, expect, it } from 'vitest';
import type { Node } from '@xyflow/react';
import type { Frame, SimpleOutputFormat } from '../types';
import { OBO_TEMPLATES } from '../templates';
import { formatSimpleOutput, parseSimpleOutput, simpleOutputTypes } from '../runtime/freeDiagram.mjs';
import { applyFrame } from './applyFrame';
import { currentLines, lineRule, scenesFromLines, suggestLineFormat } from './scenesFromLines';

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

/** Every scene as the player shows it (applyFrame), with null and missing treated alike. */
const looks = (nodes: Node[], frames: Frame[]) => frames.map((f, i) => JSON.stringify({
  nodes: applyFrame(nodes, frames, i).map(n => Object.fromEntries(Object.entries(n.data as Record<string, unknown>).filter(([, v]) => v != null).sort(([a], [b]) => (a < b ? -1 : 1)))),
  hl: [...f.highlightNodes].sort(),
}));
const lineElements = (nodes: Node[]) => nodes.filter(n => simpleOutputTypes.includes(n.type ?? '')).map(n => n.id);
const fillLoaded = (nodes: Node[], frames: Frame[], format: SimpleOutputFormat, text: string) =>
  scenesFromLines({ nodes, edges: [], frames, format, text, mode: 'fill', sceneIds: currentLines(nodes, frames, format).lines.map(l => l.frameId) });

describe('the dialog opens with the current scenes written as lines (2026-11-09)', () => {
  it('loaded lines applied unchanged leave every scene of every template looking the same', () => {
    let loaded = 0, elements = 0;
    for (const t of OBO_TEMPLATES) {
      const frames = t.defaultFrames ?? [], suggested = suggestLineFormat(t.defaultNodes, frames, lineElements(t.defaultNodes));
      for (const id of lineElements(t.defaultNodes)) {
        const format: SimpleOutputFormat = suggested?.target === id ? suggested : { kind: 'lines-v1', target: id };
        const listing = currentLines(t.defaultNodes, frames, format);
        elements++;
        if (!listing.lines.length) continue;
        const made = fillLoaded(t.defaultNodes, frames, format, listing.text);
        expect(made.errors, `${t.id}/${id}`).toEqual([]);
        expect(looks(t.defaultNodes, made.frames), `${t.id}/${id}`).toEqual(looks(t.defaultNodes, frames));
        expect(listing.lines.map(l => l.text).join('\n')).toBe(listing.text);
        loaded++;
      }
    }
    expect(elements).toBeGreaterThanOrEqual(45);
    expect(loaded).toBeGreaterThanOrEqual(34);
  });

  it('S1 memory lines start where reference highlighting starts, and an edited line changes that scene', () => {
    const format = suggestLineFormat(s1.defaultNodes, s1Frames, lineElements(s1.defaultNodes))!;
    const listing = currentLines(s1.defaultNodes, s1Frames, format);
    expect(listing.lines.map(l => l.scene)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(listing.skipped).toEqual([{ scene: 0, why: 'before-start' }]);
    expect(listing.text.split('\n').slice(0, 3)).toEqual(['7 - -', '7 0 -', '7 0 1']);
    const edited = listing.text.split('\n'); edited[8] = '4 3 9';
    const made = fillLoaded(s1.defaultNodes, s1Frames, format, edited.join('\n'));
    const before = looks(s1.defaultNodes, s1Frames), after = looks(s1.defaultNodes, made.frames);
    expect(after.slice(0, 9)).toEqual(before.slice(0, 9));
    expect(made.frames[9].nodeDataOverrides?.frames).toMatchObject({ slots: [4, 3, 9], faultSlotIndex: 2 });
    expect(made.frames.map(f => f.label)).toEqual(s1Frames.map(f => f.label));
  });

  it('after the reference string changes, all scenes still load and new lines go into scenes 2–9 with new Hit/Miss', () => {
    // Found by the real create-page measurement (attempt 1): the old Hit marks no longer matched the new references,
    // so only scenes 2–5 loaded and the rest of the pasted lines became new scenes 11–14.
    const refs = [1, 2, 3, 1, 4, 1, 5, 2];
    const nodes = s1.defaultNodes.map(n => n.id === 'ref-string' ? { ...n, data: { ...n.data, slots: refs } } : n) as Node[];
    const format = suggestLineFormat(nodes, s1Frames, lineElements(nodes))!;
    const listing = currentLines(nodes, s1Frames, format);
    expect(listing.lines.map(l => l.scene)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(listing.stoppedAt).toBeNull();
    const made = fillLoaded(nodes, s1Frames, format, asLines(fifo(refs)));
    expect(made.frames).toHaveLength(10); expect(made.created).toBe(0);
    const memory = (f: Frame) => f.nodeDataOverrides?.frames as Record<string, unknown>;
    expect(memory(made.frames[8]).slots).toEqual([2, 1, 5]);
    expect(memory(made.frames[4])).toMatchObject({ slots: [1, 2, 3], hitSlotIndex: 0 });
    expect(memory(made.frames[5])).toMatchObject({ slots: [4, 2, 3], faultSlotIndex: 0 });
    expect(made.frames.map(f => f.label)).toEqual(s1Frames.map(f => f.label));
  });

  it('pairs lines with scenes around skipped ones', () => {
    // Scene 5 left out of the output: line 4 still goes into scene 4 and line 5 into scene 6.
    const frames = s1Frames.map((f, i) => (i === 4 ? { ...f, excludeFromOutput: true } : f));
    const format: SimpleOutputFormat = { kind: 'lines-v1', target: 'status' };
    const listing = currentLines(s1.defaultNodes, frames, format);
    expect(listing.skipped).toEqual([{ scene: 4, why: 'excluded' }]);
    const edited = listing.text.split('\n'); edited[4] = '바꾼 문장';
    const made = fillLoaded(s1.defaultNodes, frames, format, edited.join('\n'));
    expect(looks(s1.defaultNodes, made.frames).map((v, i) => v === looks(s1.defaultNodes, frames)[i])).toEqual([true, true, true, true, true, false, true, true, true, true]);
    expect((made.frames[5].nodeDataOverrides?.status as Record<string, unknown>).text).toBe('바꾼 문장');
    // C1 'pending' has a sentence only in scenes 6 and 7.
    const c1 = OBO_TEMPLATES.find(t => t.id === 'C1')!, pending = currentLines(c1.defaultNodes, c1.defaultFrames ?? [], { kind: 'lines-v1', target: 'pending' });
    expect(pending.lines.map(l => l.scene)).toEqual([5, 6]);
    expect(pending.skipped.map(s => s.why)).toEqual(Array(8).fill('unwritable'));
  });

  it('does not load lines that would change how the scenes look', () => {
    // G1 draws every bar from the start and moves the highlight; lines grow the chart one bar per line.
    const g1 = OBO_TEMPLATES.find(t => t.id === 'G1')!;
    expect(currentLines(g1.defaultNodes, g1.defaultFrames ?? [], { kind: 'lines-v1', target: 'track-p1' })).toMatchObject({ lines: [], stoppedAt: 0 });
    // TLB highlights a row that is not the n-th row for the n-th line.
    const tlb = OBO_TEMPLATES.find(t => t.id === 'TLB')!;
    expect(currentLines(tlb.defaultNodes, tlb.defaultFrames ?? [], { kind: 'lines-v1', target: 'tlb' }).lines).toEqual([]);
    expect(currentLines(s1.defaultNodes, [], { kind: 'lines-v1', target: 'frames' })).toEqual({ lines: [], text: '', skipped: [], stoppedAt: null });
  });

  it('adding after the last scene marks Miss against that scene, not the empty start', () => {
    const format: SimpleOutputFormat = { kind: 'lines-v1', target: 'frames', markChanged: true };
    const made = scenesFromLines({ nodes: s1.defaultNodes, edges: [], frames: s1Frames, format, text: '4 3 9', mode: 'append' });
    expect(made.frames[10].nodeDataOverrides?.frames).toMatchObject({ slots: [4, 3, 9], faultSlotIndex: 2 });
  });

  it('states the rule with an example that is itself a valid line, from the element’s own values', () => {
    let checked = 0;
    for (const t of OBO_TEMPLATES) for (const id of lineElements(t.defaultNodes)) {
      const format: SimpleOutputFormat = { kind: 'lines-v1', target: id }, { rule, example } = lineRule(t.defaultNodes, format);
      expect(rule.length, `${t.id}/${id}`).toBeGreaterThan(3);
      expect(parseSimpleOutput(example, t.defaultNodes, [], format).errors, `${t.id}/${id}: ${example}`).toEqual([]);
      checked++;
    }
    expect(checked).toBeGreaterThanOrEqual(45);
    const g1 = OBO_TEMPLATES.find(t => t.id === 'G1')!;
    expect(lineRule(g1.defaultNodes, { kind: 'lines-v1', target: 'track-p2' })).toEqual({ rule: 'ID 시작 종료 (ID: P1, P2, P3)', example: 'P1 0 3' });
    expect(lineRule(s1.defaultNodes, { kind: 'lines-v1', target: 'frames' })).toEqual({ rule: '칸 3개의 값을 띄어 쓰고, 빈 칸은 -', example: '7 0 -' });
  });
});
