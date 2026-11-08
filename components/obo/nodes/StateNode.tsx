'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useFrameCtx } from '../FrameContext';
import { CheckpointStatusRing } from './CheckpointStatusRing';

interface StateNodeData {
  label: string;
  shape: 'circle' | 'box';
  highlight?: boolean;
  fill?: string;
  /** Authored mark for something removed in this scene (e.g. a deleted file name): dashed, struck through, never filled. */
  removed?: boolean;
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
  const removed = d.removed === true;
  // A removed element may still be the scene's subject: emphasise its outline only, so it does not read as the active item.
  const filled = active && !removed;
  const hs = { width: 7, height: 7, background: color, border: '1px solid white' };

  return (
    <CheckpointStatusRing status={checkpointStatus?.[id]}>
      <div
        data-obo-state={active ? 'highlighted' : 'idle'} data-removed={removed || undefined}
        style={{
          position: 'relative', boxSizing: 'border-box',
          width: isBox ? undefined : 112, height: isBox ? undefined : 112,
          minWidth: 112, minHeight: isBox ? 72 : 112, maxWidth: isBox ? 240 : 112,
          padding: isBox ? '16px 20px' : '10px', borderRadius: isBox ? 12 : '50%',
          border: `${active ? 3.5 : 2}px ${removed ? 'dashed' : 'solid'} ${active ? color : '#94a3b8'}`,
          backgroundColor: filled ? color : removed ? '#f8fafc' : '#ffffff',
          color: filled ? foreground(color) : removed ? '#64748b' : '#334155',
          flexDirection: 'column', gap: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          // Editing selection is an outer outline; scene emphasis is the fill and border.
          outline: selected ? '3px dashed #6366f1' : 'none', outlineOffset: 5,
          boxShadow: filled ? '0 3px 10px rgba(15,23,42,.12)' : '0 1px 4px rgba(15,23,42,.06)',
          userSelect: 'none', cursor: 'inherit',
          transition: 'background-color 250ms ease, color 250ms ease, border-color 250ms ease, border-width 250ms ease',
        }}
      >
        <Handle id="t" type="source" position={Position.Top} style={hs} />
        <Handle id="r" type="source" position={Position.Right} style={hs} />
        <Handle id="b" type="source" position={Position.Bottom} style={hs} />
        <Handle id="l" type="source" position={Position.Left} style={hs} />
        <span style={{ fontSize: 14, fontWeight: 800, textAlign: 'center', lineHeight: 1.45, overflowWrap: 'anywhere', minWidth: 0, textDecoration: removed ? 'line-through' : undefined }}>
          {d.label}
        </span>
        {removed && <span data-removed-tag style={{ fontSize: 11, fontWeight: 700, color: active ? color : '#64748b' }}>삭제됨</span>}
      </div>
    </CheckpointStatusRing>
  );
}
