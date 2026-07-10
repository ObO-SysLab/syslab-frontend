'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';

interface TextLabelData {
  label?: string; // for compat
  text?: string;
  variant?: 'plain' | 'dashed-box' | 'pill';
  color?: string;
}

export function TextLabel({ data, selected }: NodeProps) {
  const d = (data as unknown) as TextLabelData;
  const text = d.text ?? d.label ?? '';
  const color = d.color ?? '#334155';
  const variant = d.variant ?? 'plain';

  const border =
    variant === 'dashed-box' ? `1.5px dashed ${color}` :
    variant === 'pill'       ? `1.5px solid ${color}` :
    'none';

  const borderRadius =
    variant === 'pill'       ? 9999 :
    variant === 'dashed-box' ? 4    : 0;

  const padding = variant === 'plain' ? '2px 4px' : '4px 12px';

  return (
    <div style={{
      padding, borderRadius, border,
      backgroundColor: 'white',
      boxShadow: selected ? `0 0 0 3px ${color}40` : undefined,
      cursor: 'grab', userSelect: 'none',
      display: 'inline-flex', alignItems: 'center',
    }}>
      <Handle id="l" type="source" position={Position.Left}  style={{ background: color, border: 'none' }} />
      <Handle id="r" type="source" position={Position.Right} style={{ background: color, border: 'none' }} />
      <span style={{ fontSize: 12, fontWeight: 600, color, whiteSpace: 'nowrap' as const }}>{text}</span>
    </div>
  );
}