"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ShieldCheck, XCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function GroupInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  const [status, setStatus] = useState<"loading" | "success" | "already" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [groupInfo, setGroupInfo] = useState<{ id: number; title: string } | null>(null);

  useEffect(() => {
    // 1. 초대 코드가 주소창(?code=...)에 없는 경우 예외 차단
    if (!code) {
      setStatus("error");
      setErrorMessage("초대 코드가 누락되었습니다. 올바른 초대 링크로 접속해 주세요.");
      return;
    }

    const joinGroupViaInviteCode = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        alert("그룹 초대 링크를 이용하시려면 로그인이 필요합니다.");

        // window.location.href 풀 주소 대신, 상대 경로와 쿼리스트링(?code=...)을 안전하게 추출합니다.
        const currentRelativePath = window.location.pathname + window.location.search;

        // 인코딩 꼬임 방지를 위해 정제된 주소만 파라미터로 넘깁니다.
        router.push(`/signin?next=${encodeURIComponent(currentRelativePath)}`);
        return;
      }

      try {
        // 백엔드 명세 규격: POST /api/groups/join?code={invitationCode}
        const response = await fetch(`https://diveon.net/api/groups/join?code=${encodeURIComponent(code)}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          }
        });

        const result = await response.json();

        // [STATUS 200 OK] 가입 처리 성공 (신규 or 기존 멤버)
        if (response.ok && result.status === 200) {
          setGroupInfo({
            id: result.data.groupId,
            title: result.data.groupTitle
          });

          // newStatus: "member" (신규가입) | "already_member" (기존멤버)
          if (result.data.newStatus === "member") {
            setStatus("success");
          } else if (result.data.newStatus === "already_member") {
            setStatus("already");
          } else {
            setStatus("success");
          }

          // 1.5초 후 가입된 그룹 상세 페이지로 이동
          setTimeout(() => {
            router.push(`/groups/detail?id=${result.data.groupId}`);
          }, 1500);

        } else {
          // [예외 Status Code별 정밀 대응]
          setStatus("error");

          if (response.status === 401) {
            // 토큰 만료 또는 유효하지 않은 경우 -> 토큰 비우고 재로그인 유도
            localStorage.removeItem("token");
            alert("로그인 세션이 만료되었습니다. 다시 로그인 후 시도해 주세요.");
            const redirectTarget = `/groups/invite?code=${encodeURIComponent(code)}`;
            router.push(`/signin?next=${encodeURIComponent(redirectTarget)}`);
          } else if (response.status === 404) {
            setErrorMessage("존재하지 않거나 잘못된 초대 코드입니다. (404)");
          } else if (response.status === 409) {
            setErrorMessage("그룹 정원이 초과되어 더 이상 가입할 수 없습니다. (409)");
          } else if (response.status === 410) {
            setErrorMessage("만료된 초대 링크입니다. 그룹장에게 재발급을 요청하세요. (410)");
          } else {
            setErrorMessage(result.message || "초대 가입 중 에러가 발생했습니다.");
          }
        }
      } catch (error) {
        console.error("초대 가입 통신 장애:", error);
        setStatus("error");
        setErrorMessage("서버와 통신 중 장애가 발생했습니다.");
      }
    };

    joinGroupViaInviteCode();
  }, [code, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <Card className="w-full max-w-md border-none shadow-2xl shadow-slate-200 bg-white rounded-3xl overflow-hidden">
        <CardContent className="py-12 px-10 text-center space-y-6">

          {status === "loading" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mx-auto" />
              <div className="space-y-1">
                <h2 className="text-xl font-black tracking-tight text-slate-900">보안 통로 확인 중</h2>
                <p className="text-xs text-slate-400 font-medium">비공개 그룹 초대장을 검증하고 있습니다.</p>
              </div>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-4 animate-in zoom-in-95 duration-300">
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                <ShieldCheck className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Join Completed</p>
                <h2 className="text-xl font-black tracking-tight text-slate-900">
                  <span className="text-indigo-600">[{groupInfo?.title}]</span><br />그룹 참여 완료!
                </h2>
                <p className="text-xs text-slate-400 font-medium pt-1">잠시 후 그룹 메인으로 이동합니다...</p>
              </div>
            </div>
          )}

          {status === "already" && (
            <div className="space-y-4 animate-in zoom-in-95 duration-300">
              <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto border border-indigo-200">
                <Users className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider">Already a Member</p>
                <h2 className="text-xl font-black tracking-tight text-slate-900">
                  이미 가입된 대원입니다.
                </h2>
                <p className="text-xs text-slate-400 font-medium pt-1">해당 그룹 메인으로 즉시 이동합니다...</p>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4 animate-in duration-300">
              <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto border border-rose-200">
                <XCircle className="h-6 w-6 text-rose-600" />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-rose-600 font-bold uppercase tracking-wider">Access Denied</p>
                <h2 className="text-xl font-black tracking-tight text-slate-900">초대 가입 실패</h2>
                <p className="text-xs text-slate-500 font-medium pt-1 leading-relaxed max-w-xs mx-auto">
                  {errorMessage}
                </p>
              </div>
              <div className="pt-2">
                <Button
                  onClick={() => router.push("/groups")}
                  className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl"
                >
                  그룹 목록으로 돌아가기
                </Button>
              </div>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}

// Next.js 정적 빌드 시 useSearchParams를 안전하게 사용하려면 Suspense 감싸기가 필수
export default function GroupInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    }>
      <GroupInviteContent />
    </Suspense>
  );
}