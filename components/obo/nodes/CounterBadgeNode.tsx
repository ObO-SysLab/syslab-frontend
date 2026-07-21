'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useFrameCtx } from '../FrameContext';
import { CheckpointStatusRing } from './CheckpointStatusRing';

interface CounterBadgeData {
  label?: string;
  min?: number;
  max?: number;
  value?: number;
  delta?: number | null;
}

const COLOR = '#b45309';

export function CounterBadgeNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as CounterBadgeData;
  const value = d.value ?? 0;
  const delta = d.delta ?? null;
  const { checkpointStatus } = useFrameCtx();
  const status = checkpointStatus?.[id] ?? null;

  return (
    <CheckpointStatusRing status={status}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '4px 10px', borderRadius: 9999,
        border: `1.5px solid ${COLOR}`, backgroundColor: 'white',
        boxShadow: selected ? `0 0 0 3px ${COLOR}40` : '0 1px 4px rgba(0,0,0,0.08)',
        cursor: 'grab', userSelect: 'none',
      }}>
        <Handle id="l" type="target" position={Position.Left}  style={{ background: COLOR, border: 'none' }} />
        <Handle id="r" type="source" position={Position.Right} style={{ background: COLOR, border: 'none' }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: COLOR }}>{d.label ?? ''}</span>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>=</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: COLOR }}>{value}</span>
        {delta != null && (
          <span style={{ fontSize: 10, fontWeight: 700, color: delta > 0 ? '#1D9E75' : '#E24B4A' }}>
            {delta > 0 ? `+${delta}` : delta}
          </span>
        )}
      </div>
    </CheckpointStatusRing>
  );
}
