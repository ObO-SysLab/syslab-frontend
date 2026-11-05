'use client';
import type { OverrideFormProps } from './NodeOverrideEditor';
import { GanttBlockList } from '../../gantt/GanttBlockList';
import { blocksOf } from '../../gantt/model';
export function TimelineBlockOverrideForm({ base, override, onFieldChange }: OverrideFormProps) {
  const blocks = blocksOf({ blocks: override.blocks ?? base.blocks });
  const active = typeof override.activeBlockIndex === 'number' ? override.activeBlockIndex : null;
  return <div className="space-y-3">
    <p className="text-xs leading-relaxed text-slate-500">이 장면에서 바꾼 구간은 다음 장면에도 이어집니다. 강조만 이번 장면에 적용됩니다.</p>
    <GanttBlockList value={blocks} onChange={value => onFieldChange('blocks', value)} editLabel="선택한 장면 수정"
      activeIndex={active} onActiveChange={value => onFieldChange('activeBlockIndex', value)} />
    <label className="block text-xs text-slate-600">이 장면에서 강조할 구간
      <select aria-label="강조할 구간" value={active ?? ''} onChange={e => onFieldChange('activeBlockIndex', e.target.value === '' ? null : Number(e.target.value))}
        className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1">
        <option value="">없음</option>{blocks.map((block, i) => <option key={i} value={i}>{i + 1}번 · {block.start}–{block.end}</option>)}
      </select>
    </label>
  </div>;
}
