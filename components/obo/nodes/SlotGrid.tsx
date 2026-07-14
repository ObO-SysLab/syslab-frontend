'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';

export interface SlotCell {
  value?: string;
  status?: 'default' | 'fault' | 'hit' | 'empty';
}

interface SlotGridData {
  label?: string;
  title?: string;
  orientation?: 'row' | 'col' | 'grid';
  rows?: number;
  cols?: number;
  cellShape?: 'rect' | 'circle';
  header?: boolean;
  headerLabels?: string[];
  cells?: SlotCell[];
  trailingArrow?: boolean;
}

const FAULT_COLOR = '#E24B4A';
const HIT_COLOR = '#1D9E75';
const GRID_COLOR = '#6366f1';
const CELL_W = 32;
const CELL_H = 32;

function CircleCell({ cell }: { cell: SlotCell }) {
  const s = cell.status ?? 'default';
  const isFault = s === 'fault';
  const isHit = s === 'hit';
  return (
    <div style={{
      width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
      backgroundColor: isFault ? FAULT_COLOR : 'white',
      border: `2px solid ${isFault ? FAULT_COLOR : isHit ? HIT_COLOR : '#cbd5e1'}`,
    }} />
  );
}

function RectCell({ cell, i, borderColor }: { cell: SlotCell; i: number; borderColor: string }) {
  const s = cell.status ?? 'default';
  const isFault = s === 'fault';
  const isHit = s === 'hit';
  return (
    <div style={{
      width: CELL_W, height: CELL_H,
      border: `1.5px solid ${borderColor}`,
      marginLeft: i === 0 ? 0 : -1,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: isFault ? 700 : 500,
      color: isFault ? FAULT_COLOR : isHit ? HIT_COLOR : borderColor,
      backgroundColor: isFault ? FAULT_COLOR + '15' : isHit ? HIT_COLOR + '10' : 'white',
    }}>
      {cell.value ?? ''}
    </div>
  );
}

export function SlotGrid({ data, selected }: NodeProps) {
  const d = (data as unknown) as SlotGridData;
  const orientation = d.orientation ?? 'row';
  const cellShape = d.cellShape ?? 'rect';
  const cells = d.cells ?? [];
  const cols = d.cols ?? 4;
  const rows = d.rows ?? Math.max(1, Math.ceil(cells.length / cols));
  const hs = { background: GRID_COLOR, border: 'none' };

  return (
    <div style={{
      display: 'inline-flex', flexDirection: 'column', gap: 2,
      boxShadow: selected ? `0 0 0 3px ${GRID_COLOR}40` : undefined,
      cursor: 'grab', userSelect: 'none',
    }}>
      <Handle id="t" type="source" position={Position.Top}    style={hs} />
      <Handle id="b" type="source" position={Position.Bottom} style={hs} />
      <Handle id="l" type="source" position={Position.Left}   style={hs} />
      <Handle id="r" type="source" position={Position.Right}  style={hs} />

      {d.title && (
        <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', marginBottom: 2 }}>{d.title}</div>
      )}

      {orientation === 'grid' ? (
        <table style={{ borderCollapse: 'collapse', fontSize: 11 }}>
          {d.header && d.headerLabels && (
            <thead>
              <tr>
                {d.headerLabels.map((h, i) => (
                  <th key={i} style={{
                    padding: '2px 8px', border: '1px solid #e2e8f0',
                    backgroundColor: GRID_COLOR + '15', color: GRID_COLOR,
                    fontWeight: 700, fontSize: 10, whiteSpace: 'nowrap' as const,
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r}>
                {Array.from({ length: cols }).map((__, c) => {
                  const cell = cells[r * cols + c] ?? {};
                  const s = cell.status ?? 'default';
                  return (
                    <td key={c} style={{
                      padding: '2px 8px', border: '1px solid #e2e8f0',
                      fontSize: 11, color: s === 'fault' ? FAULT_COLOR : s === 'hit' ? HIT_COLOR : '#374151',
                      textAlign: 'center' as const,
                      backgroundColor: s === 'fault' ? FAULT_COLOR + '10' : 'white',
                    }}>
                      {cell.value ?? ''}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      ) : orientation === 'col' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: cellShape === 'circle' ? 4 : 0 }}>
          {cells.map((cell, i) =>
            cellShape === 'circle'
              ? <CircleCell key={i} cell={cell} />
              : <RectCell key={i} cell={cell} i={i} borderColor={GRID_COLOR} />
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: cellShape === 'circle' ? 4 : 0 }}>
          {cells.map((cell, i) =>
            cellShape === 'circle'
              ? <CircleCell key={i} cell={cell} />
              : <RectCell key={i} cell={cell} i={i} borderColor={GRID_COLOR} />
          )}
          {d.trailingArrow && (
            <div style={{ marginLeft: 6, fontSize: 14, color: '#64748b' }}>→</div>
          )}
        </div>
      )}
    </div>
  );
}