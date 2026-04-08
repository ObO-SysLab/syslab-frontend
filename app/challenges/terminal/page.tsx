"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { 
  Terminal as TerminalIcon, 
  ChevronLeft, 
  Shield, 
  Download, 
  Info,
  RefreshCw,
  Clock
} from "lucide-react";

// xterm.js 관련 임포트
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";


export default function PracticePage() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const [currentPath, setCurrentPath] = useState("~/forensics");

  // 1. 터미널 초기화 로직
  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: '"Fira Code", monospace',
      theme: {
        background: "#0f172a", // Slate-900 느낌의 딥 블루
        foreground: "#f8fafc",
        cursor: "#818cf8",
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;

    // 초기 환영 메시지
    term.writeln("\x1b[1;34mDIVEON Forensics Lab OS v2.0.4-LTS\x1b[0m");
    term.writeln("Unauthorized access is strictly prohibited.");
    term.writeln("Type \x1b[1;33m'help'\x1b[0m to see available forensic tools.\r\n");
    term.write(`\x1b[1;32muser@diveon\x1b[0m:\x1b[1;34m${currentPath}\x1b[0m$ `);

    // 키 입력 처리 (간단한 시뮬레이터 로직)
    let command = "";
    term.onKey(({ key, domEvent }) => {
      const printable = !domEvent.altKey && !domEvent.ctrlKey && !domEvent.metaKey;

      if (domEvent.keyCode === 13) { // Enter
        term.writeln("");
        handleCommand(command, term);
        command = "";
        term.write(`\r\n\x1b[1;32muser@diveon\x1b[0m:\x1b[1;34m${currentPath}\x1b[0m$ `);
      } else if (domEvent.keyCode === 8) { // Backspace
        if (command.length > 0) {
          command = command.slice(0, -1);
          term.write("\b \b");
        }
      } else if (printable) {
        command += key;
        term.write(key);
      }
    });

    return () => term.dispose();
  }, []);

  // 2. 명령어 처리 시뮬레이터 (전공자 맞춤형)
  const handleCommand = (cmd: string, term: Terminal) => {
    const trimmedCmd = cmd.trim().toLowerCase();

    switch (trimmedCmd) {
      case "help":
        term.writeln("Available commands:");
        term.writeln("  ls       - List files in current directory");
        term.writeln("  cat      - Display file content");
        term.writeln("  vol      - Run Volatility memory analysis");
        term.writeln("  strings  - Find printable strings in a file");
        term.writeln("  clear    - Clear the terminal screen");
        break;
      case "ls":
        term.writeln("evidence_dump.raw    mft_table.csv    readme.txt");
        break;
      case "cat readme.txt":
        term.writeln("\x1b[1;33m[IMPORTANT]\x1b[0m");
        term.writeln("Case #2026-04-07: Suspected data exfiltration.");
        term.writeln("Analyze the memory dump to find the attacker's IP.");
        break;
      case "vol":
        term.writeln("Volatility 3 Framework 2.4.1");
        term.writeln("\x1b[1;36mAnalyzing memory artifacts...\x1b[0m");
        term.writeln("[*] Offset: 0x3f2a1000  -  PsList: Found suspicious process 'nc.exe'");
        break;
      case "clear":
        term.clear();
        break;
      case "":
        break;
      default:
        term.writeln(`-bash: ${cmd}: command not found`);
    }
  };

  return (
    <div className="h-screen bg-[#0f172a] flex flex-col font-sans overflow-hidden">
      
      {/* 상단 네비게이션 */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Link href="/challenges">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
              <ChevronLeft size={18} className="mr-1" /> 목록으로
            </Button>
          </Link>
          <div className="h-4 w-[1px] bg-slate-700" />
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-400" />
            <h1 className="text-sm font-bold text-white tracking-tight">
              실습: 메모리 오염 및 쉘 분석 (Lab #12)
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-indigo-400 border-indigo-900 bg-indigo-950/30">
            <Clock size={12} className="mr-1" /> 45:00 남음
          </Badge>
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 font-bold">
            실습 종료
          </Button>
        </div>
      </header>

      {/* 메인 콘텐츠 영역 */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* 좌측: 실습 가이드 */}
        <aside className="w-80 bg-slate-900 border-r border-slate-800 p-6 overflow-y-auto space-y-6">
          <div className="space-y-2">
            <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
              <Info size={14} /> Mission Objective
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              제공된 <code className="text-indigo-300">evidence_dump.raw</code> 파일을 분석하여 공격자가 백도어를 설치한 흔적을 찾으세요.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Resources</h3>
            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">분석 도구</span>
                <span className="text-white font-bold">Volatility 3</span>
              </div>
              <Button variant="outline" size="sm" className="w-full text-[11px] border-slate-600 text-slate-300">
                <Download size={12} className="mr-2" /> 증거 파일 다운로드
              </Button>
            </div>
          </div>

          <Separator className="bg-slate-800" />

          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Hints</h3>
            <ul className="text-xs text-slate-500 space-y-2 list-disc pl-4">
              <li>pslist 명령어로 이상 프로세스를 확인하세요.</li>
              <li>netscan으로 활성화된 커넥션을 확인하세요.</li>
            </ul>
          </div>
        </aside>

        {/* 우측: xterm.js 터미널 */}
        <section className="flex-1 flex flex-col bg-[#0f172a] relative">
          <div className="flex items-center px-4 h-9 bg-slate-800/50 border-b border-slate-800 gap-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <TerminalIcon size={14} className="text-indigo-400" />
              Terminal - diveon@forensics-lab
            </div>
            <RefreshCw size={12} className="text-slate-500 hover:text-white cursor-pointer ml-auto" />
          </div>
          
          {/* 터미널이 그려지는 곳 */}
          <div 
            ref={terminalRef} 
            className="flex-1 p-2 overflow-hidden" 
            style={{ backgroundColor: "#0f172a" }}
          />
        </section>

      </main>

      {/* 하단 상태바 */}
      <footer className="h-6 bg-indigo-600 flex items-center px-4 justify-between text-[10px] text-white font-bold">
        <div className="flex gap-4">
          <span>STATION: DANKOOK_SOF_LAB</span>
          <span>LATENCY: 12ms</span>
        </div>
        <div className="flex gap-4">
          <span>UTF-8</span>
          <span>TTY1</span>
        </div>
      </footer>
    </div>
  );
}