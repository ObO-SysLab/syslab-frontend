// 상점·알림·탈퇴 목 응답 (실제 API: syslab-backend domain/store, domain/notification, UserAccountController)
import { ME, fromNow, ok } from "./common";

type Item = { itemId: number; category: string; name: string; description: string; price: number; rarity: string; assetKey: string };

export const STORE_ITEMS: Item[] = [
  { itemId: 1, category: "avatar", name: "기본 요원", description: "기본 아바타 테두리", price: 0, rarity: "Common", assetKey: "frame-default" },
  { itemId: 2, category: "avatar", name: "네온 해커", description: "분홍 네온 아바타 테두리", price: 120, rarity: "Rare", assetKey: "frame-neon" },
  { itemId: 3, category: "avatar", name: "어셈블리 장인", description: "호박색 아바타 테두리", price: 150, rarity: "Rare", assetKey: "frame-asm" },
  { itemId: 4, category: "avatar", name: "사이버 수사대", description: "청록빛 이중 아바타 테두리", price: 200, rarity: "Epic", assetKey: "frame-cyber" },
  { itemId: 5, category: "title", name: "Binary Hunter", description: "닉네임 옆에 붙는 칭호", price: 50, rarity: "Common", assetKey: "title-binary-hunter" },
  { itemId: 6, category: "title", name: "Root Access", description: "모든 권한을 가진 자의 칭호", price: 500, rarity: "Legendary", assetKey: "title-root-access" },
  { itemId: 7, category: "theme", name: "오션 드라이브", description: "푸른 물결 프로필 카드 배경", price: 100, rarity: "Rare", assetKey: "theme-ocean-drive" },
  { itemId: 8, category: "theme", name: "다크 커널", description: "터미널 격자 프로필 카드 배경", price: 300, rarity: "Legendary", assetKey: "theme-dark-kernel" },
];

const state = {
  earned: 340,
  owned: new Map<number, boolean>([[5, true], [7, false]]), // itemId → equipped
  history: [
    { amount: 30, reason: "SOLVE", refId: 7, label: "식사하는 철학자 문제", createdAt: fromNow(-2) },
    { amount: -50, reason: "PURCHASE", refId: 5, label: "Binary Hunter", createdAt: fromNow(-5) },
    { amount: -100, reason: "PURCHASE", refId: 7, label: "오션 드라이브", createdAt: fromNow(-6) },
  ] as { amount: number; reason: string; refId: number; label: string; createdAt: string }[],
  notifications: [
    { id: 3, type: "SOLVE_CORRECT", title: "정답", body: "#7 식사하는 철학자 문제 문제를 맞혔어요.", link: "/challenges/detail?id=7", read: false, createdAt: fromNow(-0.05) },
    { id: 2, type: "COMMENT", title: "새 댓글", body: "Torvalds님이 #1 라운드로빈 스케줄링 구현에 댓글을 남겼어요.", link: "/challenges/detail?id=1&tab=comments", read: false, createdAt: fromNow(-3) },
    { id: 1, type: "CONTEST_START", title: "대회 시작 1시간 전", body: "제1회 DiveOn 커널 다이빙 챌린지 대회가 13:09에 시작해요.", link: "/contests/detail?id=1", read: true, createdAt: fromNow(-30) },
  ],
  prefs: { solveCorrect: true, comment: true, contestStart: false },
};

const spent = () => -state.history.filter((h) => h.amount < 0).reduce((a, h) => a + h.amount, 0);
const balance = () => state.earned - spent();
const fail = (status: number, detail: string) => ({ status, body: { status, title: "", detail, type: "", instance: "" } });

export const storeItems = () =>
  ok(STORE_ITEMS.map((i) => ({ ...i, owned: state.owned.has(i.itemId), equipped: state.owned.get(i.itemId) === true })), "상품 목록 조회 성공");

export const storeMe = () => ok({ balance: balance(), earned: state.earned, spent: spent(), history: state.history }, "포인트 조회 성공");

export function purchase(itemId: number) {
  const item = STORE_ITEMS.find((i) => i.itemId === itemId);
  if (!item) return fail(404, "판매 중인 상품이 아닙니다.");
  if (state.owned.has(itemId)) return fail(409, "이미 보유한 상품입니다.");
  if (balance() < item.price) return fail(400, `포인트가 부족합니다. (보유 ${balance()}P, 필요 ${item.price}P)`);
  state.owned.set(itemId, false);
  state.history.unshift({ amount: -item.price, reason: "PURCHASE", refId: itemId, label: item.name, createdAt: fromNow(0) });
  return { status: 200, body: ok({ balance: balance() }, "구매했습니다.") };
}

export function equip(itemId: number) {
  const item = STORE_ITEMS.find((i) => i.itemId === itemId);
  if (!item || !state.owned.has(itemId)) return fail(404, "보유하지 않은 상품입니다.");
  unequip(item.category);
  state.owned.set(itemId, true);
  return { status: 200, body: ok(null, "착용했습니다.") };
}

export function unequip(category: string) {
  for (const i of STORE_ITEMS) if (i.category === category && state.owned.get(i.itemId)) state.owned.set(i.itemId, false);
  return { status: 200, body: ok(null, "착용을 해제했습니다.") };
}

// 다른 사용자 몇 명도 꾸미기를 입고 있다(랭킹·댓글 화면 확인용).
export function equipped(ids: number[]) {
  const mine: Record<string, string | null> = { avatar: null, title: null, titleName: null, theme: null };
  for (const i of STORE_ITEMS) if (state.owned.get(i.itemId)) {
    mine[i.category] = i.assetKey;
    if (i.category === "title") mine.titleName = i.name;
  }
  const others: Record<number, object> = {
    12: { avatar: "frame-cyber", title: "title-root-access", titleName: "Root Access", theme: "theme-dark-kernel" },
    7: { avatar: "frame-neon", title: null, titleName: null, theme: null },
    200: { avatar: "frame-cyber", title: "title-root-access", titleName: "Root Access", theme: "theme-dark-kernel" },
    201: { avatar: "frame-asm", title: "title-binary-hunter", titleName: "Binary Hunter", theme: "theme-ocean-drive" },
  };
  const rows = ids.flatMap((id) => (id === ME.userId ? [{ userId: id, ...mine }] : others[id] ? [{ userId: id, ...others[id] }] : []));
  return ok(rows, "착용 정보 조회 성공");
}

export const notificationList = () =>
  ok({ total: state.notifications.length, unreadCount: state.notifications.filter((n) => !n.read).length, page: 1, size: 10, notifications: state.notifications }, "알림 조회 성공");
export const unreadCount = () => ok({ unreadCount: state.notifications.filter((n) => !n.read).length }, "안 읽은 알림 수 조회 성공");
export function markRead(id: number) {
  const n = state.notifications.find((x) => x.id === id);
  if (!n) return fail(404, "알림을 찾을 수 없습니다.");
  n.read = true;
  return { status: 200, body: ok(null, "알림을 읽음으로 표시했습니다.") };
}
export function markAllRead() {
  state.notifications.forEach((n) => { n.read = true; });
  return ok({ updated: 0 }, "모든 알림을 읽음으로 표시했습니다.");
}
export const getPrefs = () => ok(state.prefs, "알림 설정 조회 성공");
export function putPrefs(body: unknown) {
  const b = (body ?? {}) as Partial<typeof state.prefs>;
  for (const k of ["solveCorrect", "comment", "contestStart"] as const) if (typeof b[k] === "boolean") state.prefs[k] = b[k]!;
  return ok(state.prefs, "알림 설정을 저장했습니다.");
}

export function withdraw(body: unknown) {
  const nickname = (body as { nickname?: string } | null)?.nickname;
  if (nickname !== ME.nickname) return fail(400, "닉네임이 일치하지 않습니다.");
  return fail(409, "그룹 'DK-기사단'을(를) 먼저 정리해 주세요. 그룹은 그룹장을 넘기거나 삭제하고, 대회는 끝나거나 삭제되어야 탈퇴할 수 있습니다.");
}
