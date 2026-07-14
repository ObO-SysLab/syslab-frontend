"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search, LogOut, Bell, Menu, Target, Zap, Flame, Cpu, Layers, HardDrive, Lock,
  BarChart3, Users, Trophy, ShoppingBag, Anchor, Flag, BookOpenText, ChevronDown, Crown
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback, } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { mockUser, mockFeaturedProblems } from "@/lib/mockData";
import { Header } from "@/components/Header";

export default function HomePage() {
  // [STATE] 페이지 상태
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // [STATE] 유저 프로필
  const [nickname, setNickname] = useState("");
  const [tier, setTier] = useState("");
  const [userImgUrl, setUserImgUrl] = useState("/avatar.png");

  // [STATE] 챌린지, 대회, 그룹
  const [todayProblem, setTodayProblem] = useState<{
    probId: number;
    type: string;
    title: string;
    author: string;
    category: string;
    difficulty: string;
    solvedCount: number;
    isSolved: boolean;
  } | null>(null);

  const [recommendData, setRecommendData] = useState<{
    reason: string;
    problems: Array<{
      probId: number;
      type: string;
      title: string;
      author: string;
      category: "Process" | "Memory" | "Kernel" | "Thread" | "File System" | string;
      difficulty: string;
      solvedCount: number;
      isSolved: boolean;
    }>;
  } | null>(null);

  useEffect(() => {
    const silentRefreshAndFetchProfile = async () => {
      try {
        // 브라우저 쿠키(RefreshToken)를 실어 서버에 AccessToken 재발급 노크
        // (credentials: "include" 설정을 켜야 대포 크로스 도메인 간 쿠키가 자동 탑승)
        // const refreshRes = await fetch("https://diveon.net/api/auth/refresh", {
        //   method: "POST",
        //   credentials: "include",
        //   headers: { "Content-Type": "application/json" }
        // });

        // if (!refreshRes.ok) {
        //   console.log("비로그인 게스트 상태 또는 리프레시 토큰 만료");
        //   return;
        // }

        // const refreshJson = await refreshRes.json();
        // const newAccessToken = refreshJson?.data?.accessToken;

        // // 안전한 휘발성 메모리에 세션 고정 및 로그인
        // setAccessToken(newAccessToken);
        const newAccessToken = localStorage.getItem("token"); // 임시
        if (!newAccessToken) {
          setIsLoggedIn(false);
          return;
        }
        setIsLoggedIn(true);

        // 새로 발급받은 AccessToken을 들고 프로필 상세 Fetch 개시
        const profileRes = await fetch("https://diveon.net/api/profile/show", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${newAccessToken}` // 메모리 토큰 바인딩
          }
        });

        if (profileRes.ok) {
          const result = await profileRes.json();
          const userInfo = result?.data?.userInfo;

          if (userInfo?.profileImgUrl) {
            setUserImgUrl(userInfo.profileImgUrl);
          }
          setNickname(userInfo?.nickname || "대원");
          setTier(userInfo?.tier || "1");
        }

        try {
          const todayRes = await fetch("https://diveon.net/api/problems/today", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${newAccessToken}`
            }
          });

          if (todayRes.ok) {
            const todayJson = await todayRes.json(); // 먼저 await로 안전하게 응답 객체를 파싱
            if (todayJson && todayJson.status === 200) {
              setTodayProblem(todayJson.data);
            }
          }
        } catch (err) {
          console.error("오늘의 미션 로드 실패:", err);
        }

        try {
          const recommendRes = await fetch("https://diveon.net/api/problems/recommend", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${newAccessToken}`
            }
          });

          if (recommendRes.ok) {
            const recJson = await recommendRes.json();
            if (recJson && recJson.status === 200) {
              setRecommendData(recJson.data);
            }
          }
        } catch (err) {
          console.error("개인 맞춤형 추천 챌린지 로드 실패:", err);
        }

      } catch (error) {
        console.error("보안 세션 수립 중 시스템 장애:", error);
      }
    };

    silentRefreshAndFetchProfile();
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-slate-900 font-sans">
      <Header
        isLoggedIn={isLoggedIn}
        userImgUrl={userImgUrl}
        activeMenu="home"
        onLogout={() => {
          // 로컬에 남은 잔재(토큰, 정보)를 모조리 청소합니다.
          localStorage.removeItem("token");
          localStorage.removeItem("nickname");
          localStorage.removeItem("userImgUrl");

          // 상태 스위치들도 확실하게 꺼줍니다.
          setAccessToken(null);
          setIsLoggedIn(false);

          // 히스토리를 남기지 않는 replace로 새로고침하여 안전하게 게스트 상태로 회귀시킵니다.
          window.location.replace("/");
        }}
      />

      {/* 3. 메인 콘텐츠 */}
      <main className="container mx-auto max-w-[1500px] pt-10 px-6 pb-16 space-y-12">

        {/* [A] 메인 카드 영역 */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center bg-slate-950 border border-slate-900 p-10 rounded-3xl shadow-xl overflow-hidden relative text-white">
          <div className="absolute inset-0 opacity-5 font-mono text-[10px] text-[#00FFA3] leading-tight select-none pointer-events-none">
            {`01000100 01001011 00101101 01010111 01101111 01110010 01101100 01100100 
              11001010 11111110 10111010 10111110 01101110 01110101 01101011 01100001`}
          </div>

          {isLoggedIn ? (
            /* ==================== CASE 1. 로그인 유저용 대시보드 ==================== */
            <>
              <div className="col-span-2 space-y-4 relative z-10">
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight">
                  반갑습니다, <span className="text-[#00D1FF]">{nickname}</span> 대원님!<br />
                  오늘도 커널 심해로 다이브해 볼까요?
                </h1>
                <p className="text-slate-400 max-w-2xl text-base">
                  지금까지 <span className="font-bold text-[#00FFA3]">{mockUser.solved}개</span>의 커널 과제를 돌파했습니다. <br />
                  현재 탐사 랭킹 <span className="font-bold text-[#00FFA3]">{mockUser.ranking}위</span>이며, 다음 수층 진입이 머지않았습니다!
                </p>
                <div className="flex gap-3 pt-3">
                  <Button size="lg" className="bg-[#00D1FF] text-slate-950 font-bold hover:bg-[#00FFA3] transition-colors shadow-[0_0_15px_rgba(0,209,255,0.2)]">
                    지금 다이브하기 <Zap size={18} className="ml-2 fill-current" />
                  </Button>
                  <Button size="lg" variant="outline" className="text-slate-300 border-white/10 hover:bg-white/5 hover:text-white">
                    차트 분석
                  </Button>
                </div>
              </div>

              {/* 우측 1칸: 디보 성장 티어 카드 */}
              <Card className="bg-white/[0.04] border border-white/10 shadow-xl text-white backdrop-blur relative z-10 rounded-2xl">
                <CardContent className="pt-6 text-center space-y-4">
                  <div className="w-24 h-24 bg-gradient-to-tr from-[#00D1FF]/20 to-[#00FFA3]/20 rounded-full flex items-center justify-between mx-auto border border-[#00D1FF]/30 animate-pulse">
                    <span className="text-4xl mx-auto">👓</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">현재 대원 등급</p>
                    <p className="text-2xl font-black text-[#00FFA3]">{tier}</p>
                    <p className="text-xs font-mono text-slate-400">{mockUser.score} meters</p>
                  </div>
                  <div className="space-y-1.5 pt-2">
                    <Progress value={mockUser.progress} className="h-1.5 bg-white/5" indicatorClassName="bg-[#00D1FF]" />
                    <p className="text-[11px] text-slate-500 text-right">다음 수층까지 {mockUser.progress}%</p>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            /* ==================== CASE 2. 로그아웃 게스트용 온보딩 가이드 ==================== */
            <>
              {/* 왼쪽 & 중앙 2칸: 디보 안내 가이드 + 플랫폼 거대 통계 (2+3번 합체) */}
              <div className="col-span-2 space-y-6 relative z-10">
                <div className="flex items-start gap-4">
                  {/* 귀여운 말랑 디보 이모지 영역 */}
                  <div className="text-4xl p-3 bg-white/5 rounded-2xl border border-white/10 animate-bounce [animation-duration:3s]">
                    🤿
                  </div>
                  <div className="space-y-2">
                    <h1 className="text-3xl md:text-4xl font-black tracking-tighter leading-tight text-white">
                      운영체제의 깊은 바다 속으로,<br />
                      가이드 <span className="text-[#00D1FF]">디보</span>와 함께 다이브하세요!
                    </h1>
                    <p className="text-slate-400 max-w-xl text-sm leading-relaxed">
                      이론으로만 보던 스케줄링, 가상 메모리 알고리즘을 웹 단계별 동적 시각화로 직접 조작하고 체험하세요. 격리된 다층 샌드박스에서 안전하게 코딩할 수 있습니다.
                    </p>
                  </div>
                </div>

                {/* 하단 배치형 실시간 글로벌 탐사 통계 수치 */}
                <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-5 max-w-lg">
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">누적 다이브 횟수</p>
                    <p className="text-xl font-mono font-black text-[#00FFA3]">142,503 m</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">현재 탐사 대원</p>
                    <p className="text-xl font-mono font-black text-[#00D1FF]">342 명</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">안전 격리 컨테이너</p>
                    <p className="text-xl font-mono font-black text-amber-400">84,912 개</p>
                  </div>
                </div>

                <div className="pt-2">
                  <Link href="/signup">
                    <Button size="lg" className="bg-gradient-to-r from-[#00D1FF] to-[#0066FF] text-white font-black hover:from-[#00FFA3] hover:to-[#00A3FF] hover:text-slate-950 transition-all duration-300 shadow-[0_0_20px_rgba(0,102,255,0.3)]">
                      정식 대원 자격증 발급받기 (가입)
                    </Button>
                  </Link>
                </div>
              </div>

              {/* 우측 1칸: 미니 OBO 시뮬레이터 맛보기 카드 (1번 독립 칸) */}
              <Card className="bg-white/[0.03] border border-white/10 shadow-2xl text-white backdrop-blur relative z-10 rounded-2xl flex flex-col justify-between h-full min-h-[280px]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-[#00D1FF] flex items-center gap-1.5">
                    <Cpu size={12} className="animate-pulse" /> Micro OBO Visualizer
                  </CardTitle>
                  <CardDescription className="text-slate-500 text-[11px]">
                    로그인 없이 맛보는 100m 수심 시뮬레이터
                  </CardDescription>
                </CardHeader>

                {/* 무한 루프로 데이터 이동을 보여주는 은은한 미니 애니메이션 영역 */}
                <CardContent className="py-2 flex-1 flex flex-col justify-center">
                  <div className="bg-black/40 rounded-xl p-3 border border-white/5 space-y-3 font-mono text-[10px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">[Ready Queue]</span>
                      <span className="text-[#00FFA3] animate-pulse">● RUNNING</span>
                    </div>
                    <div className="flex items-center gap-2 justify-center py-2">
                      <div className="px-2 py-1 bg-white/5 border border-white/10 rounded text-slate-400 line-through">P_ID: 01</div>
                      <span className="text-slate-600">→</span>
                      <div className="px-2 py-1 bg-[#00D1FF]/20 border border-[#00D1FF] rounded text-[#00D1FF] font-bold animate-pulse">P_ID: 02</div>
                    </div>
                  </div>
                </CardContent>

                <div className="p-4 pt-0">
                  <Link href="/challenges?level=1">
                    <Button variant="outline" className="w-full text-xs font-bold text-[#00FFA3] border-[#00FFA3]/30 hover:bg-[#00FFA3]/10 hover:text-white hover:border-[#00FFA3] transition-all">
                      ⚡ 100m 수심 맛보기 체험
                    </Button>
                  </Link>
                </div>
              </Card>
            </>
          )}
        </section>

        {todayProblem && (
          <section className="space-y-4">
            <h2 className="text-xl font-black text-slate-950 flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500 fill-amber-100" /> 오늘의 단독 탐사 임무
            </h2>
            <Link href={`/challenges/${todayProblem.probId}`}>
              <Card className="bg-gradient-to-r from-blue-50/60 via-indigo-50/30 to-white border border-blue-100 shadow-sm hover:shadow-md hover:border-blue-400/40 transition-all rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group cursor-pointer">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-[#0055FF] text-white text-[10px] uppercase font-mono px-2 py-0.5 shadow-none border-none">
                      Daily Mission
                    </Badge>
                    <Badge variant="outline" className="font-mono text-[10px] text-slate-500 bg-white">
                      {todayProblem.category.toUpperCase()}
                    </Badge>
                    {todayProblem.isSolved && (
                      <Badge className="bg-emerald-500 text-white text-[10px] font-bold border-none shadow-none">
                        탐사 완료
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-xl font-black text-slate-900 group-hover:text-[#0055FF] transition-colors">
                    {todayProblem.title}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    출제 대원: <span className="text-slate-600 font-bold">{todayProblem.author}</span> ·
                    현재까지 <span className="text-slate-600 font-bold">{todayProblem.solvedCount}명</span> 생존 완료
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
                  {/* 난이도 매핑 규칙에 맞춘 수심 컴팩트 출력 */}
                  <Badge className={`rounded-full px-3 py-1 text-xs font-mono font-black border tracking-tight
                    ${todayProblem.difficulty === "easy" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : ""}
                    ${todayProblem.difficulty === "medium" ? "bg-amber-50 text-amber-600 border-amber-200" : ""}
                    ${todayProblem.difficulty === "hard" ? "bg-rose-50 text-rose-600 border-rose-100" : ""}
                  `}>
                    {todayProblem.difficulty === "easy" ? "100m" : todayProblem.difficulty === "medium" ? "500m" : "1,000m+"}
                  </Badge>
                  <Button className="bg-slate-950 text-white font-bold text-xs rounded-xl px-4 group-hover:bg-[#0055FF] transition-colors">
                    임무 개시 <Zap size={14} className="ml-1.5 fill-current" />
                  </Button>
                </div>
              </Card>
            </Link>
          </section>
        )}

        {/* [B] 추천 챌린지 영역 */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                <Target className="w-6 h-6 text-[#FF4B72]" />
                대원 맞춤 탐사 영역 추천
              </h2>
              {/* API에서 전달된 취약점 사유 또는 폴백 텍스트 반영 */}
              <p className="text-xs text-[#0066FF] font-bold font-mono pl-9">
                {recommendData?.reason || "대원님의 인공지능 탐사 분석 시스템 가동 중..."}
              </p>
            </div>
            <Link href="/challenges" className="text-sm font-bold text-[#0066FF] hover:underline whitespace-nowrap pl-9 sm:pl-0">
              전체 수심 도전하기 →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 데이터가 로드되었을 경우 API 스펙 데이터를 출력, 로그아웃 및 폴백 상황엔 mock 데이터 스탠바이 */}
            {(recommendData?.problems && recommendData.problems.length > 0 ? recommendData.problems : mockFeaturedProblems).map((prob: any) => (
              // 상위 부모 링커에 식별용 고유 키 주입 완료
              <Link href={`/challenges/${prob.probId}`} key={prob.probId}>
                <Card className="bg-white border-slate-100 shadow-sm hover:border-[#0091FF]/40 hover:shadow-md transition-all duration-300 cursor-pointer group rounded-2xl overflow-hidden h-full flex flex-col justify-between">
                  <div>
                    {/* 지정된 카테고리에 최적화된 상단 컬러 바 매핑 */}
                    <div className={`h-1.5 ${prob.category === "Process" ? "bg-[#00A3FF]" :
                        prob.category === "Memory" ? "bg-[#00E699]" :
                          prob.category === "Kernel" ? "bg-slate-900" :
                            prob.category === "Thread" ? "bg-purple-400" :
                              prob.category === "File System" ? "bg-amber-400" : "bg-slate-300"
                      }`} />
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="font-mono text-[10px] text-slate-500 border-slate-200 bg-slate-50 flex items-center gap-1">
                          {prob.category === "Process" && <Cpu size={12} />}
                          {prob.category === "Memory" && <Layers size={12} />}
                          {prob.category === "Kernel" && <HardDrive size={12} />}
                          {prob.category === "Thread" && <Users size={12} />}
                          {prob.category === "File System" && <Lock size={12} />}
                          {prob.category}
                        </Badge>
                        <Badge className={`rounded-full px-2.5 py-0.5 text-[10px] font-black border tracking-tight font-mono
                          ${prob.difficulty === "1" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : ""}
                          ${prob.difficulty === "2" ? "bg-amber-50 text-amber-600 border-amber-200" : ""}
                          ${prob.difficulty === "3" ? "bg-rose-50 text-rose-600 border-rose-100" : ""}
                          ${prob.difficulty === "4" ? "bg-violet-50 text-violet-700 border-violet-200" : ""}
                          ${prob.difficulty === "5" ? "bg-slate-900 text-white border-slate-950 shadow-sm" : "bg-slate-100 text-slate-600"}
                        `}>
                          {prob.difficulty === "1" ? "100m" : prob.difficulty === "2" ? "300m" : prob.difficulty === "3" ? "500m" : "1,000m+"}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg font-bold text-slate-900 group-hover:text-[#0066FF] transition-colors line-clamp-2 leading-snug">
                        {prob.title}
                      </CardTitle>
                    </CardHeader>
                  </div>
                  <CardContent className="pt-0 pb-5 text-xs text-slate-400 flex justify-between items-center bg-slate-50/30">
                    <p className="font-mono text-[11px]">ID: {prob.probId}</p>
                    <p className="flex items-center gap-1 text-slate-500 font-medium">
                      <Anchor size={13} className="text-slate-400" /> {(prob.solvedCount || 0).toLocaleString()}명 돌파
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* [C] 하단 영역 */}
        {/* 전체 유저 최근 활동 로그 */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 전체 유저 최근 활동 로그 (터미널 로그 콘솔 스타일로 빌드) */}
          <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl font-black flex items-center gap-2 text-slate-900">
                <Flame className="w-5 h-5 text-orange-500 fill-orange-100" /> 실시간 탐사 로그
              </CardTitle>
              <CardDescription className="text-slate-400">
                현재 심해를 탐사 중인 대원들의 격리 샌드박스 커널 이벤트입니다.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-1">
              {/* 리눅스 터미널 화면을 연상시키는 다크 쉘 레이아웃 */}
              <div className="bg-slate-900 rounded-xl p-4 space-y-2.5 font-mono text-[11px] leading-relaxed text-slate-300 border border-slate-950 shadow-inner">

                {/* 로그 1: 성공 / 최적화 */}
                <div className="flex items-start gap-2">
                  <span className="text-slate-500 select-none">[00:34:12]</span>
                  <span className="text-[#00E699] font-bold">[SUCCESS]</span>
                  <p className="flex-1">
                    대원 <span className="font-bold text-white underline decoration-[#00A3FF] underline-offset-2">DanKook</span>이
                    <span className="text-[#00A3FF]"> [가상 메모리 108] </span> 페이지 교체 루틴을 최적화했습니다.
                  </p>
                </div>

                {/* 로그 2: 일반 활동 / 댓글 */}
                <div className="flex items-start gap-2">
                  <span className="text-slate-500 select-none">[00:31:05]</span>
                  <span className="text-sky-400 font-bold">[INFO]</span>
                  <p className="flex-1">
                    대원 <span className="font-bold text-white">Newbie</span>가
                    <span className="text-slate-400"> [세마포어 시각화] </span> 스크립트에 커널 분석 노트를 마운트했습니다.
                  </p>
                </div>

                {/* 로그 3: 실패 / 데드락 에러 */}
                <div className="flex items-start gap-2 bg-red-950/20 p-1 rounded border border-red-900/30">
                  <span className="text-red-400/50 select-none">[00:28:49]</span>
                  <span className="text-[#FF4B72] font-black animate-pulse">[CRITICAL]</span>
                  <p className="flex-1 text-red-200">
                    대원 <span className="font-bold text-white">Security</span>의 스레드 코드가
                    <span className="font-bold text-[#FF4B72]"> [교착 상태 (Deadlock)] </span> 판정을 받아 격리되었습니다.
                  </p>
                </div>

              </div>
            </CardContent>
          </Card>

          {/* 대회 추천 */}
          <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl font-black flex items-center gap-2 text-slate-900">
                <Trophy className="w-5 h-5 text-amber-500 fill-amber-100" /> 추천 대회
              </CardTitle>
              <CardDescription className="text-slate-400">
                대원님의 등급에 매칭되는 실시간 심해 경쟁 미션입니다.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 pt-1">
              {/* 대회 1: 진행 중 / 개인전 예시 */}
              <div className="flex items-center justify-between p-3 bg-blue-50/40 rounded-xl border border-blue-100/70 hover:bg-blue-50/80 transition-colors group cursor-pointer">
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-800 text-sm group-hover:text-[#0055FF] transition-colors">
                    제1회 챌린저스 커널 동기화 레이스
                  </span>
                  <p className="text-[11px] text-slate-400 font-mono">남은 시간: 2일 14시간</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge className="bg-[#0055FF] text-white hover:bg-[#0055FF] shadow-none border-none text-[10px] px-2 py-0.5">
                    진행중
                  </Badge>
                  <Badge variant="outline" className="text-slate-500 border-slate-200 bg-white text-[10px] px-2 py-0.5">
                    개인전
                  </Badge>
                </div>
              </div>

              {/* 대회 2: 접수 중 / 팀전 예시 */}
              <div className="flex items-center justify-between p-3 bg-amber-50/30 rounded-xl border border-amber-100/50 hover:bg-amber-50/60 transition-colors group cursor-pointer">
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-800 text-sm group-hover:text-amber-600 transition-colors">
                    심해 구조 대항전 (Memory Rescue)
                  </span>
                  <p className="text-[11px] text-slate-400 font-mono">접수 기간: ~ 07/15까지</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge className="bg-amber-500 text-white hover:bg-amber-500 shadow-none border-none text-[10px] px-2 py-0.5">
                    접수중
                  </Badge>
                  <Badge variant="outline" className="text-amber-600 border-amber-200 bg-white text-[10px] px-2 py-0.5">
                    팀전
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

      </main>
    </div>
  );
}