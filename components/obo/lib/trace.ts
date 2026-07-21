import type { Frame, OboBlob, OboTraceStep } from '../types';

// 트레이스 줄에서 노드 id가 등장한 순서를 "from -> to" 방향으로 간주해 그 방향의 엣지만 찾는다.
// 두 노드가 강조됐다고 그 사이 엣지를 전부(양방향 엣지, 병렬 엣지 포함) 강조하면 예를 들어
// ready<->running처럼 서로 다른 방향의 엣지(dispatch/interrupt)가 둘 다 있는 경우 둘 다 켜지는
// 문제가 생긴다 — 트레이스가 준 순서를 방향으로 써서 정확히 그 전이 하나만 고른다.
function findDirectedEdge(edges: OboBlob['edges'], from: string, to: string) {
  return edges.find(e => {
    if (e.source === from && e.target === to) return true;
    const direction = (e.data as { direction?: string } | undefined)?.direction;
    return direction === 'both' && e.source === to && e.target === from;
  });
}

// 트레이스(정답 실행 트레이스 또는 제출 실행 트레이스)를 재생 가능한 프레임 배열로 변환.
// 한 스텝 = 한 프레임. highlightNodes에서 연속된 두 노드 사이에 그 방향의 엣지가 있으면 강조한다.
export function generateFramesFromTrace(trace: OboTraceStep[], edges: OboBlob['edges']): Frame[] {
  return trace.map((step, i) => {
    const highlightEdges: string[] = [];
    for (let j = 0; j < step.highlightNodes.length - 1; j++) {
      const match = findDirectedEdge(edges, step.highlightNodes[j], step.highlightNodes[j + 1]);
      if (match) highlightEdges.push(match.id);
    }
    return {
      id: `f_${i + 1}`,
      label: `스텝 ${i + 1}`,
      highlightNodes: step.highlightNodes,
      highlightEdges,
      nodeDataOverrides: step.overrides,
    };
  });
}
