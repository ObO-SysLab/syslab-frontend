'use client';

import type { OverrideFormProps } from './NodeOverrideEditor';

export function TextLabelOverrideForm({ base, override, onFieldChange }: OverrideFormProps) {
  const value = (override.text as string | undefined) ?? (base.text as string | undefined) ?? '';

  return (
    <div className="space-y-1">
      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">텍스트</label>
      <input
        value={value}
        onChange={e => onFieldChange('text', e.target.value)}
        className="w-full text-xs border border-slate-200 rounded px-2 py-1 outline-none focus:border-indigo-400 transition-colors"
      />
    </div>
  );
}
