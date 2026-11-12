"use client";

import { useEffect, useState } from "react";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { authHeaders, requestJson, RequestFailure } from "@/lib/request";
import { DEFAULT_PREFS, NOTIFICATION_API, type NotificationPrefs } from "@/lib/notifications";

const ROWS: { key: keyof NotificationPrefs; title: string; desc: string }[] = [
  { key: "solveCorrect", title: "정답 알림", desc: "제출한 답이 정답으로 채점되면 알려요." },
  { key: "comment", title: "댓글 알림", desc: "내 문제·댓글·게시글에 댓글이 달리면 알려요." },
  { key: "contestStart", title: "대회 시작 알림", desc: "참가한 대회가 시작하기 1시간 전에 알려요." },
];

// 알림 설정: 바꾸면 바로 저장하고, 실패하면 되돌린다.
export function NotificationPrefsSection() {
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<keyof NotificationPrefs | null>(null);

  useEffect(() => {
    requestJson<{ data: NotificationPrefs }>(`${NOTIFICATION_API}/settings`, { headers: authHeaders() })
      .then((json) => setPrefs({ ...DEFAULT_PREFS, ...(json?.data ?? {}) }))
      .catch((e) => setError(e instanceof RequestFailure ? e.issue.message : "알림 설정을 불러오지 못했습니다."));
  }, []);

  const toggle = async (key: keyof NotificationPrefs, value: boolean) => {
    if (!prefs) return;
    const before = prefs;
    setPrefs({ ...prefs, [key]: value });
    setSaving(key);
    setError("");
    try {
      const json = await requestJson<{ data: NotificationPrefs }>(`${NOTIFICATION_API}/settings`, {
        method: "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      if (json?.data) setPrefs({ ...DEFAULT_PREFS, ...json.data });
    } catch (e) {
      setPrefs(before);
      setError(e instanceof RequestFailure ? e.issue.message : "저장하지 못했습니다.");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <div className="space-y-1">
        <h3 className="text-xl font-bold">알림 설정</h3>
        <p className="text-sm text-ink-muted">헤더의 알림 종으로 받을 알림을 고릅니다.</p>
      </div>
      <Separator />
      {error && <p className="rounded-xl border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}
      <div className="space-y-4">
        {ROWS.map((row) => (
          <label key={row.key} className="flex items-center justify-between gap-4 p-4 border rounded-xl hover:bg-raised/60 transition-colors cursor-pointer">
            <span className="space-y-0.5">
              <span className="block text-sm font-bold text-ink">{row.title}</span>
              <span className="block text-xs text-ink-muted">{row.desc}</span>
            </span>
            <Switch
              checked={prefs?.[row.key] ?? DEFAULT_PREFS[row.key]}
              disabled={!prefs || saving !== null}
              onCheckedChange={(v) => toggle(row.key, v)}
              aria-label={row.title}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
