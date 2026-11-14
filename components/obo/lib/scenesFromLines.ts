import type { Edge, Node } from '@xyflow/react';
import type { Frame, SimpleOutputFormat } from '../types';
import { formatSimpleOutput, parseSimpleOutput } from '../runtime/freeDiagram.mjs';
import { nextFrameId } from './id';
import { getEventFields } from './overrideFields';

/**
 * Free mode: plain lines → scenes, one scene per line. The lines use the same rules as a
 * learner's plain output (parseSimpleOutput), so turning the scenes back into lines (formatSimpleOutput)
 * gives the same lines.
 */
export type LinesApplyMode = 'fill' | 'append' | 'replace';
export interface LinesResult { frames: Frame[]; errors: { line: number; message: string }[]; filled: number; created: number; selectId: string | null }

/** Values each element type takes from a line; with them, the per-scene marks the line also sets. */
const LINE_FIELDS: Record<string, string[]> = {
  'slot-grid': ['slots'], 'queue-strip': ['items'], 'counter-badge': ['value'], 'resource-square': ['allocated'], 'text-label': ['text'],
  'table-grid': ['rows', 'activeRow'], 'gantt-lane': ['blocks', 'activeBlockIndex'], 'line-chart': ['series', 'progressIndex', 'activePointIndex'],
};
/** Value-carrying elements first; a status sentence is rarely what the lines should fill. */
export const LINE_TYPE_PRIORITY = ['slot-grid', 'queue-strip', 'table-grid', 'gantt-lane', 'line-chart', 'counter-badge', 'resource-square', 'state-node', 'text-label'];
const ganttGroup = (n: Node) => String((n.data as { ganttGroup?: unknown })?.ganttGroup || '기본 간트');

/** Fields of each element that the lines decide; everything else in a scene stays as the author made it. */
export function lineControlledFields(nodes: Node[], format: SimpleOutputFormat): Map<string, string[]> {
  const target = nodes.find(n => n.id === format.target), out = new Map<string, string[]>();
  if (!target) return out;
  if (target.type === 'gantt-lane') { for (const lane of nodes) if (lane.type === 'gantt-lane' && ganttGroup(lane) === ganttGroup(target)) out.set(lane.id, LINE_FIELDS['gantt-lane']); return out; }
  out.set(target.id, [...(LINE_FIELDS[target.type ?? ''] ?? []), ...(target.type === 'slot-grid' && format.markChanged ? ['faultSlotIndex', 'hitSlotIndex'] : [])]);
  if (format.lineIndexTarget) out.set(format.lineIndexTarget, ['activeSlotIndex']);
  return out;
}

/** Each scene's values as the player shows them (marks reset every scene). */
function sceneStates(nodes: Node[], frames: Frame[]): Map<string, Record<string, unknown>>[] {
  const values = new Map(nodes.map(n => [n.id, { ...(n.data as Record<string, unknown>) }])), out: Map<string, Record<string, unknown>>[] = [];
  for (const f of frames) {
    for (const n of nodes) { const d = { ...values.get(n.id)! }; for (const k of getEventFields(n.type)) d[k] = null; Object.assign(d, f.nodeDataOverrides?.[n.id] ?? {}); values.set(n.id, d); }
    out.push(new Map(values));
  }
  return out;
}
const stable = (v: unknown) => JSON.stringify(v, (_k, x) => x && typeof x === 'object' && !Array.isArray(x)
  ? Object.fromEntries(Object.entries(x as Record<string, unknown>).filter(([, y]) => y != null).sort(([a], [b]) => (a < b ? -1 : 1))) : x);
/** What every scene looks like, in one comparable form per scene, leaving out the given fields of the given elements. */
const shown = (nodes: Node[], frames: Frame[], ignore = new Map<string, string[]>()) => sceneStates(nodes, frames).map((state, i) => stable({
  nodes: nodes.map(n => { const d = { ...state.get(n.id) }; for (const k of ignore.get(n.id) ?? []) delete d[k]; return d; }),
  hl: [...(frames[i].highlightNodes ?? [])].sort(),
}));

/**
 * The line reader starts from the element's own values; when lines go into scene `index`, it starts from what the
 * scene before it shows instead, so "changed cell = Miss" and table rows continue from there.
 */
function readFrom(nodes: Node[], frames: Frame[], index: number, format: SimpleOutputFormat) {
  const target = nodes.find(n => n.id === format.target), field = target?.type === 'slot-grid' ? 'slots' : target?.type === 'table-grid' ? 'rows' : null;
  const before = index > 0 && field ? sceneStates(nodes, frames.slice(0, index)).at(-1)?.get(format.target)?.[field] : undefined;
  return nodes.map(n => ({ id: n.id, type: n.type, position: n.position,
    data: n.id === format.target && field && Array.isArray(before) ? { ...n.data, [field]: structuredClone(before) } : n.data }));
}

export function scenesFromLines({ nodes, edges, frames, format, text, mode, startFrameId = null, sceneIds }: {
  nodes: Node[]; edges: Edge[]; frames: Frame[]; format: SimpleOutputFormat; text: string; mode: LinesApplyMode; startFrameId?: string | null;
  /** Fill: the scenes the lines go into, in order (from currentLines); lines past them become new scenes. */
  sceneIds?: string[];
}): LinesResult {
  // Lines never set edge visibility, so edges are not needed to read them (same as the output format panel).
  void edges;
  const listed = mode === 'fill' && sceneIds?.length ? sceneIds.map(id => frames.findIndex(f => f.id === id)).filter(k => k >= 0) : null;
  const first = mode === 'replace' ? 0 : mode === 'append' ? frames.length
    : listed?.length ? listed[0] : Math.max(0, startFrameId ? frames.findIndex(f => f.id === startFrameId) : 0);
  const { trace, errors } = parseSimpleOutput(text, readFrom(nodes, frames, first, format), [], format);
  if (errors.length || !trace.length) return { frames, errors, filled: 0, created: 0, selectId: null };
  const target = nodes.find(n => n.id === format.target), stateIds = new Set(target?.type === 'state-node' ? nodes.filter(n => n.type === 'state-node').map(n => n.id) : []);
  const controlled = lineControlledFields(nodes, format);
  const fresh = (all: Frame[], step: (typeof trace)[number]): Frame => ({ id: nextFrameId(all), label: '', highlightNodes: [...step.highlightNodes], highlightEdges: [], nodeDataOverrides: structuredClone(step.overrides) as Frame['nodeDataOverrides'] });
  const appendAll = (base: Frame[], steps: typeof trace) => { const next = [...base]; for (const step of steps) next.push(fresh(next, step)); return next; };

  if (mode === 'replace') { const next = appendAll([], trace); return { frames: next, errors: [], filled: 0, created: next.length, selectId: next[0]?.id ?? null }; }
  if (mode === 'append') { const next = appendAll(frames, trace); return { frames: next, errors: [], filled: 0, created: trace.length, selectId: next[frames.length]?.id ?? null }; }

  // Fill from the selected scene: lines change only the values they describe, so descriptions and other marks stay.
  // Scenes left out of a coding problem's output are skipped, as the learner does not print them.
  const next = frames.map(f => ({ ...f })), start = first;
  let k = start, filled = 0, used = 0;
  const rest: typeof trace = [];
  for (const step of trace) {
    if (listed?.length) k = used < listed.length ? listed[used++] : next.length;
    else while (k < next.length && next[k].excludeFromOutput === true) k++;
    if (k >= next.length) { rest.push(step); continue; }
    const frame = next[k++], overrides: Record<string, Record<string, unknown>> = { ...(frame.nodeDataOverrides ?? {}) };
    for (const [id, fields] of controlled) {
      const kept = Object.fromEntries(Object.entries(overrides[id] ?? {}).filter(([key]) => !fields.includes(key)));
      const merged = { ...kept, ...((step.overrides as Record<string, Record<string, unknown>>)[id] ?? {}) };
      if (Object.keys(merged).length) overrides[id] = merged; else delete overrides[id];
    }
    const highlights = stateIds.size ? [...frame.highlightNodes.filter(id => !stateIds.has(id)), ...step.highlightNodes] : frame.highlightNodes;
    next[k - 1] = { ...frame, nodeDataOverrides: overrides, highlightNodes: highlights };
    filled++;
  }
  const all = appendAll(next, rest);
  return { frames: all, errors: [], filled, created: rest.length, selectId: all[start]?.id ?? null };
}

/** Options the existing scenes already use, so the dialog can start from them. */
export function suggestLineFormat(nodes: Node[], frames: Frame[], targets: string[]): SimpleOutputFormat | null {
  const changing = (id: string) => frames.filter(f => Object.keys(f.nodeDataOverrides?.[id] ?? {}).some(k => (LINE_FIELDS[nodes.find(n => n.id === id)?.type ?? ''] ?? []).includes(k))).length;
  // Same choice as the coding output format: among elements whose values change, the most value-like type first.
  const rank = (id: string) => LINE_TYPE_PRIORITY.indexOf(nodes.find(n => n.id === id)?.type ?? '');
  const changed = targets.filter(id => changing(id) > 0);
  const target = [...(changed.length ? changed : targets)].sort((a, b) => rank(a) - rank(b) || changing(b) - changing(a))[0];
  if (!target) return null;
  const format: SimpleOutputFormat = { kind: 'lines-v1', target };
  if (nodes.find(n => n.id === target)?.type !== 'slot-grid') return format;
  const uses = (id: string, field: string) => frames.some(f => (f.nodeDataOverrides?.[id] as Record<string, unknown> | undefined)?.[field] != null);
  const others = nodes.filter(n => n.type === 'slot-grid' && n.id !== target).map(n => n.id);
  const pointer = others.find(id => uses(id, 'activeSlotIndex'));
  if (pointer) format.lineIndexTarget = pointer;
  if (uses(target, 'faultSlotIndex') || uses(target, 'hitSlotIndex')) { format.markChanged = true; if (pointer && uses(target, 'hitSlotIndex')) format.markFoundFrom = pointer; }
  return format;
}

export type SkippedScene = { scene: number; why: 'before-start' | 'excluded' | 'unwritable' };
export interface LinesListing { lines: { scene: number; frameId: string; text: string }[]; text: string; skipped: SkippedScene[]; stoppedAt: number | null }

/**
 * The lines the current scenes already show, paired with their scenes the way fill pairs them back,
 * so editing one line changes only that scene. Scenes left out of the output or with no one-line form are skipped;
 * with line-number highlighting the lines start where it starts. Lines that would not come back as the same scenes
 * (e.g. a highlighted table row that is not the n-th row) are not loaded; `stoppedAt` names the first scene left out.
 */
export function currentLines(nodes: Node[], frames: Frame[], format: SimpleOutputFormat): LinesListing {
  const lines: LinesListing['lines'] = [], skipped: SkippedScene[] = [];
  let start = 0;
  if (format.lineIndexTarget) {
    const k = frames.findIndex(f => (f.nodeDataOverrides?.[format.lineIndexTarget!] as Record<string, unknown> | undefined)?.activeSlotIndex === 0);
    if (k > 0) start = k;
  }
  for (let j = 0; j < start; j++) skipped.push({ scene: j, why: 'before-start' });
  const plain: SimpleOutputFormat = { kind: 'lines-v1', target: format.target, ...(format.blank ? { blank: format.blank } : {}) };
  const reader = nodes.map(n => ({ id: n.id, type: n.type, position: n.position, data: n.data }));
  for (let j = start; j < frames.length; j++) {
    if (frames[j].excludeFromOutput === true) { skipped.push({ scene: j, why: 'excluded' }); continue; }
    const one = formatSimpleOutput(nodes, frames.slice(0, j + 1).map((f, k) => ({ ...f, excludeFromOutput: k !== j })), format), text = one.lines[0]?.text;
    if (one.issues.length || text === undefined || parseSimpleOutput(text, reader, [], plain).errors.length) { skipped.push({ scene: j, why: 'unwritable' }); continue; }
    lines.push({ scene: j, frameId: frames[j].id, text });
  }
  // Keep only lines that, applied unchanged, leave every scene looking the same. Marks the options work out from the
  // lines (changed cell = Miss, Hit from the reference cells, line-number highlight) are not compared: they are not in
  // the lines and are worked out again on apply, e.g. after the author has changed the reference string.
  const derived = new Map<string, string[]>();
  if (format.markChanged) derived.set(format.target, ['faultSlotIndex', 'hitSlotIndex']);
  if (format.lineIndexTarget) derived.set(format.lineIndexTarget, [...(derived.get(format.lineIndexTarget) ?? []), 'activeSlotIndex']);
  const want = shown(nodes, frames, derived);
  let n = lines.length;
  while (n > 0) {
    const made = scenesFromLines({ nodes, edges: [], frames, format, text: lines.slice(0, n).map(l => l.text).join('\n'), mode: 'fill', sceneIds: lines.slice(0, n).map(l => l.frameId) });
    if (made.errors.length) { n = Math.min(n - 1, made.errors[0].line - 1); continue; }
    const bad = shown(nodes, made.frames, derived).findIndex((v, k) => v !== want[k]);
    if (bad < 0) break;
    const at = lines.findIndex(l => l.scene >= bad);
    n = Math.min(n - 1, at < 0 ? n - 1 : at);
  }
  const kept = lines.slice(0, Math.max(0, n)), stoppedAt = kept.length < lines.length ? lines[kept.length].scene : null;
  return { lines: kept, text: kept.map(l => l.text).join('\n'), skipped: skipped.filter(s => stoppedAt === null || s.scene < stoppedAt), stoppedAt };
}

/** What one line holds for the chosen element, with an example made from the element's own values. */
export function lineRule(nodes: Node[], format: SimpleOutputFormat): { rule: string; example: string } {
  const target = nodes.find(n => n.id === format.target), d = (target?.data ?? {}) as Record<string, unknown>, blank = format.blank ?? '-';
  const word = (v: unknown) => { const s = String(v ?? ''); return s && !/\s/.test(s) ? s : null; };
  switch (target?.type) {
    case 'slot-grid': {
      const n = Number.isInteger(d.slotCount) ? Number(d.slotCount) : Array.isArray(d.slots) ? d.slots.length : 0;
      const sample = [7, 0, 1, 2, 3, 4, 5, 6];
      return { rule: `칸 ${n}개의 값을 띄어 쓰고 빈 칸은 ${blank}`, example: Array.from({ length: n }, (_, k) => (k < Math.max(1, n - 1) ? String(sample[k % 8]) : blank)).join(' ') };
    }
    case 'queue-strip': {
      const items = (Array.isArray(d.items) ? d.items.map(word).filter(Boolean) : []) as string[];
      return { rule: `큐 항목을 앞에서부터 띄어 쓰고 비었으면 ${blank}`, example: items.length ? items.join(' ') : 'A B' };
    }
    case 'counter-badge': return { rule: '숫자 하나', example: '1' };
    case 'resource-square': return { rule: '사용 중인 개수(숫자 하나)', example: '1' };
    case 'text-label': return { rule: '줄 전체가 그 장면의 문장', example: '장면을 설명하는 문장' };
    case 'table-grid': {
      const rows = Array.isArray(d.rows) ? (d.rows as unknown[][]) : [], width = (Array.isArray(d.headers) && d.headers.length) || rows[0]?.length || 2;
      const row = rows[0]?.length === width && rows[0].every(v => word(v)) ? rows[0].map(String) : Array.from({ length: width }, (_, k) => String(k + 1));
      return { rule: `표의 한 행(${width}칸)을 띄어 쓰기, n째 줄이 n째 행`, example: row.join(' ') };
    }
    case 'state-node': {
      const names = nodes.filter(n => n.type === 'state-node').map(n => word((n.data as { label?: unknown }).label) ?? n.id);
      return { rule: `켤 상태 이름을 띄어 쓰기 (${names.slice(0, 6).join(', ')})`, example: names[0] ?? '' };
    }
    case 'gantt-lane': {
      const ids = nodes.filter(n => n.type === 'gantt-lane' && ganttGroup(n) === ganttGroup(target)).map(n => word((n.data as { trackId?: unknown }).trackId)).filter(Boolean) as string[];
      return { rule: `ID 시작 종료 (ID: ${ids.join(', ')})`, example: `${ids[0] ?? 'P1'} 0 3` };
    }
    case 'line-chart': return { rule: 'x y 두 숫자, n째 줄이 n째 점', example: '0 1' };
    default: return { rule: '', example: '' };
  }
}
