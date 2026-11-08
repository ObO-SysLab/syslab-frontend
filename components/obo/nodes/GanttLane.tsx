'use client';
import { useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { TIMELINE_COLOR_PALETTE } from './ganttColors';
import { useFrameCtx } from '../FrameContext';
import { CheckpointStatusRing } from './CheckpointStatusRing';
import { useGantt } from '../gantt/GanttContext';
import { blocksOf, validBlock } from '../gantt/model';
import { GanttBlockDialog } from '../gantt/GanttBlockDialog';

export function GanttLane({ id, data, selected }: NodeProps) {
  const blocks = blocksOf(data), name = String(data.trackId || '프로세스');
  const { previewFrame, checkpointStatus } = useFrameCtx();
  const { layouts, onEditBlock, editLabel, traceMode } = useGantt();
  const layout = layouts[id] ?? { end: 1, width: 360, ticks: [0, 1] };
  const scale = layout.width / layout.end;
  const cursor = previewFrame?.cursorTime;
  const showCursor = typeof cursor === 'number' && Number.isFinite(cursor) && cursor >= 0 && cursor <= layout.end;
  const [editing, setEditing] = useState<number | null>(null);
  const nextStart = Math.max(0, ...blocks.filter(validBlock).map(b => b.end));
  return <CheckpointStatusRing status={checkpointStatus?.[id]}>
    <div data-gantt-row={id} className="relative flex items-start gap-4 rounded-xl bg-white p-3" style={{ outline: selected ? '2px dashed #6366f1' : undefined, outlineOffset: 3 }}>
      <Handle id="t" type="source" position={Position.Top} style={{ background: '#64748b' }} />
      <Handle id="b" type="source" position={Position.Bottom} style={{ background: '#64748b' }} />
      <div className="flex h-[76px] w-28 shrink-0 items-center"><span title={name} className="line-clamp-3 w-full break-all text-sm font-bold leading-tight text-slate-700">{name}</span></div>
      <div className="relative pt-7" style={{ width: layout.width }}>
        {showCursor && <div className="pointer-events-none absolute top-0 z-20 h-[76px] border-l-2 border-rose-500" data-gantt-cursor style={{ left: cursor * scale }}>
          <span className="absolute top-0 whitespace-nowrap rounded bg-rose-50 px-1 text-[11px] font-bold text-rose-700" style={{ transform: cursor > layout.end * .8 ? 'translateX(-100%)' : 'none' }}>t = {cursor}</span>
        </div>}
        <div data-gantt-axis className="relative h-12 rounded-lg border border-slate-200 bg-slate-50">
          {layout.ticks.map(t => <div key={t} className="pointer-events-none absolute inset-y-0 border-l border-slate-200" style={{ left: t * scale }} />)}
          {blocks.map((block, index) => {
            if (!validBlock(block)) return null;
            const color = TIMELINE_COLOR_PALETTE[block.colorKey] ?? '#64748b';
            const active = data.activeBlockIndex === index;
            const width = Math.max(1, (block.end - block.start) * scale - 2);
            return <button key={index} type="button" className="nodrag nopan pointer-events-auto absolute top-1 bottom-1 overflow-hidden rounded-md text-xs font-semibold transition-[background-color,box-shadow] duration-200"
              data-gantt-block={index} data-active={active} aria-label={`${name} 구간 ${index + 1}: ${block.start}–${block.end}, ${Number((block.end - block.start).toPrecision(12))} 시간 단위`}
              title={width >= 65 ? undefined : `${block.start}–${block.end}`}
              onClick={event => { if (traceMode) return; event.stopPropagation(); setEditing(index); }}
              style={{ left: block.start * scale, width, background: active ? color : `${color}24`, border: `2px solid ${color}`, color: active && block.colorKey !== 'amber' ? 'white' : '#334155', boxShadow: active ? `0 0 0 2px white, 0 0 0 4px ${color}` : 'none' }}>
              {width >= 65 ? `${block.start}–${block.end}` : ''}
            </button>;
          })}
          {blocks.length === 0 && onEditBlock && <button type="button" className="nodrag nopan absolute inset-0 text-xs text-slate-500" onClick={e => { e.stopPropagation(); setEditing(0); }}>+ 구간 추가</button>}
        </div>
        <div className="relative mt-2 h-5 text-xs font-medium text-slate-600">{layout.ticks.map(t => <span key={t} className="absolute" style={{ left: t * scale, transform: t === 0 ? 'none' : t === layout.end ? 'translateX(-100%)' : 'translateX(-50%)' }}>{t}</span>)}</div>
      </div>
      {editing !== null && <GanttBlockDialog block={blocks[editing] ?? { start: nextStart, end: nextStart + 1, colorKey: 'teal' }} title={`${name} · ${editing + 1}번 구간`} editLabel={editLabel}
        onSave={onEditBlock ? block => onEditBlock(id, editing, block) : undefined} onClose={() => setEditing(null)} />}
    </div>
  </CheckpointStatusRing>;
}
