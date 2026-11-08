import { describe, expect, it } from 'vitest';
import type { Node } from '@xyflow/react';
import { OBO_TEMPLATES } from '../templates';
import { applyFrame } from './applyFrame';
import { applyNodeEdit, cellValue, checkNodeEdit, toggleId } from './nodeEdit';

const template = (id: string) => structuredClone(OBO_TEMPLATES.find(t => t.id === id)!);
const dataOf = (nodes: Node[], id: string) => nodes.find(n => n.id === id)!.data as Record<string, unknown>;

describe('click-to-edit on the drawing (2026-11-08)', () => {
  it('writes a scene value to that scene only and carries it forward', () => {
    const t = template('TLB'), nodes = t.defaultNodes as Node[], frames = t.defaultFrames!;
    const r = checkNodeEdit(nodes, frames, 'pages', { activeRow: 0 }, 2);
    expect(r.ok).toBe(true);
    const after = applyNodeEdit(nodes, frames, 'pages', r.ok ? r.patch : {}, 2);
    expect(after.nodes).toBe(nodes);
    expect(after.frames[2].nodeDataOverrides?.pages).toMatchObject({ activeRow: 0 });
    expect(dataOf(applyFrame(nodes, after.frames, 2), 'pages').activeRow).toBe(0);
    expect(after.frames[1]).toEqual(frames[1]);
  });

  it('writes to the base drawing outside the scene tab', () => {
    const t = template('TLB'), nodes = t.defaultNodes as Node[], frames = t.defaultFrames!;
    const rows = structuredClone(dataOf(nodes, 'pages').rows as unknown[][]); rows[0][1] = 9;
    const after = applyNodeEdit(nodes, frames, 'pages', { rows }, null);
    expect(dataOf(after.nodes, 'pages').rows).toEqual(rows);
    expect(after.frames).toBe(frames);
  });

  it('refuses a queue item beyond capacity and a counter outside its range, explaining why', () => {
    const t = template('C1'), nodes = t.defaultNodes as Node[], frames = t.defaultFrames!;
    const full = checkNodeEdit(nodes, frames, 'buffer', { items: ['a', 'b', 'c'] }, null);
    expect(full.ok).toBe(false);
    if (!full.ok) expect(full.error).toMatch(/용량|항목/);
    expect(checkNodeEdit(nodes, frames, 'empty', { value: 99 }, null).ok).toBe(false);
    expect(checkNodeEdit(nodes, frames, 'empty', { value: 1 }, 3).ok).toBe(true);
  });

  it('keeps base names unique and refuses an empty name', () => {
    const t = template('ST2'), nodes = t.defaultNodes as Node[];
    const r = checkNodeEdit(nodes, [], 'new', { label: 'Ready' }, null);
    expect(r.ok && r.patch.label).not.toBe('Ready');
    expect(checkNodeEdit(nodes, [], 'new', { label: '  ' }, null).ok).toBe(false);
  });

  it('keeps numeric table cells numeric and toggles highlighted ids', () => {
    expect(cellValue('12', 5)).toBe(12);
    expect(cellValue('있음', '없음')).toBe('있음');
    expect(cellValue('7', '대기')).toBe('7');
    expect(toggleId(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleId(['a', 'b'], 'a')).toEqual(['b']);
  });
});
