"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search, Bell, LogOut, Menu, Trophy, Users, BarChart3, ShoppingBag,
  Crown, Flag, ChevronLeft, ChevronRight
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const cacheBuster = Date.now();

export default function GlobalRankingPage() {

  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState("all-time"); // all-time, monthly, weekly

  // 유저 랭킹과 그룹 랭킹 상태를 전환하는 컨트롤러 스위치
  const [rankType, setRankType] = useState<"user" | "group">("user");

  // [API 연동 상태 관리 세트]
  const [userTop3, setUserTop3] = useState<any[]>([]);
  const [userRankings, setUserRankings] = useState<any[]>([]);
  const [userTotalElements, setUserTotalElements] = useState(0);

  const [myRanking, setMyRanking] = useState<any>(null);
  const [calculatedAt, setCalculatedAt] = useState("");

  const [groupTop3, setGroupTop3] = useState<any[]>([]);
  const [groupRankings, setGroupRankings] = useState<any[]>([]);
  const [groupTotalElements, setGroupTotalElements] = useState(0);

  const [userPage, setUserPage] = useState(1);
  const [groupPage, setGroupPage] = useState(1);

  const [userImgUrl, setUserImgUrl] = useState("/avatar.png");
  const [isLoading, setIsLoading] = useState(false);

  // 상단 헤더 프로필 이미지 동기화
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
          if (userInfo?.profileImgUrl) {
            setUserImgUrl(userInfo.profileImgUrl);
          }
        }
      } catch (error) {
        console.error("헤더 이미지 로드 실패:", error);
      }
    };
    fetchProfileImage();
  }, []);

  // 기존 빈 함수를 지우고 이 실서버 연동 코드로 교체하세요!
  const fetchUserRankings = async (pageNumber: number) => {
    setIsLoading(true);
    const token = localStorage.getItem("token");
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      // 명세서 규격: GET /api/users/ranking?page={page} (20개씩 분할 수신)
      const res = await fetch(`https://diveon.net/api/users/ranking?page=${pageNumber}`, {
        method: "GET",
        headers
      });

      if (res.ok) {
        const json = await res.json();
        const apiRankings = json?.data?.rankings || [];

        setUserTotalElements(json?.data?.totalElements || 0);
        setMyRanking(json?.data?.myRanking || null);
        setCalculatedAt(json?.data?.calculatedAt || "");
        setUserRankings(apiRankings);

        // 1페이지일 때 상위 3명을 낚아채서 Podium(명예의 전당) 시각화 팩에 주입
        if (pageNumber === 1) {
          const top3Podium = apiRankings.slice(0, 3).map((item: any) => ({
            rank: item.rank,
            nickname: item.nickname,
            avatar: item.nickname.substring(0, 2).toUpperCase(),
            score: item.score,
            userId: item.userId,
            tier: item.tier,
            profileImgUrl: item.profileImgUrl
          }));
          setUserTop3(top3Podium);
        }
      } else if (res.status === 401) {
        console.warn("인증 토큰이 만료되었거나 유효하지 않습니다.");
      }
    } catch (error) {
      console.error("전체 유저 랭킹 연동 장애:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // [API] 신규 그룹 랭킹 API 연동 함수
  const fetchGroupRankings = async (pageNumber: number) => {
    setIsLoading(true);
    const token = localStorage.getItem("token");
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      // 명세서 규격: GET /api/groups/ranking?page={page} (20개씩 분할 수신)
      const res = await fetch(`https://diveon.net/api/groups/ranking?page=${pageNumber}`, {
        method: "GET",
        headers
      });

      if (res.ok) {
        const json = await res.json();
        const apiRankings = json?.data?.rankings || [];
        setGroupTotalElements(json?.data?.totalElements || 0);

        // UI 통일성을 위해 받아온 전체 리스트 중 상위 3개를 Podium용 객체로 변환 및 적치
        if (pageNumber === 1) {
          const top3Podium = apiRankings.slice(0, 3).map((item: any) => ({
            rank: item.rank,
            nickname: item.title,
            avatar: item.title.substring(0, 2).toUpperCase(),
            score: item.score,
            memberCount: item.memberCount,
            groupId: item.groupId,
            image: item.image
          }));
          setGroupTop3(top3Podium);
        }
        setGroupRankings(apiRankings);
      }
    } catch (error) {
      console.error("그룹 랭킹 연동 장애:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 탭 변환 및 페이지 인덱스 변경 시 자동 리로드 감시 봇
  useEffect(() => {
    if (rankType === "user") {
      fetchUserRankings(userPage);
    } else {
      fetchGroupRankings(groupPage);
    }
  }, [rankType, userPage, groupPage]);

  // 그룹 점수대별 가상 티어 자동 계산 가드 (명세서 보완)
  const calculateGroupTier = (score: number) => {
    if (score >= 1000) return "Challenger";
    if (score >= 500) return "Master";
    if (score >= 300) return "Diamond";
    if (score >= 150) return "Platinum";
    if (score >= 80) return "Gold";
    return "Silver";
  };

  // 기존 getTierColor 함수 내부에 들어오는 티어 변환 가드 주입
  const getTierColor = (tier: string | number) => {
    let tierStr = String(tier);

    if (tierStr === "7") tierStr = "Challenger";
    else if (tierStr === "6") tierStr = "Master";
    else if (tierStr === "5") tierStr = "Diamond";
    else if (tierStr === "4") tierStr = "Platinum";
    else if (tierStr === "3") tierStr = "Gold";
    else if (tierStr === "2") tierStr = "Silver";
    else if (tierStr === "1") tierStr = "Bronze";

    switch (tierStr) {
      case 'Challenger': return 'bg-rose-950 text-rose-200 border-rose-800';
      case 'Master': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Diamond': return 'bg-cyan-50 text-cyan-600 border-cyan-200';
      case 'Platinum': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'Gold': return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'Silver': return 'bg-slate-100 text-slate-600 border-slate-200';
      default: return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  };

  const currentTop3 = rankType === "user" ? userTop3 : groupTop3;
  const currentRankings = rankType === "user" ? userRankings : groupRankings;
  const currentPage = rankType === "user" ? userPage : groupPage;
  const totalElements = rankType === "user" ? userTotalElements : groupTotalElements;

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
                  <AvatarFallback className="bg-transparent" />
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
          <div className="space-y-4 w-full md:w-auto">
            <div className="space-y-2">
              <h1 className="text-4xl font-black tracking-tighter text-slate-950 uppercase flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-indigo-600" /> Leaderboard
              </h1>
              <p className="text-slate-500 font-medium">Diveon 최고의 명예를 거머쥔 주인공들을 확인하세요.</p>
            </div>

            <div className="inline-flex p-1 bg-slate-200/70 border border-slate-200 rounded-xl">
              <button
                onClick={() => setRankType("user")}
                className={`px-5 py-2 text-xs font-bold rounded-lg transition-all ${rankType === "user" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
              >
                유저 랭킹
              </button>
              <button
                onClick={() => setRankType("group")}
                className={`px-5 py-2 text-xs font-bold rounded-lg transition-all ${rankType === "group" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
              >
                그룹 랭킹
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder={rankType === "user" ? "유저 검색..." : "그룹 검색..."}
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

        {/* Top 3 시각화 Podium 패널 */}
        {/* Top 3 시각화 Podium 패널 */}
        {searchQuery === "" && currentTop3 && currentTop3.length >= 3 && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto pt-4 pb-8 items-end">

            {/* 🥈 2등 (Silver) 카드 - 고유 key 매핑 및 cacheBuster 반영 */}
            <div
              key={`podium-silver-${rankType}-${currentTop3[1].userId || currentTop3[1].groupId}`}
              className="order-2 md:order-1 transform transition-transform hover:-translate-y-2"
            >
              <Card className="border-slate-200 bg-white shadow-md relative overflow-hidden h-[230px] flex flex-col items-center justify-center pt-8">
                <div className="absolute top-0 left-0 w-full h-2 bg-slate-300"></div>
                <div className="absolute top-4 left-4 h-8 w-8 bg-slate-100 rounded-full flex items-center justify-center font-black text-slate-500">2</div>
                <Avatar className="h-18 w-18 border-4 border-slate-100 shadow-sm mb-3">
                  {/* Date.now()를 cacheBuster 변수로 치환하여 Hydration 붕괴를 원천 차단합니다. */}
                  <AvatarImage src={rankType === "group" && currentTop3[1].image ? currentTop3[1].image : `https://d3ghudecvdi62z.cloudfront.net/profiles/${rankType === "user" ? "users" : "groups"}/${rankType === "user" ? currentTop3[1].userId : currentTop3[1].groupId}?v=${cacheBuster}`} className="object-cover" />
                  <AvatarFallback className="bg-slate-200 text-slate-600 font-bold text-lg">{currentTop3[1].avatar}</AvatarFallback>
                </Avatar>
                <h3 className="font-black text-base text-slate-800 text-center px-2 line-clamp-1">{currentTop3[1].nickname}</h3>
                <p className="text-sm font-bold text-slate-500 mt-1">{currentTop3[1].score.toLocaleString()} PTS</p>
                {"memberCount" in currentTop3[1] && (
                  <p className="text-[11px] text-slate-400 font-medium">멤버 {currentTop3[1].memberCount}명</p>
                )}
              </Card>
            </div>

            {/* 1등 (Gold) 카드 - 고유 key 매핑 및 cacheBuster 반영 */}
            <div
              key={`podium-gold-${rankType}-${currentTop3[0].userId || currentTop3[0].groupId}`}
              className="order-1 md:order-2 transform transition-transform hover:-translate-y-2 z-10 relative"
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20 animate-bounce">
                <Crown className="h-8 w-8 text-yellow-500 fill-yellow-500" />
              </div>
              <Card className="border-yellow-200 bg-gradient-to-b from-yellow-50 to-white shadow-xl relative overflow-hidden h-[270px] flex flex-col items-center justify-center pt-6 border-2">
                <div className="absolute top-0 left-0 w-full h-2 bg-yellow-400"></div>
                <div className="absolute top-4 left-4 h-8 w-8 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center font-black">1</div>
                <Avatar className="h-22 w-24 border-4 border-white shadow-md mb-3">
                  <AvatarImage src={rankType === "group" && currentTop3[0].image ? currentTop3[0].image : `https://d3ghudecvdi62z.cloudfront.net/profiles/${rankType === "user" ? "users" : "groups"}/${rankType === "user" ? currentTop3[0].userId : currentTop3[0].groupId}?v=${cacheBuster}`} className="object-cover" />
                  <AvatarFallback className="bg-yellow-200 text-yellow-700 font-black text-xl">{currentTop3[0].avatar}</AvatarFallback>
                </Avatar>
                <h3 className="font-black text-lg text-slate-900 text-center px-2 line-clamp-1">{currentTop3[0].nickname}</h3>
                <p className="text-sm font-black text-yellow-600 bg-yellow-100 px-3 py-0.5 rounded-full mt-1.5">{currentTop3[0].score.toLocaleString()} PTS</p>
                {"memberCount" in currentTop3[0] && (
                  <p className="text-[11px] text-slate-400 font-medium mt-1">멤버 {currentTop3[0].memberCount}명</p>
                )}
              </Card>
            </div>

            {/* 3등 (Bronze) 카드 - 고유 key 매핑 및 cacheBuster 반영 */}
            <div
              key={`podium-bronze-${rankType}-${currentTop3[2].userId || currentTop3[2].groupId}`}
              className="order-3 md:order-3 transform transition-transform hover:-translate-y-2"
            >
              <Card className="border-amber-100 bg-white shadow-md relative overflow-hidden h-[210px] flex flex-col items-center justify-center pt-8">
                <div className="absolute top-0 left-0 w-full h-2 bg-amber-600/60"></div>
                <div className="absolute top-4 left-4 h-8 w-8 bg-amber-50 rounded-full flex items-center justify-center font-black text-amber-700">3</div>
                <Avatar className="h-16 w-16 border-4 border-amber-50 shadow-sm mb-3">
                  <AvatarImage src={rankType === "group" && currentTop3[2].image ? currentTop3[2].image : `https://d3ghudecvdi62z.cloudfront.net/profiles/${rankType === "user" ? "users" : "groups"}/${rankType === "user" ? currentTop3[2].userId : currentTop3[2].groupId}?v=${cacheBuster}`} className="object-cover" />
                  <AvatarFallback className="bg-amber-100 text-amber-700 font-bold text-base">{currentTop3[2].avatar}</AvatarFallback>
                </Avatar>
                <h3 className="font-black text-base text-slate-800 text-center px-2 line-clamp-1">{currentTop3[2].nickname}</h3>
                <p className="text-sm font-bold text-slate-500 mt-1">{currentTop3[2].score.toLocaleString()} PTS</p>
                {"memberCount" in currentTop3[2] && (
                  <p className="text-[11px] text-slate-400 font-medium">멤버 {currentTop3[2].memberCount}명</p>
                )}
              </Card>
            </div>

          </section>
        )}

        {/* 랭킹 메인 보드 테이블 스킨 */}
        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50 border-b border-slate-100">
              <TableRow>
                <TableHead className="w-[80px] text-center font-black">순위</TableHead>
                <TableHead className="font-black">{rankType === "user" ? "사용자" : "그룹명"}</TableHead>
                <TableHead className="w-[120px] text-center font-black">티어</TableHead>
                <TableHead className="w-[140px] text-right font-black">{rankType === "user" ? "해결한 문제" : "소속 멤버 수"}</TableHead>
                <TableHead className="w-[120px] text-right font-black">총 점수</TableHead>
                <TableHead className="w-[180px] text-right font-black pr-6">{rankType === "user" ? "최근 활동" : "연동 활성 상태"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-400 text-sm font-bold animate-pulse">
                    랭킹 데이터 파이프라인 동기화 중...
                  </TableCell>
                </TableRow>
              ) : currentRankings
                .filter(u => (u.nickname || u.title || "").toLowerCase().includes(searchQuery.toLowerCase()))
                .map((item) => {
                  const displayName = rankType === "user" ? item.nickname : item.title;
                  const displayId = rankType === "user" ? item.userId : item.groupId;
                  const displayTier = rankType === "user" ? item.tier : calculateGroupTier(item.score);
                  const subCount = rankType === "user"
                    ? `${(item.score || 0).toLocaleString()} PTS`
                    : `${(item.memberCount || 0).toLocaleString()}명`;

                  return (
                    <TableRow key={item.rank} className="hover:bg-slate-50/50 transition-colors group">
                      <TableCell className="text-center font-black text-slate-500">{item.rank}위</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 border border-slate-100">
                            <AvatarImage src={rankType === "group" && item.image ? item.image : `https://d3ghudecvdi62z.cloudfront.net/profiles/${rankType === "user" ? "users" : "groups"}/${displayId}?v=${Date.now()}`} className="object-cover" />
                            <AvatarFallback className={rankType === "user" ? "bg-indigo-50 text-indigo-600 text-xs font-bold" : "bg-purple-50 text-purple-600 text-xs font-bold"}>
                              {displayName.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors cursor-pointer">
                            {displayName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={`font-bold ${getTierColor(displayTier)}`}>
                          {displayTier}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-slate-600">
                        {subCount}
                      </TableCell>
                      <TableCell className="text-right font-black text-slate-800">
                        {item.score.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-xs text-slate-400 font-medium pr-6">
                        {rankType === "user" ? item.recentActivity : "LIVE"}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>

          {/* 하단 페이지네이션 디바이스 */}
          <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
            <p className="text-xs text-slate-500 font-medium ml-2">
              {rankType === "user"
                ? `전체 ${totalElements}명 중 ${(currentPage - 1) * 10 + 1}-${Math.min(currentPage * 10, totalElements)}위 표시`
                : `전체 ${totalElements}개 그룹 중 1-${totalElements}위 표시`
              }
            </p>
            <div className="flex gap-1">
              <Button
                variant="outline" size="icon"
                disabled={currentPage === 1}
                onClick={() => rankType === "user" ? setUserPage(prev => Math.max(1, prev - 1)) : setGroupPage(prev => Math.max(1, prev - 1))}
                className="h-8 w-8 rounded-lg"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="h-8 w-8 rounded-lg bg-slate-900 text-white border-slate-900">{currentPage}</Button>
              <Button
                variant="outline" size="icon"
                disabled={currentPage * (rankType === "user" ? 10 : 20) >= totalElements}
                onClick={() => rankType === "user" ? setUserPage(prev => prev + 1) : setGroupPage(prev => prev + 1)}
                className="h-8 w-8 rounded-lg"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
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