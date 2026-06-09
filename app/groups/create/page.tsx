"use client";

import { useEffect, useState, useRef } from "react";
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
  { value: "Mentoring", label: "멘토링" },
  { value: "Class", label: "대학 강의" },
  { value: "Networking", label: "친목" },
  { value: "Career", label: "취업" },
];

export default function GroupCreatePage() {
  // [STATE] 페이지 전체
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(""); // 화면 미리보기용 임시 URL
  const [isUploading, setIsUploading] = useState(false);
  const [userImgUrl, setUserImgUrl] = useState("/avatar.png");

  // [STATE] 데이터
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>(["Study"]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isAutoApprove, setIsAutoApprove] = useState(false);

  useEffect(() => {
    const fetchProfileImage = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      setIsLoggedIn(true);

      try {
        const response = await fetch("https://diveon.net/api/profile/show", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          }
        });

        if (response.ok) {
          const result = await response.json();
          const userInfo = result?.data?.userInfo;

          // 서버에 저장된 실서버 S3 프로필 주소가 있다면 상태 동기화
          if (userInfo?.profileImgUrl) {
            setUserImgUrl(userInfo.profileImgUrl);
          }
        }
      } catch (error) {
        console.error("홈페이지 초기 데이터 로드 실패:", error);
      }
    };

    fetchProfileImage();
  }, []);

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



  // [추가] 로컬에서 이미지 선택 시 유효성 검사 및 미리보기 생성 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 명세서 크기 가드 (최대 1MB)
    if (file.size > 1 * 1024 * 1024) {
      alert("그룹 이미지 크기는 최대 1MB를 초과할 수 없습니다.");
      return;
    }

    // 명세서 확장자 가드
    const allowedExtensions = ["jpg", "jpeg", "png", "webp"];
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!allowedExtensions.includes(ext)) {
      alert("허용되지 않는 파일 형식입니다. (jpg, png, webp 가능)");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file)); // 가상 Blob 주소를 따서 렌더링 소스로 밀착 동기화
  };

  // 대표 이미지 초기화 처리 핸들러
  const handleResetImage = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl); // 메모리 누수 방지 해제
    setPreviewUrl("");
  };

  // [API 연동] 그룹 생성 및 후속 이미지 업로드 연쇄 결합 트랙
  const handleSubmit = async () => {
    if (!title.trim()) {
      alert("그룹 이름을 입력해주세요.");
      return;
    }

    setIsUploading(true);
    const token = localStorage.getItem("token");

    // 1단계 전송용 JSON 헤더
    const jsonHeaders: HeadersInit = { "Content-Type": "application/json" };
    if (token) jsonHeaders["Authorization"] = `Bearer ${token}`;

    const body = {
      title: title,
      description: description,
      tags: tags,
      isPrivate: isPrivate,
      isAutoApprove: isAutoApprove
    };

    try {
      // 1️단계: 텍스트 정보 기반 그룹 최초 생성 시도
      console.log("1단계 - 그룹 생성 요청 바디:", body);
      const response = await fetch("https://diveon.net/api/groups", {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("1단계 - 그룹 생성 성공 응답 데이터:", result);

        // [방어 코드] 백엔드 응답 구조에 따라 groupId 추출 (상황에 맞게 fallback 처리)
        const createdGroupId = result?.data?.groupId || result?.data || result?.groupId;

        if (!createdGroupId) {
          alert("그룹은 생성되었으나 서버로부터 그룹 ID를 받아오지 못했습니다. 백엔드 응답 구조를 확인해주세요.");
          setIsUploading(false);
          return;
        }

        // 2단계: 사용자가 선택한 이미지가 존재한다면 후속 멀티파트 업로드 실행
        if (selectedFile) {
          console.log(`2단계 - 이미지 업로드 시작 (GroupId: ${createdGroupId}), 파일명: ${selectedFile.name}`);

          const formDataPayload = new FormData();
          formDataPayload.append("image", selectedFile); // 명세서 요구 필드: image

          // FormData 전송 시 Content-Type 헤더는 절대로 수동으로 넣지 마세요 (브라우저가 알아서 세팅함)
          const imgHeaders: HeadersInit = {};
          if (token) imgHeaders["Authorization"] = `Bearer ${token}`;

          const imageRes = await fetch(`https://diveon.net/api/groups/${createdGroupId}/image`, {
            method: "POST",
            headers: imgHeaders,
            body: formDataPayload
          });

          if (imageRes.ok) {
            const imgResult = await imageRes.json();
            console.log("2단계 - 이미지 업로드 성공 응답:", imgResult);
          } else {
            const imgErrorResult = await imageRes.text();
            console.error("2단계 - 이미지 업로드 실패 에러 로그:", imgErrorResult);
            alert("그룹 정보는 생성되었으나, 대표 이미지 업로드 중 실패(400/403/500)가 발생했습니다.");
          }
        }

        alert("그룹이 성공적으로 생성되었습니다!");
        router.push(`/groups/detail?id=${createdGroupId}`);
      } else {
        const errorText = await response.text();
        console.error("1단계 - 그룹 생성 실패 에러 로그:", errorText);
        alert("그룹 생성 실패: 입력 데이터를 다시 확인해 주세요.");
      }

    } catch (error) {
      console.error("그룹 생성 및 업로드 트래픽 에러:", error);
      alert("서버 통신 중 장애가 발생했습니다.");
    } finally {
      setIsUploading(false);
    }
  };

  // [HANDLER] 선택 토글
  const toggleSelectedTag = (value: string) => {
    setTags((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value) // 이미 있으면 제거
        : [...prev, value] // 없으면 추가
    );
  };

  // [HANDLER] 로그아웃
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
                <Avatar className="h-9 w-9 border border-slate-200 hover:ring-2 hover:ring-indigo-100 transition-all cursor-pointer">
                  <AvatarImage src={userImgUrl} alt="User Profile" className="object-cover" />
                  <AvatarFallback className="bg-transparent text-xs font-bold text-slate-600 rounded-full">
                    {/* 공백 상태 유지 */}
                  </AvatarFallback>
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
                {/* 보이지 않는 숨겨진 파일 선택 엔진 레이어 */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg, image/png, image/webp"
                  className="hidden"
                />

                <Avatar
                  className="w-20 h-20 border-2 border-slate-200 shadow-inner cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                >
                  {/* 선택된 임시 프리뷰 주소가 있으면 띄우고 없으면 기본 껍데기 노출 */}
                  <AvatarImage src={previewUrl} alt="Group Preview" />
                  <AvatarFallback className="bg-slate-100">
                    <ImageIcon className="text-slate-400" />
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1.5">
                  <Label>그룹 대표 이미지</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="text-xs font-bold"
                    >
                      이미지 선택
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={handleResetImage}
                      disabled={isUploading || !previewUrl}
                      className="text-xs text-slate-400 font-bold hover:text-red-500"
                    >
                      초기화
                    </Button>
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