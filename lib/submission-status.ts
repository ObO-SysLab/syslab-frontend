export type SubmissionResult = {
  submissionStatus?: string;
  resultStatus?: string | null;
  isCorrect?: boolean | null;
  _isPending?: boolean;
};

export function isSubmissionPending(item: SubmissionResult): boolean {
  if (item.submissionStatus === "FAILED" || item.submissionStatus === "COMPLETED") return false;
  return item.submissionStatus === "PENDING" || item.submissionStatus === "JUDGING"
    || item._isPending === true || item.isCorrect === null;
}

export type SubmissionVerdict = {
  kind: "pending" | "correct" | "wrong" | "error" | "failed" | "unknown";
  label: string;
  hint?: string;
};

/** Lifecycle and explicit server verdicts take precedence over legacy booleans. */
export function submissionVerdict(item: SubmissionResult | null | undefined): SubmissionVerdict {
  if (item?.submissionStatus === "FAILED") return {kind: "failed", label: "채점 실패"};
  if (item?.submissionStatus === "PENDING" || item?.submissionStatus === "JUDGING") {
    return {kind: "pending", label: "채점 중"};
  }
  if (item && Object.prototype.hasOwnProperty.call(item, "resultStatus")) {
    if (item.resultStatus === "CORRECT") return {kind: "correct", label: "정답"};
    if (item.resultStatus === "WRONG") return {kind: "wrong", label: "오답"};
    if (item.resultStatus === "ERROR") return {kind: "error", label: "코드 오류", hint: "컴파일 또는 실행 중 오류"};
    return {kind: "unknown", label: "결과 확인 필요"};
  }
  if (item?.isCorrect === true) return {kind: "correct", label: "정답"};
  if (item?.isCorrect === false) return {kind: "wrong", label: "오답"};
  return {kind: "unknown", label: "결과 확인 필요"};
}

/**
 * Watched submissions (the user's own, seen while still grading) that now have a final verdict.
 * `settled` can stop being watched; `solved` is whether any of them is correct.
 */
export function settledSubmissions(watched: ReadonlySet<string>,
    items: readonly (SubmissionResult & { submissionId?: string | number })[]) {
  const settled: string[] = [];
  let solved = false;
  for (const id of watched) {
    const item = items.find(entry => String(entry.submissionId) === id);
    if (!item) continue;
    const kind = submissionVerdict(item).kind;
    if (kind === "pending" || kind === "unknown") continue;
    settled.push(id);
    if (kind === "correct") solved = true;
  }
  return { settled, solved };
}
