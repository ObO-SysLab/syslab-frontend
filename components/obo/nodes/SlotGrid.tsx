'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useFrameCtx } from '../FrameContext';
import { CheckpointStatusRing } from './CheckpointStatusRing';

interface SlotGridData {
  slotCount?: number;
  slots?: (number | null)[];
  faultSlotIndex?: number | null;
  hitSlotIndex?: number | null;
}

const FAULT_COLOR = '#E24B4A';
const HIT_COLOR = '#1D9E75';
const IDLE_COLOR = '#6366f1';
const CELL_W = 40;
const CELL_H = 40;

export function SlotGrid({ id, data, selected }: NodeProps) {
  const d = (data as unknown) as SlotGridData;
  const slotCount = d.slotCount ?? (d.slots?.length ?? 0);
  const slots = d.slots ?? [];
  const faultSlotIndex = d.faultSlotIndex ?? null;
  const hitSlotIndex = d.hitSlotIndex ?? null;
  const hs = { background: IDLE_COLOR, border: 'none' };
  const { checkpointStatus } = useFrameCtx();
  const status = checkpointStatus?.[id] ?? null;

  return (
    <CheckpointStatusRing status={status}>
      <div style={{
        display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        cursor: 'grab', userSelect: 'none', position: 'relative',
      }}>
        <Handle id="t" type="source" position={Position.Top}    style={hs} />
        <Handle id="b" type="source" position={Position.Bottom} style={hs} />
        <Handle id="l" type="source" position={Position.Left}   style={hs} />
        <Handle id="r" type="source" position={Position.Right}  style={hs} />

        <div style={{
          display: 'flex', alignItems: 'center',
          borderRadius: 10, overflow: 'hidden',
          boxShadow: selected ? `0 0 0 3px ${IDLE_COLOR}40` : '0 1px 4px rgba(15,23,42,0.06)',
        }}>
          {Array.from({ length: slotCount }).map((_, i) => {
            const value = slots[i] ?? null;
            const isFault = i === faultSlotIndex;
            const isHit = i === hitSlotIndex;
            const active = isFault || isHit;
            const accent = isFault ? FAULT_COLOR : isHit ? HIT_COLOR : '#cbd5e1';
            return (
              <div key={i} style={{ position: 'relative', width: CELL_W, height: CELL_H }}>
                {active && (
                  <span style={{
                    position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)',
                    fontSize: 9, fontWeight: 800, letterSpacing: 0.3,
                    color: 'white', background: accent,
                    borderRadius: 999, padding: '1.5px 6px', whiteSpace: 'nowrap',
                  }}>
                    {isFault ? 'FAULT' : 'HIT'}
                  </span>
                )}
                <div style={{
                  width: CELL_W, height: CELL_H,
                  borderLeft: i === 0 ? `2px solid ${accent}` : `1px solid ${accent}`,
                  borderTop: `2px solid ${accent}`, borderBottom: `2px solid ${accent}`,
                  borderRight: i === slotCount - 1 ? `2px solid ${accent}` : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: active ? 800 : 600,
                  color: isFault ? FAULT_COLOR : isHit ? HIT_COLOR : '#334155',
                  backgroundColor: isFault ? FAULT_COLOR + '18' : isHit ? HIT_COLOR + '14' : 'white',
                  transition: 'background-color 200ms, border-color 200ms',
                }}>
                  {value ?? '·'}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex' }}>
          {Array.from({ length: slotCount }).map((_, i) => (
            <div key={i} style={{ width: CELL_W, textAlign: 'center', fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>
              {i}
            </div>
          ))}
        </div>
      </div>
    </CheckpointStatusRing>
  );
}
