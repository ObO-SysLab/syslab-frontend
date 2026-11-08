'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useFrameCtx } from '../FrameContext';
import { CheckpointStatusRing } from './CheckpointStatusRing';
import styles from './SemaphoreDisplay.module.css';

interface CounterBadgeData {
  label?: string;
  min?: number;
  max?: number;
  value?: number;
  delta?: number | null;
  displayStyle?: 'badge' | 'semaphore';
  caption?: string;
  showTokens?: boolean;
  showInPlayback?: boolean;
}

const COLOR = '#b45309';

export function CounterBadgeNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as CounterBadgeData;
  const value = d.value ?? 0;
  const delta = d.delta ?? null;
  const { checkpointStatus } = useFrameCtx();
  const status = checkpointStatus?.[id] ?? null;

  if (d.displayStyle === 'semaphore') {
    const valid = Number.isSafeInteger(value) && value >= 0;
    return <CheckpointStatusRing status={status}>
      <section data-semaphore={id} data-available={valid && value > 0} className={styles.semaphore}
        style={{ outline: selected ? '3px dashed #6366f1' : undefined, outlineOffset: 4 }}>
        <Handle id="l" type="target" position={Position.Left} /><Handle id="r" type="source" position={Position.Right} />
        <div className={styles.heading}><strong>{d.caption || '세마포어'}</strong><code>{d.label}</code></div>
        <div className={styles.quantity}><strong data-semaphore-value>{value}</strong><span>회 허용</span>{delta != null && <small>{delta > 0 ? '+' : ''}{delta}</small>}</div>
        {valid && d.showTokens !== false && <div className={styles.tokens} aria-label={`허용 토큰 ${value}개`}>
          {Array.from({ length: Math.min(value, 8) }, (_, i) => <span key={i} className={styles.token} aria-hidden="true" />)}
          {value > 8 && <small>+{value - 8}</small>}{value === 0 && <small>허용 없음</small>}
        </div>}
        {!valid && <p role="alert" className={styles.error}>허용 횟수는 0 이상의 정수로 표시합니다.</p>}
        {d.showInPlayback === false && <p className={styles.hiddenNote}>재생에서 숨김</p>}
      </section>
    </CheckpointStatusRing>;
  }

  return (
    <CheckpointStatusRing status={status}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '4px 10px', borderRadius: 9999,
        border: `1.5px solid ${COLOR}`, backgroundColor: 'white',
        boxShadow: selected ? `0 0 0 3px ${COLOR}40` : '0 1px 4px rgba(0,0,0,0.08)',
        cursor: 'grab', userSelect: 'none',
      }}>
        <Handle id="l" type="target" position={Position.Left}  style={{ background: COLOR, border: 'none' }} />
        <Handle id="r" type="source" position={Position.Right} style={{ background: COLOR, border: 'none' }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: COLOR }}>{d.label ?? ''}</span>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>=</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: COLOR }}>{value}</span>
        {delta != null && (
          <span style={{ fontSize: 10, fontWeight: 700, color: delta > 0 ? '#1D9E75' : '#E24B4A' }}>
            {delta > 0 ? `+${delta}` : delta}
          </span>
        )}
      </div>
    </CheckpointStatusRing>
  );
}
