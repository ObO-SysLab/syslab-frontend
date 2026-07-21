'use client';

import type { OverrideFormProps } from './NodeOverrideEditor';
import { TIMELINE_COLOR_KEYS, DEFAULT_TIMELINE_COLOR_KEY } from '../../nodes/ganttColors';

interface TimelineBlock {
  start: number;
  end: number;
  colorKey: string;
}

export function TimelineBlockOverrideForm({ base, override, onFieldChange, onFieldClear }: OverrideFormProps) {
  const blocks = (override.blocks as TimelineBlock[] | undefined) ?? (base.blocks as TimelineBlock[] | undefined) ?? [];
  const activeBlockIndex = (override.activeBlockIndex as number | null | undefined) ?? null;

  const updateBlocks = (next: TimelineBlock[]) => onFieldChange('blocks', next);
  const updateBlock = (i: number, patch: Partial<TimelineBlock>) =>
    updateBlocks(blocks.map((b, j) => j === i ? { ...b, ...patch } : b));

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">블록 목록</label>
        {blocks.map((b, i) => (
          <div key={i} className="relative border border-slate-100 rounded-lg p-2 flex items-end gap-1.5">
            <button
              onClick={() => updateBlocks(blocks.filter((_, j) => j !== i))}
              className="absolute top-1.5 right-1.5 text-slate-300 hover:text-red-400 text-xs transition-colors"
            >✕</button>
            <div className="flex-1">
              <p className="text-[9px] text-slate-400 mb-0.5">시작</p>
              <input type="number" min={0} value={b.start}
                onChange={e => updateBlock(i, { start: Number(e.target.value) })}
                className="w-full px-1.5 py-1 text-xs border border-slate-200 rounded" />
            </div>
            <div className="flex-1">
              <p className="text-[9px] text-slate-400 mb-0.5">종료</p>
              <input type="number" min={0} value={b.end}
                onChange={e => updateBlock(i, { end: Number(e.target.value) })}
                className="w-full px-1.5 py-1 text-xs border border-slate-200 rounded" />
            </div>
            <div className="flex-1 pr-4">
              <p className="text-[9px] text-slate-400 mb-0.5">색상 키</p>
              <select value={b.colorKey ?? DEFAULT_TIMELINE_COLOR_KEY}
                onChange={e => updateBlock(i, { colorKey: e.target.value })}
                className="w-full px-1 py-1 text-xs border border-slate-200 rounded bg-white">
                {TIMELINE_COLOR_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
          </div>
        ))}
        <button
          onClick={() => updateBlocks([...blocks, { start: 0, end: 2, colorKey: DEFAULT_TIMELINE_COLOR_KEY }])}
          className="w-full text-xs text-indigo-500 hover:text-indigo-700 py-1 border border-dashed border-indigo-200 rounded transition-colors"
        >+ 블록 추가</button>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">활성 블록 (이번 프레임)</label>
        <select
          value={activeBlockIndex ?? ''}
          onChange={e => e.target.value === '' ? onFieldClear('activeBlockIndex') : onFieldChange('activeBlockIndex', Number(e.target.value))}
          className="w-full px-1.5 py-1 text-xs border border-slate-200 rounded bg-white"
        >
          <option value="">없음</option>
          {blocks.map((_, i) => <option key={i} value={i}>블록 {i}</option>)}
        </select>
      </div>
    </div>
  );
}
