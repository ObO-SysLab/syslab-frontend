import type { OBOTemplate } from '../templates';

// Authored example, not an automatic scheduler. Tests independently simulate this input.
export const RR_QUANTUM = 2;
export const RR_INPUTS = [
  { id: 'P1', arrival: 0, burst: 5, colorKey: 'teal' },
  { id: 'P2', arrival: 0, burst: 3, colorKey: 'indigo' },
  { id: 'P3', arrival: 12, burst: 3, colorKey: 'amber' },
];
export const RR_RUNS = [
  { process: 'P1', start: 0, end: 2 },
  { process: 'P2', start: 2, end: 4 },
  { process: 'P1', start: 4, end: 6 },
  { process: 'P2', start: 6, end: 7 },
  { process: 'P1', start: 7, end: 8 },
  { process: null, start: 8, end: 12 },
  { process: 'P3', start: 12, end: 14 },
  { process: 'P3', start: 14, end: 15 },
];
const explanations = [
  `시간 0 · 먼저 도착한 P1과 P2 중 P1부터 실행합니다. 한 번에 최대 2시간 단위를 사용합니다.\n입력 · ${RR_INPUTS.map(p => `${p.id} 도착 ${p.arrival} / 실행 ${p.burst}`).join(' · ')}`,
  '시간 2 · P1은 3만큼 남아 대기열 뒤로 갑니다. 이번에는 P2가 2–4 동안 실행합니다.',
  '시간 4 · P2는 1만큼 남아 뒤로 갑니다. 다시 차례가 온 P1이 4–6 동안 실행합니다.',
  '시간 6 · P1도 1만큼 남았습니다. P2는 남은 1만 실행하고 시간 7에 끝납니다.',
  '시간 7 · P2가 끝났습니다. P1이 남은 1을 실행하고 시간 8에 끝납니다.',
  '시간 8 · P1과 P2가 모두 끝났고 P3는 아직 도착하지 않았습니다. CPU는 8–12 동안 쉽니다. 모든 줄이 비어 있는 이 구간만 CPU 유휴입니다. 한 줄의 빈칸은 대기뿐 아니라 도착 전이나 종료 후일 수도 있습니다.',
  '시간 12 · P3가 도착했습니다. 먼저 12–14 동안 2시간 단위를 실행합니다.',
  '시간 14 · P3는 1만큼 남았습니다. 다른 대기 프로세스가 없어 P3가 계속 실행합니다.',
  '시간 15 · P3까지 모두 끝났습니다. 실제 실행은 총 11, CPU가 쉰 시간은 4입니다.',
];
const rowId = (id: string) => `rr-${id.toLowerCase()}`;
export const ROUND_ROBIN_TEMPLATE: OBOTemplate = {
  id: 'G2', name: 'CPU 스케줄링 (라운드 로빈)', category: 'cpu', description: '간트 차트',
  defaultNodes: [
    // One short condition line above the gantt; the inputs and the idle-gap meaning live in the scene captions (2026-11-08).
    { id: 'rr-title', type: 'text-label', position: { x: 40, y: 0 }, data: { text: `라운드 로빈 · 시간 할당량 ${RR_QUANTUM} · 문맥 교환 비용 0`, variant: 'plain', color: '#334155' } },
    ...RR_INPUTS.map((process, i) => ({
      id: rowId(process.id), type: 'gantt-lane', position: { x: 40, y: 44 + i * 128 },
      data: { trackId: process.id, ganttGroup: '라운드 로빈', axisEnd: 15, activeBlockIndex: null,
        blocks: RR_RUNS.filter(run => run.process === process.id).map(run => ({ start: run.start, end: run.end, colorKey: process.colorKey })) },
    })),
  ],
  defaultEdges: [],
  defaultFrames: explanations.map((label, i) => {
    const run = RR_RUNS[i];
    const process = run?.process;
    const activeBlockIndex = process ? RR_RUNS.filter(r => r.process === process).findIndex(r => r.start === run.start) : -1;
    return { id: `rr-scene-${i + 1}`, label, cursorTime: run?.start ?? 15, highlightNodes: [], highlightEdges: [],
      nodeDataOverrides: process ? { [rowId(process)]: { activeBlockIndex } } : {} };
  }),
};
