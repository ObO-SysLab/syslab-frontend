'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useFrameCtx } from '../FrameContext';

interface ResourceSquareData {
  label: string;
  instances?: number;
  allocated?: number;
}

export function ResourceSquare({ id, data, selected }: NodeProps) {
  const d = (data as unknown) as ResourceSquareData;
  const count = Number.isFinite(d.instances) ? Math.max(0, Math.floor(d.instances!)) : 1;
  const allocated = Number.isFinite(d.allocated) ? Math.max(0, Math.min(count, Math.floor(d.allocated!))) : 0;
  const { previewFrame } = useFrameCtx();
  const active = previewFrame?.highlightNodes.includes(id) ?? false;
  const color = '#0f766e';
  const hs = { width: 7, height: 7, background: color, border: 'none' };

  return (
    <div data-resource={id} data-allocated={allocated} style={{
      boxSizing: 'border-box', padding: '12px', borderRadius: 6,
      border: `${active ? 3.5 : 2}px solid ${active ? color : '#94a3b8'}`,
      backgroundColor: active ? '#f0fdfa' : 'white', width: 112, minHeight: 112,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
      outline: selected ? '3px dashed #6366f1' : 'none', outlineOffset: 5,
      boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
      cursor: 'inherit', userSelect: 'none', transition: 'background-color 250ms ease, border-color 250ms ease',
    }}>
      <Handle id="t-s" type="source" position={Position.Top}    style={hs} />
      <Handle id="r-s" type="source" position={Position.Right}  style={hs} />
      <Handle id="b" type="source" position={Position.Bottom} style={hs} />
      <Handle id="l" type="source" position={Position.Left}   style={hs} />
      <div style={{ fontSize: 15, fontWeight: 800, color: '#334155', overflowWrap: 'anywhere', textAlign: 'center', maxWidth: '100%' }}>{d.label}</div>
      <div aria-label={`${count}개 중 ${allocated}개 사용`} style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'center' }}>
        {Array.from({ length: Math.min(count, 12) }).map((_, i) => (
          <div key={i} style={{
            width: 13, height: 13, borderRadius: '50%',
            backgroundColor: i < allocated ? color : 'transparent',
            border: `1.5px solid ${color}`,
          }} />
        ))}
        {count > 12 && <span style={{ fontSize: 11 }}>+{count - 12}</span>}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: allocated ? color : '#64748b' }}>{allocated} / {count} 사용</div>
    </div>
  );
}
