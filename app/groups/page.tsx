"use client";

import Link from "next/link";
import { Search, Settings, LogOut, User, Menu, Gamepad2, Code2, FolderLock, Monitor, 
  Shield, Terminal, SearchCode, Database, LayoutGrid, Users, BarChart3, Trophy, ShoppingBag 
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


export default function ProblemListPage() {
  const groups = [
    { id: 1, title: "DK-알고리즘 덕후 모임", leader: "박단용", tier: "1" },
    { id: 2, title: "그룹 이름 1", leader: "조트리버", tier: "1" },
    { id: 3, title: "그룹 이름 2", leader: "어굿이야", tier: "2" },
    { id: 4, title: "그룹 이름 3", leader: "백준 씹 고인물", tier: "2" },
    { id: 5, title: "그룹 이름 4", leader: "오마에와모신데이루", tier: "2" },
    { id: 6, title: "그룹 이름 5", leader: "아단최", tier: "3" },
    { id: 7, title: "그룹 이름 6", leader: "아단최", tier: "3" },
    { id: 8, title: "그룹 이름 7", leader: "아단최", tier: "3" },
  ];  

  return (
    <div className="min-h-screen bg-white text-slate-900">
      
      {/* 1. 고정 헤더 (기존 디자인 유지) */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8"> {/* gap을 넓혀서 메뉴 공간 확보 */}
          <Menu className="h-6 w-6 text-slate-500 cursor-pointer lg:hidden" />
          <Link href="/" className="text-2xl font-black tracking-tighter text-slate-900 mr-4">
            Diveon
          </Link>
          
          {/* 중앙 네비게이션 메뉴 */}
          <nav className="hidden lg:flex items-center gap-1">
            <NavMenuLink href="/challenges" icon={<LayoutGrid size={18} />} label="챌린지" />
            <NavMenuLink href="/contests" icon={<Trophy size={18} />} label="대회" />
            <NavMenuLink href="/groups" icon={<Users size={18} />} label="그룹" />
            <NavMenuLink href="/ranking" icon={<BarChart3 size={18} />} label="랭킹" />
            <NavMenuLink href="/store" icon={<ShoppingBag size={18} />} label="스토어" />
          </nav>
        </div>

        {/* 검색창 영역 */}
        <div className="flex-1 max-w-sm px-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input type="search" placeholder="검색..." className="pl-9 bg-slate-50 border-slate-200 rounded-full h-9 text-sm" />
          </div>
        </div>

        {/* 우측 아이콘 메뉴 (올바른 Link 사용법 적용) */}
        <div className="flex items-center gap-2">
          <Link href="/settings" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <User className="h-5 w-5 text-slate-600" />
          </Link>
          <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <Settings className="h-5 w-5 text-slate-600" />
          </button>
          <button className="p-2 hover:bg-slate-100 rounded-full text-red-500 transition-colors">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* =========================================
          2. 메인 컨텐츠 영역 (Grid 레이아웃)
      ========================================= */}
      <main className="container mx-auto max-w-[1500px] pt-8 grid grid-cols-1 md:grid-cols-12 gap-8 px-4 pb-12">
        
        {/* [A] 좌측 사이드바 (2칸) - 카테고리 필터 */}
        <aside className="hidden md:block col-span-2 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Categories</h3>
            <nav className="space-y-1">
              <CategoryItem icon={<Code2 size={16}/>} label="All" active />
              <CategoryItem icon={<Shield size={16}/>} label="Process" />
              <CategoryItem icon={<Terminal size={16}/>} label="Memory" />
              <CategoryItem icon={<SearchCode size={16}/>} label="Storage" />
              <CategoryItem icon={<Database size={16}/>} label="I/O Device" />
              <CategoryItem icon={<Database size={16}/>} label="Security" />
            </nav>
          </div>

          <div className="pt-4 border-t">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Difficulty</h3>
            <div className="flex flex-wrap gap-2">
              {["Lvl 1", "Lvl 2", "Lvl 3", "Lvl 4", "Lvl 5"].map(lvl => (
                <Badge key={lvl} variant="outline" className="cursor-pointer hover:bg-slate-100">{lvl}</Badge>
              ))}
            </div>
          </div>
        </aside>

        {/* [중앙 그룹 리스트] 8칸 차지 */}
        <section className="col-span-12 md:col-span-8 space-y-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-black tracking-tighter text-slate-950">Groups</h1>
              <p className="text-slate-500">그룹에 참여해 다른 사람들과 소통하세요.</p>
            </div>
          </div>
          
          <div className="grid gap-3">
            {groups.map((prob) => (
              <Card key={prob.id} className="p-4 flex justify-between hover:shadow-md transition-shadow cursor-pointer group">
                <div className="flex justify-between gap-4">
                  <div className="flex">
                    {/* 그룹 아이콘 (랜덤 색상 느낌) */}
                    <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                      <Code2 size={20} />
                    </div>
                    <div className="px-4">
                      <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {prob.title}
                      </h3>
                      <p className="text-sm text-slate-500">그룹장: {prob.leader}</p>
                    </div>
                  </div>
                  {/* 그룹 티어 */}
                  <div>
                    <Badge variant={prob.tier === "3" ? "destructive" : prob.tier === "2" ? "default" : "secondary"}>
                      티어: {prob.tier}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* [우측 광고/패널] 2칸 차지 */}
        <aside className="hidden md:block col-span-2">
          <div className="sticky top-24 space-y-4">
            {/* 광고 프레임 예시 */}
            <div className="border border-slate-200 rounded-xl h-64 flex items-center justify-center bg-slate-50">
              <span className="text-slate-400 text-sm">Advertisement Area</span>
            </div>
          </div>
        </aside>

      </main>
    </div>
  );
}

// [보조 컴포넌트] 사이드바 메뉴 아이템을 편하게 찍어내기 위함
function NavItem({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors ${
        active ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

// 보조 컴포넌트: 사이드바 아이템
function CategoryItem({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
      active 
        ? "bg-slate-900 text-white shadow-md" 
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

// 2. 헤더 메뉴 전용 보조 컴포넌트 [추가]
function NavMenuLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link 
      href={href} 
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all active:scale-95"
    >
      <span className="text-slate-400 group-hover:text-slate-900">{icon}</span>
      {label}
    </Link>
  );
}