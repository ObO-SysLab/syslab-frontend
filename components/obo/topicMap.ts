import { registry } from './runtime/index.mjs';
import { OBO_TEMPLATES } from './templates';

/**
 * Teaching topics shared by the two independent authoring paths (2026-11-08).
 * `rule` are rule-model IDs, `free` are free-drawing starting templates. IDs are internal:
 * free `G2` is Round Robin while rule `G2` is SJF·FCFS, so the UI always shows names.
 */
export interface OboTopic { id: string; name: string; rule: string[]; free: string[] }

export const OBO_TOPICS: OboTopic[] = [
  { id: 'lifecycle', name: '프로세스 상태 전이', rule: ['ST2'], free: ['ST2'] },
  { id: 'cpu', name: 'CPU 스케줄링', rule: ['G2', 'RR', 'PS'], free: ['G1', 'G2'] },
  { id: 'context', name: '문맥 교환', rule: ['CS'], free: [] },
  { id: 'threads', name: '프로세스·스레드 구조', rule: ['PT'], free: ['PT'] },
  { id: 'ipc', name: '프로세스 간 통신', rule: ['IPC'], free: [] },
  { id: 'pages', name: '페이지 교체', rule: ['P2', 'OPT', 'P3'], free: ['S1'] },
  { id: 'thrashing', name: 'Thrashing', rule: ['TH'], free: [] },
  { id: 'tlb', name: '주소 변환·TLB', rule: ['TLB'], free: ['TLB'] },
  { id: 'alloc', name: '메모리 할당·단편화', rule: ['MF'], free: ['MF'] },
  { id: 'rag', name: '자원 할당 그래프·교착', rule: ['S3'], free: ['S3'] },
  { id: 'buffer', name: '생산자·소비자', rule: ['PC'], free: ['C1'] },
  { id: 'banker', name: 'Banker 알고리즘', rule: ['BK'], free: [] },
  { id: 'dining', name: '식사하는 철학자', rule: ['DP'], free: [] },
  { id: 'inode', name: 'inode 파일 접근', rule: ['IN'], free: ['IN'] },
  { id: 'disk', name: '디스크 스케줄링', rule: ['DS'], free: ['DS'] },
  { id: 'kernel', name: '시스템 호출·인터럽트', rule: ['K-SYSCALL', 'K-INTERRUPT'], free: [] },
];

export const ruleModelName = (id: string) => registry[id]?.metadata.name ?? id;
export const freeTemplateName = (id: string) => OBO_TEMPLATES.find(t => t.id === id)?.name ?? id;
