'use client';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useFrameCtx } from '../FrameContext';
import { editableClass, useNodeEdit } from '../lib/NodeEditContext';
import { queueLayout, type QueueSlot } from '../queue/model';
import styles from './QueueStripNode.module.css';

interface QueueData {
  label?: string; items?: string[]; capacity?: number; direction?: 'ltr' | 'rtl'; color?: string;
  displayStyle?: 'strip' | 'buffer'; showCount?: boolean; showDirection?: boolean;
}

export function QueueStripNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as QueueData;
  const items = Array.isArray(d.items) ? d.items : [];
  const layout = queueLayout(items, d.capacity ?? items.length, d.direction ?? 'ltr');
  const { previewFrame } = useFrameCtx();
  const { open } = useNodeEdit();
  // Clicking an item edits it; clicking an empty slot appends a new item (FIFO order).
  const slotEdit = (slot: QueueSlot) => open ? { className: editableClass, title: slot.item === null ? '눌러서 맨 뒤에 항목 넣기' : '눌러서 항목 수정',
    onClick: (e: React.MouseEvent) => { e.stopPropagation(); open(id, { kind: 'queue-item', index: slot.item === null ? items.length : slot.index }); } } : {};
  const active = previewFrame?.highlightNodes.includes(id);
  const color = d.color ?? '#4f46e5';
  const modern = d.displayStyle === 'buffer';
  const rtl = d.direction === 'rtl';
  const selectedStyle = { outline: selected ? '3px dashed #6366f1' : undefined, outlineOffset: 4 };
  const slotPlacement = (row: QueueSlot[], index: number) => rtl && index === 0 && layout && row.length < layout.columns
    ? { gridColumn: layout.columns - row.length + 1 } : undefined;
  const handles = <><Handle id="l" type="target" position={Position.Left} /><Handle id="r" type="source" position={Position.Right} /></>;

  if (modern) return <div data-queue={id} data-queue-style="buffer" className={styles.buffer} style={{
    width: Math.max(360, (layout?.columns ?? 0) * 68 + 32), borderColor: active ? '#0d7961' : undefined, ...selectedStyle,
  }}>
    {handles}
    <header className={styles.header}><h3 className={styles.title}>{d.label || '버퍼'}</h3>
      {d.showCount !== false && <span className={styles.count}>{items.length} / {layout?.capacity ?? '?'}칸</span>}
    </header>
    {!layout ? <p role="alert" className={styles.error}>항목 수와 버퍼 용량을 확인하세요.</p> : layout.capacity === 0
      ? <p className={styles.empty}>용량 0 · 항목을 넣을 수 없습니다.</p> : <>
        {d.showDirection !== false && <div className={styles.direction} data-queue-direction={rtl ? 'right' : 'left'}>
          <span>{rtl ? '넣기' : '꺼내기'}</span><span className={styles.directionLine} data-flow={rtl ? 'right' : 'left'} aria-hidden="true"><span className={styles.directionArrow}>{rtl ? '→' : '←'}</span></span><span>{rtl ? '꺼내기' : '넣기'}</span>
        </div>}
        <div className={styles.rows}>{layout.rows.map((row, rowIndex) => <div key={rowIndex} className={styles.row} style={{ gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))` }}>
          {row.map((slot, index) => <div key={slot.index} data-queue-item={slot.item ?? ''} data-queue-head={slot.head} data-queue-index={slot.index} data-empty={slot.item === null}
            {...slotEdit(slot)} className={`${styles.slot} ${slotEdit(slot).className ?? ''}`} style={slotPlacement(row, index)} aria-label={slot.item === null ? '빈칸' : `${slot.head ? '다음 항목: ' : '항목: '}${slot.item}`}>
            {slot.head && <span className={styles.head}>다음</span>}{slot.item}
          </div>)}
        </div>)}</div>
      </>}
  </div>;

  return <div data-queue={id} data-queue-style="strip" className={styles.legacy} style={{
    width: Math.max(220, (layout?.columns ?? 0) * 68 + 32), border: `2px solid ${active ? color : '#cbd5e1'}`, background: active ? '#eef2ff' : 'white', ...selectedStyle,
  }}>
    {handles}
    <div className={styles.legacyTitle} style={{ color }}>{d.label || '버퍼'}{d.showCount !== false && <> · {items.length} / {layout?.capacity ?? '?'}개</>}</div>
    {!layout ? <p role="alert" className={styles.error}>항목 수와 버퍼 용량을 확인하세요.</p> : <>
      <div className={styles.legacyRows}>{layout.rows.map((row, rowIndex) => <div key={rowIndex} className={styles.legacyRow} style={{ gridTemplateColumns: `repeat(${layout.columns}, 60px)` }}>
        {row.map((slot, index) => <div key={slot.index} data-queue-item={slot.item ?? ''} data-queue-head={slot.head} data-queue-index={slot.index} {...slotEdit(slot)} className={`${styles.legacySlot} ${slotEdit(slot).className ?? ''}`} style={{
          ...slotPlacement(row, index), border: `1.5px ${slot.item === null ? 'dashed' : 'solid'} ${slot.item === null ? '#94a3b8' : color}`,
          background: slot.item === null ? '#f8fafc' : '#e0e7ff', color: slot.item === null ? '#64748b' : '#312e81',
        }}>{slot.item ?? '빈칸'}</div>)}
      </div>)}</div>
      {(d.showDirection !== false || layout.capacity === 0) && <p className={styles.legacyDirection}>{layout.capacity === 0 ? '빈 버퍼 · 용량 0' : rtl ? '새 항목 → FIFO 순서 → 먼저 꺼냄' : '먼저 꺼냄 ← FIFO 순서 ← 새 항목'}</p>}
    </>}
  </div>;
}
