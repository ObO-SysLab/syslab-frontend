export type ContestSubmission = {
  submissionId: number;
  solveSubmissionId: number | null;
  submissionStatus: "PENDING" | "JUDGING" | "COMPLETED" | "FAILED";
  isCorrect: boolean | null;
  submittedAt: string;
  nickname: string;
  language: string | null;
  runtime: number | null;
  memoryUsage: number | null;
};

export type ContestBoard = {
  contestId: number;
  contestProblemId: number;
  probId: number;
  currentTotalScore: number;
  page: number;
  totalPages: number;
  total: number;
  submissions: ContestSubmission[];
};

const validId = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) > 0;

export function contestBoardUrl(contestId: number, contestProblemId: number, page: number) {
  if (![contestId, contestProblemId, page].every(validId)) throw new Error("대회 식별 정보가 올바르지 않습니다.");
  return `https://diveon.net/api/contests/${contestId}/problems/${contestProblemId}/board?page=${page}&size=50`;
}

export function readContestBoard(value: unknown, contestId: number, contestProblemId: number): ContestBoard {
  const board = value as ContestBoard | null;
  if (!board || board.contestId !== contestId || board.contestProblemId !== contestProblemId
      || !validId(board.probId) || !validId(board.page) || !Number.isInteger(board.totalPages) || board.totalPages < 0
      || !Number.isInteger(board.total) || board.total < 0 || !Number.isFinite(board.currentTotalScore)
      || !Array.isArray(board.submissions)) throw new Error("대회 결과를 확인할 수 없습니다.");
  const ids = new Set<number>();
  for (const row of board.submissions) {
    if (!validId(row.submissionId) || ids.has(row.submissionId)
        || (row.solveSubmissionId !== null && !validId(row.solveSubmissionId))
        || !["PENDING", "JUDGING", "COMPLETED", "FAILED"].includes(row.submissionStatus)
        || (row.isCorrect !== null && typeof row.isCorrect !== "boolean")) {
      throw new Error("대회 제출 정보를 확인할 수 없습니다.");
    }
    ids.add(row.submissionId);
  }
  return board;
}

export function contestBoardPending(board: ContestBoard) {
  return board.submissions.some(row => row.submissionStatus === "PENDING" || row.submissionStatus === "JUDGING");
}

export function contestResultLabel(row: Pick<ContestSubmission, "submissionStatus" | "isCorrect">) {
  if (row.submissionStatus === "FAILED") return "채점 실패 · 잠시 후 다시 제출해주세요";
  if (row.submissionStatus === "PENDING" || row.submissionStatus === "JUDGING") return "채점 중";
  if (row.isCorrect === null) return "결과 확인 필요";
  return row.isCorrect ? "정답" : "오답";
}

export function contestCodingLinks(type: string, row: ContestSubmission) {
  if(type==='objective' && row.submissionStatus==='COMPLETED' && validId(row.submissionId))
    return {code:null,obo:`/challenges/obo?contestSubmissionId=${row.submissionId}`};
  if (type !== "coding" || row.submissionStatus !== "COMPLETED" || !validId(row.solveSubmissionId)) return null;
  return { code: `/challenges/submissions?id=${row.solveSubmissionId}`, obo: `/challenges/obo?id=${row.solveSubmissionId}` };
}

/** One request at a time; a disposed page cannot publish late results or schedule new polling. */
export function watchContestBoard(options: {
  contestId: number; contestProblemId: number; page: number; token: string | null;
  onBoard: (board: ContestBoard) => void; onError: (message: string) => void;
}) {
  let closed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let request: AbortController | undefined;
  const load = async () => {
    let retry = false;
    request = new AbortController();
    const deadline = setTimeout(() => request?.abort(), 10000);
    try {
      if (!options.token) throw new Error("로그인이 필요합니다.");
      const response = await fetch(contestBoardUrl(options.contestId, options.contestProblemId, options.page), {
        headers: { Authorization: `Bearer ${options.token}` }, signal: request.signal, cache: "no-store",
      });
      if (closed) return;
      if (!response.ok) {
        retry = response.status >= 500 || response.status === 429;
        throw new Error("대회 제출 결과를 불러오지 못했습니다.");
      }
      const board = readContestBoard((await response.json()).data, options.contestId, options.contestProblemId);
      if (closed) return;
      options.onBoard(board);
      if (contestBoardPending(board)) timer = setTimeout(load, 1500);
    } catch (error) {
      if (closed) return;
      options.onError(error instanceof Error && error.name !== "AbortError" ? error.message : "대회 결과 조회가 지연되고 있습니다.");
      if (retry || (error instanceof Error && (error.name === "AbortError" || error instanceof TypeError))) timer = setTimeout(load, 5000);
    } finally { clearTimeout(deadline); }
  };
  void load();
  return () => { closed = true; clearTimeout(timer); request?.abort(); };
}
