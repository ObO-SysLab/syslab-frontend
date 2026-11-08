"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search, Bell, LogOut, Menu, CheckCircle2, Code2, SearchCode,
  LayoutGrid, Users, BarChart3, ShoppingBag, Trophy, Flag,
  Cpu, Activity, GitBranch, Database, FileCode2, Layers, Plus, RefreshCw
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Header } from "@/components/Header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toApiCategory } from "@/lib/utils";
import { DepthBadge, StatusIcon, TypeChip, DivoBubble } from "@/components/dv";

export default function ProblemListPage() {
  // [STATE] 페이지 상태
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // [STATE] 필터 상태
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedType, setSelectedType] = useState("All");
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [showUnsolved, setShowUnsolved] = useState(false);
  const [showMyProblems, setShowMyProblems] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // [STATE] 데이터 상태
  const [problems, setProblems] = useState<any[]>([]);
  const [totalProblems, setTotalProblems] = useState(0);
  const [myRank, setMyRank] = useState<any>(null);
  const [ads, setAds] = useState<any[]>([]);
  const [userImgUrl, setUserImgUrl] = useState("/avatar.png");

  // 오늘의 랜덤 추천 문제용 상태 및 로딩 상태
  const [randomProblem, setRandomProblem] = useState<any>(null);
  const [isRandomLoading, setIsRandomLoading] = useState(false);

  const categoryIcons: Record<string, React.ReactNode> = {
    "All": <Layers size={16} />,
    "Kernel": <Cpu size={16} />,
    "Process": <Activity size={16} />,
    "Thread": <GitBranch size={16} />,
    "Memory": <Database size={16} />,
    "File System": <FileCode2 size={16} />,
    "FileSystem": <FileCode2 size={16} /> // 서버 응답 값
  };

  const levelMap: Record<string, { depth: string; zone: string }> = {
    "1": { depth: "100m", zone: "해수면" },
    "2": { depth: "300m", zone: "표층" },
    "3": { depth: "500m", zone: "중심층" },
    "4": { depth: "1,000m", zone: "점심해층" },
    "5": { depth: "3,000m", zone: "심해층" },
    "6": { depth: "6,000m", zone: "초심해층" },
    "7": { depth: "10,000m+", zone: "지구핵" },
  };

  // [API] 초기 랭킹 및 광고 데이터 로드 (마운트 시 1회)
  useEffect(() => {
    const fetchInitialData = async () => {
      const token = localStorage.getItem("token");
      if (token) setIsLoggedIn(true);

      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

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

          // if (userInfo?.nickname) {
          //   setUserName(userInfo.nickname);
          // }
        }
        // 내 랭킹 가져오기
        // const rankRes = await fetch("https://diveon.net/api/problems/rank", { headers });
        // if (rankRes.ok) {
        //   const rankData = await rankRes.json();
        //   setMyRank(rankData.data.my_rank);
        // }
        setMyRank({ rank: "-", total: "-" });

        // 광고 가져오기 (배너 규격에 맞게 placement 설정)
        // const adRes = await fetch("https://diveon.net/api/ad/?placement=prob_detail");
        // if (adRes.ok) {
        //   const adData = await adRes.json();
        //   setAds(adData.data.ads);
        // }
      } catch (error) {
        console.error("초기 데이터 로드 실패:", error);
      }
    };

    fetchInitialData();
    fetchRandomProblem();
  }, []);

  // [API] 문제 목록 재조회
  useEffect(() => {
    const fetchProblems = async () => {
      setIsLoading(true);

      const token = localStorage.getItem("token");
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // Query Parameter 구성
      const params = new URLSearchParams();
      params.append("page", (currentPage).toString());
      params.append("size", "10");
      if (searchTerm.trim()) params.append("title", searchTerm.trim());
      if (selectedType !== "All") params.append("type", selectedType);
      if (selectedCategory !== "All") params.append("category", toApiCategory(selectedCategory)); // "File System" → "FileSystem"
      if (selectedLevel) params.append("difficulty", selectedLevel);
      if (showUnsolved) params.append("onlyUnsolved", "true");
      if (showMyProblems) params.append("onlyMine", "true");

      try {
        const response = await fetch(`https://diveon.net/api/problems?${params.toString()}`, {
          method: "GET",
          headers,
        });

        if (response.ok) {
          const result = await response.json();
          setProblems(result.data.problems);
          setTotalProblems(result.data.total);
          setTotalPages(result.data.totalPages);
        }
      } catch (error) {
        console.error("문제 목록 로드 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProblems();
  }, [selectedCategory, selectedType, selectedLevel, showUnsolved, showMyProblems, searchTerm, currentPage]);

  // [API] 랜덤 문제 단일 조회 비동기 api
  const fetchRandomProblem = async () => {
    setIsRandomLoading(true);
    const token = localStorage.getItem("token");
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const response = await fetch("https://diveon.net/api/problems/random", {
        method: "GET",
        headers
      });
      if (response.ok) {
        const json = await response.json();
        setRandomProblem(json.data);
      }
    } catch (error) {
      console.error("랜덤 문제 로드 실패:", error);
    } finally {
      setIsRandomLoading(false);
    }
  };

  // [HANDLER] 필터 변경 시 페이지를 1로 리셋
  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setCurrentPage(1);
  };

  const handleTypeChange = (type: string) => {
    setSelectedType(selectedType === type ? "All" : type);
    setCurrentPage(1);
  };

  const handleLevelChange = (lvl: string) => {
    setSelectedLevel(selectedLevel === lvl ? null : lvl);
    setCurrentPage(1);
  };

  const handleUnsolvedToggle = () => {
    setShowUnsolved(!showUnsolved);
    setCurrentPage(1);
  };

  const handleMyProblemsToggle = () => {
    setShowMyProblems(!showMyProblems);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans">

      <Header
        isLoggedIn={isLoggedIn}
        userImgUrl={userImgUrl}
        activeMenu="challenge"
        searchTerm={searchTerm}
        showSearch={true}
        onSearchChange={(value) => {
          setSearchTerm(value);
          setCurrentPage(1);
        }}
        onLogout={async () => {
          localStorage.removeItem("token");
          localStorage.removeItem("nickname");
          localStorage.removeItem("userImgUrl");
          localStorage.clear();
          sessionStorage.clear();
          setIsLoggedIn(false);
          window.location.replace("/");
        }}
      />

      {/* 2. 메인 컨텐츠 영역 */}
      <main className="mx-auto w-full max-w-[1500px] pt-8 grid grid-cols-1 md:grid-cols-12 gap-8 px-4 md:px-6 pb-16">

        {/* [A] 좌측 필터: 수심·유형·카테고리 */}
        <aside className="hidden md:block col-span-2 space-y-7">
          <div>
            <h3 className="dv-hud text-ink-subtle mb-3 px-1">Category</h3>
            <nav className="space-y-0.5">
              {["All", "Kernel", "Process", "Thread", "Memory", "File System"].map((cat) => (
                <CategoryItem
                  key={cat}
                  icon={categoryIcons[cat] || <Code2 size={16} />}
                  label={cat}
                  active={selectedCategory === cat}
                  onClick={() => handleCategoryChange(cat)}
                />
              ))}
            </nav>
          </div>

          <div className="pt-6 border-t border-line">
            <h3 className="dv-hud text-ink-subtle mb-3 px-1">Type</h3>
            <div className="flex flex-col gap-0.5">
              {[
                { key: "objective", label: "객관식" },
                { key: "coding", label: "코딩" },
                { key: "practice", label: "실습(CTF)" },
              ].map((type) => (
                <button
                  type="button"
                  key={type.key}
                  onClick={() => handleTypeChange(type.key)}
                  aria-pressed={selectedType === type.key}
                  className={`flex items-center justify-between px-3 py-2 rounded-[10px] text-sm font-medium transition-colors text-left ${selectedType === type.key
                    ? "bg-primary-soft text-primary"
                    : "text-ink-muted hover:bg-raised hover:text-ink"
                    }`}
                >
                  <span>{type.label}</span>
                  {selectedType === type.key && <span className="w-1.5 h-1.5 bg-primary rounded-full" />}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-line">
            <h3 className="dv-hud text-ink-subtle mb-3 px-1">Depth</h3>
            <div className="flex flex-col gap-1">
              {["1", "2", "3", "4", "5", "6", "7"].map((lvl) => {
                const isSelected = selectedLevel === lvl;
                return (
                  <button
                    type="button"
                    key={lvl}
                    onClick={() => handleLevelChange(lvl)}
                    aria-pressed={isSelected}
                    className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-[10px] transition-colors ${isSelected
                      ? "bg-raised ring-1 ring-primary"
                      : "hover:bg-raised"
                      }`}
                  >
                    <DepthBadge level={lvl} size="sm" />
                    <span className={`text-xs ${isSelected ? "text-ink" : "text-ink-subtle"}`}>{levelMap[lvl]?.zone}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* API 연동된 내 랭킹 영역 */}
          {myRank && (
            <div className="p-5 bg-panel border border-line rounded-2xl space-y-3">
              <p className="dv-hud text-ink-subtle">My Rank</p>
              <p className="dv-readout text-ink">
                #{myRank.rank} <span className="text-sm font-normal text-ink-muted">/ {myRank.total}</span>
              </p>
              <Link
                href="/settings"
                className="flex h-8 items-center justify-center rounded-[10px] border border-line-strong bg-panel text-xs font-semibold text-ink hover:bg-raised transition-colors"
              >
                내 로그북 보기
              </Link>
            </div>
          )}
        </aside>

        {/* [B] 중앙 문제 리스트 */}
        <section className="col-span-12 md:col-span-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-[32px] leading-10 font-bold tracking-[-0.01em]">다이브 포인트</h1>
              <p className="text-sm text-ink-muted">
                찾은 문제 <span className="font-mono text-ink">{totalProblems}</span>개
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleUnsolvedToggle}
                aria-pressed={showUnsolved}
                className={`h-8 px-3 rounded-[10px] text-[13px] font-semibold border transition-colors ${showUnsolved ? "bg-primary-soft text-primary border-primary/40" : "bg-panel text-ink border-line-strong hover:bg-raised"}`}
              >
                미해결만
              </button>
              <button
                type="button"
                onClick={handleMyProblemsToggle}
                aria-pressed={showMyProblems}
                className={`h-8 px-3 rounded-[10px] text-[13px] font-semibold border transition-colors ${showMyProblems ? "bg-primary-soft text-primary border-primary/40" : "bg-panel text-ink border-line-strong hover:bg-raised"}`}
              >
                내가 만든 문제
              </button>
              <Link
                href="/challenges/create"
                className="inline-flex h-8 items-center gap-1.5 px-3 rounded-[10px] bg-primary text-primary-ink text-[13px] font-semibold hover:bg-primary-hover transition-colors"
              >
                <Plus className="w-4 h-4" /> 문제 만들기
              </Link>
            </div>
          </div>

          {/* 오늘의 다이브 추천 — 디보 안내 */}
          {randomProblem && (
            <div className="relative overflow-hidden rounded-2xl border border-line bg-panel p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 dv-descend">
              <div className="flex items-center gap-4 min-w-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/divo.webp" alt="" className="w-14 h-auto shrink-0" />
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="dv-hud text-primary">Today&apos;s Dive</span>
                    <span className="inline-flex items-center gap-1 h-[22px] px-2 rounded-md bg-raised text-ink-muted text-xs">
                      {categoryIcons[randomProblem.category]} {randomProblem.category}
                    </span>
                    <TypeChip type={randomProblem.type} />
                    {randomProblem.difficulty && <DepthBadge level={randomProblem.difficulty} size="sm" />}
                  </div>
                  <h2 className="text-lg font-bold truncate">{randomProblem.title}</h2>
                  <p className="text-sm text-ink-muted">오늘은 여기로 내려가 볼까요?</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={fetchRandomProblem}
                  disabled={isRandomLoading}
                  className="inline-flex h-10 items-center gap-1.5 px-4 rounded-[10px] text-sm font-semibold text-ink-muted hover:bg-raised hover:text-ink disabled:opacity-45 transition-colors"
                >
                  <RefreshCw size={16} className={isRandomLoading ? "animate-spin" : ""} />
                  {isRandomLoading ? "고르는 중…" : "다시 뽑기"}
                </button>
                <Link href={`/challenges/detail?id=${randomProblem.probId}`} className="dv-btn-dive !h-10 !text-sm">
                  다이브 시작
                </Link>
              </div>
            </div>
          )}

          {/* 문제 목록 — ProblemRow */}
          <div className="relative min-h-[400px]">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
              </div>
            ) : problems.length > 0 ? (
              <div className="rounded-2xl border border-line bg-panel overflow-hidden" role="table">
                <div
                  role="row"
                  className="hidden sm:grid grid-cols-[20px_minmax(0,1fr)_96px_72px_132px_72px] items-center gap-3 h-9 px-4 bg-deep dv-hud text-ink-muted"
                >
                  <span />
                  <span>Dive Point</span>
                  <span>Category</span>
                  <span>Type</span>
                  <span>Depth</span>
                  <span className="text-right">Solved</span>
                </div>
                {problems.map((prob) => (
                  <Link
                    key={prob.probId}
                    href={`/challenges/detail?id=${prob.probId}`}
                    role="row"
                    className="group grid grid-cols-[20px_minmax(0,1fr)_auto] sm:grid-cols-[20px_minmax(0,1fr)_96px_72px_132px_72px] items-center gap-3 min-h-[56px] py-2 px-4 border-t border-line hover:bg-raised transition-colors focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2"
                  >
                    <StatusIcon status={prob.isSolved ? "solved" : "none"} />
                    <div className="min-w-0">
                      <p className="font-semibold text-[15px] truncate group-hover:text-primary transition-colors">{prob.title}</p>
                      <p className="text-xs text-ink-subtle truncate">
                        <span className="font-mono">#{prob.probId}</span> · {prob.author}
                      </p>
                    </div>
                    <span className="hidden sm:inline-flex items-center gap-1 text-xs text-ink-muted truncate">
                      {categoryIcons[prob.category] || <Code2 size={14} />} {prob.category}
                    </span>
                    <span className="hidden sm:block">
                      <TypeChip type={prob.type} />
                    </span>
                    <span>
                      <DepthBadge level={prob.difficulty} size="sm" />
                    </span>
                    <span className="hidden sm:block text-right font-mono text-[13px] text-ink-muted">
                      {(prob.solvedCount || 0).toLocaleString()}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 py-20 rounded-2xl border border-dashed border-line-strong text-center">
                <DivoBubble mood="fail">조건에 맞는 다이브 포인트가 없어요. 필터를 조금 풀어 볼까요?</DivoBubble>
              </div>
            )}
          </div>

          {/* API 연동된 페이지네이션 */}
          {totalProblems > 0 && (
            <nav className="flex justify-center gap-1.5 pt-4" aria-label="페이지">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="h-8 px-3 rounded-[10px] text-[13px] font-semibold text-ink-muted hover:bg-raised hover:text-ink disabled:opacity-45 disabled:pointer-events-none"
              >
                이전
              </button>

              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  aria-current={currentPage === i + 1 ? "page" : undefined}
                  className={`h-8 min-w-8 px-2 rounded-[10px] font-mono text-[13px] font-semibold transition-colors ${currentPage === i + 1 ? "bg-primary text-primary-ink" : "text-ink-muted hover:bg-raised hover:text-ink"}`}
                >
                  {i + 1}
                </button>
              ))}

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="h-8 px-3 rounded-[10px] text-[13px] font-semibold text-ink-muted hover:bg-raised hover:text-ink disabled:opacity-45 disabled:pointer-events-none"
              >
                다음
              </button>
            </nav>
          )}
        </section>

        {/* [C] 우측 광고 패널 */}
        <aside className="hidden md:block col-span-2">
          <div className="sticky top-24 space-y-4">
            {ads.length > 0 ? (
              ads.map((ad) => (
                <a key={ad.ad_id} href={ad.link_url} target="_blank" rel="noreferrer" className="block w-full overflow-hidden rounded-2xl border border-line transition-colors hover:border-line-strong">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ad.image_url} alt={ad.alt_text} className="w-full object-cover" />
                </a>
              ))
            ) : (
              <div className="border border-dashed border-line rounded-2xl h-[600px] flex flex-col items-center justify-center text-ink-subtle text-xs p-6 text-center">
                <ShoppingBag className="mb-2 h-6 w-6 opacity-40" />
                광고 영역
              </div>
            )}
          </div>
        </aside>

      </main>
    </div>
  );
}

function CategoryItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-[10px] text-sm font-medium transition-colors text-left ${active
        ? "bg-primary-soft text-primary"
        : "text-ink-muted hover:bg-raised hover:text-ink"
        }`}
    >
      <span className={active ? "text-primary" : "text-ink-subtle"}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
