// 알림: /api/notifications
export type NotificationItem = {
  id: number;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

export type NotificationPage = { total: number; unreadCount: number; page: number; size: number; notifications: NotificationItem[] };
export type NotificationPrefs = { solveCorrect: boolean; comment: boolean; contestStart: boolean };

export const NOTIFICATION_API = "https://diveon.net/api/notifications";
export const UNREAD_POLL_MS = 60_000;

export const DEFAULT_PREFS: NotificationPrefs = { solveCorrect: true, comment: true, contestStart: false };

// 서버 시각(서울 시간, 시간대 표기 없음) 기준 상대 시간
export function relativeTime(value: string, now = new Date()): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(value);
  if (!m) return "";
  const at = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6] ?? 0));
  const sec = Math.max(0, Math.floor((now.getTime() - at.getTime()) / 1000));
  if (sec < 60) return "방금";
  if (sec < 3600) return `${Math.floor(sec / 60)}분 전`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}시간 전`;
  if (sec < 86400 * 7) return `${Math.floor(sec / 86400)}일 전`;
  return `${m[2]}/${m[3]}`;
}

// 알림 링크는 우리 사이트 안쪽 경로만 따라간다.
export function safeLink(link: string | null | undefined): string | null {
  return link && link.startsWith("/") && !link.startsWith("//") ? link : null;
}

export function badgeCount(unread: number): string {
  return unread > 99 ? "99+" : String(unread);
}
