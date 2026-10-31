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
    { id: 'fault-legend', type: 'text-label', position: { x: 320, y: 180 }, data: { text: 'FAULT · 없어서 적재하거나 교체', variant: 'plain', color: '#be123c' } },
    { id: 'hit-legend', type: 'text-label', position: { x: 320, y: 212 }, data: { text: 'HIT · 이미 있어 그대로 사용', variant: 'plain', color: '#047857' } },
    { id: 'fifo-note', type: 'text-label', position: { x: 320, y: 250 }, data: { text: '빈칸이 남아 있으면 먼저 빈칸에 적재', variant: 'plain', color: '#64748b' } },
    { id: 'status', type: 'text-label', position: { x: 40, y: 340 }, data: { text: 'FIFO · 값과 강조는 각 장면에서 직접 지정', variant: 'pill', color: '#4338ca' } },
  ],
  defaultEdges: [],
  defaultFrames: [
    { id: 'page-start', label: '빈 메모리에서 시작합니다. 위의 참조 순서와 아래 메모리 칸을 함께 살펴보세요.', highlightNodes: [], highlightEdges: [], nodeDataOverrides: { status: { text: '시작 · 아직 참조한 페이지가 없습니다.' } } },
    ...PAGE_SCENES.map((scene, i) => ({
      id: `page-${i + 1}`, label: `참조 ${PAGE_REFERENCES[i]} · ${scene.reason}`, highlightNodes: [], highlightEdges: [],
      nodeDataOverrides: {
        'ref-string': { activeSlotIndex: i },
        frames: { slots: scene.slots, [scene.hit ? 'hitSlotIndex' : 'faultSlotIndex']: scene.index, pointerSlotIndex: scene.pointer },
        status: { text: `${i + 1} / 8 · 페이지 ${PAGE_REFERENCES[i]} → ${scene.hit ? 'HIT · 칸의 값과 교체 순서 유지' : i < 3 ? 'FAULT · 빈칸 적재' : `FAULT · 칸 ${scene.index} 교체`}` },
      },
    })),
    { id: 'page-complete', label: '참조 완료 · FAULT 7회, HIT 1회입니다. 빈칸에 처음 넣는 경우도 FAULT에 포함됩니다.', highlightNodes: [], highlightEdges: [], nodeDataOverrides: { status: { text: '완료 · FAULT 7회 / HIT 1회 · 최종 메모리 4, 3, 0' } } },
  ],
};
export function createPageReplacementExample(): OboBlob {
  return structuredClone({ nodes: PAGE_REPLACEMENT_TEMPLATE.defaultNodes, edges: PAGE_REPLACEMENT_TEMPLATE.defaultEdges, frames: PAGE_REPLACEMENT_TEMPLATE.defaultFrames ?? [] }) as OboBlob;
}
