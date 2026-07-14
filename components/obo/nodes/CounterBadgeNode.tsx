'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';

interface CounterBadgeNodeData {
  label: string;
  key?: string;
  value?: number;
  color?: string;
}

export function CounterBadgeNode({ data, selected }: NodeProps) {
  const d = data as unknown as CounterBadgeNodeData;
  const color = d.color ?? '#b45309';
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '4px 10px', borderRadius: 9999,
      border: `1.5px solid ${color}`, backgroundColor: 'white',
      boxShadow: selected ? `0 0 0 3px ${color}40` : '0 1px 4px rgba(0,0,0,0.08)',
      cursor: 'grab', userSelect: 'none',
    }}>
      <Handle id="l" type="target" position={Position.Left}  style={{ background: color, border: 'none' }} />
      <Handle id="r" type="source" position={Position.Right} style={{ background: color, border: 'none' }} />
      <span style={{ fontSize: 12, fontWeight: 700, color }}>{d.key ?? d.label}</span>
      <span style={{ fontSize: 11, color: '#94a3b8' }}>=</span>
      <span style={{ fontSize: 12, fontWeight: 700, color }}>{d.value ?? 0}</span>
    </div>
  );
}