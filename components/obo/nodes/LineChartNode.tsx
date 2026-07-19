'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';

interface LineChartNodeData {
  label: string;
  points?: { x: number; y: number }[];
  anomalyIndex?: number;
  color?: string;
  width?: number;
  height?: number;
}

export function LineChartNode({ data, selected }: NodeProps) {
  const d = data as unknown as LineChartNodeData;
  const W = d.width ?? 160;
  const H = d.height ?? 100;
  const pts = d.points ?? [];
  const color = d.color ?? '#1D9E75';
  const pad = { l: 14, r: 8, t: 8, b: 16 };
  const iW = W - pad.l - pad.r;
  const iH = H - pad.t - pad.b;

  let polylinePoints = '';
  let anomalyCx = 0, anomalyCy = 0, showAnomaly = false;

  if (pts.length > 1) {
    const xs = pts.map(p => p.x);
    const ys = pts.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    const toX = (x: number) => ((x - minX) / rangeX) * iW + pad.l;
    const toY = (y: number) => iH - ((y - minY) / rangeY) * iH + pad.t;

    polylinePoints = pts.map(p => `${toX(p.x)},${toY(p.y)}`).join(' ');

    const ai = d.anomalyIndex;
    if (ai !== undefined && ai >= 0 && pts[ai]) {
      anomalyCx = toX(pts[ai].x);
      anomalyCy = toY(pts[ai].y);
      showAnomaly = true;
    }
  }

  return (
    <div style={{
      background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 6,
      boxShadow: selected ? `0 0 0 3px ${color}40` : '0 2px 6px rgba(0,0,0,0.06)',
      cursor: 'grab', userSelect: 'none', padding: 4,
    }}>
      <Handle id="t" type="source" position={Position.Top}   style={{ background: color, border: 'none' }} />
      <Handle id="l" type="target" position={Position.Left}  style={{ background: color, border: 'none' }} />
      {d.label && (
        <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', paddingBottom: 2 }}>{d.label}</div>
      )}
      <svg width={W} height={H}>
        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={H - pad.b} stroke="#e2e8f0" strokeWidth={1} />
        <line x1={pad.l} y1={H - pad.b} x2={W - pad.r} y2={H - pad.b} stroke="#e2e8f0" strokeWidth={1} />
        {polylinePoints && (
          <polyline points={polylinePoints} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
        )}
        {showAnomaly && (
          <circle cx={anomalyCx} cy={anomalyCy} r={5} fill="#ef4444" />
        )}
      </svg>
    </div>
  );
}