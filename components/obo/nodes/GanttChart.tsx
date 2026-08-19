'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { TIMELINE_COLOR_PALETTE, DEFAULT_TIMELINE_COLOR_KEY, rowColorForIndex } from './ganttColors';
import { useFrameCtx } from '../FrameContext';
import { CheckpointStatusRing } from './CheckpointStatusRing';
import { useGanttPaintDrag, type GanttRow } from '../lib/useGanttPaintDrag';

interface GanttChartData {
  title?: string;
  // 모든 행이 공유하는 칸 수. 없으면 전체 행의 블록에서 유추(단, 그러면 행마다
  // 실제 채워진 만큼만 보여 고정폭 표 느낌이 안 난다 — 저작 시 지정 권장).
  axisMax?: number;
  rows?: GanttRow[];
  // 방금 배정된 블록 — 강조(마칭 앤츠) 대상. 행 인덱스 + 그 행 안에서의 블록 인덱스.
  activeRowIndex?: number | null;
  activeBlockIndex?: number | null;
}

const CELL = 34;
const LABEL_W = 34;
const HANDLE_W = 8;
const INK = '#0f172a';
const LABEL_COLOR = '#334155';
const TICK_COLOR = '#94a3b8';
const LINE = '#e2e8f0';
const LINE_STRONG = '#cbd5e1';

function colorFor(colorKey: string | undefined): string {
  return TIMELINE_COLOR_PALETTE[colorKey ?? ''] ?? TIMELINE_COLOR_PALETTE[DEFAULT_TIMELINE_COLOR_KEY];
}

// 스케줄링 타임라인을 위한 단일 컨테이너 노드.
// 제목 + 여러 행 + 공유 시간축을 한 박스 안에서 함께 관리 — 행마다 따로 카드를 만들지 않는다.
// "모던 소프트" 스타일: 굵은 검정 격자 대신 옅은 회색 선 + 둥근 색 막대, 행마다 프로세스
// 고유색을 줘서 통일된 노란 채움보다 한눈에 구분되게 하고, 얼룩말 줄무늬로 행을 구분한다.
//
// FrameContext에 onGanttChartPaint가 내려와 있으면(에디터 안) 캔버스 위에서 바로 드래그해
// 블록을 만들고/늘리고/옮기고/지울 수 있다 — OboPlayer(재생 전용)에는 안 내려주므로 거기선
// 항상 정적으로만 보인다. nodrag/nopan 클래스로 React Flow의 노드 드래그·캔버스 팬과 부딪히지 않게 막는다.
export function GanttChart({ id, data, selected }: NodeProps) {
  const d = (data as unknown) as GanttChartData;
  const rows = d.rows ?? [];
  const axisMax = d.axisMax ?? Math.max(1, ...rows.flatMap(r => (r.blocks ?? []).map(b => b.end)));
  const gridW = axisMax * CELL;
  const totalW = LABEL_W + gridW;
  const rowsH = rows.length * CELL;

  const { checkpointStatus, onGanttChartPaint } = useFrameCtx();
  const status = checkpointStatus?.[id] ?? null;
  const editable = !!onGanttChartPaint;

  const { rowRefs, onRowPointerDown, onBlockPointerDown, onHandlePointerDown, onMove, onUp, previewFor, draftRange } =
    useGanttPaintDrag(rows, axisMax, (nextRows, hint) => onGanttChartPaint?.(id, nextRows, hint));

  const activeRow = d.activeRowIndex != null ? rows[d.activeRowIndex] : undefined;
  const activeBlock = activeRow && d.activeBlockIndex != null ? (activeRow.blocks ?? [])[d.activeBlockIndex] : undefined;

  return (
    <CheckpointStatusRing status={status}>
      <div style={{
        position: 'relative', cursor: 'grab', userSelect: 'none',
        background: 'white', borderRadius: 12,
        border: `1.5px solid ${selected ? '#6366f1' : LINE_STRONG}`,
        boxShadow: selected ? '0 0 0 3px #6366f126, 0 4px 14px rgba(15,23,42,0.08)' : '0 2px 8px rgba(15,23,42,0.06)',
        padding: '12px 16px 18px',
        transition: 'border-color 150ms, box-shadow 150ms',
      }}>
        <Handle id="t" type="source" position={Position.Top} style={{ background: INK, border: 'none', opacity: 0 }} />
        <Handle id="b" type="source" position={Position.Bottom} style={{ background: INK, border: 'none', opacity: 0 }} />

        {d.title && (
          <div style={{
            fontSize: 13, fontWeight: 800, color: INK, letterSpacing: 0.1,
            paddingBottom: 9, marginBottom: 12, borderBottom: `1px solid ${LINE}`,
          }}>
            {d.title}
          </div>
        )}

        {/* 표 본체 — 둥근 모서리로 잘라내 전체가 하나의 카드 안 표처럼 보이게 */}
        <div style={{
          position: 'relative', width: totalW, height: rowsH,
          borderRadius: 8, overflow: 'hidden', border: `1px solid ${LINE_STRONG}`,
        }}>
          {rows.map((row, i) => {
            const rowColor = row.color ?? rowColorForIndex(i);
            const draft = editable ? draftRange(i) : null;
            return (
              <div key={i} style={{
                position: 'absolute', left: 0, top: i * CELL, width: totalW, height: CELL,
                background: i % 2 === 1 ? '#f8fafc' : 'white',
                borderBottom: i < rows.length - 1 ? `1px solid ${LINE}` : 'none',
              }}>
                <div style={{
                  position: 'absolute', left: 0, top: 0, width: LABEL_W, height: CELL,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12.5, fontWeight: 800, color: LABEL_COLOR,
                  borderRight: `1px solid ${LINE_STRONG}`,
                }}>
                  {row.trackId}
                </div>

                {/* 칸 구분선(옅은 세로선) — editable이면 이 칸이 곧 드래그 영역 */}
                <div
                  ref={editable ? (el => { rowRefs.current[i] = el; }) : undefined}
                  className={editable ? 'nodrag nopan' : undefined}
                  onPointerDown={editable ? e => onRowPointerDown(i, e) : undefined}
                  onPointerMove={editable ? onMove : undefined}
                  onPointerUp={editable ? onUp : undefined}
                  style={{
                    position: 'absolute', left: LABEL_W, top: 0, width: gridW, height: CELL,
                    cursor: editable ? 'crosshair' : undefined,
                    touchAction: editable ? 'none' : undefined,
                  }}
                >
                  {Array.from({ length: axisMax - 1 }, (_, c) => (
                    <div key={c} style={{
                      position: 'absolute', left: (c + 1) * CELL, top: 0, width: 1, height: CELL,
                      background: LINE, pointerEvents: 'none',
                    }} />
                  ))}
                </div>

                {/* 이 행의 블록 — 칸마다 채우지 않고 [start,end)를 한 덩어리 둥근 막대로 */}
                {(row.blocks ?? []).map((b, bi) => {
                  const p = editable ? previewFor(i, bi, b) : b;
                  return (
                    <div
                      key={bi}
                      className={editable ? 'nodrag nopan' : undefined}
                      onPointerDown={editable ? e => onBlockPointerDown(i, bi, b, Math.floor((e.clientX - (rowRefs.current[i]?.getBoundingClientRect().left ?? 0)) / CELL), e) : undefined}
                      onPointerMove={editable ? onMove : undefined}
                      onPointerUp={editable ? onUp : undefined}
                      style={{
                        position: 'absolute',
                        left: LABEL_W + p.start * CELL + 3, top: 5,
                        width: (p.end - p.start) * CELL - 6, height: CELL - 10,
                        borderRadius: 7,
                        background: colorFor(b.colorKey ?? rowColor),
                        boxShadow: '0 1px 2px rgba(15,23,42,0.15)',
                        cursor: editable ? 'grab' : undefined,
                        touchAction: editable ? 'none' : undefined,
                      }}
                    >
                      {editable && (
                        <>
                          <div
                            className="nodrag nopan"
                            onPointerDown={e => onHandlePointerDown(i, bi, 'start', b, e)}
                            onPointerMove={onMove}
                            onPointerUp={onUp}
                            style={{ position: 'absolute', left: -3, top: 0, width: HANDLE_W, height: '100%', cursor: 'ew-resize', touchAction: 'none' }}
                          />
                          <div
                            className="nodrag nopan"
                            onPointerDown={e => onHandlePointerDown(i, bi, 'end', b, e)}
                            onPointerMove={onMove}
                            onPointerUp={onUp}
                            style={{ position: 'absolute', right: -3, top: 0, width: HANDLE_W, height: '100%', cursor: 'ew-resize', touchAction: 'none' }}
                          />
                        </>
                      )}
                    </div>
                  );
                })}

                {/* 드래그로 새 블록을 그리는 중일 때의 미리보기 */}
                {draft && (
                  <div style={{
                    position: 'absolute', left: LABEL_W + draft[0] * CELL + 3, top: 5,
                    width: (draft[1] - draft[0]) * CELL - 6, height: CELL - 10,
                    borderRadius: 7, background: colorFor(rowColor), opacity: 0.6,
                    border: '1.5px dashed white', pointerEvents: 'none',
                  }} />
                )}

                {/* 방금 배정된 블록 강조 — StateNode 프레임 하이라이트와 동일한 marching-ants 테두리 */}
                {i === d.activeRowIndex && activeBlock && (
                  <svg
                    width={(activeBlock.end - activeBlock.start) * CELL} height={CELL}
                    style={{ position: 'absolute', left: LABEL_W + activeBlock.start * CELL, top: 0, pointerEvents: 'none' }}
                  >
                    <rect
                      x={2} y={4}
                      width={(activeBlock.end - activeBlock.start) * CELL - 4} height={CELL - 8}
                      rx={9} fill="none" stroke="#4f46e5" strokeWidth={2} strokeDasharray="6 5"
                      style={{ animation: 'obo-march 0.6s linear infinite' }}
                    />
                  </svg>
                )}
              </div>
            );
          })}
        </div>

        {/* 시간 눈금 — 화살표 없이 숫자만, 옅은 회색으로 격자보다 한 톤 낮춤 */}
        {rows.length > 0 && (
          <div style={{ position: 'relative', width: totalW, height: 16, marginTop: 4 }}>
            {Array.from({ length: axisMax + 1 }, (_, i) => (
              <span key={i} style={{
                position: 'absolute', left: LABEL_W + i * CELL - 4, top: 0,
                fontSize: 10.5, fontWeight: 600, color: TICK_COLOR,
              }}>{i}</span>
            ))}
          </div>
        )}
      </div>
    </CheckpointStatusRing>
  );
}
