"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Search, Settings, LogOut, User, Menu, Trophy, Calendar, Users, ShieldAlert, Award,
  LayoutGrid, BarChart3, ShoppingBag, Bell, CheckCircle2, Plus, Flag
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


export default function ContestListPage() {
  // [STATE] 페이지
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  // [STATE] 필터
  const [keyword, setKeyword] = useState("");
  const [showEntered, setShowEntered] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<"all" | "ongoing" | "upcoming" | "ended">("all");

  // [STATE] 데이터
  const [contests, setContests] = useState<any[]>([]);
  const [totalContests, setTotalContests] = useState(0);
  const [ads, setAds] = useState<any[]>([]);

  // [API] 초기 페이지 데이터 로드
  useEffect(() => {
    const fetchInitData = async () => {
      const token = localStorage.getItem("token");
      if (token) setIsLoggedIn(true);

      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      try {
        // 광고 API
      } catch (error) {
        console.error("초기 데이터 로드 실패:", error);
      }
    }

    fetchInitData();
  }, []);

  // [API] 대회 목록 조회
  useEffect(() => {
    const fetchGroups = async () => {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // 쿼리 파라미터 구성
      const params = new URLSearchParams();
      params.append("keyword", keyword);
      params.append("status", selectedStatus);
      params.append("onlyJoined", showEntered.toString());
      params.append("page", currentPage.toString());
      params.append("size", "10");

      try {
        const response = await fetch(`https://diveon.net/api/contests?${params.toString()}`, {
          method: "GET",
          headers,
        });

        if (response.ok) {
          const result = await response.json();
          setTotalContests(result.data.totalContests);
          setContests(result.data.contests);
          setTotalPages(result.data.totalPages);
        }
      } catch (error) {
        console.error("데이터 로드 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGroups();
  }, [selectedStatus, showEntered, currentPage, keyword]);


  // [HANDLER] 로그아웃
  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">

      {/* 1. 고정 헤더 (기존 디자인 유지) */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur px-6 h-16 flex items-center justify-between">
        { /* [A] Diveon 로고 영역 */}
        <div className="flex items-center gap-8">
          <Menu className="h-6 w-6 text-slate-500 cursor-pointer lg:hidden" />
          <Link href="/" className="text-2xl font-black tracking-tighter text-slate-900 mr-4">
            Diveon
          </Link>

          {/* [B] 중앙 네비게이션 메뉴 영역 */}
          <nav className="hidden lg:flex items-center gap-1">
            <NavMenuLink href="/challenges" icon={<Flag size={18} />} label="챌린지" />
            <NavMenuLink href="/contests" icon={<Trophy size={18} />} label="대회" active />
            <NavMenuLink href="/groups" icon={<Users size={18} />} label="그룹" />
            <NavMenuLink href="/ranking" icon={<BarChart3 size={18} />} label="랭킹" />
            <NavMenuLink href="/store" icon={<ShoppingBag size={18} />} label="스토어" />
          </nav>
        </div>

        { /* [C] 검색창 영역 */}
        <div className="flex-1 max-w-sm px-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              type="search"
              placeholder="검색..."
              className="pl-9 bg-slate-50 border-slate-200 rounded-full h-9 text-sm"
              value={keyword}
              onChange={(e) => {
                setCurrentPage(1);
                setKeyword(e.target.value);
              }}
            />
          </div>
        </div>

        { /* [D] 우측 사용자 영역 */}
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
                  <AvatarImage src="/avatar.png" alt="User" />
                  <AvatarFallback className="bg-slate-100 text-xs font-bold text-slate-600">DY</AvatarFallback>
                </Avatar>
              </Link>
              <button
                onClick={() => {
                  localStorage.removeItem("token");
                  setIsLoggedIn(false);
                }}
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

      {/* 2. 메인 레이아웃 (Grid 12분할) */}
      <main className="container mx-auto max-w-[1500px] pt-8 grid grid-cols-1 md:grid-cols-12 gap-6 px-4 pb-12">

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
        <section className="col-span-12 md:col-span-8 space-y-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6">
            <div className="space-y-1">
              <h1 className="text-3xl font-black tracking-tighter text-slate-950">CONTESTS</h1>
              <p className="text-slate-500 font-medium">검색된 대회: {totalContests}개</p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={showEntered ? "default" : "outline"}
                size="sm"
                className={`rounded-xl font-bold transition-all ${showEntered ? "bg-slate-900 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"
                  }`}
                onClick={() => setShowEntered(!showEntered)}
              >
                {showEntered ? "모든 대회 보기" : "참여한 대회만 보기"}
              </Button>

              {/* 대회 생성 버튼 */}
              <Link href="/contests/create">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-200 transition-all">
                  <Plus className="w-4 h-4 mr-1.5" /> 대회 생성하기
                </Button>
              </Link>
            </div>
          </div>

          <Tabs defaultValue="all" className="w-full">
            <TabsList className="bg-slate-100 p-1 mb-6">
              <TabsTrigger value="all" onClick={() => { setSelectedStatus("all"); setCurrentPage(1); }}>전체</TabsTrigger>
              <TabsTrigger value="ongoing" onClick={() => { setSelectedStatus("ongoing"); setCurrentPage(1); }}>진행 중</TabsTrigger>
              <TabsTrigger value="upcoming" onClick={() => { setSelectedStatus("upcoming"); setCurrentPage(1); }}>예정</TabsTrigger>
              <TabsTrigger value="ended" onClick={() => { setSelectedStatus("ended"); setCurrentPage(1); }}>종료</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4 animate-in fade-in-50 duration-500">
              {contests.map((contest) => (
                <Link
                  key={contest.contestId}
                  href={`/contests/detail?id=${contest.contestId}`}
                  className="block group"
                >
                  <Card key={contest.conestId} className={`overflow-hidden border-slate-200 hover:border-indigo-300 transition-all shadow-sm ${contest.status === "진행 중" ? "ring-1 ring-indigo-500/20" : ""}`}>
                    <CardContent className="p-0">
                      <div className="flex flex-col md:flex-row">
                        {/* 상태 표시 컬러바 */}
                        <div className={`w-full md:w-2 h-2 md:h-auto ${contest.status === "진행 중" ? "bg-green-500" :
                          contest.status === "접수 중" ? "bg-indigo-500" : "bg-slate-300"
                          }`} />

                        <div className="flex-1 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant={contest.status === "진행 중" ? "default" : "secondary"} className={contest.status === "진행 중" ? "bg-green-500 hover:bg-green-600" : ""}>
                                {contest.status}
                              </Badge>
                              {contest.isJoined && (
                                <Badge variant="outline" className="border-indigo-500 text-indigo-600 bg-indigo-50">
                                  <CheckCircle2 className="w-3 h-3 mr-1" /> 참가
                                </Badge>
                              )}
                              {contest.isHot && <Badge variant="destructive" className="animate-pulse">HOT</Badge>}
                              <span className="text-xs font-bold text-indigo-600">{contest.type}</span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">{contest.title}</h3>
                            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-sm text-slate-500 font-medium">
                              <span className="flex items-center gap-1.5"><Calendar size={14} /> {contest.startTime}/{contest.endTime}</span>
                              <span className="flex items-center gap-1.5"><Users size={14} /> {contest.participants}명 참여 중</span>
                              <span className="flex items-center gap-1.5 text-amber-600"><Award size={14} /> {contest.prize}</span>
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
                </Link>
              ))}
            </TabsContent>
          </Tabs>

          {/* API 연동된 페이지네이션 */}
          {totalContests > 0 && (
            <div className="flex justify-center gap-2 pt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="rounded-lg"
              >
                이전
              </Button>

              {Array.from({ length: totalPages }).map((_, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(i + 1)}
                  className={`rounded-lg ${currentPage === i + 1 ? 'bg-slate-950 text-white border-slate-950' : ''}`}
                >
                  {i + 1}
                </Button>
              ))}

              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="rounded-lg"
              >
                다음
              </Button>
            </div>
          )}
        </section>

        {/* [C] 우측 광고 패널 (2칸) */}
        <aside className="hidden md:block col-span-2">
          <div className="sticky top-24 space-y-4">
            {ads.length > 0 ? (
              ads.map((ad) => (
                <a key={ad.ad_id} href={ad.link_url} target="_blank" rel="noreferrer" className="block w-full overflow-hidden rounded-xl border border-slate-200 shadow-sm transition-transform hover:scale-105">
                  <img src={ad.image_url} alt={ad.alt_text} className="w-full object-cover" />
                </a>
              ))
            ) : (
              <div className="border border-slate-200 rounded-xl bg-slate-50 h-[600px] flex flex-col items-center justify-center text-slate-400 text-xs font-bold p-6 text-center leading-relaxed">
                <ShoppingBag className="mb-2 h-6 w-6 opacity-20" />
                광고 영역입니다.
              </div>
            )}
          </div>
        </aside>

      </main>
    </div>
  );
}

// [보조 컴포넌트] 헤더 메뉴 전용
function NavMenuLink({ href, icon, label, active = false }: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${active ? "text-indigo-600 bg-indigo-50" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
        }`}
    >
      <span>{icon}</span>
      {label}
    </Link>
  );
}