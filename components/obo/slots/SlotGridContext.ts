'use client';
import { createContext, useContext } from 'react';
import type { SlotValue } from './model';
export const SlotGridContext = createContext<{
  onEditSlot?: (id: string, index: number, value: SlotValue) => void;
  editLabel?: string;
  traceMode?: boolean;
}>({});
export const useSlotGrid = () => useContext(SlotGridContext);
