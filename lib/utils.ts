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

// 기간 표시: 같은 날이면 "11월 11일(수) 07:17 – 15:17", 다른 날이면 "11월 11일(수) 07:17 – 11월 13일(금) 15:17".
// 연도가 올해가 아니면 앞에 "2025년 "을 붙인다. 값이 잘못되면 빈 문자열.
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const pad2 = (n: number) => String(n).padStart(2, "0");
const formatDay = (d: Date, now: Date) =>
  `${d.getFullYear() !== now.getFullYear() ? `${d.getFullYear()}년 ` : ""}${d.getMonth() + 1}월 ${d.getDate()}일(${WEEKDAYS[d.getDay()]})`;
const formatClock = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

export const formatDateTime = (value: string | number | Date | null | undefined, now = new Date()) => {
  if (value == null || value === "") return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${formatDay(d, now)} ${formatClock(d)}`;
};

export const formatPeriod = (
  start: string | number | Date | null | undefined,
  end: string | number | Date | null | undefined,
  now = new Date()
) => {
  const from = formatDateTime(start, now);
  const to = formatDateTime(end, now);
  if (!from || !to) return from || to;
  const s = new Date(start as string);
  const e = new Date(end as string);
  const sameDay = s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth() && s.getDate() === e.getDate();
  return sameDay ? `${from} – ${formatClock(e)}` : `${from} – ${to}`;
};

// 날짜·시간 입력란 아무 곳이나 눌러도 브라우저 선택기를 연다(작은 달력 아이콘만 누르는 것보다 찾기 쉽다).
// showPicker를 지원하지 않거나 막힌 환경에서는 원래대로 직접 입력한다.
export const openNativePicker = (event: { currentTarget: HTMLInputElement }) => {
  try {
    event.currentTarget.showPicker?.();
  } catch {
    // 기본 동작 유지
  }
};

// 비공개 그룹 초대 링크. 여는 즉시 가입하는 화면(app/groups/invite)으로 보낸다.
// 예전 링크(/groups?code=)는 그룹 목록이 이 주소로 넘겨 준다.
export const groupInvitePath = (code: string) => `/groups/invite?code=${encodeURIComponent(code)}`;

// 문제 카테고리 명세 값: Process, Memory, Kernel, Thread, FileSystem
// 화면 라벨("File System")이나 예전에 소문자로 저장된 값("file system")을 명세 값으로 맞춘다.
export const PROBLEM_CATEGORIES = ["Kernel", "Process", "Thread", "Memory", "FileSystem"] as const;

export const toApiCategory = (value: string) => {
  if (!value) return value;
  const key = value.replace(/\s+/g, "").toLowerCase();
  return PROBLEM_CATEGORIES.find((c) => c.toLowerCase() === key) ?? value;
};

// 화면에 보이는 카테고리 이름 (명세 값 FileSystem → "File System")
export const categoryLabel = (value: string) => {
  const api = toApiCategory(value);
  return api === "FileSystem" ? "File System" : api;
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

// 그룹 티어: 서버에 저장된 값이 없어 그룹 랭킹 점수로 정한다. 점수는 백엔드 GroupRepository.findGroupRanking:
// 그룹에 넣은 공개 문제를 멤버가 맞힌 횟수 ×1 + 그룹 전용 문제를 맞힌 횟수 ×10 + 그룹 대회 수 ×100.
// 새 그룹(0점)은 사용자와 같게 Bronze에서 시작한다.
export const GROUP_TIER_MIN_SCORE: [string, number][] = [
  ["Challenger", 1000], ["Master", 500], ["Diamond", 300], ["Platinum", 150], ["Gold", 80], ["Silver", 30], ["Bronze", 0],
];

export const getGroupTier = (score: number | null | undefined) => {
  const s = Number(score) || 0;
  return (GROUP_TIER_MIN_SCORE.find(([, min]) => s >= min) ?? GROUP_TIER_MIN_SCORE[GROUP_TIER_MIN_SCORE.length - 1])[0];
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