"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Search, Bell, LogOut,  Menu, CheckCircle2, Code2,  SearchCode, 
  LayoutGrid, Users, BarChart3, ShoppingBag, Trophy 
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { challenges } from "@/lib/mockData"; // 2. [데이터] 문제 리스트 목 데이터


export default function ProblemListPage() {
  // 현재 로그인 상태를 관리 (나중에는 실제 토큰 유무로 판단)
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  // 1. [상태 관리] 필터 조건들을 저장하는 상자들
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [showUnsolved, setShowUnsolved] = useState(false);  

  // 3. [로직] 상태값에 따라 실시간으로 필터링된 결과 계산 (Derived State)
  const filteredProblems = challenges.filter((prob) => {
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

        {/* 우측 사용자 영역 (로그인 상태에 따라 가변적) */}
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            /* --- [A] 로그인된 상태: 알림 + 프로필(동글) + 로그아웃 --- */
            <>
              <button className="p-2 hover:bg-slate-100 rounded-full transition-colors relative group">
                <Bell className="h-5 w-5 text-slate-500 group-hover:text-slate-900" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>

              <Link href="/settings">
                <Avatar className="h-9 w-9 border border-slate-200 hover:ring-2 hover:ring-indigo-100 transition-all cursor-pointer">
                  <AvatarImage src="/avatar.png" alt="User" />
                  <AvatarFallback className="bg-slate-100 text-xs font-bold text-slate-600">DY</AvatarFallback>
                </Avatar>
              </Link>

              <button 
                onClick={() => setIsLoggedIn(false)}
                className="p-2 hover:bg-red-50 rounded-full text-red-500 transition-colors group"
              >
                <LogOut className="h-5 w-5 group-hover:scale-110 transition-transform" />
              </button>
            </>
          ) : (
            /* --- [B] 로그아웃된 상태: 로그인 / 시작하기 버튼 --- */
            <div className="flex items-center gap-2">
              <Link href="/signin">
                <Button variant="ghost" className="text-sm font-bold text-slate-600">Sign In</Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-slate-900 text-white text-sm font-bold rounded-full px-5 shadow-lg shadow-slate-200">
                  Get Started
                </Button>
              </Link>
            </div>
          )}
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

          {/* [수정된 부분] 중앙 콘텐츠 영역의 문제 리스트 출력부 */}
          <div className="grid gap-3">
            {filteredProblems.length > 0 ? (
              filteredProblems.map((prob) => {
                return (
                  <Link 
                    key={prob.id} 
                    href={`/challenges/detail?id=${prob.id}`} 
                    className="block group"
                  >
                    <Card className="p-4 hover:shadow-md transition-all cursor-pointer border-slate-100 rounded-xl overflow-hidden group-hover:border-indigo-200 group-hover:bg-indigo-50/5">
                      
                      {/* Card 내부에 flex-row를 강제하는 div 래퍼 추가 */}
                      <div className="flex w-full flex-row items-center justify-between">
                        
                        {/* [A] 좌측 그룹: 사진(아이콘) + 제목 + 출제자 */}
                        <div className="flex items-center gap-4">
                          {/* 1. 좌측 코드 아이콘 박스 (flex-shrink-0 추가하여 찌그러짐 방지) */}
                          <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                            <Code2 size={20} />
                          </div>

                          {/* 2. 제목 및 출제자 정보 */}
                          <div className="flex flex-col justify-center">
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                {prob.title}
                              </h3>
                              {prob.solved && (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-50" />
                              )}
                            </div>
                            <p className="text-[13px] text-slate-400 mt-0.5">
                              출제자: {prob.author}
                            </p>
                          </div>
                        </div>

                        {/* [B] 우측 그룹: 성공률 + 난이도 배지 영역 */}
                        <div className="flex items-center gap-8">
                          {/* 성공률 (Success Rate) */}
                          <div className="text-right min-w-[100px]">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              SUCCESS RATE
                            </p>
                            <p className="text-base font-bold text-slate-700">
                              {prob.successRate}
                            </p>
                          </div>

                          {/* 난이도 배지 (레벨에 따른 스타일 분기) */}
                          <div className="w-16 flex justify-end">
                            <Badge 
                              className={`
                                rounded-full px-3 py-0.5 text-[11px] font-bold border
                                ${prob.level === "1" ? "bg-white text-slate-600 border-slate-200" : ""}
                                ${prob.level === "2" ? "bg-slate-900 text-white border-slate-900" : ""}
                                ${prob.level === "3" ? "bg-white text-red-500 border-red-200" : ""}
                              `}
                            >
                              Lvl {prob.level}
                            </Badge>
                          </div>
                        </div>

                      </div>
                    </Card>
                  </Link>
                );
              })
            ) : (
              <div className="text-center py-24 text-slate-400 border-2 border-dashed border-slate-50 rounded-3xl">
                <SearchCode className="mx-auto h-12 w-12 text-slate-100 mb-2" />
                <p className="font-bold">조건에 맞는 문제가 없습니다.</p>
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