"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Menu, LogOut, Bell, LayoutGrid, Trophy, Users, BarChart3, ShoppingBag,
  ChevronLeft, CheckCircle2, XCircle, Clock, Cpu, Database, Code2, Copy, Check,
  Search
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function SubmissionDetailContent() {
  const searchParams = useSearchParams(); // URL 쿼리 파라미터 가져오기
  const router = useRouter();

  const submissionId = searchParams.get("id");

  // 로그인 상태
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [submissionData, setSubmissionData] = useState<any>(null);
  const [isCopied, setIsCopied] = useState(false);

  // [API] 제출 상세 데이터 로드
  useEffect(() => {
    if (!submissionId) {
      setIsLoading(false);
      return;
    }

    const fetchSubmissionDetail = async () => {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      if (token) {
        setIsLoggedIn(true);
      }

      try {
        const res = await fetch(`https://diveon.net/api/submissions/${submissionId}/result`, {
          headers: { "Authorization": `Bearer ${token}` }
        });

        if (res.ok) {
          const json = await res.json();
          setSubmissionData(json.data);
        } else {
          const errorText = await res.text(); // json() 대신 text()로 먼저 읽기
          let errorMessage = "결과를 불러올 수 없습니다.";

          if (errorText) {
            try {
              // 본문이 있다면 JSON으로 파싱 시도
              const errorData = JSON.parse(errorText);
              errorMessage = errorData.message || errorMessage;
            } catch (e) {
              // JSON이 아니면 (예: HTML 에러 페이지) 텍스트 그대로 사용하거나 기본 메시지 유지
              console.error("서버 응답이 JSON이 아닙니다:", errorText);
            }
          }
          console.error(`에러 발생 (상태 코드: ${res.status}):`, errorMessage);
          alert(`[${res.status}] ${errorMessage}`);
        }
      } catch (error) {
        console.error("통신 에러:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubmissionDetail();
  }, [submissionId]);

  // 코드 복사 기능
  const handleCopyCode = () => {
    if (!submissionData?.code) return;
    navigator.clipboard.writeText(submissionData.code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // 상태 배지 렌더링 함수
  const getVerdictBadge = (isCorrect: boolean | null | undefined) => {
    if (isCorrect === true) {
      return <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 text-sm font-bold shadow-sm"><CheckCircle2 className="w-4 h-4 mr-1.5" /> 맞았습니다!</Badge>;
    } else if (isCorrect === false) {
      return <Badge variant="destructive" className="px-3 py-1 text-sm font-bold shadow-sm"><XCircle className="w-4 h-4 mr-1.5" /> 틀렸습니다</Badge>;
    } else {
      return <Badge variant="outline" className="px-3 py-1 text-sm font-bold text-slate-500"><Code2 className="w-4 h-4 mr-1.5" /> 상태 확인 불가</Badge>;
    }
  };

  // 로딩 화면 (빙글빙글 도는 UI)
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
    </div>
  );

  // URL에 id가 파라미터가 아예 없을 때의 방어 화면
  if (!submissionId) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-bold">
      유효하지 않은 접근입니다. (ID가 없습니다)
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* 1. 고정 헤더 */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur px-6 h-16 flex items-center justify-between">
        { /* [A] Diveon 로고 영역 */}
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

        { /* [C] 검색창 영역 */}
        <div className="flex-1 max-w-sm px-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input type="search" placeholder="검색..." className="pl-9 bg-slate-50 border-slate-200 rounded-full h-9 text-sm" />
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

      <main className="container mx-auto max-w-[1000px] pt-8 px-6 pb-24 space-y-6">
        {/* 뒤로 가기 및 요약 헤더 */}
        <div>
          <Button variant="ghost" onClick={() => router.back()} className="mb-4 -ml-4 text-slate-500 hover:text-slate-900 hover:bg-slate-100">
            <ChevronLeft className="w-5 h-5 mr-1" /> 문제로 돌아가기
          </Button>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-bold">
                  유
                </AvatarFallback>
              </Avatar>
              <span className="font-bold text-slate-800">
                유저
              </span>
            </div>
          </div>
        </div>

        {/* 요약 카드 */}
        <Card className="border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
          <div className="flex flex-col md:flex-row">
            <div className="p-6 md:w-1/3 border-b md:border-b-0 md:border-r border-slate-100 bg-slate-50/50 flex flex-col justify-center items-start space-y-4">
              <div className="space-y-1 w-full">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Problem</p>
                <Link href={`/challenges/detail?id=${submissionData?.probId}`} className="text-lg font-bold text-indigo-600 hover:underline line-clamp-2">
                  문제 #{submissionData?.probId} 보러가기
                </Link>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Result</p>
                {getVerdictBadge(submissionData?.isCorrect)}
              </div>
            </div>

            <div className="p-6 md:w-2/3 grid grid-cols-2 md:grid-cols-4 gap-6 items-center">
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> 실행 시간</p>
                <p className="text-lg font-black text-slate-800 font-mono">{submissionData?.runtime !== undefined ? `${submissionData.runtime} ms` : "-"}</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5"><Database className="w-3.5 h-3.5" /> 메모리</p>
                <p className="text-lg font-black text-slate-800 font-mono">{submissionData?.memoryUsage !== undefined ? `${submissionData.memoryUsage} MB` : "-"}</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5"><Code2 className="w-3.5 h-3.5" /> 사용 언어</p>
                <p className="text-lg font-black text-slate-800 font-mono">{submissionData?.language || "-"}</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5" /> 점수</p>
                <p className="text-lg font-black text-slate-800 font-mono">{submissionData?.score !== undefined ? `${submissionData.score} / 100` : "-"}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* 코드 뷰어 */}
        <div className="space-y-3 pt-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-lg font-black text-slate-900">제출한 코드</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCode}
              className={`rounded-xl text-xs font-bold transition-all ${isCopied ? "bg-green-50 text-green-600 border-green-200" : "text-slate-600 hover:text-slate-900"
                }`}
            >
              {isCopied ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
              {isCopied ? "복사됨!" : "코드 복사"}
            </Button>
          </div>

          <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
            <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-500/20 border border-rose-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div>
              </div>
              <span className="ml-4 text-xs font-mono font-medium text-slate-400">
                solution.{submissionData?.language === 'python3' ? 'py' : submissionData?.language === 'java' ? 'java' : 'cpp'}
              </span>
            </div>

            <div className="bg-[#0D1117] p-6 overflow-x-auto">
              <pre className="font-mono text-sm leading-relaxed text-slate-300">
                <code>{submissionData?.code || "코드를 불러올 수 없습니다."}</code>
              </pre>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

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

export default function SubmissionDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    }>
      <SubmissionDetailContent />
    </Suspense>
  );
}