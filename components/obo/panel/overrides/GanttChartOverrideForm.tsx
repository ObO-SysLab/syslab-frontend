'use client';

import type { OverrideFormProps } from './NodeOverrideEditor';
import { GanttPaint, type PaintHint } from '../fields/GanttPaint';
import type { GanttBlock } from '../fields/ListEditor';

interface GanttRow {
  trackId?: string;
  blocks?: GanttBlock[];
  color?: string;
}

// rows는 키 단위 전체 교체 필드라(applyFrame 참고) 한 행만 바꿔도 항상 전체 rows 배열을
// 다시 만들어 onFieldChange('rows', …)로 넘긴다.
export function GanttChartOverrideForm({ node, base, override, onFieldChange, onFieldClear }: OverrideFormProps) {
  const rows = ((override.rows as GanttRow[] | undefined) ?? (base.rows as GanttRow[] | undefined) ?? []) as GanttRow[];
  const axisMax = (node.data.axisMax as number) || Math.max(8, ...rows.flatMap(r => (r.blocks ?? []).map(b => b.end)));
  const activeRowIndex = (override.activeRowIndex as number | null | undefined) ?? null;
  const activeBlockIndex = (override.activeBlockIndex as number | null | undefined) ?? null;
  const activeRowBlocks = activeRowIndex != null ? (rows[activeRowIndex]?.blocks ?? []) : [];

  // 칠하면 그 칸이 바로 이 프레임의 rows가 되고, 새로 채운 블록이 자동으로 "방금 배정된 블록"이
  // 된다 — 시작/종료 숫자 입력, 색상 선택, "방금 배정된 블록" 드롭다운을 따로 안 만져도 된다.
  const handlePaint = (nextRows: GanttRow[], hint: PaintHint | null) => {
    onFieldChange('rows', nextRows);
    if (hint) {
      onFieldChange('activeRowIndex', hint.rowIndex);
      onFieldChange('activeBlockIndex', hint.blockIndex);
    }
  };

  return (
    <div className="space-y-3">
      <GanttPaint rows={rows} axisMax={axisMax} onPaint={handlePaint} />

      <div className="space-y-1 border-t pt-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">방금 배정된 블록</label>
          {activeRowIndex != null && (
            <span className="text-[10px] text-indigo-600 font-bold">
              {rows[activeRowIndex]?.trackId || `행 ${activeRowIndex + 1}`} · 블록 {activeBlockIndex}
            </span>
          )}
        </div>
        <p className="text-[10px] text-slate-400">칠하면 자동으로 채워집니다. 강조를 끄고 싶을 때만 아래에서 조정하세요.</p>
        <div className="flex gap-1.5">
          <select
            value={activeRowIndex ?? ''}
            onChange={e => e.target.value === '' ? onFieldClear('activeRowIndex') : onFieldChange('activeRowIndex', Number(e.target.value))}
            className="flex-1 px-1.5 py-1 text-xs border border-slate-200 rounded bg-white"
          >
            <option value="">행 없음</option>
            {rows.map((r, i) => <option key={i} value={i}>{r.trackId || `행 ${i + 1}`}</option>)}
          </select>
          <select
            value={activeBlockIndex ?? ''}
            onChange={e => e.target.value === '' ? onFieldClear('activeBlockIndex') : onFieldChange('activeBlockIndex', Number(e.target.value))}
            disabled={activeRowIndex == null}
            className="flex-1 px-1.5 py-1 text-xs border border-slate-200 rounded bg-white disabled:opacity-40"
          >
            <option value="">블록 없음</option>
            {activeRowBlocks.map((_, i) => <option key={i} value={i}>블록 {i}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
