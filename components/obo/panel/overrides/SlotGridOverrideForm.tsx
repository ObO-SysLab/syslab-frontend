'use client';
import type { OverrideFormProps } from './NodeOverrideEditor';
import { SlotGridFields } from '../../slots/SlotGridFields';
import { slotCountOf, slotValues, validSlotIndex, type SlotEventField } from '../../slots/model';

export function SlotGridOverrideForm({ node, base, override, onFieldChange, onFieldClear }: OverrideFormProps) {
  const count = slotCountOf(node.data);
  const values = slotValues({ ...base, ...override }, count);
  const select = (label: string, field: SlotEventField) => <label className="block space-y-1 text-xs text-slate-600">{label}
    <select aria-label={label} value={validSlotIndex(override[field], count) ? String(override[field]) : ''}
      onChange={e => {
        if (e.target.value === '') onFieldClear(field); else {
          onFieldChange(field, Number(e.target.value));
          if (field === 'faultSlotIndex') onFieldClear('hitSlotIndex');
          if (field === 'hitSlotIndex') onFieldClear('faultSlotIndex');
        }
      }} className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs">
      <option value="">없음</option>
      {Array.from({ length: count }, (_, i) => <option key={i} value={i}>칸 {i}</option>)}
    </select>
  </label>;
  return <div className="space-y-3" data-slot-override={node.id}>
    <p className="text-xs leading-relaxed text-slate-500">값은 다음 장면에도 이어집니다. 아래 표식은 이 장면에만 표시됩니다.</p>
    <SlotGridFields values={values} onChange={slots => onFieldChange('slots', slots)} />
    {'slots' in override && <button type="button" className="text-xs text-indigo-600 underline" onClick={() => onFieldClear('slots')}>값 변경 취소 · 앞 장면 값 사용</button>}
    {select('적재·교체 칸 (FAULT)', 'faultSlotIndex')}
    {select('이미 있는 칸 (HIT)', 'hitSlotIndex')}
    {select('이번 참조 위치', 'activeSlotIndex')}
    {select('다음 위치 표시', 'pointerSlotIndex')}
  </div>;
}
