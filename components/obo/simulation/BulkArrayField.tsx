'use client';
import { useEffect, useMemo, useState } from 'react';
import type { Json } from '../runtime/index.mjs';
import type { FieldSchema } from './InputForm';
import { BLANK, bulkKind, formatList, formatMatrix, nextRow, parseList, parseMatrix, rowsToValue, splitPastedRows, tableColumns, valueToRows, type BulkKind } from './bulkInput';

const box = 'w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300';
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Text that keeps what the author is typing and commits only valid values. */
function useCommittedText(shown: string, parse: (text: string) => { ok: true; value: Json[] } | { ok: false; error: string }, value: Json | undefined, onChange: (v: Json) => void) {
  const [raw, setRaw] = useState(shown);
  const [error, setError] = useState('');
  useEffect(() => { const r = parse(raw); if (!r.ok || !same(r.value, value)) { setRaw(shown); setError(''); } }, [shown]); // eslint-disable-line react-hooks/exhaustive-deps
  const edit = (text: string) => { setRaw(text); const r = parse(text); if (r.ok) { setError(''); if (!same(r.value, value)) onChange(r.value); } else setError(r.error); };
  return { raw, error, edit };
}

function ListLine({ schema, value, onChange, label }: { schema: FieldSchema; value: Json | undefined; onChange: (v: Json) => void; label: string }) {
  const { raw, error, edit } = useCommittedText(formatList(value), t => parseList(t, schema), value, onChange);
  const nullable = (schema.items?.anyOf ?? schema.items?.oneOf ?? []).some(v => v.type === 'null');
  return <div className="space-y-1">
    <input aria-label={`${label} 한 줄 입력`} className={box} value={raw} onChange={e => edit(e.target.value)} placeholder="예: 7 0 1 2 0 3" />
    <p className={`text-[11px] ${error ? 'text-rose-600' : 'text-slate-400'}`} role={error ? 'alert' : undefined}>{error || `공백이나 쉼표로 구분${nullable ? ` · 빈 값은 ${BLANK}` : ''} · ${Array.isArray(value) ? value.length : 0}개`}</p>
  </div>;
}

function MatrixText({ schema, value, onChange, label, rowLabels }: { schema: FieldSchema; value: Json | undefined; onChange: (v: Json) => void; label: string; rowLabels?: string[] }) {
  const { raw, error, edit } = useCommittedText(formatMatrix(value), t => parseMatrix(t, schema), value, onChange);
  return <div className="space-y-1">
    <textarea aria-label={`${label} 줄별 입력`} className={`${box} font-mono`} rows={Math.max(2, (Array.isArray(value) ? value.length : 0) + 1)} value={raw} onChange={e => edit(e.target.value)} />
    <p className={`text-[11px] ${error ? 'text-rose-600' : 'text-slate-400'}`} role={error ? 'alert' : undefined}>{error || `한 줄 = 한 행, 값은 공백으로 구분${rowLabels?.length ? ` · 행 순서: ${rowLabels.join(', ')}` : ''}`}</p>
  </div>;
}

function RecordTable({ schema, value, onChange, label, labelOf, seedItem }: { schema: FieldSchema; value: Json | undefined; onChange: (v: Json) => void; label: string; labelOf: (key: string) => string; seedItem: () => Json }) {
  const columns = useMemo(() => tableColumns(schema.items)!, [schema]);
  const shown = useMemo(() => valueToRows(value, columns), [value, columns]);
  const [grid, setGrid] = useState(shown);
  const [errors, setErrors] = useState<{ row: number; col: number; message: string }[]>([]);
  useEffect(() => { const r = rowsToValue(grid, columns); if (!r.ok || !same(r.value, value)) { setGrid(shown); setErrors([]); } }, [shown]); // eslint-disable-line react-hooks/exhaustive-deps
  const min = schema.minItems ?? 0, max = schema.maxItems ?? 10000;
  const commit = (next: string[][]) => {
    setGrid(next);
    const r = rowsToValue(next, columns);
    if (r.ok) { setErrors([]); if (!same(r.value, value)) onChange(r.value); } else setErrors(r.errors);
  };
  const seedRow = () => valueToRows([seedItem()], columns)[0];
  const errorAt = (row: number, col: number) => errors.find(e => e.row === row && e.col === col)?.message;
  return <div className="space-y-1">
    <div className="overflow-x-auto rounded-md border border-slate-200">
      <table className="w-full border-collapse text-xs">
        <thead className="bg-slate-50"><tr>
          {columns.map(c => <th key={c.key} scope="col" title={c.list ? '여러 값은 공백으로 구분' : undefined} className="px-1.5 py-1 text-left align-bottom text-[11px] font-semibold leading-tight text-slate-600">{labelOf(c.key)}{c.optional ? <span className="block font-normal text-slate-400">선택</span> : null}</th>)}
          <th className="w-8" />
        </tr></thead>
        <tbody>{grid.map((cells, row) => <tr key={row} className="border-t border-slate-100">
          {columns.map((c, col) => {
            const message = errorAt(row, col);
            return <td key={c.key} className="p-0.5"><input aria-label={`${label} ${row + 1}행 ${labelOf(c.key)}`} title={message} aria-invalid={!!message}
              className={`w-full min-w-[2.75rem] rounded border px-1 py-1 font-mono text-xs ${message ? 'border-rose-400 bg-rose-50' : 'border-transparent hover:border-slate-200 focus:border-indigo-300'}`}
              value={cells[col] ?? ''} onChange={e => commit(grid.map((r, i) => i === row ? r.map((v, j) => j === col ? e.target.value : v) : r))}
              onPaste={e => { const text = e.clipboardData.getData('text'); if (!/[\n\t]/.test(text.trim())) return; e.preventDefault();
                const pasted = splitPastedRows(text, columns); commit([...grid.slice(0, row), ...pasted, ...grid.slice(row + pasted.length)].slice(0, max)); }} /></td>;
          })}
          <td className="p-0.5 text-center"><button type="button" aria-label={`${label} ${row + 1}행 삭제`} disabled={grid.length <= min} className="rounded px-1 text-rose-500 hover:bg-rose-50 disabled:opacity-30" onClick={() => commit(grid.filter((_, i) => i !== row))}>×</button></td>
        </tr>)}</tbody>
      </table>
    </div>
    <div className="flex items-center gap-2">
      <button type="button" disabled={grid.length >= max} className="shrink-0 whitespace-nowrap rounded-md bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 disabled:opacity-40" onClick={() => commit([...grid, nextRow(grid, columns, seedRow())])}>행 추가</button>
      <p className={`text-[11px] ${errors.length ? 'text-rose-600' : 'text-slate-400'}`} role={errors.length ? 'alert' : undefined}>{errors.length ? `${errors[0].row + 1}행 ${labelOf(columns[errors[0].col].key)}: ${errors[0].message}` : (columns.some(c => c.list) ? `${columns.filter(c => c.list).map(c => labelOf(c.key)).join('·')} 칸은 값을 공백으로 구분합니다.` : '')}</p>
    </div>
  </div>;
}

/** Bulk editor for list-shaped schema arrays, with a switch back to the per-field form. */
export function BulkArrayField({ schema, value, onChange, label, labelOf, seedItem, classic, rowLabels }: {
  schema: FieldSchema; value: Json | undefined; onChange: (v: Json) => void; label: string; labelOf: (key: string) => string;
  seedItem: () => Json; classic: React.ReactNode; rowLabels?: string[];
}) {
  const kind = bulkKind(schema) as BulkKind;
  const [perField, setPerField] = useState(false);
  const count = Array.isArray(value) ? value.length : 0;
  return <fieldset className="min-w-0 space-y-2 rounded-lg border border-slate-200 p-3" data-bulk-kind={kind}>
    <legend className="px-1 text-xs font-bold text-slate-700">{label} · {count}</legend>
    <div className="flex justify-end"><button type="button" className="text-[11px] text-indigo-600 underline" onClick={() => setPerField(v => !v)}>{perField ? (kind === 'table' ? '표로 입력' : '한 번에 입력') : '칸별 편집'}</button></div>
    {perField ? classic
      : kind === 'list' ? <ListLine schema={schema} value={value} onChange={onChange} label={label} />
      : kind === 'matrix' ? <MatrixText schema={schema} value={value} onChange={onChange} label={label} rowLabels={rowLabels} />
      : <RecordTable schema={schema} value={value} onChange={onChange} label={label} labelOf={labelOf} seedItem={seedItem} />}
  </fieldset>;
}
