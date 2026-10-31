'use client';
import { useEffect, useState } from 'react';
import { MAX_SLOTS, parseSlotValue, type SlotValue } from './model';
function ValueInput({ value, label, onChange }: { value: SlotValue; label: string; onChange: (value: SlotValue) => void }) {
  const [raw, setRaw] = useState(value == null ? '' : String(value));
  const [invalid, setInvalid] = useState(false);
  useEffect(() => { setRaw(value == null ? '' : String(value)); setInvalid(false); }, [value]);
  const commit = () => { const parsed = parseSlotValue(raw); setInvalid(!parsed.valid); if (parsed.valid && parsed.value !== value) onChange(parsed.value); };
  return <label className="min-w-0 text-xs text-slate-500">{label}
    <input aria-label={`${label} 값`} aria-invalid={invalid} inputMode="decimal" value={raw} placeholder="빈칸"
      onChange={e => { setRaw(e.target.value); setInvalid(false); }} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
      className={`mt-1 w-full rounded-lg border p-2 text-center text-sm text-slate-800 ${invalid ? 'border-rose-500' : 'border-slate-200'}`} />
    {invalid && <span role="alert" className="text-rose-600">숫자 또는 빈칸</span>}
  </label>;
}
export function SlotGridFields({ values, onChange }: { values: SlotValue[]; onChange: (values: SlotValue[]) => void }) {
  return <div className="grid grid-cols-3 gap-2">{values.map((value, index) => <ValueInput key={index} value={value} label={`칸 ${index}`} onChange={value => { const next = [...values]; next[index] = value; onChange(next); }} />)}</div>;
}
export function SlotCountField({ count, onChange }: { count: number; onChange: (count: number) => void }) {
  const [raw, setRaw] = useState(String(count));
  useEffect(() => setRaw(String(count)), [count]);
  const value = Number(raw), valid = raw.trim() !== '' && Number.isInteger(value) && value >= 1 && value <= MAX_SLOTS;
  return <div className="space-y-2"><label className="block text-xs font-semibold text-slate-600">칸 수 (1–{MAX_SLOTS})
    <input aria-label="칸 수" type="number" min={1} max={MAX_SLOTS} step={1} value={raw} onChange={e => setRaw(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm" /></label>
    <button type="button" disabled={!valid || value === count} className="w-full rounded-lg border border-indigo-200 py-2 text-xs font-semibold text-indigo-700 disabled:opacity-40"
      onClick={() => { if (value < count && !window.confirm('줄어드는 칸의 기본값과 모든 장면의 해당 값·표식을 지웁니다. 되돌리기로 복원할 수 있습니다. 칸 수를 줄일까요?')) return; onChange(value); }}>칸 수 적용</button>
    {!valid && <p role="alert" className="text-xs text-rose-600">1~{MAX_SLOTS} 사이의 정수를 입력하세요.</p>}
    <p className="text-xs leading-relaxed text-slate-500">모든 장면의 칸 수를 함께 맞춥니다. 참조 기록과 설명은 자동 계산되지 않습니다.</p>
  </div>;
}
