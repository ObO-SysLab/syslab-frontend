"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Search, Bell, LogOut, Menu, CheckCircle2, Code2, SearchCode, 
  LayoutGrid, Users, BarChart3, ShoppingBag, Trophy,
  Cpu, Activity, GitBranch, Database, FileCode2, Layers, Plus
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { mockChallenges, mockAds, mockMyRanking } from "@/lib/mockData";

export default function ProblemListPage() {
  // API 연동 스위치
  const USE_API_REQUEST = true;

  // 로그인 상태
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // 필터 상태
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [showUnsolved, setShowUnsolved] = useState(false);  
  
  // 데이터 상태
  const [problems, setProblems] = useState<any[]>([]);
  const [totalProblems, setTotalProblems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [myRank, setMyRank] = useState<any>(null);
  const [ads, setAds] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [totalPages, setTotalPages] = useState(1);

  const categoryIcons: Record<string, React.ReactNode> = {
    "All": <Layers size={16} />,
    "Kernel": <Cpu size={16} />,
    "Process": <Activity size={16} />,
    "Thread": <GitBranch size={16} />,
    "Memory": <Database size={16} />,
    "File System": <FileCode2 size={16} />
  };

  // 1. 초기 랭킹 및 광고 데이터 로드 (마운트 시 1회)
  useEffect(() => {
    const fetchInitialData = async () => {
      const token = localStorage.getItem("token");
      if (token) setIsLoggedIn(true);
      
      // 테스트
      if (!USE_API_REQUEST) {
        setMyRank({ rank: mockMyRanking.ranking, total: mockMyRanking.total });
        setAds(mockAds);
        return;
      }

      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      try {
        // 내 랭킹 가져오기
        // const rankRes = await fetch("https://diveon.net/api/problems/rank", { headers });
        // if (rankRes.ok) {
        //   const rankData = await rankRes.json();
        //   setMyRank(rankData.data.my_rank);
        // }
        setMyRank({ rank: "-", total: "-" });

        // 광고 가져오기 (배너 규격에 맞게 placement 설정)
        const adRes = await fetch("https://diveon.net/api/ad/?placement=prob_detail");
        if (adRes.ok) {
          const adData = await adRes.json();
          setAds(adData.data.ads);
        }
      } catch (error) {
        console.error("초기 데이터 로드 실패:", error);
      }
    };

    fetchInitialData();
  }, []);

  // 2. 필터 또는 페이지가 변경될 때마다 문제 목록 재조회
  useEffect(() => {
    const fetchProblems = async () => {
      setIsLoading(true);

      if (!USE_API_REQUEST) {
        setTimeout(() => { // API 통신하는 척 딜레이
          const MOCK_ITEMS_PER_PAGE = 10;
          let filtered = mockChallenges.map((c, index) => ({
            probId: c.id,
            title: c.title,
            author: c.author,
            category: c.category,
            solved_count: 100 + index * 42,
            difficulty: `Lvl ${c.level}`,
            solved: c.solved,
            type: c.type
          }));

          if (selectedCategory !== "All") filtered = filtered.filter(p => p.category === selectedCategory);
          if (selectedLevel) filtered = filtered.filter(p => p.difficulty === selectedLevel);
          if (showUnsolved) filtered = filtered.filter(p => p.solved === false);

          const startIndex = (currentPage) * MOCK_ITEMS_PER_PAGE;
          setProblems(filtered.slice(startIndex, startIndex + MOCK_ITEMS_PER_PAGE));
          setTotalProblems(filtered.length);
          setTotalPages(Math.max(1, Math.ceil(filtered.length / MOCK_ITEMS_PER_PAGE)));
          setIsLoading(false);
        }, 500);
        return;
      }

      const token = localStorage.getItem("token");
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // Query Parameter 구성
      const params = new URLSearchParams();
      params.append("page", (currentPage).toString()); 
      params.append("size", "10"); 
      if (selectedCategory !== "All") params.append("category", selectedCategory.toLowerCase());
      if (selectedLevel) params.append("difficulty", selectedLevel);
      if (showUnsolved) params.append("unsolved", "true"); // 백엔드 처리용 플래그

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
  }, [selectedCategory, selectedLevel, showUnsolved, currentPage]); // 의존성 배열에 파라미터 추가

  // 핸들러: 필터 변경 시 페이지를 1로 리셋
  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
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

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">

      {/* 1. 고정 헤더 */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur px-6 h-16 flex items-center justify-between">
        { /* [A] Diveon 로고 영역 */ }
        <div className="flex items-center gap-8">
          <Menu className="h-6 w-6 text-slate-500 cursor-pointer lg:hidden" />
          <Link href="/" className="text-2xl font-black tracking-tighter text-slate-900 mr-4">
            Diveon
          </Link>

          {/* [B] 중앙 네비게이션 메뉴 영역 */}
          <nav className="hidden lg:flex items-center gap-1">
            <NavMenuLink href="/challenges" icon={<LayoutGrid size={18} />} label="챌린지" active />
            <NavMenuLink href="/contests" icon={<Trophy size={18} />} label="대회" />
            <NavMenuLink href="/groups" icon={<Users size={18} />} label="그룹" />
            <NavMenuLink href="/ranking" icon={<BarChart3 size={18} />} label="랭킹" />
            <NavMenuLink href="/store" icon={<ShoppingBag size={18} />} label="스토어" />
          </nav>
        </div>
        
        { /* [C] 검색창 영역 */ }
        <div className="flex-1 max-w-sm px-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input type="search" placeholder="검색..." className="pl-9 bg-slate-50 border-slate-200 rounded-full h-9 text-sm" />
          </div>
        </div>

        { /* [D] 우측 사용자 영역 */ }
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
      
      {/* 2. 메인 컨텐츠 영역 */}
      <main className="container mx-auto max-w-[1500px] pt-8 grid grid-cols-1 md:grid-cols-12 gap-8 px-4 pb-12">
        
        {/* [A] 좌측 사이드바 (2칸) */}
        <aside className="hidden md:block col-span-2 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 px-1">Categories</h3>
            <nav className="space-y-1">
              {["All", "Kernel", "Process", "Thread", "Memory", "File System"].map((cat) => (
                <CategoryItem 
                  key={cat}
                  icon={categoryIcons[cat] || <Code2 size={16}/>} 
                  label={cat} 
                  active={selectedCategory === cat}
                  onClick={() => handleCategoryChange(cat)}
                />
              ))}
            </nav>
          </div>
          
          <div className="pt-4 border-t">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 px-1">Difficulty</h3>
            <div className="flex flex-wrap gap-2">
              {/* 배열을 숫자 문자열로 변경 */}
              {["1", "2", "3", "4", "5"].map(lvl => (
                <Badge 
                  key={lvl} 
                  variant={selectedLevel === lvl ? "default" : "outline"} 
                  className={`cursor-pointer px-3 py-1 transition-all ${
                    selectedLevel === lvl ? "bg-slate-900 text-white" : "hover:bg-slate-100"
                  }`}
                  onClick={() => handleLevelChange(lvl)}
                >
                  Lvl {lvl} {/* 보여줄 때만 Lvl을 붙임 */}
                </Badge>
              ))}
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
              <Button size="sm" variant="outline" className="rounded-xl font-bold">랜덤 문제</Button>
              
              {/* [추가된 문제 생성하기 버튼] */}
              <Link href="/challenges/create">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-200 transition-all">
                  <Plus className="w-4 h-4 mr-1.5" /> 문제 생성하기
                </Button>
              </Link>
            </div>
          </div>

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
                            {prob.solved && (
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
                            {(prob.solved_count || 0).toLocaleString()}명
                          </p>
                        </div>
                        <div className="w-20 flex justify-end">
                          <Badge 
                            className={`
                              rounded-full px-2.5 py-0.5 text-[10px] font-black border uppercase tracking-tight
                              ${prob.difficulty === "1" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : ""}
                              ${prob.difficulty === "2" ? "bg-amber-50 text-amber-600 border-amber-200" : ""}
                              ${prob.difficulty === "3" ? "bg-rose-50 text-rose-600 border-rose-100" : ""}
                              ${prob.difficulty === "4" ? "bg-violet-50 text-violet-700 border-violet-200" : ""}
                              ${prob.difficulty === "5" ? "bg-slate-900 text-white border-slate-950 shadow-sm font-black" : ""}
                            `}
                          >
                            Lvl {prob.difficulty}
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

function NavMenuLink({ href, icon, label, active = false }: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <Link 
      href={href} 
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
        active ? "text-indigo-600 bg-indigo-50" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
      }`}
    >
      <span>{icon}</span>
      {label}
    </Link>
  );
}

function CategoryItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
        active 
          ? "bg-slate-950 text-white shadow-lg shadow-slate-200" 
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-950"
      }`}
    >
      <span className={active ? "text-white" : "text-slate-400 group-hover:text-slate-950"}>{icon}</span>
      <span>{label}</span>
    </div>
  );
}