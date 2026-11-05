'use client';
import { useState } from 'react';
import { TIMELINE_COLOR_PALETTE } from '../nodes/ganttColors';
import { GanttBlockDialog } from './GanttBlockDialog';
import type { GanttBlock } from './model';
export function GanttBlockList({ value, onChange, activeIndex, onActiveChange, editLabel = '기본 그림 수정' }: {
  value: GanttBlock[]; onChange: (blocks: GanttBlock[]) => void; activeIndex?: number | null;
  onActiveChange?: (index: number | null) => void; editLabel?: string;
}) {
  const [editing, setEditing] = useState<number | null>(null);
  const lastEnd = Math.max(0, ...value.map(b => b.end).filter(Number.isFinite));
  return <div className="space-y-2">
    {value.map((block, i) => <div key={i} className="flex items-center gap-1 rounded-lg border border-slate-200 p-1">
      <button type="button" className="flex min-w-0 flex-1 items-center gap-2 p-1 text-left text-xs" onClick={() => setEditing(i)} aria-label={`${i + 1}번 구간 수정`}>
        <span className="h-4 w-4 shrink-0 rounded" style={{ background: TIMELINE_COLOR_PALETTE[block.colorKey] ?? '#64748b' }} /><span>{block.start}–{block.end} · {Number((block.end - block.start).toPrecision(12))} 단위</span>
      </button>
      <button type="button" aria-label={`${i + 1}번 구간 삭제`} className="p-1 text-slate-400 hover:text-rose-600" onClick={() => {
        onChange(value.filter((_, index) => index !== i));
        if (activeIndex != null && onActiveChange) onActiveChange(activeIndex === i ? null : activeIndex > i ? activeIndex - 1 : activeIndex);
      }}>×</button>
    </div>)}
    <button type="button" className="w-full rounded-lg border border-dashed border-indigo-200 py-2 text-xs text-indigo-600" onClick={() => setEditing(value.length)}>+ 구간 추가</button>
    {editing !== null && <GanttBlockDialog block={value[editing] ?? { start: lastEnd, end: lastEnd + 1, colorKey: 'teal' }} title={`${editing + 1}번 구간`} editLabel={editLabel}
      onSave={block => onChange(editing === value.length ? [...value, block] : value.map((b, i) => i === editing ? block : b))} onClose={() => setEditing(null)} />}
  </div>;
}
