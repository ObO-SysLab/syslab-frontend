'use client';
import { Handle, Position, type NodeProps } from '@xyflow/react';
interface Point { x: number; y: number; }
interface Series { name: string; points: Point[]; color: string; }
interface ChartData { label?: string; xLabel?: string; yLabel?: string; series?: Series[]; width?: number; height?: number; xMin?: number; xMax?: number; yMin?: number; yMax?: number; xTicks?: number[]; yTicks?: number[]; progressIndex?: number; activePointIndex?: number; }
export function LineChart({ id, data, selected }: NodeProps) {
  const d = data as unknown as ChartData;
  const series = Array.isArray(d.series) ? d.series : [];
  const points = series.flatMap(s => Array.isArray(s?.points) ? s.points : []);
  const valid = series.every(s => s && Array.isArray(s.points)) && points.every(p => p && Number.isFinite(p.x) && Number.isFinite(p.y));
  const W = Math.max(240, Math.min(1000, d.width || 300)), H = Math.max(160, Math.min(600, d.height || 190));
  const pad = { l: 52, r: 28, t: 28, b: 50 };
  const minX = d.xMin ?? (points.length && valid ? Math.min(...points.map(p => p.x)) : 0);
  const maxX = d.xMax ?? Math.max(minX + 1, ...(valid ? points.map(p => p.x) : []));
  const minY = d.yMin ?? (points.length && valid ? Math.min(...points.map(p => p.y)) : 0);
  const maxY = d.yMax ?? Math.max(minY + 1, ...(valid ? points.map(p => p.y) : []));
  const axesValid = [minX,maxX,minY,maxY].every(Number.isFinite) && maxX > minX && maxY > minY;
  const x = (n: number) => pad.l + (n - minX) / (maxX - minX) * (W - pad.l - pad.r);
  const y = (n: number) => H - pad.b - (n - minY) / (maxY - minY) * (H - pad.t - pad.b);
  const inRange = valid && points.every(p => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY);
  return <div data-chart={id} style={{ width: W, padding: 12, background: 'white', border: '2px solid #cbd5e1', borderRadius: 12, outline: selected ? '3px dashed #6366f1' : undefined }}>
    <Handle id="t" type="source" position={Position.Top} /><Handle id="l" type="source" position={Position.Left} />
    <div style={{ fontSize: 15, fontWeight: 800, color: '#334155' }}>{d.label}</div>
    {!valid || !axesValid || !inRange ? <p role="alert">그래프의 좌표와 축 범위를 확인하세요.</p> : <>
      <svg width={W} height={H} role="img" aria-label={d.label || '꺾은선 그래프'}>
        {(d.yTicks ?? [minY,maxY]).filter(n => Number.isFinite(n) && n >= minY && n <= maxY).map((n, i) => <g key={i}><line x1={pad.l} y1={y(n)} x2={W - pad.r} y2={y(n)} stroke="#e2e8f0" /><text x={pad.l - 9} y={y(n) + 4} textAnchor="end" fontSize={12} fill="#64748b">{n}</text></g>)}
        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={H-pad.b} stroke="#94a3b8" />
        <line x1={pad.l} y1={H-pad.b} x2={W-pad.r} y2={H-pad.b} stroke="#94a3b8" />
        {(d.xTicks ?? [minX,maxX]).filter(n => Number.isFinite(n) && n >= minX && n <= maxX).map((n, i) => <text key={i} x={x(n)} y={H-pad.b+21} textAnchor="middle" fontSize={12} fill="#64748b">{n}</text>)}
        <text x={pad.l} y={14} fontSize={12} fill="#475569">{d.yLabel}</text><text x={W-pad.r} y={H-5} textAnchor="end" fontSize={12} fill="#475569">{d.xLabel}</text>
        {series.map((s, si) => {
          const count = d.progressIndex === undefined ? s.points.length : Math.max(0, Math.min(s.points.length, Math.floor(d.progressIndex) + 1));
          const shown = s.points.slice(0, count);
          return <g key={si}>
            <polyline data-chart-path={si} points={shown.map(p => `${x(p.x)},${y(p.y)}`).join(' ')} fill="none" stroke={s.color || '#0f766e'} strokeWidth={3} strokeLinejoin="round" />
            {shown.map((p, i) => <g key={i}>
              {i > 0 && i === d.activePointIndex && <line x1={x(shown[i-1].x)} y1={y(shown[i-1].y)} x2={x(p.x)} y2={y(p.y)} stroke="#d97706" strokeWidth={4} />}
              <circle data-chart-point={i} data-value={p.y} cx={x(p.x)} cy={y(p.y)} r={i === d.activePointIndex ? 7 : 5} fill={i === d.activePointIndex ? '#d97706' : s.color || '#0f766e'} stroke="white" strokeWidth={2} />
              {W >= 400 && <text x={x(p.x) + (p.x === minX ? 10 : p.x === maxX ? -10 : 0)} y={y(p.y)-12} textAnchor={p.x === minX ? 'start' : p.x === maxX ? 'end' : 'middle'} fontSize={13} fontWeight={700} fill="#334155">{p.y}</text>}
            </g>)}
          </g>;
        })}
      </svg>
      {!points.length && <p style={{ color: '#64748b', fontSize: 13 }}>아직 좌표가 없습니다.</p>}
      {series.length > 1 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12 }}>{series.map((s, i) => <span key={i} style={{ color: s.color }}>{s.name}</span>)}</div>}
    </>}
  </div>;
}
