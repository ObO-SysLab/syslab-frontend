import { ALL_OBO_TEMPLATES } from '../templates';
import type { Frame, OboBlob } from '../types';

// Authored example scenes, not the output of a new state-transition engine.
export function createSt2Preview(): OboBlob {
  const template = ALL_OBO_TEMPLATES.find(t => t.id === 'ST2')!;
  const scenes = [
    ['new', 'ready', 'e-new-ready', '프로세스가 만들어져 실행을 기다리는 준비 상태가 됩니다.'],
    ['ready', 'running', 'e-ready-running', '스케줄러가 준비 중인 프로세스를 선택하면 CPU에서 실행을 시작합니다.'],
    ['running', 'waiting', 'e-running-waiting', '입출력이 필요해 실행을 멈추고 기다립니다. 다른 경로도 함께 보면서 현재 이동을 살펴보세요.'],
    ['waiting', 'ready', 'e-waiting-ready', '입출력이 끝나면 준비 상태로 돌아갑니다. 바로 실행되는 것이 아니라 CPU를 배정받을 때까지 기다립니다.'],
    ['ready', 'running', 'e-ready-running', '다시 선택된 프로세스가 CPU에서 실행을 이어갑니다.'],
    ['running', 'ready', 'e-running-ready', '할당된 실행 시간이 끝나면 준비 상태로 돌아가 다음 차례를 기다립니다.'],
    ['ready', 'running', 'e-ready-running', 'CPU를 다시 배정받아 남은 작업을 실행합니다.'],
    ['running', 'terminated', 'e-running-terminated', '작업을 모두 마치면 프로세스가 종료됩니다.'],
  ];
  const frames: Frame[] = scenes.map(([from, to, edge, label], i) => ({
    id: `st2_scene_${i + 1}`, label, highlightNodes: [from, to], highlightEdges: [edge],
  }));
  return structuredClone({nodes: template.defaultNodes, edges: template.defaultEdges, frames}) as OboBlob;
}
