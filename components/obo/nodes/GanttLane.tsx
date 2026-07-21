'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { TIMELINE_COLOR_PALETTE, DEFAULT_TIMELINE_COLOR_KEY } from './ganttColors';
import { useFrameCtx } from '../FrameContext';
import { CheckpointStatusRing } from './CheckpointStatusRing';

interface TimelineBlock {
  start: number;
  end: number;
  colorKey: string;
}

interface TimelineBlockData {
  trackId?: string;
  blocks?: TimelineBlock[];
  activeBlockIndex?: number | null;
}

const SCALE = 26; // px per time unit
const TRACK_H = 40;

function colorFor(colorKey: string): string {
  return TIMELINE_COLOR_PALETTE[colorKey] ?? TIMELINE_COLOR_PALETTE[DEFAULT_TIMELINE_COLOR_KEY];
}

export function GanttLane({ id, data, selected }: NodeProps) {
  const d = (data as unknown) as TimelineBlockData;
  const blocks = d.blocks ?? [];
  const activeBlockIndex = d.activeBlockIndex ?? null;
  const axisMax = Math.max(1, ...blocks.map(b => b.end), 1);
  const totalW = axisMax * SCALE;
  const trackColor = TIMELINE_COLOR_PALETTE[DEFAULT_TIMELINE_COLOR_KEY];
  const { checkpointStatus } = useFrameCtx();
  const status = checkpointStatus?.[id] ?? null;

  const ticks = [...new Set([0, ...blocks.flatMap(b => [b.start, b.end]), axisMax])].sort((a, b) => a - b);

  return (
    <CheckpointStatusRing status={status}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 10,
        cursor: 'grab', userSelect: 'none', position: 'relative',
      }}>
        <Handle id="t" type="source" position={Position.Top}    style={{ background: trackColor, border: 'none' }} />
        <Handle id="b" type="source" position={Position.Bottom} style={{ background: trackColor, border: 'none' }} />

        {d.trackId && (
          <div style={{
            fontSize: 11, fontWeight: 800, color: '#475569',
            background: '#f1f5f9', borderRadius: 8, padding: '5px 9px',
            minWidth: 28, textAlign: 'center', flexShrink: 0,
          }}>
            {d.trackId}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{
            position: 'relative', width: totalW, height: TRACK_H,
            backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
            boxShadow: selected ? `0 0 0 3px ${trackColor}40` : undefined,
          }}>
            {blocks.map((b, i) => {
              const color = colorFor(b.colorKey);
              const isActive = i === activeBlockIndex;
              return (
                <div key={i} style={{
                  position: 'absolute', top: 3, bottom: 3,
                  left: b.start * SCALE + (b.start === 0 ? 0 : 1),
                  width: (b.end - b.start) * SCALE - (b.start === 0 ? 1 : 2),
                }}>
                  {isActive && (
                    <div
                      className="absolute -inset-1.5 rounded-lg opacity-70 animate-pulse pointer-events-none"
                      style={{ boxShadow: `0 0 0 2.5px ${color}` }}
                    />
                  )}
                  <div style={{
                    position: 'absolute', inset: 0,
                    backgroundColor: color,
                    borderRadius: 5,
                    boxShadow: isActive ? `0 2px 6px ${color}80` : '0 1px 2px rgba(15,23,42,0.12)',
                  }} />
                </div>
              );
            })}
          </div>
          <div style={{ position: 'relative', width: totalW, height: 12 }}>
            {ticks.map(t => (
              <span key={t} style={{
                position: 'absolute', left: t * SCALE - 4,
                fontSize: 9, color: '#94a3b8', fontWeight: 600,
              }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </CheckpointStatusRing>
  );
}
