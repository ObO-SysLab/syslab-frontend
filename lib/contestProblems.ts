// 대회 '기존 문제 추가' 창: 내가 출제한 문제 목록(/api/profile/problems/authored) 검색
export type OwnProblem = { probId: number; title: string; category: string; type?: string; difficulty?: string };

export function filterOwnProblems(problems: OwnProblem[], query: string): OwnProblem[] {
  const q = query.trim().toLowerCase().replace(/^#/, "");
  if (!q) return problems;
  return problems.filter((p) =>
    String(p.probId) === q ||
    p.title.toLowerCase().includes(q) ||
    (p.category ?? "").toLowerCase().includes(q));
}
