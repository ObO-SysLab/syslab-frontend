'use client';
import { createContext, useContext } from 'react';
import type { GanttBlock, GanttLayout } from './model';
export const GanttContext = createContext<{
  layouts: Record<string, GanttLayout>; editLabel?: string;
  onEditBlock?: (nodeId: string, index: number, block: GanttBlock) => void;
  traceMode?: boolean;
}>({ layouts: {} });
export const useGantt = () => useContext(GanttContext);
