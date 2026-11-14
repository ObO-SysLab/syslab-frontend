import { describe, expect, it } from 'vitest';
import { applyFrame } from '../lib/applyFrame';
import { validateDiagramBlob } from '../runtime/freeDiagram.mjs';
import { PAGE_REPLACEMENT_TEMPLATE, PAGE_SCENES, createPageReplacementExample } from '../slots/pageReplacementExample';
import { RR_INPUTS, RR_QUANTUM, ROUND_ROBIN_TEMPLATE } from '../gantt/roundRobinExample';

// The free S1/G2 starting examples keep the picture to the core state and move repeated
// explanations into the lower scene captions. Scene values and IDs are covered by slots/model.test.ts
// and gantt/roundRobinExample.test.ts; these checks cover what moved and that nothing was lost.
describe('free S1 page replacement example text', () => {
  const frames = PAGE_REPLACEMENT_TEMPLATE.defaultFrames!;
  it('keeps the reference string, memory and one short status beside memory', () => {
    expect(PAGE_REPLACEMENT_TEMPLATE.defaultNodes.map(n => n.id)).toEqual(['ref-string', 'frames', 'status']);
    const status = PAGE_REPLACEMENT_TEMPLATE.defaultNodes.find(n => n.id === 'status')!;
    expect(status.position.y).toBeLessThan(PAGE_REPLACEMENT_TEMPLATE.defaultNodes.find(n => n.id === 'frames')!.position.y + 120);
    expect(() => validateDiagramBlob(createPageReplacementExample())).not.toThrow();
  });
  it('shows a short status per scene and tells each meaning once in the captions', () => {
    const texts = frames.map((_, i) => applyFrame(PAGE_REPLACEMENT_TEMPLATE.defaultNodes, frames, i).find(n => n.id === 'status')!.data.text as string);
    expect(texts[0]).toBe('시작');
    expect(texts.at(-1)).toBe('완료');
    PAGE_SCENES.forEach((scene, i) => expect(texts[i + 1]).toMatch(scene.hit ? /^Hit$/ : /^Miss · /));
    expect(Math.max(...texts.map(t => t.length))).toBeLessThanOrEqual(16); // the earlier examples went up to 31 characters
    expect(frames[1].label).toMatch(/메모리에 없는 페이지를 참조하면 Miss/);
    expect(frames[1].label).toMatch(/빈칸부터/);
    expect(frames[PAGE_SCENES.findIndex(s => s.hit) + 1].label).toMatch(/Hit에서는 FIFO 교체 순서가 바뀌지 않습니다/);
    expect(frames.at(-1)!.label).toMatch(/Miss 7회, Hit 1회/);
    expect(frames.at(-1)!.label).toMatch(/4, 3, 0/);
  });
});

describe('free G2 round robin example text', () => {
  const frames = ROUND_ROBIN_TEMPLATE.defaultFrames!;
  it('keeps one short condition line above the gantt lanes', () => {
    const texts = ROUND_ROBIN_TEMPLATE.defaultNodes.filter(n => n.type === 'text-label');
    expect(texts.map(n => n.data.text)).toEqual([`라운드 로빈 · 시간 할당량 ${RR_QUANTUM} · 문맥 교환 비용 0`]);
    const lanes = ROUND_ROBIN_TEMPLATE.defaultNodes.filter(n => n.type === 'gantt-lane');
    expect(lanes.map(n => n.data.trackId)).toEqual(RR_INPUTS.map(p => p.id));
    expect(lanes[0].position.y).toBeGreaterThan(texts[0].position.y + 30);
    expect(() => validateDiagramBlob({ nodes: ROUND_ROBIN_TEMPLATE.defaultNodes, edges: [], frames })).not.toThrow();
  });
  it('keeps every input and the idle-gap meaning in the captions', () => {
    const [first, second] = frames[0].label.split('\n');
    expect(first).toMatch(/^시간 0 · /);
    for (const p of RR_INPUTS) expect(second).toContain(`${p.id} 도착 ${p.arrival} / 실행 ${p.burst}`);
    expect(frames.filter(f => f.label.includes('\n'))).toHaveLength(1);
    const idle = frames.find(f => f.cursorTime === 8)!;
    expect(idle.label).toMatch(/모든 줄이 비어 있는 이 구간만 CPU 유휴/);
    expect(idle.label).toMatch(/도착 전이나 종료 후/);
  });
});
