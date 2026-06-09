"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search, Bell, LogOut, Menu, LayoutGrid, Users, BarChart3, Trophy, ShoppingBag,
  Medal, Award, TrendingUp, ChevronLeft, ChevronRight, SearchCode, Crown, Flag
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { mockRankings, mockTop3 } from "@/lib/mockData";


export default function GlobalRankingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState("all-time"); // all-time, monthly, weekly

  // [API 연동 지점] 추후 useEffect를 사용하여 /api/rankings 데이터를 불러오세요.
  const [top3, setTop3] = useState(mockTop3);
  const [rankings, setRankings] = useState(mockRankings);
  const [userImgUrl, setUserImgUrl] = useState("/avatar.png");

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

  // 티어별 색상 반환 함수
  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'master': return 'bg-rose-50 text-rose-600 border-rose-200';
      case 'diamond': return 'bg-cyan-50 text-cyan-600 border-cyan-200';
      case 'platinum': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'gold': return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'silver': return 'bg-slate-100 text-slate-600 border-slate-200';
      default: return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">

      {/* 1. 고정 헤더 */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Menu className="h-6 w-6 text-slate-500 cursor-pointer lg:hidden" />
          <Link href="/" className="text-2xl font-black tracking-tighter text-slate-900 mr-4">
            Diveon
          </Link>
          <nav className="hidden lg:flex items-center gap-1">
            <NavMenuLink href="/challenges" icon={<Flag size={18} />} label="챌린지" />
            <NavMenuLink href="/contests" icon={<Trophy size={18} />} label="대회" />
            <NavMenuLink href="/groups" icon={<Users size={18} />} label="그룹" />
            <NavMenuLink href="/ranking" icon={<BarChart3 size={18} />} label="랭킹" active />
            <NavMenuLink href="/store" icon={<ShoppingBag size={18} />} label="스토어" />
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <button className="p-2 hover:bg-slate-100 rounded-full transition-colors relative group">
                <Bell className="h-5 w-5 text-slate-500 group-hover:text-slate-900" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
              <Link href="/settings">
                <Avatar className="h-9 w-9 border border-slate-200 hover:ring-2 hover:ring-indigo-100 transition-all cursor-pointer">
                  <AvatarImage src={userImgUrl} alt="User Profile" className="object-cover" />
                  <AvatarFallback className="bg-transparent text-xs font-bold text-slate-600 rounded-full">
                    {/* 공백 상태 유지 */}
                  </AvatarFallback>
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
            <div className="flex items-center gap-2">
              <Link href="/signin"><Button variant="ghost" className="text-sm font-bold text-slate-600">Sign In</Button></Link>
              <Link href="/signup"><Button className="bg-slate-900 text-white text-sm font-bold rounded-full px-5 shadow-lg shadow-slate-200">Get Started</Button></Link>
            </div>
          )}
        </div>
      </header>

      {/* 2. 메인 컨텐츠 영역 */}
      <main className="container mx-auto max-w-[1200px] pt-10 px-4 pb-20 space-y-12">

        {/* 상단 타이틀 및 필터 */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-slate-200 pb-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tighter text-slate-950 uppercase flex items-center gap-3">
              <Trophy className="h-8 w-8 text-yellow-500" /> Global Ranking
            </h1>
            <p className="text-slate-500 font-medium">Diveon 최고의 개발자들과 순위를 경쟁하세요.</p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="유저 검색..."
                className="pl-10 bg-white border-slate-200 rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex bg-white border border-slate-200 rounded-xl p-1 shrink-0">
              <Button variant={timeFilter === "weekly" ? "secondary" : "ghost"} size="sm" onClick={() => setTimeFilter("weekly")} className="rounded-lg h-8 text-xs font-bold">주간</Button>
              <Button variant={timeFilter === "monthly" ? "secondary" : "ghost"} size="sm" onClick={() => setTimeFilter("monthly")} className="rounded-lg h-8 text-xs font-bold">월간</Button>
              <Button variant={timeFilter === "all-time" ? "default" : "ghost"} size="sm" onClick={() => setTimeFilter("all-time")} className="rounded-lg h-8 text-xs font-bold bg-slate-900 text-white">전체</Button>
            </div>
          </div>
        </div>

        {/* Top 3 랭커 섹션 (Podium Style) */}
        {searchQuery === "" && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto pt-4 pb-8 items-end">
            {/* 2등 (Silver) */}
            <div className="order-2 md:order-1 transform transition-transform hover:-translate-y-2">
              <Card className="border-slate-200 bg-white shadow-md relative overflow-hidden h-[220px] flex flex-col items-center justify-center pt-8">
                <div className="absolute top-0 left-0 w-full h-2 bg-slate-300"></div>
                <div className="absolute top-4 left-4 h-8 w-8 bg-slate-100 rounded-full flex items-center justify-center font-black text-slate-500">2</div>
                <Avatar className="h-20 w-20 border-4 border-slate-100 shadow-sm mb-3">
                  <AvatarFallback className="bg-slate-200 text-slate-600 font-bold text-xl">{top3[1].avatar}</AvatarFallback>
                </Avatar>
                <h3 className="font-black text-lg text-slate-800">{top3[1].nickname}</h3>
                <p className="text-sm font-bold text-slate-500">{top3[1].score.toLocaleString()} PTS</p>
              </Card>
            </div>

            {/* 1등 (Gold) */}
            <div className="order-1 md:order-2 transform transition-transform hover:-translate-y-2 z-10 relative">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20 animate-bounce">
                <Crown className="h-8 w-8 text-yellow-500 fill-yellow-500" />
              </div>
              <Card className="border-yellow-200 bg-gradient-to-b from-yellow-50 to-white shadow-xl relative overflow-hidden h-[260px] flex flex-col items-center justify-center pt-6 border-2">
                <div className="absolute top-0 left-0 w-full h-2 bg-yellow-400"></div>
                <div className="absolute top-4 left-4 h-8 w-8 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center font-black">1</div>
                <Avatar className="h-24 w-24 border-4 border-white shadow-md mb-3">
                  <AvatarFallback className="bg-yellow-200 text-yellow-700 font-black text-2xl">{top3[0].avatar}</AvatarFallback>
                </Avatar>
                <h3 className="font-black text-xl text-slate-900">{top3[0].nickname}</h3>
                <p className="text-sm font-black text-yellow-600 bg-yellow-100 px-3 py-1 rounded-full mt-1">{top3[0].score.toLocaleString()} PTS</p>
              </Card>
            </div>

            {/* 3등 (Bronze) */}
            <div className="order-3 md:order-3 transform transition-transform hover:-translate-y-2">
              <Card className="border-amber-100 bg-white shadow-md relative overflow-hidden h-[200px] flex flex-col items-center justify-center pt-8">
                <div className="absolute top-0 left-0 w-full h-2 bg-amber-600/60"></div>
                <div className="absolute top-4 left-4 h-8 w-8 bg-amber-50 rounded-full flex items-center justify-center font-black text-amber-700">3</div>
                <Avatar className="h-16 w-16 border-4 border-amber-50 shadow-sm mb-3">
                  <AvatarFallback className="bg-amber-100 text-amber-700 font-bold text-lg">{top3[2].avatar}</AvatarFallback>
                </Avatar>
                <h3 className="font-black text-lg text-slate-800">{top3[2].nickname}</h3>
                <p className="text-sm font-bold text-slate-500">{top3[2].score.toLocaleString()} PTS</p>
              </Card>
            </div>
          </section>
        )}

        {/* 랭킹 테이블 섹션 */}
        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50 border-b border-slate-100">
              <TableRow>
                <TableHead className="w-[80px] text-center font-black">순위</TableHead>
                <TableHead className="font-black">사용자</TableHead>
                <TableHead className="w-[120px] text-center font-black">티어</TableHead>
                <TableHead className="w-[120px] text-right font-black">해결한 문제</TableHead>
                <TableHead className="w-[120px] text-right font-black">총 점수</TableHead>
                <TableHead className="w-[150px] text-right font-black pr-6">최근 활동</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankings.map((user) => (
                <TableRow key={user.rank} className="hover:bg-slate-50/50 transition-colors group">
                  <TableCell className="text-center font-black text-slate-500">{user.rank}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 border border-slate-100">
                        <AvatarFallback className="bg-indigo-50 text-indigo-600 text-xs font-bold">
                          {user.nickname.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors cursor-pointer">
                        {user.nickname}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={`font-bold ${getTierColor(user.tier)}`}>
                      {user.tier}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium text-slate-600">
                    {user.solved.toLocaleString()}개
                  </TableCell>
                  <TableCell className="text-right font-black text-slate-800">
                    {user.score.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-xs text-slate-400 font-medium pr-6">
                    {user.recentActivity}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* 페이지네이션 */}
          <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
            <p className="text-xs text-slate-500 font-medium ml-2">전체 5,420명 중 1-10위 표시</p>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" disabled className="h-8 w-8 rounded-lg"><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" className="h-8 w-8 rounded-lg bg-slate-900 text-white border-slate-900">1</Button>
              <Button variant="outline" size="sm" className="h-8 w-8 rounded-lg">2</Button>
              <Button variant="outline" size="sm" className="h-8 w-8 rounded-lg">3</Button>
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}

// 보조 컴포넌트: 네비게이션 링크
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