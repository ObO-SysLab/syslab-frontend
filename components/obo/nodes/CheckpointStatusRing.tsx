'use client';

import type { ReactNode } from 'react';

const COLORS = { correct: '#1D9E75', incorrect: '#E24B4A' } as const;

interface CheckpointStatusRingProps {
  status: 'correct' | 'incorrect' | null | undefined;
  children: ReactNode;
}

export function CheckpointStatusRing({ status, children }: CheckpointStatusRingProps) {
  if (!status) return <>{children}</>;

  const color = COLORS[status];

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <div
        style={{
          position: 'absolute',
          inset: -4,
          borderRadius: 12,
          border: `2.5px solid ${color}`,
          boxShadow: `0 0 0 3px ${color}30`,
          pointerEvents: 'none',
        }}
      />
      {children}
      <span
        style={{
          position: 'absolute',
          top: -8,
          right: -8,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: color,
          color: 'white',
          fontSize: 10,
          fontWeight: 900,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1,
        }}
      >
        {status === 'correct' ? '✓' : '✗'}
      </span>
    </div>
  );
}
