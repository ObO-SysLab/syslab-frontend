'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { TIMELINE_COLOR_PALETTE } from '../nodes/ganttColors';
import { validBlock, type GanttBlock } from './model';
export const colorNames: Record<string, string> = { teal: '청록', indigo: '파랑', amber: '주황', rose: '분홍', slate: '회색', violet: '보라' };
export function GanttBlockDialog({ block, title, editLabel, onSave, onClose }: {
  block: GanttBlock; title: string; editLabel?: string; onSave?: (block: GanttBlock) => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [start, setStart] = useState(String(block.start)), [end, setEnd] = useState(String(block.end));
  const [colorKey, setColor] = useState(block.colorKey);
  const next = { start: Number(start), end: Number(end), colorKey };
  const valid = start.trim() !== '' && end.trim() !== '' && validBlock(next);
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => dialog.close(); }, []);
  return createPortal(
    <dialog ref={ref} aria-label="간트 구간" onCancel={onClose} onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); if (event.target === event.currentTarget) onClose(); }}
      className="m-auto w-[min(420px,calc(100vw-32px))] rounded-2xl border border-slate-200 p-0 shadow-2xl backdrop:bg-slate-900/25">
      <form className="space-y-4 p-5 text-slate-800" onSubmit={event => { event.preventDefault(); if (onSave && valid) { onSave(next); onClose(); } }}>
        <div><p className="text-xs font-semibold text-slate-500">{onSave ? editLabel : '구간 정보'}</p><h2 className="mt-1 break-words text-lg font-bold">{title}</h2></div>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 text-sm">시작 시간<input autoFocus type="number" step="any" min="0" value={start} readOnly={!onSave} onChange={e => setStart(e.target.value)} className="block w-full rounded-lg border border-slate-200 p-2" /></label>
          <label className="space-y-1 text-sm">종료 시간<input type="number" step="any" min="0" value={end} readOnly={!onSave} onChange={e => setEnd(e.target.value)} className="block w-full rounded-lg border border-slate-200 p-2" /></label>
        </div>
        <p className="rounded-lg bg-slate-50 p-3 text-sm">소요 시간: {valid ? Number((next.end - next.start).toPrecision(12)) : '—'} 시간 단위</p>
        {!valid && <p role="alert" className="text-sm text-rose-600">시작은 0 이상, 종료는 시작보다 큰 숫자로 입력하세요.</p>}
        {onSave && <fieldset><legend className="mb-2 text-sm">구간 색상</legend><div className="flex gap-2">{Object.entries(TIMELINE_COLOR_PALETTE).map(([key, color]) => (
          <button key={key} type="button" aria-label={`${colorNames[key]} 색상`} aria-pressed={key === colorKey} onClick={() => setColor(key)} className={`h-9 w-9 rounded-lg border-2 text-white ${key === colorKey ? 'ring-2 ring-indigo-600 ring-offset-2' : ''}`} style={{ backgroundColor: color, borderColor: color }}>{key === colorKey ? '✓' : ''}</button>
        ))}</div></fieldset>}
        <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm">닫기</button>{onSave && <button type="submit" disabled={!valid} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-40">적용</button>}</div>
      </form>
    </dialog>, document.body);
}
