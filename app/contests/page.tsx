"use client";
import { formatPeriod } from "@/lib/utils";
import { logout } from "@/lib/authSession";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Search, Settings, LogOut, User, Menu, Trophy, Calendar, Users, ShieldAlert, Award,
  LayoutGrid, BarChart3, ShoppingBag, Bell, CheckCircle2, Plus, Flag, ChevronRight
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Header } from "@/components/Header";
import { AdSlot } from "@/components/AdSlot";


export default function ContestListPage() {
  // [STATE] 페이지
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [userImgUrl, setUserImgUrl] = useState("");

  // [STATE] 필터
  const [keyword, setKeyword] = useState("");
  const [showEntered, setShowEntered] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<"all" | "ongoing" | "upcoming" | "ended">("all");

  // [STATE] 데이터
  const [contests, setContests] = useState<any[]>([]);
  const [totalContests, setTotalContests] = useState(0);
  const [ads, setAds] = useState<any[]>([]);


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
    if (!logout()) return;
    setIsLoggedIn(false);
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-panel text-ink font-sans">

      <Header
        isLoggedIn={isLoggedIn}
        userImgUrl={userImgUrl}
        activeMenu="contest"
        searchTerm={keyword}
        showSearch={true}
        onSearchChange={(value) => {
          setKeyword(value);
          setCurrentPage(1);
        }}
        onLogout={async () => {
          // 1. 쿠키 완전 만료 파기
          if (!logout()) return;

          // 2. 로컬 / 세션 스토리지 클리어

          // 3. 인메모리 로그인 상태 리셋
          setIsLoggedIn(false);

          // 4. 메인('/')으로 안전하게 리다이렉트
          window.location.replace("/");
        }}
      />

      {/* 2. 메인 레이아웃 (Grid 12분할) */}
      <main className="dv-shell dv-shell--wide pt-8 grid grid-cols-1 md:grid-cols-12 gap-6 pb-12">

        {/* [A] 좌측 사이드바 (2칸) */}
        <aside className="col-span-12 md:col-span-2 space-y-4 order-last md:order-none">
          <Card className="gap-2 border-line shadow-none bg-raised/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider text-ink-muted">
                <ShieldAlert className="w-4 h-4" /> 주의사항
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs leading-relaxed text-ink-muted space-y-2">
              <p>• 다중 계정 사용 시 영구 제재 처리됩니다.</p>
              <p>• 문제 풀이 공유는 대회 종료 후 공식 게시판에서만 가능합니다.</p>
              <p>• 시스템 공격 행위는 즉시 실격 사유입니다.</p>
            </CardContent>
          </Card>
        </aside>

        {/* [B] 중앙 콘텐츠 영역 (8칸) */}
        <section className="col-span-12 md:col-span-10 xl:col-span-8 space-y-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6">
            <div className="space-y-1">
              <h1 className="text-[32px] leading-10 font-bold tracking-[-0.01em] text-ink">원정</h1>
              <p className="text-sm text-ink-muted">찾은 원정 <span className="font-mono text-ink">{totalContests}</span>개</p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={showEntered ? "default" : "outline"}
                size="sm"
                className={`rounded-xl font-bold transition-all ${showEntered ? "bg-raised border border-line-strong text-ink shadow-md" : "text-ink-muted hover:bg-raised"
                  }`}
                onClick={() => setShowEntered(!showEntered)}
              >
                {showEntered ? "모든 대회 보기" : "참여한 대회만 보기"}
              </Button>

              {/* 대회 생성 버튼 */}
              <Link href="/contests/create">
                <Button size="sm" className="bg-primary hover:bg-primary-hover text-primary-ink rounded-xl font-bold shadow-md shadow-black/40 transition-all">
                  <Plus className="w-4 h-4 mr-1.5" /> 대회 생성하기
                </Button>
              </Link>
            </div>
          </div>

          <Tabs value={selectedStatus} className="w-full">
            <TabsList className="bg-raised p-1 mb-6">
              <TabsTrigger value="all" onClick={() => { setSelectedStatus("all"); setCurrentPage(1); }}>전체</TabsTrigger>
              <TabsTrigger value="ongoing" onClick={() => { setSelectedStatus("ongoing"); setCurrentPage(1); }}>진행 중</TabsTrigger>
              <TabsTrigger value="upcoming" onClick={() => { setSelectedStatus("upcoming"); setCurrentPage(1); }}>예정</TabsTrigger>
              <TabsTrigger value="ended" onClick={() => { setSelectedStatus("ended"); setCurrentPage(1); }}>종료</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedStatus} className="space-y-4 animate-in fade-in-50 duration-500">
              {contests.map((contest) => (
                <Link
                  key={contest.contestId}
                  href={`/contests/detail?id=${contest.contestId}`}
                  className="block group"
                >
                  <Card className={`py-0 gap-0 overflow-hidden border-line bg-panel transition-colors shadow-none ${contest.status === "진행 중" ? "hover:border-coral/60" : "hover:border-line-strong"} ${contest.status === "종료" ? "opacity-75" : ""}`}>
                    <CardContent className="p-0">
                      <div className="flex flex-col md:flex-row">
                        <div className="flex-1 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div className="space-y-2">
                            {/* 상태는 색 + 문구로 함께 표시 (원정 = coral) */}
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`inline-flex items-center gap-1.5 h-[22px] px-2 rounded-md text-xs font-semibold ${
                                contest.status === "진행 중" ? "bg-coral-soft text-coral"
                                  : contest.status === "접수 중" ? "bg-primary-soft text-primary"
                                    : "bg-raised text-ink-muted"}`}>
                                {contest.status === "진행 중" && <span className="w-1.5 h-1.5 rounded-full bg-coral animate-pulse" />}
                                {contest.status}
                              </span>
                              {contest.isJoined && (
                                <span className="inline-flex items-center gap-1 h-[22px] px-2 rounded-md bg-success-soft text-success text-xs font-semibold">
                                  <CheckCircle2 className="w-3 h-3" /> 참가
                                </span>
                              )}
                              {contest.isHot && (
                                <span className="inline-flex items-center h-[22px] px-2 rounded-md bg-danger-soft text-danger font-mono text-xs font-bold tracking-[0.08em]">HOT</span>
                              )}
                              <span className="inline-flex items-center h-[22px] px-2 rounded-md bg-raised text-ink-muted text-xs">{contest.type}</span>
                            </div>
                            <h2 className="text-xl font-bold text-ink">{contest.title}</h2>
                            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-sm text-ink-muted font-medium">
                              <span className="flex items-center gap-1.5"><Calendar size={14} /> {formatPeriod(contest.startTime, contest.endTime)}</span>
                              <span className="flex items-center gap-1.5"><Users size={14} /> {contest.participants}명 참여 중</span>
                              {contest.prize && contest.prize !== "없음" && (
                                <span className="flex items-center gap-1.5"><Award size={14} /> {contest.prize}</span>
                              )}
                            </div>
                          </div>
                          <span className="inline-flex shrink-0 items-center gap-1 h-10 px-4 rounded-[10px] border border-line-strong text-sm font-semibold text-ink group-hover:bg-raised transition-colors">
                            {contest.status === "종료" ? "결과 보기" : "자세히 보기"} <ChevronRight size={16} />
                          </span>
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
                  className={`rounded-lg ${currentPage === i + 1 ? 'bg-deep text-ink border-line' : ''}`}
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

        {/* [C] 우측 광고 칸 — 광고가 있을 때만 그림 (1280px 이상) */}
        <aside className="hidden xl:block xl:col-span-2">
          <AdSlot ads={ads} />
        </aside>

      </main>
    </div>
  );
}
