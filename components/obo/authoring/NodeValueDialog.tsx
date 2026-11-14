'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Node } from '@xyflow/react';
import { cellValue, type EditTarget } from '../lib/nodeEdit';

type Apply = (patch: Record<string, unknown>) => string | null;
interface Spec { title: string; label: string; value: string; multiline?: boolean; numeric?: boolean; hint?: string;
  toPatch: (raw: string, extra: boolean) => Record<string, unknown>; extra?: { label: string; value: boolean };
  actions?: { label: string; patch: Record<string, unknown> }[]; }

/** What the clicked part edits, per element type. Scene-allowed fields only. */
function specFor(node: Node, data: Record<string, unknown>, target: EditTarget): Spec | null {
  const name = String(data.label || '요소');
  if (target.kind === 'cell' && node.type === 'table-grid') {
    const rows = Array.isArray(data.rows) ? data.rows as (string | number)[][] : [];
    const previous = rows[target.row]?.[target.col];
    const active = data.activeRow === target.row;
    return { title: `${name} · ${target.row + 1}행 ${target.col + 1}열`, label: '셀 값', value: String(previous ?? ''),
      toPatch: raw => ({ rows: rows.map((r, i) => i !== target.row ? r : r.map((v, j) => j === target.col ? cellValue(raw, previous) : v)) }),
      actions: [{ label: active ? '이 행 강조 해제' : '이 행 강조', patch: { activeRow: active ? null : target.row } }] };
  }
  if (target.kind === 'queue-item' && node.type === 'queue-strip') {
    const items = Array.isArray(data.items) ? data.items as string[] : [];
    const adding = target.index >= items.length;
    return { title: `${name} · ${adding ? '새 항목' : `${target.index + 1}번째 항목`}`, label: adding ? '맨 뒤에 넣을 항목' : '항목 이름', value: adding ? '' : items[target.index],
      hint: '맨 앞 항목이 먼저 꺼내집니다.',
      toPatch: raw => ({ items: adding ? [...items, raw.trim()] : items.map((v, i) => i === target.index ? raw.trim() : v) }),
      actions: adding ? [] : [{ label: '이 항목 빼기', patch: { items: items.filter((_, i) => i !== target.index) } }] };
  }
  if (target.kind !== 'whole') return null;
  switch (node.type) {
    case 'state-node': return { title: name, label: '이름', value: String(data.label ?? ''), extra: { label: '삭제됨으로 표시 (점선·취소선)', value: data.removed === true },
      toPatch: (raw, removed) => ({ label: raw, removed }) };
    case 'text-label': return { title: '설명 글', label: '문구', value: String(data.text ?? data.label ?? ''), multiline: true, toPatch: raw => ({ text: raw }) };
    case 'counter-badge': return { title: name, label: '값', value: String(data.value ?? 0), numeric: true,
      hint: data.min !== undefined || data.max !== undefined ? `${data.min ?? '-∞'} ~ ${data.max ?? '∞'} 사이` : undefined, toPatch: raw => ({ value: Number(raw) }) };
    case 'resource-square': return { title: name, label: '사용 중 개수', value: String(data.allocated ?? 0), numeric: true,
      hint: `전체 ${String(data.instances ?? 1)}개 중`, toPatch: raw => ({ allocated: Number(raw) }) };
  }
  return null;
}

export function NodeValueDialog({ node, data, target, editLabel, onApply, onClose }: {
  node: Node; data: Record<string, unknown>; target: EditTarget; editLabel: string; onApply: Apply; onClose: () => void;
}) {
  const spec = specFor(node, data, target);
  const ref = useRef<HTMLDialogElement>(null);
  const [raw, setRaw] = useState(spec?.value ?? '');
  const [extra, setExtra] = useState(spec?.extra?.value ?? false);
  const [error, setError] = useState('');
  useEffect(() => { const dialog = ref.current; if (!dialog) return; dialog.showModal(); return () => dialog.close(); }, []);
  if (!spec) return null;
  const numericError = spec.numeric && (raw.trim() === '' || !Number.isFinite(Number(raw)));
  const submit = (patch: Record<string, unknown>) => { const message = onApply(patch); if (message) setError(message); else onClose(); };
  return createPortal(<dialog ref={ref} aria-label="그림 값 편집" onCancel={onClose}
    onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); if (e.target === e.currentTarget) onClose(); }}
    className="m-auto w-[min(420px,calc(100vw-32px))] rounded-2xl border border-slate-200 p-0 shadow-2xl backdrop:bg-slate-900/25">
    <form className="space-y-4 p-5 text-slate-800" onSubmit={e => { e.preventDefault(); if (!numericError) submit(spec.toPatch(raw, extra)); }}>
      <div><p className="text-xs font-semibold text-slate-500">{editLabel}</p><h2 className="mt-1 break-words text-lg font-bold">{spec.title}</h2></div>
      <label className="block text-sm">{spec.label}
        {spec.multiline
          ? <textarea autoFocus rows={3} value={raw} onChange={e => setRaw(e.target.value)} className="mt-1 block w-full rounded-lg border p-2" />
          : <input autoFocus inputMode={spec.numeric ? 'decimal' : undefined} value={raw} onChange={e => setRaw(e.target.value)} className="mt-1 block w-full rounded-lg border p-2" />}
      </label>
      {spec.extra && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={extra} onChange={e => setExtra(e.target.checked)} />{spec.extra.label}</label>}
      {spec.hint && <p className="text-sm text-slate-500">{spec.hint}</p>}
      {(error || numericError) && <p role="alert" className="text-sm text-rose-600">{error || '숫자를 입력하세요.'}</p>}
      <div className="flex flex-wrap justify-between gap-2">
        <div className="flex gap-2">{spec.actions?.map(a => <button key={a.label} type="button" className="rounded-lg border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" onClick={() => submit(a.patch)}>{a.label}</button>)}</div>
        <div className="flex gap-2"><button type="button" onClick={onClose} className="rounded-lg border px-3 py-2 text-sm">취소</button>
          <button type="submit" disabled={!!numericError} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-40">적용</button></div>
      </div>
    </form>
  </dialog>, document.body);
}

export const dialogSupported = (node: Node, target: EditTarget) =>
  target.kind === 'cell' ? node.type === 'table-grid' : target.kind === 'queue-item' ? node.type === 'queue-strip'
    : ['state-node', 'text-label', 'counter-badge', 'resource-square'].includes(node.type ?? '');
