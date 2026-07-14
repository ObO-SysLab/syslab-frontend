'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';

interface GanttBlock {
  label: string;
  start: number;
  end: number;
  color?: string;
}

interface GanttLaneData {
  label?: string;
  mode?: 'block' | 'step';
  axisMax?: number;
  blocks?: GanttBlock[];
}

const SCALE = 20; // px per time unit
const DEFAULT_COLOR = '#1D9E75';

function BlockMode({ d, selected }: { d: GanttLaneData; selected: boolean }) {
  const axisMax = d.axisMax ?? 8;
  const blocks = d.blocks ?? [];
  const totalW = axisMax * SCALE;
  const color = DEFAULT_COLOR;

  // Unique tick values from block boundaries
  const ticks = [...new Set([0, ...blocks.flatMap(b => [b.start, b.end]), axisMax])].sort((a, b) => a - b);

  return (
    <div style={{
      display: 'inline-flex', flexDirection: 'column', gap: 0,
      boxShadow: selected ? `0 0 0 3px ${color}40` : undefined,
      cursor: 'grab', userSelect: 'none',
    }}>
      <Handle id="t" type="source" position={Position.Top}    style={{ background: color, border: 'none' }} />
      <Handle id="b" type="source" position={Position.Bottom} style={{ background: color, border: 'none' }} />
      {d.label && (
        <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', marginBottom: 3 }}>{d.label}</div>
      )}
      {/* Timeline track */}
      <div style={{ position: 'relative', width: totalW, height: 36, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4 }}>
        {blocks.map((b, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: b.start * SCALE,
            width: (b.end - b.start) * SCALE,
            height: '100%',
            backgroundColor: (b.color ?? DEFAULT_COLOR) + '30',
            border: `1.5px solid ${b.color ?? DEFAULT_COLOR}`,
            borderRadius: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: b.color ?? DEFAULT_COLOR }}>{b.label}</span>
          </div>
        ))}
      </div>
      {/* Axis */}
      <div style={{ position: 'relative', width: totalW, height: 14 }}>
        {ticks.map(t => (
          <span key={t} style={{
            position: 'absolute', left: t * SCALE - 4,
            fontSize: 8, color: '#94a3b8',
          }}>{t}</span>
        ))}
      </div>
    </div>
  );
}

function StepMode({ d, selected }: { d: GanttLaneData; selected: boolean }) {
  const blocks = d.blocks ?? [];
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center',
      boxShadow: selected ? '0 0 0 3px #33415540' : undefined,
      cursor: 'grab', userSelect: 'none',
    }}>
      <Handle id="l" type="source" position={Position.Left}  style={{ background: '#94a3b8', border: 'none' }} />
      <Handle id="r" type="source" position={Position.Right} style={{ background: '#94a3b8', border: 'none' }} />
      {blocks.map((b, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            padding: '6px 10px',
            border: `1.5px solid ${b.color ?? '#6366f1'}`,
            borderRadius: 4, backgroundColor: 'white',
            fontSize: 11, fontWeight: 600, color: b.color ?? '#6366f1',
            whiteSpace: 'nowrap' as const,
          }}>
            {b.label}
          </div>
          {i < blocks.length - 1 && (
            <div style={{ width: 20, textAlign: 'center', color: '#94a3b8', fontSize: 12, flexShrink: 0 }}>→</div>
          )}
        </div>
      ))}
    </div>
  );
}

export function GanttLane({ data, selected }: NodeProps) {
  const d = (data as unknown) as GanttLaneData;
  return d.mode === 'step'
    ? <StepMode d={d} selected={selected ?? false} />
    : <BlockMode d={d} selected={selected ?? false} />;
}