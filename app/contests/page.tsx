"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, Settings, LogOut, User, Menu, Trophy, Calendar, Users, ShieldAlert, Award,
  LayoutGrid, BarChart3, ShoppingBag, Bell
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { mockContests } from "@/lib/mockData";


export default function ContestListPage() {
  // 현재 로그인 상태를 관리 (나중에는 실제 토큰 유무로 판단)
  const [isLoggedIn, setIsLoggedIn] = useState(true);


  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      
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
            <NavMenuLink href="/mockContests" icon={<Trophy size={18} />} label="대회" />
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

      {/* 2. 메인 레이아웃 (Grid 12분할) */}
      <main className="container mx-auto max-w-[1500px] pt-6 grid grid-cols-1 md:grid-cols-12 gap-6 px-4 pb-12">

        {/* [A] 좌측 사이드바 (2칸) */}
        <aside className="col-span-12 md:col-span-2 space-y-4">
          <Card className="border-slate-200 shadow-none bg-slate-50/50">
             <CardHeader className="pb-3">
               <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider text-slate-500">
                 <ShieldAlert className="w-4 h-4" /> 주의사항
               </CardTitle>
             </CardHeader>
             <CardContent className="text-[11px] leading-relaxed text-slate-600 space-y-2">
               <p>• 다중 계정 사용 시 영구 제재 처리됩니다.</p>
               <p>• 문제 풀이 공유는 대회 종료 후 공식 게시판에서만 가능합니다.</p>
               <p>• 시스템 공격 행위는 즉시 실격 사유입니다.</p>
             </CardContent>
          </Card>
        </aside>

        {/* [B] 중앙 콘텐츠 영역 (8칸) */}
        <section className="col-span-12 md:col-span-8 space-y-6">
          <div className="flex items-end justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-black tracking-tighter text-slate-950">CONTESTS</h1>
              <p className="text-slate-500">실력을 증명하고 명예로운 칭호를 획득하세요.</p>
            </div>
          </div>

          <Tabs defaultValue="all" className="w-full">
            <TabsList className="bg-slate-100 p-1 mb-6">
              <TabsTrigger value="all">전체</TabsTrigger>
              <TabsTrigger value="ongoing">진행 중</TabsTrigger>
              <TabsTrigger value="upcoming">예정</TabsTrigger>
              <TabsTrigger value="ended">종료</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4 animate-in fade-in-50 duration-500">
              {mockContests.map((contest) => (
                <Card key={contest.id} className={`overflow-hidden border-slate-200 hover:border-indigo-300 transition-all shadow-sm ${contest.status === "진행 중" ? "ring-1 ring-indigo-500/20" : ""}`}>
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      {/* 상태 표시 컬러바 */}
                      <div className={`w-full md:w-2 h-2 md:h-auto ${
                        contest.status === "진행 중" ? "bg-green-500" :
                        contest.status === "접수 중" ? "bg-indigo-500" : "bg-slate-300"
                      }`} />
                      
                      <div className="flex-1 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={contest.status === "진행 중" ? "default" : "secondary"} className={contest.status === "진행 중" ? "bg-green-500 hover:bg-green-600" : ""}>
                              {contest.status}
                            </Badge>
                            {contest.isHot && <Badge variant="destructive" className="animate-pulse">HOT</Badge>}
                            <span className="text-xs font-bold text-indigo-600">{contest.type}</span>
                          </div>
                          <h3 className="text-xl font-bold text-slate-900">{contest.title}</h3>
                          <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-sm text-slate-500 font-medium">
                            <span className="flex items-center gap-1.5"><Calendar size={14}/> {contest.date}</span>
                            <span className="flex items-center gap-1.5"><Users size={14}/> {contest.participants}명 참여 중</span>
                            <span className="flex items-center gap-1.5 text-amber-600"><Award size={14}/> {contest.prize}</span>
                          </div>
                        </div>
                        <div className="w-full md:w-auto">
                          <Button className={`w-full md:w-32 ${contest.status === "진행 중" ? "bg-green-600 hover:bg-green-700" : "bg-slate-900"}`} disabled={contest.status === "종료"}>
                            {contest.status === "종료" ? "대회 종료" : "참가하기"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </section>

        {/* [C] 우측 정보 패널 (2칸) */}
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