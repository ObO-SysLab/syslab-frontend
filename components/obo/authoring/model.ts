import type { Frame } from '../types';
import type { Node } from '@xyflow/react';
import { applyFrame } from '../lib/applyFrame';
import { OVERRIDABLE_NODE_TYPES } from '../lib/overrideFields';
import { memoryLayout, type MemorySegment } from '../examples/memory';

// Manual authoring only. Never add these to the coding trace/grading field registry.
export const AUTHORING_FIELDS: Record<string, string[]> = {
  'state-node': ['label'],
  'resource-square': ['instances', 'allocated'],
  'queue-strip': ['capacity', 'items', 'direction', 'displayStyle', 'showCount', 'showDirection'],
  'table-grid': ['headers', 'rows', 'activeRow', 'width'],
  'memory-range': ['start', 'size', 'segments', 'activeIds'],
  'process-box': ['sections', 'threads', 'activeThreadId', 'hiddenSectionNames', 'hiddenThreadIds', 'threadFields', 'threadLayout', 'sectionLayout', 'showSharedLinks', 'width'],
  'line-chart': ['xLabel', 'yLabel', 'width', 'height', 'xMin', 'xMax', 'yMin', 'yMax', 'xTicks', 'yTicks', 'series', 'progressIndex', 'activePointIndex'],
};
export const MANUAL_OVERRIDE_TYPES = [...new Set([...OVERRIDABLE_NODE_TYPES, ...Object.keys(AUTHORING_FIELDS)])];
export const copyData = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
export function changedFields(type: string, before: Record<string, unknown>, after: Record<string, unknown>) {
  return Object.fromEntries((AUTHORING_FIELDS[type] ?? []).filter(key => JSON.stringify(before[key]) !== JSON.stringify(after[key])).map(key => [key, after[key]]));
}
export function nextLocalId(rows: { id?: unknown }[], prefix: string) {
  let n = 1; while (rows.some(row => row.id === `${prefix}${n}`)) n++;
  return `${prefix}${n}`;
}

export function validateElement(type: string, input: Record<string, unknown>) {
  const data = copyData(input), errors: string[] = [];
  const numeric = (key: string, fallback: number, label: string, min = -Infinity, max = Infinity, integer = false, optional = false): number => {
    const raw = data[key];
    if (optional && (raw === null || raw === undefined)) return fallback;
    const value = raw === undefined ? fallback : raw === null || typeof raw === 'string' && raw.trim() === '' ? NaN : Number(raw);
    if (!Number.isFinite(value) || value < min || value > max || integer && !Number.isInteger(value)) errors.push(`${label}: ${integer ? '정수' : '숫자'}와 범위를 확인하세요.`);
    if (raw !== undefined) data[key] = value;
    return value;
  };
  const list = (key: string): unknown[] => {
    if (data[key] === undefined) return [];
    if (!Array.isArray(data[key])) { errors.push('목록 자료를 확인하세요.'); return []; }
    return data[key] as unknown[];
  };
  if (type === 'state-node' && !String(data.label ?? '').trim()) errors.push('장면 이름을 입력하세요.');
  if (type === 'resource-square') {
    const count = numeric('instances', 1, '자원 개수', 0, 10000, true);
    numeric('allocated', 0, '사용 중 개수', 0, count, true);
  }
  if (type === 'queue-strip') {
    if (data.direction !== undefined && (typeof data.direction !== 'string' || !['ltr', 'rtl'].includes(data.direction))) errors.push('버퍼 방향을 확인하세요.');
    if (data.displayStyle !== undefined && (typeof data.displayStyle !== 'string' || !['strip', 'buffer'].includes(data.displayStyle))) errors.push('버퍼 표시 방식을 확인하세요.');
    for (const key of ['showCount', 'showDirection']) if (data[key] !== undefined && typeof data[key] !== 'boolean') errors.push('버퍼 표시 여부를 확인하세요.');
    const capacity = numeric('capacity', list('items').length, '버퍼 용량', 0, 64, true);
    const items = list('items');
    if (items.length > capacity) errors.push('항목 수가 용량보다 많습니다. 항목을 줄이거나 용량을 늘리세요.');
    if (items.some(item => typeof item !== 'string' || !item.trim())) errors.push('각 항목의 이름을 입력하세요.');
  }
  if (type === 'table-grid') {
    const headers = list('headers'), rows = list('rows');
    const columns = headers.length || (Array.isArray(rows[0]) ? rows[0].length : 0);
    if (rows.some(row => !Array.isArray(row) || row.length !== columns)) errors.push('표의 모든 행과 열 개수를 맞추세요.');
    numeric('width', 300, '표 너비', 160, 1200, true);
    if (data.activeRow !== null && data.activeRow !== undefined) numeric('activeRow', -1, '강조 행', 0, rows.length - 1, true);
  }
  if (type === 'memory-range') {
    const start = numeric('start', 0, '시작 주소', 0, Number.MAX_SAFE_INTEGER, true);
    const size = numeric('size', 16, '전체 크기', 1, Number.MAX_SAFE_INTEGER, true);
    let cursor = start;
    const segments = list('segments').map(raw => {
      const row = raw as MemorySegment;
      const length = row && String(row.size).trim() !== '' ? Number(row.size) : NaN;
      const result = { ...row, start: cursor, size: length };
      if (!Number.isSafeInteger(length) || length <= 0) errors.push('각 구간의 길이는 양의 정수여야 합니다.');
      cursor += length; return result;
    });
    if ('segments' in data) data.segments = segments;
    if (!memoryLayout(start, size, segments)) errors.push('전체 크기와 구간 길이 합계를 맞추세요. 구간 이름표(ID)는 중복될 수 없습니다.');
    if (list('activeIds').some(id => !segments.some(s => s.id === id))) errors.push('강조할 구간을 현재 목록에서 선택하세요.');
  }
  if (type === 'process-box') {
    if (data.width !== undefined && !['number', 'string'].includes(typeof data.width)) errors.push('프로세스 너비는 숫자여야 합니다.');
    numeric('width', 360, '프로세스 너비', 280, 800, true);
    for (const key of ['hiddenSectionNames', 'hiddenThreadIds', 'threadFields']) {
      const values = list(key);
      if (values.some(v => typeof v !== 'string') || new Set(values).size !== values.length) errors.push('표시 항목은 중복 없는 이름 목록이어야 합니다.');
    }
    if (list('threadFields').some(v => !['pc', 'register', 'stack'].includes(String(v)))) errors.push('스레드 표시 항목을 확인하세요.');
    for (const key of ['threadLayout', 'sectionLayout']) if (data[key] !== undefined && (typeof data[key] !== 'string' || !['row', 'column'].includes(data[key] as string))) errors.push('가로 또는 세로 배치를 선택하세요.');
    if (data.showSharedLinks !== undefined && typeof data.showSharedLinks !== 'boolean') errors.push('공유 관계선 표시를 확인하세요.');
    const threads = list('threads') as { id?: string; label?: string }[];
    const ids = threads.map(t => t?.id);
    if (ids.some(id => !id) || new Set(ids).size !== ids.length) errors.push('스레드 ID는 비어 있거나 중복될 수 없습니다.');
    if (threads.some(t => !t?.label?.trim())) errors.push('스레드 이름을 입력하세요.');
    if (data.activeThreadId && !ids.includes(String(data.activeThreadId))) errors.push('현재 스레드를 목록에서 선택하세요.');
  }
  if (type === 'line-chart') {
    numeric('width', 300, '그래프 너비', 240, 1000, true);
    numeric('height', 190, '그래프 높이', 160, 600, true);
    const series = list('series').map(raw => {
      const s = raw as { name: string; color: string; points: { x: unknown; y: unknown }[] };
      if (!s || !Array.isArray(s.points)) { errors.push('선의 좌표 목록을 확인하세요.'); return { name: '', color: '#0f766e', points: [] }; }
      return { ...s, points: s.points.map(p => {
        const x = String(p.x ?? '').trim() === '' ? NaN : Number(p.x), y = String(p.y ?? '').trim() === '' ? NaN : Number(p.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) errors.push('모든 좌표에 유한한 숫자를 입력하세요.');
        return { x, y };
      }) };
    });
    if ('series' in data) data.series = series;
    const points = series.flatMap(s => s.points);
    for (const axis of ['x','y'] as const) {
      const min = numeric(`${axis}Min`, points.length ? Math.min(...points.map(p => p[axis])) : 0, `${axis}축 최소`, -Infinity, Infinity, false, true);
      const max = numeric(`${axis}Max`, Math.max(min + 1, ...points.map(p => p[axis])), `${axis}축 최대`, -Infinity, Infinity, false, true);
      if (max <= min) errors.push(`${axis}축 최대는 최소보다 커야 합니다.`);
      if (points.some(p => p[axis] < min || p[axis] > max)) errors.push(`${axis}좌표가 축 범위를 벗어납니다.`);
      const ticks = data[`${axis}Ticks`];
      if (Array.isArray(ticks) && ticks.some(n => !Number.isFinite(n) || Number(n) < min || Number(n) > max)) errors.push(`${axis}축 눈금이 범위를 벗어납니다. 눈금을 지우면 자동으로 표시합니다.`);
    }
    const last = Math.max(0, ...series.map(s => s.points.length)) - 1;
    if (data.progressIndex !== undefined) numeric('progressIndex', last, '표시할 마지막 점', -1, last, true);
    if (data.activePointIndex !== undefined) numeric('activePointIndex', -1, '현재 점', -1, last, true);
  }
  return { data, errors: [...new Set(errors)] };
}

/** Reject structural edits that would silently invalidate an existing authored scene. */
export function sceneConflicts(node: Node, frames: Frame[], patch: Record<string, unknown>) {
  const next = { ...node, data: { ...node.data, ...patch } };
  return frames.flatMap((_, i) => {
    const effective = applyFrame([next], frames, i)[0].data;
    const errors = validateElement(node.type ?? '', effective).errors;
    return errors.length ? [`장면 ${i + 1}: ${errors[0]}`] : [];
  });
}
export function pruneFrameReferences(frames: Frame[], nodeIds: string[], edgeIds: string[]) {
  const nodes = new Set(nodeIds), edges = new Set(edgeIds);
  return frames.map(f => ({ ...f,
    highlightNodes: f.highlightNodes.filter(id => !nodes.has(id)),
    highlightEdges: f.highlightEdges.filter(id => !edges.has(id)),
    ...(f.visibleEdges ? { visibleEdges: f.visibleEdges.filter(id => !edges.has(id)) } : {}),
    ...(f.nodeDataOverrides ? { nodeDataOverrides: Object.fromEntries(Object.entries(f.nodeDataOverrides).filter(([id]) => !nodes.has(id))) } : {}),
  }));
}
