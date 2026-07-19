'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';

interface QueueStripNodeData {
  label: string;
  items?: string[];
  direction?: 'ltr' | 'rtl';
  color?: string;
}

export function QueueStripNode({ data, selected }: NodeProps) {
  const d = data as unknown as QueueStripNodeData;
  const items = d.items ?? [];
  const color = d.color ?? '#534AB7';
  const dir = d.direction ?? 'ltr';
  const displayItems = dir === 'rtl' ? [...items].reverse() : items;
  return (
    <div style={{
      display: 'inline-flex', flexDirection: 'column', gap: 2,
      cursor: 'grab', userSelect: 'none',
      boxShadow: selected ? `0 0 0 3px ${color}40` : undefined,
    }}>
      <Handle id="l" type="target" position={Position.Left}  style={{ background: color, border: 'none' }} />
      <Handle id="r" type="source" position={Position.Right} style={{ background: color, border: 'none' }} />
      {d.label && (
        <div style={{ fontSize: 10, fontWeight: 600, color, marginBottom: 2 }}>{d.label}</div>
      )}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {displayItems.map((item, i) => (
          <div key={i} style={{
            width: 36, height: 28,
            border: `1.5px solid ${color}`,
            marginLeft: i === 0 ? 0 : -1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 600, color, backgroundColor: 'white',
          }}>
            {item}
          </div>
        ))}
        <div style={{ marginLeft: 6, fontSize: 14, color, lineHeight: 1 }}>
          {dir === 'ltr' ? '→' : '←'}
        </div>
      </div>
    </div>
  );
}