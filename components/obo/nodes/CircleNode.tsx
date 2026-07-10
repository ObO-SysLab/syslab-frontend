'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';

interface CircleNodeData {
  label: string;
  color?: string;
  borderStyle?: 'solid' | 'dashed';
}

export function CircleNode({ data, selected }: NodeProps) {
  const d = data as CircleNodeData;
  const color = d.color ?? '#6366f1';
  const hs = { width: 8, height: 8, background: color, border: 'none' };
  return (
    <div style={{
      width: 80, height: 80, borderRadius: '50%',
      border: `2px ${d.borderStyle ?? 'solid'} ${color}`,
      backgroundColor: 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: selected ? `0 0 0 3px ${color}40` : '0 2px 6px rgba(0,0,0,0.08)',
      userSelect: 'none', cursor: 'grab',
    }}>
      <Handle id="t-s" type="source" position={Position.Top}    style={hs} />
      <Handle id="r-s" type="source" position={Position.Right}  style={hs} />
      <Handle id="b-s" type="source" position={Position.Bottom} style={hs} />
      <Handle id="l-s" type="source" position={Position.Left}   style={hs} />
      <Handle id="t-t" type="target" position={Position.Top}    style={hs} />
      <Handle id="r-t" type="target" position={Position.Right}  style={hs} />
      <Handle id="b-t" type="target" position={Position.Bottom} style={hs} />
      <Handle id="l-t" type="target" position={Position.Left}   style={hs} />
      <span style={{ fontSize: 11, fontWeight: 700, color, textAlign: 'center', padding: '0 8px', lineHeight: 1.3, wordBreak: 'break-word', maxWidth: 64 }}>
        {d.label}
      </span>
    </div>
  );
}
