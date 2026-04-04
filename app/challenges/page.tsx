"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Search, Settings, LogOut, User, Menu, CheckCircle2, 
  Lock, Code2, Shield, Terminal, SearchCode, Database, 
  LayoutGrid, Users, BarChart3, ShoppingBag, Trophy 
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function ProblemListPage() {
  // 1. [상태 관리] 필터 조건들을 저장하는 상자들
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [showUnsolved, setShowUnsolved] = useState(false);

  // 2. [데이터] 원본 문제 리스트 (데이터베이스 역할을 하는 Mock Data)
  const groups = [
    { id: 1, title: "라운드로빈", author: "박단용", category: "Process", level: "1", successRate: "78%", solved: true },
    { id: 2, title: "FIFO", author: "조트리버", category: "Process", level: "1", successRate: "75%", solved: true },
    { id: 3, title: "문제1", author: "어굿이야", category: "Process", level: "2", successRate: "72%", solved: true },
    { id: 4, title: "문제2", author: "백준 고수", category: "Process", level: "2", successRate: "73%", solved: true },
    { id: 5, title: "문제3", author: "오마에와모", category: "Process", level: "2", successRate: "32%", solved: false },
    { id: 6, title: "문제4", author: "아단최", category: "Process", level: "3", successRate: "18%", solved: false },
    { id: 7, title: "문제5", author: "아단최", category: "Process", level: "3", successRate: "52%", solved: false },
    { id: 8, title: "문제6", author: "아단최", category: "Process", level: "3", successRate: "10%", solved: false },
  ];

  // 3. [로직] 상태값에 따라 실시간으로 필터링된 결과 계산 (Derived State)
  const filteredProblems = groups.filter((prob) => {
    const categoryMatch = selectedCategory === "All" || prob.category === selectedCategory;
    const levelMatch = selectedLevel === null || prob.level === selectedLevel;
    const unsolvedMatch = showUnsolved ? prob.solved === false : true;

    return categoryMatch && levelMatch && unsolvedMatch;
  });

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      
      {/* 4. 고정 헤더 (GNB) */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Menu className="h-6 w-6 text-slate-500 cursor-pointer lg:hidden" />
          <Link href="/" className="text-2xl font-black tracking-tighter text-slate-900 mr-4">
            Diveon
          </Link>
          <nav className="hidden lg:flex items-center gap-1">
            <NavMenuLink href="/challenges" icon={<LayoutGrid size={18} />} label="챌린지" active />
            <NavMenuLink href="/contests" icon={<Trophy size={18} />} label="대회" />
            <NavMenuLink href="/groups" icon={<Users size={18} />} label="그룹" />
            <NavMenuLink href="/ranking" icon={<BarChart3 size={18} />} label="랭킹" />
            <NavMenuLink href="/store" icon={<ShoppingBag size={18} />} label="스토어" />
          </nav>
        </div>

        <div className="flex-1 max-w-sm px-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input type="search" placeholder="검색..." className="pl-9 bg-slate-50 border-slate-200 rounded-full h-9 text-sm" />
          </div>
        </div>

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

      {/* 5. 메인 레이아웃 */}
      <main className="container mx-auto max-w-[1500px] pt-8 grid grid-cols-1 md:grid-cols-12 gap-8 px-4 pb-12">

        {/* [A] 좌측 사이드바: 필터 컨트롤러 */}
        <aside className="hidden md:block col-span-2 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 px-1">Categories</h3>
            <nav className="space-y-1">
              {["All", "Process", "Memory", "Storage", "Security"].map((cat) => (
                <CategoryItem 
                  key={cat}
                  icon={<Code2 size={16}/>} 
                  label={cat} 
                  active={selectedCategory === cat}
                  onClick={() => setSelectedCategory(cat)}
                />
              ))}
            </nav>
          </div>

          <div className="pt-4 border-t">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 px-1">Difficulty</h3>
            <div className="flex flex-wrap gap-2">
              {["1", "2", "3", "4", "5"].map(lvl => (
                <Badge 
                  key={lvl} 
                  variant={selectedLevel === lvl ? "default" : "outline"} 
                  className="cursor-pointer hover:bg-slate-100 px-3 py-1"
                  onClick={() => setSelectedLevel(selectedLevel === lvl ? null : lvl)}
                >
                  Lvl {lvl}
                </Badge>
              ))}
            </div>
          </div>
          <Separator />
          <div className="p-5 bg-slate-900 rounded-2xl text-white space-y-3 shadow-lg">
              <p className="text-xs font-bold text-indigo-400 uppercase tracking-tighter">My Ranking</p>
              <p className="text-2xl font-black italic">#158 <span className="text-sm font-normal text-slate-400">/ 5,200</span></p>
              <Button variant="secondary" size="sm" className="w-full text-xs font-bold bg-white text-slate-900 hover:bg-slate-200">내 전적 보기</Button>
          </div>
        </aside>

        {/* [B] 중앙 콘텐츠 영역: 필터링된 결과 출력 */}
        <section className="col-span-12 md:col-span-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6">
            <div className="space-y-1">
              <h1 className="text-3xl font-black tracking-tighter text-slate-950 italic uppercase">Challenges</h1>
              <p className="text-slate-500 font-medium">검색된 문제: {filteredProblems.length}개</p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant={showUnsolved ? "default" : "outline"} 
                size="sm"
                className="rounded-xl font-bold"
                onClick={() => setShowUnsolved(!showUnsolved)}
              >
                {showUnsolved ? "모든 문제 보기" : "미해결 문제만 보기"}
              </Button>
              <Button size="sm" className="bg-slate-950 rounded-xl font-bold">랜덤 문제</Button>
            </div>
          </div>

          <div className="grid gap-3">
            {filteredProblems.length > 0 ? (
              filteredProblems.map((prob) => (
                <Card key={prob.id} className="p-4 flex justify-between hover:shadow-md transition-all cursor-pointer group border-slate-100 rounded-xl overflow-hidden">
                  <div className="flex justify-between gap-4 w-full">
                    <div className="flex">
                      <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                        <Code2 size={20} />
                      </div>
                      <div className="px-4">
                        <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {prob.title} {prob.solved && <CheckCircle2 className="inline ml-1 h-3.5 w-3.5 text-green-500" />}
                        </h3>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">출제자: {prob.author}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="hidden sm:block text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Success Rate</p>
                        <p className="text-sm font-mono font-bold text-slate-600">{prob.successRate}</p>
                      </div>
                      <Badge variant={prob.level === "3" ? "destructive" : prob.level === "2" ? "default" : "secondary"} className="h-fit">
                        Lvl {prob.level}
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-24 text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl space-y-2">
                <SearchCode className="mx-auto h-12 w-12 text-slate-200" />
                <p className="font-bold">조건에 맞는 문제가 없습니다.</p>
                <Button variant="link" onClick={() => {setSelectedCategory("All"); setSelectedLevel(null); setShowUnsolved(false);}}>필터 초기화</Button>
              </div>
            )}
          </div>
          
          <div className="flex justify-center gap-2 pt-6">
             <Button variant="outline" size="sm" disabled className="rounded-lg">이전</Button>
             <Button variant="outline" size="sm" className="bg-slate-950 text-white border-slate-950 rounded-lg">1</Button>
             <Button variant="outline" size="sm" className="rounded-lg">2</Button>
             <Button variant="outline" size="sm" className="rounded-lg">다음</Button>
          </div>
        </section>

        {/* [C] 우측 광고/패널 영역 */}
        <aside className="hidden md:block col-span-2">
          <div className="sticky top-24 space-y-4">
            <div className="border border-slate-100 rounded-2xl h-64 flex flex-col items-center justify-center bg-slate-50 text-slate-400 text-xs font-bold p-6 text-center leading-relaxed">
              <ShoppingBag className="mb-2 h-6 w-6 opacity-20" />
              나만의 아이템으로 <br /> 프로필을 꾸며보세요!
            </div>
          </div>
        </aside>

      </main>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 보조 컴포넌트 */
/* -------------------------------------------------------------------------- */

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

function CategoryItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
        active 
          ? "bg-slate-950 text-white shadow-lg shadow-slate-200" 
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-950"
      }`}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}