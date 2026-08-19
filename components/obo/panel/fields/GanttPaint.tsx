'use client';

import { TIMELINE_COLOR_PALETTE, DEFAULT_TIMELINE_COLOR_KEY, rowColorForIndex } from '../../nodes/ganttColors';
import { useGanttPaintDrag, type GanttRow, type PaintHint } from '../../lib/useGanttPaintDrag';

export type { PaintHint };

interface GanttPaintProps {
  rows: GanttRow[];
  axisMax: number;
  onPaint: (rows: GanttRow[], hint: PaintHint | null) => void;
}

const CELL = 22;
const ROW_H = 26;
const HANDLE_W = 7;

function colorFor(colorKey: string | undefined): string {
  return TIMELINE_COLOR_PALETTE[colorKey ?? ''] ?? TIMELINE_COLOR_PALETTE[DEFAULT_TIMELINE_COLOR_KEY];
}

// 패널 안에 들어가는 작은 미리보기 겸 편집 그리드. 실제 드래그 로직은 useGanttPaintDrag가
// 다 하고, 여기선 패널 크기(CELL 22px)에 맞춘 렌더링만 담당한다.
export function GanttPaint({ rows, axisMax, onPaint }: GanttPaintProps) {
  const { rowRefs, onRowPointerDown, onBlockPointerDown, onHandlePointerDown, onMove, onUp, previewFor, draftRange } =
    useGanttPaintDrag(rows, axisMax, onPaint);

  return (
    <div className="space-y-1">
      <p className="text-[10px] text-slate-400 leading-relaxed">
        빈 칸에서 드래그하면 블록이 생깁니다. 블록 가장자리를 끌면 늘고 줄고, 가운데를 끌면 옮겨져요.
        클릭만 하면(안 끌면) 지워집니다.
      </p>
      <div className="overflow-x-auto">
        <div className="inline-block select-none" style={{ touchAction: 'none' }}>
          {rows.map((row, ri) => {
            const rowColor = row.color ?? rowColorForIndex(ri);
            const blocks = row.blocks ?? [];
            const draft = draftRange(ri);
            return (
              <div key={ri} className="flex items-center gap-1.5 mb-1 last:mb-0">
                <span className="text-[11px] font-bold text-slate-500 w-8 shrink-0 text-right">{row.trackId}</span>
                <div
                  ref={el => { rowRefs.current[ri] = el; }}
                  onPointerDown={e => onRowPointerDown(ri, e)}
                  onPointerMove={onMove}
                  onPointerUp={onUp}
                  style={{
                    position: 'relative', width: axisMax * CELL, height: ROW_H,
                    background: `repeating-linear-gradient(to right, #f8fafc 0 ${CELL}px, white ${CELL}px ${CELL * 2}px)`,
                    border: '1px solid #e2e8f0', borderRadius: 4, touchAction: 'none', cursor: 'crosshair',
                  }}
                >
                  {blocks.map((b, bi) => {
                    const p = previewFor(ri, bi, b);
                    return (
                      <div
                        key={bi}
                        onPointerDown={e => onBlockPointerDown(ri, bi, b, Math.floor((e.clientX - (rowRefs.current[ri]?.getBoundingClientRect().left ?? 0)) / CELL), e)}
                        onPointerMove={onMove}
                        onPointerUp={onUp}
                        style={{
                          position: 'absolute', top: 2, left: p.start * CELL + 1, height: ROW_H - 4,
                          width: (p.end - p.start) * CELL - 2,
                          background: colorFor(rowColor), borderRadius: 4, cursor: 'grab', touchAction: 'none',
                          boxShadow: '0 1px 2px rgba(15,23,42,0.2)',
                        }}
                      >
                        <div
                          onPointerDown={e => onHandlePointerDown(ri, bi, 'start', b, e)}
                          onPointerMove={onMove}
                          onPointerUp={onUp}
                          style={{ position: 'absolute', left: -2, top: 0, width: HANDLE_W, height: '100%', cursor: 'ew-resize', touchAction: 'none' }}
                        />
                        <div
                          onPointerDown={e => onHandlePointerDown(ri, bi, 'end', b, e)}
                          onPointerMove={onMove}
                          onPointerUp={onUp}
                          style={{ position: 'absolute', right: -2, top: 0, width: HANDLE_W, height: '100%', cursor: 'ew-resize', touchAction: 'none' }}
                        />
                      </div>
                    );
                  })}
                  {draft && (
                    <div style={{
                      position: 'absolute', top: 2, left: draft[0] * CELL + 1, height: ROW_H - 4,
                      width: (draft[1] - draft[0]) * CELL - 2,
                      background: colorFor(rowColor), opacity: 0.6, borderRadius: 4,
                      border: '1.5px dashed white', pointerEvents: 'none',
                    }} />
                  )}
                </div>
              </div>
            );
          })}
          <div className="flex ml-[calc(2rem+6px)]">
            {Array.from({ length: axisMax }, (_, i) => (
              <span key={i} style={{ width: CELL, flexShrink: 0 }} className="text-[9px] text-slate-300 text-center">{i}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
