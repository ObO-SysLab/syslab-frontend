"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
// 💡 [추가] URL 파라미터와 라우팅을 위해 추가
import { useSearchParams, useRouter } from "next/navigation"; 
import { 
  Terminal as TerminalIcon, Shield, RefreshCw, Bell, LogOut, LayoutGrid, Users, BarChart3,
  Trophy, ShoppingBag, Menu, CheckCircle, Zap, Clock
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

export default function PracticePage() {
  // 라우터와 URL 파라미터 가져오기
  const searchParams = useSearchParams();
  const router = useRouter();
  const probId = searchParams.get('id') || "1";

  // API 연동 스위치 및 동적 상태 선언
  const USE_API_REQUEST = true; 
  const [problemTitle, setProblemTitle] = useState("실습 환경 구성 중...");
  const [osImage, setOsImage] = useState("Ubuntu 22.04 LTS"); // 기본 OS

  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<any>(null);
  const [flag, setFlag] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(2700); // 45분 (초 단위)

  // 페이지 로드 시 API를 호출하여 문제 제목과 OS 정보를 가져오기
  useEffect(() => {
    const fetchProblemData = async () => {
      if (!USE_API_REQUEST) {
        setProblemTitle(`MOCK 데이터 실습 문제 #${probId}`);
        return;
      }

      const token = localStorage.getItem("token");
      try {
        const res = await fetch(`https://diveon.net/api/problems/${probId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          }
        });

        if (res.ok) {
          const json = await res.json();
          setProblemTitle(json.data.title);
          // VM 정보가 있다면 OS 이름도 업데이트
          if (json.data.vm_info?.os_image) {
            setOsImage(json.data.vm_info.os_image);
          }
        } else {
          setProblemTitle("알 수 없는 실습 문제");
        }
      } catch (error) {
        console.error("문제 정보 로드 실패:", error);
        setProblemTitle("문제 정보를 불러오지 못했습니다.");
      }
    };

    fetchProblemData();
  }, [probId]);

  //  실습 종료 시 문제 상세 페이지로 복귀
  const handleEndPractice = () => {
    if (confirm("실습을 종료하시겠습니까? 진행 중인 모든 데이터가 초기화됩니다.")) {
      router.push(`/challenges/detail?id=${probId}`); 
    }
  };

  //  FLAG 제출 성공 시 문제 상세 페이지로 복귀
  const handleFlagSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      if (flag === "DK{fake_flag_for_test}") {
        alert("Correct Flag! 실습을 완료했습니다.");
        router.push(`/challenges/detail?id=${probId}`);
      } else {
        alert("Wrong Flag. Try again.");
      }
      setIsSubmitting(false);
    }, 1000);
  };

  // 타이머 로직
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 터미널 초기화 로직
  useEffect(() => {
    if (!terminalRef.current) return;

    let term: any;
    let resizeObserver: ResizeObserver;

    const initTerminal = async () => {
      const { Terminal } = await import("xterm");
      const { FitAddon } = await import("xterm-addon-fit");
      await import("xterm/css/xterm.css");

      term = new Terminal({
        cursorBlink: true,
        fontSize: 15,
        fontFamily: '"Fira Code", monospace',
        theme: {
          background: "#020617",
          foreground: "#f8fafc",
          cursor: "#818cf8",
        },
      });

      const fitAddon = new FitAddon();

      term.loadAddon(fitAddon);
      term.open(terminalRef.current!);

      setTimeout(() => {
        fitAddon.fit();
      }, 50);

      resizeObserver = new ResizeObserver(() => {
        try {
          fitAddon.fit();
        } catch { }
      });

      resizeObserver.observe(terminalRef.current!);

      term.writeln("\x1b[1;34mDIVEON Remote Lab Cloud v2.0.4-LTS\x1b[0m");
      term.writeln(`Connected to instance for Problem #${probId}`);
      term.writeln("Type \x1b[1;33m'help'\x1b[0m to see available commands.\r\n");
      term.write("\x1b[1;32mroot@diveon\x1b[0m:\x1b[1;34m~\x1b[0m# ");
    };

    initTerminal();

    return () => {
      resizeObserver?.disconnect();
      term?.dispose();
    };
  }, [probId]);

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden w-full font-sans text-slate-900">

      {/* 1. 고정 헤더 */}
      <header className="shrink-0 h-16 border-b bg-white px-6 flex items-center justify-between z-50">
        <div className="flex items-center gap-8">
          <Menu className="h-6 w-6 text-slate-500 lg:hidden" />
          <Link href="/" className="text-2xl font-black tracking-tighter text-slate-900 mr-4">Diveon</Link>
          <nav className="hidden lg:flex items-center gap-1">
            <NavMenuLink href="/challenges" icon={<LayoutGrid size={18} />} label="챌린지" active />
            <NavMenuLink href="/contests" icon={<Trophy size={18} />} label="대회" />
            <NavMenuLink href="/groups" icon={<Users size={18} />} label="그룹" />
            <NavMenuLink href="/ranking" icon={<BarChart3 size={18} />} label="랭킹" />
            <NavMenuLink href="/store" icon={<ShoppingBag size={18} />} label="스토어" />
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-slate-100 rounded-full relative"><Bell className="h-5 w-5 text-slate-500" /></button>
          <Avatar className="h-9 w-9 border border-slate-200"><AvatarFallback>DY</AvatarFallback></Avatar>
          <button className="p-2 hover:bg-red-50 rounded-full text-red-500"><LogOut className="h-5 w-5" /></button>
        </div>
      </header>

      {/* 2. 메인 컨텐츠 영역 */}
      <div className="flex-1 overflow-hidden">
        <main className="h-full max-w-[1400px] mx-auto p-6 flex flex-col gap-4">

          {/* [A] 상단 타이틀 바 */}
          <div className="h-16 shrink-0 bg-white border border-slate-200 rounded-2xl px-6 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Shield className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                {/*  동적으로 받아온 제목과 OS 이미지 렌더링 */}
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">{problemTitle}</h1>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Instance: {osImage}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* 남은 시간 표시 배지 */}
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-mono font-bold transition-colors ${timeLeft < 300 ? "bg-red-50 border-red-200 text-red-600 animate-pulse" : "bg-slate-50 border-slate-100 text-slate-700"
                }`}>
                <Clock className={`w-4 h-4 ${timeLeft < 300 ? "text-red-500" : "text-slate-400"}`} />
                <span>{formatTime(timeLeft)}</span>
              </div>

              <div className="h-6 w-[1px] bg-slate-200 mx-1" />

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 border-slate-200 text-slate-600 rounded-xl px-4 font-bold hover:bg-slate-50"
                >
                  <RefreshCw className="w-4 h-4 mr-2" /> 인스턴스 재시작
                </Button>

                {/* 실습 종료 버튼 */}
                <Button
                  onClick={handleEndPractice}
                  variant="destructive"
                  size="sm"
                  className="h-10 bg-red-500 hover:bg-red-600 text-white rounded-xl px-6 font-bold shadow-lg shadow-red-100"
                >
                  실습 종료
                </Button>
              </div>
            </div>
          </div>

          {/* [B] 터미널 메인 영역 (다크모드 밀봉 유지) */}
          <div className="flex-1 min-h-0 w-full rounded-2xl overflow-hidden border border-slate-800 shadow-lg bg-slate-950 flex flex-col relative">
            
            <style dangerouslySetInnerHTML={{ __html: `
              .xterm-viewport::-webkit-scrollbar { width: 10px; }
              .xterm-viewport::-webkit-scrollbar-track { background: #020617; }
              .xterm-viewport::-webkit-scrollbar-thumb { background: #334155; border-radius: 5px; }
              .xterm, .xterm-viewport, .xterm-screen { background-color: #020617 !important; }
            `}} />

            {/* 터미널 헤더 */}
            <div className="h-10 bg-slate-900 border-b border-slate-800 flex items-center px-4 justify-between shrink-0 z-10">
               <div className="flex items-center gap-2">
                 <TerminalIcon className="w-4 h-4 text-emerald-400" />
                 <span className="text-xs font-bold text-slate-400 font-mono tracking-tight">root@diveon: ~</span>
               </div>
               <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
               </div>
            </div>
            
            {/* 실제 터미널 렌더링 영역 */}
            <div className="flex-1 min-h-0 w-full bg-slate-950 pl-4 pt-3 pb-3 pr-1 flex flex-col">
               <div ref={terminalRef} className="flex-1 min-h-0 w-full bg-slate-950" />
            </div>
          </div>

          {/* [C] 하단 FLAG 제출 칸 */}
          <div className="h-20 shrink-0 bg-slate-900 border border-slate-800 rounded-2xl px-6 flex items-center gap-6 shadow-2xl">
            <div className="flex items-center gap-3 shrink-0">
              <Zap className="h-5 w-5 text-amber-400 fill-amber-400" />
              <span className="text-sm font-black text-white uppercase tracking-widest">FLAG</span>
            </div>
            <div className="flex-1 flex gap-2">
              <Input
                value={flag}
                onChange={(e) => setFlag(e.target.value)}
                placeholder="DK{Enter_The_Flag_Here}"
                className="h-11 bg-slate-950 border-slate-700 text-emerald-400 font-mono focus-visible:ring-indigo-500 rounded-xl"
              />
              <Button
                onClick={handleFlagSubmit}
                disabled={isSubmitting}
                className="h-11 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg transition-all active:scale-95"
              >
                {isSubmitting ? "인증 중..." : "인증하기"}
              </Button>
            </div>
          </div>
        </main>
      </div>
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