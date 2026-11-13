"use client";

import { useState, Suspense } from "react"; 
import { BrandMark } from "@/components/BrandMark";
import { useRouter } from "next/navigation"; 
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react"; 
import { useSearchParams } from "next/navigation";
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import { safeReturnPath } from "@/lib/request";
import { problemApi } from "@/lib/problemApi";

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
        const res = await fetch(problemApi("/api/auth/google/login"), {
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
          
          const safeRedirectPath = safeReturnPath(nextTarget);

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
    <div className="min-h-screen flex flex-col bg-panel text-ink font-sans">
      <header className="w-full px-8 py-6">
        <Link href="/" className="inline-flex items-center gap-2">
          <BrandMark size="lg" />
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 bg-raised/30">
        <div className="w-full max-w-[420px] space-y-4">
          <Card className="border-none shadow-2xl shadow-black/40 bg-panel rounded-3xl overflow-hidden">
            <CardContent className="pt-12 pb-12 px-10 space-y-8 text-center">
              {/* 소셜 로그인 안내 헤딩 */}
              <div className="space-y-2">
                <h2 className="text-xl font-black tracking-tight text-ink">DiveOn 시작하기</h2>
                <p className="text-xs text-ink-subtle font-medium">구글 계정으로 운영체제 바다 탐사를 시작합니다.</p>
              </div>

              {/* 단독 구글 로그인 버튼 배치 */}
              <div className="pt-2">
                <Button
                  type="button"
                  onClick={() => handleGooglePopupLogin()}
                  disabled={isLoading}
                  className="w-full h-12 bg-panel border border-line hover:bg-raised/60 text-ink font-bold text-base rounded-xl shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-ink-subtle" />
                  ) : (
                    <>
                      <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" /><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" /><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" /><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" /></svg>
                      <span>구글 계정으로 계속하기</span>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-ink-subtle font-medium uppercase tracking-[0.2em]">
            Secured by DiveOn
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
        <div key="secure-signin-loading" className="min-h-screen flex items-center justify-center bg-panel">
          <Loader2 className="h-8 w-8 animate-spin text-ink-subtle" />
        </div>
      }
    >
      <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "556818462420-piu9374s4b65qj329f5l5h6m344j2l26.apps.googleusercontent.com"}>
        <LoginContent />
      </GoogleOAuthProvider>
    </Suspense>
  );
}
