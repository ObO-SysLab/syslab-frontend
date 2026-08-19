import { useRef, useState } from 'react';

export interface TimelineBlock {
  start: number;
  end: number;
  colorKey?: string;
}

export interface GanttRow {
  trackId?: string;
  blocks?: TimelineBlock[];
  color?: string;
}

// 드래그가 끝났을 때 "방금 만지작거린 블록" — 프레임 오버라이드가 activeRowIndex/
// activeBlockIndex를 자동으로 채우는 데 쓴다(지울 때는 null).
export interface PaintHint {
  rowIndex: number;
  blockIndex: number;
}

const CLICK_SLOP = 3; // 이 픽셀 이하로 움직이면 드래그가 아니라 클릭으로 친다(삭제용)

// cell 하나가 다른 블록과 안 겹치는 [min,max) 범위 — 새 블록을 그리거나 옮길 때 이 안으로 클램프.
function freeBounds(blocks: TimelineBlock[], excludeIndex: number | null, around: number, axisMax: number) {
  let min = 0;
  let max = axisMax;
  blocks.forEach((b, i) => {
    if (i === excludeIndex) return;
    if (b.end <= around) min = Math.max(min, b.end);
    if (b.start >= around && b.start < max) max = Math.min(max, b.start);
  });
  return { min, max };
}

type Drag =
  | { kind: 'create'; rowIndex: number; anchor: number; current: number }
  | { kind: 'move'; rowIndex: number; blockIndex: number; grabCell: number; origStart: number; origEnd: number; deltaCells: number; moved: boolean }
  | { kind: 'resize-start' | 'resize-end'; rowIndex: number; blockIndex: number; origStart: number; origEnd: number; current: number };

// 빈 칸에서 드래그하면 블록이 생기고, 가장자리를 끌면 늘고 줄고, 가운데를 끌면 옮겨지고,
// 드래그 없이 클릭만 하면 지워지는 상호작용 — 포인터 캡처를 써서 제스처가 컴포넌트 밖으로
// (패널 스크롤이나 캔버스 팬/노드 드래그로) 새지 않게 막는다.
// 패널의 미니 그리드(GanttPaint)와 캔버스에 실제로 그려지는 노드(GanttChart) 둘 다 이 훅 하나를 쓴다.
export function useGanttPaintDrag(
  rows: GanttRow[],
  axisMax: number,
  onPaint: (rows: GanttRow[], hint: PaintHint | null) => void,
) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const startClientX = useRef(0);
  const maxMoveSeen = useRef(0);

  // getBoundingClientRect()는 화면에 실제로 그려진(줌 적용된) 픽셀 크기를 돌려주므로,
  // rect.width를 axisMax로 나눈 값이 "지금 화면에서 칸 하나가 몇 px인지"다. 캔버스가 확대/축소된
  // 상태에서도(예: fitView 배율 1.125) 클릭 좌표(clientX, 화면 기준)와 정확히 맞아떨어진다 —
  // 고정된 CELL 상수로 나누면 줌이 1이 아닐 때 클릭 위치와 그려지는 위치가 어긋난다.
  const cellAt = (rowIndex: number, clientX: number) => {
    const el = rowRefs.current[rowIndex];
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const cellPx = rect.width / axisMax;
    return Math.min(axisMax - 1, Math.max(0, Math.floor((clientX - rect.left) / cellPx)));
  };

  const capture = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    startClientX.current = e.clientX;
    maxMoveSeen.current = 0;
  };

  const onRowPointerDown = (rowIndex: number, e: React.PointerEvent) => {
    capture(e);
    const c = cellAt(rowIndex, e.clientX);
    setDrag({ kind: 'create', rowIndex, anchor: c, current: c });
  };

  const onBlockPointerDown = (rowIndex: number, blockIndex: number, block: TimelineBlock, c: number, e: React.PointerEvent) => {
    capture(e);
    setDrag({ kind: 'move', rowIndex, blockIndex, grabCell: c, origStart: block.start, origEnd: block.end, deltaCells: 0, moved: false });
  };

  const onHandlePointerDown = (rowIndex: number, blockIndex: number, edge: 'start' | 'end', block: TimelineBlock, e: React.PointerEvent) => {
    capture(e);
    setDrag({ kind: `resize-${edge}` as const, rowIndex, blockIndex, origStart: block.start, origEnd: block.end, current: edge === 'start' ? block.start : block.end });
  };

  const onMove = (e: React.PointerEvent) => {
    if (!drag) return;
    maxMoveSeen.current = Math.max(maxMoveSeen.current, Math.abs(e.clientX - startClientX.current));
    const c = cellAt(drag.rowIndex, e.clientX);

    if (drag.kind === 'create') {
      setDrag({ ...drag, current: c });
    } else if (drag.kind === 'move') {
      const rawDelta = c - drag.grabCell;
      const width = drag.origEnd - drag.origStart;
      const { min, max } = freeBounds(rows[drag.rowIndex].blocks ?? [], drag.blockIndex, drag.origStart, axisMax);
      const clampedStart = Math.min(Math.max(drag.origStart + rawDelta, min), max - width);
      setDrag({ ...drag, deltaCells: clampedStart - drag.origStart, moved: true });
    } else if (drag.kind === 'resize-start') {
      const { min } = freeBounds(rows[drag.rowIndex].blocks ?? [], drag.blockIndex, drag.origStart, axisMax);
      setDrag({ ...drag, current: Math.min(Math.max(c, min), drag.origEnd - 1) });
    } else if (drag.kind === 'resize-end') {
      const { max } = freeBounds(rows[drag.rowIndex].blocks ?? [], drag.blockIndex, drag.origEnd - 1, axisMax);
      setDrag({ ...drag, current: Math.max(Math.min(c + 1, max), drag.origStart + 1) });
    }
  };

  const onUp = () => {
    if (!drag) return;
    const { rowIndex } = drag;
    const row = rows[rowIndex];
    const blocks = row.blocks ?? [];
    let nextBlocks = blocks;
    let hint: PaintHint | null = null;

    if (drag.kind === 'create') {
      const lo = Math.min(drag.anchor, drag.current);
      const hi = Math.max(drag.anchor, drag.current) + 1;
      const { min, max } = freeBounds(blocks, null, drag.anchor, axisMax);
      const start = Math.max(lo, min);
      const end = Math.min(hi, max);
      if (end > start) {
        nextBlocks = [...blocks, { start, end }];
        hint = { rowIndex, blockIndex: nextBlocks.length - 1 };
      }
    } else if (drag.kind === 'move') {
      if (!drag.moved || maxMoveSeen.current < CLICK_SLOP) {
        nextBlocks = blocks.filter((_, i) => i !== drag.blockIndex);
        hint = null;
      } else {
        const width = drag.origEnd - drag.origStart;
        const start = drag.origStart + drag.deltaCells;
        nextBlocks = blocks.map((b, i) => i === drag.blockIndex ? { ...b, start, end: start + width } : b);
        hint = { rowIndex, blockIndex: drag.blockIndex };
      }
    } else if (drag.kind === 'resize-start') {
      nextBlocks = blocks.map((b, i) => i === drag.blockIndex ? { ...b, start: drag.current } : b);
      hint = { rowIndex, blockIndex: drag.blockIndex };
    } else if (drag.kind === 'resize-end') {
      nextBlocks = blocks.map((b, i) => i === drag.blockIndex ? { ...b, end: drag.current } : b);
      hint = { rowIndex, blockIndex: drag.blockIndex };
    }

    setDrag(null);
    onPaint(rows.map((r, i) => i === rowIndex ? { ...r, blocks: nextBlocks } : r), hint);
  };

  // 드래그 중인 블록의 실시간 미리보기 [start,end) — 실제 데이터는 pointerup에서만 커밋.
  const previewFor = (rowIndex: number, blockIndex: number, block: TimelineBlock): TimelineBlock => {
    if (!drag || drag.rowIndex !== rowIndex) return block;
    if (drag.kind === 'move' && drag.blockIndex === blockIndex) {
      const width = drag.origEnd - drag.origStart;
      const start = drag.origStart + drag.deltaCells;
      return { ...block, start, end: start + width };
    }
    if (drag.kind === 'resize-start' && drag.blockIndex === blockIndex) return { ...block, start: drag.current };
    if (drag.kind === 'resize-end' && drag.blockIndex === blockIndex) return { ...block, end: drag.current };
    return block;
  };

  const draftRange = (rowIndex: number): [number, number] | null => {
    if (!drag || drag.kind !== 'create' || drag.rowIndex !== rowIndex) return null;
    return [Math.min(drag.anchor, drag.current), Math.max(drag.anchor, drag.current) + 1];
  };

  return { rowRefs, onRowPointerDown, onBlockPointerDown, onHandlePointerDown, onMove, onUp, previewFor, draftRange };
}
