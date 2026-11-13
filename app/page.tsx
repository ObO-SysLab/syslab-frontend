"use client";
import { logout } from "@/lib/authSession";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Target, Cpu, Layers, HardDrive, Lock, Users, Trophy, Anchor, Crown,
  ArrowRight, Eye, ShieldCheck, Gauge, ChevronRight,
} from "lucide-react";
import { Header } from "@/components/Header";
import { UserTitle } from "@/components/Cosmetics";
import { themeClass, useCosmetics } from "@/lib/cosmetics";
import { ActivityLog } from "@/components/home/ActivityLog";
import { DepthBadge, DivoBubble, TierBadge, TypeChip, StatusIcon, Bubbles } from "@/components/dv";
import { problemApi } from "@/lib/problemApi";
import { discardBody } from "@/lib/request";
import { formatPeriod } from "@/lib/utils";

type HomeProblem = {
  probId: number;
  type?: string;
  title: string;
  author?: string;
  category: string;
  difficulty: string | number;
  solvedCount?: number;
  isSolved?: boolean;
};

type HomeContest = {
  contestId: number;
  title: string;
  startTime: string;
  endTime: string;
  type?: string;
  status: string;
};

// 대원 기록: 받아 온 값만 보여 준다 (못 받은 값은 null → 화면에서 숨김)
type DiverStats = { solved: number | null; rank: number | null; score: number | null };

const getJson = async (url: string, token?: string | null) => {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) { discardBody(res); return null; }
  return res.json().catch(() => null);
};

const asNumber = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

// 카테고리 아이콘 (Kernel/Process/Thread/Memory/File System)
const CATEGORY_ICON: Record<string, React.ReactNode> = {
  Process: <Cpu size={12} />,
  Memory: <Layers size={12} />,
  Kernel: <HardDrive size={12} />,
  Thread: <Users size={12} />,
  "File System": <Lock size={12} />,
  FileSystem: <Lock size={12} />,
};

// 예전 easy/medium/hard 값이 섞여 들어오는 경우 대비
const toLevel = (difficulty: string | number) => {
  const d = String(difficulty);
  if (d === "easy" || d === "하") return 1;
  if (d === "medium" || d === "중") return 3;
  if (d === "hard" || d === "상") return 5;
  return Number(d) || 0;
};

export default function HomePage() {
  // [STATE] 페이지 상태
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // [STATE] 유저 프로필
  const [nickname, setNickname] = useState("");
  const [myUserId, setMyUserId] = useState<number | null>(null);
  const [tier, setTier] = useState("");
  const [userImgUrl, setUserImgUrl] = useState("");

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
    problems: HomeProblem[];
  } | null>(null);
  const [recommendLoaded, setRecommendLoaded] = useState(false);
  const [latestProblems, setLatestProblems] = useState<HomeProblem[]>([]);
  const [stats, setStats] = useState<DiverStats>({ solved: null, rank: null, score: null });
  const [liveContests, setLiveContests] = useState<HomeContest[]>([]);
  // 상점에서 착용한 칭호·카드 배경
  const myCosmetics = useCosmetics([myUserId])(myUserId);

  // 추천이 비었거나(게스트 포함) 못 받았을 때: 실제 공개 문제 목록 앞의 3개
  useEffect(() => {
    if (!recommendLoaded || (recommendData?.problems?.length ?? 0) > 0) return;
    let cancelled = false;
    getJson(problemApi("/api/problems?page=1&size=3"), localStorage.getItem("token"))
      .then((json) => {
        const list = json?.data?.problems;
        if (!cancelled && Array.isArray(list)) setLatestProblems(list.slice(0, 3));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [recommendLoaded, recommendData]);

  // 진행 중인 원정(대회) 2개
  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ keyword: "", status: "ongoing", onlyJoined: "false", page: "1", size: "2" });
    getJson(`https://diveon.net/api/contests?${params.toString()}`, localStorage.getItem("token"))
      .then((json) => {
        const list = json?.data?.contests;
        if (!cancelled && Array.isArray(list)) setLiveContests(list.slice(0, 2));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

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
          setRecommendLoaded(true);
          return;
        }
        setIsLoggedIn(true);

        // 대원 기록: 해결 수(내 해결 목록 total) · 순위/점수(유저 랭킹의 myRanking)
        Promise.all([
          getJson("https://diveon.net/api/profile/problems/solved?page=1", newAccessToken).catch(() => null),
          getJson("https://diveon.net/api/users/ranking?page=1", newAccessToken).catch(() => null),
        ]).then(([solvedJson, rankingJson]) => {
          const mine = rankingJson?.data?.myRanking;
          setStats({
            solved: asNumber(solvedJson?.data?.total),
            rank: asNumber(mine?.rank),
            score: asNumber(mine?.score),
          });
        });

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
          if (typeof userInfo?.userId === "number") setMyUserId(userInfo.userId);
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
        } finally {
          setRecommendLoaded(true);
        }

      } catch (error) {
        console.error("보안 세션 수립 중 시스템 장애:", error);
        setRecommendLoaded(true);
      }
    };

    silentRefreshAndFetchProfile();
  }, []);

  const hasRecommend = (recommendData?.problems?.length ?? 0) > 0;
  const problems: HomeProblem[] = hasRecommend ? recommendData!.problems : latestProblems;

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans">
      <Header
        isLoggedIn={isLoggedIn}
        userImgUrl={userImgUrl}
        activeMenu="home"
        showSearch={false}
        onLogout={() => {
          // 로컬에 남은 잔재(토큰, 정보)를 모조리 청소합니다.
          if (!logout()) return;

          // 상태 스위치들도 확실하게 꺼줍니다.
          setAccessToken(null);
          setIsLoggedIn(false);

          // 히스토리를 남기지 않는 replace로 새로고침하여 안전하게 게스트 상태로 회귀시킵니다.
          window.location.replace("/");
        }}
      />

      {/* ============ [A] 히어로: 심해 일러스트 + 디보 + Dive CTA ============ */}
      <section className="dv-hero relative overflow-hidden">
        <Bubbles />
        <div className="relative dv-shell pt-20 pb-24 md:pt-28 md:pb-32 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-12 items-end">
          {isLoggedIn ? (
            /* ---------- CASE 1. 로그인 대원 ---------- */
            <>
              <div className="space-y-6 dv-descend">
                <h1 className="text-4xl md:text-[56px] md:leading-[64px] font-extrabold tracking-[-0.02em]">
                  반가워요, <span className="text-primary">{nickname}</span> 대원님.<br />
                  오늘은 어디까지 내려가 볼까요?
                </h1>
                {(stats.solved !== null || stats.rank !== null) && (
                  <p className="text-ink-muted text-[17px] leading-7 max-w-[60ch]">
                    {stats.solved !== null && (
                      <>
                        지금까지 <b className="text-ink"><span className="font-mono">{stats.solved.toLocaleString()}</span>개</b>의 다이브 포인트에 도달했
                        {stats.rank !== null ? "고, " : "어요."}
                      </>
                    )}
                    {stats.rank !== null && (
                      <>
                        탐사 랭킹 <b className="text-ink"><span className="font-mono">{stats.rank.toLocaleString()}</span>위</b>예요.
                      </>
                    )}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link href="/challenges" className="dv-btn-dive">
                    다이브 시작 <ArrowRight size={18} />
                  </Link>
                  <Link
                    href="/settings?tab=chart"
                    className="inline-flex h-12 items-center gap-2 rounded-full border border-line-strong bg-panel/70 px-5 text-sm font-semibold text-ink backdrop-blur hover:bg-raised transition-colors"
                  >
                    <Gauge size={16} /> 내 로그북 분석
                  </Link>
                </div>
              </div>

              {/* 대원 HUD 카드 */}
              <div className={`rounded-3xl border border-line bg-panel/80 backdrop-blur-md p-6 shadow-dv space-y-5 dv-descend ${themeClass(myCosmetics?.theme)}`}>
                <div className="flex items-center justify-between">
                  <span className="dv-hud text-ink-muted">DIVER STATUS</span>
                  <TierBadge tier={tier} size="sm" showRank={false} />
                </div>
                <div className="flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/divo.webp" alt="" className="w-16 h-auto shrink-0" />
                  <div className="min-w-0 space-y-1">
                    <p className="text-lg font-bold text-ink truncate">{nickname || "대원"}</p>
                    <UserTitle title={myCosmetics?.title} name={myCosmetics?.titleName} />
                  </div>
                </div>
                {(stats.solved !== null || stats.rank !== null || stats.score !== null) && (
                  <dl className="flex divide-x divide-line rounded-2xl border border-line bg-canvas/60">
                    {[
                      { k: "도달", v: stats.solved, unit: "개" },
                      { k: "순위", v: stats.rank, unit: "위" },
                      { k: "점수", v: stats.score, unit: "" },
                    ]
                      .filter((s) => s.v !== null)
                      .map((s) => (
                        <div key={s.k} className="flex-1 min-w-0 px-4 py-3 space-y-1">
                          <dt className="text-xs font-medium text-ink-subtle">{s.k}</dt>
                          <dd className="font-mono text-xl font-semibold text-ink">
                            {s.v!.toLocaleString()}
                            {s.unit && <span className="ml-0.5 text-sm text-ink-muted">{s.unit}</span>}
                          </dd>
                        </div>
                      ))}
                  </dl>
                )}
              </div>
            </>
          ) : (
            /* ---------- CASE 2. 게스트 온보딩 ---------- */
            <>
              <div className="space-y-6 dv-descend">
                <h1 className="text-4xl md:text-[56px] md:leading-[64px] font-extrabold tracking-[-0.02em]">
                  운영체제의 깊은 바다로<br />
                  <span className="text-primary">다이브</span>하세요.
                </h1>
                <p className="text-ink-muted text-[17px] leading-7 max-w-[60ch]">
                  교과서로만 보던 스케줄링·가상 메모리·동기화를 단계별 시각화로 직접 조작하고,
                  격리된 샌드박스에서 안전하게 실습해요.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link href="/signup" className="dv-btn-dive">
                    다이브 시작 <ArrowRight size={18} />
                  </Link>
                  <Link
                    href="/challenges"
                    className="inline-flex h-12 items-center gap-2 rounded-full border border-line-strong bg-panel/70 px-5 text-sm font-semibold text-ink backdrop-blur hover:bg-raised transition-colors"
                  >
                    다이브 포인트 둘러보기
                  </Link>
                </div>

                {/* HUD 수치 — 서비스가 실제로 제공하는 것 (2026-11-10: 예시 숫자 대신). 간편 모드 모델은
                    components/obo/runtime/contracts.mjs, 자유 모드 템플릿은 templates.ts의 ACTIVE_TEMPLATE_IDS, 언어는 Python·C·C++. */}
                <dl className="grid grid-cols-3 gap-6 pt-8 max-w-xl">
                  {[
                    { k: "SIM MODELS", v: "21" },
                    { k: "TEMPLATES", v: "11" },
                    { k: "LANGUAGES", v: "3" },
                  ].map((s) => (
                    <div key={s.k} className="space-y-1">
                      <dt className="dv-hud text-ink-subtle">{s.k}</dt>
                      <dd className="font-mono text-2xl font-semibold text-ink">{s.v}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="dv-descend">
                <DivoBubble avatarSize={96}>
                  처음 오셨군요! 100m 해수면 문제부터 같이 내려가 봐요. 다이브 시작할까요?
                </DivoBubble>
              </div>
            </>
          )}
        </div>
      </section>

      <main className="dv-shell pb-20 space-y-12 -mt-6 relative">
        {/* ============ 게스트: 핵심 가치 3개 (수심 층처럼 내려가며) ============ */}
        {!isLoggedIn && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: <Eye size={20} />, lv: 1, title: "시각적 체험", desc: "Context Switch, Page Fault가 일어나는 순간을 노드 그래프로 한 단계씩 재생해요." },
              { icon: <ShieldCheck size={20} />, lv: 3, title: "안전한 격리 실행", desc: "네트워크가 막힌 격리 컨테이너에서 리눅스 실습을 마음껏 해 볼 수 있어요." },
              { icon: <Gauge size={20} />, lv: 5, title: "즉시 피드백", desc: "제출하면 바로 채점하고, 무엇이 달랐는지 테스트 단위로 알려 줘요." },
            ].map((v) => (
              <div key={v.title} className="rounded-2xl border border-line bg-panel p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="grid place-items-center w-10 h-10 rounded-xl bg-primary-soft text-primary">{v.icon}</span>
                  <DepthBadge level={v.lv} size="sm" />
                </div>
                <h2 className="text-lg font-semibold">{v.title}</h2>
                <p className="text-sm text-ink-muted leading-6">{v.desc}</p>
              </div>
            ))}
          </section>
        )}

        {/* ============ 오늘의 다이브 포인트 ============ */}
        {todayProblem && (
          <section className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Crown className="w-5 h-5 text-warning" /> 오늘의 다이브 포인트
            </h2>
            <Link
              href={`/challenges/detail?id=${todayProblem.probId}`}
              className="group flex flex-col md:flex-row md:items-center justify-between gap-5 rounded-2xl border border-line bg-panel p-6 hover:border-primary/50 hover:bg-raised/40 transition-colors"
            >
              <div className="space-y-3 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="dv-hud text-primary">DAILY</span>
                  {/* 그날 맞히면 상점 포인트 +50P (하루 한도 100P 안에서) */}
                  <span className="inline-flex items-center h-[22px] px-2 rounded-md bg-warning-soft text-warning text-xs font-bold font-mono">+50P</span>
                  <span className="inline-flex items-center gap-1 h-[22px] px-2 rounded-md bg-raised text-ink-muted text-xs font-medium">
                    {CATEGORY_ICON[todayProblem.category]} {todayProblem.category}
                  </span>
                  {todayProblem.type && <TypeChip type={todayProblem.type} />}
                  {todayProblem.isSolved && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                      <StatusIcon status="solved" className="w-4 h-4" /> 도달
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold group-hover:text-primary transition-colors truncate">{todayProblem.title}</h3>
                <p className="text-sm text-ink-muted">
                  출제 <span className="text-ink font-medium">{todayProblem.author}</span> · 도달한 대원{" "}
                  <span className="font-mono text-ink">{todayProblem.solvedCount.toLocaleString()}</span>명
                </p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <DepthBadge level={toLevel(todayProblem.difficulty)} showZone />
                <span className="inline-flex h-10 items-center gap-1.5 rounded-[10px] bg-primary px-4 text-sm font-semibold text-primary-ink group-hover:bg-primary-hover transition-colors">
                  다이브 <ChevronRight size={16} />
                </span>
              </div>
            </Link>
          </section>
        )}

        {/* ============ 다이브 포인트: 맞춤 추천, 없으면 실제 공개 문제 ============ */}
        {problems.length > 0 && (
          <section className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div className="space-y-1.5">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" /> {hasRecommend ? "대원 맞춤 다이브 포인트" : "다이브 포인트"}
                </h2>
                {hasRecommend && recommendData?.reason && <p className="text-sm text-ink-muted">{recommendData.reason}</p>}
              </div>
              <Link href="/challenges" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-hover">
                전체 다이브 포인트 <ArrowRight size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {problems.map((prob) => {
                const category = prob.category || "Process";
                const solvedCount = prob.solvedCount ?? 0;

                return (
                  <Link
                    href={`/challenges/detail?id=${prob.probId}`}
                    key={String(prob.probId)}
                    className="group flex h-full flex-col justify-between gap-6 rounded-2xl border border-line bg-panel p-5 hover:border-primary/50 hover:bg-raised/40 transition-colors"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 h-[22px] px-2 rounded-md bg-raised text-ink-muted text-xs font-medium">
                          {CATEGORY_ICON[category]} {category}
                        </span>
                        <DepthBadge level={toLevel(prob.difficulty)} size="sm" />
                      </div>
                      <h3 className="text-base font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                        {prob.title}
                      </h3>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-line text-xs text-ink-muted">
                      <span className="font-mono">#{prob.probId}</span>
                      <span className="flex items-center gap-1">
                        <Anchor size={12} /> <span className="font-mono text-ink">{solvedCount.toLocaleString()}</span>명 도달
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ============ 실시간 탐사 로그: 공개 문제의 최근 채점 결과 ============ */}
        <ActivityLog />

        {/* ============ 진행 중인 원정: 실제 대회 목록 ============ */}
        {liveContests.length > 0 && (
          <section className="space-y-5">
            <div className="flex items-end justify-between gap-3">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Trophy className="w-5 h-5 text-coral" /> 진행 중인 원정
              </h2>
              <Link href="/contests" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-hover shrink-0">
                전체 원정 <ArrowRight size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {liveContests.map((c) => (
                <Link
                  href={`/contests/detail?id=${c.contestId}`}
                  key={c.contestId}
                  className="group flex items-center justify-between gap-4 rounded-2xl border border-line bg-panel p-5 hover:border-coral/50 transition-colors"
                >
                  <div className="min-w-0 space-y-1.5">
                    <p className="font-semibold truncate group-hover:text-coral transition-colors">{c.title}</p>
                    <p className="text-sm text-ink-muted">{formatPeriod(c.startTime, c.endTime)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="inline-flex items-center gap-1 h-[22px] px-2 rounded-md bg-coral-soft text-coral text-xs font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-coral animate-pulse" />
                      {c.status}
                    </span>
                    {c.type && (
                      <span className="inline-flex items-center h-[22px] px-2 rounded-md bg-raised text-ink-muted text-xs">{c.type}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
