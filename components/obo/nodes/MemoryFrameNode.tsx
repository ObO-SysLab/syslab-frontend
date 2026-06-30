'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';

interface MemoryFrameNodeData {
  label: string;
  frameCount?: number;
  pages?: (string | null)[];
  color?: string;
}

export function MemoryFrameNode({ data, selected }: NodeProps) {
  const d = data as MemoryFrameNodeData;
  const count = d.frameCount ?? 4;
  const pages = d.pages ?? Array(count).fill(null);
  const color = d.color ?? '#6366f1';
  return (
    <div style={{
      display: 'inline-flex', flexDirection: 'column', gap: 0,
      boxShadow: selected ? `0 0 0 3px ${color}40` : undefined,
      cursor: 'grab', userSelect: 'none',
    }}>
      <Handle id="t" type="source" position={Position.Top}    style={{ background: color, border: 'none' }} />
      <Handle id="b" type="target" position={Position.Bottom} style={{ background: color, border: 'none' }} />
      {d.label && (
        <div style={{ fontSize: 10, fontWeight: 600, color, marginBottom: 3 }}>{d.label}</div>
      )}
      <div style={{ display: 'flex' }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{
            width: 32, height: 32,
            border: `1.5px solid ${color}`,
            marginLeft: i === 0 ? 0 : -1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 600, color, backgroundColor: 'white',
          }}>
            {pages[i] ?? ''}
          </div>
        ))}
      </div>
    </div>
  );
}