'use client';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useFrameCtx } from '../FrameContext';
interface QueueData { label?: string; items?: string[]; capacity?: number; direction?: 'ltr' | 'rtl'; color?: string; }
export function QueueStripNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as QueueData;
  const items = Array.isArray(d.items) ? d.items : [];
  const capacity = d.capacity ?? items.length;
  const valid = Number.isInteger(capacity) && capacity >= items.length && capacity >= 0 && capacity <= 64;
  const count = valid ? capacity : 0;
  const { previewFrame } = useFrameCtx();
  const active = previewFrame?.highlightNodes.includes(id);
  const color = d.color ?? '#4f46e5';
  const display = d.direction === 'rtl' ? [...items].reverse() : items;
  return <div data-queue={id} style={{ width: Math.max(220, Math.min(count, 8) * 68 + 32), padding: 14, borderRadius: 12,
    boxSizing: 'border-box', border: `2px solid ${active ? color : '#cbd5e1'}`, background: active ? '#eef2ff' : 'white',
    outline: selected ? '3px dashed #6366f1' : undefined, outlineOffset: 4 }}>
    <Handle id="l" type="target" position={Position.Left} /><Handle id="r" type="source" position={Position.Right} />
    <div style={{ fontSize: 14, fontWeight: 800, color }}>{d.label || '버퍼'} · {items.length} / {valid ? count : '?'}개</div>
    {!valid ? <p role="alert">항목 수와 버퍼 용량을 확인하세요.</p> : <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
        {Array.from({ length: count }, (_, i) => <div key={i} data-queue-item={display[i] ?? ''} style={{ width: 60, height: 48,
          display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px ${i < items.length ? 'solid' : 'dashed'} ${i < items.length ? color : '#94a3b8'}`,
          borderRadius: 6, background: i < items.length ? '#e0e7ff' : '#f8fafc', color: i < items.length ? '#312e81' : '#64748b', fontSize: 16, fontWeight: 700 }}>{display[i] ?? '빈칸'}</div>)}
      </div>
      <p style={{ margin: '10px 0 0', fontSize: 12, color: '#475569' }}>{count === 0 ? '빈 버퍼 · 용량 0' : d.direction === 'rtl' ? '새 항목 → FIFO 순서 → 먼저 꺼냄' : '먼저 꺼냄 ← FIFO 순서 ← 새 항목'}</p>
    </>}
  </div>;
}
