"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search, LogOut, Bell, Menu, Code2, Coffee, SearchCode, BookOpen,
  LayoutGrid, Users, BarChart3, Trophy, ShoppingBag, Plus, CheckCircle2,
  Layers, GraduationCap, School, Briefcase, Flag, Lock
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


export default function GroupListPage() {
  // API 연동 스위치
  const USE_API_REQUEST = false;

  // [STATE] 페이지 전체
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [userImgUrl, setUserImgUrl] = useState("/avatar.png");

  // [STATE] 필터
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState("All");
  const [showMyGroups, setShowMyGroups] = useState(false);
  const [keyword, setKeyword] = useState("");

  // [STATE] 데이터
  const [groups, setGroups] = useState<any[]>([]);
  const [totalGroups, setTotalGroups] = useState(0);
  const [ads, setAds] = useState<any[]>([]);

  const TagIcons: Record<string, React.ReactNode> = {
    "All": <Layers size={16} />,
    "Study": <BookOpen size={16} />,
    "Networking": <Coffee size={16} />,
    "Mentoring": <GraduationCap size={16} />,
    "Class": <School size={16} />,
    "Career": <Briefcase size={16} />
  };

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

      // header에 JWT token 추가
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

  // [API] 그룹 검색 (태그, 이름)
  useEffect(() => {
    const fetchGroups = async () => {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // 검색어 유무에 따라 URL 결정
      const isSearching = keyword.trim().length > 0;
      const baseUrl = isSearching
        ? "https://diveon.net/api/groups/search"
        : "https://diveon.net/api/groups";

      // 쿼리 파라미터 구성
      const params = new URLSearchParams();
      params.append("page", currentPage.toString());
      params.append("size", "10");

      if (isSearching) {
        params.append("keyword", keyword);
      } else {
        if (selectedTag !== "All") params.append("tag", selectedTag);
        if (showMyGroups) params.append("isJoined", "true");
        // if (selectedTier) params.append("tier", selectedTier);
      }

      try {
        const response = await fetch(`${baseUrl}?${params.toString()}`, {
          method: "GET",
          headers,
        });

        if (response.ok) {
          const data = await response.json();
          setTotalGroups(data.data.totalElements);
          setGroups(data.data.groups);
          setTotalPages(data.data.totalPages);
        }
      } catch (error) {
        console.error("데이터 로드 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGroups();
  }, [selectedTag, selectedTier, showMyGroups, currentPage, keyword]);

  // [HANDLER] 검색창 핸들러
  const handleSearch = (keyword: string) => {
    setKeyword(keyword);
    setCurrentPage(1);
  };

  // [HANDLER] 좌측 사이드 태그 패널 핸들러
  const handleTagChange = (tag: string) => {
    setSelectedTag(tag);
    setCurrentPage(1);
  };

  // [HANDLER] 좌측 사이드 티어 패널 핸들러
  const handleTierChange = (tier: string) => {
    setSelectedTier(selectedTier === tier ? null : tier);
    setCurrentPage(1);
  };

  // [HANDLER] 로그아웃
  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    window.location.href = "/";
  };

  // [HANDLER] 비공개 그룹 클릭 방어
  const handleGroupClick = (e: React.MouseEvent, grp: any) => {
    e.preventDefault();

    // 비공개 그룹(isPrivate)이고, 현재 가입된 상태가 아니라면 차단
    // 백엔드 명세 규칙(userContext.myStatus 등) 또는 grp.joined 변수 상태에 맞춰 방어선을 설정합니다.
    if (grp.isPrivate && !grp.joined) {
      alert("이 그룹은 비공개 탐사 기지입니다.\n공유받은 카톡/이메일 초대 링크를 통해서만 입장하실 수 있습니다.");
      return;
    }

    // 통과 시 상세방으로 이동
    router.push(`/groups/detail?id=${grp.groupId}`);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">

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
            <NavMenuLink href="/contests" icon={<Trophy size={18} />} label="대회" />
            <NavMenuLink href="/groups" icon={<Users size={18} />} label="그룹" active />
            <NavMenuLink href="/ranking" icon={<BarChart3 size={18} />} label="랭킹" />
            <NavMenuLink href="/store" icon={<ShoppingBag size={18} />} label="스토어" />
          </nav>
        </div>

        { /* [C] 검색창 영역 */}
        <div className="flex-1 max-w-sm px-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input type="search" value={keyword} onChange={(e) => handleSearch(e.target.value)} placeholder="검색..." className="pl-9 bg-slate-50 border-slate-200 rounded-full h-9 text-sm" />
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
                  <AvatarImage src={userImgUrl} alt="User Profile" className="object-cover" />
                  <AvatarFallback className="bg-transparent text-xs font-bold text-slate-600 rounded-full">
                    {/* 공백 상태 유지 */}
                  </AvatarFallback>
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

      {/* =========================================
          2. 메인 컨텐츠 영역 (Grid 레이아웃)
      ========================================= */}
      <main className="container mx-auto max-w-[1500px] pt-8 grid grid-cols-1 md:grid-cols-12 gap-8 px-4 pb-12">

        {/* [A] 좌측 사이드바 (2칸) */}
        <aside className="hidden md:block col-span-2 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 px-1">Tag</h3>
            <nav className="space-y-1">
              {["All", "Study", "Networking", "Mentoring", "Class", "Career"].map((tag) => (
                <TagItem
                  key={tag}
                  icon={TagIcons[tag] || <Code2 size={16} />}
                  label={tag}
                  active={selectedTag === tag}
                  onClick={() => handleTagChange(tag)}
                />
              ))}
            </nav>
          </div>

          <div className="pt-4 border-t">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 px-1">Tier</h3>
            <div className="flex flex-wrap gap-2">
              {["1", "2", "3", "4", "5", "6", "7"].map(tier => {
                const tierNameMap: Record<string, string> = {
                  "1": "Bronze", "2": "Silver", "3": "Gold", 
                  "4": "Platinum", "5": "Diamond", "6": "Master", "7": "Challenger"
                };
                const label = tierNameMap[tier] || "Tier";

                return (
                  <Badge
                    key={tier}
                    variant={selectedTier === tier ? "default" : "outline"}
                    className={`cursor-pointer px-3 py-1 transition-all capitalize ${
                      selectedTier === tier ? "bg-slate-900 text-white" : "hover:bg-slate-100"
                    }`}
                    onClick={() => handleTierChange(tier)}
                  >
                    {label}
                  </Badge>
                );
              })}
            </div>
          </div>
        </aside>

        {/* [B] 중앙 콘텐츠 영역 (8칸) */}
        <section className="col-span-12 md:col-span-8 space-y-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6">
            <div className="space-y-1">
              <h1 className="text-3xl font-black tracking-tighter text-slate-950 uppercase">Groups</h1>
              <p className="text-slate-500 font-medium">검색된 그룹: {totalGroups}개</p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={showMyGroups ? "default" : "outline"}
                size="sm"
                className={`rounded-xl font-bold transition-all ${showMyGroups ? "bg-slate-900 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"
                  }`}
                onClick={() => setShowMyGroups(!showMyGroups)}
              >
                {showMyGroups ? "모든 그룹 보기" : "내 그룹만 보기"}
              </Button>

              {/* 그룹 생성 버튼 */}
              <Link href="/groups/create">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-200 transition-all">
                  <Plus className="w-4 h-4 mr-1.5" /> 그룹 생성하기
                </Button>
              </Link>
            </div>
          </div>

          {/* [추가] 비공개 그룹 클릭 제어 가드 봇 함수 */}
          {(() => {
            const handleGroupClick = (e: React.MouseEvent, grp: any) => {
              e.preventDefault();

              // 비공개 그룹(isPrivate)이고, 내가 가입(joined)된 상태가 아니라면 팝업창을 띄우고 진입 차단
              if (grp.isPrivate && !grp.joined) {
                alert("이 그룹은 비공개 탐사 기지입니다.\n공유받은 카톡/이메일 초대 링크(?code=...)를 통해서만 입장하실 수 있습니다.");
                return;
              }

              // 통과자 혹은 공개방 유저는 부드럽게 상세 페이지로 워프
              router.push(`/groups/detail?id=${grp.groupId}`);
            };

            return (
              /* 그룹 목록 리스트 메인 보드 패널 */
              <div className="flex flex-col gap-3 min-h-[400px] relative">
                {isLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  </div>
                ) : groups.length > 0 ? (
                  groups.map((grp) => (
                    <div
                      key={grp.groupId}
                      onClick={(e) => handleGroupClick(e, grp)}
                      className="block group"
                    >
                      <Card className="p-4 hover:shadow-md transition-all cursor-pointer border-slate-100 rounded-xl overflow-hidden group-hover:border-indigo-200 group-hover:bg-indigo-50/5">
                        <div className="flex w-full flex-row items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors capitalize">
                              {TagIcons[grp.tags[0]] || <Code2 size={20} />}
                            </div>
                            <div className="flex flex-col justify-center">
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* 그룹명 */}
                                <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                  {grp.title}
                                </h3>

                                {/* 비공개 상태 스캔 시 자물쇠 배지 UI 동적 장착 */}
                                {grp.isPrivate && (
                                  <Badge variant="outline" className="px-1.5 py-0 h-5 text-[10px] font-bold text-amber-600 border-amber-200 bg-amber-50/70 shrink-0 flex items-center gap-1.5 select-none rounded-md">
                                    <Lock size={10} className="text-amber-500 fill-amber-500/10" /> 
                                    <span>비공개</span>
                                  </Badge>
                                )}

                                {/* 가입 여부 체크 아이콘 */}
                                {grp.joined && (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-50 shrink-0" />
                                )}
                              </div>

                              {/* 그룹장, 태그, 칭호 정보 */}
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-[13px] text-slate-400">
                                  그룹장: {grp.leader}
                                </p>
                                <span className="text-slate-300 text-[10px]">|</span>

                                {/* 태그 뱃지 */}
                                {grp.tags.length > 0 ? (
                                  grp.tags.map((t: string) => {
                                    const isSelected = selectedTag === t;
                                    return (
                                      <Badge
                                        key={t}
                                        variant="secondary"
                                        className={`px-2 py-0 h-5 text-[10px] font-black tracking-tight shrink-0 transition-all duration-300 ${isSelected
                                          ? "bg-indigo-600 text-white border-indigo-600 shadow-md scale-105"
                                          : "bg-indigo-50 text-indigo-600 border-indigo-100"
                                          }`}
                                      >
                                        {t}
                                      </Badge>
                                    );
                                  })
                                ) : (
                                  <Badge variant="secondary" className="px-2 py-0 h-5 text-[10px] font-black tracking-tight text-slate-400 bg-slate-50 border border-slate-100 shrink-0">
                                    태그 없음
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* 그룹 멤버 수 및 통계 패널 */}
                          <div className="flex items-center gap-8">
                            <div className="text-right min-w-[100px]">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                MEMBERS
                              </p>
                              <p className="text-base font-bold text-slate-700">
                                {(grp.memberCount || 0).toLocaleString()}/{(grp.totalMembers || 0).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-24 text-slate-400 border-2 border-dashed border-slate-50 rounded-3xl h-full flex flex-col items-center justify-center">
                    <SearchCode className="mx-auto h-12 w-12 text-slate-200 mb-2" />
                    <p className="font-bold">조건에 맞는 그룹이 없습니다.</p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* 페이지네이션 파트 */}
          {totalGroups > 0 && (
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

// [보조 컴포넌트] 사이드바 아이템
function TagItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${active
        ? "bg-slate-900 text-white shadow-lg shadow-slate-200"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        }`}
    >
      <span className={active ? "text-white" : "text-slate-400 group-hover:text-slate-950"}>{icon}</span>
      <span>{label}</span>
    </div>
  );
}