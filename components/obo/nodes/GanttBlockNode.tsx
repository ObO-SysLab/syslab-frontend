'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';

interface GanttBlockNodeData {
  label: string;
  processId?: string;
  duration?: number;
  color?: string;
  scaleUnit?: number;
}

export function GanttBlockNode({ data, selected }: NodeProps) {
  const d = data as GanttBlockNodeData;
  const scale = d.scaleUnit ?? 20;
  const color = d.color ?? '#1D9E75';
  const width = Math.max((d.duration ?? 3) * scale, 40);
  return (
    <div style={{
      width, height: 32, borderRadius: 4,
      backgroundColor: color + '20',
      border: `1.5px solid ${color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: selected ? `0 0 0 3px ${color}40` : '0 1px 4px rgba(0,0,0,0.08)',
      cursor: 'grab', userSelect: 'none',
    }}>
      <Handle id="l-t" type="target" position={Position.Left}  style={{ background: color, border: 'none' }} />
      <Handle id="r-s" type="source" position={Position.Right} style={{ background: color, border: 'none' }} />
      <span style={{ fontSize: 12, fontWeight: 700, color }}>
        {d.processId ?? d.label}
      </span>
    </div>
  );
}