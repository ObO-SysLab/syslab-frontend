"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Search, Bell, LogOut, Menu, LayoutGrid, Users, BarChart3, Trophy, ShoppingBag,
  Coins, Sparkles, UserCircle2, Palette, ShieldCheck, Tag, ShoppingCart,
  Check, Info, Filter, ArrowUpRight
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// --- [Mock Data] 스토어 아이템 목록 ---
const STORE_ITEMS = [
  { id: 1, category: "avatar", name: "사이버 수사대", desc: "전문적인 분위기의 요원 아바타", price: 5000, rarity: "Epic", icon: <ShieldCheck className="w-10 h-10 text-indigo-500" /> },
  { id: 2, category: "avatar", name: "네온 해커", desc: "빛나는 네온 사인이 특징인 아바타", price: 3500, rarity: "Rare", icon: <UserCircle2 className="w-10 h-10 text-pink-500" /> },
  { id: 3, category: "theme", name: "다크 커널", desc: "터미널 느낌의 딥 다크한 프로필 테마", price: 8000, rarity: "Legendary", icon: <Palette className="w-10 h-10 text-slate-800" /> },
  { id: 4, category: "title", name: "Binary Hunter", desc: "닉네임 옆에 붙는 특별한 칭호", price: 2000, rarity: "Common", icon: <Tag className="w-10 h-10 text-emerald-500" /> },
  { id: 5, category: "theme", name: "오션 드라이브", desc: "시원한 파란색 포인트 테마", price: 3000, rarity: "Rare", icon: <Palette className="w-10 h-10 text-blue-400" /> },
  { id: 6, category: "avatar", name: "어셈블리 장인", desc: "로우레벨 느낌이 물씬 풍기는 아바타", price: 4500, rarity: "Rare", icon: <UserCircle2 className="w-10 h-10 text-amber-500" /> },
  { id: 7, category: "title", name: "Root Access", desc: "모든 권한을 가진 자의 칭호", price: 10000, rarity: "Legendary", icon: <Tag className="w-10 h-10 text-rose-500" /> },
  { id: 8, category: "avatar", name: "기본 요원", desc: "Diveon의 기본 제공 아바타", price: 0, rarity: "Common", icon: <UserCircle2 className="w-10 h-10 text-slate-400" /> },
];

export default function StorePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [userPoints, setUserPoints] = useState(12500); // 사용자 보유 포인트
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // 구매 다이얼로그 상태
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

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
    switch(rarity) {
      case 'Legendary': return 'bg-rose-500 text-white';
      case 'Epic': return 'bg-indigo-500 text-white';
      case 'Rare': return 'bg-blue-500 text-white';
      default: return 'bg-slate-200 text-slate-700';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      
      {/* 1. 고정 헤더 */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Menu className="h-6 w-6 text-slate-500 cursor-pointer lg:hidden" />
          <Link href="/" className="text-2xl font-black tracking-tighter text-slate-900 mr-4">Diveon</Link>
          <nav className="hidden lg:flex items-center gap-1">
            <NavMenuLink href="/challenges" icon={<LayoutGrid size={18} />} label="챌린지" />
            <NavMenuLink href="/contests" icon={<Trophy size={18} />} label="대회" />
            <NavMenuLink href="/groups" icon={<Users size={18} />} label="그룹" />
            <NavMenuLink href="/ranking" icon={<BarChart3 size={18} />} label="랭킹" />
            <NavMenuLink href="/store" icon={<ShoppingBag size={18} />} label="스토어" active />
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <>
              {/* 포인트 표시 영역 */}
              <div className="hidden md:flex items-center gap-2 bg-indigo-50 px-4 py-1.5 rounded-full border border-indigo-100">
                <Coins className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-black text-indigo-700">{userPoints.toLocaleString()} P</span>
              </div>
              <button className="p-2 hover:bg-slate-100 rounded-full relative group">
                <Bell className="h-5 w-5 text-slate-500" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
              <Link href="/settings">
                <Avatar className="h-9 w-9 border hover:ring-2 hover:ring-indigo-100 transition-all cursor-pointer">
                  <AvatarFallback className="bg-slate-100 text-xs font-bold text-slate-600">DY</AvatarFallback>
                </Avatar>
              </Link>
              <button onClick={() => setIsLoggedIn(false)} className="p-2 hover:bg-red-50 rounded-full text-red-500"><LogOut className="h-5 w-5" /></button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/signin"><Button variant="ghost" className="text-sm font-bold">Sign In</Button></Link>
              <Link href="/signup"><Button className="bg-slate-900 text-white rounded-full px-5">Get Started</Button></Link>
            </div>
          )}
        </div>
      </header>

      {/* 2. 메인 스토어 컨텐츠 */}
      <main className="container mx-auto max-w-[1200px] pt-10 px-4 pb-20 space-y-10">
        
        {/* 상단 배너 영역 */}
        <section className="relative w-full h-48 rounded-[2.5rem] overflow-hidden bg-slate-900 shadow-2xl flex items-center px-12">
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
          <div className="relative z-10 space-y-2">
            <Badge className="bg-indigo-500 hover:bg-indigo-500 text-white border-none px-3">SEASON SPECIAL</Badge>
            <h2 className="text-3xl font-black text-white tracking-tight italic">Diveon Premium Store</h2>
            <p className="text-slate-400 text-sm font-medium">문제를 풀고 얻은 포인트로 당신의 능력을 시각화하세요.</p>
          </div>
          <Sparkles className="absolute right-12 w-24 h-24 text-indigo-500/20" />
        </section>

        {/* 필터 및 검색 바 */}
        <section className="flex flex-col md:flex-row justify-between items-center gap-4">
          <Tabs defaultValue="all" className="w-full md:w-auto" onValueChange={setSelectedCategory}>
            <TabsList className="bg-white border p-1 rounded-xl shadow-sm h-12">
              <TabsTrigger value="all" className="rounded-lg px-6 font-bold text-xs">전체</TabsTrigger>
              <TabsTrigger value="avatar" className="rounded-lg px-6 font-bold text-xs">아바타</TabsTrigger>
              <TabsTrigger value="theme" className="rounded-lg px-6 font-bold text-xs">테마</TabsTrigger>
              <TabsTrigger value="title" className="rounded-lg px-6 font-bold text-xs">칭호</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="아이템 이름 검색..." 
              className="pl-10 bg-white border-slate-200 rounded-xl h-11"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </section>

        {/* 아이템 그리드 */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <Card key={item.id} className="group border-slate-200 hover:shadow-xl transition-all duration-300 rounded-[2rem] overflow-hidden bg-white">
              <CardHeader className="flex flex-col items-center justify-center pt-10 pb-6 bg-slate-50/50 group-hover:bg-indigo-50/30 transition-colors">
                <div className="p-6 bg-white rounded-[1.5rem] shadow-sm group-hover:scale-110 transition-transform duration-500">
                  {item.icon}
                </div>
                <Badge className={`mt-6 rounded-full px-3 py-0.5 text-[10px] font-black uppercase tracking-tighter ${getRarityColor(item.rarity)}`}>
                  {item.rarity}
                </Badge>
              </CardHeader>
              <CardContent className="p-6 space-y-2">
                <h3 className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{item.name}</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">{item.desc}</p>
              </CardContent>
              <CardFooter className="p-6 pt-0 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-amber-500" />
                  <span className="text-lg font-black text-slate-900">{item.price.toLocaleString()}</span>
                </div>
                <Button 
                  onClick={() => handlePurchase(item)}
                  variant={item.price === 0 ? "outline" : "default"} 
                  className={`rounded-xl h-10 font-bold ${item.price !== 0 ? 'bg-slate-900 hover:bg-slate-800' : ''}`}
                >
                  {item.price === 0 ? "무료" : "구매하기"}
                </Button>
              </CardFooter>
            </Card>
          ))}
          
          {filteredItems.length === 0 && (
            <div className="col-span-full py-20 text-center space-y-4">
              <SearchCode className="w-12 h-12 text-slate-200 mx-auto" />
              <p className="text-slate-400 font-bold">찾으시는 아이템이 스토어에 없습니다.</p>
            </div>
          )}
        </section>
      </main>

      {/* 3. 구매 확인 다이얼로그 */}
      <Dialog open={isPurchaseOpen} onOpenChange={setIsPurchaseOpen}>
        <DialogContent className="rounded-[2.5rem] sm:max-w-[400px]">
          <DialogHeader className="items-center py-4">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
              <ShoppingCart className="w-8 h-8 text-indigo-600" />
            </div>
            <DialogTitle className="text-xl font-black">아이템 구매</DialogTitle>
            <DialogDescription className="text-center font-medium">
              정말로 <span className="text-indigo-600 font-black">{selectedItem?.name}</span>을(를) 구매하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <div className="bg-slate-50 p-4 rounded-2xl border flex justify-between items-center mb-4">
            <span className="text-sm font-bold text-slate-500">결제 포인트</span>
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-500" />
              <span className="font-black text-lg">{selectedItem?.price.toLocaleString()} P</span>
            </div>
          </div>
          <DialogFooter className="flex-row gap-2 sm:justify-center">
            <Button variant="ghost" onClick={() => setIsPurchaseOpen(false)} className="flex-1 rounded-xl font-bold">취소</Button>
            <Button onClick={confirmPurchase} className="flex-1 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold">구매 확정</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 보조 컴포넌트: 네비게이션 링크
function NavMenuLink({ href, icon, label, active = false }: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <Link 
      href={href} 
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
        active ? "text-indigo-600 bg-indigo-50" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
      }`}
    >
      <span>{icon}</span>
      {label}
    </Link>
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
      <path d="m18 16 4 4"/><path d="m5 8-3 3 3 3"/><path d="m19 8 3 3-3 3"/><path d="m14 4-4 16"/><circle cx="12" cy="12" r="10"/>
    </svg>
  );
}