'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';

interface AnnotationLabelNodeData {
  label: string;
  style?: 'plain' | 'solid' | 'dashed';
  color?: string;
}

export function AnnotationLabelNode({ data, selected }: NodeProps) {
  const d = data as unknown as AnnotationLabelNodeData;
  const color = d.color ?? '#e24b4a';
  const borderStyle = d.style ?? 'dashed';
  const border = borderStyle === 'plain' ? 'none' : `1.5px ${borderStyle} ${color}`;
  return (
    <div style={{
      padding: '4px 10px', borderRadius: 4,
      border, backgroundColor: 'white',
      boxShadow: selected ? `0 0 0 3px ${color}40` : undefined,
      cursor: 'grab', userSelect: 'none',
    }}>
      <Handle id="l" type="target" position={Position.Left}  style={{ background: color, border: 'none' }} />
      <Handle id="r" type="source" position={Position.Right} style={{ background: color, border: 'none' }} />
      <span style={{ fontSize: 12, fontWeight: 600, color, whiteSpace: 'nowrap' as const }}>
        {d.label}
      </span>
    </div>
  );
}