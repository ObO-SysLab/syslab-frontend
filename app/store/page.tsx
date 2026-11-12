"use client";
import { logout, draftAccount } from "@/lib/authSession";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Coins, ShoppingCart, Check, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Header } from "@/components/Header";
import { CosmeticFrame, UserTitle } from "@/components/Cosmetics";
import { forgetCosmetics, themeClass } from "@/lib/cosmetics";
import { authHeaders, requestJson, RequestFailure } from "@/lib/request";
import { formatDateTime } from "@/lib/utils";
import {
  CATEGORY_LABEL, STORE_API, filterItems, historyLabel, itemAction,
  type StoreItem, type StoreMe,
} from "@/lib/store";

const RARITY_TONE: Record<string, string> = {
  Legendary: "bg-danger-soft text-danger",
  Epic: "bg-coral-soft text-coral",
  Rare: "bg-primary-soft text-primary",
};

// 상품이 실제로 어떻게 보이는지 미리 보여 준다.
function ItemPreview({ item }: { item: StoreItem }) {
  if (item.category === "avatar") {
    return (
      <CosmeticFrame frame={item.assetKey}>
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-raised text-ink-muted">
          <UserRound className="h-8 w-8" aria-hidden />
        </span>
      </CosmeticFrame>
    );
  }
  if (item.category === "title") {
    return (
      <span className="flex items-center gap-2 rounded-xl bg-panel px-4 py-3">
        <b className="text-sm text-ink">닉네임</b>
        <UserTitle title={item.assetKey} name={item.name} />
      </span>
    );
  }
  return <span className={`block h-16 w-28 rounded-xl border border-line ${themeClass(item.assetKey)}`} aria-hidden />;
}

export default function StorePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userImgUrl, setUserImgUrl] = useState("");
  const [items, setItems] = useState<StoreItem[]>([]);
  const [me, setMe] = useState<StoreMe | null>(null);
  const [loadError, setLoadError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const load = useCallback(async () => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
    try {
      const itemsJson = await requestJson<{ data: StoreItem[] }>(`${STORE_API}/items`, { headers: authHeaders() });
      setItems(Array.isArray(itemsJson?.data) ? itemsJson.data : []);
      setLoadError("");
    } catch (error) {
      setLoadError(error instanceof RequestFailure ? error.issue.message : "상품을 불러오지 못했습니다.");
    }
    if (token) {
      try {
        const meJson = await requestJson<{ data: StoreMe }>(`${STORE_API}/me`, { headers: authHeaders() });
        setMe(meJson?.data ?? null);
      } catch {
        setMe(null);
      }
    }
  }, []);

  useEffect(() => {
    load();
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch("https://diveon.net/api/profile/show", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => { if (json?.data?.userInfo?.profileImgUrl) setUserImgUrl(json.data.userInfo.profileImgUrl); })
      .catch(() => {});
  }, [load]);

  const filteredItems = useMemo(() => filterItems(items, selectedCategory, searchQuery), [items, selectedCategory, searchQuery]);
  const balance = me?.balance ?? null;
  const myId = () => Number(draftAccount(localStorage.getItem("token"))) || null;

  const run = async (url: string, init: RequestInit) => {
    setBusy(true);
    setActionError("");
    try {
      await requestJson(url, { ...init, headers: { ...authHeaders(), ...(init.headers ?? {}) } }, { allowEmpty: true });
      forgetCosmetics(myId());
      await load();
      return true;
    } catch (error) {
      setActionError(error instanceof RequestFailure ? error.issue.message : "처리하지 못했습니다.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const confirmPurchase = async () => {
    if (!selectedItem) return;
    if (await run(`${STORE_API}/items/${selectedItem.itemId}/purchase`, { method: "POST" })) setSelectedItem(null);
  };

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans">
      <Header
        isLoggedIn={isLoggedIn}
        userImgUrl={userImgUrl}
        activeMenu="store"
        onLogout={() => { if (logout()) window.location.replace("/"); }}
      />

      <main className="dv-shell pt-10 pb-20 space-y-8">
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-[-0.02em]">스토어</h1>
            <p className="text-ink-muted text-sm">
              문제를 처음 맞히면 난이도 × 10P, 오늘의 다이브 포인트를 맞히면 +{me?.dailyBonus ?? 50}P. 하루 최대 {me?.dailyCap ?? 100}P까지 모을 수 있어요.
            </p>
          </div>
          {isLoggedIn && me && (
            <div className="flex items-center gap-6 rounded-2xl border border-line bg-panel px-6 py-4">
              <div>
                <p className="text-xs text-ink-subtle">보유 포인트</p>
                <p className="flex items-center gap-1.5 text-2xl font-black font-mono"><Coins className="w-5 h-5 text-warning" />{me.balance.toLocaleString()}P</p>
              </div>
              <div className="text-xs text-ink-muted space-y-1.5 font-mono min-w-[120px]">
                <p className="flex justify-between gap-3"><span>오늘</span><b className="text-ink">{me.todayEarned} / {me.dailyCap}P</b></p>
                <div className="h-1.5 rounded-full bg-raised overflow-hidden" aria-hidden>
                  <div className="h-full bg-signal" style={{ width: `${Math.min(100, (me.todayEarned / Math.max(1, me.dailyCap)) * 100)}%` }} />
                </div>
                <p className="flex justify-between gap-3"><span>획득</span><span>{me.earned.toLocaleString()}P</span></p>
                <p className="flex justify-between gap-3"><span>사용</span><span>{me.spent.toLocaleString()}P</span></p>
              </div>
            </div>
          )}
        </section>

        <section className="flex flex-col md:flex-row justify-between items-center gap-4">
          <Tabs defaultValue="all" className="w-full md:w-auto" onValueChange={setSelectedCategory}>
            <TabsList className="bg-panel border p-1 rounded-xl shadow-sm h-12">
              <TabsTrigger value="all" className="rounded-lg px-5 font-bold text-xs">전체</TabsTrigger>
              <TabsTrigger value="avatar" className="rounded-lg px-5 font-bold text-xs">{CATEGORY_LABEL.avatar}</TabsTrigger>
              <TabsTrigger value="title" className="rounded-lg px-5 font-bold text-xs">{CATEGORY_LABEL.title}</TabsTrigger>
              <TabsTrigger value="theme" className="rounded-lg px-5 font-bold text-xs">{CATEGORY_LABEL.theme}</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-3 h-4 w-4 text-ink-subtle" />
            <Input
              placeholder="상품 이름"
              className="pl-10 bg-panel border-line rounded-xl h-11"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </section>

        {actionError && !selectedItem && <p className="rounded-xl border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger">{actionError}</p>}
        {loadError && <p className="rounded-xl border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger">{loadError}</p>}

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredItems.map((item) => {
            const action = itemAction(item, isLoggedIn, balance);
            return (
              <Card key={item.itemId} className="border-line rounded-[2rem] overflow-hidden bg-panel flex flex-col">
                <CardHeader className="flex flex-col items-center justify-center gap-4 pt-10 pb-6 bg-raised/50 min-h-[168px]">
                  <ItemPreview item={item} />
                  <Badge className={`rounded-full px-3 py-0.5 text-xs font-black uppercase tracking-tighter ${RARITY_TONE[item.rarity] ?? "bg-line text-ink"}`}>
                    {item.rarity}
                  </Badge>
                </CardHeader>
                <CardContent className="p-6 space-y-1.5 flex-1">
                  <p className="text-xs text-ink-subtle">{CATEGORY_LABEL[item.category] ?? item.category}</p>
                  <h3 className="text-lg font-black text-ink">{item.name}</h3>
                  <p className="text-xs text-ink-muted leading-relaxed">{item.description}</p>
                </CardContent>
                <CardFooter className="p-6 pt-0 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-black text-lg font-mono">
                    <Coins className="w-4 h-4 text-warning" />{item.price === 0 ? "무료" : item.price.toLocaleString()}
                  </span>
                  {action === "login" && (
                    <Button asChild variant="outline" className="rounded-xl h-10 font-bold"><Link href="/signin">로그인</Link></Button>
                  )}
                  {action === "equipped" && (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-success"><Check className="h-3.5 w-3.5" />착용 중</span>
                      <Button variant="ghost" className="rounded-xl h-10 font-bold" disabled={busy}
                        onClick={() => run(`${STORE_API}/equipped/${item.category}`, { method: "DELETE" })}>해제</Button>
                    </div>
                  )}
                  {action === "equip" && (
                    <Button variant="outline" className="rounded-xl h-10 font-bold" disabled={busy}
                      onClick={() => run(`${STORE_API}/items/${item.itemId}/equip`, { method: "PATCH" })}>착용</Button>
                  )}
                  {(action === "buy" || action === "short") && (
                    <Button
                      onClick={() => { setActionError(""); setSelectedItem(item); }}
                      disabled={busy || action === "short"}
                      title={action === "short" ? "포인트가 부족해요" : undefined}
                      className="rounded-xl h-10 font-bold bg-raised border border-line-strong text-ink hover:bg-line"
                    >
                      {action === "short" ? "포인트 부족" : "구매"}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
          {!loadError && items.length > 0 && filteredItems.length === 0 && (
            <p className="col-span-full py-20 text-center text-ink-subtle font-bold">조건에 맞는 상품이 없어요.</p>
          )}
        </section>

        {isLoggedIn && me && me.history.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-bold">포인트 내역</h2>
            <ul className="divide-y divide-line rounded-2xl border border-line bg-panel">
              {me.history.map((h, i) => (
                <li key={`${h.reason}-${h.refId}-${i}`} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                  <span className="truncate text-ink">{historyLabel(h)}</span>
                  <span className="flex items-center gap-4 shrink-0">
                    <span className="text-xs text-ink-subtle">{formatDateTime(h.createdAt)}</span>
                    <b className={`font-mono ${h.amount >= 0 ? "text-success" : "text-danger"}`}>{h.amount >= 0 ? "+" : ""}{h.amount}P</b>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <Dialog open={!!selectedItem} onOpenChange={(open) => { if (!open) setSelectedItem(null); }}>
        <DialogContent className="rounded-[2rem] sm:max-w-[400px]">
          <DialogHeader className="items-center py-4">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <ShoppingCart className="w-8 h-8 text-primary" />
            </div>
            <DialogTitle className="text-xl font-black">상품 구매</DialogTitle>
            <DialogDescription className="text-center">
              <span className="text-primary font-black">{selectedItem?.name}</span>을(를) 구매할까요?
            </DialogDescription>
          </DialogHeader>
          <div className="bg-canvas p-4 rounded-2xl border space-y-2 font-mono text-sm">
            <p className="flex justify-between"><span className="text-ink-muted">가격</span><b>{selectedItem?.price.toLocaleString()}P</b></p>
            {balance !== null && selectedItem && (
              <p className="flex justify-between"><span className="text-ink-muted">구매 후</span><b>{(balance - selectedItem.price).toLocaleString()}P</b></p>
            )}
          </div>
          {actionError && <p className="text-sm text-danger">{actionError}</p>}
          <DialogFooter className="flex-row gap-2 sm:justify-center">
            <Button variant="ghost" onClick={() => setSelectedItem(null)} className="flex-1 rounded-xl font-bold">취소</Button>
            <Button onClick={confirmPurchase} disabled={busy} className="flex-1 bg-primary hover:bg-primary-hover rounded-xl font-bold">
              {busy ? "구매 중..." : "구매"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
