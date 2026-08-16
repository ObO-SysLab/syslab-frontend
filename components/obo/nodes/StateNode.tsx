'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useFrameCtx } from '../FrameContext';
import { CheckpointStatusRing } from './CheckpointStatusRing';

interface StateNodeData {
  label: string;
  shape: 'circle' | 'box';
  highlight?: boolean;
  fill?: string;
}

const HS = { width: 8, height: 8, border: 'none' } as const;
const IDLE_BORDER = '#cbd5e1';
const IDLE_TEXT = '#475569';

export function StateNode({ id, data, selected }: NodeProps) {
  const d = (data as unknown) as StateNodeData;
  const color = d.fill ?? '#6366f1';
  const isHighlit = d.highlight ?? false;
  const hs = { ...HS, background: color };

  const { previewFrame, checkpointStatus } = useFrameCtx();
  const frameHighlighted = previewFrame?.highlightNodes.includes(id) ?? false;
  const frameDimmed = previewFrame !== null && !frameHighlighted;
  const active = isHighlit || frameHighlighted;
  const status = checkpointStatus?.[id] ?? null;

  const handles = (
    <>
      <Handle id="t" type="source" position={Position.Top}    style={hs} />
      <Handle id="r" type="source" position={Position.Right}  style={hs} />
      <Handle id="b" type="source" position={Position.Bottom} style={hs} />
      <Handle id="l" type="source" position={Position.Left}   style={hs} />
    </>
  );

  // 데모(app/challenges/obo/page.tsx)와 동일하게: 평소엔 무채색, 활성(하이라이트)일 때만 자기 색으로 채워진다.
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 900,
    color: active ? 'white' : IDLE_TEXT,
    textAlign: 'center', lineHeight: 1.3, wordBreak: 'break-word',
  };

  const boxShadow = selected
    ? `0 0 0 3px ${color}40`
    : '0 2px 8px rgba(15,23,42,0.08)';
  const opacity = frameDimmed ? 0.3 : 1;

  if (d.shape !== 'box') {
    return (
      <CheckpointStatusRing status={status}>
        <div style={{ position: 'relative', width: 80, height: 80 }}>
          {frameHighlighted && (
            <div
              className="absolute inset-0 -m-3 rounded-full border-2 border-dashed animate-[spin_6s_linear_infinite] opacity-50 pointer-events-none"
              style={{ borderColor: color, transformOrigin: '50% 50%' }}
            />
          )}
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            border: `2.5px solid ${active ? color : IDLE_BORDER}`,
            backgroundColor: active ? color : 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow, opacity,
            userSelect: 'none', cursor: 'grab',
            transition: 'background-color 300ms, border-color 300ms, box-shadow 300ms',
          }}>
            {handles}
            <span style={{
              ...labelStyle,
              maxWidth: 64, padding: '0 8px',
            }}>{d.label}</span>
          </div>
        </div>
      </CheckpointStatusRing>
    );
  }

  return (
    <CheckpointStatusRing status={status}>
      <div style={{ position: 'relative' }}>
        {frameHighlighted && (
          <svg
            className="absolute pointer-events-none"
            style={{ inset: -6, width: 'calc(100% + 12px)', height: 'calc(100% + 12px)', opacity: 0.55, overflow: 'visible' }}
          >
            <rect
              x="0" y="0" width="100%" height="100%" rx="12" ry="12"
              fill="none" stroke={color} strokeWidth="2"
              strokeDasharray="8 8"
              style={{ animation: 'obo-march 0.6s linear infinite' }}
            />
          </svg>
        )}
        <div style={{
          padding: '14px 16px', borderRadius: 8, minWidth: 80,
          border: `2px solid ${active ? color : IDLE_BORDER}`,
          backgroundColor: active ? color : 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow, opacity,
          userSelect: 'none', cursor: 'grab',
          transition: 'background-color 300ms, border-color 300ms, box-shadow 300ms',
        }}>
          {handles}
          <span style={{
            ...labelStyle, fontSize: 13, whiteSpace: 'nowrap',
          }}>{d.label}</span>
        </div>
      </div>
    </CheckpointStatusRing>
  );
}