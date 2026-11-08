'use client';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useFrameCtx } from '../FrameContext';
import { memoryLayout, memoryTicks, segmentText, type MemorySegment } from '../examples/memory';
interface MemoryData { label?: string; start?: number; size?: number; segments?: MemorySegment[]; activeIds?: string[]; }
// Drawn bar width: 680 card − 2×18 padding − 2×2 border.
const BAR = 640;
export function MemoryRangeNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as MemoryData;
  const start = d.start ?? 0, size = d.size ?? 16;
  const layout = memoryLayout(start, size, d.segments ?? []);
  const ticks = layout ? memoryTicks(layout.segments.map(s => s.start), start, size, BAR) : [];
  const { previewFrame } = useFrameCtx();
  return <div data-memory={id} style={{ width: 680, padding: 18, boxSizing: 'border-box', border: `2px solid ${previewFrame?.highlightNodes.includes(id) ? '#4f46e5' : '#cbd5e1'}`, borderRadius: 12, background: 'white', outline: selected ? '3px dashed #6366f1' : undefined }}>
    <Handle id="l" type="target" position={Position.Left} /><Handle id="r" type="source" position={Position.Right} />
    <h3 style={{ margin: '0 0 16px', fontSize: 16, color: '#334155' }}>{d.label || '메모리 주소 공간'}</h3>
    {!layout ? <p role="alert">주소 구간의 범위·겹침·빈틈을 확인하세요.</p> : <>
      <div style={{ display: 'flex', height: 80 }}>{layout.segments.map(s => {
        const text = segmentText(s.size / size * BAR);
        return <div key={s.id} data-memory-segment={s.id} data-size={s.size} data-free={!!s.free} data-text={text} title={`${s.label} · 주소 ${s.start}–${s.start + s.size} · ${s.size}칸`} style={{
          flex: `0 0 ${s.size / size * 100}%`, boxSizing: 'border-box', minWidth: 0, border: `2px ${s.free ? 'dashed' : 'solid'} ${d.activeIds?.includes(s.id) ? '#d97706' : s.free ? '#94a3b8' : '#6366f1'}`,
          background: d.activeIds?.includes(s.id) ? '#fef3c7' : s.free ? '#f8fafc' : '#e0e7ff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#334155', overflow: 'hidden', padding: '0 4px' }}>
          {/* Narrow blocks keep only the size (or nothing); the full name, range and size stay in the title. */}
          {text === 'full' && <strong style={{ fontSize: 14, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</strong>}
          {text !== 'none' && <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{text === 'full' ? `${s.size}칸` : s.size}</span>}
        </div>;
      })}</div>
      <div style={{ position: 'relative', height: 32, fontSize: 12, color: '#64748b' }}>
        {ticks.map(t => <span key={t.value} data-memory-tick={t.value} style={{ position: 'absolute', top: 6, left: `${t.left}%`, transform: t.align === 'start' ? undefined : t.align === 'end' ? 'translateX(-100%)' : 'translateX(-50%)', whiteSpace: 'nowrap' }}>{t.value}</span>)}
      </div>
      <div style={{ display: 'flex', gap: 28, fontSize: 14, fontWeight: 700, color: '#475569' }}><span data-memory-free={layout.free}>총 빈 공간 {layout.free}칸</span><span data-memory-largest={layout.largest}>가장 큰 연속 공간 {layout.largest}칸</span></div>
    </>}
  </div>;
}
