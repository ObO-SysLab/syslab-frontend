// references/rank.md — 세 API 모두 페이지당 20개, page는 1부터
import { ME, ok } from "./common";

// GET /api/problems/{probId}/ranking — 처음 정답 처리받은 순
export const mockProblemRankingResponse = ok(
  {
    totalElements: 5,
    totalPages: 1,
    currentPage: 1,
    rankings: [
      { rank: 1, userId: 7, nickname: "Guido", profileImgUrl: null, firstSolvedAt: "2026-03-01T09:12:00", language: "python" },
      { rank: 2, userId: 12, nickname: "Torvalds", profileImgUrl: null, firstSolvedAt: "2026-03-01T09:40:00", language: "c" },
      { rank: 3, userId: 15, nickname: "Gosling", profileImgUrl: null, firstSolvedAt: "2026-03-02T11:05:00", language: "cpp" },
      { rank: 4, userId: ME.userId, nickname: ME.nickname, profileImgUrl: ME.profileImgUrl, firstSolvedAt: "2026-03-04T21:30:00", language: "python" },
      { rank: 5, userId: 21, nickname: "DanKook", profileImgUrl: null, firstSolvedAt: "2026-03-10T15:00:00", language: "python" },
    ],
  },
  "문제 랭킹 조회에 성공하였습니다."
);

// GET /api/groups/ranking — 인증 불필요
export const mockGroupRankingResponse = ok(
  {
    totalElements: 6,
    totalPages: 1,
    currentPage: 1,
    rankings: [
      { rank: 1, groupId: 1, title: "DK-기사단", image: null, memberCount: 42, score: 9840 },
      { rank: 2, groupId: 2, title: "커널 해부학 스터디", image: null, memberCount: 28, score: 8520 },
      { rank: 3, groupId: 5, title: "CTF 워리어스", image: null, memberCount: 15, score: 7190 },
      { rank: 4, groupId: 3, title: "OS 기초반", image: null, memberCount: 31, score: 6420 },
      { rank: 5, groupId: 6, title: "메모리 포렌식 랩", image: null, memberCount: 9, score: 4890 },
      { rank: 6, groupId: 4, title: "초보자 환영 스터디", image: null, memberCount: 50, score: 2310 },
    ],
  },
  "그룹 랭킹 조회에 성공하였습니다."
);

// GET /api/users/ranking — tier는 1~7 숫자, 동점이면 같은 순위
const users: [string, number, number][] = [
  ["OS_Master", 7, 6800],
  ["KernelHacker", 7, 6780],
  ["ByteMage", 7, 6780],
  ["SysAdmin_01", 6, 5900],
  ["ThreadLover", 6, 5420],
  ["DeadlockHunter", 6, 5010],
  ["MemoryLeak", 5, 4300],
  ["PageFault", 5, 4120],
  ["MutexLock", 5, 3880],
  ["Guido", 5, 3500],
  ["Torvalds", 4, 3240],
  ["Gosling", 4, 3010],
  ["포렌식경장", 4, 2900],
  ["병렬마스터", 4, 2770],
  ["유닉스장인", 4, 2600],
  ["메모리박사", 4, 2510],
  [ME.nickname, ME.tier, ME.score],
  ["DanKook", 3, 2100],
  ["CodeNewbie", 2, 900],
  ["DevBeginner", 1, 120],
];

let prevScore = -1;
let prevRank = 0;
const userRankings = users.map(([nickname, tier, score], i) => {
  const rank = score === prevScore ? prevRank : i + 1;
  prevScore = score;
  prevRank = rank;
  return {
    rank,
    userId: nickname === ME.nickname ? ME.userId : 200 + i,
    nickname,
    profileImgUrl: null as string | null,
    tier,
    score,
  };
});

export const mockUserRankingResponse = ok(
  {
    totalElements: 42,
    totalPages: 3,
    currentPage: 1,
    calculatedAt: "2026-10-29T14:00:00",
    myRanking: userRankings.find((u) => u.userId === ME.userId)!,
    rankings: userRankings,
  },
  "유저 랭킹 조회에 성공하였습니다."
);
