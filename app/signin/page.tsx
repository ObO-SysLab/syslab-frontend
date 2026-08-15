"use client";

import { useState, Suspense } from "react"; 
import { useRouter } from "next/navigation"; 
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react"; 
import { useSearchParams } from "next/navigation";
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const nextTarget = searchParams.get("next");

  // [API] Google Oauth2 팝업 로그인 세팅
  const handleGooglePopupLogin = useGoogleLogin({
    flow: 'auth-code',
    onSuccess: async (codeResponse) => {
      setIsLoading(true);
      try {
        // 구글이 준 인가 코드를 백엔드 API로 POST 토스
        const res = await fetch("https://diveon.net/api/auth/google/login", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            'X-Requested-With': 'XmlHttpRequest'
           },
          body: JSON.stringify({
            code: codeResponse.code,
            next: nextTarget
          })
        });

        const result = await res.json();

        if (res.ok) {
          const token = result?.data?.accessToken || result?.data?.access_token;
          const nickname = result?.data?.userInfo?.nickname;
          const userImg = result?.data?.userInfo?.profileImgUrl;

          if (!token) {
            alert("백엔드로부터 유효한 토큰을 받지 못했습니다. 구조를 확인해 주세요.");
            return;
          }
          
          // 로컬스토리지 정적 세션 고정
          localStorage.setItem("token", token);
          if (nickname) localStorage.setItem("nickname", nickname);
          if (userImg) localStorage.setItem("userImgUrl", userImg);
          
          // 전체 URL 수신 시, 안전하게 상대 경로만 추출해 내는 가드 코드입니다.
          let safeRedirectPath = "/";
          if (nextTarget) {
            try {
              // nextTarget이 풀 주소(https://...)인 경우 상대 경로만 추출
              if (nextTarget.startsWith("http")) {
                const urlObj = new URL(nextTarget);
                safeRedirectPath = urlObj.pathname + urlObj.search;
              } else {
                safeRedirectPath = nextTarget;
              }
            } catch (e) {
              safeRedirectPath = nextTarget;
            }
          }

          // router.replace를 사용하면 Next.js 인프라가 쿼리스트링(?code=...)을 유실하지 않고 
          // 안전하게 목적지(초대 페이지)로 배달
          router.replace(safeRedirectPath);
          setTimeout(() => {
            router.refresh();
          }, 100);

        } else {
          // 백엔드에서 뱉은 실제 에러 메시지를 팝업으로 띄워서 디버깅합니다.
          alert(`서버 인증 실패: ${result.message || "상태 코드 " + res.status}`);
        }
      } catch (error) {
        console.error("인증 실패 상세 로그:", error);
        alert("구글 로그인 인증 에러가 발생했습니다. 콘솔 창(F12)을 확인해 주세요.");
      } finally {
        setIsLoading(false);
      }
    },
    onError: () => alert("구글 팝업 실행 실패")
  });

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 font-sans">
      <header className="w-full px-8 py-6">
        <Link href="/" className="inline-flex items-center gap-2">
          <span className="text-3xl font-black tracking-tighter text-slate-900">Diveon</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 bg-slate-50/30">
        <div className="w-full max-w-[420px] space-y-4">
          <Card className="border-none shadow-2xl shadow-slate-200/50 bg-white rounded-3xl overflow-hidden">
            <CardContent className="pt-12 pb-12 px-10 space-y-8 text-center">
              {/* 소셜 로그인 안내 헤딩 */}
              <div className="space-y-2">
                <h2 className="text-xl font-black tracking-tight text-slate-900">Diveon 시작하기</h2>
                <p className="text-xs text-slate-400 font-medium">구글 계정 연동을 통해 운영체제 바다 탐사를 시작합니다.</p>
              </div>

              {/* 단독 구글 로그인 버튼 배치 */}
              <div className="pt-2">
                <Button
                  type="button"
                  onClick={() => handleGooglePopupLogin()}
                  disabled={isLoading}
                  className="w-full h-12 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-base rounded-xl shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                  ) : (
                    <>
                      {/* 구글 로고 대용 이모지 */}
                      <span className="text-lg">🌐</span>
                      <span>구글 계정으로 계속하기</span>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-[10px] text-slate-300 font-medium uppercase tracking-[0.2em]">
            Secured by Diveon Protection System
          </p>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense 
      key="secure-signin-suspense"
      fallback={
        <div key="secure-signin-loading" className="min-h-screen flex items-center justify-center bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      }
    >
      {/* clientId에 환경변수 대신 전달받은 구글 ID 문자열을 직접 주입했습니다. */}
      <GoogleOAuthProvider clientId="556818462420-piu9374s4b65qj329f5l5h6m344j2l26.apps.googleusercontent.com">
        <LoginContent />
      </GoogleOAuthProvider>
    </Suspense>
  );
}