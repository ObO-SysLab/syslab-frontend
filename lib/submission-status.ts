export function isSubmissionPending(item: {
  submissionStatus?: string; isCorrect?: boolean | null; _isPending?: boolean;
}): boolean {
  if (item.submissionStatus === "FAILED" || item.submissionStatus === "COMPLETED") return false;
  return item.submissionStatus === "PENDING" || item.submissionStatus === "JUDGING"
    || item._isPending === true || item.isCorrect === null;
}
