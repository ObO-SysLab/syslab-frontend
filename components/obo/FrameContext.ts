'use client';

import { createContext, useContext } from 'react';
import type { Frame } from './types';
import type { GanttRow, PaintHint } from './lib/useGanttPaintDrag';

interface FrameCtx {
  previewFrame: Frame | null;
  checkpointStatus?: Record<string, 'correct' | 'incorrect'>;
  // 캔버스에 그려진 gantt-chart 노드를 직접 칠할 수 있게 하는 콜백. 에디터(OBOEditorCanvas)에서만
  // 내려주고, OboPlayer(재생/미리보기, 읽기 전용)에서는 안 내려줘서 그쪽은 항상 정적으로 렌더된다.
  onGanttChartPaint?: (nodeId: string, rows: GanttRow[], hint: PaintHint | null) => void;
}

export const FrameContext = createContext<FrameCtx>({ previewFrame: null });
export const useFrameCtx = () => useContext(FrameContext);