"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Terminal as TerminalIcon, Shield, RefreshCw, Zap, Clock } from "lucide-react";

import { Header } from "@/components/Header";
import { DivoCheer } from "@/components/dv/DivoMotion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { logout } from "@/lib/authSession";
import { readCommandAllowlist } from "@/lib/command-allowlist";
import { readPracticeBuild, practiceBuildPresentation } from "@/lib/practice-build";
import { formatRemaining } from "@/lib/practice-session";
import { connectTerminal, resizeFrame } from "@/lib/terminal-connection";
import { readVmSession, resetVmSession, stopVmSession, type VmSession } from "@/lib/vm-session";

export type PracticeLabProps = {
  probId: number;
  activeMenu: "challenge" | "contest";
  /** Where to go after ending the practice or when it cannot start. */
  exitHref: string;
  /** Where to go after a correct flag. */
  doneHref: string;
  /** Check the problem's practice build before creating a session (regular challenges). */
  checkBuild: boolean;
  /** Submits a flag; resolves to whether it was correct, or null when that is not known yet. */
  submitFlag: (answer: string, token: string | null) => Promise<boolean | null>;
};

type FlagNotice = { tone: "solved" | "wrong" | "unknown" | "error"; text: string } | null;

/** Practice screen shared by regular and contest problems: one container session with a web terminal. */
export function PracticeLab({ probId, activeMenu, exitHref, doneHref, checkBuild, submitFlag }: PracticeLabProps) {
  const router = useRouter();
  const terminalRef = useRef<HTMLDivElement>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [problemTitle, setProblemTitle] = useState("실습 환경 준비 중...");
  const [commandAllowlist, setCommandAllowlist] = useState<string[] | null>(null);
  const [session, setSession] = useState<VmSession | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [flag, setFlag] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [flagNotice, setFlagNotice] = useState<FlagNotice>(null);
  const [cheer, setCheer] = useState(0);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const started = useRef(false);

  useEffect(() => () => { if (leaveTimer.current) clearTimeout(leaveTimer.current); }, []);

  useEffect(() => { setIsLoggedIn(!!localStorage.getItem("token")); }, []);

  // Problem check and session creation run once per page.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
    (async () => {
      try {
        const problem = await fetch(`https://diveon.net/api/problems/${probId}`, { headers });
        if (!problem.ok) {
          if (checkBuild) { router.replace(exitHref); return; }
          setProblemTitle("알 수 없는 실습 문제");
        } else {
          const json = await problem.json();
          const allowlist = readCommandAllowlist(json.data?.vmInfo);
          setProblemTitle(json.data?.title ?? "실습 문제");
          setCommandAllowlist(allowlist);
          if (checkBuild) {
            const build = readPracticeBuild(json.data?.practiceBuild);
            if (!build.canStart) {
              alert(practiceBuildPresentation(build, allowlist !== null).message);
              router.replace(exitHref);
              return;
            }
          }
        }
        const created = await fetch("https://diveon.net/api/vm/create", {
          method: "POST", headers, body: JSON.stringify({ probId }),
        });
        if (created.ok) {
          setSession(readVmSession((await created.json()).data));
          setNow(Date.now());
        } else {
          const error = await created.json().catch(() => ({}));
          alert(`실습 환경을 준비하지 못했습니다: ${error.detail || error.message || "잠시 후 다시 시도해 주세요."}`);
          router.push(exitHref);
        }
      } catch {
        alert("서버와 통신하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }
    })();
  }, [probId, checkBuild, exitHref, router]);

  // Remaining time follows the server's expiry, not a local countdown.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const remaining = session ? Math.max(0, Math.floor((session.expiresAtEpochMs - now) / 1000)) : 0;
  const expired = session !== null && remaining === 0;

  usePracticeTerminal(terminalRef, probId, expired ? null : session?.containerId ?? null);

  const handleReset = async () => {
    if (!session || !confirm("실습 환경을 처음 상태로 되돌립니다. 작업한 내용은 모두 지워집니다. 계속할까요?")) return;
    setIsResetting(true);
    try {
      setSession(await resetVmSession(probId, session.sessionId, localStorage.getItem("token")));
      setNow(Date.now());
      setFlagNotice(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : "실습 환경을 초기화하지 못했습니다.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleEnd = async () => {
    if (!confirm("실습을 종료할까요? 실습 환경의 모든 작업 내용이 지워집니다.")) return;
    try {
      await stopVmSession(probId, session?.sessionId ?? null, localStorage.getItem("token"));
      setSession(null);
      router.push(exitHref);
    } catch (error) {
      alert(error instanceof Error ? error.message : "실습 종료를 확인하지 못했습니다.");
    }
  };

  const handleFlagSubmit = async () => {
    const answer = flag.trim();
    if (!answer) { setFlagNotice({ tone: "error", text: "플래그를 입력해 주세요." }); return; }
    setIsSubmitting(true);
    setFlagNotice(null);
    const token = localStorage.getItem("token");
    try {
      const correct = await submitFlag(answer, token);
      if (correct === true) {
        // Only a solved practice ends its environment.
        let stopped = true;
        try { await stopVmSession(probId, session?.sessionId ?? null, token); } catch { stopped = false; }
        setFlagNotice({ tone: "solved", text: stopped ? "정답입니다! 실습 환경을 종료했습니다." : "정답입니다! 실습 환경 종료는 확인하지 못했으니 잠시 뒤 다시 확인해 주세요." });
        setCheer(count => count + 1);
        // Leave once Divo has gone back down; a failed stop gets more time to read.
        leaveTimer.current = setTimeout(() => router.push(doneHref), stopped ? 3800 : 6000);
      } else if (correct === false) {
        setFlagNotice({ tone: "wrong", text: "오답입니다. 실습 환경은 그대로 있으니 계속 풀어 보세요." });
      } else {
        setFlagNotice({ tone: "unknown", text: "채점 결과를 아직 확인하지 못했습니다. 채점 현황에서 결과를 확인해 주세요." });
      }
    } catch (error) {
      setFlagNotice({ tone: "error", text: error instanceof Error ? error.message : "제출하지 못했습니다." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const solved = flagNotice?.tone === "solved";
  const noticeColor = solved ? "text-success" : flagNotice?.tone === "wrong" ? "text-danger" : flagNotice?.tone === "unknown" ? "text-warning" : "text-danger";

  return (
    <div className="dv-dark-scope h-screen flex flex-col bg-canvas overflow-hidden w-full font-sans text-ink">
      <div className="shrink-0">
        <Header isLoggedIn={isLoggedIn} userImgUrl="" activeMenu={activeMenu} showSearch={false}
          onLogout={() => { if (!logout()) return; window.location.replace("/"); }} />
      </div>

      <div className="flex-1 overflow-hidden">
        <main className="h-full max-w-[1400px] mx-auto p-6 flex flex-col gap-4">
          <div className="h-16 shrink-0 bg-panel border border-line rounded-2xl px-6 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4 min-w-0">
              <div className="h-10 w-10 shrink-0 bg-primary/10 rounded-xl flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-xl font-bold text-ink tracking-tight truncate">{problemTitle}</h1>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div aria-label="남은 실습 시간" className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-mono font-bold transition-colors ${session && remaining < 300 ? "bg-danger/10 border-danger/30 text-danger" : "bg-canvas border-line text-ink"}`}>
                <Clock className={`w-4 h-4 ${session && remaining < 300 ? "text-danger" : "text-ink-subtle"}`} />
                <span>{formatRemaining(remaining)}</span>
              </div>
              <div className="h-6 w-[1px] bg-line mx-1" />
              <Button onClick={handleReset} disabled={!session || expired || isResetting} variant="outline" size="sm"
                className="h-10 border-line text-ink-muted rounded-xl px-4 font-bold hover:bg-raised/60">
                <RefreshCw className={`w-4 h-4 mr-2 ${isResetting ? "animate-spin" : ""}`} /> 실습 환경 초기화
              </Button>
              {/* Default variant: "destructive" adds dark:bg-destructive/20, which dims this solid button in the dark scope. */}
              <Button onClick={handleEnd} disabled={!session} size="sm"
                className="h-10 bg-danger hover:bg-danger/85 text-white rounded-xl px-6 font-bold shadow-lg shadow-black/40">
                실습 종료
              </Button>
            </div>
          </div>

          {expired && (
            <div role="status" className="shrink-0 rounded-2xl border border-warning/40 bg-warning/10 px-6 py-3 text-sm font-bold text-warning">
              실습 시간이 끝났습니다. 실습 환경은 자동으로 정리됩니다.{" "}
              <Link href={exitHref} className="underline underline-offset-2">문제로 돌아가기</Link>
            </div>
          )}

          <div className="flex-1 min-h-0 w-full rounded-2xl overflow-hidden border border-line shadow-lg bg-deep flex flex-col relative">
            <style dangerouslySetInnerHTML={{
              __html: `
              .xterm-viewport::-webkit-scrollbar { width: 10px; }
              .xterm-viewport::-webkit-scrollbar-track { background: #05080C; }
              .xterm-viewport::-webkit-scrollbar-thumb { background: #182233; border-radius: 5px; }
              .xterm, .xterm-viewport, .xterm-screen { background-color: #05080C !important; }
            `}} />
            <div className="h-10 bg-deep border-b border-line flex items-center px-4 justify-between shrink-0 z-10">
              <div className="flex items-center gap-2 min-w-0">
                <TerminalIcon className="w-4 h-4 text-success shrink-0" />
                <span className="text-xs font-bold text-ink-subtle font-mono tracking-tight truncate"
                  title={commandAllowlist ? commandAllowlist.join(" ") : undefined}>
                  {commandAllowlist ? `허용 명령어: ${commandAllowlist.join(" · ")}` : "터미널"}
                </span>
              </div>
            </div>
            <div className="flex-1 min-h-0 w-full bg-deep pl-4 pt-3 pb-3 pr-1 flex flex-col">
              {!session && !expired && <p className="text-sm text-ink-subtle font-mono" role="status">실습 환경을 준비하는 중...</p>}
              <div ref={terminalRef} className="flex-1 min-h-0 w-full bg-deep" />
            </div>
          </div>

          <div className="shrink-0 bg-deep border border-line rounded-2xl px-6 py-4 flex flex-col gap-2 shadow-2xl">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 shrink-0">
                <Zap className="h-5 w-5 text-warning fill-warning" />
                <span className="text-sm font-black text-ink uppercase tracking-widest">FLAG</span>
              </div>
              <form className="flex-1 flex gap-2" onSubmit={event => { event.preventDefault(); handleFlagSubmit(); }}>
                <Input value={flag} onChange={event => setFlag(event.target.value)} aria-label="플래그"
                  placeholder="DK{Enter_The_Flag_Here}"
                  className="h-11 bg-deep border-line text-success font-mono focus-visible:ring-primary rounded-xl" />
                <Button type="submit" disabled={isSubmitting || solved}
                  className="h-11 px-8 bg-primary hover:bg-primary-hover text-primary-ink font-black rounded-xl shadow-lg transition-all active:scale-95">
                  {isSubmitting ? "확인 중..." : "인증하기"}
                </Button>
              </form>
            </div>
            {flagNotice && <p role="status" className={`text-sm font-bold ${noticeColor}`}>{flagNotice.text}</p>}
          </div>
        </main>
      </div>
      <DivoCheer play={cheer} />
    </div>
  );
}

/**
 * One xterm per page, reconnected whenever the container changes (start, reset), so a reset never tears the
 * terminal down mid-render. The server-side PTY follows the visible terminal size.
 */
function usePracticeTerminal(terminalRef: RefObject<HTMLDivElement | null>, probId: number, containerId: string | null) {
  const termRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let disposed = false;
    let term: any;
    let resizeObserver: ResizeObserver | undefined;
    (async () => {
      const [{ Terminal }, { FitAddon }] = await Promise.all([import("xterm"), import("xterm-addon-fit")]);
      await import("xterm/css/xterm.css");
      if (disposed || !terminalRef.current) return;
      term = new Terminal({
        cursorBlink: true,
        fontSize: 15,
        fontFamily: '"JetBrains Mono", D2Coding, ui-monospace, monospace',
        theme: { background: "#05080C", foreground: "#D7E6F5", cursor: "#00FFA3", cursorAccent: "#05080C", selectionBackground: "rgba(0,209,255,0.28)", green: "#00FFA3", brightGreen: "#5CFFC2", blue: "#00D1FF", brightBlue: "#5CE1FF", red: "#FF6B86", yellow: "#FFB547", magenta: "#B79CFF", cyan: "#7FE7FF" },
      });
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(terminalRef.current);
      setTimeout(() => { if (!disposed) { try { fitAddon.fit(); } catch { /* Not laid out yet. */ } } }, 50);
      resizeObserver = new ResizeObserver(() => { try { fitAddon.fit(); } catch { /* Terminal closed. */ } });
      resizeObserver.observe(terminalRef.current);
      termRef.current = term;
      setReady(true);
    })().catch(() => { /* The connection effect reports what the user can act on. */ });
    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      termRef.current = null;
      term?.dispose();
    };
  }, [terminalRef]);

  useEffect(() => {
    const term = termRef.current;
    if (!ready || !term || !containerId) return;
    const connectionAbort = new AbortController();
    let ws: WebSocket | undefined;
    let attach: { dispose(): void } | undefined;
    let sizeListener: { dispose(): void } | undefined;
    term.reset();
    term.writeln("실습 환경에 연결하는 중...");
    (async () => {
      const { AttachAddon } = await import("xterm-addon-attach");
      if (connectionAbort.signal.aborted) return;
      ws = await connectTerminal({
        probId, containerId, token: localStorage.getItem("token"),
        signal: connectionAbort.signal,
        onReady: socket => {
          term.writeln("\x1b[1;32m연결되었습니다.\x1b[0m\r\n");
          attach = new AttachAddon(socket);
          term.loadAddon(attach);
          const sendSize = () => { if (socket.readyState === WebSocket.OPEN) socket.send(resizeFrame(term.cols, term.rows)); };
          sendSize();
          sizeListener = term.onResize(sendSize);
        },
        onError: () => term.writeln("\r\n접속 권한을 확인하지 못했습니다. 새로고침해 주세요."),
        onClose: () => term.writeln("\r\n연결이 끊어졌습니다."),
      });
    })().catch(() => {
      if (!connectionAbort.signal.aborted) term.writeln("\r\n연결하지 못했습니다. 로그인과 실습 상태를 확인해 주세요.");
    });
    return () => {
      connectionAbort.abort();
      sizeListener?.dispose();
      attach?.dispose();
      ws?.close();
    };
  }, [ready, probId, containerId]);
}
