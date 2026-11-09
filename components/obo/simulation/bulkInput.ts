import type { Json } from '../runtime/index.mjs';
import type { FieldSchema } from './InputForm';

/**
 * Bulk entry for schema-driven model inputs (2026-11-08): one-line lists, matrices and record tables.
 * Pure text <-> JSON conversion. Results are the same JSON values the per-field form produces; the
 * engine and the server validator remain the authority.
 */
type Parsed<T = Json> = { ok: true; value: T } | { ok: false; error: string };
const ok = <T,>(value: T): Parsed<T> => ({ ok: true, value });
const fail = (error: string): Parsed<never> => ({ ok: false, error });
const variantsOf = (s: FieldSchema) => s.anyOf ?? s.oneOf;
const SCALAR_TYPES = ['integer', 'number', 'string', 'boolean', 'null'];
export const BLANK = '-';

export function isScalarSchema(s?: FieldSchema): boolean {
  if (!s) return false;
  if (s.enum || 'const' in s) return true;
  const variants = variantsOf(s);
  if (variants) return variants.length > 0 && variants.every(v => !variantsOf(v) && (!!v.enum || SCALAR_TYPES.includes(v.type ?? '')));
  return SCALAR_TYPES.slice(0, 4).includes(s.type ?? '');
}

export interface Column { key: string; schema: FieldSchema; optional: boolean; list: boolean }
export function tableColumns(item?: FieldSchema): Column[] | null {
  if (!item || item.type !== 'object' || !item.properties || typeof item.additionalProperties === 'object') return null;
  const columns = Object.entries(item.properties).map(([key, schema]) => ({
    key, schema, optional: !(item.required ?? []).includes(key), list: schema.type === 'array' && isScalarSchema(schema.items),
  }));
  return columns.length && columns.every(c => c.list || isScalarSchema(c.schema)) ? columns : null;
}

export type BulkKind = 'list' | 'matrix' | 'table';
export function bulkKind(s: FieldSchema): BulkKind | null {
  if (s.type !== 'array' || !s.items) return null;
  if (isScalarSchema(s.items)) return 'list';
  if (s.items.type === 'array' && isScalarSchema(s.items.items)) return 'matrix';
  return tableColumns(s.items) ? 'table' : null;
}

export function parseScalar(token: string, s: FieldSchema): Parsed {
  const t = token.trim();
  const variants = variantsOf(s);
  if (variants) {
    // Most specific reading first: blank -> null, then true/false, numbers, fixed words, and free text last.
    const rank = (v: FieldSchema) => v.type === 'null' ? 0 : v.type === 'boolean' ? 1 : v.type === 'integer' || v.type === 'number' ? 2 : v.enum || 'const' in v ? 3 : 4;
    for (const v of [...variants].sort((a, b) => rank(a) - rank(b))) { const r = parseScalar(t, v); if (r.ok) return r; }
    return fail(`‘${t || '빈 칸'}’의 형식을 확인하세요.`);
  }
  if ('const' in s) return t === String(s.const) ? ok(s.const ?? null) : fail(`‘${String(s.const)}’만 쓸 수 있습니다.`);
  if (s.enum) {
    const hit = s.enum.find(e => String(e) === t);
    return hit !== undefined ? ok(hit) : fail(`‘${t || '빈 칸'}’ 대신 ${s.enum.map(String).join(', ')} 중 하나를 쓰세요.`);
  }
  switch (s.type) {
    case 'null': return t === BLANK || t === 'null' ? ok(null) : fail('빈 값은 -로 쓰세요.');
    case 'boolean': return t === 'true' || t === '참' ? ok(true) : t === 'false' || t === '거짓' ? ok(false) : fail(`‘${t}’ 대신 참 또는 거짓을 쓰세요.`);
    case 'integer': case 'number': {
      if (!/^-?\d+(\.\d+)?$/.test(t)) return fail(`‘${t || '빈 칸'}’은 숫자가 아닙니다.`);
      const n = Number(t);
      if (s.type === 'integer' && !Number.isInteger(n)) return fail(`‘${t}’ 대신 정수를 쓰세요.`);
      if ((s.minimum !== undefined && n < s.minimum) || (s.maximum !== undefined && n > s.maximum))
        return fail(`‘${t}’은 ${s.minimum ?? '-∞'}~${s.maximum ?? '∞'} 범위를 벗어납니다.`);
      return ok(n);
    }
    case 'string':
      if (!t) return fail('빈 칸이 있습니다.');
      if (s.maxLength !== undefined && t.length > s.maxLength) return fail(`‘${t.slice(0, 12)}…’이 너무 깁니다.`);
      if (s.pattern && !new RegExp(s.pattern).test(t)) return fail(`‘${t}’은 이름으로 쓸 수 없습니다. 영문자로 시작하세요.`);
      return ok(t);
  }
  return fail('지원하지 않는 값입니다.');
}

export const formatScalar = (v: Json | undefined): string => v === null || v === undefined ? BLANK : String(v);

const tokens = (text: string) => text.split(/[\s,]+/).filter(Boolean);

export function parseList(text: string, s: FieldSchema): Parsed<Json[]> {
  const parts = tokens(text);
  if (s.minItems !== undefined && parts.length < s.minItems) return fail(`값을 ${s.minItems}개 이상 쓰세요.`);
  if (s.maxItems !== undefined && parts.length > s.maxItems) return fail(`값은 ${s.maxItems}개까지 쓸 수 있습니다.`);
  const out: Json[] = [];
  for (const [i, part] of parts.entries()) {
    const r = parseScalar(part, s.items ?? {});
    if (!r.ok) return fail(`${i + 1}번째 값: ${r.error}`);
    out.push(r.value);
  }
  return ok(out);
}
export const formatList = (v: Json | undefined): string => Array.isArray(v) ? v.map(formatScalar).join(' ') : '';

/** One row per line. */
export function parseMatrix(text: string, s: FieldSchema): Parsed<Json[]> {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (s.minItems !== undefined && lines.length < s.minItems) return fail(`줄을 ${s.minItems}개 이상 쓰세요.`);
  if (s.maxItems !== undefined && lines.length > s.maxItems) return fail(`줄은 ${s.maxItems}개까지 쓸 수 있습니다.`);
  const rows: Json[] = [];
  for (const [i, line] of lines.entries()) {
    const r = parseList(line, s.items ?? {});
    if (!r.ok) return fail(`${i + 1}번째 줄: ${r.error}`);
    rows.push(r.value);
  }
  return ok(rows);
}
export const formatMatrix = (v: Json | undefined): string => Array.isArray(v) ? v.map(row => formatList(row)).join('\n') : '';

/** Table cell: optional columns may be left empty (omitted). List cells are space separated. */
export function parseCell(raw: string, c: Column): Parsed<Json | undefined> {
  const t = raw.trim();
  if (c.optional && (t === '' || (t === BLANK && (c.list || !parseScalar(t, c.schema).ok)))) return ok(undefined);
  return c.list ? parseList(t, c.schema) : parseScalar(t, c.schema);
}
export const formatCell = (v: Json | undefined, c: Column): string => v === undefined ? '' : c.list ? formatList(v) : formatScalar(v);

export function rowsToValue(grid: string[][], columns: Column[]): { ok: true; value: Json[] } | { ok: false; errors: { row: number; col: number; message: string }[] } {
  const errors: { row: number; col: number; message: string }[] = [], value: Json[] = [];
  grid.forEach((cells, row) => {
    const record: Record<string, Json> = {};
    columns.forEach((c, col) => {
      const r = parseCell(cells[col] ?? '', c);
      if (!r.ok) errors.push({ row, col, message: r.error });
      else if (r.value !== undefined) record[c.key] = r.value;
    });
    value.push(record);
  });
  return errors.length ? { ok: false, errors } : { ok: true, value };
}
export const valueToRows = (v: Json | undefined, columns: Column[]): string[][] =>
  Array.isArray(v) ? v.map(item => columns.map(c => formatCell(item && typeof item === 'object' && !Array.isArray(item) ? (item as Record<string, Json>)[c.key] : undefined, c))) : [];

/** Pasted lines from a spreadsheet (tabs) or typed with spaces; one list column takes the remaining tokens. */
export function splitPastedRows(text: string, columns: Column[]): string[][] {
  const listAt = columns.filter(c => c.list).length === 1 ? columns.findIndex(c => c.list) : -1;
  return text.split(/\r?\n/).filter(l => l.trim()).map(line => {
    if (line.includes('\t')) return columns.map((_, i) => line.split('\t')[i]?.trim() ?? '');
    const parts = line.trim().split(/\s+/);
    if (parts.length === columns.length) return parts;
    if (listAt >= 0 && parts.length > columns.length) {
      const extra = parts.length - columns.length;
      return columns.map((_, i) => i < listAt ? parts[i] : i === listAt ? parts.slice(i, i + extra + 1).join(' ') : parts[i + extra]);
    }
    return columns.map((_, i) => i === columns.length - 1 ? parts.slice(i).join(' ') : parts[i] ?? '');
  });
}

/** New table row: copy the last row and advance a trailing number in its id (P3 -> P4). */
export function nextRow(rows: string[][], columns: Column[], seedRow: string[]): string[] {
  const last = rows.at(-1);
  if (!last) return seedRow;
  return last.map((cell, i) => {
    if (columns[i]?.key !== 'id') return cell;
    const m = /^(.*?)(\d+)$/.exec(cell);
    const taken = new Set(rows.map(r => r[i]));
    if (!m) return seedRow[i];
    let n = Number(m[2]) + 1;
    while (taken.has(`${m[1]}${n}`)) n++;
    return `${m[1]}${n}`;
  });
}
