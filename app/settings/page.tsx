"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search, LogOut, User, Menu, Lock, Bell, Paintbrush, Trash2, X, ShieldCheck,
  Laptop, Moon, Sun, Flag, Trophy, Users, BarChart3, ShoppingBag, Camera
} from "lucide-react";
import { BarChart, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge"


function SettingsContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab"); 

  // 현재 로그인 상태를 관리 (나중에는 실제 토큰 유무로 판단)
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  // [상태 관리] 현재 활성화된 탭 (profile, security, notifications, appearance)
  const [activeTab, setActiveTab] = useState(tabParam || "profile");

  // 프로필 데이터를 저장할 상태
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userImgUrl, setUserImgUrl] = useState("/avatar.png");
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

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
  }, [userImgUrl]);

  // 페이지 로드 시 토큰을 사용하여 데이터 요청
  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token"); // 저장된 토큰 가져오기
      if (!token) {
        setIsLoading(false);
        return;
      }

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
          setProfileData(result); // 서버에서 받은 데이터 저장
        }
      } catch (error) {
        console.error("데이터 로드 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">

      {/* 1. 고정 헤더 (기존 디자인 유지) */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8"> {/* gap을 넓혀서 메뉴 공간 확보 */}
          <Menu className="h-6 w-6 text-slate-500 cursor-pointer lg:hidden" />
          <Link href="/" className="text-2xl font-black tracking-tighter text-slate-900 mr-4">
            Diveon
          </Link>

          {/* 중앙 네비게이션 메뉴 */}
          <nav className="hidden lg:flex items-center gap-1">
            <NavMenuLink href="/challenges" icon={<Flag size={18} />} label="챌린지" />
            <NavMenuLink href="/contests" icon={<Trophy size={18} />} label="대회" />
            <NavMenuLink href="/groups" icon={<Users size={18} />} label="그룹" />
            <NavMenuLink href="/ranking" icon={<BarChart3 size={18} />} label="랭킹" />
            <NavMenuLink href="/store" icon={<ShoppingBag size={18} />} label="스토어" />
          </nav>
        </div>

        {/* 검색창 영역 */}
        <div className="flex-1 max-w-sm px-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input type="search" placeholder="검색..." className="pl-9 bg-slate-50 border-slate-200 rounded-full h-9 text-sm" />
          </div>
        </div>

        {/* 우측 사용자 영역 (로그인 상태에 따라 가변적) */}
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            /* --- [A] 로그인된 상태: 알림 + 프로필(동글) + 로그아웃 --- */
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

              <button
                onClick={() => setIsLoggedIn(false)}
                className="p-2 hover:bg-red-50 rounded-full text-red-500 transition-colors group"
              >
                <LogOut className="h-5 w-5 group-hover:scale-110 transition-transform" />
              </button>
            </>
          ) : (
            /* --- [B] 로그아웃된 상태: 로그인 / 시작하기 버튼 --- */
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

      <main className="container mx-auto max-w-[1200px] pt-10 grid grid-cols-1 md:grid-cols-12 gap-10 px-6 pb-20">

        {/* [A] 좌측 사이드바 메뉴 (4칸) */}
        <aside className="col-span-12 md:col-span-3 space-y-2">
          <div className="px-3 mb-4">
            <h2 className="text-2xl font-black tracking-tighter">Settings</h2>
          </div>
          <nav className="space-y-1">
            <SettingsNavItem
              icon={<User size={18} />}
              label="프로필 편집"
              active={activeTab === "profile"}
              onClick={() => setActiveTab("profile")}
            />
            <SettingsNavItem
              icon={<Lock size={18} />}
              label="보안 및 계정"
              active={activeTab === "security"}
              onClick={() => setActiveTab("security")}
            />
            <SettingsNavItem
              icon={<Bell size={18} />}
              label="알림 설정"
              active={activeTab === "notifications"}
              onClick={() => setActiveTab("notifications")}
            />
            <SettingsNavItem
              icon={<Paintbrush size={18} />}
              label="테마 및 외관"
              active={activeTab === "appearance"}
              onClick={() => setActiveTab("appearance")}
            />
            <SettingsNavItem
              icon={<BarChart3 size={18} />}
              label="능력치 차트"
              active={activeTab === "chart"}
              onClick={() => setActiveTab("chart")}
            />
          </nav>
          <Separator className="my-6" />
          <div className="px-3">
            <button className="flex items-center gap-3 text-sm font-bold text-red-500 hover:text-red-600 transition-colors">
              <Trash2 size={18} /> 계정 탈퇴
            </button>
          </div>
        </aside>

        {/* [B] 우측 메인 콘텐츠 (9칸) - activeTab에 따라 렌더링 */}
        <section className="col-span-12 md:col-span-9">
          {/* {activeTab === "profile" && <ProfileSection />}  */}
          {/* [수정] 프로필 섹션에 데이터를 넘겨줌 */}
          {activeTab === "profile" && (
            isLoading ? (
              <div className="py-20 text-center text-slate-400 font-bold">프로필 로드 중...</div>
            ) : (
              <ProfileSection
                data={profileData}
                pendingImageFile={pendingImageFile}
                setPendingImageFile={setPendingImageFile}
              />
            )
          )}
          {activeTab === "security" && <SecuritySection />}
          {activeTab === "notifications" && <NotificationSection />}
          {activeTab === "appearance" && <AppearanceSection />}
          {activeTab === "chart" && <ChartSection data={profileData} />}
        </section>

      </main>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 1. 프로필 및 개인정보 관리 섹션 */
/* -------------------------------------------------------------------------- */
function ProfileSection({
  data,
  pendingImageFile,
  setPendingImageFile
}: {
  data: any;
  pendingImageFile: File | null;
  setPendingImageFile: React.Dispatch<React.SetStateAction<File | null>>;
}) {
  const info = data?.data?.userInfo;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formattedDate = info?.createdAt
    ? new Date(info.createdAt).toLocaleDateString("ko-KR", { year: 'numeric', month: 'long', day: 'numeric' })
    : "0000년 00월 00일";
  const [nickname, setNickname] = useState(info?.nickname || "");
  const [bio, setBio] = useState(info?.selfComment || "");
  const [org, setOrg] = useState(info?.belong || "");
  const [profileImgUrl, setProfileImgUrl] = useState(info?.profileImgUrl || "/avatar.png");
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [interests, setInterests] = useState<string[]>(
    Array.isArray(info?.interest)
      ? info.interest
      : info?.interest && typeof info.interest === "string"
        ? info.interest.split(",").map((s: string) => s.trim()).filter(Boolean)
        : ["Digital Forensics", "Cyber Investigation"] // 기본 예시 데이터 대체
  );

  const [isUpdating, setIsUpdating] = useState(false);
  const [tagInput, setTagInput] = useState("");

  // [HANDLER] 태그 등록
  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed) return;

    // 중복 태그 방지 가드
    if (!interests.includes(trimmed)) {
      setInterests([...interests, trimmed]);
    }
    setTagInput(""); // 인풋창 초기화
  };

  // [HANDLER] 태그 삭제
  const handleRemoveTag = (tagToRemove: string) => {
    setInterests(interests.filter((tag) => tag !== tagToRemove));
  };

  // 파일 선택 시 서버 전송을 차단하고 로컬 가상 주소(Blob)로 미리보기만 동기화
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 명세서 제한 규격 체크 (최대 1MB)
    if (file.size > 1 * 1024 * 1024) {
      alert("파일 크기는 최대 1MB를 초과할 수 없습니다.");
      return;
    }

    // 명세서 허용 확장자 체크
    const allowedExtensions = ["jpg", "jpeg", "png", "webp", "gif"];
    const fileExtension = file.name.split(".").pop()?.toLowerCase() || "";
    if (!allowedExtensions.includes(fileExtension)) {
      alert("허용되지 않는 파일 형식입니다. (jpg, png, webp만 가능)");
      return;
    }

    // 핵심: 파일 객체는 주머니(pendingImageFile)에 보관하고, 화면 마크업만 임시 전환
    setPendingImageFile(file);
    setProfileImgUrl(URL.createObjectURL(file));
  };

  // 숫자 티어를 문자열로 매핑하는 변환기
  const getTierLabel = (tier: string | number) => {
    const tierStr = String(tier);
    if (tierStr === "7") return "Challenger";
    if (tierStr === "6") return "Master";
    if (tierStr === "5") return "Diamond";
    if (tierStr === "4") return "Platinum";
    if (tierStr === "3") return "Gold";
    if (tierStr === "2") return "Silver";
    if (tierStr === "1") return "Bronze";
    return tier || "Unranked";
  };

  // 7단계 명예 티어 스킨 테마
  const getTierBadgeStyle = (tier: string | number) => {
    const label = getTierLabel(tier);
    switch (label) {
      case 'Challenger': return 'bg-rose-950 text-rose-200 border-rose-800 font-black animate-pulse';
      case 'Master': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Diamond': return 'bg-cyan-50 text-cyan-600 border-cyan-200';
      case 'Platinum': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'Gold': return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'Silver': return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'Bronze': return 'bg-orange-50 text-orange-700 border-orange-200';
      default: return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  };

  const handleUpdateProfile = async () => {
    setIsUpdating(true);
    const token = localStorage.getItem("token");

    try {
      // 1단계: 닉네임, 자기소개, 소속 등 일반 텍스트 정보 PATCH 수정
      const res = await fetch("https://diveon.net/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          nickname: nickname,
          selfComment: bio,
          belong: org,
          interest: interests
        })
      });

      if (res.ok) {
        // 2단계: 텍스트 수정 성공 직후, 주머니에 대기 중인 임시 프로필 사진이 있다면 연속 업로드 개시!
        if (pendingImageFile) {
          const formDataPayload = new FormData();
          formDataPayload.append("image", pendingImageFile); // 명세서 매핑 키: image

          const imgRes = await fetch("https://diveon.net/api/users/me/profile-image", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${token}` // Multipart 전송이므로 Content-Type 명시 금지
            },
            body: formDataPayload
          });

          if (!imgRes.ok) {
            alert("텍스트 정보는 반영되었으나, 프로필 이미지 업로드 중 서버 에러가 발생했습니다.");
          }
        }

        alert("모든 프로필 변경사항 및 이미지가 안전하게 저장되었습니다!");
        setPendingImageFile(null); // 전송 완료 후 주머니 비우기

        // 3단계: 헤더 및 메인 레이아웃에 캐시 잔상 없이 굳히기 위해 쿼리스트링 리로드 동기화
        window.location.href = `/settings?v=${Date.now()}`;
      } else {
        alert("프로필 수정에 실패했습니다. 입력값을 확인해주세요.");
      }
    } catch (e) {
      console.error(e);
      alert("서버 통신 중 오류가 발생했습니다.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in-50 duration-300 pb-10">

      {/* (1) 기본 프로필 */}
      <section className="space-y-6">
        <div className="space-y-1">
          <h3 className="text-xl font-bold">프로필 편집</h3>
          <p className="text-sm text-slate-500">다른 사용자에게 보여지는 정보를 설정합니다.</p>
        </div>
        <Separator />

        <div className="flex items-center gap-6 p-6 bg-slate-50/50 rounded-3xl border border-slate-100">

          {/* 숨겨진 File Input 컴포넌트 가드 주입 */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/jpeg, image/png, image/webp"
            className="hidden"
          />

          <div
            className="relative group cursor-pointer"
            onClick={() => !isImageUploading && fileInputRef.current?.click()} // 클릭 시 파일창 트리거
          >
            <Avatar className="w-24 h-24 border-4 border-white shadow-xl transition-transform active:scale-95">
              {/* 기 가공된 profileImgUrl 상태 소스 연결 */}
              <AvatarImage src={profileImgUrl} />
              <AvatarFallback className="bg-indigo-100 text-indigo-600 font-black text-xl">
                {isImageUploading ? "..." : "DY"}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={24} className="text-white" />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-bold text-slate-900">
              {isImageUploading ? "이미지 업로드 중..." : "프로필 이미지"}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()} // 버튼 연동 마감
                disabled={isImageUploading}
                className="rounded-xl font-bold"
              >
                사진 변경
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setPendingImageFile(null);   // 킵해둔 파일 아웃 처리
                  setProfileImgUrl("/avatar.png"); // 기본 프레임 스킨 복원
                }}
                disabled={isImageUploading}
                className="text-red-500 hover:bg-red-50 font-bold"
              >
                삭제
              </Button>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">* 1MB 이하의 JPG, PNG, WEBP 파일만 허용됩니다.</p>
          </div>
        </div>

        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="nickname" className="font-bold ml-1">닉네임</Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="rounded-xl h-11 border-slate-200"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bio" className="font-bold ml-1">자기소개</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="rounded-xl min-h-[100px] border-slate-200"
            />
          </div>
        </div>
      </section>

      {/* (2) 개인정보 및 연락처 */}
      <section className="space-y-6">
        <div className="space-y-1">
          <h3 className="text-xl font-bold">개인정보 및 보안</h3>
          <p className="text-sm text-slate-500">계정 관리와 본인 인증을 위한 정보입니다.</p>
        </div>
        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-slate-400 flex items-center gap-2 ml-1">
              티어 <Lock size={12} />
            </Label>
            <div className="h-11 px-4 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between cursor-not-allowed">
              <span className="text-slate-700 text-sm font-bold">
                {getTierLabel(info?.tier)} Tier
              </span>
              <Badge variant="outline" className={`font-black text-[10px] uppercase tracking-tight py-0.5 px-2 rounded-full ${getTierBadgeStyle(info?.tier || "4")}`}>
                Active
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-400 flex items-center gap-2 ml-1">
              계정 생성일 <Lock size={12} />
            </Label>
            <div className="h-11 px-4 bg-slate-100 border border-slate-200 rounded-xl flex items-center text-slate-500 text-sm font-medium cursor-not-allowed">
              {formattedDate}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-400 flex items-center gap-2 ml-1">이메일 <Lock size={12} /></Label>
            <div className="h-11 px-4 bg-slate-100 border border-slate-200 rounded-xl flex items-center text-slate-500 text-sm font-medium cursor-not-allowed">
              {info?.email || "dy.park@dankook.ac.kr"}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="org" className="font-bold ml-1">소속</Label>
            <Input
              id="org"
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              className="rounded-xl h-11 border-slate-200"
            />
          </div>
        </div>
      </section>

      {/* (3) 관심 분야 태그 렌더링 */}
      <section className="space-y-6">
        <div className="space-y-1">
          <h3 className="text-xl font-bold">커리어 정보</h3>
          <p className="text-sm text-slate-500">포트폴리오나 챌린지 매칭에 활용되는 정보입니다.</p>
        </div>
        <Separator />

        <div className="grid gap-6">
          <div className="grid gap-3">
            <Label className="font-bold ml-1">주요 관심 분야</Label>

            {/* 태그 입력 폼 패널 */}
            <div className="flex gap-2 max-w-md mb-1">
              <Input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault(); // Form 서브밋 방지
                    handleAddTag();
                  }
                }}
                placeholder="예: Reverse Engineering, Web Hacking"
                className="rounded-xl h-9 text-xs border-slate-200"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddTag}
                className="h-9 rounded-xl px-4 text-xs font-bold shrink-0"
              >
                추가
              </Button>
            </div>

            {/* 태그 리스트 렌더링 팩 */}
            <div className="flex flex-wrap gap-2 min-h-[32px]">
              {(interests || []).map((tag: string) => (
                <Badge
                  key={tag}
                  className="pl-3 pr-1.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100/80 border-none rounded-lg font-bold flex items-center gap-1.5 transition-colors"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:bg-indigo-200/60 rounded-md p-0.5 transition-colors"
                  >
                    <X size={12} className="text-indigo-500 hover:text-indigo-900" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="flex justify-end gap-3 pt-6">
        <Button variant="outline" className="rounded-xl px-6">취소</Button>
        <Button
          onClick={handleUpdateProfile}
          disabled={isUpdating}
          className="bg-indigo-600 hover:bg-indigo-700 rounded-xl px-8 shadow-lg shadow-indigo-100 font-bold"
        >
          {isUpdating ? "저장 중..." : "모든 변경사항 저장"}
        </Button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. 보안 및 계정 섹션 */
/* -------------------------------------------------------------------------- */
function SecuritySection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isChanging, setIsChanging] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword.trim() || !newPassword.trim()) {
      alert("비밀번호 항목을 모두 입력해주세요.");
      return;
    }

    setIsChanging(true);
    const token = localStorage.getItem("token");

    try {
      const res = await fetch("https://diveon.net/api/profile/password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: currentPassword,
          newPassword: newPassword
        })
      });

      if (res.ok) {
        alert("비밀번호가 안전하게 변경되었습니다.");
        setCurrentPassword("");
        setNewPassword("");
      } else if (res.status === 401) {
        // 명세서 규격: 401 현재 비밀번호 불일치 예외 분기
        alert("현재 비밀번호가 일치하지 않습니다. 다시 확인해주세요.");
      } else {
        alert("비밀번호 변경 실패: 보안 요구 규격을 확인하세요.");
      }
    } catch (e) {
      console.error(e);
      alert("보안 인프라 통신 중 장애가 발생했습니다.");
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <div className="space-y-1">
        <h3 className="text-xl font-bold">보안 및 계정</h3>
        <p className="text-sm text-slate-500">비밀번호 변경 및 계정 보안 설정을 관리합니다.</p>
      </div>
      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-md">비밀번호 변경</CardTitle>
          <CardDescription>보안을 위해 주기적으로 비밀번호를 변경하는 것이 좋습니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="currentPassword">현재 비밀번호</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="현재 설정된 비밀번호 입력"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="newPassword">새 비밀번호</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="최소 8자 이상의 새 비밀번호 입력"
            />
          </div>
          <Button
            variant="secondary"
            onClick={handleChangePassword}
            disabled={isChanging}
            className="font-bold"
          >
            {isChanging ? "처리 중..." : "비밀번호 업데이트"}
          </Button>
        </CardContent>
      </Card>

      <div className="p-4 border rounded-xl flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-bold flex items-center gap-2">
            <ShieldCheck className="text-green-500 w-4 h-4" /> 2단계 인증 (2FA)
          </p>
          <p className="text-xs text-slate-500">로그인 시 OTP 번호를 추가로 확인합니다.</p>
        </div>
        <Switch />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. 알림 설정 섹션 */
/* -------------------------------------------------------------------------- */
function NotificationSection() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <div className="space-y-1">
        <h3 className="text-xl font-bold">알림 설정</h3>
        <p className="text-sm text-slate-500">플랫폼 활동에 대한 알림 수신 방식을 선택합니다.</p>
      </div>
      <Separator />

      <div className="space-y-4">
        <NotificationToggle title="내 풀이 성공 알림" desc="제출한 코드가 정답일 때 알림을 받습니다." defaultChecked />
        <NotificationToggle title="새로운 댓글 알림" desc="내 글이나 풀이에 댓글이 달리면 알려줍니다." defaultChecked />
        <NotificationToggle title="대회 시작 알림" desc="신청한 대회가 시작되기 1시간 전에 알림을 보냅니다." />
        <NotificationToggle title="마케팅 정보 수신" desc="새로운 이벤트와 기능 소식을 이메일로 받습니다." />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. 테마 및 외관 섹션 */
/* -------------------------------------------------------------------------- */
function AppearanceSection() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <div className="space-y-1">
        <h3 className="text-xl font-bold">테마 및 외관</h3>
        <p className="text-sm text-slate-500">사용자 환경에 맞는 테마를 설정합니다.</p>
      </div>
      <Separator />

      <div className="space-y-4">
        <Label>애플리케이션 테마</Label>
        <RadioGroup defaultValue="system" className="grid grid-cols-3 gap-4">
          <ThemeCard value="light" label="라이트 모드" icon={<Sun size={20} />} />
          <ThemeCard value="dark" label="다크 모드" icon={<Moon size={20} />} />
          <ThemeCard value="system" label="시스템 설정" icon={<Laptop size={20} />} />
        </RadioGroup>
      </div>

      <div className="space-y-4 pt-4">
        <Label>언어 설정 (Language)</Label>
        <Select defaultValue="ko">
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="언어 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ko">한국어 (Korean)</SelectItem>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="jp">日本語 (Japanese)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. 대원 능력치 차트 분석 섹션 (카테고리 키 소문자/대문자 정규화 이식 완료) */
/* -------------------------------------------------------------------------- */
function ChartSection({ data }: { data: any }) {
  // 토큰 및 세션 정보 획득
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // [STATE] 서브 메뉴 토글 및 필터 제어
  const [subTab, setSubTab] = useState<"solved" | "failed" | "authored" | "groups" | "contests">("solved");
  const [visibility, setVisibility] = useState<string>("");
  const [listData, setListData] = useState<any[]>([]);
  const [isSubLoading, setIsSubLoading] = useState(false);

  // [STATE] 오각형 차트용 실시간 API 데이터 풀
  const [categoryStats, setCategoryStats] = useState<Record<string, number>>({
    process: 0,
    memory: 0,
    kernel: 0,
    thread: 0,
    filesystem: 0
  });
  const [isChartLoading, setIsChartLoading] = useState(true);

  // 1. [EFFECT] 오각형 차트 전용 실시간 카테고리 스태츠 로드 체인
  useEffect(() => {
    const fetchChartStats = async () => {
      if (!token) return;
      try {
        const res = await fetch("https://diveon.net/api/profile/category-stats", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          }
        });

        if (res.ok) {
          const json = await res.json();
          const rawScores = json?.data?.categoryScores;

          if (rawScores) {
            // [핵심] API 응답 객체의 모든 키값을 소문자로 일괄 정규화하여 대소문자 차이 흡수
            const normalizedScores: Record<string, number> = {};
            Object.keys(rawScores).forEach((key) => {
              normalizedScores[key.toLowerCase()] = Number(rawScores[key]) || 0;
            });

            setCategoryStats(normalizedScores);
          }
        }
      } catch (err) {
        console.error("카테고리 통계 조회 인프라 통신 실패:", err);
      } finally {
        setIsChartLoading(false);
      }
    };

    fetchChartStats();
  }, [token]);

  // 2. [EFFECT] 하단 리스트업 제어 체인 (푼 문제, 그룹, 대회 등)
  useEffect(() => {
    const fetchSubTabData = async () => {
      if (!token) return;
      setIsSubLoading(true);
      try {
        let url = `https://diveon.net/api/profile/problems/${subTab}?page=1`;

        if (subTab === "groups" || subTab === "contests") {
          url = `https://diveon.net/api/profile/${subTab}?page=1`;
        } else if (visibility) {
          url += `&visibility=${visibility}`;
        }

        const res = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          }
        });

        if (res.ok) {
          const json = await res.json();
          if (subTab === "groups") setListData(json?.data?.groups || []);
          else if (subTab === "contests") setListData(json?.data?.contests || []);
          else setListData(json?.data?.problems || []);
        } else {
          setListData([]);
        }
      } catch (err) {
        console.error("서브 탭 데이터 연동 오류:", err);
        setListData([]);
      } finally {
        setIsSubLoading(false);
      }
    };

    fetchSubTabData();
  }, [subTab, visibility, token]);

  // 카테고리 점수 안전 가출출 (소문자/대문자/공백 키 안전 매핑)
  const processScore = categoryStats.process ?? categoryStats.Process ?? 0;
  const memoryScore = categoryStats.memory ?? categoryStats.Memory ?? 0;
  const kernelScore = categoryStats.kernel ?? categoryStats.Kernel ?? 0;
  const threadScore = categoryStats.thread ?? categoryStats.Thread ?? 0;
  const fileSystemScore = categoryStats.filesystem ?? categoryStats.FileSystem ?? categoryStats["file system"] ?? 0;

  // 동적 MAX 값 계산
  const scoreValues = [processScore, memoryScore, kernelScore, threadScore, fileSystemScore];
  const maxScore = Math.max(...scoreValues);
  const dynamicMax = maxScore > 0 ? maxScore : 100;

  // Recharts 바인딩용 배열 (화면 표시 레이블은 깔끔하게 대문자 표기)
  const formattedChartData = [
    { subject: "Process", depth: processScore },
    { subject: "Memory", depth: memoryScore },
    { subject: "Kernel", depth: kernelScore },
    { subject: "Thread", depth: threadScore },
    { subject: "File System", depth: fileSystemScore },
  ];

  // 공용 수심 배지 테마 렌더러
  const renderDepthBadge = (diff: string) => {
    const labels: Record<string, string> = { "1": "100m", "2": "300m", "3": "500m", "4": "1,000m", "5": "3,000m+" };
    return (
      <Badge variant="outline" className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-black border
        ${diff === "1" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : ""}
        ${diff === "2" ? "bg-amber-50 text-amber-600 border-amber-200" : ""}
        ${diff === "3" ? "bg-rose-50 text-rose-600 border-rose-100" : ""}
        ${diff === "4" ? "bg-violet-50 text-violet-700 border-violet-200" : ""}
        ${diff === "5" ? "bg-slate-900 text-white border-slate-950 shadow-sm" : ""}
      `}>
        {labels[diff] || "100m"}
      </Badge>
    );
  };

  return (
    <div className="space-y-12 animate-in fade-in-50 duration-300 pb-16">

      {/* [상단 패널] 오각형 레이더 차트 분석 스택 */}
      <div className="space-y-6">
        <div className="space-y-1">
          <h3 className="text-xl font-bold">능력치 차트</h3>
          <p className="text-sm text-slate-500">각 카테고리별로 대원님이 획득한 누적 점수 수심(m) 분포도입니다. (맞힌 문제 난이도 × 10 합산)</p>
        </div>
        <Separator />

        {isChartLoading ? (
          <div className="h-[400px] flex items-center justify-center text-slate-400 text-sm font-bold animate-pulse bg-slate-50 border rounded-2xl">
            심해 분석 시스템 가동 중...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* 오각형 차트 그래픽 패널 */}
            <Card className="col-span-12 lg:col-span-7 bg-slate-950 border-slate-900 shadow-xl overflow-hidden rounded-2xl h-[400px] flex items-center justify-center p-4">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={formattedChartData}>
                  <PolarGrid stroke="#1e293b" />
                  <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={11} fontWeight="bold" />
                  <PolarRadiusAxis angle={30} domain={[0, dynamicMax]} tick={{ fill: '#475569', fontSize: 10 }} />
                  <Radar name="최고 탐사 수심" dataKey="depth" stroke="#00D1FF" fill="#0055FF" fillOpacity={0.15} />
                </RadarChart>
              </ResponsiveContainer>
            </Card>

            {/* 카테고리별 상세 리포트 스태츠 패널 */}
            <div className="col-span-12 lg:col-span-5 space-y-3">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Live Score Details</Label>
              {formattedChartData.map((item) => (
                <div key={item.subject} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-700">{item.subject}</span>
                  <Badge variant="secondary" className="font-mono text-xs font-black text-indigo-600 bg-indigo-50 border-none">
                    {item.depth.toLocaleString()} m
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* [하단 대시보드 통합 허브] 문제/그룹/대회 5단 스위처 팩 */}
      <div className="space-y-6">
        <div className="flex flex-wrap gap-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200/50">
          <button onClick={() => { setSubTab("solved"); setVisibility(""); }} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${subTab === "solved" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:bg-white/50"}`}>🌊 푼 문제</button>
          <button onClick={() => { setSubTab("failed"); setVisibility(""); }} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${subTab === "failed" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:bg-white/50"}`}>❌ 못 푼 문제</button>
          <button onClick={() => { setSubTab("authored"); setVisibility(""); }} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${subTab === "authored" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:bg-white/50"}`}>🛠️ 출제한 문제</button>
          <button onClick={() => { setSubTab("groups"); setVisibility(""); }} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${subTab === "groups" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:bg-white/50"}`}>👥 속한 그룹</button>
          <button onClick={() => { setSubTab("contests"); setVisibility(""); }} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${subTab === "contests" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:bg-white/50"}`}>🏆 참여 대회</button>
        </div>

        {["solved", "failed", "authored"].includes(subTab) && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium pl-1">
            <span className="text-slate-400 mr-2 font-bold">필터:</span>
            {[
              { label: "전체", value: "" },
              { label: "공개 문제", value: "public" },
              { label: "그룹 문제", value: "group" },
              { label: "대회 문제", value: "contest" },
              { label: "비공개 문제", value: "private" },
            ].map((filter) => (
              <button
                key={filter.label}
                onClick={() => setVisibility(filter.value)}
                className={`px-3 py-1 rounded-full border transition-all font-bold ${visibility === filter.value
                  ? "bg-indigo-50 border-indigo-300 text-indigo-600 shadow-sm"
                  : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        )}

        <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden min-h-[250px] flex flex-col justify-between">
          <CardContent className="p-0">
            {isSubLoading ? (
              <div className="py-20 text-center text-slate-400 text-sm font-bold animate-pulse">심해 서버 엔지니어링 동기화 중...</div>
            ) : listData.length === 0 ? (
              <div className="py-20 text-center text-slate-400 text-sm font-medium">검출된 탐사 기록 데이터가 비어 있습니다.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {listData.map((item: any) => {
                  if (["solved", "failed", "authored"].includes(subTab)) {
                    return (
                      <Link
                        href={`/challenges/detail?id=${item.probId}`} // [수정 필요] 이동할 문제 상세 페이지 URL 경로를 입력하세요. (예: `/problems/${item.probId}`)
                        key={`prob-${item.probId}`}
                        className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors group"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-slate-400 group-hover:text-indigo-600 transition-colors">#{item.probId}</span>
                            <Badge variant="secondary" className="text-[10px] font-semibold bg-slate-100 text-slate-500 rounded-md py-0 px-1.5">{item.category}</Badge>
                            {subTab === "authored" && (
                              <Badge className={`text-[9px] font-black rounded border-none shadow-none px-1.5 ${item.isSolved ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
                                {item.isSolved ? "내가 풂" : "미풀이"}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm font-bold text-slate-800 line-clamp-1 group-hover:underline">{item.title}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {renderDepthBadge(item.difficulty)}
                          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">{item.author}</span>
                        </div>
                      </Link>
                    );
                  }

                  if (subTab === "groups") {
                    return (
                      <Link
                        href={`/groups/detail?id=${item.groupId}`} // [수정 필요] 이동할 그룹 상세 페이지 URL 경로를 입력하세요. (예: `/group/detail/${item.groupId}`)
                        key={`group-${item.groupId}`}
                        className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-9 w-9 border border-slate-100 rounded-xl">
                            <AvatarImage src={item.image} alt={item.title} className="object-cover" />
                            <AvatarFallback className="bg-slate-100 text-slate-500 text-xs font-bold rounded-xl">👥</AvatarFallback>
                          </Avatar>
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-slate-800 line-clamp-1 group-hover:underline">{item.title}</p>
                              <Badge className={`text-[9px] font-black border-none rounded px-1.5 ${item.role === "LEADER" ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500"}`}>{item.role}</Badge>
                            </div>
                            <p className="text-[11px] text-slate-400 font-medium">대원 수 {item.memberCount}명</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] rounded-full font-bold px-2 py-0.5 border-slate-200 text-slate-400">
                          {item.isPrivate ? "🔒 비공개" : "🌐 공개"}
                        </Badge>
                      </Link>
                    );
                  }

                  if (subTab === "contests") {
                    const isOngoing = item.status === "ONGOING";
                    const isUpcoming = item.status === "UPCOMING";
                    return (
                      <Link
                        href={`/contests/detail?id=${item.contestId}`} // [수정 필요] 이동할 대회 상세 페이지 URL 경로를 입력하세요. (예: `/contests/detail/${item.contestId}`)
                        key={`contest-${item.contestId}`}
                        className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors group"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge className={`text-[9px] font-black border-none shadow-none rounded px-1.5 ${isOngoing ? "bg-blue-50 text-blue-600 animate-pulse" :
                              isUpcoming ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-400"
                              }`}>
                              {item.status === "ENDED" ? "종료됨" : isOngoing ? "진행중" : "대기중"}
                            </Badge>
                            <Badge variant="outline" className="text-[9px] font-medium border-slate-200 text-slate-400 uppercase">{item.role}</Badge>
                          </div>
                          <p className="text-sm font-bold text-slate-800 line-clamp-1 group-hover:underline">{item.title}</p>
                        </div>
                        <div className="text-right shrink-0 font-mono text-[10px] text-slate-400 space-y-0.5 hidden sm:block">
                          <p>시작: {new Date(item.startTime).toLocaleDateString("ko-KR")} {new Date(item.startTime).toLocaleTimeString("ko-KR", { hour: '2-digit', minute: '2-digit', hour12: false })}</p>
                          <p>종료: {new Date(item.endTime).toLocaleDateString("ko-KR")} {new Date(item.endTime).toLocaleTimeString("ko-KR", { hour: '2-digit', minute: '2-digit', hour12: false })}</p>
                        </div>
                      </Link>
                    );
                  }

                  return null;
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 보조 컴포넌트들 */
/* -------------------------------------------------------------------------- */

// 사이드바 네비게이션 아이템
function SettingsNavItem({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-bold transition-all ${active ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        }`}
    >
      {icon} <span>{label}</span>
    </button>
  );
}

// 알림 토글 행
function NotificationToggle({ title, desc, defaultChecked = false }: { title: string, desc: string, defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-xl hover:bg-slate-50 transition-colors">
      <div className="space-y-0.5">
        <p className="text-sm font-bold text-slate-800">{title}</p>
        <p className="text-xs text-slate-500">{desc}</p>
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}

// 테마 선택 카드
function ThemeCard({ value, label, icon }: { value: string, label: string, icon: any }) {
  return (
    <div>
      <RadioGroupItem value={value} id={value} className="peer sr-only" />
      <Label
        htmlFor={value}
        className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-white p-4 hover:bg-slate-50 peer-data-[state=checked]:border-slate-900 peer-data-[state=checked]:bg-slate-50 cursor-pointer"
      >
        {icon}
        <span className="mt-2 text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </Label>
    </div>
  );
}

// 2. 헤더 메뉴 전용 보조 컴포넌트 [추가]
function NavMenuLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all active:scale-95"
    >
      <span className="text-slate-400 group-hover:text-slate-900">{icon}</span>
      {label}
    </Link>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-slate-400 font-bold animate-pulse">설정 로딩 중...</div>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}