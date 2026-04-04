"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  ShieldCheck, UserPlus, Mail, Lock, User, 
  ArrowRight, Shield, Hash, Briefcase, 
  Cake, Check, X, Search
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function SignUpPage() {
  // [상태 관리] 이메일 인증 여부 및 자동 기입 데이터
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [autoData, setAutoData] = useState({ name: "", birth: "" });

  // [상태 관리] 관심 분야 태그
  const [interests, setInterests] = useState<string[]>(["디지털 포렌식"]);
  const [tagInput, setTagInput] = useState("");

  // 이메일 인증 시뮬레이션 (이메일 연동 컨셉)
  const handleVerifyEmail = () => {
    alert("이메일 인증이 완료되었습니다.");
    setIsEmailVerified(true);
    setAutoData({ name: "박단용", birth: "2003-05-26" });
  };

  // 태그 추가
  const addTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim() !== "") {
      e.preventDefault();
      if (!interests.includes(tagInput.trim())) {
        setInterests([...interests, tagInput.trim()]);
      }
      setTagInput("");
    }
  };

  // 태그 삭제
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

          <CardContent className="p-10 space-y-10">
            
            {/* [SECTION 1] 개인정보 및 인증 파트 */}
            <section className="space-y-6">
              <div className="flex items-center gap-2 text-indigo-600">
                <ShieldCheck size={16} />
                <span className="text-[11px] font-black uppercase tracking-widest">Personal Info & Security</span>
              </div>

              <div className="grid gap-4">
                {/* 이메일 및 인증 버튼 */}
                <div className="grid gap-2">
                  <Label className="text-xs font-bold text-slate-500 ml-1">이메일 인증</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Mail className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                      <Input placeholder="example@dankook.ac.kr" className="pl-11 h-12 rounded-xl border-slate-100 bg-slate-50/50" />
                    </div>
                    <Button 
                      type="button"
                      onClick={handleVerifyEmail}
                      className="h-12 px-5 rounded-xl bg-indigo-600 font-bold text-xs"
                    >
                      {isEmailVerified ? "인증됨" : "인증하기"}
                    </Button>
                  </div>
                </div>

                {/* 인증 시 자동 기입되는 필드 (이름, 생일) */}
                {isEmailVerified && (
                  <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="grid gap-2">
                      <Label className="text-xs font-bold text-slate-400 ml-1">실명 (자동인증)</Label>
                      <div className="h-12 px-4 bg-slate-100 border border-slate-200 rounded-xl flex items-center text-slate-500 font-bold text-sm">
                        <Check className="w-4 h-4 mr-2 text-green-500" /> {autoData.name}
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs font-bold text-slate-400 ml-1">생년월일 (자동인증)</Label>
                      <div className="h-12 px-4 bg-slate-100 border border-slate-200 rounded-xl flex items-center text-slate-500 font-bold text-sm">
                        <Cake className="w-4 h-4 mr-2 text-green-500" /> {autoData.birth}
                      </div>
                    </div>
                  </div>
                )}

                {/* 비밀번호 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label className="text-xs font-bold text-slate-500 ml-1">비밀번호</Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                      <Input type="password" placeholder="••••••••" className="pl-11 h-12 rounded-xl border-slate-100 bg-slate-50/50" />
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

            {/* [SECTION 2] 프로필 파트 */}
            <section className="space-y-6">
              <div className="flex items-center gap-2 text-indigo-600">
                <User size={16} />
                <span className="text-[11px] font-black uppercase tracking-widest">Public Profile</span>
              </div>

              <div className="grid gap-4">
                {/* 닉네임 및 중복 확인 */}
                <div className="grid gap-2">
                  <Label className="text-xs font-bold text-slate-500 ml-1">닉네임</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Hash className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                      <Input placeholder="사용할 닉네임" className="pl-11 h-12 rounded-xl border-slate-100 bg-slate-50/50" />
                    </div>
                    <Button variant="outline" className="h-12 px-5 rounded-xl border-slate-200 font-bold text-xs hover:bg-slate-50">중복 확인</Button>
                  </div>
                </div>

                {/* 소속 직접 입력 */}
                <div className="grid gap-2">
                  <Label className="text-xs font-bold text-slate-500 ml-1">소속 (직접 입력)</Label>
                  <div className="relative">
                    <Briefcase className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                    <Input defaultValue="소속 입력" className="pl-11 h-12 rounded-xl border-slate-100 bg-slate-50/50" />
                  </div>
                </div>

                {/* 관심 분야 태그 형식 */}
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
                          <button onClick={() => removeTag(tag)} className="hover:bg-indigo-100 rounded-md p-0.5 transition-colors">
                            <X size={14} />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 약관 및 제출 버튼 */}
            <div className="space-y-6 pt-4">
              {/* 3. 약관 동의 */}
              <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <Checkbox id="terms" className="mt-1 data-[state=checked]:bg-indigo-600" />
                <div className="grid gap-1.5 leading-none">
                  <label htmlFor="terms" className="text-xs font-bold text-slate-700 leading-normal cursor-pointer">
                    서비스 이용약관 및 개인정보 처리방침에 동의합니다.
                  </label>
                  <p className="text-[10px] text-slate-400">
                    부정행위 적발 시 계정 사용이 영구 중단될 수 있음을 확인했습니다.
                  </p>
                </div>
              </div>

              <Button className="w-full bg-slate-950 hover:bg-slate-800 h-14 rounded-2xl text-lg font-black shadow-xl shadow-slate-200 transition-all active:scale-[0.98]">
                회원가입하기 <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>

          </CardContent>

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