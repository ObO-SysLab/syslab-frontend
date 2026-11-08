'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useFrameCtx } from '../FrameContext';
import { CheckpointStatusRing } from './CheckpointStatusRing';

interface TextLabelData {
  label?: string; // for compat
  text?: string;
  variant?: 'plain' | 'dashed-box' | 'pill' | 'item' | 'status';
  color?: string;
  caption?: string;
}

export function TextLabel({ id, data, selected }: NodeProps) {
  const d = (data as unknown) as TextLabelData;
  const text = d.text ?? d.label ?? '';
  const color = d.color ?? '#334155';
  const variant = d.variant ?? 'plain';
  const { checkpointStatus } = useFrameCtx();
  const status = checkpointStatus?.[id] ?? null;

  if (variant === 'item') return <CheckpointStatusRing status={status}>
    <div data-item-label={id} style={{ width: 76, textAlign: 'center', color, outline: selected ? '3px dashed #6366f1' : undefined, outlineOffset: 4 }}>
      <div style={{ minHeight: 58, padding: '10px 6px', display: 'grid', placeItems: 'center', border: `2px dashed ${color}`, borderRadius: 9, background: '#fff9ed', fontSize: 22, fontWeight: 750, overflowWrap: 'anywhere' }}>
        <Handle id="l" type="source" position={Position.Left} /><Handle id="r" type="source" position={Position.Right} />
        {text || <span style={{ fontSize: 11 }}>항목 없음</span>}
      </div>
      {d.caption && <div style={{ marginTop: 5, fontSize: 11, fontWeight: 600, overflowWrap: 'anywhere' }}>{d.caption}</div>}
    </div>
  </CheckpointStatusRing>;

  const border =
    variant === 'dashed-box' ? `1.5px dashed ${color}` :
    variant === 'pill'       ? `1.5px solid ${color}` :
    'none';

  const borderRadius =
    variant === 'pill'       ? 9999 :
    variant === 'dashed-box' ? 4    : 0;

  const padding = variant === 'plain' || variant === 'status' ? '2px 4px' : '4px 12px';

  return (
    <CheckpointStatusRing status={status}>
      <div style={{
        padding, borderRadius, border,
        backgroundColor: 'white',
        boxShadow: selected ? `0 0 0 3px ${color}40` : undefined,
        cursor: 'grab', userSelect: 'none',
        display: 'inline-flex', alignItems: 'center',
      }}>
        <Handle id="l" type="source" position={Position.Left}  style={{ background: color, border: 'none' }} />
        <Handle id="r" type="source" position={Position.Right} style={{ background: color, border: 'none' }} />
        <span style={{ fontSize: variant === 'status' ? 15 : 12, fontWeight: 600, color, whiteSpace: variant === 'status' ? 'pre-wrap' : 'nowrap', maxWidth: variant === 'status' ? 160 : undefined, overflowWrap: 'anywhere' }}>{text}</span>
      </div>
    </CheckpointStatusRing>
  );
}
