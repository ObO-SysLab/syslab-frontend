"use client";

import { useState, useEffect } from "react";
import { BrandMark } from "@/components/BrandMark";
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
  const [timeLeft, setTimeLeft] = useState(600);
  const [isTimerActive, setIsTimerActive] = useState(false);

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
        setTimeLeft(600);
        setIsTimerActive(true);
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
    if (timeLeft <= 0) {
      alert("인증 시간이 만료되었습니다. 인증 코드를 다시 발송해 주세요.");
      return;
    }

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
        setIsTimerActive(false);
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

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isTimerActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsTimerActive(false); // 0초가 되면 타이머 정지
    }

    return () => clearInterval(timer);
  }, [isTimerActive, timeLeft]);

  // [추가] 초 단위를 MM:SS 포맷으로 변환하는 함수
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-panel text-ink font-sans">

      {/* 1. 상단 헤더 (뒤로가기 포함) */}
      <header className="w-full px-8 py-6 flex items-center justify-between">
        <Link
          href="/signin"
          className="flex items-center gap-2 text-ink-muted hover:text-ink transition-colors group"
        >
          <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-bold">Back to Login</span>
        </Link>

        { /* 우측 로고 영역 (메인 페이지 링크 포함) */}
        <Link href="/" className="inline-flex items-center gap-2">
          <BrandMark size="lg" />
        </Link>
      </header>

      {/* 2. 메인 콘텐츠 */}
      <main className="flex-1 flex items-center justify-center p-4 bg-raised/30">

        <div className="w-full max-w-[450px] space-y-6">

          <div className="text-center space-y-2 mb-8">
            <div className="bg-primary w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-black/40">
              <Fingerprint className="text-white w-7 h-7" />
            </div>
            <h2 className="text-3xl font-black text-ink tracking-tight">계정 정보 찾기</h2>
            <p className="text-ink-subtle text-sm font-medium">가입 시 등록한 정보로 본인 인증을 진행해 주세요.</p>
          </div>

          <Card className="border-none shadow-2xl shadow-black/40 bg-panel rounded-3xl overflow-hidden">
            <CardContent className="p-2">

              <Tabs defaultValue="id" className="w-full" onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 bg-canvas p-1 rounded-2xl h-14">
                  <TabsTrigger value="id" className="rounded-xl font-bold data-[state=active]:bg-panel data-[state=active]:shadow-sm">
                    아이디 찾기
                  </TabsTrigger>
                  <TabsTrigger value="pw" className="rounded-xl font-bold data-[state=active]:bg-panel data-[state=active]:shadow-sm">
                    비밀번호 찾기
                  </TabsTrigger>
                </TabsList>

                {/* --- 아이디 찾기 탭 --- */}
                <TabsContent value="id" className="p-8 pt-6 space-y-6 animate-in fade-in duration-500">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-ink-subtle ml-1">이메일</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-3.5 h-4 w-4 text-ink-subtle" />
                        <Input
                          type="email"
                          value={emailForId}
                          onChange={(e) => setEmailForId(e.target.value)}
                          placeholder="diveon@gmail.com"
                          className="pl-11 bg-canvas border-none h-12 rounded-xl focus-visible:ring-1 focus-visible:ring-primary"
                        />
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={handleFindId}
                    disabled={isLoading}
                    className="w-full h-12 bg-raised border border-line-strong hover:bg-line text-ink font-bold rounded-xl shadow-lg shadow-black/40 transition-all active:scale-[0.98]"
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
                        <label className="text-xs font-black uppercase tracking-widest text-ink-subtle ml-1">이메일</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-3.5 h-4 w-4 text-ink-subtle" />
                          <Input
                            type="email"
                            value={emailForPw}
                            onChange={(e) => setEmailForPw(e.target.value)}
                            placeholder="diveon@gmail.com"
                            className="pl-11 bg-canvas border-none h-12 rounded-xl focus-visible:ring-1 focus-visible:ring-primary"
                          />
                        </div>
                      </div>
                      <Button
                        onClick={handleSendResetCode}
                        disabled={isLoading}
                        className="w-full h-12 bg-primary hover:bg-primary-hover text-primary-ink font-bold rounded-xl shadow-lg shadow-black/40 transition-all active:scale-[0.98]"
                      >
                        {isLoading ? "발송 중..." : "인증 코드 발송"}
                      </Button>
                    </div>
                  )}

                  {/* [2단계] 인증 코드 입력 화면  */}
                  {isResetMode && !isCodeVerified && (
                    <div className="space-y-6 animate-in slide-in-from-right duration-300">
                      <div className="p-4 bg-canvas rounded-2xl text-xs font-semibold text-ink-muted leading-normal border">
                        <span className="underline font-mono font-bold text-ink">{emailForPw}</span> 계정으로 비밀번호 재설정 코드를 보냈습니다.
                      </div>
                      <div className="space-y-2">
                        {/* 라벨 영역에 타이머 정보 우측 정렬 배치 */}
                        <div className="flex justify-between items-center ml-1">
                          <label className="text-xs font-black uppercase tracking-widest text-ink-subtle">인증 코드 (6자리)</label>
                          {timeLeft > 0 ? (
                            <span className="text-xs font-bold text-danger font-mono">
                              남은 시간 {formatTime(timeLeft)}
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-danger">
                              인증 시간 만료
                            </span>
                          )}
                        </div>

                        <div className="relative">
                          <Fingerprint className="absolute left-4 top-3.5 h-4 w-4 text-ink-subtle" />
                          <Input
                            type="text"
                            maxLength={6}
                            value={resetCode}
                            onChange={(e) => setResetCode(e.target.value)}
                            placeholder="인증코드"
                            // 시간 만료 시 입력 칸 비활성화 처리
                            disabled={timeLeft <= 0}
                            className="pl-11 bg-canvas border-none h-12 rounded-xl focus-visible:ring-1 focus-visible:ring-primary font-mono tracking-widest font-bold text-ink disabled:opacity-50"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsResetMode(false);
                            setIsTimerActive(false); // 탭 전환 혹은 이전으로 갈 때 타이머 정지
                          }}
                          className="h-12 px-4 rounded-xl text-ink-muted text-xs font-bold"
                        >
                          이전으로
                        </Button>
                        <Button
                          onClick={handleVerifyResetCode}
                          // [수정] 시간 만료 시 확인 버튼도 비활성화
                          disabled={isLoading || timeLeft <= 0}
                          className="flex-1 h-12 bg-raised border border-line-strong hover:bg-line text-ink font-bold rounded-xl shadow-lg transition-all active:scale-[0.98]"
                        >
                          {isLoading ? "확인 중..." : "코드 확인"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* [3단계] 비밀번호 변경 화면 */}
                  {isCodeVerified && (
                    <div className="space-y-6 animate-in zoom-in-95 duration-300">
                      <div className="p-4 bg-success/10 border border-success/20 rounded-2xl text-xs font-bold text-success leading-normal flex items-center gap-2">
                        <span>이메일 인증이 성공적으로 확인되었습니다.</span>
                      </div>

                      {/* 새로운 비밀번호 입력 */}
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-ink-subtle ml-1">새로운 비밀번호 입력</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-3.5 h-4 w-4 text-ink-subtle" />
                          <Input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="새로운 비밀번호 입력"
                            className="pl-11 bg-canvas border-none h-12 rounded-xl focus-visible:ring-1 focus-visible:ring-primary"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-ink-subtle ml-1">새로운 비밀번호 확인</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-3.5 h-4 w-4 text-ink-subtle" />
                          <Input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="비밀번호 재입력"
                            className="pl-11 bg-canvas border-none h-12 rounded-xl focus-visible:ring-1 focus-visible:ring-primary"
                          />
                        </div>
                      </div>

                      <Button
                        onClick={handleResetPassword}
                        disabled={isLoading}
                        className="w-full h-12 bg-primary hover:bg-primary-hover text-primary-ink font-bold rounded-xl shadow-lg shadow-black/40 transition-all active:scale-[0.98]"
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
            <Link href="/signup" className="text-xs font-bold text-ink-subtle hover:text-ink transition-colors underline underline-offset-4 decoration-ink">
              신규 회원가입
            </Link>
            <div className="w-[1px] h-3 bg-line self-center" />
            <Link href="/support" className="text-xs font-bold text-ink-subtle hover:text-ink transition-colors underline underline-offset-4 decoration-ink">
              고객센터 문의
            </Link>
          </div>

        </div>
      </main>

      <footer className="py-8 text-center">
        <p className="text-xs text-ink-subtle font-bold uppercase tracking-widest">
          DiveOn 계정 찾기
        </p>
      </footer>
    </div>
  );
}