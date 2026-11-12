"use client";
import { logout } from "@/lib/authSession";

import { useState, useEffect } from "react";
import { Search, Coins, Sparkles, UserCircle2, Palette, ShieldCheck, Tag, ShoppingCart, Check, Info, Filter, ArrowUpRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Header } from "@/components/Header";

// --- [Mock Data] 스토어 아이템 목록 ---
const STORE_ITEMS = [
  { id: 1, category: "avatar", name: "사이버 수사대", desc: "전문적인 분위기의 요원 아바타", price: 5000, rarity: "Epic", icon: <ShieldCheck className="w-10 h-10 text-primary" /> },
  { id: 2, category: "avatar", name: "네온 해커", desc: "빛나는 네온 사인이 특징인 아바타", price: 3500, rarity: "Rare", icon: <UserCircle2 className="w-10 h-10 text-danger" /> },
  { id: 3, category: "theme", name: "다크 커널", desc: "터미널 느낌의 딥 다크한 프로필 테마", price: 8000, rarity: "Legendary", icon: <Palette className="w-10 h-10 text-ink" /> },
  { id: 4, category: "title", name: "Binary Hunter", desc: "닉네임 옆에 붙는 특별한 칭호", price: 2000, rarity: "Common", icon: <Tag className="w-10 h-10 text-success" /> },
  { id: 5, category: "theme", name: "오션 드라이브", desc: "시원한 파란색 포인트 테마", price: 3000, rarity: "Rare", icon: <Palette className="w-10 h-10 text-primary" /> },
  { id: 6, category: "avatar", name: "어셈블리 장인", desc: "로우레벨 느낌이 물씬 풍기는 아바타", price: 4500, rarity: "Rare", icon: <UserCircle2 className="w-10 h-10 text-warning" /> },
  { id: 7, category: "title", name: "Root Access", desc: "모든 권한을 가진 자의 칭호", price: 10000, rarity: "Legendary", icon: <Tag className="w-10 h-10 text-danger" /> },
  { id: 8, category: "avatar", name: "기본 요원", desc: "DiveOn의 기본 제공 아바타", price: 0, rarity: "Common", icon: <UserCircle2 className="w-10 h-10 text-ink-subtle" /> },
];

export default function StorePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userPoints, setUserPoints] = useState(12500); // 사용자 보유 포인트
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [userImgUrl, setUserImgUrl] = useState("");

  // 구매 다이얼로그 상태
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  useEffect(() => {
    const fetchProfileImage = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      setIsLoggedIn(true);

      try {
        const response = await fetch("https://diveon.net/api/profile/show", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          }
        });

        if (response.ok) {
          const result = await response.json();
          const userInfo = result?.data?.userInfo;

          // 서버에 저장된 실서버 S3 프로필 주소가 있다면 상태 동기화
          if (userInfo?.profileImgUrl) {
            setUserImgUrl(userInfo.profileImgUrl);
          }
        }
      } catch (error) {
        console.error("홈페이지 초기 데이터 로드 실패:", error);
      }
    };

    fetchProfileImage();
  }, []);

  // 아이템 필터링 로직
  const filteredItems = STORE_ITEMS.filter(item => {
    const matchCategory = selectedCategory === "all" || item.category === selectedCategory;
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const handlePurchase = (item: any) => {
    setSelectedItem(item);
    setIsPurchaseOpen(true);
  };

  const confirmPurchase = () => {
    if (userPoints >= selectedItem.price) {
      setUserPoints(prev => prev - selectedItem.price);
      alert(`${selectedItem.name} 아이템을 구매했습니다!`);
      setIsPurchaseOpen(false);
    } else {
      alert("포인트가 부족합니다.");
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'Legendary': return 'bg-danger text-primary-ink';
      case 'Epic': return 'bg-primary text-primary-ink';
      case 'Rare': return 'bg-primary text-primary-ink';
      default: return 'bg-line text-ink';
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans">

      <Header
        isLoggedIn={isLoggedIn}
        userImgUrl={userImgUrl}
        activeMenu="store"
        onLogout={() => { if (logout()) setIsLoggedIn(false); }}
      />

      {/* 2. 메인 스토어 컨텐츠 */}
      <main className="dv-shell pt-10 pb-20 space-y-10">

        {/* 상단 배너 영역 */}
        <section className="relative w-full h-48 rounded-[2.5rem] overflow-hidden bg-raised border border-line-strong text-ink shadow-2xl flex items-center px-12">
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
          <div className="relative z-10 space-y-2">
            <Badge className="bg-primary hover:bg-primary text-primary-ink border-none px-3">SEASON SPECIAL</Badge>
            <h1 className="text-3xl font-bold text-ink tracking-[-0.02em]">스토어</h1>
            <p className="text-ink-subtle text-sm font-medium">문제를 풀고 얻은 포인트로 당신의 능력을 시각화하세요.</p>
          </div>
          <Sparkles className="absolute right-12 w-24 h-24 text-primary/20" />
        </section>

        {/* 필터 및 검색 바 */}
        <section className="flex flex-col md:flex-row justify-between items-center gap-4">
          <Tabs defaultValue="all" className="w-full md:w-auto" onValueChange={setSelectedCategory}>
            <TabsList className="bg-panel border p-1 rounded-xl shadow-sm h-12">
              <TabsTrigger value="all" className="rounded-lg px-6 font-bold text-xs">전체</TabsTrigger>
              <TabsTrigger value="avatar" className="rounded-lg px-6 font-bold text-xs">아바타</TabsTrigger>
              <TabsTrigger value="theme" className="rounded-lg px-6 font-bold text-xs">테마</TabsTrigger>
              <TabsTrigger value="title" className="rounded-lg px-6 font-bold text-xs">칭호</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-3 h-4 w-4 text-ink-subtle" />
            <Input
              placeholder="아이템 이름 검색..."
              className="pl-10 bg-panel border-line rounded-xl h-11"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </section>

        {/* 아이템 그리드 */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <Card key={item.id} className="group border-line hover:shadow-xl transition-all duration-300 rounded-[2rem] overflow-hidden bg-panel">
              <CardHeader className="flex flex-col items-center justify-center pt-10 pb-6 bg-raised/50 group-hover:bg-primary/6 transition-colors">
                <div className="p-6 bg-panel rounded-[1.5rem] shadow-sm group-hover:scale-110 transition-transform duration-500">
                  {item.icon}
                </div>
                <Badge className={`mt-6 rounded-full px-3 py-0.5 text-xs font-black uppercase tracking-tighter ${getRarityColor(item.rarity)}`}>
                  {item.rarity}
                </Badge>
              </CardHeader>
              <CardContent className="p-6 space-y-2">
                <h3 className="text-lg font-black text-ink group-hover:text-primary transition-colors">{item.name}</h3>
                <p className="text-xs text-ink-muted font-medium leading-relaxed">{item.desc}</p>
              </CardContent>
              <CardFooter className="p-6 pt-0 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-warning" />
                  <span className="text-lg font-black text-ink">{item.price.toLocaleString()}</span>
                </div>
                <Button
                  onClick={() => handlePurchase(item)}
                  variant={item.price === 0 ? "outline" : "default"}
                  className={`rounded-xl h-10 font-bold ${item.price !== 0 ? 'bg-raised border border-line-strong text-ink hover:bg-line' : ''}`}
                >
                  {item.price === 0 ? "무료" : "구매하기"}
                </Button>
              </CardFooter>
            </Card>
          ))}

          {filteredItems.length === 0 && (
            <div className="col-span-full py-20 text-center space-y-4">
              <SearchCode className="w-12 h-12 text-ink mx-auto" />
              <p className="text-ink-subtle font-bold">찾으시는 아이템이 스토어에 없습니다.</p>
            </div>
          )}
        </section>
      </main>

      {/* 3. 구매 확인 다이얼로그 */}
      <Dialog open={isPurchaseOpen} onOpenChange={setIsPurchaseOpen}>
        <DialogContent className="rounded-[2.5rem] sm:max-w-[400px]">
          <DialogHeader className="items-center py-4">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <ShoppingCart className="w-8 h-8 text-primary" />
            </div>
            <DialogTitle className="text-xl font-black">아이템 구매</DialogTitle>
            <DialogDescription className="text-center font-medium">
              정말로 <span className="text-primary font-black">{selectedItem?.name}</span>을(를) 구매하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <div className="bg-canvas p-4 rounded-2xl border flex justify-between items-center mb-4">
            <span className="text-sm font-bold text-ink-muted">결제 포인트</span>
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-warning" />
              <span className="font-black text-lg">{selectedItem?.price.toLocaleString()} P</span>
            </div>
          </div>
          <DialogFooter className="flex-row gap-2 sm:justify-center">
            <Button variant="ghost" onClick={() => setIsPurchaseOpen(false)} className="flex-1 rounded-xl font-bold">취소</Button>
            <Button onClick={confirmPurchase} className="flex-1 bg-primary hover:bg-primary-hover rounded-xl font-bold">구매 확정</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


// 아이콘: 검색 결과 없음용
function SearchCode({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24" height="24" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="m18 16 4 4" /><path d="m5 8-3 3 3 3" /><path d="m19 8 3 3-3 3" /><path d="m14 4-4 16" /><circle cx="12" cy="12" r="10" />
    </svg>
  );
}
