"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Terminal as TerminalIcon, Shield, RefreshCw, Bell, LogOut, LayoutGrid, Users, BarChart3,
  Trophy, ShoppingBag, Menu, CheckCircle, Zap, Clock
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

function PracticeContent() {
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

  // API 연동 스위치 및 동적 상태 선언 아래에 추가
  const [containerId, setContainerId] = useState<string | null>(null);
  const [isVmLoading, setIsVmLoading] = useState(true); // VM 생성 로딩 상태

  const hasFetched = useRef(false);

  // [API] 페이지 로드 시 API를 호출하여 문제 제목과 OS 정보를 가져오기
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const fetchProblemDataAndCreateVm = async () => {
      if (!USE_API_REQUEST) {
        setProblemTitle(`MOCK 데이터 실습 문제 #${probId}`);
        setIsVmLoading(false);
        return;
      }

      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      };

      try {
        // 1. 문제 정보 조회
        const probRes = await fetch(`https://diveon.net/api/problems/${probId}`, { headers });
        if (probRes.ok) {
          const json = await probRes.json();
          setProblemTitle(json.data.title);
          if (json.data.vmInfo?.osImage) setOsImage(json.data.vmInfo.osImage);
        } else {
          setProblemTitle("알 수 없는 실습 문제");
        }

        // 2. VM 생성 요청 (POST /api/vm/create)
        const vmRes = await fetch(`https://diveon.net/api/vm/create`, {
          method: "POST",
          headers,
          body: JSON.stringify({ probId: Number(probId) }) // API 명세 키값 매핑
        });

        if (vmRes.status === 201 || vmRes.status === 200) {
          const vmJson = await vmRes.json();
          setContainerId(vmJson.data.containerId);

          if (vmJson.data.expiresAt) {
            const expiresDate = new Date(vmJson.data.expiresAt).getTime();
            const now = new Date().getTime();
            const diffSeconds = Math.floor((expiresDate - now) / 1000);
            setTimeLeft(diffSeconds > 0 ? diffSeconds : 0);
          }
        } else {
          const errJson = await vmRes.json();
          alert(`VM 환경을 구성할 수 없습니다: ${errJson.detail || errJson.message}`);
          router.push(`/challenges/detail?id=${probId}`); // 실패 시 강제 퇴장
        }
      } catch (error) {
        console.error("통신 에러:", error);
        alert("서버와 통신을 실패했습니다.");
      } finally {
        setIsVmLoading(false);
      }
    };

    fetchProblemDataAndCreateVm();
  }, [probId]); // router 의존성 추가

  //  실습 종료 시 문제 상세 페이지로 복귀
  const handleEndPractice = async () => {
    if (!confirm("실습을 종료하시겠습니까? 진행 중인 모든 데이터가 삭제(초기화)됩니다.")) {
      return;
    }

    if (!USE_API_REQUEST) {
      router.push(`/challenges/detail?id=${probId}`);
      return;
    }

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`https://diveon.net/api/vm/stop`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ probId: Number(probId) }) // API 명세 키값 매핑
      });

      if (res.ok || res.status === 404) {
        alert("실습 환경이 종료되었습니다.");
        router.push(`/challenges/detail?id=${probId}`);
      } else {
        const errorData = await res.json();
        alert(`종료 실패: ${errorData.detail || errorData.message}`);
      }
    } catch (error) {
      console.error("VM 종료 에러:", error);
      alert("서버와 통신 중 오류가 발생했습니다.");
    }
  };

  // [API] FLAG 제출 성공 시 문제 상세 페이지로 복귀
  const handleFlagSubmit = async () => {
    if (!flag.trim()) {
      alert("플래그를 입력해주세요.");
      return;
    }

    const token = localStorage.getItem("token");
    const targetFlag = flag.trim();

    // 1. 사용자 화면은 지체 없이 즉시 문제 상세(메인) 페이지로 이동 시킵니다.
    alert("채점 요청이 접수되었습니다. 결과는 챌린지 리스트에서 확인하실 수 있습니다!");
    router.push(`/challenges/detail?id=${probId}`);

    // 2. 이후 백엔드 통신은 await로 사용자를 붙잡지 않고 백그라운드에서 조용히 실행합니다.
    (async () => {
      try {
        // [비동기 1단계] 백그라운드 채점 서버 노크
        const response = await fetch(`https://diveon.net/api/submissions/grade`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            probId: Number(probId),
            submissionType: "practice",
            answer: targetFlag,
            containerId: null
          })
        });

        if (response.ok) {
          const json = await response.json();
          const newId = json?.data?.submissionId;
          if (newId) {
            sessionStorage.setItem(`pending_sub_${probId}`, newId);
          }
        }

        // [비동기 2단계] 채점 요청 끝났으니 사용하던 컨테이너(VM) 정지 요청
        await fetch(`https://diveon.net/api/vm/stop`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ probId: Number(probId) })
        });

      } catch (error) {
        // 이미 사용자는 메인 페이지로 나갔으므로 alert를 띄우지 않고 콘솔에만 조용히 에러를 남깁니다.
        console.error("백그라운드 채점/VM종료 파이프라인 에러:", error);
      }
    })();
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

  // [API] 터미널 초기화 및 웹소켓 연결
  useEffect(() => {
    if (!terminalRef.current || !containerId) return;

    let term: any;
    let resizeObserver: ResizeObserver;
    let ws: WebSocket;

    const initTerminal = async () => {
      const { Terminal } = await import("xterm");
      const { FitAddon } = await import("xterm-addon-fit");
      const { AttachAddon } = await import("xterm-addon-attach"); // Attach Addon 추가
      await import("xterm/css/xterm.css");

      term = new Terminal({
        cursorBlink: true,
        fontSize: 15,
        fontFamily: '"Fira Code", monospace',
        theme: { background: "#020617", foreground: "#f8fafc", cursor: "#818cf8" },
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(terminalRef.current!);

      setTimeout(() => fitAddon.fit(), 50);
      resizeObserver = new ResizeObserver(() => { try { fitAddon.fit(); } catch { } });
      resizeObserver.observe(terminalRef.current!);

      term.writeln("\x1b[1;34mDIVEON Remote Lab Cloud v2.0.4-LTS\x1b[0m");
      term.writeln("Connecting to server...");

      // WebSocket 연결 (명세서의 /ws/terminal 사용)
      const token = localStorage.getItem("token");
      // 프로토콜을 wss(https) 또는 ws(http)로 설정
      const wsUrl = `wss://diveon.net/ws/terminal?container_id=${containerId}&token=${token}`;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        term.writeln("\x1b[1;32mConnection established.\x1b[0m\r\n");
        // AttachAddon을 이용해 웹소켓과 터미널을 양방향 파이프로 연결
        const attachAddon = new AttachAddon(ws);
        term.loadAddon(attachAddon);
      };

      ws.onerror = () => {
        term.writeln("\x1b[1;31mConnection error. Please try again.\x1b[0m");
      };

      ws.onclose = () => {
        term.writeln("\r\n\x1b[1;33mConnection closed.\x1b[0m");
      };
    };

    initTerminal();

    return () => {
      resizeObserver?.disconnect();
      term?.dispose();
      ws?.close(); // 컴포넌트가 사라지면 소켓 연결도 끊기
    };
  }, [probId, containerId]);

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

            <style dangerouslySetInnerHTML={{
              __html: `
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

export default function PracticePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    }>
      <PracticeContent />
    </Suspense>
  );
}