import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// datetime-local 값("2026-06-25T14:00") 또는 서버 값("2026-06-25T14:00:00")을
// 서버 명세 형식인 로컬 시각 "YYYY-MM-DDTHH:mm:ss"(타임존 없음)로 맞춘다.
// toISOString()은 UTC로 바꾸므로 KST 기준 9시간 어긋나서 쓰면 안 된다.
export const toApiLocalDateTime = (value: string) => {
  if (!value) return value;
  const base = value.slice(0, 19);
  return base.length === 16 ? `${base}:00` : base;
};

// 문제 카테고리 명세 값: Process, Memory, Kernel, Thread, FileSystem
// 화면 라벨("File System")이나 예전에 소문자로 저장된 값("file system")을 명세 값으로 맞춘다.
export const PROBLEM_CATEGORIES = ["Kernel", "Process", "Thread", "Memory", "FileSystem"] as const;

export const toApiCategory = (value: string) => {
  if (!value) return value;
  const key = value.replace(/\s+/g, "").toLowerCase();
  return PROBLEM_CATEGORIES.find((c) => c.toLowerCase() === key) ?? value;
};

// 숫자 난이도를 문자열로 매핑하는 변환기
export const getLevelLabel = (lvl: string | number) => {
  const tierStr = String(lvl);
  if (tierStr === "7") return "10,000m+";
  if (tierStr === "6") return "3000m";
  if (tierStr === "5") return "1500m";
  if (tierStr === "4") return "1000m";
  if (tierStr === "3") return "500m";
  if (tierStr === "2") return "300m";
  if (tierStr === "1") return "100m";
  return lvl || "Unranked";
};

// 숫자 티어를 문자열로 매핑하는 변환기
export const getTierLabel = (tier: string | number) => {
  const tierStr = String(tier);
  if (tierStr === "7") return "Challenger";
  if (tierStr === "6") return "Master";
  if (tierStr === "5") return "Diamond";
  if (tierStr === "4") return "Platinum";
  if (tierStr === "3") return "Gold";
  if (tierStr === "2") return "Silver";
  if (tierStr === "1") return "Bronze";
  return tier || "Unranked";
};

// 7단계 명예 티어 스킨 테마
export const getTierBadgeStyle = (tier: string | number) => {
  const label = getTierLabel(tier);
  switch (label) {
    case 'Challenger': return 'bg-rose-950 text-rose-200 border-rose-800 font-black animate-pulse';
    case 'Master': return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'Diamond': return 'bg-cyan-50 text-cyan-600 border-cyan-200';
    case 'Platinum': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
    case 'Gold': return 'bg-amber-50 text-amber-600 border-amber-200';
    case 'Silver': return 'bg-slate-100 text-slate-600 border-slate-200';
    case 'Bronze': return 'bg-orange-50 text-orange-700 border-orange-200';
    default: return 'bg-slate-50 text-slate-500 border-slate-200';
  }
};