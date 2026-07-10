'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';

interface ProcessBoxSection {
  name: string;
  shared?: boolean;
}

interface ProcessBoxNodeData {
  label: string;
  sections?: ProcessBoxSection[];
  color?: string;
}

export function ProcessBoxNode({ data, selected }: NodeProps) {
  const d = data as ProcessBoxNodeData;
  const sections = d.sections ?? [
    { name: 'Code' }, { name: 'Data' }, { name: 'Heap' }, { name: 'Stack' },
  ];
  const color = d.color ?? '#6366f1';
  const hs = { width: 7, height: 7, background: color, border: 'none' };
  return (
    <div style={{
      border: `1.5px solid ${color}`, borderRadius: 6,
      backgroundColor: 'white', minWidth: 110,
      boxShadow: selected ? `0 0 0 3px ${color}40` : '0 2px 6px rgba(0,0,0,0.06)',
      cursor: 'grab', userSelect: 'none',
    }}>
      <Handle id="t-s" type="source" position={Position.Top}    style={hs} />
      <Handle id="r-s" type="source" position={Position.Right}  style={hs} />
      <Handle id="b-t" type="target" position={Position.Bottom} style={hs} />
      <Handle id="l-t" type="target" position={Position.Left}   style={hs} />
      <div style={{ padding: '4px 12px', borderBottom: `1px solid ${color}30`, fontSize: 11, fontWeight: 700, color }}>
        {d.label}
      </div>
      {sections.map((s, i) => (
        <div key={i} style={{
          padding: '3px 12px', fontSize: 11, color: '#64748b',
          borderBottom: i < sections.length - 1 ? '1px solid #f1f5f9' : undefined,
          backgroundColor: s.shared ? '#f8fafc' : 'white',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          {s.name}
          {s.shared && <span style={{ fontSize: 9, color: '#94a3b8' }}>(공유)</span>}
        </div>
      ))}
    </div>
  );
}