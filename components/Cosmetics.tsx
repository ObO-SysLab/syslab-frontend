"use client";

import type { ReactNode } from "react";
import { frameClass } from "@/lib/cosmetics";

// 아바타 테두리: 상점에서 착용한 테두리를 감싼 요소에 둘러 준다.
export function CosmeticFrame({ frame, className = "", children }: { frame?: string | null; className?: string; children: ReactNode }) {
  return <span className={`inline-flex shrink-0 rounded-full ${frameClass(frame)} ${className}`}>{children}</span>;
}

const TITLE_TONE: Record<string, string> = {
  "title-binary-hunter": "border-success/40 bg-success-soft text-success",
  "title-root-access": "border-danger/40 bg-danger-soft text-danger",
};

// 칭호: 닉네임 옆 작은 배지
export function UserTitle({ title, name, className = "" }: { title?: string | null; name?: string | null; className?: string }) {
  if (!title || !name) return null;
  const tone = TITLE_TONE[title] ?? "border-line-strong bg-raised text-ink-muted";
  return (
    <span className={`inline-flex items-center h-[18px] px-1.5 rounded border text-[10px] font-bold font-mono tracking-tight whitespace-nowrap ${tone} ${className}`}>
      {name}
    </span>
  );
}
