'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';

interface RectNodeData {
  label: string;
  color?: string;
  shape?: 'rect' | 'pill';
}

export function RectNode({ data, selected }: NodeProps) {
  const d = data as RectNodeData;
  const color = d.color ?? '#64748b';
  const borderRadius = d.shape === 'pill' ? 9999 : 8;
  const hs = { width: 7, height: 7, background: color, border: 'none' };
  return (
    <div style={{
      padding: '8px 16px', borderRadius,
      border: `1.5px solid ${color}`, backgroundColor: 'white', minWidth: 80,
      boxShadow: selected ? `0 0 0 3px ${color}40` : '0 2px 6px rgba(0,0,0,0.06)',
      cursor: 'grab', userSelect: 'none',
    }}>
      <Handle id="t-s" type="source" position={Position.Top}    style={hs} />
      <Handle id="r-s" type="source" position={Position.Right}  style={hs} />
      <Handle id="b-t" type="target" position={Position.Bottom} style={hs} />
      <Handle id="l-t" type="target" position={Position.Left}   style={hs} />
      <span style={{ fontSize: 13, fontWeight: 600, color, whiteSpace: 'nowrap' }}>
        {d.label}
      </span>
    </div>
  );
}
