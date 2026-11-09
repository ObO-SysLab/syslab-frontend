"use client";
import { problemApi, problemToken } from "@/lib/problemApi";
import { requestJson, requestIssue, httpIssue, isRequestCancelled, authHeaders, type RequestIssue } from "@/lib/request";
import { RequestError } from "@/components/feedback/RequestError";
import { useRemoteData } from "@/components/feedback/useRemoteData";
import { logout } from "@/lib/authSession";

import { useCodeDraft } from "@/components/coding/useCodeDraft";
import { CodeDraftPanel } from "@/components/coding/CodeDraftPanel";
import { useState, useRef, useEffect, Suspense } from "react";
import { BrandMark } from "@/components/BrandMark";
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const probId = searchParams.get('probId');
  const contestProbId = searchParams.get('contestProblemId');
  const contestId = searchParams.get('contestId');
  const [problemTitle, setProblemTitle] = useState("문제 정보 불러오는 중...");
  const [problemVersion, setProblemVersion] = useState<string | null>(null);
  const codeDraft = useCodeDraft({ kind: 'contest', problem: probId ?? '', contest: contestId ?? '', contestProblem: contestProbId ?? '' }, problemVersion);
  const { code, language, edit: setCode, select: handleLanguageChange } = codeDraft;
  const [submitNotice, setSubmitNotice] = useState('');
  const [submitIssue, setSubmitIssue] = useState<RequestIssue | null>(null);
  const submission = useRef<AbortController | null>(null);
  useEffect(() => {
    setIsLoggedIn(!!codeDraft.account);
    setUserImgUrl('/avatar.png');
    setSubmitNotice(''); setSubmitIssue(null); setIsSubmitting(false);
    submission.current?.abort(); submission.current = null;
    return () => { submission.current?.abort(); submission.current = null; };
  }, [codeDraft.generation, codeDraft.account]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const editorRef = useRef(null);
  const [userImgUrl, setUserImgUrl] = useState("/avatar.png");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchProfileImage = async () => {
      const token = problemToken();
      if (!token) return;



      try {
        const response = await fetch(problemApi("/api/profile/show"), {
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
          if (active && userInfo?.profileImgUrl) {
            setUserImgUrl(userInfo.profileImgUrl);
          }
        }
      } catch (error) {
        console.error("홈페이지 초기 데이터 로드 실패:", error);
      }
    };

    fetchProfileImage();
    return () => { active = false; };
  }, [codeDraft.account]);

  const titleQuery = useRemoteData(probId, async signal => {
    const json = await requestJson(problemApi(`/api/problems/${probId}`), {signal, headers:authHeaders()});
    return json.data;
  });
  useEffect(() => {
    setProblemTitle(titleQuery.data?.title ?? (titleQuery.loading ? '문제 정보 불러오는 중…' : '문제 정보 조회 실패'));
    setProblemVersion(titleQuery.data?.revisionId ?? titleQuery.data?.editVersion ?? null);
  }, [titleQuery.data, titleQuery.loading]);

  // 에디터 마운트 시 설정
  function handleEditorDidMount(editor: any) {
    editorRef.current = editor;

    setTimeout(() => {
      editor.layout();
    }, 50);
  }

  // [API] 코드 제출
  const handleSubmit = async () => {
    if(submission.current)return;
    setSubmitIssue(null); setSubmitNotice('');
    if(!code.trim()){setSubmitNotice('코드를 입력해 주세요.');return;}
    const token=problemToken();
    if(!token){setSubmitIssue(httpIssue(401));return;}
    codeDraft.flush();
    const controller=new AbortController();submission.current=controller;setIsSubmitting(true);
    try{
      const json=await requestJson(problemApi(`/api/contests/${contestId}/problems/${contestProbId}/submit`),{method:'POST',signal:controller.signal,
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({ submissionType: "CODING", language, code })},{allowEmpty:true});
      if(submission.current!==controller||problemToken()!==token)return;
      router.push(`/contests/challenge/?probId=${probId}&contestProblemId=${contestProbId}&contestId=${contestId}&tab=grading`);
    }catch(error){
      if(submission.current===controller&&!isRequestCancelled(error))setSubmitIssue(requestIssue(error,true));
    }finally{if(submission.current===controller){submission.current=null;setIsSubmitting(false);}}
  };


  return (
    <div className="h-dvh min-h-[640px] bg-canvas flex flex-col w-full">
      {/* 1. 고정 헤더 (h-16 = 4rem = 64px) */}
      <header className="shrink-0 h-16 border-b bg-panel px-6 flex items-center justify-between z-50">
        <div className="flex items-center gap-8">
          <Menu className="h-6 w-6 text-ink-muted lg:hidden" />

          <Link
            href="/"
            className="mr-4" aria-label="DiveOn 홈"
          ><BrandMark /></Link>

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
              <button className="p-2 hover:bg-raised rounded-full transition-colors relative group">
                <Bell className="h-5 w-5 text-ink-muted group-hover:text-ink" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full border-2 border-panel"></span>
              </button>

              <Link href="/settings">
                <Avatar className="h-9 w-9 border border-line hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer">
                  <AvatarImage src={userImgUrl} alt="User Profile" className="object-cover" />
                  <AvatarFallback className="bg-transparent text-xs font-bold text-ink-muted rounded-full">
                    {/* 공백 상태 유지 */}
                  </AvatarFallback>
                </Avatar>
              </Link>

              <button
                aria-label="로그아웃"
                onClick={() => { if (logout()) setIsLoggedIn(false); }}
                className="p-2 hover:bg-danger/10 rounded-full text-danger transition-colors group"
              >
                <LogOut className="h-5 w-5 group-hover:scale-110 transition-transform" />
              </button>
            </>
          ) : (
            /* --- 로그아웃된 상태: 로그인 / 시작하기 버튼 --- */
            <div className="flex items-center gap-2">
              <Link href="/signin">
                <Button variant="ghost" className="text-sm font-bold text-ink-muted">Sign In</Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-raised border border-line-strong text-white text-sm font-bold rounded-full px-5 shadow-lg shadow-black/40">
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
        <div className="shrink-0 bg-panel border border-line rounded-2xl p-4 flex flex-wrap gap-3 items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-ink tracking-tight">
              {problemTitle} <span className="text-ink-subtle text-sm font-medium ml-2">코드 제출</span>
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <span className="whitespace-nowrap text-sm font-bold text-ink mr-1">언어:</span>
              <Select value={language} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-[120px] h-10 bg-canvas border-line font-mono text-sm focus:ring-primary">
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
              disabled={isSubmitting || !codeDraft.draft}
              className="bg-primary hover:bg-primary-hover text-primary-ink font-bold rounded-xl px-4 sm:px-8 h-10 shadow-md shadow-black/40 transition-all"
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

        <RequestError issue={titleQuery.error} retry={titleQuery.retry} busy={titleQuery.loading} />
        <CodeDraftPanel state={codeDraft} />
        <RequestError issue={submitIssue} checkHref={`/contests/challenge?probId=${probId}&contestProblemId=${contestProbId}&contestId=${contestId}&tab=grading`} />
        {isSubmitting && <p role="status">제출 요청을 보내는 중…</p>}
        {submitNotice && <p role="alert" className="shrink-0 text-sm text-indigo-800">{submitNotice} <Link className="underline" href="/signin">로그인</Link> · <Link className="underline" href={`/contests/challenge?probId=${probId}&contestProblemId=${contestProbId}&contestId=${contestId}&tab=grading`}>제출 내역</Link></p>}
        {/* [B] Monaco 에디터 영역 */}
        <div className="flex-1 min-h-0">
          <div className="h-full w-full rounded-2xl overflow-hidden border border-line shadow-sm bg-deep">
            <Editor
              key={codeDraft.generation}
              loading={<textarea aria-label="코드 입력 (편집기 로딩 중)" className="h-full w-full resize-none bg-[#1e1e1e] p-6 font-mono text-sm text-white outline-none" spellCheck={false} value={code} onChange={event=>setCode(event.target.value)} />}
              height="100%"
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
        ? "text-primary bg-primary/10"
        : "text-ink-muted hover:text-ink hover:bg-raised/60"
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
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    }>
      <MonacoSubmitContent />
    </Suspense>
  );
}
