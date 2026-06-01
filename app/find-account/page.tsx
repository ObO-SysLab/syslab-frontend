"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Lock, Fingerprint, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function FindAccountPage() {
  // [상태] 탭
  const [activeTab, setActiveTab] = useState("id");
  const [isLoading, setIsLoading] = useState(false);
  const [emailForId, setEmailForId] = useState("");
  const [emailForPw, setEmailForPw] = useState("");
  const [isResetMode, setIsResetMode] = useState(false);
  const [isCodeVerified, setIsCodeVerified] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetCode, setResetCode] = useState("");
  const router = useRouter();

  // [API] 아이디 찾기 요청
  const handleFindId = async () => {
    if (!emailForId.trim()) {
      alert("이메일을 입력해 주세요.");
      return;
    }
    setIsLoading(true);

    try {
      const res = await fetch("https://diveon.net/api/auth/email/find-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailForId.trim() })
      });

      if (res.ok) {
        alert("가입하신 이메일로 아이디가 성공적으로 발송되었습니다.");
        setEmailForId("");
      } else if (res.status === 404) {
        alert("가입되지 않은 이메일 주소입니다.");
      } else {
        alert("조회 중 오류가 발생했습니다. 다시 시도해 주세요.");
      }
    } catch (e) {
      console.error(e);
      alert("서버 통신 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // [API] 비밀번호 재설정 코드 발송
  const handleSendResetCode = async () => {
    if (!emailForPw.trim()) {
      alert("이메일을 입력해 주세요.");
      return;
    }
    setIsLoading(true);

    try {
      const res = await fetch("https://diveon.net/api/auth/email/send-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailForPw.trim() })
      });

      if (res.ok) {
        alert("비밀번호 재설정 코드가 발송되었습니다. 이메일을 확인 후 새 비밀번호를 입력해 주세요.");
        setIsResetMode(true);
      } else if (res.status === 404) {
        alert("가입되지 않은 이메일 주소입니다.");
      } else {
        alert("인증 코드 발송에 실패했습니다.");
      }
    } catch (e) {
      console.error(e);
      alert("네트워크 장애가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyResetCode = async () => {
    if (!resetCode.trim()) {
      alert("이메일로 발송된 인증 코드를 입력해 주세요.");
      return;
    }
    setIsLoading(true);

    try {
      const res = await fetch("https://diveon.net/api/auth/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailForPw.trim(),
          code: resetCode.trim()
        })
      });

      if (res.ok) {
        alert("이메일 인증이 완료되었습니다! 이제 새 비밀번호를 설정할 수 있습니다.");
        setIsCodeVerified(true);
      } else if (res.status === 400) {
        alert("인증 코드가 일치하지 않거나 만료되었습니다. 다시 확인해 주세요.");
      } else {
        alert("인증 확인 중 서버 오류가 발생했습니다.");
      }
    } catch (e) {
      console.error(e);
      alert("네트워크 장애가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // [API] 비밀번호 최종 재설정
  const handleResetPassword = async () => {
    if (!resetCode.trim()) {
      alert("이메일로 발송된 인증 코드를 입력해 주세요.");
      return;
    }
    if (!newPassword.trim()) {
      alert("새로운 비밀번호를 입력해 주세요.");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("입력하신 두 비밀번호가 일치하지 않습니다. 다시 확인해 주세요.");
      return;
    }
    setIsLoading(true);

    try {
      const res = await fetch("https://diveon.net/api/auth/email/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailForPw.trim(),
          newPassword: newPassword.trim()
        })
      });

      if (res.ok) {
        alert("비밀번호가 성공적으로 변경되었습니다! 변경된 비밀번호로 로그인해 주세요.");
        router.push("/signin");
      } else {
        alert("비밀번호 재설정에 실패했습니다. 인증 코드 또는 비밀번호 규격을 확인해 주세요.");
      }
    } catch (e) {
      console.error(e);
      alert("비밀번호 변경 처리 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 font-sans">

      {/* 1. 상단 헤더 (뒤로가기 포함) */}
      <header className="w-full px-8 py-6 flex items-center justify-between">
        <Link
          href="/signin"
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors group"
        >
          <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-bold">Back to Login</span>
        </Link>

        { /* 우측 로고 영역 (메인 페이지 링크 포함) */}
        <Link href="/" className="inline-flex items-center gap-2">
          <span className="text-3xl font-black tracking-tighter text-slate-900">Diveon</span>
        </Link>
      </header>

      {/* 2. 메인 콘텐츠 */}
      <main className="flex-1 flex items-center justify-center p-4 bg-slate-50/30">

        <div className="w-full max-w-[450px] space-y-6">

          <div className="text-center space-y-2 mb-8">
            <div className="bg-indigo-600 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-100">
              <Fingerprint className="text-white w-7 h-7" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">계정 정보 찾기</h2>
            <p className="text-slate-400 text-sm font-medium">가입 시 등록한 정보로 본인 인증을 진행해 주세요.</p>
          </div>

          <Card className="border-none shadow-2xl shadow-slate-200/50 bg-white rounded-3xl overflow-hidden">
            <CardContent className="p-2">

              <Tabs defaultValue="id" className="w-full" onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 bg-slate-50 p-1 rounded-2xl h-14">
                  <TabsTrigger value="id" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    아이디 찾기
                  </TabsTrigger>
                  <TabsTrigger value="pw" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    비밀번호 찾기
                  </TabsTrigger>
                </TabsList>

                {/* --- 아이디 찾기 탭 --- */}
                <TabsContent value="id" className="p-8 pt-6 space-y-6 animate-in fade-in duration-500">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">이메일</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                        <Input
                          type="email"
                          value={emailForId}
                          onChange={(e) => setEmailForId(e.target.value)}
                          placeholder="diveon@gmail.com"
                          className="pl-11 bg-slate-50 border-none h-12 rounded-xl focus-visible:ring-1 focus-visible:ring-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={handleFindId}
                    disabled={isLoading}
                    className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg shadow-slate-100 transition-all active:scale-[0.98]"
                  >
                    {isLoading ? "조회 중..." : "아이디 찾기"}
                  </Button>
                </TabsContent>

                {/* --- 비밀번호 재설정 탭 --- */}
                <TabsContent value="pw" className="p-8 pt-6 space-y-6 animate-in fade-in duration-500">

                  {/* [1단계] 이메일 입력 화면 (코드 발송 전) */}
                  {!isResetMode && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">이메일</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                          <Input
                            type="email"
                            value={emailForPw}
                            onChange={(e) => setEmailForPw(e.target.value)}
                            placeholder="diveon@gmail.com"
                            className="pl-11 bg-slate-50 border-none h-12 rounded-xl focus-visible:ring-1 focus-visible:ring-slate-900"
                          />
                        </div>
                      </div>
                      <Button
                        onClick={handleSendResetCode}
                        disabled={isLoading}
                        className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 transition-all active:scale-[0.98]"
                      >
                        {isLoading ? "발송 중..." : "인증 코드 발송"}
                      </Button>
                    </div>
                  )}

                  {/* [2단계] 인증 코드 입력 화면 (서버 실제 연동 버전) */}
                  {isResetMode && !isCodeVerified && (
                    <div className="space-y-6 animate-in slide-in-from-right duration-300">
                      <div className="p-4 bg-slate-50 rounded-2xl text-xs font-semibold text-slate-600 leading-normal border">
                        <span className="underline font-mono font-bold text-slate-900">{emailForPw}</span> 계정으로 비밀번호 재설정 코드를 보냈습니다.
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">인증 코드 (6자리)</label>
                        <div className="relative">
                          <Fingerprint className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                          <Input
                            type="text"
                            maxLength={6}
                            value={resetCode}
                            onChange={(e) => setResetCode(e.target.value)}
                            placeholder="123456"
                            className="pl-11 bg-slate-50 border-none h-12 rounded-xl focus-visible:ring-1 focus-visible:ring-slate-900 font-mono tracking-widest font-bold text-slate-800"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsResetMode(false)}
                          className="h-12 px-4 rounded-xl text-slate-500 text-xs font-bold"
                        >
                          이전으로
                        </Button>
                        <Button
                          onClick={handleVerifyResetCode}
                          disabled={isLoading}
                          className="flex-1 h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.98]"
                        >
                          {isLoading ? "확인 중..." : "코드 확인"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* [3단계] 비밀번호 변경 화면 (비밀번호 확인 필드 추가 버전) */}
                  {isCodeVerified && (
                    <div className="space-y-6 animate-in zoom-in-95 duration-300">
                      <div className="p-4 bg-green-50 border border-green-100 rounded-2xl text-xs font-bold text-green-800 leading-normal flex items-center gap-2">
                        <span>이메일 인증이 성공적으로 확인되었습니다.</span>
                      </div>

                      {/* 새로운 비밀번호 입력 */}
                      <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">새로운 비밀번호 입력</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                          <Input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="새로운 비밀번호 입력"
                            className="pl-11 bg-slate-50 border-none h-12 rounded-xl focus-visible:ring-1 focus-visible:ring-slate-900"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">새로운 비밀번호 확인</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                          <Input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="비밀번호 재입력"
                            className="pl-11 bg-slate-50 border-none h-12 rounded-xl focus-visible:ring-1 focus-visible:ring-slate-900"
                          />
                        </div>
                      </div>

                      <Button
                        onClick={handleResetPassword}
                        disabled={isLoading}
                        className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 transition-all active:scale-[0.98]"
                      >
                        {isLoading ? "변경 중..." : "비밀번호 최종 변경"}
                      </Button>
                    </div>
                  )}

                </TabsContent>
              </Tabs>

            </CardContent>
          </Card>

          {/* 하단 링크 */}
          <div className="flex justify-center gap-6 pt-2">
            <Link href="/signup" className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors underline underline-offset-4 decoration-slate-200">
              신규 회원가입
            </Link>
            <div className="w-[1px] h-3 bg-slate-200 self-center" />
            <Link href="/support" className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors underline underline-offset-4 decoration-slate-200">
              고객센터 문의
            </Link>
          </div>

        </div>
      </main>

      <footer className="py-8 text-center">
        <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">
          Diveon Identity Management System
        </p>
      </footer>
    </div>
  );
}