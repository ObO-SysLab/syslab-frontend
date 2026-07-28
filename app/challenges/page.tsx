"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search, Bell, LogOut, Menu, CheckCircle2, Code2, SearchCode,
  LayoutGrid, Users, BarChart3, ShoppingBag, Trophy, Flag,
  Cpu, Activity, GitBranch, Database, FileCode2, Layers, Plus
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Header } from "@/components/Header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function ProblemListPage() {
  // [STATE] API 연동 스위치
  const USE_API_REQUEST = true;

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
    "File System": <FileCode2 size={16} />
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
      if (selectedCategory !== "All") params.append("category", selectedCategory.toLowerCase());
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
    <div className="min-h-screen bg-white text-slate-900 font-sans">

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
      <main className="container mx-auto max-w-[1500px] pt-8 grid grid-cols-1 md:grid-cols-12 gap-8 px-4 pb-12">

        {/* [A] 좌측 사이드바 (2칸) */}
        <aside className="hidden md:block col-span-2 space-y-6">
          { /* 카테고리 */}
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 px-1">Categories</h3>
            <nav className="space-y-1">
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

          { /* 챌린지 유형 */}
          <div className="pt-4 border-t">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 px-1">Type</h3>
            <div className="flex flex-col gap-1.5">
              {[
                { key: "objective", label: "객관식" },
                { key: "coding", label: "코딩" },
                { key: "practice", label: "실습(CTF)" },
              ].map((type) => (
                <div
                  key={type.key}
                  onClick={() => handleTypeChange(type.key)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${selectedType === type.key
                    ? "bg-indigo-50 text-indigo-600 border border-indigo-100"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-950"
                    }`}
                >
                  <span>{type.label}</span>
                  {selectedType === type.key && (
                    <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>
                  )}
                </div>
              ))}
            </div>
          </div>

          { /* 레벨 */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 px-1">
              Exploration Depth
            </h3>
            {/* 가로로 자연스럽게 흐르며 정렬되는 레이아웃 (flex-wrap) */}
            <div className="flex flex-wrap gap-2 px-1">
              {["1", "2", "3", "4", "5", "6", "7"].map((lvl) => {
                const isSelected = selectedLevel === lvl;
                const { depth } = levelMap[lvl];

                return (
                  <Badge
                    key={lvl}
                    variant={isSelected ? "default" : "outline"}
                    className={`cursor-pointer px-3.5 py-1.5 transition-all rounded-full border text-xs font-mono font-bold tracking-tight inline-flex items-center justify-center ${isSelected
                      ? "bg-[#0055FF] text-white border-[#0055FF] shadow-sm shadow-blue-100"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    onClick={() => handleLevelChange(lvl)}
                  >
                    {depth}
                  </Badge>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* API 연동된 내 랭킹 영역 */}
          {myRank && (
            <div className="p-5 bg-slate-900 rounded-2xl text-white space-y-3 shadow-lg">
              <p className="text-xs font-bold text-indigo-400 uppercase tracking-tighter">My Ranking</p>
              <p className="text-2xl font-black italic">#{myRank.rank} <span className="text-sm font-normal text-slate-400">/ {myRank.total}</span></p>
              <Button variant="secondary" size="sm" className="w-full text-xs font-bold bg-white text-slate-900 hover:bg-slate-200">
                내 전적 보기
              </Button>
            </div>
          )}
        </aside>

        {/* [B] 중앙 문제 리스트 (8칸) */}
        <section className="col-span-12 md:col-span-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6">
            <div className="space-y-1">
              <h1 className="text-3xl font-black tracking-tighter text-slate-950 uppercase">Challenges</h1>
              <p className="text-slate-500 font-medium">검색된 문제: {totalProblems}개</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={showUnsolved ? "default" : "outline"}
                size="sm"
                className="rounded-xl font-bold transition-all"
                onClick={handleUnsolvedToggle}
              >
                {showUnsolved ? "모든 문제 보기" : "미해결 문제만 보기"}
              </Button>
              <Button
                size="sm"
                variant={showMyProblems ? "default" : "outline"}
                className="rounded-xl font-bold"
                onClick={handleMyProblemsToggle}
              >
                {showMyProblems ? "모든 문제 보기" : "내 문제 보기"}
              </Button>

              {/* 문제 생성 버튼 */}
              <Link href="/challenges/create">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-200 transition-all">
                  <Plus className="w-4 h-4 mr-1.5" /> 문제 생성하기
                </Button>
              </Link>
            </div>
          </div>

          {/* 오늘의 다이브 추천 랜덤 배너 카드 */}
          {randomProblem && (
            <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 border border-slate-800 rounded-2xl shadow-xl text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300 relative overflow-hidden group">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.12),transparent)] pointer-events-none"></div>

              <div className="space-y-2 relative z-10">
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-500 hover:bg-amber-500 text-slate-950 font-black text-[10px] tracking-tight px-2 rounded-md">TODAY'S DIVE</Badge>
                  <span className="text-xs text-indigo-200 font-bold uppercase tracking-wider">{randomProblem.category} · {randomProblem.type === "coding" ? "코딩" : randomProblem.type === "objective" ? "객관식" : "실습"}</span>
                </div>
                <h2 className="text-xl font-black tracking-tight group-hover:text-indigo-300 transition-colors">{randomProblem.title}</h2>
                <p className="text-xs text-slate-400 font-medium">수심 미지의 바다! 지금 바로 고민 없이 다이브해 검증 영역을 확장해 보세요.</p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 relative z-10">
                {/* 맘에 안 들면 다시 돌리는 셔플 가챠 버튼 */}
                <Button
                  onClick={fetchRandomProblem}
                  disabled={isRandomLoading}
                  variant="outline"
                  className="bg-white/5 border-white/10 hover:bg-white/10 text-slate-300 font-bold rounded-xl h-10 px-4 text-xs"
                >
                  <span className={`inline-block mr-1.5 ${isRandomLoading ? "animate-spin" : ""}`}>🔄</span>
                  {isRandomLoading ? "셔플 중" : "다시 뽑기"}
                </Button>

                {/* 해당 상세방 가이딩 버튼 */}
                <Link href={`/challenges/detail?id=${randomProblem.probId}`} className="flex-1 sm:flex-none">
                  <Button className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-black rounded-xl h-10 px-5 text-xs shadow-md shadow-indigo-500/10">
                    지금 바로 다이브
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* 문제 목록 리스트 */}
          <div className="flex flex-col gap-3 min-h-[400px] relative">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              </div>
            ) : problems.length > 0 ? (
              problems.map((prob) => (
                <Link
                  key={prob.probId}
                  href={`/challenges/detail?id=${prob.probId}`}
                  className="block group"
                >
                  <Card className="p-4 hover:shadow-md transition-all cursor-pointer border-slate-100 rounded-xl overflow-hidden group-hover:border-indigo-200 group-hover:bg-indigo-50/5">
                    <div className="flex w-full flex-row items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors capitalize">
                          {categoryIcons[prob.category] || <Code2 size={20} />}
                        </div>
                        <div className="flex flex-col justify-center">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* 문제 제목 */}
                            <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {prob.title}
                            </h3>

                            {/* 해결 여부 체크 아이콘 복구 */}
                            {prob.isSolved && (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-50 shrink-0" />
                            )}
                          </div>

                          {/* 출제자, 카테고리, 타입 정보 */}
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-[13px] text-slate-400">
                              출제자: {prob.author}
                            </p>
                            <span className="text-slate-300 text-[10px]">|</span>

                            {/* [수정] 카테고리 뱃지 */}
                            <Badge variant="outline" className="px-2 py-0 h-5 text-[10px] font-bold tracking-tight text-slate-500 bg-white border-slate-200 shrink-0 capitalize">
                              {prob.category}
                            </Badge>

                            {/* 문제 유형 뱃지 */}
                            <Badge variant="secondary" className="px-2 py-0 h-5 text-[10px] font-black tracking-tight text-indigo-600 bg-indigo-50 border border-indigo-100 shrink-0">
                              {prob.type === "objective" ? "객관식" :
                                prob.type === "coding" ? "코딩" :
                                  prob.type === "practice" ? "실습(CTF)" : "기타"}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-8">
                        <div className="text-right min-w-[100px]">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            SOLVED
                          </p>
                          <p className="text-base font-bold text-slate-700">
                            {(prob.solvedCount || 0).toLocaleString()}명
                          </p>
                        </div>
                        <div className="w-24 flex justify-end shrink-0">
                          <Badge
                            className={`
                              rounded-full px-2.5 py-0.5 text-[10px] font-black border font-mono tracking-tight transition-all
                              ${prob.difficulty === "1" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : ""}
                              ${prob.difficulty === "2" ? "bg-teal-50 text-teal-600 border-teal-200" : ""}
                              ${prob.difficulty === "3" ? "bg-sky-50 text-sky-600 border-sky-200" : ""}
                              ${prob.difficulty === "4" ? "bg-blue-50 text-[#0066FF] border-blue-200" : ""}
                              ${prob.difficulty === "5" ? "bg-indigo-50 text-indigo-600 border-indigo-200" : ""}
                              ${prob.difficulty === "6" ? "bg-purple-50 text-purple-600 border-purple-200" : ""}
                              ${prob.difficulty === "7" ? "bg-slate-900 text-white border-slate-950 shadow-sm" : ""}
                            `}
                          >
                            {levelMap[prob.difficulty]?.depth}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))
            ) : (
              <div className="text-center py-24 text-slate-400 border-2 border-dashed border-slate-50 rounded-3xl h-full flex flex-col items-center justify-center">
                <SearchCode className="mx-auto h-12 w-12 text-slate-200 mb-2" />
                <p className="font-bold">조건에 맞는 문제가 없습니다.</p>
              </div>
            )}
          </div>

          {/* API 연동된 페이지네이션 */}
          {totalProblems > 0 && (
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

function CategoryItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${active
        ? "bg-slate-950 text-white shadow-lg shadow-slate-200"
        : "text-slate-500 hover:bg-slate-50 hover:text-slate-950"
        }`}
    >
      <span className={active ? "text-white" : "text-slate-400 group-hover:text-slate-950"}>{icon}</span>
      <span>{label}</span>
    </div>
  );
}