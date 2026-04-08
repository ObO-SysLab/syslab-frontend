"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { 
  FileText, Search, GitBranch, Play, Save, ChevronRight, Files, 
  Settings, LogOut, Bell, Shield, AlertCircle, X, CheckCircle2
} from "lucide-react";

// Monaco Editor Import
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


// 1. [데이터] 문제 목 데이터
const MOCK_DATA = {
  id: 4,
  title: "Memory Corruption #101",
  file: "vulnerable.c",
  category: "Pwnable",
  level: "3",
  instruction: "아래 코드의 `gets()` 함수 취약점을 이용해 `target` 변수의 값을 `0x61626364`로 덮어쓰는 페이로드를 구상하세요.",
  initialCode: `#include <stdio.h>\n\nint main() {\n    int target = 0;\n    char buffer[16];\n\n    printf("Input: ");\n    gets(buffer); // Vulnerable point\n\n    if (target == 0x61626364) {\n        printf("Success! Target overwrited.\\n");\n    }\n\n    return 0;\n}`
};

export default function MonacoSubmitPage() {
  const [code, setCode] = useState(MOCK_DATA.initialCode);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    "DIVEON Kernel initialized...",
    "Sandboxed environment ready for vulnerable.c"
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const editorRef = useRef(null);

  // 에디터 마운트 시 설정
  function handleEditorDidMount(editor: any, monaco: any) {
    editorRef.current = editor;
  }

  // 제출 시뮬레이션
  const handleSubmit = () => {
    setIsSubmitting(true);
    setTerminalOutput(prev => [...prev, "$ gcc vulnerable.c -o exploit -fno-stack-protector", "$ ./exploit"]);
    
    setTimeout(() => {
      // 0x61626364는 'abcd'의 리틀 엔디언 또는 문자열 표현
      const isSuccess = code.includes("0x61626364"); 

      if (isSuccess) {
        setTerminalOutput(prev => [
          ...prev, 
          "[+] Memory corrupted successfully!",
          "[***] Flag: DK{m0naco_3dit0r_is_g00d}",
          "[Status] Challenge Cleared."
        ]);
      } else {
        setTerminalOutput(prev => [...prev, "[-] target value is still 0.", "[Error] Segmentation fault (core dumped)"]);
      }
      setIsSubmitting(false);
    }, 1500);
  };

  const vsColors = {
    bg: "bg-[#1e1e1e]",
    sidebar: "bg-[#252526]",
    activity: "bg-[#333333]",
    border: "border-[#3e3e42]",
    status: "bg-[#007acc]"
  };

  return (
    <div className={`h-screen ${vsColors.bg} flex flex-col font-sans overflow-hidden`}>
      
      {/* [1] 헤더 (VS Code 상단 느낌) */}
      <header className={`h-10 ${vsColors.sidebar} border-b ${vsColors.border} flex items-center justify-between px-4`}>
        <div className="flex items-center gap-4">
          <Link href="/challenges" className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-400 fill-indigo-400" />
            <span className="text-xs font-bold text-slate-400">Diveon - {MOCK_DATA.title}</span>
          </Link>
        </div>
        <div className="flex items-center gap-3">
            <Avatar className="h-6 w-6 border border-slate-700">
                <AvatarFallback className="bg-slate-800 text-[10px] text-white">DY</AvatarFallback>
            </Avatar>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* [2] Activity Bar */}
        <aside className={`w-12 ${vsColors.activity} flex flex-col items-center py-4 border-r ${vsColors.border} space-y-4`}>
          <Files className="w-6 h-6 text-white cursor-pointer" />
          <Search className="w-6 h-6 text-slate-500 cursor-pointer hover:text-white" />
          <GitBranch className="w-6 h-6 text-slate-500 cursor-pointer hover:text-white" />
        </aside>

        {/* [3] Sidebar (Explorer + Info) */}
        <aside className={`w-72 ${vsColors.sidebar} border-r ${vsColors.border} flex flex-col`}>
          <div className="p-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Explorer</div>
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-1 text-sm text-slate-300 flex items-center gap-2 bg-[#37373d]">
              <ChevronRight className="w-4 h-4 rotate-90" /> {MOCK_DATA.file}
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Badge className="bg-indigo-900/50 text-indigo-300 border-indigo-700">{MOCK_DATA.category}</Badge>
                <h2 className="text-white font-bold">{MOCK_DATA.title}</h2>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed bg-black/20 p-4 rounded-xl border border-white/5">
                {MOCK_DATA.instruction}
              </p>
            </div>
          </div>
        </aside>

        {/* [4] Editor & Terminal Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          
          {/* Editor Tabs */}
          <div className={`h-9 ${vsColors.sidebar} flex items-center`}>
            <div className="h-full bg-[#1e1e1e] border-t border-t-indigo-500 px-4 flex items-center gap-2 text-xs text-white">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              {MOCK_DATA.file}
              <X className="w-3 h-3 ml-2 text-slate-500" />
            </div>
            <div className="flex-1 bg-[#2d2d2d] h-full border-b ${vsColors.border}" />
            <div className="bg-[#2d2d2d] h-full border-b ${vsColors.border} flex items-center px-2 gap-2">
                <Button 
                    size="sm" 
                    onClick={handleSubmit} 
                    disabled={isSubmitting}
                    className="h-7 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4"
                >
                    <Play className="w-3 h-3 mr-1.5 fill-white" /> Submit
                </Button>
            </div>
          </div>

          {/* Monaco Editor 본체 */}
          <div className="flex-1 relative">
            <Editor
              height="100%"
              defaultLanguage="c"
              defaultValue={MOCK_DATA.initialCode}
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || "")}
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: true },
                fontSize: 14,
                fontFamily: "Fira Code, Menlo, Monaco, 'Courier New', monospace",
                lineNumbers: "on",
                roundedSelection: false,
                scrollBeyondLastLine: false,
                readOnly: false,
                automaticLayout: true,
                padding: { top: 15 }
              }}
            />
          </div>

          {/* Terminal / Panel */}
          <div className={`h-64 ${vsColors.sidebar} border-t ${vsColors.border} flex flex-col`}>
            <div className="flex items-center px-4 h-9 border-b ${vsColors.border} gap-6">
                <span className="text-[11px] font-bold text-white border-b border-white h-full flex items-center uppercase tracking-widest">Terminal</span>
                <span className="text-[11px] font-bold text-slate-500 h-full flex items-center uppercase tracking-widest cursor-pointer hover:text-slate-300">Debug Console</span>
            </div>
            <div className="flex-1 bg-[#1e1e1e] p-4 font-mono text-xs overflow-y-auto space-y-1">
              {terminalOutput.map((line, i) => (
                <div key={i} className="flex gap-2">
                    <span className="text-indigo-500 font-bold">❯</span>
                    <span className={line.includes('Flag') ? 'text-green-400 font-black' : 'text-slate-300'}>
                        {line}
                    </span>
                </div>
              ))}
              {isSubmitting && <div className="text-indigo-400 animate-pulse mt-2">Connecting to Diveon Remote Judge...</div>}
            </div>
          </div>

          {/* Status Bar */}
          <footer className={`h-6 ${vsColors.status} flex items-center justify-between px-3 text-white text-[11px]`}>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 hover:bg-white/10 px-1 cursor-pointer">
                    <GitBranch className="w-3 h-3" /> main*
                </div>
                <div className="flex items-center gap-1 hover:bg-white/10 px-1 cursor-pointer">
                    <CheckCircle2 className="w-3 h-3" /> 0 Errors
                </div>
            </div>
            <div className="flex items-center gap-4">
                <span>UTF-8</span>
                <span className="hover:bg-white/10 px-1 cursor-pointer">Spaces: 4</span>
                <span className="bg-white/10 px-2 py-0.5 font-bold uppercase">C</span>
            </div>
          </footer>

        </main>
      </div>
    </div>
  );
}