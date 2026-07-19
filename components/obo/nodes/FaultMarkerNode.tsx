'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';

interface FaultMarkerNodeData {
  label: string;
  markers?: ('fault' | 'hit')[];
  faultColor?: string;
  hitColor?: string;
}

export function FaultMarkerNode({ data, selected }: NodeProps) {
  const d = data as unknown as FaultMarkerNodeData;
  const markers = d.markers ?? [];
  const faultColor = d.faultColor ?? '#E24B4A';
  const hitColor = d.hitColor ?? '#1D9E75';
  return (
    <div style={{
      display: 'inline-flex', flexDirection: 'column', gap: 4, padding: 6,
      border: '1px solid #e2e8f0', borderRadius: 6, backgroundColor: 'white',
      boxShadow: selected ? '0 0 0 3px #33415530' : '0 1px 4px rgba(0,0,0,0.06)',
      cursor: 'grab', userSelect: 'none',
    }}>
      <Handle id="l" type="target" position={Position.Left}  style={{ background: '#94a3b8', border: 'none' }} />
      <Handle id="r" type="source" position={Position.Right} style={{ background: '#94a3b8', border: 'none' }} />
      {d.label && <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b' }}>{d.label}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {markers.map((m, i) => (
          <div key={i} style={{
            width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
            backgroundColor: m === 'fault' ? faultColor : 'white',
            border: `2px solid ${m === 'fault' ? faultColor : hitColor}`,
          }} />
        ))}
      </div>
    </div>
  );
}