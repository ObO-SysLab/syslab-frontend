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

// 수심 층 이름 (디자인 시스템 4.3)
export const getDepthZone = (lvl: string | number) => {
  switch (String(lvl)) {
    case "1": return "해수면";
    case "2": return "표층";
    case "3": return "중심층";
    case "4": return "점심해층";
    case "5": return "심해층";
    case "6": return "초심해층";
    case "7": return "커널";
    default: return "";
  }
};

// 티어 → 디자인 시스템 data-tier 키 (bronze ~ challenger). 숫자/영문 라벨 모두 허용
export const getTierKey = (tier: string | number) => {
  const label = String(getTierLabel(tier)).toLowerCase();
  const keys = ["bronze", "silver", "gold", "platinum", "diamond", "master", "challenger"];
  return keys.includes(label) ? label : null;
};

// 7단계 명예 티어 스킨 테마 (Abyss: 어두운 면 위 티어 색 글자 + 옅은 테두리)
export const getTierBadgeStyle = (tier: string | number) => {
  const label = getTierLabel(tier);
  switch (label) {
    case 'Challenger': return 'bg-tier-challenger/10 text-tier-challenger border-tier-challenger/40 font-black';
    case 'Master': return 'bg-tier-master/10 text-tier-master border-tier-master/35';
    case 'Diamond': return 'bg-tier-diamond/10 text-tier-diamond border-tier-diamond/35';
    case 'Platinum': return 'bg-tier-platinum/10 text-tier-platinum border-tier-platinum/35';
    case 'Gold': return 'bg-tier-gold/10 text-tier-gold border-tier-gold/35';
    case 'Silver': return 'bg-tier-silver/10 text-tier-silver border-tier-silver/35';
    case 'Bronze': return 'bg-tier-bronze/10 text-tier-bronze border-tier-bronze/35';
    default: return 'bg-raised text-ink-muted border-line';
  }
};