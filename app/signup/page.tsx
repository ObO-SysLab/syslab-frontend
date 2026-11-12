"use client";

import { useState, useEffect } from "react";
import { BrandMark } from "@/components/BrandMark";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck, UserPlus, Mail, Lock, User,
  ArrowRight, Shield, Hash, Briefcase,
  Cake, Check, X, Search, Loader2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function SignUpPage() {
  const router = useRouter();

  // 전송할 데이터 상태 모델 
  const [formData, setFormData] = useState({
    id: "",
    password: "",
    nickname: "",
    email: "",
    belong: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const passwordMismatch = passwordConfirm.length > 0 && passwordConfirm !== formData.password;

  // API 및 검증 상태 관리 그룹
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isIdChecked, setIsIdChecked] = useState(false);
  const [isNicknameChecked, setIsNicknameChecked] = useState(false);
  const [emailCode, setEmailCode] = useState(""); // 6자리
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600);
  const [isTimerActive, setIsTimerActive] = useState(false);

  // 입력 핸들러
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));

    if (id === "id") setIsIdChecked(false);
    if (id === "nickname") setIsNicknameChecked(false);
  };


  // [API] 아이디 중복 확인
  const handleCheckId = async () => {
    if (!formData.id.trim()) {
      alert("아이디를 입력해주세요.");
      return;
    }

    try {
      const res = await fetch(`https://diveon.net/api/auth/check-loginId?loginId=${encodeURIComponent(formData.id.trim())}`, {
        method: "GET"
      });

      if (res.ok) {
        const json = await res.json();
        const result = json?.data;

        if (result === true) {
          alert("사용 가능한 아이디입니다.");
          setIsIdChecked(true);
        } else {
          alert("이미 사용 중인 아이디입니다.");
          setIsIdChecked(false);
        }
      } else {
        alert("서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      }
    } catch (e) {
      console.error(e);
      alert("아이디 중복 검사 중 네트워크 장애가 발생했습니다.");
    }
  };

  // [API] 닉네임 중복 확인
  const handleCheckNickname = async () => {
    if (!formData.nickname.trim()) {
      alert("닉네임을 입력해주세요.");
      return;
    }

    try {
      const res = await fetch(`https://diveon.net/api/auth/check-nickname?nickname=${encodeURIComponent(formData.nickname.trim())}`, {
        method: "GET"
      });

      if (res.ok) {
        const json = await res.json();
        const result = json?.data;

        if (result === true) {
          alert("사용 가능한 닉네임입니다.");
          setIsNicknameChecked(true);
        } else {
          alert("이미 사용 중인 닉네임입니다.");
          setIsNicknameChecked(false);
        }
      } else {
        alert("서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      }
    } catch (e) {
      console.error(e);
      alert("닉네임 중복 검사 중 네트워크 장애가 발생했습니다.");
    }
  };

  /* [API] 이메일 인증코드 발송 */
  const handleSendEmailCode = async () => {
    if (!formData.email.trim()) {
      alert("이메일 주소를 입력해주세요.");
      return;
    }

    try {
      const res = await fetch("https://diveon.net/api/auth/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email.trim() })
      });

      if (res.ok) {
        alert("인증 코드가 이메일로 발송되었습니다.");
        setIsEmailSent(true);
        setTimeLeft(600);
        setIsTimerActive(true);
      } else if (res.status === 409) {
        alert("이미 가입된 이메일입니다. 다른 이메일을 사용해주세요.");
      } else {
        alert("인증 코드 발송에 실패했습니다. 다시 시도해주세요.");
      }
    } catch (e) {
      console.error(e);
      alert("이메일 전송 중 네트워크 장애가 발생했습니다.");
    }
  };

  /* [API] 이메일 인증코드 검증 */
  const handleVerifyEmailCode = async () => {
    if (timeLeft <= 0) {
      alert("인증 시간이 만료되었습니다. 인증 코드를 다시 발송해 주세요.");
      return;
    }

    if (!emailCode.trim()) {
      alert("인증 코드를 입력해주세요.");
      return;
    }

    try {
      const res = await fetch("https://diveon.net/api/auth/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email.trim(),
          code: emailCode.trim()
        })
      });

      if (res.ok) {
        alert("이메일 인증이 완료되었습니다!");
        setIsEmailVerified(true);
        setIsTimerActive(false);
      } else if (res.status === 400) {
        alert("인증 코드가 일치하지 않거나 만료되었습니다. 다시 확인해주세요.");
      } else {
        alert("인증 확인 중 서버 오류가 발생했습니다.");
      }
    } catch (e) {
      console.error(e);
      alert("인증 검증 중 네트워크 장애가 발생했습니다.");
    }
  };

  // [API] 회원가입 요청
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    // 이메일 인증 & 중복 검사 미통과 시 가입 진행 방어
    if (!isEmailVerified) {
      alert("이메일 인증을 완료해주세요.");
      return;
    }
    if (!isIdChecked) {
      alert("아이디 중복 확인을 먼저 완료해주세요.");
      return;
    }
    if (!isNicknameChecked) {
      alert("닉네임 중복 확인을 먼저 완료해주세요.");
      return;
    }
    if (formData.password !== passwordConfirm) {
      alert("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("https://diveon.net/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          loginId: formData.id,
          password: formData.password,
          nickname: formData.nickname,
          belong: formData.belong,
          interest: interests
        }),
      });

      if (response.ok) {
        alert("회원가입 성공!");
        router.push("/signin");
      } else {
        alert("가입 실패: 데이터를 확인해주세요.");
      }
    } catch (error) {
      console.error("통신 에러:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmail = () => {
    alert("이메일 인증이 완료되었습니다.");
    setIsEmailVerified(true);
  };

  const addTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim() !== "") {
      e.preventDefault();
      if (!interests.includes(tagInput.trim())) {
        setInterests([...interests, tagInput.trim()]);
      }
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setInterests(interests.filter(tag => tag !== tagToRemove));
  };

  // 1초마다 남은 시간을 감소시키는 타이머 useEffect
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
    <div className="min-h-screen bg-canvas flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">

      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="bg-raised border border-line-strong text-ink p-1.5 rounded-lg shadow-lg">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <BrandMark size="lg" />
        </Link>
        <p className="mt-2 text-sm text-ink-muted font-medium">
          운영체제의 깊은 바다를 함께 탐험해봐요.
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-[550px]">
        <Card className="border-none shadow-2xl shadow-black/40 rounded-[2.5rem] overflow-hidden bg-panel">
          <CardHeader className="pt-8 sm:pt-10 pb-6 px-6 sm:px-10 border-b border-line bg-panel">
            <CardTitle className="text-2xl font-black flex items-center gap-2 text-ink">
              <UserPlus className="w-6 h-6 text-primary" /> 계정 생성
            </CardTitle>
            <CardDescription className="text-ink-subtle font-medium">모든 항목은 필수 입력 사항입니다.</CardDescription>
          </CardHeader>

          <form onSubmit={handleSignUp}>
            <CardContent className="p-6 sm:p-10 space-y-10">

              <section className="space-y-6">
                <div className="flex items-center gap-2 text-primary">
                  <ShieldCheck size={16} />
                  <span className="text-sm font-bold">계정 정보</span>
                </div>

                <div className="grid gap-3">
                  {/* 이메일 구역 */}
                  <div className="grid gap-2">
                    <Label className="text-xs font-bold text-ink-muted ml-1">이메일 인증</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Mail className="absolute left-4 top-3.5 h-4 w-4 text-ink-subtle" />
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          disabled={isEmailVerified}
                          required
                          placeholder="example@dankook.ac.kr"
                          className="pl-11 h-12 rounded-xl border-line bg-raised/50 disabled:opacity-60"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={handleSendEmailCode}
                        disabled={isEmailVerified}
                        variant="outline"
                        className={`h-12 px-5 rounded-xl font-bold text-sm transition-all ${isEmailVerified ? "bg-success/10 text-success border-success/30" : "border-line-strong text-ink hover:bg-raised"}`}
                      >
                        {isEmailVerified ? "인증 완료" : isEmailSent ? "코드 재발송" : "인증하기"}
                      </Button>
                    </div>
                  </div>

                  { /* 인증코드 입력 */}
                  {isEmailSent && !isEmailVerified && (
                    <div className="space-y-2 animate-in slide-in-from-top-2 duration-300 w-full">
                      <div className="flex justify-between items-center px-1">
                        <Label className="text-xs font-bold text-ink-muted">인증 코드</Label>
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

                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <ShieldCheck className="absolute left-4 top-3.5 h-4 w-4 text-ink-subtle" />
                          <Input
                            type="text"
                            maxLength={6}
                            value={emailCode}
                            onChange={(e) => setEmailCode(e.target.value)}
                            placeholder="인증코드 6자리 입력"
                            disabled={timeLeft <= 0}
                            className="pl-11 h-12 rounded-xl border-primary/20 bg-primary/6 font-mono tracking-widest text-sm font-bold text-ink disabled:opacity-50"
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={handleVerifyEmailCode}
                          disabled={timeLeft <= 0}
                          className="h-12 px-6 rounded-xl bg-raised border border-line-strong text-ink font-bold text-sm hover:bg-line shrink-0 disabled:opacity-50"
                        >
                          코드 확인
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* 아이디 구역 */}
                  <div className="grid gap-2">
                    <Label className="text-xs font-bold text-ink-muted ml-1">아이디</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Hash className="absolute left-4 top-3.5 h-4 w-4 text-ink-subtle" />
                        <Input
                          id="id"
                          value={formData.id}
                          onChange={handleInputChange}
                          required
                          placeholder="아이디"
                          className="pl-11 h-12 rounded-xl border-line bg-raised/50"
                        />
                      </div>
                      <Button
                        type="button"
                        variant={isIdChecked ? "secondary" : "outline"}
                        onClick={handleCheckId}
                        className={`h-12 px-5 rounded-xl border-line font-bold text-sm transition-all ${isIdChecked ? "bg-success/10 text-success border-success/30" : "hover:bg-raised/60"}`}
                      >
                        {isIdChecked ? "확인 완료" : "중복 확인"}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="text-xs font-bold text-ink-muted ml-1">비밀번호</Label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-3.5 h-4 w-4 text-ink-subtle" />
                        <Input
                          id="password"
                          type="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          required
                          placeholder="••••••••"
                          className="pl-11 h-12 rounded-xl border-line bg-raised/50"
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="passwordConfirm" className="text-xs font-bold text-ink-muted ml-1">비밀번호 확인</Label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-3.5 h-4 w-4 text-ink-subtle" />
                        <Input
                          id="passwordConfirm"
                          type="password"
                          value={passwordConfirm}
                          onChange={(e) => setPasswordConfirm(e.target.value)}
                          required
                          placeholder="••••••••"
                          aria-invalid={passwordMismatch}
                          aria-describedby={passwordMismatch ? "password-confirm-error" : undefined}
                          className={`pl-11 h-12 rounded-xl bg-raised/50 ${passwordMismatch ? "border-danger" : "border-line"}`}
                        />
                      </div>
                      {passwordMismatch && (
                        <p id="password-confirm-error" className="ml-1 text-xs font-medium text-danger">비밀번호가 일치하지 않아요.</p>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <Separator className="bg-raised" />

              <section className="space-y-6">
                <div className="flex items-center gap-2 text-primary">
                  <User size={16} />
                  <span className="text-sm font-bold">공개 프로필</span>
                </div>

                <div className="grid gap-4">
                  {/* 닉네임 구역 */}
                  <div className="grid gap-2">
                    <Label className="text-xs font-bold text-ink-muted ml-1">닉네임</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Hash className="absolute left-4 top-3.5 h-4 w-4 text-ink-subtle" />
                        <Input
                          id="nickname"
                          value={formData.nickname}
                          onChange={handleInputChange}
                          required
                          placeholder="닉네임"
                          className="pl-11 h-12 rounded-xl border-line bg-raised/50"
                        />
                      </div>
                      <Button
                        type="button"
                        variant={isNicknameChecked ? "secondary" : "outline"}
                        onClick={handleCheckNickname}
                        className={`h-12 px-5 rounded-xl border-line font-bold text-sm transition-all ${isNicknameChecked ? "bg-success/10 text-success border-success/30" : "hover:bg-raised/60"}`}
                      >
                        {isNicknameChecked ? "확인 완료" : "중복 확인"}
                      </Button>
                    </div>
                  </div>

                  {/* 소속 필드 */}
                  <div className="grid gap-2">
                    <Label className="text-xs font-bold text-ink-muted ml-1">소속 (직접 입력)</Label>
                    <div className="relative">
                      <Briefcase className="absolute left-4 top-3.5 h-4 w-4 text-ink-subtle" />
                      <Input
                        id="belong"
                        value={formData.belong}
                        onChange={handleInputChange}
                        placeholder="소속 입력"
                        className="pl-11 h-12 rounded-xl border-line bg-raised/50"
                      />
                    </div>
                  </div>

                  {/* 관심 분야 */}
                  <div className="grid gap-2">
                    <Label className="text-xs font-bold text-ink-muted ml-1">관심 분야 (Enter로 추가)</Label>
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-4 top-3.5 h-4 w-4 text-ink-subtle" />
                        <Input
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={addTag}
                          placeholder="예: 백엔드, AI"
                          className="pl-11 h-12 rounded-xl border-line bg-raised/50"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2 empty:hidden">
                        {interests.map(tag => (
                          <Badge key={tag} className="pl-3 pr-1 py-1.5 bg-primary/10 text-primary border-none rounded-lg font-bold flex items-center gap-1">
                            {tag}
                            <button type="button" onClick={() => removeTag(tag)} className="hover:bg-primary/20 rounded-md p-0.5 transition-colors">
                              <X size={14} />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <div className="space-y-6">
                <div className="flex items-start space-x-3 p-4 bg-canvas rounded-2xl border border-line">
                  <Checkbox id="terms" className="mt-1 data-[state=checked]:bg-primary" required />
                  <div className="grid gap-1.5 leading-none">
                    <label htmlFor="terms" className="text-xs font-bold text-ink leading-normal cursor-pointer">
                      <Link href="/signup/terms" target="_blank" className="text-primary hover:underline">서비스 이용약관</Link> 및{" "}
                      <Link href="/signup/privacy" target="_blank" className="text-primary hover:underline">개인정보 처리방침</Link>에 동의합니다. (필수)
                    </label>
                    <p className="text-xs leading-5 text-ink-subtle">
                      어뷰징, 답안 공유, 플랫폼 대상 공격 등 부정행위 적발 시 계정이 영구 중단되며 소속에 통보될 수 있습니다.
                    </p>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || passwordMismatch}
                  className="w-full h-14 rounded-full bg-primary text-primary-ink hover:bg-primary-hover text-lg font-bold transition-all active:scale-[0.98] disabled:bg-raised disabled:text-ink-subtle disabled:opacity-100"
                >
                  {isLoading ? <Loader2 className="animate-spin mr-2" /> : "회원가입하기"}
                  {!isLoading && <ArrowRight className="ml-2 w-5 h-5" />}
                </Button>
              </div>

            </CardContent>
          </form>

          <CardFooter className="bg-raised/50 border-t border-line py-8 flex justify-center">
            <p className="text-sm font-bold text-ink-muted">
              이미 계정이 있으신가요? <Link href="/signin" className="text-primary hover:underline ml-1">로그인</Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}