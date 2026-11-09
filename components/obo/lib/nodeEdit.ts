import type { Node } from '@xyflow/react';
import type { Frame } from '../types';
import { applyFrame } from './applyFrame';
import { AUTHORING_FIELDS, sceneConflicts, validateElement } from '../authoring/model';
import { validateDiagramElement } from '../runtime/freeDiagram.mjs';
import { collectLabels, makeUniqueLabel } from './label';

/**
 * Click-to-edit on the drawing (2026-11-08). `sceneIndex === null` edits the base drawing (속성 탭);
 * a number edits that scene's own values, which carry forward like any other scene value (장면 탭).
 * Same rules as the side-panel editors: element validation plus no broken later scene.
 */
export type EditTarget = { kind: 'whole' } | { kind: 'cell'; row: number; col: number } | { kind: 'queue-item'; index: number };

const clean = (message: string) => message.replace(/^[^:]*:\s*/, '');

export function effectiveData(nodes: Node[], frames: Frame[], id: string, sceneIndex: number | null): Record<string, unknown> {
  const node = sceneIndex === null ? nodes.find(n => n.id === id) : applyFrame(nodes, frames, sceneIndex).find(n => n.id === id);
  return (node?.data ?? {}) as Record<string, unknown>;
}

export function applyNodeEdit(nodes: Node[], frames: Frame[], id: string, patch: Record<string, unknown>, sceneIndex: number | null) {
  if (sceneIndex === null) return { nodes: nodes.map(n => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n), frames };
  return { nodes, frames: frames.map((f, i) => i !== sceneIndex ? f : {
    ...f, nodeDataOverrides: { ...f.nodeDataOverrides, [id]: { ...f.nodeDataOverrides?.[id], ...patch } },
  }) };
}

/** Returns the patch to apply (base labels made unique) or an explanation of why it is refused. */
export function checkNodeEdit(nodes: Node[], frames: Frame[], id: string, patch: Record<string, unknown>, sceneIndex: number | null):
  { ok: true; patch: Record<string, unknown> } | { ok: false; error: string } {
  const node = nodes.find(n => n.id === id);
  if (!node) return { ok: false, error: '요소를 찾을 수 없습니다.' };
  if (sceneIndex !== null && (sceneIndex < 0 || sceneIndex >= frames.length)) return { ok: false, error: '장면을 먼저 고르세요.' };
  const next = { ...patch };
  if (sceneIndex === null && typeof next.label === 'string') {
    const label = next.label.trim();
    if (!label) return { ok: false, error: '이름을 비울 수 없습니다.' };
    const taken = collectLabels(nodes, id);
    next.label = taken.has(label) ? makeUniqueLabel(label, taken) : label;
  }
  const data = { ...effectiveData(nodes, frames, id, sceneIndex), ...next };
  if (node.type && node.type in AUTHORING_FIELDS) {
    const errors = validateElement(node.type, data).errors;
    if (errors.length) return { ok: false, error: errors[0] };
  }
  try { validateDiagramElement(node.type, data); } catch (error) { return { ok: false, error: clean(error instanceof Error ? error.message : String(error)) }; }
  // The side panel limits counters to their min/max; keep the same limit here.
  if (node.type === 'counter-badge' && 'value' in next) {
    const value = Number(next.value), min = typeof data.min === 'number' ? data.min : -Infinity, max = typeof data.max === 'number' ? data.max : Infinity;
    if (!Number.isFinite(value) || value < min || value > max) return { ok: false, error: `값은 ${Number.isFinite(min) ? min : '-∞'}~${Number.isFinite(max) ? max : '∞'} 사이여야 합니다.` };
  }
  const after = applyNodeEdit(nodes, frames, id, next, sceneIndex);
  const target = after.nodes.find(n => n.id === id)!;
  const conflicts = node.type && node.type in AUTHORING_FIELDS ? sceneConflicts(target, after.frames, {}) : [];
  if (conflicts.length) return { ok: false, error: `${conflicts[0]} · 그 장면의 값을 먼저 고치세요.` };
  return { ok: true, patch: next };
}

/** Keeps numbers numeric when the cell held a number before (tables mix numbers and words). */
export function cellValue(raw: string, previous: unknown): string | number {
  const t = raw.trim();
  return typeof previous === 'number' && /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : raw;
}

export const toggleId = (list: unknown, id: string): string[] => {
  const ids = Array.isArray(list) ? list.filter((v): v is string => typeof v === 'string') : [];
  return ids.includes(id) ? ids.filter(v => v !== id) : [...ids, id];
};
