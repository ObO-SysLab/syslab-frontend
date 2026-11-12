"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Flame } from "lucide-react";
import { ACTIVITY_POLL_MS, ACTIVITY_URL, activityStatus, activityTime, parseActivity, type ActivityItem } from "@/lib/activity";

const TONE: Record<string, string> = {
  success: "text-success",
  danger: "text-danger",
  warning: "text-warning",
};

// 공개 문제의 최근 채점 결과. 화면이 보일 때만 30초마다 새로 받는다. 기록이 없으면 그리지 않는다.
export function ActivityLog() {
  const [items, setItems] = useState<ActivityItem[]>([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(ACTIVITY_URL);
        if (!res.ok) return;
        const rows = parseActivity(await res.json().catch(() => null));
        if (alive) setItems(rows);
      } catch {
        // 다음 주기에 다시 받는다
      }
    };
    load();
    const timer = setInterval(load, ACTIVITY_POLL_MS);
    document.addEventListener("visibilitychange", load);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="space-y-5">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <Flame className="w-5 h-5 text-warning" /> 실시간 탐사 로그
      </h2>
      <div className="dv-dark-scope overflow-hidden rounded-xl border border-line bg-term font-mono text-[13px] leading-6">
        <div className="flex items-center h-9 px-4 bg-panel border-b border-line text-ink-muted text-xs">
          <span className="truncate">diveon@abyss:~/events</span>
        </div>
        <ol className="p-4 space-y-1 text-[#D7E6F5]">
          {items.map((a) => {
            const status = activityStatus(a.resultStatus);
            return (
              <li key={a.resultId} className="min-w-0">
                <Link
                  href={`/challenges/detail?id=${a.probId}`}
                  className="flex items-baseline gap-2 rounded px-1 -mx-1 hover:bg-white/5 transition-colors"
                >
                  <span className="text-[#8DA3BA] shrink-0">{activityTime(a.submittedAt)}</span>
                  <span className={`font-semibold shrink-0 w-8 ${TONE[status.tone]}`}>{status.code}</span>
                  <b className="shrink-0 max-w-[10rem] truncate">{a.nickname}</b>
                  <span className="text-[#8DA3BA] shrink-0">·</span>
                  <span className="truncate">
                    <span className="text-[#8DA3BA]">#{a.probId}</span> {a.title}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
