'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';

interface TimelineStep {
  label: string;
  subLabel?: string;
  color?: string;
}

interface TimelineStepNodeData {
  label: string;
  steps?: TimelineStep[];
  overhead?: string;
}

export function TimelineStepNode({ data, selected }: NodeProps) {
  const d = data as TimelineStepNodeData;
  const steps = d.steps ?? [{ label: 'Step 1' }];
  const mainColor = '#334155';
  const hs = { background: mainColor, border: 'none' };
  return (
    <div style={{
      cursor: 'grab', userSelect: 'none',
      boxShadow: selected ? '0 0 0 3px #33415540' : undefined,
    }}>
      <Handle id="l" type="target" position={Position.Left}  style={hs} />
      <Handle id="r" type="source" position={Position.Right} style={hs} />
      {d.overhead && (
        <div style={{ textAlign: 'center', fontSize: 10, color: '#ef4444', marginBottom: 2, fontWeight: 600 }}>
          ▲ {d.overhead}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {steps.map((step, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              padding: '6px 10px',
              border: `1.5px solid ${step.color ?? mainColor}`,
              borderRadius: 4, backgroundColor: 'white',
              fontSize: 11, fontWeight: 600,
              color: step.color ?? mainColor,
              whiteSpace: 'nowrap' as const,
            }}>
              {step.label}
              {step.subLabel && (
                <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 400 }}>{step.subLabel}</div>
              )}
            </div>
            {i < steps.length - 1 && (
              <div style={{ width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 12 }}>
                →
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}