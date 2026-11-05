// references/contest.md
// 진행 중/접수 중 대회는 현재 시각 기준 상대 시간으로 만들어서 "남은 시간" 계산을 언제든 테스트할 수 있게 한다.
import { ME, fromNow, ok } from "./common";

type ContestStatus = "접수 중" | "진행 중" | "종료";

type Contest = {
  contestId: number;
  title: string;
  description: string;
  participants: number;
  startTime: string;
  endTime: string;
  type: "개인전" | "팀전";
  prize: string;
  status: ContestStatus;
  isJoined: boolean;
  isContestLeader: boolean;
  myScore: number;
  myRank: number;
};

const contests: Contest[] = [
  {
    contestId: 1, title: "제1회 DiveOn 커널 다이빙 챌린지",
    description: "커널·프로세스·메모리 영역을 아우르는 개인전 대회입니다.\n\n- 문제 5개, 총 1,000점\n- 같은 문제는 30초에 1번 제출 가능",
    participants: 128, startTime: fromNow(-3), endTime: fromNow(5), type: "개인전", prize: "총 상금 200만원",
    status: "진행 중", isJoined: true, isContestLeader: false, myScore: 350, myRank: 12,
  },
  {
    contestId: 2, title: "Diveon 정기전 (November)",
    description: "매달 열리는 정기전입니다. 시작 전에만 참가 신청할 수 있습니다.",
    participants: 37, startTime: fromNow(24 * 2), endTime: fromNow(24 * 2 + 4), type: "개인전", prize: "Platinum 티어 포인트",
    status: "접수 중", isJoined: false, isContestLeader: false, myScore: 0, myRank: 0,
  },
  {
    contestId: 3, title: "2026 상반기 OS 경진대회",
    description: "종료된 대회입니다. 스코어보드는 확정 결과입니다.",
    participants: 512, startTime: "2026-05-16T09:00:00", endTime: "2026-05-16T18:00:00", type: "팀전", prize: "취업 우대권 및 상장",
    status: "종료", isJoined: true, isContestLeader: false, myScore: 700, myRank: 41,
  },
  {
    contestId: 4, title: "DK-기사단 11월 내부 모의고사",
    description: "DK-기사단 그룹 전용 대회입니다.",
    participants: 12, startTime: fromNow(24 * 4), endTime: fromNow(24 * 4 + 3), type: "개인전", prize: "없음",
    status: "접수 중", isJoined: true, isContestLeader: true, myScore: 0, myRank: 0,
  },
  {
    contestId: 6, title: "곧 끝나는 스레드 스프린트",
    description: "종료 10분 전 상태 테스트용 대회입니다.",
    participants: 64, startTime: fromNow(-2), endTime: fromNow(1 / 6), type: "개인전", prize: "기념 뱃지",
    status: "진행 중", isJoined: true, isContestLeader: false, myScore: 200, myRank: 3,
  },
];

const listItem = (c: Contest) => ({
  contestId: c.contestId,
  title: c.title,
  participants: c.participants,
  startTime: c.startTime,
  endTime: c.endTime,
  type: c.type,
  prize: c.prize,
  status: c.status,
  isHot: c.participants >= 50,
  isJoined: c.isJoined,
});

const STATUS_QUERY: Record<string, ContestStatus> = { UPCOMING: "접수 중", ONGOING: "진행 중", ENDED: "종료" };

// GET /api/contests — 요청 status는 영문 대문자, 응답 status는 한글
export const getMockContestList = (query: { keyword?: string; status?: string; onlyJoined?: boolean; page?: number; size?: number } = {}) => {
  const page = query.page ?? 1;
  const size = query.size ?? 10;
  const target = query.status && query.status !== "ALL" ? STATUS_QUERY[query.status.toUpperCase()] : undefined;
  const filtered = contests
    .filter((c) => !query.keyword || c.title.includes(query.keyword))
    .filter((c) => !target || c.status === target)
    .filter((c) => !query.onlyJoined || c.isJoined);
  return ok(
    {
      totalContests: filtered.length,
      currentPage: page,
      totalPages: Math.max(1, Math.ceil(filtered.length / size)),
      contests: filtered.slice((page - 1) * size, page * size).map(listItem),
    },
    "대회 목록 조회 성공"
  );
};

export const mockContestListResponse = getMockContestList();

// GET /api/contests/me/owned
export const mockOwnedContestsResponse = ok(
  contests.filter((c) => c.isContestLeader).map((c) => ({ contestId: c.contestId, title: c.title })),
  "내가 소유한 대회 목록 조회 성공"
);

// GET /api/contests/{contestId} — progress는 호출 시점 기준으로 계산
export const getMockContestDetail = (contestId: number) => {
  const c = contests.find((x) => x.contestId === contestId);
  if (!c) return null;
  const start = new Date(c.startTime).getTime();
  const end = new Date(c.endTime).getTime();
  const progress =
    c.status === "종료" ? 100 : c.status === "접수 중" ? 0 : Math.min(100, Math.round(((Date.now() - start) / (end - start)) * 100));
  return ok(
    {
      contestId: c.contestId,
      title: c.title,
      description: c.description,
      startTime: c.startTime,
      endTime: c.endTime,
      status: c.status,
      progress,
      totalUser: c.participants,
      userContext: { isJoined: c.isJoined, isContestLeader: c.isContestLeader, myScore: c.myScore, myRank: c.myRank },
    },
    "대회 상세 정보 조회 성공"
  );
};

// 상태별 대표 상세
export const mockContestDetailOngoingResponse = getMockContestDetail(1)!;
export const mockContestDetailUpcomingResponse = getMockContestDetail(2)!;
export const mockContestDetailEndedResponse = getMockContestDetail(3)!;
export const mockContestDetailLeaderResponse = getMockContestDetail(4)!;

export const mockContestCreateResponse = ok({ contestId: 7, title: "새 대회" }, "대회가 성공적으로 생성되었습니다.", 201);
export const mockContestUpdateResponse = ok(null, "대회 설정이 저장되었습니다.");
export const mockContestDeleteResponse = ok(null, "대회가 성공적으로 삭제되었습니다.");
export const mockContestJoinResponse = ok({ isJoined: true }, "대회 참가가 완료되었습니다.");
export const mockContestLeaveResponse = ok({ isJoined: false }, "대회 참가 취소가 완료되었습니다.");

// GET /api/contests/{contestId}/rankings
const scoreboard: [string, number, number, number][] = [
  // nickname, score, solvedCount, 마지막 정답이 시작 후 몇 분
  ["OS_Master", 900, 4, 95],
  ["KernelHacker", 800, 4, 120],
  ["ByteMage", 650, 3, 70],
  ["ThreadLover", 650, 3, 88],
  ["Guido", 500, 3, 140],
  ["Torvalds", 450, 2, 60],
  [ME.nickname, 350, 2, 110],
  ["DanKook", 200, 1, 30],
  ["CodeNewbie", 100, 1, 150],
  ["DevBeginner", 0, 0, 0],
];

export const mockContestRankingsResponse = ok(
  {
    contestId: 1,
    isOngoing: true,
    rankings: scoreboard.map(([nickname, score, solvedCount, minutes], i) => ({
      rank: i + 1,
      userId: nickname === ME.nickname ? ME.userId : 300 + i,
      nickname,
      score,
      lastSolvedAt: solvedCount > 0 ? fromNow(-3 + minutes / 60) : null,
      solvedCount,
    })),
  },
  "스코어보드 조회 성공"
);

// GET /api/contests/{contestId}/problems — 제출 시 contestProblemId 사용
// problemId는 problems.ts의 문제와 연결되어 getMockProblemDetail(problemId)로 상세를 볼 수 있다.
export const mockContestProblemsResponse = ok(
  {
    problems: [
      { id: "A", contestProblemId: 11, problemId: 2, title: "프로세스 상태 전이 이해하기", points: 100, submittedCount: 120, solvedCount: 98, category: "Process", isSolved: true },
      { id: "B", contestProblemId: 12, problemId: 11, title: "페이지 교체 LRU 구현", points: 200, submittedCount: 85, solvedCount: 41, category: "Memory", isSolved: true },
      { id: "C", contestProblemId: 13, problemId: 7, title: "식사하는 철학자 문제", points: 200, submittedCount: 60, solvedCount: 17, category: "Thread", isSolved: false },
      { id: "D", contestProblemId: 14, problemId: 6, title: "루트킷 숨김 파일 탐지", points: 250, submittedCount: 33, solvedCount: 5, category: "FileSystem", isSolved: false },
      { id: "E", contestProblemId: 15, problemId: 12, title: "EXT4 저널 복구", points: 250, submittedCount: 12, solvedCount: 1, category: "FileSystem", isSolved: false },
    ],
  },
  "대회 문제 목록 조회 성공"
);

export const mockContestPointsUpdateResponse = ok(null, "문제 배점이 수정되었습니다.");
export const mockContestProblemRemoveResponse = ok(null, "문제가 대회에서 제거되었습니다.");

// POST /api/contests/{contestId}/problems/{contestProblemId}/submit
// 객관식/실습: 즉시 채점(200), 코딩: 비동기(202)
export const mockContestSubmitInstantResponse = ok(
  { submissionId: 456, submissionStatus: "COMPLETED", isCorrect: true, score: 450, rank: 6 },
  "채점 요청이 접수되었습니다."
);
export const mockContestSubmitWrongResponse = ok(
  { submissionId: 457, submissionStatus: "COMPLETED", isCorrect: false, score: 350, rank: 7 },
  "채점 요청이 접수되었습니다."
);
export const mockContestSubmitCodingResponse = ok(
  { submissionId: 458, submissionStatus: "PENDING" },
  "채점 요청이 접수되었습니다.",
  202
);

// GET /api/contests/{contestId}/submissions/{submissionId}/status
export const mockContestSubmissionStatusResponse = ok(
  { submissionId: 458, submissionStatus: "COMPLETED", progress: 100, isCorrect: true, score: 550, rank: 5 },
  "채점 상태 조회에 성공하였습니다."
);

// GET /api/contests/{contestId}/submissions/{submissionId}/result
export const mockContestSubmissionResultResponse = ok(
  { submissionId: 458, language: "python", code: "import sys\nprint(sum(map(int, sys.stdin.read().split())))" },
  "제출 코드 조회에 성공하였습니다."
);

// GET /api/contests/{contestId}/participants(/banned)
export const mockContestParticipantsResponse = ok(
  {
    totalElements: 5,
    totalPages: 1,
    participants: [
      { userId: 300, nickname: "OS_Master", joinedAt: "2026-10-20T10:00:00", score: 900, isBanned: false },
      { userId: 301, nickname: "KernelHacker", joinedAt: "2026-10-21T11:00:00", score: 800, isBanned: false },
      { userId: ME.userId, nickname: ME.nickname, joinedAt: "2026-10-22T09:00:00", score: 350, isBanned: false },
      { userId: 307, nickname: "DanKook", joinedAt: "2026-10-25T20:00:00", score: 200, isBanned: false },
      { userId: 309, nickname: "DevBeginner", joinedAt: "2026-10-27T08:00:00", score: 0, isBanned: false },
    ],
  },
  "참가자 목록 조회 성공"
);
export const mockContestBannedResponse = ok(
  {
    totalElements: 1,
    totalPages: 1,
    participants: [{ userId: 310, nickname: "Cheater", joinedAt: "2026-10-23T12:00:00", score: 0, isBanned: true }],
  },
  "차단된 참가자 목록 조회 성공"
);
export const mockContestBanResponse = ok({ isBanned: true }, "해당 참가자의 상태가 변경되었습니다.");
export const mockContestTransferResponse = ok(
  { previousLeaderNickname: ME.nickname, newLeaderNickname: "Torvalds" },
  "대회 관리자 권한이 이관되었습니다."
);

// GET /api/contests/{contestId}/notices — 최신순
export const mockContestNoticesResponse = ok(
  {
    notices: [
      { id: 3, title: "C번 문제 입력 형식 정정", content: "C번 입력의 두 번째 줄은 공백으로 구분됩니다.", createdBy: "운영진", createdAt: fromNow(-1), updatedAt: fromNow(-0.5) },
      { id: 2, title: "대회 시작 안내", content: "대회가 시작되었습니다. 모두 화이팅!", createdBy: "운영진", createdAt: fromNow(-3), updatedAt: fromNow(-3) },
      { id: 1, title: "규칙 안내", content: "외부 도움 금지, 같은 문제는 30초에 1번 제출 가능합니다.", createdBy: "운영진", createdAt: "2026-10-20T09:00:00", updatedAt: "2026-10-20T09:00:00" },
    ],
  },
  "공지사항 목록 조회 성공"
);
export const mockContestNoticeCreateResponse = ok(null, "공지사항이 등록되었습니다.", 201);

// GET /api/contests/{contestId}/qnas — 최신순
export const mockContestQnasResponse = ok(
  {
    qnas: [
      { qnaId: 3, question: "D번 VM이 생성되지 않습니다.", isAnswered: false, createdAt: fromNow(-0.3), answers: [] },
      { qnaId: 2, question: "B번에서 참조열 길이가 0일 수 있나요?", isAnswered: true, createdAt: fromNow(-1.5), answers: [{ answerId: 1, answer: "아니요, 1 이상입니다.", answeredAt: fromNow(-1.4) }] },
      { qnaId: 1, question: "객관식 복수 정답은 어떻게 제출하나요?", isAnswered: true, createdAt: fromNow(-2.5), answers: [{ answerId: 2, answer: "보기를 모두 선택한 뒤 제출하면 됩니다.", answeredAt: fromNow(-2.4) }] },
    ],
  },
  "Q&A 목록 조회 성공"
);
export const mockContestQnaCreateResponse = ok(null, "질문이 등록되었습니다.", 201);
export const mockContestAnswerResponse = ok(null, "답변이 등록되었습니다.");
