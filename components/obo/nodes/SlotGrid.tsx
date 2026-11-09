'use client';
import { useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useFrameCtx } from '../FrameContext';
import { CheckpointStatusRing } from './CheckpointStatusRing';
import { useSlotGrid } from '../slots/SlotGridContext';
import { slotCountOf, slotValues, validSlotIndex } from '../slots/model';
import { SlotValueDialog } from '../slots/SlotValueDialog';

export function SlotGrid({ id, data, selected }: NodeProps) {
  const count = slotCountOf(data), values = slotValues(data);
  const name = String(data.label || '칸 묶음');
  const { previewFrame, checkpointStatus } = useFrameCtx();
  const { onEditSlot, editLabel, traceMode } = useSlotGrid();
  const [editing, setEditing] = useState<number | null>(null);
  const highlighted = previewFrame?.highlightNodes.includes(id);
  const hs = { background: '#6366f1', border: 'none' };
  const invalidValues = data.slots != null && (!Array.isArray(data.slots) || data.slots.some(v => v != null && (typeof v !== 'number' || !Number.isFinite(v))));
  const overflow = Array.isArray(data.slots) && data.slots.length > count;
  return <CheckpointStatusRing status={checkpointStatus?.[id]}>
    <div data-slot-grid={id} className="relative rounded-xl border bg-white p-2" style={{ borderColor: highlighted ? '#d97706' : '#e2e8f0', outline: selected ? '2px dashed #6366f1' : undefined, outlineOffset: 3, maxWidth: 600 }}>
      <Handle id="t" type="source" position={Position.Top} style={hs} /><Handle id="b" type="source" position={Position.Bottom} style={hs} />
      <Handle id="l" type="source" position={Position.Left} style={hs} /><Handle id="r" type="source" position={Position.Right} style={hs} />
      <div className="mb-2 flex items-start justify-between gap-4"><span className="max-w-[440px] break-all text-sm font-bold text-slate-700">{name}</span><span className="shrink-0 text-xs text-slate-500">{count}칸</span></div>
      {count === 0 ? <p className="py-4 text-sm text-slate-500">빈 칸 묶음 · 속성에서 칸 수를 늘려 보세요.</p> : <div className="grid gap-x-2 gap-y-3" style={{ gridTemplateColumns: `repeat(${Math.min(8, count)}, 64px)` }}>
        {values.map((value, index) => {
          const fault = data.faultSlotIndex === index, hit = !fault && data.hitSlotIndex === index;
          const active = data.activeSlotIndex === index, pointer = data.pointerSlotIndex === index;
          const badge = fault ? 'Miss' : hit ? 'Hit' : active ? '이번 참조' : '';
          const color = fault ? '#be123c' : hit ? '#047857' : active ? '#4338ca' : '#64748b';
          return <div key={index} data-slot-index={index} data-slot-value={value ?? ''} data-slot-marker={badge} data-slot-pointer={pointer} className="text-center">
            <div className="flex h-6 items-start justify-center"><span data-slot-badge className="rounded px-1 py-0.5 text-xs font-bold" style={{ color, backgroundColor: badge ? `${color}12` : undefined }}>{badge}</span></div>
            <button type="button" aria-label={`${name} 칸 ${index}: ${value == null ? '빈칸' : value}`} title={onEditSlot ? '눌러서 칸 값 편집' : value == null ? '빈칸' : String(value)}
              className={`${onEditSlot && !traceMode ? 'nodrag nopan cursor-pointer hover:ring-2 hover:ring-indigo-200' : 'cursor-grab'} flex h-12 w-16 items-center justify-center overflow-hidden rounded-lg border-2 px-1 text-lg font-bold transition-colors`}
              onClick={e => { if (onEditSlot && !traceMode) { e.stopPropagation(); setEditing(index); } }}
              style={{ color: badge ? color : '#334155', borderColor: badge ? color : '#cbd5e1', backgroundColor: badge ? `${color}0d` : '#f8fafc' }}>
              <span className="truncate">{value == null ? <span className="text-xs font-medium text-slate-400">빈칸</span> : value}</span>
            </button>
            <div className="mt-1 text-xs text-slate-500">칸 {index}</div>
            {(data.pointerLabel || data.pointerSlotIndex != null) && <div className="mt-1 h-5 text-xs font-bold text-amber-700">{pointer ? String(data.pointerLabel || '다음') : ''}</div>}
          </div>;
        })}
      </div>}
      {(invalidValues || overflow) && <p role="alert" className="mt-2 max-w-[560px] text-xs text-rose-700">{invalidValues ? '숫자가 아닌 칸 값이 있습니다. 값이나 출력 기록을 확인하세요.' : '칸 수보다 값이 많습니다. 칸 수나 출력 기록을 확인하세요.'}</p>}
      {editing !== null && validSlotIndex(editing, count) && onEditSlot && <SlotValueDialog key={`${editing}-${editLabel}`} value={values[editing]} title={`${name} · 칸 ${editing}`} editLabel={editLabel} onSave={value => onEditSlot(id, editing, value)} onClose={() => setEditing(null)} />}
    </div>
  </CheckpointStatusRing>;
}
