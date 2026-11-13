"use client";
import { logout } from "@/lib/authSession";

import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { CosmeticFrame, UserTitle } from "@/components/Cosmetics";
import { themeClass, useCosmetics } from "@/lib/cosmetics";
import { TierBadge } from "@/components/dv";
import { getGroupTier } from "@/lib/utils";
import { discardBody } from "@/lib/request";
import {
  Search, BarChart3, Crown, ChevronLeft, ChevronRight
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const cacheBuster = Date.now();
const PAGE_SIZE = 20; // GET /api/users/ranking, /api/groups/ranking 모두 페이지당 20개

export default function GlobalRankingPage() {

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  const [userImgUrl, setUserImgUrl] = useState("");
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

        if (!response.ok) discardBody(response);
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

  // [API] 유저 랭킹
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

      if (!res.ok) discardBody(res);
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
            avatar: item.nickname ? item.nickname.substring(0, 1).toUpperCase() : "",
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

  // [API] 그룹 랭킹
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

      if (!res.ok) discardBody(res);
      if (res.ok) {
        const json = await res.json();
        const apiRankings = json?.data?.rankings || [];
        setGroupTotalElements(json?.data?.totalElements || 0);

        // UI 통일성을 위해 받아온 전체 리스트 중 상위 3개를 Podium용 객체로 변환 및 적치
        if (pageNumber === 1) {
          const top3Podium = apiRankings.slice(0, 3).map((item: any) => ({
            rank: item.rank,
            nickname: item.title,
            avatar: item.title ? item.title.substring(0, 1).toUpperCase() : "",
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

  // 사용자는 서버가 준 사진 주소만 쓴다(지운 사진·구글 사진도 서버 값 그대로). 그룹은 대표 이미지 주소를 쓴다.
  const avatarSrc = (entry: any): string | undefined =>
    rankType === "user"
      ? entry?.profileImgUrl || undefined
      : entry?.image || `https://d3ghudecvdi62z.cloudfront.net/profiles/groups/${entry?.groupId}?v=${cacheBuster}`;

  const currentTop3 = rankType === "user" ? userTop3 : groupTop3;
  const currentRankings = rankType === "user" ? userRankings : groupRankings;
  const currentPage = rankType === "user" ? userPage : groupPage;
  const totalElements = rankType === "user" ? userTotalElements : groupTotalElements;
  // 상점 꾸미기(테두리·칭호·카드 배경)는 유저 랭킹에만
  const cosmeticsOf = useCosmetics(rankType === "user" ? [...currentTop3, ...currentRankings].map((u: any) => u?.userId) : []);
  const podiumCosmetics = (i: number) => (rankType === "user" ? cosmeticsOf(currentTop3[i]?.userId) : null);

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans">

      <Header
        isLoggedIn={isLoggedIn}
        userImgUrl={userImgUrl}
        activeMenu="ranking"
        onLogout={() => { if (logout()) window.location.replace("/"); }}
      />

      {/* 2. 메인 컨텐츠 영역 */}
      <main className="dv-shell pt-10 pb-20 space-y-12">

        {/* 상단 타이틀 및 필터 */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-line pb-6">
          <div className="space-y-4 w-full md:w-auto">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-[-0.02em] text-ink flex items-center gap-3">
                <BarChart3 className="h-7 w-7 text-primary" /> 랭킹
              </h1>
              <p className="text-ink-muted">점수 순으로 대원과 그룹의 순위를 보여 줘요.</p>
            </div>

            <div className="inline-flex p-1 bg-line/70 border border-line rounded-xl">
              <button
                onClick={() => setRankType("user")}
                className={`px-5 py-2 text-xs font-bold rounded-lg transition-all ${rankType === "user" ? "bg-panel text-ink shadow-sm" : "text-ink-muted hover:text-ink"
                  }`}
              >
                유저 랭킹
              </button>
              <button
                onClick={() => setRankType("group")}
                className={`px-5 py-2 text-xs font-bold rounded-lg transition-all ${rankType === "group" ? "bg-panel text-ink shadow-sm" : "text-ink-muted hover:text-ink"
                  }`}
              >
                그룹 랭킹
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-subtle" />
              <Input
                placeholder={rankType === "user" ? "유저 검색..." : "그룹 검색..."}
                className="pl-10 bg-panel border-line rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Top 3 시각화 Podium 패널 */}
        {searchQuery === "" && currentTop3 && currentTop3.length >= 3 && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto pt-4 pb-8 items-end">

            {/* 🥈 2등 (Silver) 카드 - 고유 key 매핑 및 cacheBuster 반영 */}
            <div
              key={`podium-silver-${rankType}-${currentTop3[1].userId || currentTop3[1].groupId}`}
              className="order-2 md:order-1 transform transition-transform hover:-translate-y-2"
            >
              <Card className={`border-line bg-panel shadow-md relative overflow-hidden h-[230px] flex flex-col items-center justify-center pt-8 ${themeClass(podiumCosmetics(1)?.theme)}`}>
                <div className="absolute top-0 left-0 w-full h-2 bg-line-strong"></div>
                <div className="absolute top-4 left-4 h-8 w-8 bg-raised rounded-full flex items-center justify-center font-black text-ink-muted">2</div>
                <CosmeticFrame frame={podiumCosmetics(1)?.avatar} className="mb-3">
                  <Avatar className="h-18 w-18 border-4 border-line shadow-sm">
                    {/* Date.now()를 cacheBuster 변수로 치환하여 Hydration 붕괴를 원천 차단합니다. */}
                    {avatarSrc(currentTop3[1]) && <AvatarImage src={avatarSrc(currentTop3[1])} className="object-cover" />}
                    <AvatarFallback className="bg-line text-ink-muted font-bold text-lg">{currentTop3[1].avatar}</AvatarFallback>
                  </Avatar>
                </CosmeticFrame>
                <h2 className="shrink-0 font-black text-base leading-6 text-ink text-center px-2 line-clamp-1">{currentTop3[1].nickname}</h2>
                {rankType === "user" && <UserTitle title={podiumCosmetics(1)?.title} name={podiumCosmetics(1)?.titleName} className="mt-1" />}
                <p className="text-sm font-bold text-ink-muted mt-1">{currentTop3[1].score.toLocaleString()}점</p>
                {"memberCount" in currentTop3[1] && (
                  <p className="text-xs text-ink-subtle font-medium">멤버 {currentTop3[1].memberCount}명</p>
                )}
              </Card>
            </div>

            {/* 1등 (Gold) 카드 - 고유 key 매핑 및 cacheBuster 반영 */}
            <div
              key={`podium-gold-${rankType}-${currentTop3[0].userId || currentTop3[0].groupId}`}
              className="order-1 md:order-2 transform transition-transform hover:-translate-y-2 z-10 relative"
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20">
                <Crown className="h-8 w-8 text-warning fill-warning" />
              </div>
              <Card className={`border-warning/30 bg-gradient-to-b from-warning/10 to-panel shadow-xl relative overflow-hidden h-[270px] flex flex-col items-center justify-center pt-6 border-2 ${themeClass(podiumCosmetics(0)?.theme)}`}>
                <div className="absolute top-0 left-0 w-full h-2 bg-warning"></div>
                <div className="absolute top-4 left-4 h-8 w-8 bg-warning/15 text-warning rounded-full flex items-center justify-center font-black">1</div>
                <CosmeticFrame frame={podiumCosmetics(0)?.avatar} className="mb-3">
                  <Avatar className="h-22 w-24 border-4 border-panel shadow-md">
                    {avatarSrc(currentTop3[0]) && <AvatarImage src={avatarSrc(currentTop3[0])} className="object-cover" />}
                    <AvatarFallback className="bg-warning/25 text-warning font-black text-xl">{currentTop3[0].avatar}</AvatarFallback>
                  </Avatar>
                </CosmeticFrame>
                <h2 className="shrink-0 font-black text-lg leading-7 text-ink text-center px-2 line-clamp-1">{currentTop3[0].nickname}</h2>
                {rankType === "user" && <UserTitle title={podiumCosmetics(0)?.title} name={podiumCosmetics(0)?.titleName} className="mt-1" />}
                <p className="text-sm font-black text-warning bg-warning/15 px-3 py-0.5 rounded-full mt-1.5">{currentTop3[0].score.toLocaleString()}점</p>
                {"memberCount" in currentTop3[0] && (
                  <p className="text-xs text-ink-subtle font-medium mt-1">멤버 {currentTop3[0].memberCount}명</p>
                )}
              </Card>
            </div>

            {/* 3등 (Bronze) 카드 - 고유 key 매핑 및 cacheBuster 반영 */}
            <div
              key={`podium-bronze-${rankType}-${currentTop3[2].userId || currentTop3[2].groupId}`}
              className="order-3 md:order-3 transform transition-transform hover:-translate-y-2"
            >
              <Card className={`border-warning/20 bg-panel shadow-md relative overflow-hidden h-[210px] flex flex-col items-center justify-center pt-8 ${themeClass(podiumCosmetics(2)?.theme)}`}>
                <div className="absolute top-0 left-0 w-full h-2 bg-warning/60"></div>
                <div className="absolute top-4 left-4 h-8 w-8 bg-warning/10 rounded-full flex items-center justify-center font-black text-warning">3</div>
                <CosmeticFrame frame={podiumCosmetics(2)?.avatar} className="mb-3">
                  <Avatar className="h-16 w-16 border-4 border-warning/20 shadow-sm">
                    {avatarSrc(currentTop3[2]) && <AvatarImage src={avatarSrc(currentTop3[2])} className="object-cover" />}
                    <AvatarFallback className="bg-warning/15 text-warning font-bold text-base">{currentTop3[2].avatar}</AvatarFallback>
                  </Avatar>
                </CosmeticFrame>
                <h2 className="shrink-0 font-black text-base leading-6 text-ink text-center px-2 line-clamp-1">{currentTop3[2].nickname}</h2>
                {rankType === "user" && <UserTitle title={podiumCosmetics(2)?.title} name={podiumCosmetics(2)?.titleName} className="mt-1" />}
                <p className="text-sm font-bold text-ink-muted mt-1">{currentTop3[2].score.toLocaleString()}점</p>
                {"memberCount" in currentTop3[2] && (
                  <p className="text-xs text-ink-subtle font-medium">멤버 {currentTop3[2].memberCount}명</p>
                )}
              </Card>
            </div>

          </section>
        )}

        {/* 랭킹 메인 보드 테이블 스킨 */}
        <section className="bg-panel border border-line rounded-2xl shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-canvas border-b border-line">
              <TableRow>
                <TableHead className="w-[80px] text-center font-bold">순위</TableHead>
                <TableHead className="font-bold">{rankType === "user" ? "대원" : "그룹"}</TableHead>
                <TableHead className="w-[140px] text-center font-bold">티어</TableHead>
                {rankType === "group" && <TableHead className="w-[140px] text-right font-bold">소속 멤버</TableHead>}
                <TableHead className="w-[140px] text-right font-bold pr-6">총 점수</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={rankType === "group" ? 5 : 4} className="text-center py-12 text-ink-subtle text-sm font-medium animate-pulse">
                    순위를 불러오는 중…
                  </TableCell>
                </TableRow>
              ) : currentRankings
                .filter(u => (u.nickname || u.title || "").toLowerCase().includes(searchQuery.toLowerCase()))
                .map((item) => {
                  const displayName = rankType === "user" ? item.nickname : item.title;
                  const displayId = rankType === "user" ? item.userId : item.groupId;
                  const displayTier = rankType === "user" ? item.tier : getGroupTier(item.score);

                  return (
                    <TableRow key={`table-row-${rankType}-${displayId}`} className="hover:bg-raised/50 transition-colors group">
                      <TableCell className="text-center font-black text-ink-muted">{item.rank}위</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <CosmeticFrame frame={rankType === "user" ? cosmeticsOf(item.userId)?.avatar : null}>
                          <Avatar className="h-8 w-8 border border-line">
                            {avatarSrc(item) && <AvatarImage src={avatarSrc(item)} className="object-cover" />}
                            <AvatarFallback className={rankType === "user" ? "bg-primary/10 text-primary text-xs font-bold" : "bg-coral/10 text-coral text-xs font-bold"}>
                              {displayName ? displayName.substring(0, 1).toUpperCase() : ""}
                            </AvatarFallback>
                          </Avatar>
                          </CosmeticFrame>
                          <span className="font-bold text-ink group-hover:text-primary transition-colors cursor-pointer">
                            {displayName}
                          </span>
                          {rankType === "user" && <UserTitle title={cosmeticsOf(item.userId)?.title} name={cosmeticsOf(item.userId)?.titleName} />}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <TierBadge tier={displayTier} size="sm" showRank={false} />
                      </TableCell>
                      {rankType === "group" && (
                        <TableCell className="text-right font-medium text-ink-muted">
                          {(item.memberCount || 0).toLocaleString()}명
                        </TableCell>
                      )}
                      <TableCell className="text-right font-mono font-semibold text-ink pr-6">
                        {(item.score || 0).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>

          {/* 하단 페이지네이션 디바이스 */}
          <div className="p-4 border-t border-line flex items-center justify-between bg-raised/50">
            <p className="text-xs text-ink-muted font-medium ml-2">
              {totalElements > 0
                ? `전체 ${totalElements.toLocaleString()}${rankType === "user" ? "명" : "개 그룹"} 중 ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, totalElements)}위`
                : ""}
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
              <Button variant="outline" size="sm" className="h-8 w-8 rounded-lg bg-raised text-ink border-line">{currentPage}</Button>
              <Button
                variant="outline" size="icon"
                disabled={currentPage * PAGE_SIZE >= totalElements}
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
