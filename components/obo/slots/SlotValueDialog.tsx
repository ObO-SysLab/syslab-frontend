'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { parseSlotValue, type SlotValue } from './model';
export function SlotValueDialog({ value, title, editLabel, onSave, onClose }: {
  value: SlotValue; title: string; editLabel?: string; onSave: (value: SlotValue) => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [raw, setRaw] = useState(value == null ? '' : String(value));
  const parsed = parseSlotValue(raw);
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => dialog.close(); }, []);
  return createPortal(<dialog ref={ref} aria-label="칸 값 편집" onCancel={onClose}
    onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); if (e.target === e.currentTarget) onClose(); }}
    className="m-auto w-[min(400px,calc(100vw-32px))] rounded-2xl border border-slate-200 p-0 shadow-2xl backdrop:bg-slate-900/25">
    <form className="space-y-4 p-5 text-slate-800" onSubmit={e => { e.preventDefault(); if (parsed.valid) { onSave(parsed.value); onClose(); } }}>
      <div><p className="text-xs font-semibold text-slate-500">{editLabel}</p><h2 className="mt-1 break-words text-lg font-bold">{title}</h2></div>
      <label className="block text-sm">칸 값<input autoFocus inputMode="decimal" value={raw} onChange={e => setRaw(e.target.value)} className="mt-1 block w-full rounded-lg border p-2" /></label>
      <p className="text-sm text-slate-500">비우면 빈칸입니다. 숫자 0은 값으로 남습니다.</p>
      {!parsed.valid && <p role="alert" className="text-sm text-rose-600">유한한 숫자를 입력하거나 비워 주세요.</p>}
      <div className="flex justify-between gap-2"><button type="button" className="text-sm text-slate-500" onClick={() => setRaw('')}>빈칸으로</button><div className="flex gap-2"><button type="button" onClick={onClose} className="rounded-lg border px-3 py-2 text-sm">취소</button><button type="submit" disabled={!parsed.valid} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-40">적용</button></div></div>
    </form>
  </dialog>, document.body);
}
