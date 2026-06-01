"use client";

import { useState } from "react"; //
import { useRouter } from "next/navigation"; // 리다이렉트용
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react"; // 로딩 스피너

export default function LoginPage() {
  const router = useRouter();

  // 입력 데이터 및 상태 관리
  const [formData, setFormData] = useState({ id: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // 입력값 변경 핸들러
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  // 3. [API] 로그인 요청
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("https://diveon.net/api/auth/login", { // api url
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          loginId: formData.id, 
          password: formData.password,
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log("로그인 성공:", result);
        localStorage.setItem("token", result.data.accessToken); 
        window.location.href = "/";
      } else {
        setError(result.message || "아이디 또는 비밀번호가 일치하지 않습니다.");
      }
    } catch (error) {
      setError("서버와 통신 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

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
            <CardContent className="pt-12 pb-10 px-10 space-y-8">
              
              {/* Form 태그로 감싸면 엔터키 로그인이 가능해집니다 */}
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1" htmlFor="id">
                      ID
                    </label>
                    <Input 
                      id="id" 
                      type="text" 
                      value={formData.id}
                      onChange={handleChange}
                      placeholder="아이디를 입력하세요" 
                      required
                      className="bg-slate-50 border-none focus-visible:ring-1 focus-visible:ring-slate-900 h-12 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1" htmlFor="password">
                      Password
                    </label>
                    <Input 
                      id="password" 
                      type="password" 
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••" 
                      required
                      className="bg-slate-50 border-none focus-visible:ring-1 focus-visible:ring-slate-900 h-12 rounded-xl"
                    />
                  </div>
                </div>

                {/* 에러 메시지 표시 */}
                {error && <p className="text-xs text-red-500 font-medium ml-1">{error}</p>}

                <Button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold text-base rounded-xl shadow-lg shadow-slate-200 transition-all active:scale-[0.98]"
                >
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign In"}
                </Button>
              </form>

              <div className="flex justify-between items-center pt-2">
                <Link href="/find-account" className="text-xs font-bold text-slate-400 underline underline-offset-4 decoration-slate-200 hover:text-slate-900 hover:decoration-slate-900 transition-all">
                  아이디/비밀번호 찾기
                </Link>
                <Link href="/signup" className="text-xs font-bold text-indigo-600 underline underline-offset-4 decoration-indigo-100 hover:text-indigo-800 hover:decoration-indigo-800 transition-all">
                  회원가입
                </Link>
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