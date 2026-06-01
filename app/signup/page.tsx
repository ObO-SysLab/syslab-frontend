"use client";

import { useState } from "react";
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

  // API 및 검증 상태 관리 그룹
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isIdChecked, setIsIdChecked] = useState(false);
  const [isNicknameChecked, setIsNicknameChecked] = useState(false);
  const [emailCode, setEmailCode] = useState(""); // 6자리
  const [isEmailSent, setIsEmailSent] = useState(false);

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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">

      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="bg-slate-900 p-1.5 rounded-lg shadow-lg">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <span className="text-3xl font-black tracking-tighter text-slate-900">Diveon</span>
        </Link>
        <p className="mt-2 text-sm text-slate-500 font-medium">
          운영체제의 깊은 바다를 함께 탐험해봐요.
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-[550px]">
        <Card className="border-none shadow-2xl shadow-slate-200/60 rounded-[2.5rem] overflow-hidden bg-white">
          <CardHeader className="pt-10 pb-6 px-10 border-b border-slate-50 bg-white">
            <CardTitle className="text-2xl font-black flex items-center gap-2 text-slate-900">
              <UserPlus className="w-6 h-6 text-indigo-600" /> 계정 생성
            </CardTitle>
            <CardDescription className="text-slate-400 font-medium">모든 항목은 필수 입력 사항입니다.</CardDescription>
          </CardHeader>

          <form onSubmit={handleSignUp}>
            <CardContent className="p-10 space-y-10">

              <section className="space-y-6">
                <div className="flex items-center gap-2 text-indigo-600">
                  <ShieldCheck size={16} />
                  <span className="text-[11px] font-black uppercase tracking-widest">Personal Info & Security</span>
                </div>

                <div className="grid gap-3">
                  {/* 이메일 구역 */}
                  <div className="grid gap-2">
                    <Label className="text-xs font-bold text-slate-500 ml-1">이메일 인증</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Mail className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          disabled={isEmailVerified}
                          required
                          placeholder="example@dankook.ac.kr"
                          className="pl-11 h-12 rounded-xl border-slate-100 bg-slate-50/50 disabled:opacity-60"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={handleSendEmailCode}
                        disabled={isEmailVerified}
                        className={`h-12 px-5 rounded-xl font-bold text-xs transition-all ${isEmailVerified ? "bg-slate-100 text-slate-400 border" : "bg-indigo-600 hover:bg-indigo-700 text-white"}`}
                      >
                        {isEmailVerified ? "인증 완결" : isEmailSent ? "코드 재발송" : "인증하기"}
                      </Button>
                    </div>
                  </div>

                  { /* 인증코드 입력 */ }
                  {isEmailSent && !isEmailVerified && (
                    <div className="flex gap-2 animate-in slide-in-from-top-2 duration-300">
                      <div className="relative flex-1">
                        <ShieldCheck className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                        <Input
                          type="text"
                          maxLength={6}
                          value={emailCode}
                          onChange={(e) => setEmailCode(e.target.value)}
                          placeholder="인증코드 6자리 입력"
                          className="pl-11 h-12 rounded-xl border-indigo-100 bg-indigo-50/10 font-mono tracking-widest text-sm font-bold text-slate-800"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={handleVerifyEmailCode}
                        className="h-12 px-6 rounded-xl bg-slate-950 text-white font-black text-xs hover:bg-slate-800 shrink-0"
                      >
                        코드 확인
                      </Button>
                    </div>
                  )}

                  {/* 아이디 구역 */}
                  <div className="grid gap-2">
                    <Label className="text-xs font-bold text-slate-500 ml-1">아이디</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Hash className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                        <Input
                          id="id"
                          value={formData.id}
                          onChange={handleInputChange}
                          required
                          placeholder="아이디"
                          className="pl-11 h-12 rounded-xl border-slate-100 bg-slate-50/50"
                        />
                      </div>
                      <Button
                        type="button"
                        variant={isIdChecked ? "secondary" : "outline"}
                        onClick={handleCheckId}
                        className={`h-12 px-5 rounded-xl border-slate-200 font-bold text-xs transition-all ${isIdChecked ? "bg-green-50 text-green-600 border-green-200" : "hover:bg-slate-50"}`}
                      >
                        {isIdChecked ? "확인 완료" : "중복 확인"}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="text-xs font-bold text-slate-500 ml-1">비밀번호</Label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                        <Input
                          id="password"
                          type="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          required
                          placeholder="••••••••"
                          className="pl-11 h-12 rounded-xl border-slate-100 bg-slate-50/50"
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs font-bold text-slate-500 ml-1">비밀번호 확인</Label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                        <Input type="password" placeholder="••••••••" className="pl-11 h-12 rounded-xl border-slate-100 bg-slate-50/50" />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <Separator className="bg-slate-100" />

              <section className="space-y-6">
                <div className="flex items-center gap-2 text-indigo-600">
                  <User size={16} />
                  <span className="text-[11px] font-black uppercase tracking-widest">Public Profile</span>
                </div>

                <div className="grid gap-4">
                  {/* 닉네임 구역 */}
                  <div className="grid gap-2">
                    <Label className="text-xs font-bold text-slate-500 ml-1">닉네임</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Hash className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                        <Input
                          id="nickname"
                          value={formData.nickname}
                          onChange={handleInputChange}
                          required
                          placeholder="사용할 닉네임"
                          className="pl-11 h-12 rounded-xl border-slate-100 bg-slate-50/50"
                        />
                      </div>
                      <Button
                        type="button"
                        variant={isNicknameChecked ? "secondary" : "outline"}
                        onClick={handleCheckNickname}
                        className={`h-12 px-5 rounded-xl border-slate-200 font-bold text-xs transition-all ${isNicknameChecked ? "bg-green-50 text-green-600 border-green-200" : "hover:bg-slate-50"}`}
                      >
                        {isNicknameChecked ? "확인 완료" : "중복 확인"}
                      </Button>
                    </div>
                  </div>

                  {/* 소속 필드 */}
                  <div className="grid gap-2">
                    <Label className="text-xs font-bold text-slate-500 ml-1">소속 (직접 입력)</Label>
                    <div className="relative">
                      <Briefcase className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                      <Input
                        id="belong"
                        value={formData.belong}
                        onChange={handleInputChange}
                        placeholder="소속 입력"
                        className="pl-11 h-12 rounded-xl border-slate-100 bg-slate-50/50"
                      />
                    </div>
                  </div>

                  {/* 관심 분야 */}
                  <div className="grid gap-2">
                    <Label className="text-xs font-bold text-slate-500 ml-1">관심 분야 (Enter로 추가)</Label>
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                        <Input
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={addTag}
                          placeholder="예: 리버싱, 네트워크 보안"
                          className="pl-11 h-12 rounded-xl border-slate-100 bg-slate-50/50"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2 min-h-[32px]">
                        {interests.map(tag => (
                          <Badge key={tag} className="pl-3 pr-1 py-1.5 bg-indigo-50 text-indigo-600 border-none rounded-lg font-bold flex items-center gap-1">
                            {tag}
                            <button type="button" onClick={() => removeTag(tag)} className="hover:bg-indigo-100 rounded-md p-0.5 transition-colors">
                              <X size={14} />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <div className="space-y-6 pt-4">
                <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <Checkbox id="terms" className="mt-1 data-[state=checked]:bg-indigo-600" required />
                  <div className="grid gap-1.5 leading-none">
                    <label htmlFor="terms" className="text-xs font-bold text-slate-700 leading-normal cursor-pointer">
                      <Link href="/signup/terms" target="_blank" className="text-indigo-600 hover:underline">서비스 이용약관</Link> 및{" "}
                      <Link href="/signup/privacy" target="_blank" className="text-indigo-600 hover:underline">개인정보 처리방침</Link>에 동의합니다. (필수)
                    </label>
                    <p className="text-[10px] text-slate-400">
                      어뷰징, 답안 공유, 플랫폼 대상 공격 등 부정행위 적발 시 계정이 영구 중단되며 소속에 통보될 수 있습니다.
                    </p>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-slate-950 hover:bg-slate-800 h-14 rounded-2xl text-lg font-black shadow-xl shadow-slate-200 transition-all active:scale-[0.98]"
                >
                  {isLoading ? <Loader2 className="animate-spin mr-2" /> : "회원가입하기"}
                  {!isLoading && <ArrowRight className="ml-2 w-5 h-5" />}
                </Button>
              </div>

            </CardContent>
          </form>

          <CardFooter className="bg-slate-50/50 border-t border-slate-100 py-8 flex justify-center">
            <p className="text-sm font-bold text-slate-500">
              이미 계정이 있으신가요? <Link href="/signin" className="text-indigo-600 hover:underline ml-1">로그인</Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}