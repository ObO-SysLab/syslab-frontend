"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import {
  FileText, Play, LogOut, Bell, LayoutGrid, Users, BarChart3,
  Trophy, ShoppingBag, Menu
} from "lucide-react";
import Editor from "@monaco-editor/react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function MonacoSubmitContent() {
  const CODE_SNIPPETS: Record<string, string> = {
    c: `#include <stdio.h>\n\nint main() {\n    return 0;\n}`,
    cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}`,
    python: `def solution():\n    pass\n\nif __name__ == "__main__":\n    solution()`, // python -> python
  };
  const searchParams = useSearchParams();
  const router = useRouter();
  const probId = searchParams.get('id')
  const USE_API_REQUEST = true;
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [problemTitle, setProblemTitle] = useState("문제 정보 불러오는 중...");
  const [language, setLanguage] = useState("c");
  const [code, setCode] = useState(CODE_SNIPPETS.c);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const editorRef = useRef(null);
  const [userImgUrl, setUserImgUrl] = useState("/avatar.png");

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

  useEffect(() => {
    const fetchProblemTitle = async () => {
      if (!USE_API_REQUEST) {
        setProblemTitle(`MOCK 데이터 문제 #${probId}`);
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
          // API 응답 구조(json.data.title)에 맞게 제목 세팅
          setProblemTitle(json.data.title);
        } else {
          setProblemTitle("알 수 없는 문제");
        }
      } catch (error) {
        console.error("문제 정보 로드 실패:", error);
        setProblemTitle("문제 정보를 불러오지 못했습니다.");
      }
    };

    fetchProblemTitle();
  }, [probId, USE_API_REQUEST]);

  // 에디터 마운트 시 설정
  function handleEditorDidMount(editor: any) {
    editorRef.current = editor;

    setTimeout(() => {
      editor.layout();
    }, 50);
  }

  // 언어 변경 핸들러
  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    setCode(CODE_SNIPPETS[lang]);
  };


  // [API] 코드 제출
  const handleSubmit = async () => {
    if (!code.trim()) {
      alert("코드를 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    const token = localStorage.getItem("token");

    try {
      const response = await fetch(`https://diveon.net/api/submissions/grade`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          probId: Number(probId), // 명세서의 probId (integer)
          language: language,     // 선택된 언어 (c, cpp, python 등)
          answer: code            // 작성한 소스 코드
        })
      });

      if (response.ok) {
        alert("채점 요청이 접수되었습니다.");
        const json = await response.json();
        const newId = json.data.submissionId;
        
        sessionStorage.setItem(`pending_sub_${probId}`, newId);

        router.push(`/challenges/detail?id=${probId}&tab=grading`);
      } else {
        const errorData = await response.json();
        alert(`제출 실패: ${errorData.message || "오류 발생"}`);
      }
    } catch (error) {
      console.error("제출 에러:", error);
      alert("서버 통신 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden w-full">
      {/* 1. 고정 헤더 (h-16 = 4rem = 64px) */}
      <header className="shrink-0 h-16 border-b bg-white px-6 flex items-center justify-between z-50">
        <div className="flex items-center gap-8">
          <Menu className="h-6 w-6 text-slate-500 lg:hidden" />

          <Link
            href="/"
            className="text-2xl font-black tracking-tighter text-slate-900 mr-4"
          >
            Diveon
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            <NavMenuLink href="/challenges" icon={<LayoutGrid size={18} />} label="챌린지" active />
            <NavMenuLink href="/contests" icon={<Trophy size={18} />} label="대회" />
            <NavMenuLink href="/groups" icon={<Users size={18} />} label="그룹" />
            <NavMenuLink href="/ranking" icon={<BarChart3 size={18} />} label="랭킹" />
            <NavMenuLink href="/store" icon={<ShoppingBag size={18} />} label="스토어" />
          </nav>
        </div>

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
                onClick={() => setIsLoggedIn(false)}
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

      {/* 2. 메인 워크스페이스 */}
      <main className="flex-1 flex flex-col gap-4 p-6 w-full max-w-[1400px] mx-auto min-h-0">

        {/* [A] 상단 툴바 */}
        <div className="h-16 shrink-0 bg-white border border-slate-200 rounded-2xl px-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {problemTitle} <span className="text-slate-400 text-sm font-medium ml-2">코드 제출</span>
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-bold text-slate-700 mr-1">언어:</span>
              <Select value={language} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-[120px] h-10 bg-slate-50 border-slate-200 font-mono text-sm focus:ring-indigo-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="c" className="font-mono">C</SelectItem>
                  <SelectItem value="cpp" className="font-mono">C++</SelectItem>
                  <SelectItem value="python" className="font-mono">python</SelectItem> {/* value 수정 */}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-8 h-10 shadow-md shadow-indigo-200 transition-all"
            >
              {isSubmitting ? "제출 중..." : (
                <>
                  <Play className="w-4 h-4 mr-2 fill-white" />
                  제출하기
                </>
              )}
            </Button>
          </div>
        </div>

        {/* [B] Monaco 에디터 영역 */}
        <div className="flex-1 min-h-0">
          <div className="h-full w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-[#1e1e1e]">
            <Editor
              height="calc(100vh - 240px)"
              width="100%"
              language={language}
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || "")}
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: false },
                fontSize: 15,
                lineHeight: 24,
                fontFamily: "Fira Code, Menlo, Monaco, 'Courier New', monospace",
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 24, bottom: 24 },
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

// 네비게이션 보조 컴포넌트
function NavMenuLink({
  href,
  icon,
  label,
  active = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${active
        ? "text-indigo-600 bg-indigo-50"
        : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
        }`}
    >
      <span>{icon}</span>
      {label}
    </Link>
  );
}

export default function MonacoSubmitPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    }>
      <MonacoSubmitContent />
    </Suspense>
  );
}