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

// Choose a readable foreground even for a light author-selected fill.
function foreground(fill: string) {
  const match = /^#([0-9a-f]{6})$/i.exec(fill);
  if (!match) return '#0f172a';
  const channels = [0, 2, 4].map(i => {
    const c = parseInt(match[1].slice(i, i + 2), 16) / 255;
    return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
  });
  const luminance = .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
  return luminance > .179 ? '#0f172a' : '#ffffff';
}

export function StateNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as StateNodeData;
  const color = d.fill ?? '#6366f1';
  const { previewFrame, checkpointStatus } = useFrameCtx();
  const active = !!d.highlight || !!previewFrame?.highlightNodes.includes(id);
  const isBox = d.shape === 'box';
  const hs = { width: 7, height: 7, background: color, border: '1px solid white' };

  return (
    <CheckpointStatusRing status={checkpointStatus?.[id]}>
      <div
        data-obo-state={active ? 'highlighted' : 'idle'}
        style={{
          position: 'relative', boxSizing: 'border-box',
          width: isBox ? undefined : 112, height: isBox ? undefined : 112,
          minWidth: 112, minHeight: isBox ? 72 : 112, maxWidth: isBox ? 240 : 112,
          padding: isBox ? '16px 20px' : '10px', borderRadius: isBox ? 12 : '50%',
          border: `${active ? 3.5 : 2}px solid ${active ? color : '#94a3b8'}`,
          backgroundColor: active ? color : '#ffffff',
          color: active ? foreground(color) : '#334155',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          // Editing selection is an outer outline; scene emphasis is the fill and border.
          outline: selected ? '3px dashed #6366f1' : 'none', outlineOffset: 5,
          boxShadow: active ? '0 3px 10px rgba(15,23,42,.12)' : '0 1px 4px rgba(15,23,42,.06)',
          userSelect: 'none', cursor: 'inherit',
          transition: 'background-color 250ms ease, color 250ms ease, border-color 250ms ease, border-width 250ms ease',
        }}
      >
        <Handle id="t" type="source" position={Position.Top} style={hs} />
        <Handle id="r" type="source" position={Position.Right} style={hs} />
        <Handle id="b" type="source" position={Position.Bottom} style={hs} />
        <Handle id="l" type="source" position={Position.Left} style={hs} />
        <span style={{ fontSize: 14, fontWeight: 800, textAlign: 'center', lineHeight: 1.45, overflowWrap: 'anywhere', minWidth: 0 }}>
          {d.label}
        </span>
      </div>
    </CheckpointStatusRing>
  );
}
