import type { Node } from '@xyflow/react';
import type { OboTraceStep } from '../types';
import { getStateFields } from './overrideFields';

function parseValueToken(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

// 한 줄 = 한 스텝. 토큰이 노드 id면 그 스텝에서 강조 대상으로, 노드 id가 아니면(값이면)
// 바로 앞에 나온 노드 id의 유일한 state 필드에 배정한다. state 필드가 없는 노드(state-node 등)
// 뒤에 값 토큰이 오면 배정할 필드가 없으므로 조용히 무시한다.
export function parseTraceText(text: string, nodes: Node[]): OboTraceStep[] {
  const nodeTypeById = new Map(nodes.map(n => [n.id, n.type]));

  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      const tokens = line.split(/\s+/);
      const overrides: Record<string, Record<string, unknown>> = {};
      const highlightNodes: string[] = [];
      let lastNodeId: string | null = null;

      for (const token of tokens) {
        if (nodeTypeById.has(token)) {
          highlightNodes.push(token);
          lastNodeId = token;
          continue;
        }
        if (lastNodeId) {
          const field = getStateFields(nodeTypeById.get(lastNodeId))[0];
          if (field) {
            overrides[lastNodeId] = { ...(overrides[lastNodeId] ?? {}), [field]: parseValueToken(token) };
          }
        }
      }

      return { overrides, highlightNodes };
    });
}

// parseTraceText의 역변환 — 저장된 구조화 트레이스를 편집용 텍스트로 되돌린다
// (기존 문제를 에디터에서 다시 열었을 때 textarea 초기값 복원용).
export function stringifyTrace(trace: OboTraceStep[], nodes: Node[]): string {
  const nodeTypeById = new Map(nodes.map(n => [n.id, n.type]));

  return trace
    .map(step => {
      const parts: string[] = [];
      const covered = new Set<string>();

      for (const nodeId of step.highlightNodes) {
        parts.push(nodeId);
        const field = getStateFields(nodeTypeById.get(nodeId))[0];
        const value = field ? step.overrides[nodeId]?.[field] : undefined;
        if (value !== undefined) parts.push(JSON.stringify(value));
        covered.add(nodeId);
      }

      for (const nodeId of Object.keys(step.overrides)) {
        if (covered.has(nodeId)) continue;
        const field = getStateFields(nodeTypeById.get(nodeId))[0];
        const value = field ? step.overrides[nodeId]?.[field] : undefined;
        if (value !== undefined) parts.push(nodeId, JSON.stringify(value));
      }

      return parts.join(' ');
    })
    .join('\n');
}
