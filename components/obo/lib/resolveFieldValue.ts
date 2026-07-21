import type { Node } from '@xyflow/react';
import type { Frame } from '../types';
import { applyFrame } from './applyFrame';

export function resolveFieldValue(
  baseNodes: Node[],
  frames: Frame[],
  frameIndex: number,
  nodeId: string,
  field: string
): unknown {
  const node = applyFrame(baseNodes, frames, frameIndex).find(n => n.id === nodeId);
  return (node?.data as Record<string, unknown> | undefined)?.[field];
}
