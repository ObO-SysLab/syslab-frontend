"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, LogOut, Bell, Menu, Target, Zap, ShieldCheck, Flame, BookOpenText, 
  LayoutGrid, BarChart3, Users, Trophy, ShoppingBag 
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress"; 
import { mockUser, mockFeaturedProblems } from "@/lib/mockData"


export default function HomePage() {
  // 현재 로그인 상태를 관리
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false); 
  const [userName, setUserName] = useState("Guest"); 

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsLoggedIn(true);
      
      // 실제로는 아래처럼 로컬스토리지에 저장해 둔 정보를 가져오거나 토큰을 디코딩합니다.
      // const storedRole = localStorage.getItem("role"); 
      // const storedName = localStorage.getItem("nickname");
      
      // 임시 테스트용 조건 (실제 서비스에서는 지우고 위 로직 사용)
      const isTestAdmin = true; 

      if (isTestAdmin /* || storedRole === "admin" */) {
        setIsAdmin(true);
      }
      // setUserName(storedName || mockUser.name);
      setUserName(mockUser.name); 
    }
  }, []);

  // 로그아웃 핸들러
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role"); 
    localStorage.removeItem("nickname"); 
    setIsLoggedIn(false);
    setIsAdmin(false);
    window.location.reload(); 
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      
      {/* 1. 고정 헤더 (기존 디자인 유지) */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8"> 
          {/* [A] Diveon 로고 */}
          <Menu className="h-6 w-6 text-slate-500 cursor-pointer lg:hidden" />
          <Link href="/" className="text-2xl font-black tracking-tighter text-slate-900 mr-4">
            Diveon
          </Link>
          
          {/* [B] 중앙 네비게이션 메뉴 */}
          <nav className="hidden lg:flex items-center gap-1">
            <NavMenuLink href="/challenges" icon={<LayoutGrid size={18} />} label="챌린지" />
            <NavMenuLink href="/contests" icon={<Trophy size={18} />} label="대회" />
            <NavMenuLink href="/groups" icon={<Users size={18} />} label="그룹" />
            <NavMenuLink href="/ranking" icon={<BarChart3 size={18} />} label="랭킹" />
            <NavMenuLink href="/store" icon={<ShoppingBag size={18} />} label="스토어" />
          </nav>
        </div>

        {/* [C] 검색창 영역 */}
        <div className="flex-1 max-w-sm px-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input type="search" placeholder="검색..." className="pl-9 bg-slate-50 border-slate-200 rounded-full h-9 text-sm" />
          </div>
        </div>

        {/* [D] 우측 사용자 영역 (로그인 상태에 따라 가변적) */}
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            /* --- 로그인된 상태: 알림 + 프로필(동글) + 로그아웃 --- */
            <>
              <button className="p-2 hover:bg-slate-100 rounded-full transition-colors relative group">
                <Bell className="h-5 w-5 text-slate-500 group-hover:text-slate-900" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>

              <Link href="/settings">
                <Avatar className="h-9 w-9 border border-slate-200 hover:ring-2 hover:ring-indigo-100 transition-all cursor-pointer">
                  <AvatarImage src="/avatar.png" alt="mockUser" />
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
            /* --- 로그아웃된 상태: 로그인 / 시작하기 버튼 --- */
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
              반갑습니다, <span className="text-indigo-400">{mockUser.name}</span>님!<br />
              오늘도 운영체제 바다로 떠나볼까요?
            </h1>
            <p className="text-slate-300 max-w-2xl text-lg">
              지금까지 <span className="font-bold text-indigo-300">{mockUser.solved}개</span>의 문제를 해결하셨습니다. <br />
              현재 서버 랭킹 <span className="font-bold text-indigo-300">{mockUser.ranking}위</span>이며, 다음 티어까지 얼마 남지 않았습니다!
            </p>
            <div className="flex gap-3 pt-3">
              <Button size="lg" className="bg-indigo-500 hover:bg-indigo-600 shadow-md">지금 문제 풀기 <Zap size={18} className="ml-2"/></Button>
              <Button size="lg" variant="outline" className="text-indigo-300 border-white/10 hover:bg-white/[0.05] hover:text-white hover:border-white/20 transition-all duration-300">내 풀이 기록 보기</Button>
            </div>
          </div>
          
          {/* 오른쪽: 티어 시각화 카드 */}
          <Card className="bg-white/5 border-none shadow-xl text-white backdrop-blur relative z-10">
            <CardContent className="pt-6 text-center space-y-4">
               <ShieldCheck className="w-20 h-20 text-indigo-400 mx-auto fill-current opacity-80" />
               <div className="space-y-1">
                 <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">현재 티어</p>
                 <p className="text-3xl font-black text-indigo-300">{mockUser.tier}</p>
                 <p className="text-sm font-mono text-slate-300">{mockUser.score} points</p>
               </div>
               <div className="space-y-1.5 pt-2">
                 <Progress value={mockUser.progress} className="h-2 bg-white/10" indicatorClassName="bg-indigo-400" />
                 <p className="text-[11px] text-slate-400 text-right">다음 티어까지 {mockUser.progress}%</p>
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
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {mockFeaturedProblems.map((prob) => (
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