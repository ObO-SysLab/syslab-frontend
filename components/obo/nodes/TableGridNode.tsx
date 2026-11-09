'use client';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useFrameCtx } from '../FrameContext';
import { editableClass, useNodeEdit } from '../lib/NodeEditContext';
interface TableData { label?: string; headers?: string[]; rows?: (string | number)[][]; activeRow?: number | null; width?: number; color?: string; highlightCells?: { row: number; col: number; color: string }[]; }
export function TableGridNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as TableData;
  const rows = Array.isArray(d.rows) ? d.rows : [];
  const headers = Array.isArray(d.headers) ? d.headers : [];
  const { previewFrame } = useFrameCtx();
  const { open } = useNodeEdit();
  const active = previewFrame?.highlightNodes.includes(id);
  const color = d.color ?? '#4f46e5';
  return <div data-table={id} style={{ width: d.width ?? 300, background: 'white', border: `2px solid ${active ? color : '#cbd5e1'}`, borderRadius: 10,
    outline: selected ? '3px dashed #6366f1' : undefined, outlineOffset: 4 }}>
    <Handle id="t" type="source" position={Position.Top} /><Handle id="b" type="source" position={Position.Bottom} />
    <Handle id="l" type="source" position={Position.Left} /><Handle id="r" type="source" position={Position.Right} />
    <div style={{ padding: '10px 12px', fontSize: 14, fontWeight: 800, color, background: '#f8fafc', borderRadius: '8px 8px 0 0' }}>{d.label || '표'}</div>
    <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13, tableLayout: 'fixed' }}>
      {headers.length > 0 && <thead><tr>{headers.map((h, i) => <th key={i} style={{ padding: 8, borderTop: '1px solid #e2e8f0', background: '#eef2ff', color: '#475569', overflowWrap: 'anywhere' }}>{h}</th>)}</tr></thead>}
      <tbody>{rows.map((row, r) => <tr key={r} data-table-row={r} data-active={r === d.activeRow}>
        {(Array.isArray(row) ? row : []).map((cell, c) => {
          const focus = r === d.activeRow || d.highlightCells?.some(h => h.row === r && h.col === c);
          return <td key={c} data-table-cell={`${r}:${c}`} className={open ? editableClass : undefined} title={open ? '눌러서 셀 값 수정' : undefined}
            onClick={open ? e => { e.stopPropagation(); open(id, { kind: 'cell', row: r, col: c }); } : undefined} style={{ padding: '9px 8px', borderTop: '1px solid #e2e8f0', textAlign: 'center', overflowWrap: 'anywhere', background: focus ? '#fef3c7' : 'white', color: focus ? '#92400e' : '#334155', fontWeight: focus ? 800 : 500 }}>{String(cell ?? '—')}</td>;
        })}
      </tr>)}</tbody>
    </table>
    {!rows.length && <p style={{ fontSize: 13, padding: 12, color: '#64748b' }}>아직 항목이 없습니다.</p>}
  </div>;
}
