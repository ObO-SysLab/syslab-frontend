// 상점 꾸미기: 여러 사용자의 착용 상태를 한 번에 받아 메모리에 저장해 둔다(/api/store/equipped).
import { useEffect, useState } from "react";

export type Cosmetics = {
  userId: number;
  avatar?: string | null;
  title?: string | null;
  titleName?: string | null;
  theme?: string | null;
};

export const EQUIPPED_URL = "https://diveon.net/api/store/equipped";
const BATCH = 100;

// userId → 착용 상태(아무것도 안 입었으면 null). 같은 페이지 안에서 다시 묻지 않는다.
const cache = new Map<number, Cosmetics | null>();
const listeners = new Set<() => void>();

type Fetcher = (url: string) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

export async function loadCosmetics(userIds: number[], fetcher: Fetcher = (u) => fetch(u)): Promise<void> {
  const missing = [...new Set(userIds.filter((id) => Number.isFinite(id) && id > 0 && !cache.has(id)))];
  for (let i = 0; i < missing.length; i += BATCH) {
    const chunk = missing.slice(i, i + BATCH);
    try {
      const res = await fetcher(`${EQUIPPED_URL}?userIds=${chunk.join(",")}`);
      if (!res.ok) continue;
      const body = (await res.json()) as { data?: Cosmetics[] } | null;
      const rows = Array.isArray(body?.data) ? body!.data : [];
      const byId = new Map(rows.map((r) => [Number(r.userId), r]));
      for (const id of chunk) cache.set(id, byId.get(id) ?? null);
    } catch {
      // 꾸미기는 부가 정보라 실패하면 기본 모양으로 둔다.
    }
  }
  if (missing.length) listeners.forEach((fn) => fn());
}

export function cachedCosmetics(userId: number | null | undefined): Cosmetics | null {
  return userId == null ? null : cache.get(Number(userId)) ?? null;
}

// 착용을 바꾼 뒤 내 정보를 다시 받게 한다.
export function forgetCosmetics(userId?: number | null) {
  if (userId == null) cache.clear();
  else cache.delete(Number(userId));
  listeners.forEach((fn) => fn());
}

// 화면에 보이는 사용자들의 착용 상태. 목록이 바뀌면 빠진 사람만 더 받는다.
export function useCosmetics(userIds: Array<number | null | undefined>): (userId: number | null | undefined) => Cosmetics | null {
  const [, setVersion] = useState(0);
  const key = [...new Set(userIds.filter((id): id is number => typeof id === "number"))].sort((a, b) => a - b).join(",");
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    listeners.add(bump);
    if (key) loadCosmetics(key.split(",").map(Number));
    return () => { listeners.delete(bump); };
  }, [key]);
  return cachedCosmetics;
}

// asset_key → 화면 클래스 (app/globals.css의 dv-frame-*, dv-theme-*)
export const frameClass = (assetKey?: string | null) =>
  assetKey && /^frame-[a-z-]+$/.test(assetKey) ? `dv-${assetKey}` : "";
export const themeClass = (assetKey?: string | null) =>
  assetKey && /^theme-[a-z-]+$/.test(assetKey) ? `dv-${assetKey}` : "";

export function __resetCosmeticsForTest() {
  cache.clear();
  listeners.clear();
}
