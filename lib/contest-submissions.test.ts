import { afterEach, describe, expect, it, vi } from "vitest";
import { contestBoardUrl, contestBoardPending, readContestBoard, contestCodingLinks, contestResultLabel,
  watchContestBoard, type ContestBoard, type ContestSubmission } from "./contest-submissions";

const submission = (overrides: Partial<ContestSubmission> = {}): ContestSubmission => ({
  submissionId: 17, solveSubmissionId: null, submissionStatus: "COMPLETED", isCorrect: true,
  nickname: "me", userTier: 1, hasObo: false, submittedAt: "2026-10-30T00:00:00", language: null, runtime: null, memoryUsage: null, ...overrides,
});

describe("contest board refresh lifecycle", () => {
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
  const options = () => ({ contestId: 1, contestProblemId: 9, page: 1, token: "login", onBoard: vi.fn(), onError: vi.fn() });
  const ok = (value: ContestBoard) => ({ ok: true, json: async () => ({ data: value }) });
  it("refreshes pending coding then stops when the committed board is complete", async () => {
    vi.useFakeTimers(); const callbacks = options();
    const fetcher = vi.fn().mockResolvedValueOnce(ok(board(submission({ submissionStatus: "PENDING", isCorrect: null }))))
      .mockResolvedValue(ok(board())); vi.stubGlobal("fetch", fetcher);
    const stop = watchContestBoard(callbacks);
    await vi.advanceTimersByTimeAsync(0); await vi.advanceTimersByTimeAsync(1500); await vi.advanceTimersByTimeAsync(10000);
    expect(fetcher).toHaveBeenCalledTimes(2); expect(callbacks.onBoard).toHaveBeenLastCalledWith(board()); stop();
  });
  it("does not poll an immediate result", async () => {
    vi.useFakeTimers(); const fetcher = vi.fn().mockResolvedValue(ok(board())); vi.stubGlobal("fetch", fetcher);
    const stop = watchContestBoard(options()); await vi.advanceTimersByTimeAsync(15000);
    expect(fetcher).toHaveBeenCalledTimes(1); stop();
  });
  it("ignores late responses after leaving or changing contests", async () => {
    vi.useFakeTimers(); const callbacks = options(); let resolve!: (response: unknown) => void;
    const fetcher = vi.fn(() => new Promise(r => { resolve = r; })); vi.stubGlobal("fetch", fetcher);
    const stop = watchContestBoard(callbacks); stop(); resolve(ok(board())); await vi.advanceTimersByTimeAsync(15000);
    expect(callbacks.onBoard).not.toHaveBeenCalled(); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("clears denied content through the error callback and stops retrying", async () => {
    vi.useFakeTimers(); const callbacks = options(); const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    vi.stubGlobal("fetch", fetcher); const stop = watchContestBoard(callbacks); await vi.advanceTimersByTimeAsync(15000);
    expect(callbacks.onError).toHaveBeenCalled(); expect(callbacks.onBoard).not.toHaveBeenCalled();
    expect(fetcher).toHaveBeenCalledTimes(1); stop();
  });
  it("retries a temporary failure and preserves the successful server result", async () => {
    vi.useFakeTimers(); const callbacks = options(); const fetcher = vi.fn().mockResolvedValueOnce({ ok: false, status: 503 }).mockResolvedValue(ok(board()));
    vi.stubGlobal("fetch", fetcher); const stop = watchContestBoard(callbacks); await vi.advanceTimersByTimeAsync(5000);
    expect(callbacks.onError).toHaveBeenCalled(); expect(callbacks.onBoard).toHaveBeenCalledWith(board()); stop();
  });
});
const board = (row = submission()): ContestBoard => ({
  contestId: 1, contestProblemId: 9, probId: 2, page: 1, totalPages: 1, total: 1, currentTotalScore: 100, submissions: [row],
});
describe("contest results remain in the contest namespace", () => {
  it("addresses both contest and contest problem, not the generic problem board", () => {
    expect(contestBoardUrl(1, 9, 2)).toBe("https://diveon.net/api/contests/1/problems/9/board?page=2&size=50");
  });
  it.each([0, -1, NaN, 1.5])("rejects invalid route identity %s", id => expect(() => contestBoardUrl(id, 9, 1)).toThrow());
  it("rejects a response belonging to another contest or problem", () => {
    expect(() => readContestBoard(board(), 2, 9)).toThrow(); expect(() => readContestBoard(board(), 1, 8)).toThrow();
  });
  it("completed practice/objective results survive a fresh board load without pending storage", () => {
    for (const correct of [true, false]) {
      const result = readContestBoard(JSON.parse(JSON.stringify(board(submission({ isCorrect: correct })))), 1, 9);
      expect(contestBoardPending(result)).toBe(false); expect(contestResultLabel(result.submissions[0])).toBe(correct ? "정답" : "오답");
      expect(result.currentTotalScore).toBe(100);
    }
  });
  it.each(["PENDING", "JUDGING"] as const)("continues polling %s", submissionStatus => {
    expect(contestBoardPending(board(submission({ submissionStatus, isCorrect: null })))).toBe(true);
  });
  it("stops polling failed results with no verdict and does not label them wrong", () => {
    const row = submission({ submissionStatus: "FAILED", isCorrect: null });
    expect(contestBoardPending(board(row))).toBe(false); expect(contestResultLabel(row)).toContain("채점 실패");
  });
  it("a missing terminal verdict is not fabricated", () => {
    expect(contestResultLabel(submission({ isCorrect: null }))).toBe("결과 확인 필요");
  });
  it.each([
    ['CORRECT', '정답'], ['WRONG', '오답'], ['ERROR', '코드 오류'],
    [null, '결과 확인 필요'], ['UNKNOWN', '결과 확인 필요'],
  ])('preserves explicit result %s through a fresh board load', (resultStatus, label) => {
    const value = board(submission({resultStatus, isCorrect: false}));
    const result = readContestBoard(JSON.parse(JSON.stringify(value)), 1, 9);
    expect(contestResultLabel(result.submissions[0])).toBe(label);
    expect(contestBoardPending(result)).toBe(false);
    expect(result.submissions[0].resultStatus).toBe(resultStatus);
  });
  it("uses only the linked solve ID in code/OBO links", () => {
    expect(contestCodingLinks("coding", submission({ solveSubmissionId: 92, hasObo: true }))).toEqual({
      code: "/challenges/submissions?id=92", obo: "/challenges/obo?id=92",
    });
  });
  it("keeps code access for plain coding submissions without an OBO link", () => {
    expect(contestCodingLinks("coding", submission({ solveSubmissionId: 92, hasObo: false }))).toEqual({
      code: "/challenges/submissions?id=92", obo: null,
    });
  });
  it("uses the submission snapshot flag even when the current problem no longer has OBO", () => {
    const currentProblem = { type: "coding", oboContract: null };
    expect(contestCodingLinks(currentProblem.type, submission({ solveSubmissionId: 92, hasObo: true }))?.obo)
      .toBe("/challenges/obo?id=92");
  });
  it("uses the dedicated contest route for completed objective submissions", () => {
    expect(contestCodingLinks('objective', submission())).toEqual({code:null,obo:`/challenges/obo?contestSubmissionId=${submission().submissionId}`});
    expect(contestCodingLinks('practice', submission())).toBeNull();
  });
  it("missing linked ID or failed coding result has no generic result link", () => {
    expect(contestCodingLinks("coding", submission())).toBeNull();
    expect(contestCodingLinks("coding", submission({ solveSubmissionId: 92, submissionStatus: "FAILED" }))).toBeNull();
  });
  it("rejects duplicate or ambiguous IDs", () => {
    expect(() => readContestBoard({ ...board(), submissions: [submission(), submission()] }, 1, 9)).toThrow();
    expect(() => readContestBoard(board(submission({ submissionId: NaN })), 1, 9)).toThrow();
  });
});
