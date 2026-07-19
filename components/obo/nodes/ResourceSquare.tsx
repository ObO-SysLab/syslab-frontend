'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';

interface ResourceSquareData {
  label: string;
  instances?: number;
  allocated?: number;
}

export function ResourceSquare({ data, selected }: NodeProps) {
  const d = (data as unknown) as ResourceSquareData;
  const count = d.instances ?? 1;
  const allocated = d.allocated ?? 0;
  const color = '#1e293b';
  const hs = { width: 7, height: 7, background: color, border: 'none' };

  return (
    <div style={{
      padding: '6px 12px 10px', borderRadius: 4,
      border: `1.5px solid ${color}`, backgroundColor: 'white', minWidth: 64,
      boxShadow: selected ? `0 0 0 3px ${color}40` : '0 2px 6px rgba(0,0,0,0.06)',
      cursor: 'grab', userSelect: 'none',
    }}>
      <Handle id="t-s" type="source" position={Position.Top}    style={hs} />
      <Handle id="r-s" type="source" position={Position.Right}  style={hs} />
      <Handle id="b" type="source" position={Position.Bottom} style={hs} />
      <Handle id="l" type="source" position={Position.Left}   style={hs} />
      <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 8 }}>{d.label}</div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{
            width: 10, height: 10, borderRadius: '50%',
            backgroundColor: i < allocated ? color : 'transparent',
            border: `1.5px solid ${color}`,
          }} />
        ))}
      </div>
    </div>
  );
}