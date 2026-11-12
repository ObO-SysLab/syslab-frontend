// 상점: /api/store/items, /api/store/me
export type StoreItem = {
  itemId: number;
  category: "avatar" | "title" | "theme" | string;
  name: string;
  description: string;
  price: number;
  rarity: string;
  assetKey: string;
  owned: boolean;
  equipped: boolean;
};

export type PointHistory = { amount: number; reason: "SOLVE" | "DAILY" | "PURCHASE" | string; refId: number; label: string | null; createdAt: string };
// 하루(서울 날짜) 획득 한도 dailyCap, 오늘의 다이브 포인트 보너스 dailyBonus
export type StoreMe = { balance: number; earned: number; spent: number; todayEarned: number; dailyCap: number; dailyBonus: number; history: PointHistory[] };

export const STORE_API = "https://diveon.net/api/store";

export const CATEGORY_LABEL: Record<string, string> = { avatar: "아바타 테두리", title: "칭호", theme: "카드 배경" };

export function filterItems(items: StoreItem[], category: string, query: string): StoreItem[] {
  const q = query.trim().toLowerCase();
  return items.filter((i) => (category === "all" || i.category === category) && (!q || i.name.toLowerCase().includes(q)));
}

export type ItemAction = "login" | "equipped" | "equip" | "buy" | "short";

// 카드 버튼 상태: 로그인 안 함 / 착용 중 / 착용 가능 / 구매 가능 / 포인트 부족
export function itemAction(item: StoreItem, loggedIn: boolean, balance: number | null): ItemAction {
  if (!loggedIn) return "login";
  if (item.equipped) return "equipped";
  if (item.owned) return "equip";
  return balance !== null && balance < item.price ? "short" : "buy";
}

export function historyLabel(h: PointHistory): string {
  if (h.reason === "SOLVE") return `#${h.refId} ${h.label ?? "문제"}`;
  if (h.reason === "DAILY") {
    const d = String(h.refId);
    const date = d.length === 8 ? `${d.slice(4, 6)}/${d.slice(6, 8)}` : "";
    return `오늘의 다이브 포인트${date ? ` ${date}` : ""}${h.label ? ` · ${h.label}` : ""}`;
  }
  return h.label ?? "상품";
}
