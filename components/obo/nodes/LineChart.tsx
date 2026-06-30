'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';

interface ChartSeries {
  name: string;
  points: { x: number; y: number }[];
  color: string;
}

interface LineChartData {
  label?: string;
  xLabel?: string;
  yLabel?: string;
  series?: ChartSeries[];
}

const W = 180;
const H = 120;
const PAD = { l: 20, r: 12, t: 10, b: 24 };
const LEGEND_H = 14;

export function LineChart({ data, selected }: NodeProps) {
  const d = (data as unknown) as LineChartData;
  const series = d.series ?? [];

  const allPts = series.flatMap(s => s.points);
  const minX = allPts.length ? Math.min(...allPts.map(p => p.x)) : 0;
  const maxX = allPts.length ? Math.max(...allPts.map(p => p.x)) : 1;
  const minY = allPts.length ? Math.min(...allPts.map(p => p.y)) : 0;
  const maxY = allPts.length ? Math.max(...allPts.map(p => p.y)) : 1;
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const iW = W - PAD.l - PAD.r;
  const iH = H - PAD.t - PAD.b;

  const toX = (x: number) => ((x - minX) / rangeX) * iW + PAD.l;
  const toY = (y: number) => iH - ((y - minY) / rangeY) * iH + PAD.t;

  const totalH = H + (series.length > 1 ? LEGEND_H : 0);

  return (
    <div style={{
      background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 6, padding: 4,
      boxShadow: selected ? '0 0 0 3px rgba(99,102,241,0.25)' : '0 2px 6px rgba(0,0,0,0.06)',
      cursor: 'grab', userSelect: 'none',
    }}>
      <Handle id="t" type="source" position={Position.Top}   style={{ background: '#1D9E75', border: 'none' }} />
      <Handle id="l" type="source" position={Position.Left}  style={{ background: '#1D9E75', border: 'none' }} />
      {d.label && (
        <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', paddingBottom: 2 }}>{d.label}</div>
      )}
      <svg width={W} height={totalH}>
        {/* Axes */}
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b} stroke="#e2e8f0" strokeWidth={1} />
        <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke="#e2e8f0" strokeWidth={1} />
        {/* Axis labels */}
        {d.yLabel && (
          <text x={PAD.l - 2} y={PAD.t - 2} fontSize={8} fill="#94a3b8" textAnchor="middle">{d.yLabel}</text>
        )}
        {d.xLabel && (
          <text x={W - PAD.r} y={H - PAD.b + 10} fontSize={8} fill="#94a3b8" textAnchor="end">{d.xLabel}</text>
        )}
        {/* Y axis min/max labels */}
        {allPts.length > 0 && (
          <>
            <text x={PAD.l - 3} y={PAD.t + 4} fontSize={8} fill="#94a3b8" textAnchor="end">{maxY}</text>
            <text x={PAD.l - 3} y={H - PAD.b} fontSize={8} fill="#94a3b8" textAnchor="end">{minY}</text>
          </>
        )}
        {/* Series lines */}
        {series.map((s, si) => {
          if (s.points.length < 2) return null;
          const pts = s.points.map(p => `${toX(p.x)},${toY(p.y)}`).join(' ');
          return (
            <polyline key={si} points={pts} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" />
          );
        })}
        {/* Legend (multi-series only) */}
        {series.length > 1 && series.map((s, si) => (
          <g key={si}>
            <line x1={PAD.l + si * 60} y1={H + 8} x2={PAD.l + si * 60 + 12} y2={H + 8} stroke={s.color} strokeWidth={2} />
            <text x={PAD.l + si * 60 + 15} y={H + 11} fontSize={8} fill="#64748b">{s.name}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}