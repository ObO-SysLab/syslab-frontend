import type { Node } from '@xyflow/react';
import { DEFAULT_TIMELINE_COLOR_KEY } from '../nodes/ganttColors';

export const NODE_OVERRIDE_FIELDS: Record<string, { state: string[]; event: string[] }> = {
  'text-label':    { state: ['text'],   event: [] },
  'gantt-chart':   { state: ['rows'],   event: ['activeRowIndex', 'activeBlockIndex'] },
  'slot-grid':     { state: ['slots'],  event: ['faultSlotIndex', 'hitSlotIndex'] },
  'counter-badge': { state: ['value'],  event: ['delta'] },
};

export const OVERRIDABLE_NODE_TYPES = Object.keys(NODE_OVERRIDE_FIELDS);

export function getEventFields(nodeType: string | undefined): string[] {
  return nodeType ? NODE_OVERRIDE_FIELDS[nodeType]?.event ?? [] : [];
}

export function getStateFields(nodeType: string | undefined): string[] {
  return nodeType ? NODE_OVERRIDE_FIELDS[nodeType]?.state ?? [] : [];
}

export function isOverridableNodeType(nodeType: string | undefined): boolean {
  return !!nodeType && nodeType in NODE_OVERRIDE_FIELDS;
}

// 그 노드의 state 필드에 바로 써넣을 수 있는 예시 값(JSON 문자열). 어떤 템플릿을 섞어 쓰든
// 실제 캔버스에 있는 노드의 현재 data를 기준으로 계산하므로 항상 정확하다.
// state 필드가 없는 타입(state-node 등, 값이 아니라 강조 이동만 있는 노드)은 null.
export function exampleStateValue(node: Node): string | null {
  const data = (node.data ?? {}) as Record<string, unknown>;
  switch (node.type) {
    case 'text-label':
      return JSON.stringify((data.text as string) || '텍스트');
    case 'counter-badge':
      return JSON.stringify((data.value as number) ?? 0);
    case 'slot-grid': {
      const count = (data.slotCount as number) ?? (data.slots as unknown[] | undefined)?.length ?? 3;
      return JSON.stringify(Array(count).fill(null));
    }
    case 'gantt-chart':
      return JSON.stringify([{ trackId: 'P1', blocks: [{ start: 0, end: 1, colorKey: DEFAULT_TIMELINE_COLOR_KEY }] }]);
    default:
      return null;
  }
}
