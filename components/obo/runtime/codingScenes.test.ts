import { describe, expect, it } from 'vitest';
import type { Node } from '@xyflow/react';
import { OBO_TEMPLATES } from '../templates';
import { applyFrame } from '../lib/applyFrame';
import { generateFramesFromTrace } from '../lib/trace';
import type { Frame, SimpleOutputFormat } from '../types';
import { formatSimpleOutput, framesToTrace, parseDiagramTrace, parseSimpleOutput, validateFreeDiagram } from './freeDiagram.mjs';

const template = (id: string) => structuredClone(OBO_TEMPLATES.find(t => t.id === id)!);
const drawn = (nodes: Node[], frames: Frame[], i: number) => applyFrame(nodes, frames, i).map(n => n.data);
const S1_FORMAT: SimpleOutputFormat = { kind: 'lines-v1', target: 'frames', lineIndexTarget: 'ref-string', markChanged: true, markFoundFrom: 'ref-string' };
const s1 = () => { const t = template('S1'); const frames = t.defaultFrames!.map((f, i, all) => ({ ...f, excludeFromOutput: i === 0 || i === all.length - 1 })); return { t, frames }; };

describe('scenes -> output record (2026-11-08)', () => {
  it.each(OBO_TEMPLATES.map(t => [t.id]))('%s: every scene draws the same after the round trip', id => {
    const t = template(id), nodes = t.defaultNodes as Node[], frames = t.defaultFrames ?? [];
    const rebuilt = generateFramesFromTrace(framesToTrace(nodes, frames), t.defaultEdges);
    frames.forEach((_, i) => expect(drawn(nodes, rebuilt, i)).toEqual(drawn(nodes, frames, i)));
    const text = framesToTrace(nodes, frames).map(s => JSON.stringify({ v: 1, ...s })).join('\n');
    expect(parseDiagramTrace(text, nodes, t.defaultEdges).errors).toEqual([]);
  });

  it('skips explanation-only scenes but carries the values they set', () => {
    const t = template('C1'), nodes = t.defaultNodes as Node[];
    const frames = (t.defaultFrames ?? []).map((f, i) => ({ ...f, excludeFromOutput: i === 1 }));
    const trace = framesToTrace(nodes, frames);
    expect(trace).toHaveLength(frames.length - 1);
    const rebuilt = generateFramesFromTrace(trace, t.defaultEdges);
    expect(drawn(nodes, rebuilt, 1)).toEqual(drawn(nodes, frames, 2));
  });
});

describe('Baekjoon-style output lines', () => {
  it('turns the S1 scenes into plain lines and back into the same memory cells and Hit/Miss marks', () => {
    const { t, frames } = s1(), nodes = t.defaultNodes as Node[];
    const expected = formatSimpleOutput(nodes, frames, S1_FORMAT);
    expect(expected.issues).toEqual([]);
    expect(expected.text.split('\n')).toEqual(['7 - -', '7 0 -', '7 0 1', '2 0 1', '2 0 1', '2 3 1', '2 3 0', '4 3 0']);
    const parsed = parseSimpleOutput(expected.text + '\n', nodes, t.defaultEdges, S1_FORMAT);
    expect(parsed.errors).toEqual([]);
    const replay = generateFramesFromTrace(parsed.trace, t.defaultEdges);
    const pick = (d: Record<string, unknown>) => ({ slots: d.slots, fault: d.faultSlotIndex ?? null, hit: d.hitSlotIndex ?? null });
    expected.lines.forEach((line, k) => {
      const authored = drawn(nodes, frames, line.scene)[1] as Record<string, unknown>;
      const fromOutput = drawn(nodes, replay, k)[1] as Record<string, unknown>;
      expect(pick(fromOutput)).toEqual(pick(authored));
    });
  });

  it('reports a precise line for bad tokens, too many cells and unknown names', () => {
    const { t } = s1(), nodes = t.defaultNodes as Node[];
    expect(parseSimpleOutput('7 - -\n7 x -', nodes, [], S1_FORMAT).errors[0]).toMatchObject({ line: 2 });
    expect(parseSimpleOutput('7 0 1 2', nodes, [], S1_FORMAT).errors[0].message).toContain('칸은 3개');
    const st2 = template('ST2'), stNodes = st2.defaultNodes as Node[];
    const states: SimpleOutputFormat = { kind: 'lines-v1', target: 'new' };
    expect(parseSimpleOutput('New Ready\nReady Running', stNodes, st2.defaultEdges, states).errors).toEqual([]);
    expect(parseSimpleOutput('New Sleeping', stNodes, st2.defaultEdges, states).errors[0].message).toContain('Sleeping');
  });

  it('writes gantt segments, counters and chart points as one plain line each', () => {
    const rr = template('G2'), lanes = rr.defaultNodes as Node[], gantt: SimpleOutputFormat = { kind: 'lines-v1', target: lanes.find(n => n.type === 'gantt-lane')!.id };
    // Two RR scenes only explain (no highlighted segment); the editor asks the author to exclude them from output.
    const first = formatSimpleOutput(lanes, rr.defaultFrames!, gantt);
    expect(first.issues).toHaveLength(2);
    const skip = new Set(first.issues.map(m => Number(/장면 (\d+)/.exec(m)![1]) - 1));
    const out = formatSimpleOutput(lanes, rr.defaultFrames!.map((f, i) => ({ ...f, excludeFromOutput: skip.has(i) })), gantt);
    expect(out.issues).toEqual([]);
    expect(out.lines[0].text).toMatch(/^P\d \d+ \d+$/);
    expect(parseSimpleOutput(out.text, lanes, [], gantt).errors).toEqual([]);
    const ds = template('DS'), dsNodes = ds.defaultNodes as Node[];
    const counter = formatSimpleOutput(dsNodes, ds.defaultFrames!, { kind: 'lines-v1', target: 'distance' });
    expect(counter.issues).toEqual([]);
    expect(counter.text.split('\n').every(l => /^\d+$/.test(l))).toBe(true);
    const chart = formatSimpleOutput(dsNodes, ds.defaultFrames!, { kind: 'lines-v1', target: 'path' });
    expect(parseSimpleOutput(chart.text, dsNodes, [], { kind: 'lines-v1', target: 'path' }).errors).toEqual([]);
  });

  it('explains when a scene value cannot be one line (spaces inside a table cell)', () => {
    const ds = template('DS'), nodes = ds.defaultNodes as Node[];
    const table = formatSimpleOutput(nodes, ds.defaultFrames!, { kind: 'lines-v1', target: 'moves' });
    expect(table.issues.join(' ')).toMatch(/띄어쓰기|강조 행/);
  });
});

describe('saved coding documents', () => {
  const doc = (frames: Frame[], extra: Record<string, unknown> = {}) => {
    const { t } = s1(), nodes = t.defaultNodes as Node[];
    return { mode: 'coding_diff', codingDiff: { nodes, edges: t.defaultEdges, frames, referenceTrace: framesToTrace(nodes, frames), outputFormat: S1_FORMAT, ...extra } };
  };
  it('accepts scenes plus a plain output format, and old record-only documents', () => {
    expect(() => validateFreeDiagram(doc(s1().frames))).not.toThrow();
    const { t } = s1();
    expect(() => validateFreeDiagram({ mode: 'coding_diff', codingDiff: { nodes: t.defaultNodes, edges: [], referenceTrace: [] } })).not.toThrow();
  });
  it('rejects a record that no longer matches its scenes and a broken format', () => {
    expect(() => validateFreeDiagram(doc(s1().frames, { referenceTrace: [] }))).toThrow(/장면과 재생 기록/);
    expect(() => validateFreeDiagram(doc(s1().frames, { outputFormat: { kind: 'lines-v1', target: 'nope' } }))).toThrow(/요소/);
    expect(() => validateFreeDiagram(doc(s1().frames, { outputFormat: { ...S1_FORMAT, blank: 'a b' } }))).toThrow(/빈 칸 기호/);
    expect(() => validateFreeDiagram(doc(s1().frames.map(f => ({ ...f, excludeFromOutput: 'yes' as unknown as boolean }))))).toThrow();
  });
});
