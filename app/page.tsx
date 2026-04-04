"use client";

import Link from "next/link";
import { Search, Settings, LogOut, User, Menu, Target, Zap, ShieldCheck, Flame, BookOpenText, 
  LayoutGrid, Users, BarChart3, Trophy, ShoppingBag 
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress"; // [추가] 진행바

export default function HomePage() {
  
  // [Mock Data] 현재 로그인한 사용자 정보 (나중에 DB 연동)
  const user = {
    name: "박단용",
    avatar: "/avatar.png",
    tier: "골드 I",
    score: 1850,
    solved: 125,
    ranking: 158,
    progress: 85, // 다음 티어까지 85%
  };

  // [Mock Data] 최신/추천 문제 목록
  const featuredProblems = [
    { id: 102, title: "숨겨진 플래그를 찾아라", category: "CTF", difficulty: "중", solvedCount: 1258 },
    { id: 105, title: "라운드로빈", category: "Process", difficulty: "상", solvedCount: 452 },
    { id: 108, title: "나만의 MFT", category: "File System", difficulty: "하", solvedCount: 2351 }, // [전공 특화]
  ];

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

      {/* 2. 메인 콘텐츠 영역 (Grid 시스템 안 씀 - 와이드하게 배치) */}
      <main className="container mx-auto max-w-[1500px] pt-10 px-6 pb-16 space-y-12">
        
        {/* [A] 히로 섹션 (Hero Section) : 환영 및 상태 요약 */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center bg-slate-950 p-10 rounded-3xl text-white shadow-2xl overflow-hidden relative">
          {/* 해커 감성 배경 데코레이션 */}
          <div className="absolute inset-0 opacity-10 font-mono text-[10px] text-green-400 leading-tight">
            {`01000100 01001011 00101101 01010111 01101111 01110010 01101100 01100100 
              11001010 11111110 10111010 10111110 01101110 01110101 01101011 01100001`}
          </div>
          
          <div className="col-span-2 space-y-4 relative z-10">
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight">
              반갑습니다, <span className="text-indigo-400">{user.name}</span>님!<br />
              오늘도 운영체제 바다로 떠나볼까요?
            </h1>
            <p className="text-slate-300 max-w-2xl text-lg">
              지금까지 <span className="font-bold text-indigo-300">{user.solved}개</span>의 문제를 해결하셨습니다. <br />
              현재 서버 랭킹 <span className="font-bold text-indigo-300">{user.ranking}위</span>이며, 다음 티어까지 얼마 남지 않았습니다!
            </p>
            <div className="flex gap-3 pt-3">
              <Button size="lg" className="bg-indigo-500 hover:bg-indigo-600 shadow-md">지금 문제 풀기 <Zap size={18} className="ml-2"/></Button>
              <Button size="lg" variant="outline" className="text-white border-white/20 hover:bg-white/10">내 풀이 기록 보기</Button>
            </div>
          </div>
          
          {/* 오른쪽: 티어 시각화 카드 */}
          <Card className="bg-white/5 border-none shadow-xl text-white backdrop-blur relative z-10">
            <CardContent className="pt-6 text-center space-y-4">
               <ShieldCheck className="w-20 h-20 text-indigo-400 mx-auto fill-current opacity-80" />
               <div className="space-y-1">
                 <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">현재 티어</p>
                 <p className="text-3xl font-black text-indigo-300">{user.tier}</p>
                 <p className="text-sm font-mono text-slate-300">{user.score} points</p>
               </div>
               <div className="space-y-1.5 pt-2">
                 <Progress value={user.progress} className="h-2 bg-white/10" indicatorClassName="bg-indigo-400" />
                 <p className="text-[11px] text-slate-400 text-right">다음 티어까지 {user.progress}%</p>
               </div>
            </CardContent>
          </Card>
        </section>

        {/* [B] 핵심 챌린지 영역 (Featured Challenges) : 카드 레이아웃 */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
             <h2 className="text-2xl font-black text-slate-950 flex items-center gap-3">
               <Target className="w-6 h-6 text-red-500" />
               이 주의 추천 챌린지
             </h2>
             <Link href="/challenges" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">전체 문제 보기 →</Link>
          </div>x
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredProblems.map((prob) => (
              <Card key={prob.id} className="border-slate-100 shadow-sm hover:shadow-lg transition-shadow duration-300 cursor-pointer group rounded-2xl overflow-hidden">
                 {/* 카드 상단 카테고리별 색상 띠 */}
                 <div className={`h-2 ${
                   prob.category === "Web" ? "bg-sky-400" :
                   prob.category === "Pwnable" ? "bg-red-400" :
                   prob.category === "Forensics" ? "bg-emerald-400" : "bg-slate-400"
                 }`}/>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className="font-normal text-[10px]">{prob.category}</Badge>
                    <Badge variant={prob.difficulty === "상" ? "destructive" : prob.difficulty === "중" ? "default" : "secondary"} className="text-[10px]">
                      난이도: {prob.difficulty}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                    {prob.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 pb-5 text-xs text-slate-400 flex justify-between items-center">
                   <p>문제 번호: {prob.id}</p>
                   <p className="flex items-center gap-1"><ShieldCheck size={14} /> {prob.solvedCount.toLocaleString()}명 해결</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* [C] 하단 영역 (Community & Groups) : 2열 레이아웃 */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
           
           {/* 최근 활동 (Community Feed) */}
           <Card className="border-slate-100 shadow-none rounded-2xl">
              <CardHeader className="pb-3">
                 <CardTitle className="text-xl font-bold flex items-center gap-2">
                   <Flame className="w-5 h-5 text-orange-500" /> 최근 활동 로드
                 </CardTitle>
                 <CardDescription>플랫폼 내에서 일어나는 실시간 풀이 기록입니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2 font-mono text-sm text-slate-600">
                 <p>→ <span className="font-bold text-blue-600">DanKook</span>님이 [포렌식 108] 문제를 해결했습니다.</p>
                 <p>→ <span className="font-bold text-slate-800">Newbie</span>님이 [Web 102]에 댓글을 남겼습니다.</p>
                 <p>→ <span className="font-bold text-red-600">Security</span>님이 [Pwnable 105]에 제출했습니다. (틀렸습니다)</p>
                 <p>→ <span className="font-bold text-slate-800">Hacker1</span>님이 '알고리즘 기사단' 그룹에 가입했습니다.</p>
              </CardContent>
           </Card>

           {/* 내 그룹 (My Groups) */}
           <Card className="border-slate-100 shadow-none rounded-2xl">
              <CardHeader className="pb-3">
                 <CardTitle className="text-xl font-bold flex items-center gap-2">
                   <BookOpenText className="w-5 h-5 text-purple-500" /> 내 학습 그룹
                 </CardTitle>
                 <CardDescription>소속된 그룹의 소식과 랭킹을 확인합니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                 <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-100">
                    <span className="font-bold text-purple-800 text-sm">알고리즘 기사단</span>
                    <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">Official</Badge>
                 </div>
                 <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                    <span className="font-medium text-slate-700 text-sm">단붕이와 함께 춤을</span>
                    <Badge variant="outline" className="text-slate-500">일반</Badge>
                 </div>
              </CardContent>
           </Card>
        </section>

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