'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';

interface ResourceNodeData {
  label: string;
  instanceCount?: number;
  color?: string;
}

export function ResourceNode({ data, selected }: NodeProps) {
  const d = data as ResourceNodeData;
  const count = d.instanceCount ?? 1;
  const color = d.color ?? '#1e293b';
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
      <Handle id="b-t" type="target" position={Position.Bottom} style={hs} />
      <Handle id="l-t" type="target" position={Position.Left}   style={hs} />
      <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 8 }}>{d.label}</div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: color }} />
        ))}
      </div>
    </div>
  );
}