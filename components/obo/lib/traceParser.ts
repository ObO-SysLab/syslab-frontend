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

// 노드를 참조하는 토큰을 해석한다: id 우선, 없으면 라벨로 매칭.
// 사용자가 라벨을 "KKK"로 지으면 트레이스에 KKK만 써도 그 노드에 연결된다.
// 라벨은 에디터에서 유일하게 강제되므로(공백 없는 단일 토큰) 매칭이 모호하지 않다.
export function buildNodeResolver(nodes: Node[]) {
  const idSet = new Set(nodes.map(n => n.id));
  const idByLabel = new Map<string, string>();
  for (const n of nodes) {
    const label = String((n.data as { label?: unknown })?.label ?? '').trim();
    if (label && !label.includes(' ') && !idByLabel.has(label)) idByLabel.set(label, n.id);
  }
  return (token: string): string | null =>
    idSet.has(token) ? token : idByLabel.get(token) ?? null;
}

// 한 줄 = 한 스텝. 토큰이 노드(id 또는 라벨)면 그 스텝에서 강조 대상으로, 아니면(값이면)
// 바로 앞에 나온 노드의 유일한 state 필드에 배정한다. state 필드가 없는 노드(state-node 등)
// 뒤에 값 토큰이 오면 배정할 필드가 없으므로 조용히 무시한다.
export function parseTraceText(text: string, nodes: Node[]): OboTraceStep[] {
  const nodeTypeById = new Map(nodes.map(n => [n.id, n.type]));
  const resolve = buildNodeResolver(nodes);

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
        const nodeId = resolve(token);
        if (nodeId) {
          highlightNodes.push(nodeId);
          lastNodeId = nodeId;
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
  // 노드 참조는 라벨(공백 없을 때) 우선으로 출력 → 재오픈 시 사용자가 지은 이름 그대로 보인다.
  const labelById = new Map(
    nodes.map(n => [n.id, String((n.data as { label?: unknown })?.label ?? '').trim()]),
  );
  const tokenFor = (nodeId: string) => {
    const label = labelById.get(nodeId);
    return label && !label.includes(' ') ? label : nodeId;
  };

  return trace
    .map(step => {
      const parts: string[] = [];
      const covered = new Set<string>();

      for (const nodeId of step.highlightNodes) {
        parts.push(tokenFor(nodeId));
        const field = getStateFields(nodeTypeById.get(nodeId))[0];
        const value = field ? step.overrides[nodeId]?.[field] : undefined;
        if (value !== undefined) parts.push(JSON.stringify(value));
        covered.add(nodeId);
      }

      for (const nodeId of Object.keys(step.overrides)) {
        if (covered.has(nodeId)) continue;
        const field = getStateFields(nodeTypeById.get(nodeId))[0];
        const value = field ? step.overrides[nodeId]?.[field] : undefined;
        if (value !== undefined) parts.push(tokenFor(nodeId), JSON.stringify(value));
      }

      return parts.join(' ');
    })
    .join('\n');
}
