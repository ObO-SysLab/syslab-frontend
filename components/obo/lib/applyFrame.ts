import type { Node } from '@xyflow/react';
import type { Frame } from '../types';
import { getEventFields } from './overrideFields';

/**
 * frames[0..currentFrameIndex]를 순서대로 fold하여 각 노드의 effective data를 계산한다.
 * - state 필드: 명시적으로 override되지 않으면 이전 값 유지(carry-forward)
 * - event 필드: 매 프레임 시작 시 null로 리셋 후 해당 프레임 override만 반영
 * - override는 키 단위 전체 교체(부분 patch 아님)
 */
export function applyFrame(baseNodes: Node[], frames: Frame[], currentFrameIndex: number): Node[] {
  const relevant = frames.slice(0, currentFrameIndex + 1);
  return baseNodes.map(node => {
    const eventFields = getEventFields(node.type);
    let acc: Record<string, unknown> = { ...(node.data as Record<string, unknown>) };
    for (const frame of relevant) {
      for (const f of eventFields) acc[f] = null;
      const override = frame.nodeDataOverrides?.[node.id];
      if (override) acc = { ...acc, ...override };
    }
    return { ...node, data: acc };
  });
}
