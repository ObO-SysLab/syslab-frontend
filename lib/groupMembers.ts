// 그룹 멤버 목록(/api/groups/{id}/members)에서 순위와 명예의 전당을 만든다.
// 점수는 사이트 전체 점수(랭킹과 같은 값)다.
export type GroupMemberScore = { userId: number; nickname: string; score?: number | null };

const scoreOf = (m: GroupMemberScore) => (typeof m.score === "number" && Number.isFinite(m.score) ? m.score : 0);

// 점수 내림차순 순위. 같은 점수는 같은 순위(1, 2, 2, 4).
export function memberRanks(members: GroupMemberScore[]): Map<number, number> {
  const sorted = [...members].sort((a, b) => scoreOf(b) - scoreOf(a));
  const ranks = new Map<number, number>();
  sorted.forEach((m, i) => {
    const prev = sorted[i - 1];
    ranks.set(m.userId, prev && scoreOf(prev) === scoreOf(m) ? ranks.get(prev.userId)! : i + 1);
  });
  return ranks;
}

// 점수가 있는 멤버 중 상위 3명. 아무도 점수가 없으면 빈 목록.
export function hallOfFame<T extends GroupMemberScore>(members: T[], size = 3): (T & { rank: number })[] {
  const ranks = memberRanks(members);
  return members
    .filter((m) => scoreOf(m) > 0)
    .sort((a, b) => scoreOf(b) - scoreOf(a) || a.nickname.localeCompare(b.nickname))
    .slice(0, size)
    .map((m) => ({ ...m, rank: ranks.get(m.userId) ?? 0 }));
}
