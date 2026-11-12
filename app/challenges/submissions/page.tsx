"use client";
import { requestJson, requestIssue, httpIssue, isRequestCancelled, authHeaders, type RequestIssue } from "@/lib/request";
import { RequestError } from "@/components/feedback/RequestError";
import { useRemoteData } from "@/components/feedback/useRemoteData";
import { logout } from "@/lib/authSession";
import { problemApi, problemToken } from "@/lib/problemApi";
import { submissionVerdict } from "@/lib/submission-status";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ChevronLeft, CheckCircle2, XCircle, Clock, Cpu, Database, Code2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Header } from "@/components/Header";

const sourceExtensions = new Map([
  ["python", "py"], ["python3", "py"],
  ["c", "c"], ["cpp", "cpp"], ["java", "java"],
]);

function SubmissionDetailContent() {
  const searchParams = useSearchParams(); // URL 쿼리 파라미터 가져오기
  const router = useRouter();
  const [userImgUrl, setUserImgUrl] = useState("");
  // The server shows a result only to its submitter, so the submitter is the signed-in user (2026-11-10 QA #9).
  const [nickname, setNickname] = useState("");

  const submissionId = searchParams.get("id");

  // 로그인 상태
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const query = useRemoteData(submissionId, async signal => {
    const json = await requestJson(problemApi(`/api/submissions/${submissionId}/result`), {signal,headers:authHeaders()});
    if(!json?.data)throw new Error('Missing result');
    return json.data;
  });
  const isLoading=query.loading, submissionData=query.data;
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    const fetchProfileImage = async () => {
      const token = problemToken();
      if (!token) return;

      setIsLoggedIn(true);

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
          if (userInfo?.profileImgUrl) {
            setUserImgUrl(userInfo.profileImgUrl);
          }
          if (userInfo?.nickname) setNickname(userInfo.nickname);
        }
      } catch (error) {
        console.error("홈페이지 초기 데이터 로드 실패:", error);
      }
    };

    fetchProfileImage();
  }, []);

  // 코드 복사 기능
  const handleCopyCode = () => {
    if (!submissionData?.code) return;
    navigator.clipboard.writeText(submissionData.code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // 상태 배지 렌더링 함수
  const verdict = submissionVerdict(submissionData);
  const isSuccess = verdict.kind === "correct";

  // 로딩 화면 (빙글빙글 도는 UI)
  if (isLoading) return (
    <div role="status" aria-label="제출 결과 불러오는 중" className="min-h-screen flex items-center justify-center bg-canvas">
      <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
    </div>
  );

  if(query.error)return <main className="mx-auto max-w-3xl p-8"><h1 className="text-xl font-bold">제출 결과 조회</h1><RequestError issue={query.error} retry={query.retry} busy={query.loading}/></main>;

  // URL에 id가 파라미터가 아예 없을 때의 방어 화면
  if (!submissionId) return (
    <div className="min-h-screen flex items-center justify-center bg-canvas text-ink-muted font-bold">
      유효하지 않은 접근입니다. (ID가 없습니다)
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans">
      <Header
        isLoggedIn={isLoggedIn}
        userImgUrl={userImgUrl}
        activeMenu="challenge"
        onLogout={() => { if (logout()) setIsLoggedIn(false); }}
      />

      <main className="dv-shell pt-8 pb-24 space-y-6">
        {/* 뒤로 가기 및 요약 헤더 */}
        <div>
          <Button variant="ghost" onClick={() => router.back()} className="mb-4 -ml-4 text-ink-muted hover:text-ink hover:bg-raised">
            <ChevronLeft className="w-5 h-5 mr-1" /> 문제로 돌아가기
          </Button>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex items-center gap-3 bg-panel px-4 py-2 rounded-2xl border border-line shadow-sm">
              <Avatar className="h-8 w-8">
                {userImgUrl !== "" && <AvatarImage src={userImgUrl} alt="" className="object-cover" />}
                <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">
                  {nickname[0] ?? ""}
                </AvatarFallback>
              </Avatar>
              <span className="font-bold text-ink">
                {nickname || "내 제출"}
              </span>
            </div>
          </div>
        </div>

        {/* 요약 카드 */}
        <Card className="border-line shadow-sm rounded-2xl overflow-hidden bg-panel">
          <div className="flex flex-col md:flex-row">
            <div className="p-6 md:w-1/3 border-b md:border-b-0 md:border-r border-line bg-raised/50 flex flex-col justify-center items-start space-y-4">
              <div className="space-y-1 w-full">
                <p className="text-xs font-bold text-ink-subtle uppercase tracking-widest">Problem</p>
                <Link href={`/challenges/detail?id=${submissionData?.probId}`} className="text-lg font-bold text-primary hover:underline line-clamp-2">
                  문제 #{submissionData?.probId} 보러가기
                </Link>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-ink-subtle uppercase tracking-widest mb-1.5">Result</p>
                <Badge
                  variant={isSuccess ? "default" : verdict.kind === "wrong" || verdict.kind === "failed" ? "destructive" : "outline"}
                  className={`px-3 py-1 text-sm font-bold shadow-sm ${isSuccess ? "bg-primary hover:bg-primary-hover text-primary-ink" : verdict.kind === "error" ? "border-warning/30 bg-warning-soft text-warning" : verdict.kind === "pending" || verdict.kind === "unknown" ? "text-ink-muted" : ""}`}
                >
                  {isSuccess ? <CheckCircle2 className="w-4 h-4 mr-1.5" /> : verdict.kind === "pending" || verdict.kind === "unknown" ? <Clock className="w-4 h-4 mr-1.5" /> : <XCircle className="w-4 h-4 mr-1.5" />}
                  {verdict.label}
                </Badge>
                {verdict.hint && <p className="text-xs text-ink-muted">{verdict.hint}</p>}
              </div>
            </div>

            <div className="p-6 md:w-2/3 grid grid-cols-2 md:grid-cols-4 gap-6 items-center">
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-ink-subtle flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> 실행 시간</p>
                <p className="text-lg font-black text-ink font-mono">{submissionData?.runtime !== undefined ? `${submissionData.runtime} ms` : "-"}</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-ink-subtle flex items-center gap-1.5"><Database className="w-3.5 h-3.5" /> 메모리</p>
                <p className="text-lg font-black text-ink font-mono">{submissionData?.memoryUsage !== undefined ? `${submissionData.memoryUsage} MB` : "-"}</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-ink-subtle flex items-center gap-1.5"><Code2 className="w-3.5 h-3.5" /> 사용 언어</p>
                <p className="text-lg font-black text-ink font-mono">{submissionData?.language || "-"}</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-ink-subtle flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5" /> 점수</p>
                <p className="text-lg font-black text-ink font-mono">{submissionData?.score !== undefined ? `${submissionData.score} / 100` : "-"}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* 코드 뷰어 */}
        <div className="space-y-3 pt-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-lg font-black text-ink">제출한 코드</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCode}
              className={`rounded-xl text-xs font-bold transition-all ${isCopied ? "bg-success/10 text-success border-success/30" : "text-ink-muted hover:text-ink"
                }`}
            >
              {isCopied ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
              {isCopied ? "복사됨!" : "코드 복사"}
            </Button>
          </div>

          <div className="rounded-2xl overflow-hidden border border-line shadow-xl">
            <div className="bg-deep px-4 py-3 border-b border-line flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-danger/20 border border-danger/50"></div>
                <div className="w-3 h-3 rounded-full bg-warning/20 border border-warning/50"></div>
                <div className="w-3 h-3 rounded-full bg-success/20 border border-success/50"></div>
              </div>
              <span className="ml-4 text-xs font-mono font-medium text-ink-subtle">
                solution.{sourceExtensions.get(submissionData?.language) ?? "txt"}
              </span>
            </div>

            <div className="bg-deep p-6 overflow-x-auto">
              <pre className="font-mono text-sm leading-relaxed text-ink-subtle">
                <code>{submissionData?.code || "코드를 불러올 수 없습니다."}</code>
              </pre>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}


export default function SubmissionDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    }>
      <SubmissionDetailContent />
    </Suspense>
  );
}
