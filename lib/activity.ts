// 홈 '실시간 탐사 로그': /api/activity/recent (공개 문제의 최근 채점 결과)
export type ActivityItem = {
  resultId: number;
  resultStatus: string;
  submittedAt: string | null;
  userId: number;
  nickname: string;
  probId: number;
  title: string;
};

export const ACTIVITY_URL = "https://diveon.net/api/activity/recent?limit=8";
export const ACTIVITY_POLL_MS = 30_000;

const STATUS: Record<string, { code: string; tone: "success" | "danger" | "warning" }> = {
  CORRECT: { code: "AC", tone: "success" },
  WRONG: { code: "WA", tone: "danger" },
  ERROR: { code: "ERR", tone: "warning" },
};

export function activityStatus(status: string) {
  return STATUS[status] ?? { code: status.slice(0, 3).toUpperCase() || "?", tone: "warning" as const };
}

const pad = (n: number) => String(n).padStart(2, "0");

// 서버 시각(서울 시간, 시간대 표기 없음)을 그대로 읽는다. 오늘이면 시:분:초, 아니면 월/일 시:분.
export function activityTime(value: string | null | undefined, now = new Date()): string {
  if (!value) return "--:--:--";
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(value);
  if (!m) return "--:--:--";
  const [, y, mo, d, h, mi, s = "00"] = m;
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return `${y}-${mo}-${d}` === today ? `${h}:${mi}:${s}` : `${mo}/${d} ${h}:${mi}`;
}

export function parseActivity(json: unknown): ActivityItem[] {
  const list = (json as { data?: { activities?: unknown } } | null)?.data?.activities;
  if (!Array.isArray(list)) return [];
  return list.filter((a): a is ActivityItem =>
    !!a && typeof a === "object" && typeof (a as ActivityItem).resultId === "number" && typeof (a as ActivityItem).probId === "number");
}
