// references/sub.md
import { ME, ok } from "./common";
import type { ProblemType } from "./problems";

// POST /api/submissions/grade
export const mockGradeResponse = (probId: number, problemType: ProblemType, submissionId = 1001) =>
  ok({ submissionId, probId, submissionStatus: "PENDING", problemType }, "접수되었습니다.");

// GET /api/submissions/{submissionId}/status
// 폴링 테스트용: 호출 횟수(tick)에 따라 PENDING → JUDGING → COMPLETED로 진행한다.
const STATUS_STEPS = [
  { submissionStatus: "PENDING", progress: 0 },
  { submissionStatus: "JUDGING", progress: 60 },
  { submissionStatus: "COMPLETED", progress: 100 },
] as const;

export const getMockSubmissionStatus = (submissionId: number, probId: number, probType: ProblemType, tick: number) => {
  const step = STATUS_STEPS[Math.min(tick, STATUS_STEPS.length - 1)];
  // submissionId는 이 API에서만 문자열로 내려온다
  return ok({ submissionId: String(submissionId), probId, probType, ...step }, "채점 상태 조회에 성공하였습니다.");
};

// GET /api/submissions/{submissionId}/result — isCorrect와 correct가 같이 내려온다
export const mockObjectiveResultResponse = ok(
  {
    submissionId: 1001, probId: 5, probType: "objective", isCorrect: true, correct: true,
    selectedAnswers: [2], submittedAt: "2026-10-29T13:52:36", judgedAt: "2026-10-29T13:52:37",
  },
  "채점 결과 조회에 성공하였습니다."
);

export const mockCodingResultResponse = ok(
  {
    submissionId: 1002, probId: 1, probType: "coding", language: "python", isCorrect: true, correct: true,
    score: 100, runtime: 35, memoryUsage: 9200, codeSize: 41,
    submittedAt: "2026-10-29T13:50:00", judgedAt: "2026-10-29T13:50:03",
    code: "n, q = map(int, input().split())\nprint('3.67')",
  },
  "채점 결과 조회에 성공하였습니다."
);

export const mockPracticeResultResponse = ok(
  {
    submissionId: 1003, probId: 6, probType: "practice", isCorrect: false, correct: false,
    submittedAt: "2026-10-29T13:40:00", judgedAt: "2026-10-29T13:40:01",
  },
  "채점 결과 조회에 성공하였습니다."
);

// GET /api/problems/{probId}/board — COMPLETED 제출만
const nicknames = [ME.nickname, "AlgorithmMaster", "CodeNewbie", "FastCoder", "PythonLover", "유닉스장인"];

export const mockCodingBoardResponse = ok(
  {
    probId: 1,
    total: 8,
    submissions: [
      { lang: "python", ok: true, rt: 35, mem: 9200, size: 412 },
      { lang: "cpp", ok: false, rt: 4, mem: 1020, size: 980 },
      { lang: "python", ok: false, rt: 2000, mem: 9800, size: 388 },
      { lang: "c", ok: true, rt: 0, mem: 980, size: 1104 },
      { lang: "cpp", ok: true, rt: 4, mem: 2024, size: 870 },
      { lang: "python", ok: false, rt: 52, mem: 9100, size: 301 },
      { lang: "c", ok: true, rt: 1, mem: 1120, size: 1250 },
      { lang: "python", ok: true, rt: 40, mem: 9400, size: 455 },
    ].map((s, i) => ({
      submissionId: 1100 - i,
      nickname: nicknames[i % nicknames.length],
      language: s.lang,
      isCorrect: s.ok,
      score: s.ok ? 100 : 0,
      runtime: s.rt,
      memoryUsage: s.mem,
      codeSize: s.size,
      submittedAt: `2026-10-29T1${3 - Math.floor(i / 3)}:${String(50 - i * 5).padStart(2, "0")}:00`,
      judgedAt: `2026-10-29T1${3 - Math.floor(i / 3)}:${String(50 - i * 5).padStart(2, "0")}:03`,
    })),
  },
  "채점 보드 조회에 성공하였습니다."
);

// 객관식/실습 보드
export const mockObjectiveBoardResponse = ok(
  {
    probId: 5,
    total: 5,
    submissions: [true, false, false, true, false].map((isCorrect, i) => ({
      submissionId: 1200 - i,
      nickname: nicknames[i % nicknames.length],
      isCorrect,
      submittedAt: `2026-10-28T2${i}:00:00`,
      judgedAt: `2026-10-28T2${i}:00:01`,
    })),
  },
  "채점 보드 조회에 성공하였습니다."
);
