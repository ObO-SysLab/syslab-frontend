'use client';

import type { OverrideFormProps } from './NodeOverrideEditor';

export function SlotGridOverrideForm({ node, base, override, onFieldChange, onFieldClear }: OverrideFormProps) {
  const slotCount = (node.data as { slotCount?: number }).slotCount ?? 0;
  const slots = (override.slots as (number | null)[] | undefined) ?? (base.slots as (number | null)[] | undefined) ?? [];
  const faultSlotIndex = (override.faultSlotIndex as number | null | undefined) ?? null;
  const hitSlotIndex = (override.hitSlotIndex as number | null | undefined) ?? null;

  const updateSlot = (i: number, raw: string) => {
    const next = Array.from({ length: slotCount }, (_, j) => slots[j] ?? null);
    next[i] = raw === '' ? null : Number(raw);
    onFieldChange('slots', next);
  };

  const eventSelect = (
    label: string,
    field: 'faultSlotIndex' | 'hitSlotIndex',
    value: number | null,
  ) => (
    <div className="space-y-1">
      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</label>
      <select
        value={value ?? ''}
        onChange={e => e.target.value === '' ? onFieldClear(field) : onFieldChange(field, Number(e.target.value))}
        className="w-full px-1.5 py-1 text-xs border border-slate-200 rounded bg-white"
      >
        <option value="">없음</option>
        {Array.from({ length: slotCount }).map((_, i) => <option key={i} value={i}>슬롯 {i}</option>)}
      </select>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">슬롯 값</label>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: slotCount }).map((_, i) => (
            <input
              key={i}
              value={slots[i] ?? ''}
              onChange={e => updateSlot(i, e.target.value)}
              placeholder="-"
              className="w-10 px-1 py-1 text-xs text-center border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300"
            />
          ))}
        </div>
      </div>
      {eventSelect('폴트 슬롯 (이번 프레임)', 'faultSlotIndex', faultSlotIndex)}
      {eventSelect('히트 슬롯 (이번 프레임)', 'hitSlotIndex', hitSlotIndex)}
    </div>
  );
}
