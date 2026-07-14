'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';

interface HighlightCell {
  row: number;
  col: number;
  color: string;
}

interface TableGridNodeData {
  label: string;
  headers?: string[];
  rows?: (string | number)[][];
  highlightCells?: HighlightCell[];
  color?: string;
}

export function TableGridNode({ data, selected }: NodeProps) {
  const d = data as unknown as TableGridNodeData;
  const color = d.color ?? '#6366f1';
  const rows = d.rows ?? [];

  const cellStyle = (r: number, c: number) => {
    const h = d.highlightCells?.find(x => x.row === r && x.col === c);
    return {
      padding: '3px 8px' as const,
      fontSize: 11,
      border: '1px solid #e2e8f0' as const,
      backgroundColor: h ? h.color + '30' : 'white',
      color: h ? h.color : '#374151',
      fontWeight: h ? 700 : 400,
      whiteSpace: 'nowrap' as const,
    };
  };

  return (
    <div style={{
      background: 'white', border: `1.5px solid ${color}30`, borderRadius: 6,
      boxShadow: selected ? `0 0 0 3px ${color}40` : '0 2px 6px rgba(0,0,0,0.06)',
      cursor: 'grab', userSelect: 'none', overflow: 'hidden',
    }}>
      <Handle id="t" type="source" position={Position.Top}    style={{ background: color, border: 'none' }} />
      <Handle id="b" type="target" position={Position.Bottom} style={{ background: color, border: 'none' }} />
      {d.label && (
        <div style={{ padding: '3px 8px', fontSize: 11, fontWeight: 700, color, borderBottom: `1px solid ${color}30`, backgroundColor: color + '08' }}>
          {d.label}
        </div>
      )}
      <table style={{ borderCollapse: 'collapse', fontSize: 11 }}>
        {d.headers && (
          <thead>
            <tr>
              {d.headers.map((h, i) => (
                <th key={i} style={{ padding: '3px 8px', border: '1px solid #e2e8f0', backgroundColor: color + '15', color, fontWeight: 700, fontSize: 10 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <td key={c} style={cellStyle(r, c)}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}