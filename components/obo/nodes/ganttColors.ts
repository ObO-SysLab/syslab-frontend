export const TIMELINE_COLOR_PALETTE: Record<string, string> = {
  yellow: '#facc15',
  teal: '#0d9488',
  indigo: '#6366f1',
  amber: '#d97706',
  rose: '#e11d48',
  slate: '#64748b',
  violet: '#7c3aed',
};

export const TIMELINE_COLOR_KEYS = Object.keys(TIMELINE_COLOR_PALETTE);

export const DEFAULT_TIMELINE_COLOR_KEY = 'teal';

// 행(프로세스)에 색을 명시하지 않았을 때 순서대로 돌려 쓰는 기본 배색 — 노랑 통일 대신
// 프로세스마다 고유한 색을 줘서 같은 프로세스가 여러 블록에 걸쳐도 한눈에 이어져 보이게 한다.
const ROW_COLOR_CYCLE = ['teal', 'indigo', 'amber', 'rose', 'violet', 'slate'];

export function rowColorForIndex(index: number): string {
  return ROW_COLOR_CYCLE[index % ROW_COLOR_CYCLE.length];
}
