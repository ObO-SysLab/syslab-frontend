// Diveon 디자인 시스템 React 래퍼 (스타일은 app/globals.css 의 dv- 클래스)
// 참고: theme/diveon-design-system/components/*.md

import { Activity, Code2, Cpu, Database, FileCode2, GitBranch } from "lucide-react";
import { categoryLabel, cn, getDepthZone, getLevelLabel, getTierKey, getTierLabel, toApiCategory } from "@/lib/utils";
import { critterLayers, pickCritter, type CritterScope } from "@/lib/seaCritter";

/* ---------------- DepthBadge: 난이도 = 수심. 색 + 7칸 눈금 ---------------- */
export function DepthBadge({
  level,
  showZone = false,
  size = "md",
  className,
}: {
  level: string | number | null | undefined;
  showZone?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const n = Number(level);
  const lv = Number.isFinite(n) && n >= 1 && n <= 7 ? Math.round(n) : 0;
  return (
    <span
      className={cn("dv-depth", size === "sm" && "dv-depth--sm", className)}
      data-lv={lv}
      title={lv ? `Lv.${lv} · ${getLevelLabel(lv)} ${getDepthZone(lv)}` : "Unranked"}
    >
      <span className="dv-depth__ticks" aria-hidden="true">
        {Array.from({ length: 7 }, (_, i) => (
          <i key={i} className={i < lv ? "on" : undefined} />
        ))}
      </span>
      {lv ? (
        <>
          Lv.{lv} · {getLevelLabel(lv)}
          {showZone && <span className="dv-depth__zone">{getDepthZone(lv)}</span>}
        </>
      ) : (
        "Unranked"
      )}
    </span>
  );
}

/* ---------------- TierBadge: PADI 다이버 자격 ---------------- */
const PADI_RANK: Record<string, string> = {
  bronze: "Open Water Diver",
  silver: "Advanced Open Water",
  gold: "Rescue Diver",
  platinum: "Master Scuba Diver",
  diamond: "Divemaster",
  master: "OW Scuba Instructor",
  challenger: "Course Director",
};

export function TierBadge({
  tier,
  showRank = true,
  size = "md",
  className,
}: {
  tier: string | number | null | undefined;
  showRank?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const key = getTierKey(tier ?? "");
  return (
    <span className={cn("dv-tier", size === "sm" && "dv-tier--sm", className)} data-tier={key ?? undefined}>
      <span className="dv-tier__emblem" aria-hidden="true" />
      <span className="min-w-0">
        <span className="dv-tier__name">{key ? getTierLabel(tier ?? "") : "Unranked"}</span>
        {showRank && key && <span className="dv-tier__rank">{PADI_RANK[key]}</span>}
      </span>
    </span>
  );
}

/* ---------------- StatusIcon: 해결(체크) / 시도(반원) / 미시도(점선) ---------------- */
export function StatusIcon({ status, className }: { status: "solved" | "tried" | "none"; className?: string }) {
  if (status === "solved")
    return (
      <svg className={cn("dv-status dv-status--solved", className)} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-label="해결">
        <circle cx="9" cy="9" r="7.5" />
        <path d="m5.8 9.2 2.2 2.2 4.2-4.6" />
      </svg>
    );
  if (status === "tried")
    return (
      <svg className={cn("dv-status dv-status--tried", className)} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-label="시도">
        <circle cx="9" cy="9" r="7.5" />
        <path d="M9 1.5a7.5 7.5 0 0 1 0 15z" fill="currentColor" stroke="none" />
      </svg>
    );
  return (
    <svg className={cn("dv-status", className)} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2.6" aria-label="미시도">
      <circle cx="9" cy="9" r="7.5" />
    </svg>
  );
}

/* ---------------- TypeChip: 객관식 / 코딩 / 실습 ---------------- */
export function TypeChip({ type, className }: { type: string; className?: string }) {
  const t = (type || "").toLowerCase();
  const label = t === "objective" ? "객관식" : t === "coding" ? "코딩" : t === "practice" ? "실습" : type;
  return (
    <span className={cn("inline-flex items-center gap-1 h-[22px] px-2 rounded-md bg-raised text-ink-muted text-xs font-medium whitespace-nowrap", className)}>
      {t === "objective" && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="6" cy="6" r="4.5" /><circle cx="6" cy="6" r="1.8" fill="currentColor" stroke="none" /></svg>
      )}
      {t === "coding" && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 3 1.5 6 4 9M8 3l2.5 3L8 9" /></svg>
      )}
      {t === "practice" && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="1.5" y="2" width="9" height="8" rx="1.5" /><path d="m3.5 5 1.5 1.2L3.5 7.4M6.5 7.5h2" /></svg>
      )}
      {label}
    </span>
  );
}

/* ---------------- CategoryChip: 문제 카테고리 (TypeChip과 같은 모양) ---------------- */
const CATEGORY_ICON: Record<string, typeof Cpu> = { Kernel: Cpu, Process: Activity, Thread: GitBranch, Memory: Database, FileSystem: FileCode2 };

export function CategoryChip({ category, className }: { category: string; className?: string }) {
  const Icon = CATEGORY_ICON[toApiCategory(category)] ?? Code2;
  return (
    <span className={cn("inline-flex items-center gap-1 h-[22px] px-2 rounded-md bg-raised text-ink-muted text-xs font-medium whitespace-nowrap", className)}>
      <Icon size={12} aria-hidden="true" />
      {categoryLabel(category)}
    </span>
  );
}

/* ---------------- Verdict: 채점 결과 배너 ---------------- */
export type VerdictKind = "ac" | "wa" | "tle" | "re" | "ce" | "judging";

const VERDICT_META: Record<VerdictKind, { code: string; title: string }> = {
  ac: { code: "AC", title: "도달했어요!" },
  wa: { code: "WA", title: "산소가 부족해요" },
  tle: { code: "TLE", title: "하강이 너무 오래 걸렸어요" },
  re: { code: "RE", title: "수압을 버티지 못했어요" },
  ce: { code: "CE", title: "장비 점검이 필요해요" },
  judging: { code: "…", title: "하강 중" },
};

export function Verdict({
  kind,
  code,
  title,
  line,
  children,
  className,
}: {
  kind: VerdictKind;
  code?: string;
  title?: string;
  line?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const meta = VERDICT_META[kind];
  return (
    <div role="status" className={cn("dv-verdict", kind !== "ac" && `dv-verdict--${kind}`, className)}>
      <span className="dv-verdict__code">{code ?? meta.code}</span>
      <div className="dv-verdict__body">
        <p className="dv-verdict__title">{title ?? meta.title}</p>
        {line && <p className="dv-verdict__line">{line}</p>}
      </div>
      {children}
    </div>
  );
}

/* ---------------- OxygenGauge: 남은 시간·횟수 = 산소 ---------------- */
export function OxygenGauge({
  percent,
  value,
  label = "O₂",
  className,
}: {
  percent: number;
  value: React.ReactNode;
  label?: string;
  className?: string;
}) {
  const p = Math.max(0, Math.min(100, percent));
  const level = p <= 10 ? "critical" : p <= 35 ? "low" : undefined;
  return (
    <div
      className={cn("dv-o2", className)}
      data-level={level}
      role="progressbar"
      aria-valuenow={Math.round(p)}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{ ["--o2" as string]: `${p}%` }}
    >
      <div className="dv-o2__head">
        <span>{label}</span>
        <span className="dv-o2__val">{value}</span>
      </div>
      <div className="dv-o2__track">
        <div className="dv-o2__fill" />
      </div>
    </div>
  );
}

/* ---------------- DivoBubble: 마스코트 안내 ---------------- */
export function DivoBubble({
  children,
  mood,
  name = "DIVO",
  avatarSize = 56,
  className,
}: {
  children: React.ReactNode;
  mood?: "success" | "fail";
  name?: string;
  avatarSize?: number;
  className?: string;
}) {
  return (
    <div className={cn("dv-divo", className)} data-mood={mood}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/divo.webp" alt="" className="dv-divo__avatar" style={{ width: avatarSize }} />
      <div className="dv-divo__bubble">
        <span className="dv-divo__name">{name}</span>
        <p className="dv-divo__text">{children}</p>
      </div>
    </div>
  );
}

/* ---------------- Bubbles: 천천히 떠오르는 기포 (12개 이하) ---------------- */
const BUBBLES = [
  { left: "8%", size: 6, dur: 11, delay: 0 },
  { left: "17%", size: 10, dur: 13, delay: 3 },
  { left: "29%", size: 6, dur: 9, delay: 6 },
  { left: "41%", size: 16, dur: 14, delay: 1 },
  { left: "56%", size: 6, dur: 10, delay: 4 },
  { left: "67%", size: 10, dur: 12, delay: 7 },
  { left: "78%", size: 6, dur: 8, delay: 2 },
  { left: "88%", size: 10, dur: 13, delay: 5 },
];

export function Bubbles({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden="true">
      {BUBBLES.map((b, i) => (
        <span
          key={i}
          className="dv-bubble"
          style={{ left: b.left, width: b.size, height: b.size, animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s` }}
        />
      ))}
    </div>
  );
}

/* ---------------- SeaCritter: 문제·그룹 기본 그림 (번호로 고르는 픽셀 바다 생물) ---------------- */
export function SeaCritter({
  id,
  scope = "problem",
  round = false,
  className,
}: {
  id: number | string | null | undefined;
  scope?: CritterScope;
  /** 원형 틀에 넣을 때 가장자리가 잘리지 않게 여백을 더 준다 */
  round?: boolean;
  className?: string;
}) {
  const critter = pickCritter(id, scope);
  const pad = round ? 2.5 : 1;
  return (
    <svg
      viewBox={`${-pad} ${-pad} ${16 + pad * 2} ${16 + pad * 2}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      data-critter={critter.kind}
      className={cn("block size-full", className)}
      style={{ background: critter.color.water }}
    >
      {critterLayers(critter).map((layer, i) => (
        <path key={i} fill={layer.fill} fillOpacity={layer.opacity} d={layer.d} />
      ))}
    </svg>
  );
}
