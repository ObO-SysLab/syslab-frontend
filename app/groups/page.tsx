"use client";
import { logout } from "@/lib/authSession";

import { useState, useEffect, Suspense } from "react";
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
import { useRouter, useSearchParams } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Header } from "@/components/Header";
import { AdSlot } from "@/components/AdSlot";


function GroupListContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const codeFromUrl = searchParams.get("code");
    if (codeFromUrl) {
      setInviteInput(codeFromUrl);
    }
  }, [searchParams]);
  
  // [STATE] 페이지 전체
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [userImgUrl, setUserImgUrl] = useState("");
  const [inviteInput, setInviteInput] = useState("");
  const [isJoiningWithCode, setIsJoiningWithCode] = useState(false);

  // [STATE] 필터
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
  }, [selectedTag, showMyGroups, currentPage, keyword]);

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

  // [HANDLER] 로그아웃
  const handleLogout = () => {
    if (!logout()) return;
    setIsLoggedIn(false);
    window.location.href = "/";
  };

  // [HANDLER] 비공개 그룹 클릭 방어
  const handleGroupClick = (e: React.MouseEvent, grp: any) => {
    e.preventDefault();
    router.push(`/groups/detail?id=${grp.groupId}`);
  };
  // const handleGroupClick = (e: React.MouseEvent, grp: any) => {
  //   e.preventDefault();

  //   // 비공개 그룹(isPrivate)이고, 현재 가입된 상태가 아니라면 차단
  //   // 백엔드 명세 규칙(userContext.myStatus 등) 또는 grp.joined 변수 상태에 맞춰 방어선을 설정합니다.
  //   if (grp.isPrivate && !grp.joined) {
  //     alert("이 그룹은 비공개 탐사 기지입니다.\n공유받은 카톡/이메일 초대 링크를 통해서만 입장하실 수 있습니다.");
  //     return;
  //   }

  //   // 통과 시 상세방으로 이동
  //   router.push(`/groups/detail?id=${grp.groupId}`);
  // };

  // [API] 초대 코드로 비공개 그룹 즉시 가입 (POST /api/groups/join?code=...)
  const handleJoinWithCode = async () => {
    const code = inviteInput.trim();
    if (!code) {
      alert("초대 코드를 입력해 주세요.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      alert("로그인이 필요합니다.");
      return;
    }

    setIsJoiningWithCode(true);

    try {
      const res = await fetch(`https://diveon.net/api/groups/join?code=${encodeURIComponent(code)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });

      const json = await res.json().catch(() => ({}));

      if (res.status === 200) {
        alert(json.message || "그룹에 참여했습니다.");
        setInviteInput("");
        // 가입 성공 시 해당 그룹 상세 페이지로 이동 (또는 리스트 갱신)
        if (json.data?.groupId) {
          router.push(`/groups/detail?id=${json.data.groupId}`);
        } else {
          setCurrentPage(1);
        }
      } else if (res.status === 401) {
        alert("유효하지 않거나 만료된 토큰입니다.");
      } else if (res.status === 404) {
        alert("잘못된 초대 코드입니다.");
      } else if (res.status === 409) {
        alert("그룹 정원이 초과되었습니다.");
      } else if (res.status === 410) {
        alert("만료된 초대 링크입니다.");
      } else {
        alert(`가입 실패: ${json.message || "오류가 발생했습니다."}`);
      }
    } catch (error) {
      console.error("초대 가입 실패:", error);
      alert("서버와 통신 중 오류가 발생했습니다.");
    } finally {
      setIsJoiningWithCode(false);
    }
  };

  return (
    <div className="min-h-screen bg-panel text-ink">

      <Header
        isLoggedIn={isLoggedIn}
        userImgUrl={userImgUrl}
        activeMenu="group"
        searchTerm={keyword}
        showSearch={true}
        onSearchChange={(value) => handleSearch(value)}
        onLogout={async () => {
          // 1. 모든 쿠키 삭제 (만료 처리)
          if (!logout()) return;

          // 2. 로컬 & 세션 스토리지 클리어

          // 3. 인메모리 로그인 상태 초기화
          setIsLoggedIn(false);

          // 4. 메인 페이지 이동
          window.location.replace("/");
        }}
      />

      {/* =========================================
          2. 메인 컨텐츠 영역 (Grid 레이아웃)
      ========================================= */}
      <main className="dv-shell dv-shell--wide pt-8 grid grid-cols-1 md:grid-cols-12 gap-8 pb-12">

        {/* [A] 좌측 사이드바 (2칸) */}
        <aside className="hidden md:block col-span-2 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-ink-subtle uppercase tracking-widest mb-4 px-1">Tag</h3>
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

        </aside>

        {/* [B] 중앙 콘텐츠 영역 (8칸) */}
        <section className="col-span-12 md:col-span-10 xl:col-span-8 space-y-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6">
            <div className="space-y-1">
              <p className="dv-hud text-primary">Crews</p>
              <h1 className="text-[32px] leading-10 font-bold tracking-[-0.01em] text-ink">탐사대</h1>
              <p className="text-sm text-ink-muted">찾은 탐사대 <span className="font-mono text-ink">{totalGroups}</span>개</p>
            </div>

            <div className="flex items-center gap-2">
              {/* 초대 코드 입력 및 가입 UI */}
              <div className="flex items-center gap-1 bg-canvas border border-line rounded-xl p-1">
                <Input
                  type="text"
                  placeholder="초대 코드 입력"
                  value={inviteInput}
                  onChange={(e) => setInviteInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleJoinWithCode()}
                  className="h-8 w-36 text-xs bg-panel border-none focus-visible:ring-1 focus-visible:ring-primary font-mono"
                />
                <Button
                  size="sm"
                  onClick={handleJoinWithCode}
                  disabled={isJoiningWithCode || !inviteInput.trim()}
                  className="h-8 px-3 text-xs bg-primary hover:bg-primary-hover font-bold rounded-lg shrink-0"
                >
                  {isJoiningWithCode ? "가입 중..." : "초대 가입"}
                </Button>
              </div>
              
              <Button
                variant={showMyGroups ? "default" : "outline"}
                size="sm"
                className={`rounded-xl font-bold transition-all ${showMyGroups ? "bg-raised border border-line-strong text-ink shadow-md" : "text-ink-muted hover:bg-raised"
                  }`}
                onClick={() => setShowMyGroups(!showMyGroups)}
              >
                {showMyGroups ? "모든 그룹 보기" : "내 그룹만 보기"}
              </Button>

              {/* 그룹 생성 버튼 */}
              <Link href="/groups/create">
                <Button size="sm" className="bg-primary hover:bg-primary-hover text-primary-ink rounded-xl font-bold shadow-md shadow-black/40 transition-all">
                  <Plus className="w-4 h-4 mr-1.5" /> 그룹 생성하기
                </Button>
              </Link>
            </div>
          </div>

          {/* 그룹 목록 리스트 메인 보드 패널 */}
          <div className="flex flex-col gap-3 min-h-[400px] relative">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
              </div>
            ) : groups.length > 0 ? (
              groups.map((grp) => (
                <div
                  key={grp.groupId}
                  onClick={(e) => handleGroupClick(e, grp)} // 🎯 상단 함수로 단순 연결
                  className="block group"
                >
                  <Card className="p-4 hover:shadow-md transition-all cursor-pointer border-line rounded-xl overflow-hidden group-hover:border-primary/30 group-hover:bg-primary/6">
                    <div className="flex w-full flex-row items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-canvas border border-line flex items-center justify-center text-ink-subtle group-hover:bg-primary/10 group-hover:text-primary transition-colors capitalize">
                          {TagIcons[grp.tags[0]] || <Code2 size={20} />}
                        </div>
                        <div className="flex flex-col justify-center">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* 그룹명 */}
                            <h3 className="font-bold text-ink group-hover:text-primary transition-colors">
                              {grp.title}
                            </h3>

                            {/* 비공개 상태 스캔 시 자물쇠 배지 UI 동적 장착 */}
                            {grp.isPrivate && (
                              <Badge variant="outline" className="px-1.5 py-0 h-5 text-xs font-bold text-warning border-warning/30 bg-warning/10 shrink-0 flex items-center gap-1.5 select-none rounded-md">
                                <Lock size={10} className="text-warning fill-warning/10" />
                                <span>비공개</span>
                              </Badge>
                            )}

                            {/* 가입 여부 체크 아이콘 */}
                            {grp.joined && (
                              <CheckCircle2 className="h-4 w-4 text-success fill-success/20 shrink-0" />
                            )}
                          </div>

                          {/* 그룹장, 태그, 칭호 정보 */}
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-[13px] text-ink-subtle">
                              그룹장: {grp.leader}
                            </p>
                            <span className="text-ink-subtle text-xs">|</span>

                            {/* 태그 뱃지 */}
                            {grp.tags.length > 0 ? (
                              grp.tags.map((t: string) => {
                                const isSelected = selectedTag === t;
                                return (
                                  <Badge
                                    key={t}
                                    variant="secondary"
                                    className={`px-2 py-0 h-5 text-xs font-black tracking-tight shrink-0 transition-all duration-300 ${isSelected
                                      ? "bg-primary text-primary-ink border-primary shadow-md scale-105"
                                      : "bg-primary/10 text-primary border-primary/20"
                                      }`}
                                  >
                                    {t}
                                  </Badge>
                                );
                              })
                            ) : (
                              <Badge variant="secondary" className="px-2 py-0 h-5 text-xs font-black tracking-tight text-ink-subtle bg-canvas border border-line shrink-0">
                                태그 없음
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 그룹 멤버 수 및 통계 패널 */}
                      <div className="flex items-center gap-8">
                        <div className="text-right min-w-[100px]">
                          <p className="text-xs font-bold text-ink-subtle uppercase tracking-wider">
                            MEMBERS
                          </p>
                          <p className="text-base font-bold text-ink">
                            {(grp.memberCount || 0).toLocaleString()}/{(grp.totalMembers || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              ))
            ) : (
              <div className="text-center py-24 text-ink-subtle border-2 border-dashed border-line rounded-3xl h-full flex flex-col items-center justify-center">
                <SearchCode className="mx-auto h-12 w-12 text-ink mb-2" />
                <p className="font-bold">조건에 맞는 그룹이 없습니다.</p>
              </div>
            )}
          </div>

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

// [보조 컴포넌트] 사이드바 아이템
function TagItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${active
        ? "bg-raised border border-line-strong text-ink shadow-lg shadow-black/40"
        : "text-ink-muted hover:bg-raised hover:text-ink"
        }`}
    >
      <span className={active ? "text-ink" : "text-ink-subtle group-hover:text-ink"}>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

export default function GroupListPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-canvas">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        </div>
      }
    >
      <GroupListContent />
    </Suspense>
  );
}