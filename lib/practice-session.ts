/** Remaining practice time as H:MM:SS (sessions last up to two hours). */
export function formatRemaining(seconds: number): string {
  const total = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

type ResultOptions = { attempts?: number; delayMs?: number; sleep?: (ms: number) => Promise<void> };

/**
 * Whether a practice flag submission was correct. Practice grading finishes within the submit request,
 * so the first read normally answers; a few short retries cover a slow commit. null = still unknown.
 */
export async function readFlagResult(submissionId: number, token: string | null,
    { attempts = 5, delayMs = 1000, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)) }: ResultOptions = {}) {
  if (!Number.isSafeInteger(submissionId) || submissionId <= 0 || !token) return null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) await sleep(delayMs);
    try {
      const response = await fetch(`https://diveon.net/api/submissions/${submissionId}/result`, {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
      });
      if (!response.ok) continue;
      const verdict = (await response.json())?.data?.isCorrect;
      if (typeof verdict === "boolean") return verdict;
    } catch {
      // Retry; the caller keeps the practice environment when the answer stays unknown.
    }
  }
  return null;
}
