'use client';

import { createContext, useContext } from 'react';
import type { Frame } from './types';

interface FrameCtx {
  previewFrame: Frame | null;
}

export const FrameContext = createContext<FrameCtx>({ previewFrame: null });
export const useFrameCtx = () => useContext(FrameContext);