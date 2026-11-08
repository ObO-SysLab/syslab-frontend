import type { OBOTemplate } from '../templates';
import type { OboBlob } from '../types';

// Authored FIFO scenes, not an automatic page-replacement engine.
export const PAGE_REFERENCES = [7, 0, 1, 2, 0, 3, 0, 4];
export const PAGE_SCENES = [
  { slots: [7, null, null], index: 0, hit: false, pointer: 0, reason: '빈 칸 0에 7을 적재합니다.' },
  { slots: [7, 0, null], index: 1, hit: false, pointer: 0, reason: '빈 칸 1에 0을 적재합니다.' },
  { slots: [7, 0, 1], index: 2, hit: false, pointer: 0, reason: '빈 칸 2에 1을 적재합니다. 이제 메모리가 가득 찼습니다.' },
  { slots: [2, 0, 1], index: 0, hit: false, pointer: 1, reason: '가장 먼저 들어온 7을 내보내고 2를 넣습니다.' },
  { slots: [2, 0, 1], index: 1, hit: true, pointer: 1, reason: '0이 이미 있습니다. HIT에서는 FIFO 교체 순서가 바뀌지 않습니다.' },
  { slots: [2, 3, 1], index: 1, hit: false, pointer: 2, reason: '가장 먼저 들어온 0을 내보내고 3을 넣습니다.' },
  { slots: [2, 3, 0], index: 2, hit: false, pointer: 0, reason: '가장 먼저 들어온 1을 내보내고 0을 넣습니다.' },
  { slots: [4, 3, 0], index: 0, hit: false, pointer: 1, reason: '가장 먼저 들어온 2를 내보내고 4를 넣습니다.' },
];
export const PAGE_REPLACEMENT_TEMPLATE: OBOTemplate = {
  id: 'S1', name: '페이지 교체 (FIFO)', category: 'memory', description: '칸과 참조 순서',
  defaultNodes: [
    { id: 'ref-string', type: 'slot-grid', position: { x: 40, y: 0 }, data: { label: '참조순서', slotCount: 8, slots: PAGE_REFERENCES, activeSlotIndex: null } },
    { id: 'frames', type: 'slot-grid', position: { x: 40, y: 160 }, data: { label: '메모리', slotCount: 3, slots: [null, null, null], pointerLabel: '다음 교체', faultSlotIndex: null, hitSlotIndex: null, pointerSlotIndex: null } },
    // A short status beside memory; the FAULT/HIT/empty-slot meanings are told once in the scene captions below (2026-11-08).
    { id: 'status', type: 'text-label', position: { x: 320, y: 196 }, data: { text: 'FIFO', variant: 'pill', color: '#4338ca' } },
  ],
  defaultEdges: [],
  defaultFrames: [
    { id: 'page-start', label: '빈 메모리에서 시작합니다. 위의 참조 순서와 아래 메모리 칸을 함께 살펴보세요.', highlightNodes: [], highlightEdges: [], nodeDataOverrides: { status: { text: '시작' } } },
    ...PAGE_SCENES.map((scene, i) => ({
      id: `page-${i + 1}`, label: `참조 ${PAGE_REFERENCES[i]} · ${scene.reason}${i === 0 ? ' 메모리에 없는 페이지를 참조하면 FAULT이며, 빈칸이 남아 있으면 교체하지 않고 빈칸부터 채웁니다.' : ''}`, highlightNodes: [], highlightEdges: [],
      nodeDataOverrides: {
        'ref-string': { activeSlotIndex: i },
        frames: { slots: scene.slots, [scene.hit ? 'hitSlotIndex' : 'faultSlotIndex']: scene.index, pointerSlotIndex: scene.pointer },
        status: { text: scene.hit ? 'HIT' : i < 3 ? 'FAULT · 빈칸 적재' : `FAULT · 칸 ${scene.index} 교체` },
      },
    })),
    { id: 'page-complete', label: '참조 완료 · FAULT 7회, HIT 1회입니다. 빈칸에 처음 넣는 경우도 FAULT에 포함됩니다. 최종 메모리는 4, 3, 0입니다.', highlightNodes: [], highlightEdges: [], nodeDataOverrides: { status: { text: '완료' } } },
  ],
};
export function createPageReplacementExample(): OboBlob {
  return structuredClone({ nodes: PAGE_REPLACEMENT_TEMPLATE.defaultNodes, edges: PAGE_REPLACEMENT_TEMPLATE.defaultEdges, frames: PAGE_REPLACEMENT_TEMPLATE.defaultFrames ?? [] }) as OboBlob;
}
