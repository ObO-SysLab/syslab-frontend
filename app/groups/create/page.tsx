"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Menu, LogOut, User, Users, ShieldCheck, CheckCircle2,
  Globe, Lock, Image as ImageIcon, Bell, Info, Check
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const TAGS = [
  { value: "Study", label: "스터디" },
  { value: "Metoring", label: "멘토링" },
  { value: "Class", label: "대학 강의" },
  { value: "Networking", label: "친목" },
  { value: "Career", label: "취업" },
];

export default function GroupCreatePage() {
  // [STATE] 페이지 전체
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  // [STATE] 데이터
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>(["Study"]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isAutoApprove, setIsAutoApprove] = useState(false);

  // [API] 초기 페이지 데이터 로드
  useEffect(() => {
    const fetchInitData = async () => {
      const token = localStorage.getItem("token");
      if (token) setIsLoggedIn(true);

      // header에 JWT token 추가
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      try {
        // pass
      } catch (error) {
        console.error("초기 데이터 로드 실패:", error);
      }
    };

    fetchInitData();
  }, []);

  // [API] 문제 생성
  const handleSubmit = async () => {
    // 필수 입력 검증
    if (!title.trim()) {
      alert("그룹 이름을 입력해주세요.");
      return;
    }

    // header에 JWT token 추가
    const token = localStorage.getItem("token");
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const body = {
      title: title,
      description: description,
      tags: tags,
      isPrivate: isPrivate,
      isAutoApprove: isAutoApprove
    };

    try {
      const response = await fetch("https://diveon.net/api/groups", {
        method: "POST",
        headers: headers,
        body: JSON.stringify(body),
      });

      if (response.ok) {
        alert("그룹이 성공적으로 생성되었습니다!");
        const result = await response.json();
        router.push(`/groups/detail?id=${result.data.groupId}`);
      }

    } catch (error) {
      console.error("그룹 생성 중 오류 발생:", error);
      alert("서버와 통신 중 문제가 발생했습니다.");
    } finally {
    };
  };

  // [HANDLER] 선택 토글
  const toggleSelectedTag = (value: string) => {
    setTags((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value) // 이미 있으면 제거
        : [...prev, value] // 없으면 추가
    );
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">

      {/* 1. 고정 헤더 */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur px-6 h-16 flex items-center justify-between">
        {/* [A] Diveon 로고 영역 */}
        <div className="flex items-center gap-4">
          <Menu className="h-6 w-6 text-slate-500 cursor-pointer lg:hidden" />
          <Link href="/" className="text-xl font-bold tracking-tight text-slate-900">
            Diveon<span className="text-[10px] font-black text-indigo-500 ml-1">ADMIN</span>
          </Link>
        </div>

        {/* [B] 우측 사용자 영역 */}
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            /* --- 로그인된 상태: 알림 + 프로필 + 로그아웃 --- */
            <>
              <button className="p-2 hover:bg-slate-100 rounded-full transition-colors relative group">
                <Bell className="h-5 w-5 text-slate-500 group-hover:text-slate-900" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
              <Link href="/settings">
                <Avatar className="h-9 w-9 border border-slate-200 hover:ring-2 hover:ring-indigo-100 cursor-pointer transition-all">
                  <AvatarImage src="/avatar.png" alt="User" />
                  <AvatarFallback className="bg-slate-100 text-xs font-bold text-slate-600">DY</AvatarFallback>
                </Avatar>
              </Link>
              <button onClick={handleLogout} className="p-2 hover:bg-red-50 rounded-full text-red-500 transition-colors">
                <LogOut className="h-5 w-5" />
              </button>
            </>
          ) : (
            /* --- 로그아웃된 상태 (보통 리다이렉트 되지만 렌더링 방어용) --- */
            <div className="flex items-center gap-2">
              <Link href="/signin">
                <Button variant="ghost" className="text-sm font-bold text-slate-600">Sign In</Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-slate-900 text-white text-sm font-bold rounded-full px-5 shadow-lg shadow-slate-200">
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* 2. 메인 레이아웃 */}
      <main className="container mx-auto max-w-[1200px] pt-10 grid grid-cols-1 md:grid-cols-12 gap-10 px-6 pb-20">

        {/* [A] 좌측 안내 섹션 (4칸) */}
        <aside className="col-span-12 md:col-span-4 space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tighter text-slate-950">새 그룹 만들기</h1>
            <p className="text-slate-500 leading-relaxed">
              함께 공부하고 성장할 동료들을 모아보세요. <br />
              스터디, 캡스톤 팀, 보안 동아리 등 무엇이든 좋습니다.
            </p>
          </div>

          <Card className="border-indigo-100 bg-indigo-50/50 shadow-none rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-indigo-900">
                <Info className="w-4 h-4" /> 그룹 생성 팁
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-indigo-700/80 space-y-3 leading-relaxed">
              <p>• **명확한 이름:** 그룹의 목적이 드러나는 이름이 가입률이 높습니다.</p>
              <p>• **아이콘 설정:** 그룹을 상징하는 이미지를 등록하면 리스트에서 돋보입니다.</p>
              <p>• **규칙 설정:** 가입 전 그룹의 규칙을 명시하여 소통의 오해를 줄이세요.</p>
            </CardContent>
          </Card>
        </aside>

        {/* [B] 우측 입력 폼 (8칸) */}
        <section className="col-span-12 md:col-span-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500">

          {/* 1. 기본 정보 */}
          <Card className="border-slate-200 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" /> 그룹 기본 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 그룹 로고 업로드 부분 */}
              <div className="flex items-center gap-6 pb-2">
                <Avatar className="w-20 h-20 border-2 border-slate-200 shadow-inner">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-slate-100"><ImageIcon className="text-slate-400" /></AvatarFallback>
                </Avatar>
                <div className="space-y-1.5">
                  <Label>그룹 대표 이미지</Label>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-xs">이미지 선택</Button>
                    <Button size="sm" variant="ghost" className="text-xs text-slate-400">초기화</Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="group-name">그룹 이름 <span className="text-red-500">*</span></Label>
                <Input id="group-name" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 단국대 알고리즘 스터디" className="focus-visible:ring-indigo-400" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="group-desc">그룹 소개</Label>
                <Textarea id="group-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="그룹의 목적과 활동 내용을 간단히 적어주세요." className="resize-none min-h-[100px] focus-visible:ring-indigo-400" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>활동/목적</Label>
                  <div className="flex flex-wrap gap-4">
                    {TAGS.map((m) => (
                      <div key={m.value} className="flex items-center gap-2">
                        <Checkbox
                          id={m.value}
                          checked={tags.includes(m.value)}
                          onCheckedChange={() => toggleSelectedTag(m.value)}
                        />
                        <label htmlFor={m.value}>{m.label}</label>
                      </div>
                    ))}
                  </div>
                </div>
                {/* <div className="space-y-2">
                  <Label>최대 인원</Label>
                  <Input type="number" placeholder="제한 없음" className="focus-visible:ring-indigo-400" />
                </div> */}
              </div>
            </CardContent>
          </Card>

          {/* 2. 공개 및 가입 설정 */}
          <Card className="border-slate-200 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" /> 가입 및 공개 설정
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              { /* 그룹 비공개 설정 토글 */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-bold">비공개 그룹으로 설정</Label>
                    {isPrivate ? <Lock size={14} className="text-indigo-600" /> : <Globe size={14} className="text-slate-400" />}
                  </div>
                  <p className="text-xs text-slate-500">비공개 시 초대받은 인원만 그룹을 볼 수 있습니다.</p>
                </div>
                <Switch
                  checked={isPrivate}
                  onCheckedChange={setIsPrivate}
                  className="data-[state=checked]:bg-indigo-600"
                />
              </div>

              {/* 자동 승인 설정 토글 */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-bold">멤버 자동 승인</Label>
                    {isAutoApprove ? (
                      <CheckCircle2 size={14} className="text-emerald-600" />
                    ) : (
                      <Users size={14} className="text-slate-400" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {isAutoApprove
                      ? "신청 즉시 그룹원이 됩니다."
                      : "관리자가 승인해야 가입이 완료됩니다."}
                  </p>
                </div>
                <Switch
                  checked={isAutoApprove}
                  onCheckedChange={setIsAutoApprove}
                  className="data-[state=checked]:bg-indigo-600"
                />
              </div>
            </CardContent>
          </Card>

          {/* 하단 버튼 */}
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" className="text-slate-500" asChild>
              <Link href="/groups">취소</Link>
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 px-8 shadow-lg shadow-indigo-100" onClick={handleSubmit}>
              <Check className="ml-2 w-4 h-4" /> 그룹 생성하기
            </Button>
          </div>
        </section>

      </main>
    </div>
  );
}