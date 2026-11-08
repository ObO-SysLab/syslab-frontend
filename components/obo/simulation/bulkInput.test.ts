import { describe, expect, it } from 'vitest';
import { registry, run, type Json } from '../runtime/index.mjs';
import { createDocument } from '../runtime/document.mjs';
import type { FieldSchema } from './InputForm';
import { bulkKind, formatList, formatMatrix, nextRow, parseCell, parseList, parseMatrix, rowsToValue, splitPastedRows, tableColumns, valueToRows } from './bulkInput';

type Found = { id: string; path: string; schema: FieldSchema; value: Json };
function arraysIn(id: string, schema: FieldSchema, value: Json, path = 'input'): Found[] {
  if (schema.type === 'array' && bulkKind(schema)) return [{ id, path, schema, value }];
  if (schema.type === 'array' && Array.isArray(value)) return value.flatMap((v, i) => arraysIn(id, schema.items ?? {}, v, `${path}[${i}]`));
  if (schema.type === 'object' && value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, Json>;
    return Object.entries(record).flatMap(([k, v]) => {
      const child = schema.properties?.[k] ?? (typeof schema.additionalProperties === 'object' ? schema.additionalProperties : undefined);
      return child ? arraysIn(id, child, v, `${path}.${k}`) : [];
    });
  }
  return [];
}
const found = Object.keys(registry).flatMap(id => arraysIn(id, registry[id].inputSchema as FieldSchema, createDocument(id).instances[0].input as Json));

describe('bulk model input (2026-11-08)', () => {
  it('covers lists, matrices and record tables across the rule models', () => {
    const models = new Set(found.map(f => f.id));
    expect(models.size).toBeGreaterThanOrEqual(15);
    expect(new Set(found.map(f => bulkKind(f.schema)))).toEqual(new Set(['list', 'matrix', 'table']));
  });

  it.each(found.map(f => [`${f.id} ${f.path}`, f] as const))('round-trips the default %s without changing the value', (_, f) => {
    const kind = bulkKind(f.schema);
    if (kind === 'list') expect(parseList(formatList(f.value), f.schema)).toEqual({ ok: true, value: f.value });
    else if (kind === 'matrix') expect(parseMatrix(formatMatrix(f.value), f.schema)).toEqual({ ok: true, value: f.value });
    else { const columns = tableColumns(f.schema.items)!; expect(rowsToValue(valueToRows(f.value, columns), columns)).toEqual({ ok: true, value: f.value }); }
  });

  it('turns one pasted line into the page reference string the engine accepts', () => {
    const schema = registry.P2.inputSchema as FieldSchema, refs = schema.properties!.refs;
    const parsed = parseList('7 0 1 2 0 3 0 4 2 3 0 3', refs);
    expect(parsed).toEqual({ ok: true, value: [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3] });
    const input = { ...createDocument('P2').instances[0].input, refs: parsed.ok ? parsed.value : [] };
    expect(() => run('P2', input)).not.toThrow();
  });

  it('reads blanks as null where the model allows it and explains bad tokens', () => {
    const table = (registry.TLB.inputSchema as FieldSchema).properties!.table;
    expect(parseList('7 3 - 0', table)).toEqual({ ok: true, value: [7, 3, null, 0] });
    const refs = (registry.P2.inputSchema as FieldSchema).properties!.refs;
    const bad = parseList('7 x', refs);
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toContain('2번째');
  });

  it('builds CPU job rows from spreadsheet or space separated paste, with the burst list in one cell', () => {
    const columns = tableColumns((registry.G2.inputSchema as FieldSchema).properties!.jobs.items)!;
    const keys = columns.map(c => c.key);
    const tabbed = splitPastedRows(`P1\t0\t5 3 2\t1\nP2\t1\t4\t`, columns);
    const spaced = splitPastedRows('P1 0 5 3 2 1', columns);
    expect(tabbed[0][keys.indexOf('bursts')]).toBe('5 3 2');
    expect(spaced[0][keys.indexOf('bursts')]).toBe('5 3 2');
    expect(spaced[0][keys.indexOf('priority')]).toBe('1');
    const result = rowsToValue(tabbed, columns);
    expect(result.ok).toBe(true);
    if (result.ok) expect((result.value[1] as Record<string, Json>).priority).toBeUndefined();
  });

  it('marks the cell that breaks a rule and keeps other rows', () => {
    const columns = tableColumns((registry.G2.inputSchema as FieldSchema).properties!.jobs.items)!;
    const r = rowsToValue([['P1', '-3', '5', '']], columns);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toMatchObject({ row: 0, col: columns.findIndex(c => c.key === 'arrival') });
    expect(parseCell('', columns.find(c => c.key === 'priority')!)).toEqual({ ok: true, value: undefined });
  });

  it('adds a row by copying the last one with the next free id', () => {
    const columns = tableColumns((registry.G2.inputSchema as FieldSchema).properties!.jobs.items)!;
    const rows = valueToRows(createDocument('G2').instances[0].input.jobs as Json, columns);
    const added = nextRow(rows, columns, columns.map(() => ''));
    expect(added[columns.findIndex(c => c.key === 'id')]).toBe(`P${rows.length + 1}`);
  });
});
