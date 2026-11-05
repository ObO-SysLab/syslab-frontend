import type { OBOTemplate } from './templates';
import type { OboBlob, Frame } from './types';

// Authored teaching scenes, not an automatic deadlock detector.
const edge = (id: string, source: string, target: string, sourceHandle: string, targetHandle: string, request: boolean) => ({
  id, source, target, sourceHandle, targetHandle, type: 'obo-edge',
  data: { label: request ? '요청' : '할당', direction: 'forward', style: request ? 'dashed' : 'solid',
    role: request ? 'request' : 'allocation', color: request ? '#b45309' : '#0f766e' },
});
const scene = (id: string, label: string, visibleEdges: string[], highlightNodes: string[], highlightEdges: string[], allocated: [number, number]): Frame => ({
  id, label, visibleEdges, highlightNodes, highlightEdges,
  nodeDataOverrides: { r1: { allocated: allocated[0] }, r2: { allocated: allocated[1] } },
});

export const RESOURCE_ALLOCATION_TEMPLATE: OBOTemplate = {
  id: 'S3', name: '자원 할당 그래프', category: 'sync', description: '요청 → 할당 → 순환 대기',
  defaultNodes: [
    { id: 'p1', type: 'state-node', position: { x: 40, y: 20 }, data: { label: 'P1', shape: 'circle', fill: '#4f46e5' } },
    { id: 'r1', type: 'resource-square', position: { x: 400, y: 20 }, data: { label: 'R1', instances: 1, allocated: 0 } },
    { id: 'r2', type: 'resource-square', position: { x: 40, y: 220 }, data: { label: 'R2', instances: 1, allocated: 0 } },
    { id: 'p2', type: 'state-node', position: { x: 400, y: 220 }, data: { label: 'P2', shape: 'circle', fill: '#4f46e5' } },
  ],
  defaultEdges: [
    edge('request-1', 'p1', 'r1', 'r', 'l', true),
    edge('own-1', 'r1', 'p1', 'l', 'r', false),
    edge('request-2', 'p2', 'r2', 'l', 'r-s', true),
    edge('own-2', 'r2', 'p2', 'r-s', 'l', false),
    edge('wait-1', 'p1', 'r2', 'b', 't-s', true),
    edge('wait-2', 'p2', 'r1', 't', 'b', true),
  ],
  defaultFrames: [
    scene('rag-1', '시작 · R1과 R2는 각각 하나입니다. 아직 사용하는 프로세스가 없습니다.', [], [], [], [0, 0]),
    scene('rag-2', '요청 · P1이 R1을 요청합니다. 점선은 “사용하고 싶다”는 뜻입니다.', ['request-1'], ['p1', 'r1'], ['request-1'], [0, 0]),
    scene('rag-3', '할당 · R1을 P1에게 줍니다. 요청선이 사라지고, 자원에서 프로세스로 실선이 향합니다.', ['own-1'], ['p1', 'r1'], ['own-1'], [1, 0]),
    scene('rag-4', '요청 · P1이 R1을 사용하는 동안, P2는 비어 있는 R2를 요청합니다.', ['own-1', 'request-2'], ['p2', 'r2'], ['request-2'], [1, 0]),
    scene('rag-5', '할당 · P1은 R1을, P2는 R2를 사용합니다. 아직 서로 기다리지 않습니다.', ['own-1', 'own-2'], ['p2', 'r2'], ['own-2'], [1, 1]),
    scene('rag-6', '대기 · P1은 R1을 가진 채 R2를 기다립니다. P2는 진행할 수 있어 아직 교착 상태는 아닙니다.', ['own-1', 'own-2', 'wait-1'], ['p1', 'r2'], ['wait-1'], [1, 1]),
    scene('rag-7', '교착 · P2도 R2를 가진 채 R1을 기다립니다. 서로 반납할 수 없어 둘 다 멈춥니다.\nP1 → R2 → P2 → R1 → P1', ['own-1', 'own-2', 'wait-1', 'wait-2'], ['p1', 'p2', 'r1', 'r2'], ['own-1', 'own-2', 'wait-1', 'wait-2'], [1, 1]),
  ],
};

export function createResourceAllocationExample(): OboBlob {
  return JSON.parse(JSON.stringify({ nodes: RESOURCE_ALLOCATION_TEMPLATE.defaultNodes,
    edges: RESOURCE_ALLOCATION_TEMPLATE.defaultEdges, frames: RESOURCE_ALLOCATION_TEMPLATE.defaultFrames }));
}
