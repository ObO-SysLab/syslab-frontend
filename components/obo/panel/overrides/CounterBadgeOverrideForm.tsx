'use client';

import type { OverrideFormProps } from './NodeOverrideEditor';

export function CounterBadgeOverrideForm({ node, base, override, onFieldChange, onFieldClear }: OverrideFormProps) {
  const min = (node.data as { min?: number }).min ?? 0;
  const max = (node.data as { max?: number }).max ?? 10;
  const value = (override.value as number | undefined) ?? (base.value as number | undefined) ?? min;
  const delta = (override.delta as number | null | undefined) ?? null;

  const clamp = (v: number) => Math.min(max, Math.max(min, v));

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">값</label>
        <input
          type="number" min={min} max={max} value={value}
          onChange={e => { const v = Number(e.target.value); if (!isNaN(v)) onFieldChange('value', clamp(v)); }}
          className="w-full text-xs border border-slate-200 rounded px-2 py-1 outline-none focus:border-indigo-400 transition-colors"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">변화량 (이번 프레임)</label>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onFieldChange('delta', 1)}
            className={`px-2 py-1 text-xs rounded border transition-colors ${delta === 1 ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
          >+1</button>
          <button
            onClick={() => onFieldChange('delta', -1)}
            className={`px-2 py-1 text-xs rounded border transition-colors ${delta === -1 ? 'bg-red-50 border-red-300 text-red-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
          >-1</button>
          <button
            onClick={() => onFieldClear('delta')}
            className="px-2 py-1 text-xs rounded border border-slate-200 text-slate-400 hover:bg-slate-50 transition-colors"
          >지우기</button>
        </div>
      </div>
    </div>
  );
}
