"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AUTH_CHANGED } from "@/lib/authSession";
import { authHeaders } from "@/lib/request";
import {
  NOTIFICATION_API, UNREAD_POLL_MS, badgeCount, relativeTime, safeLink,
  type NotificationItem, type NotificationPage,
} from "@/lib/notifications";

const getJson = async <T,>(url: string): Promise<T | null> => {
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) return null;
  return res.json().catch(() => null);
};

// 헤더 알림 종: 안 읽은 개수는 60초마다·창이 다시 활성화될 때 새로 받고, 누르면 최근 알림을 보여 준다.
export function NotificationBell() {
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [error, setError] = useState(false);

  const refreshCount = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    try {
      const json = await getJson<{ data?: { unreadCount?: number } }>(`${NOTIFICATION_API}/unread-count`);
      if (typeof json?.data?.unreadCount === "number") setUnread(json.data.unreadCount);
    } catch {
      // 다음 주기에 다시 받는다
    }
  }, []);

  const loadList = useCallback(async () => {
    setError(false);
    try {
      const json = await getJson<{ data?: NotificationPage }>(`${NOTIFICATION_API}?page=1&size=10`);
      if (!json?.data) { setError(true); return; }
      setItems(json.data.notifications);
      setUnread(json.data.unreadCount);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    refreshCount();
    const timer = setInterval(refreshCount, UNREAD_POLL_MS);
    window.addEventListener("focus", refreshCount);
    window.addEventListener(AUTH_CHANGED, refreshCount);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refreshCount);
      window.removeEventListener(AUTH_CHANGED, refreshCount);
    };
  }, [refreshCount]);

  useEffect(() => { if (open) loadList(); }, [open, loadList]);

  const openItem = async (n: NotificationItem) => {
    if (!n.read) {
      setItems((list) => list?.map((x) => (x.id === n.id ? { ...x, read: true } : x)) ?? null);
      setUnread((u) => Math.max(0, u - 1));
      fetch(`${NOTIFICATION_API}/${n.id}/read`, { method: "PATCH", headers: authHeaders() }).catch(() => {});
    }
    const link = safeLink(n.link);
    if (link) { setOpen(false); router.push(link); }
  };

  const readAll = async () => {
    const res = await fetch(`${NOTIFICATION_API}/read-all`, { method: "PATCH", headers: authHeaders() }).catch(() => null);
    if (res?.ok) {
      setItems((list) => list?.map((x) => ({ ...x, read: true })) ?? null);
      setUnread(0);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative p-2 hover:bg-raised rounded-full text-ink-muted hover:text-ink transition-colors"
          aria-label={unread > 0 ? `알림 ${unread}개 안 읽음` : "알림"}
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-[10px] font-bold leading-[18px] text-white text-center ring-2 ring-canvas">
              {badgeCount(unread)}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 h-11 border-b border-line">
          <b className="text-sm">알림</b>
          <button
            type="button"
            onClick={readAll}
            disabled={unread === 0}
            className="text-xs font-semibold text-primary hover:text-primary-hover disabled:text-ink-subtle"
          >
            모두 읽음
          </button>
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          {error ? (
            <p className="px-4 py-8 text-center text-sm text-ink-subtle">알림을 불러오지 못했어요.</p>
          ) : items === null ? (
            <p className="px-4 py-8 text-center text-sm text-ink-subtle">불러오는 중...</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-subtle">새 알림이 없어요.</p>
          ) : (
            <ul className="divide-y divide-line">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => openItem(n)}
                    className={`w-full text-left px-4 py-3 hover:bg-raised/60 transition-colors ${n.read ? "" : "bg-primary/5"}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                        {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />}
                        {n.title}
                      </span>
                      <span className="text-[11px] text-ink-subtle shrink-0">{relativeTime(n.createdAt)}</span>
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-muted line-clamp-2">{n.body}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
