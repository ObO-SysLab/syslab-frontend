'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useFrameCtx } from '../FrameContext';

interface StateNodeData {
  label: string;
  shape: 'circle' | 'box';
  highlight?: boolean;
  fill?: string;
}

const HS = { width: 8, height: 8, border: 'none' } as const;

export function StateNode({ id, data, selected }: NodeProps) {
  const d = (data as unknown) as StateNodeData;
  const color = d.fill ?? '#6366f1';
  const isHighlit = d.highlight ?? false;
  const hs = { ...HS, background: color };

  const { previewFrame } = useFrameCtx();
  const frameHighlighted = previewFrame?.highlightNodes.includes(id) ?? false;
  const frameDimmed = previewFrame !== null && !frameHighlighted;

  const handles = (
    <>
      <Handle id="t" type="source" position={Position.Top}    style={hs} />
      <Handle id="r" type="source" position={Position.Right}  style={hs} />
      <Handle id="b" type="source" position={Position.Bottom} style={hs} />
      <Handle id="l" type="source" position={Position.Left}   style={hs} />
    </>
  );

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700,
    color: isHighlit ? 'white' : color,
    textAlign: 'center', lineHeight: 1.3, wordBreak: 'break-word',
  };

  const frameRing = frameHighlighted ? `0 0 0 3px #f59e0b` : null;
  const baseShadow = selected ? `0 0 0 3px ${color}40` : '0 2px 6px rgba(0,0,0,0.08)';
  const boxShadow = frameRing ?? baseShadow;
  const opacity = frameDimmed ? 0.3 : 1;

  if (d.shape !== 'box') {
    return (
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        border: `2px solid ${color}`,
        backgroundColor: isHighlit || frameHighlighted ? color : 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow, opacity,
        userSelect: 'none', cursor: 'grab',
      }}>
        {handles}
        <span style={{
          ...labelStyle,
          maxWidth: 64, padding: '0 8px',
          color: isHighlit || frameHighlighted ? 'white' : color,
        }}>{d.label}</span>
      </div>
    );
  }

  return (
    <div style={{
      padding: '8px 16px', borderRadius: 6, minWidth: 80,
      border: `2px solid ${color}`,
      backgroundColor: isHighlit || frameHighlighted ? color : 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow, opacity,
      userSelect: 'none', cursor: 'grab',
    }}>
      {handles}
      <span style={{
        ...labelStyle, fontSize: 13, whiteSpace: 'nowrap',
        color: isHighlit || frameHighlighted ? 'white' : color,
      }}>{d.label}</span>
    </div>
  );
}
