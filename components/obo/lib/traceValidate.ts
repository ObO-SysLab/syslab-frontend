import type { Node, Edge } from '@xyflow/react';
import type { OboBlob } from '../types';
import { buildNodeResolver } from './traceParser';
import { getStateFields } from './overrideFields';
import { findDirectedEdge } from './trace';
import { traceTokenFor } from './label';

export interface TraceIssue {
  line: number;                 // 1-기준 줄 번호
  severity: 'error' | 'warn';
  message: string;
}

// JSON 값처럼 생겼는지(대괄호/중괄호/따옴표로 시작) — 깨진 값 감지에만 사용.
function looksLikeJson(tok: string): boolean {
  return /^[[{"]/.test(tok);
}

// 트레이스 텍스트를 파서와 동일한 규칙으로 훑어 저작자용 진단을 만든다.
// 파서(parseTraceText)는 실패를 조용히 무시하지만, 여기서는 같은 판정으로 문제를 수집만 한다.
export function validateTrace(text: string, nodes: Node[], edges: Edge[]): TraceIssue[] {
  const resolve = buildNodeResolver(nodes);
  const nodeById = new Map(nodes.map(n => [n.id, n]));
  const oboEdges = edges as unknown as OboBlob['edges'];
  const labelOf = (id: string) => {
    const n = nodeById.get(id);
    return n ? traceTokenFor(n) : id;
  };

  const issues: TraceIssue[] = [];

  text.split('\n').forEach((raw, idx) => {
    const line = raw.trim();
    if (!line) return;
    const lineNo = idx + 1;

    const tokens = line.split(/\s+/);
    const highlightNodes: string[] = [];
    let lastNodeId: string | null = null;

    for (const token of tokens) {
      const nodeId = resolve(token);
      if (nodeId) {
        highlightNodes.push(nodeId);
        lastNodeId = nodeId;
        continue;
      }
      // 노드가 아닌 값 토큰
      if (!lastNodeId) {
        issues.push({ line: lineNo, severity: 'error', message: `미인식 토큰: '${token}'` });
        continue;
      }
      const field = getStateFields(nodeById.get(lastNodeId)?.type)[0];
      if (!field) {
        issues.push({
          line: lineNo,
          severity: 'warn',
          message: `'${labelOf(lastNodeId)}'은(는) 값 필드가 없어 '${token}' 무시됨`,
        });
        continue;
      }
      if (looksLikeJson(token)) {
        try {
          JSON.parse(token);
        } catch {
          issues.push({ line: lineNo, severity: 'warn', message: `값 파싱 실패: '${token}'` });
        }
      }
    }

    // 한 줄에서 연속된 두 노드 사이에 방향 엣지가 없으면 경고(전이 미표현)
    for (let j = 0; j < highlightNodes.length - 1; j++) {
      const from = highlightNodes[j];
      const to = highlightNodes[j + 1];
      if (!findDirectedEdge(oboEdges, from, to)) {
        issues.push({ line: lineNo, severity: 'warn', message: `엣지 없음: ${labelOf(from)}→${labelOf(to)}` });
      }
    }
  });

  return issues;
}