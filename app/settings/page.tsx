"use client";
import { logout } from "@/lib/authSession";
import { loginHref } from "@/lib/request";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { User, Lock, Bell, Paintbrush, Trash2, X, ShieldCheck, Laptop, Moon, Sun, BarChart3, Camera, Users } from "lucide-react";
import { BarChart, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge"
import { getLevelLabel } from "@/lib/utils";
import { TierBadge } from "@/components/dv";
import { Header } from "@/components/Header";
import { readPref, savePref, type ThemePref } from "@/lib/theme";
import { mergeCategoryScores } from "@/lib/categoryScores";
import { NotificationPrefsSection } from "@/components/settings/NotificationPrefsSection";
import { WithdrawDialog } from "@/components/settings/WithdrawDialog";


function SettingsContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  // 현재 로그인 상태를 관리 (나중에는 실제 토큰 유무로 판단)
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // [상태 관리] 현재 활성화된 탭 (profile, security, notifications, appearance)
  const [activeTab, setActiveTab] = useState(tabParam || "profile");

  // 프로필 데이터를 저장할 상태
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userImgUrl, setUserImgUrl] = useState("");
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // 설정은 내 계정 화면이다. 로그인하지 않았거나 토큰이 만료됐으면 빈 프로필 대신 로그인 화면으로 보낸다.
  const goSignIn = () => window.location.replace(loginHref());

  // 페이지 로드 시 토큰을 사용하여 데이터 요청
  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token"); // 저장된 토큰 가져오기
      if (!token) {
        goSignIn();
        return;
      }
      setIsLoggedIn(true);

      try {
        const response = await fetch("https://diveon.net/api/profile/show", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          }
        });

        if (response.status === 401) {
          goSignIn();
          return;
        }
        if (response.ok) {
          const result = await response.json();
          setProfileData(result); // 서버에서 받은 데이터 저장
          setUserImgUrl(result?.data?.userInfo?.profileImgUrl || "");
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
    <div className="min-h-screen bg-panel text-ink font-sans">

      <Header
        isLoggedIn={isLoggedIn}
        userImgUrl={userImgUrl}
        activeMenu="none"
        onLogout={() => { if (logout()) window.location.replace("/"); }}
      />

      {!isLoggedIn ? (
        <div className="py-20 text-center text-ink-subtle font-bold" role="status">로그인 화면으로 이동 중...</div>
      ) : (
      <main className="dv-shell pt-10 grid grid-cols-1 md:grid-cols-12 gap-10 pb-20">

        {/* [A] 좌측 사이드바 메뉴 (4칸) */}
        <aside className="col-span-12 md:col-span-3 space-y-2">
          <div className="px-3 mb-4">
            <h1 className="text-2xl font-bold tracking-[-0.02em]">설정</h1>
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
            <button
              type="button"
              onClick={() => setWithdrawOpen(true)}
              disabled={!profileData?.data?.userInfo?.nickname}
              className="flex items-center gap-3 text-sm font-bold text-danger hover:text-danger transition-colors disabled:opacity-40"
            >
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
              <div className="py-20 text-center text-ink-subtle font-bold">프로필 로드 중...</div>
            ) : (
              <ProfileSection
                data={profileData}
                pendingImageFile={pendingImageFile}
                setPendingImageFile={setPendingImageFile}
              />
            )
          )}
          {activeTab === "security" && <SecuritySection />}
          {activeTab === "notifications" && <NotificationPrefsSection />}
          {activeTab === "appearance" && <AppearanceSection />}
          {activeTab === "chart" && <ChartSection data={profileData} />}
        </section>

      </main>
      )}

      <WithdrawDialog
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        nickname={profileData?.data?.userInfo?.nickname ?? ""}
      />
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
    : "-";
  const [nickname, setNickname] = useState(info?.nickname || "");
  const [bio, setBio] = useState(info?.selfComment || "");
  const [org, setOrg] = useState(info?.belong || "");
  const [profileImgUrl, setProfileImgUrl] = useState(info?.profileImgUrl || "");
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [interests, setInterests] = useState<string[]>(
    Array.isArray(info?.interest)
      ? info.interest.map((s: string) => String(s).trim()).filter(Boolean)
      : info?.interest && typeof info.interest === "string"
        ? info.interest.split(",").map((s: string) => s.trim()).filter(Boolean)
        : []
  );
  // 삭제를 누르면 저장할 때 서버의 사진도 지운다(새 사진을 고르면 취소).
  const [removeImage, setRemoveImage] = useState(false);

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
    setRemoveImage(false);
    setProfileImgUrl(URL.createObjectURL(file));
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
        // 2단계: 텍스트 수정 성공 직후, 새 사진은 올리고 삭제를 눌렀다면 서버의 사진을 지운다.
        let imageError = "";
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
          if (!imgRes.ok) imageError = "프로필 정보는 저장했지만 사진을 올리지 못했습니다.";
        } else if (removeImage) {
          const delRes = await fetch("https://diveon.net/api/users/me/profile-image", {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (!delRes.ok) imageError = "프로필 정보는 저장했지만 사진을 지우지 못했습니다.";
        }

        alert(imageError || "프로필을 저장했습니다.");
        setPendingImageFile(null); // 전송 완료 후 주머니 비우기
        setRemoveImage(false);

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
          <p className="text-sm text-ink-muted">다른 사용자에게 보여지는 정보를 설정합니다.</p>
        </div>
        <Separator />

        <div className="flex items-center gap-6 p-6 bg-raised/50 rounded-3xl border border-line">

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
            <Avatar className="w-24 h-24 border-4 border-panel shadow-xl transition-transform active:scale-95">
              {/* 기 가공된 profileImgUrl 상태 소스 연결 */}
              {profileImgUrl && <AvatarImage src={profileImgUrl} />}
              <AvatarFallback className="bg-primary/15 text-primary font-black text-xl">
                {isImageUploading ? "..." : (nickname.trim().charAt(0).toUpperCase() || <User size={32} aria-hidden />)}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={24} className="text-white" />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-bold text-ink">
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
                  setProfileImgUrl(""); // 기본 모양으로 표시
                  setRemoveImage(true); // 저장할 때 서버의 사진도 지운다
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                disabled={isImageUploading || !profileImgUrl}
                className="text-danger hover:bg-danger/10 font-bold"
              >
                삭제
              </Button>
            </div>
            <p className="text-xs text-ink-subtle font-medium">* 1MB 이하의 JPG, PNG, WEBP 파일만 허용됩니다.</p>
          </div>
        </div>

        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="nickname" className="font-bold ml-1">닉네임</Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="rounded-xl h-11 border-line"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bio" className="font-bold ml-1">자기소개</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="rounded-xl min-h-[100px] border-line"
            />
          </div>
        </div>
      </section>

      {/* (2) 개인정보 및 연락처 */}
      <section className="space-y-6">
        <div className="space-y-1">
          <h3 className="text-xl font-bold">개인정보 및 보안</h3>
          <p className="text-sm text-ink-muted">계정 관리와 본인 인증을 위한 정보입니다.</p>
        </div>
        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-ink-subtle flex items-center gap-2 ml-1">
              티어 <Lock size={12} />
            </Label>
            {/* 홈·랭킹·그룹과 같은 티어 배지 */}
            <div className="h-11 px-2 bg-raised border border-line rounded-xl flex items-center cursor-not-allowed">
              <TierBadge tier={info?.tier} size="sm" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-ink-subtle flex items-center gap-2 ml-1">
              계정 생성일 <Lock size={12} />
            </Label>
            <div className="h-11 px-4 bg-raised border border-line rounded-xl flex items-center text-ink-muted text-sm font-medium cursor-not-allowed">
              {formattedDate}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-ink-subtle flex items-center gap-2 ml-1">이메일 <Lock size={12} /></Label>
            <div className="h-11 px-4 bg-raised border border-line rounded-xl flex items-center text-ink-muted text-sm font-medium cursor-not-allowed">
              {info?.email || "-"}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="org" className="font-bold ml-1">소속</Label>
            <Input
              id="org"
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              className="rounded-xl h-11 border-line"
            />
          </div>
        </div>
      </section>

      {/* (3) 관심 분야 태그 렌더링 */}
      <section className="space-y-6">
        <div className="space-y-1">
          <h3 className="text-xl font-bold">커리어 정보</h3>
          <p className="text-sm text-ink-muted">포트폴리오나 챌린지 매칭에 활용되는 정보입니다.</p>
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
                className="rounded-xl h-9 text-xs border-line"
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
                  className="pl-3 pr-1.5 py-1.5 bg-primary/10 text-primary hover:bg-primary/10 border-none rounded-lg font-bold flex items-center gap-1.5 transition-colors"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:bg-primary/10 rounded-md p-0.5 transition-colors"
                  >
                    <X size={12} className="text-primary hover:text-primary" />
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
          className="bg-primary hover:bg-primary-hover rounded-xl px-8 shadow-lg shadow-black/40 font-bold"
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
        <p className="text-sm text-ink-muted">비밀번호 변경 및 계정 보안 설정을 관리합니다.</p>
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

    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. 테마 및 외관 섹션 */
/* -------------------------------------------------------------------------- */
function AppearanceSection() {
  // 기기마다 저장한다. 고르면 바로 적용된다(ThemeScope가 html 속성을 맞춘다).
  const [pref, setPref] = useState<ThemePref>("dark");
  useEffect(() => { setPref(readPref()); }, []);
  const choose = (value: string) => {
    const next = value as ThemePref;
    setPref(next);
    savePref(next);
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <div className="space-y-1">
        <h3 className="text-xl font-bold">테마 및 외관</h3>
        <p className="text-sm text-ink-muted">이 기기에서 쓸 화면 테마를 고릅니다.</p>
      </div>
      <Separator />

      <div className="space-y-4">
        <Label>화면 테마</Label>
        <RadioGroup value={pref} onValueChange={choose} className="grid grid-cols-3 gap-4">
          <ThemeCard value="light" label="라이트" icon={<Sun size={20} />} />
          <ThemeCard value="dark" label="다크" icon={<Moon size={20} />} />
          <ThemeCard value="system" label="시스템 설정" icon={<Laptop size={20} />} />
        </RadioGroup>
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
  // 목록을 "어느 탭/필터로 받아온 데이터인지"와 함께 저장한다.
  // 탭을 바꾸면 subTab은 즉시 바뀌지만 fetch는 그 뒤에 끝나므로, 태그 없이 저장하면
  // 이전 탭의 데이터(예: 문제 목록)를 새 탭의 렌더러(예: 그룹)로 그리게 되어
  // key가 `group-undefined`로 중복되는 등 오류가 났다.
  const [listState, setListState] = useState<{ key: string; items: any[] } | null>(null);
  const listKey = `${subTab}|${visibility}`;
  const isSubLoading = listState?.key !== listKey;
  const listData = isSubLoading ? [] : listState!.items;

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
            // 같은 분야를 표기만 다르게 받으면 합친다(lib/categoryScores.ts)
            const normalizedScores = mergeCategoryScores(rawScores);

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
    // 탭을 빠르게 바꿀 때 먼저 보낸 요청의 응답이 늦게 도착해 덮어쓰지 않도록 무시 플래그를 둔다.
    let ignore = false;
    const key = `${subTab}|${visibility}`;
    const setListData = (items: any[]) => {
      if (!ignore) setListState({ key, items: Array.isArray(items) ? items : [] });
    };

    const fetchSubTabData = async () => {
      if (!token) {
        setListData([]);
        return;
      }
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
      }
    };

    fetchSubTabData();
    return () => {
      ignore = true;
    };
  }, [subTab, visibility, token]);

  // 카테고리 점수 안전 가출출 (소문자/대문자/공백 키 안전 매핑)
  const processScore = categoryStats.process ?? 0;
  const memoryScore = categoryStats.memory ?? 0;
  const kernelScore = categoryStats.kernel ?? 0;
  const threadScore = categoryStats.thread ?? 0;
  const fileSystemScore = categoryStats.filesystem ?? 0;

  // 동적 MAX 값 계산 (실제 최댓값의 125%로 틀을 더 크게 잡아서 꽉 차는 답답함 해소)
  const scoreValues = [processScore, memoryScore, kernelScore, threadScore, fileSystemScore];
  const maxScore = Math.max(...scoreValues);
  // 가장 높은 점수보다 25% 넓은 수치를 오각형의 바깥 테두리 기준으로 설정합니다.
  const chartDomainMax = maxScore > 0 ? Math.ceil(maxScore * 1.25) : 100;

  // Recharts 바인딩용 배열 (화면 표시 레이블은 깔끔하게 대문자 표기)
  const formattedChartData = [
    { subject: "Process", depth: processScore },
    { subject: "Memory", depth: memoryScore },
    { subject: "Kernel", depth: kernelScore },
    { subject: "Thread", depth: threadScore },
    { subject: "File System", depth: fileSystemScore },
  ];

  // 공용 수심 배지 테마 렌더러
  const renderDepthBadge = (rawDiff: string | number) => {
    // 난이도는 Lvl 1~7 (lib/utils.ts getLevelLabel 기준). 6·7은 5와 같은 최심부 스타일로 표시.
    const diff = String(rawDiff ?? "");
    return (
      <Badge variant="outline" className={`rounded-full px-2 py-0.5 text-xs font-mono font-black border
        ${diff === "1" ? "bg-success/10 text-success border-success/30" : ""}
        ${diff === "2" ? "bg-warning/10 text-warning border-warning/30" : ""}
        ${diff === "3" ? "bg-danger/10 text-danger border-danger/20" : ""}
        ${diff === "4" ? "bg-coral/10 text-coral border-coral/30" : ""}
        ${["5", "6", "7"].includes(diff) ? "bg-raised text-ink border-line shadow-sm" : ""}
      `}>
        {getLevelLabel(diff)}
      </Badge>
    );
  };

  return (
    <div className="space-y-12 animate-in fade-in-50 duration-300 pb-16">

      {/* [상단 패널] 오각형 레이더 차트 분석 스택 */}
      <div className="space-y-6">
        <div className="space-y-1">
          <h3 className="text-xl font-bold">능력치 차트</h3>
          <p className="text-sm text-ink-muted">각 카테고리별로 대원님이 획득한 누적 점수 수심(m) 분포도입니다. (맞힌 문제 난이도 × 10 합산)</p>
        </div>
        <Separator />

        {isChartLoading ? (
          <div className="h-[400px] flex items-center justify-center text-ink-subtle text-sm font-bold animate-pulse bg-canvas border rounded-2xl">
            심해 분석 시스템 가동 중...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* 오각형 차트 그래픽 패널 */}
            <Card className="dv-radar col-span-12 lg:col-span-7 bg-deep border-line shadow-xl overflow-hidden rounded-2xl h-[400px] flex items-center justify-center p-4">
              <ResponsiveContainer width="100%" height="100%">
                {/* outerRadius를 60% 정도로 지정하고 domain에 여유를 두어 꼭짓점 여백을 확보합니다. */}
                <RadarChart cx="50%" cy="50%" outerRadius="60%" data={formattedChartData}>
                  {/* 색은 app/globals.css .dv-radar에서 테마 토큰으로 칠한다(라이트·다크 공통). */}
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" fontSize={11} fontWeight="bold" />
                  {/* 범위만 정하고 축은 그리지 않는다: 30° 사선과 기울어진 눈금 숫자가 뜻 없는 선처럼 보였다. 점수는 오른쪽 목록에 있다. */}
                  <PolarRadiusAxis domain={[0, chartDomainMax]} tick={false} axisLine={false} />
                  <Radar name="최고 탐사 수심" dataKey="depth" />
                </RadarChart>
              </ResponsiveContainer>
            </Card>

            {/* 카테고리별 상세 리포트 스태츠 패널 */}
            <div className="col-span-12 lg:col-span-5 space-y-3">
              <Label className="text-xs font-bold text-ink-subtle uppercase tracking-wider ml-1">점수 상세</Label>
              {formattedChartData.map((item) => (
                <div key={item.subject} className="p-3 bg-canvas border border-line rounded-xl flex items-center justify-between">
                  <span className="text-sm font-bold text-ink">{item.subject}</span>
                  <Badge variant="secondary" className="font-mono text-xs font-black text-primary bg-primary/10 border-none">
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
        <div className="flex flex-wrap gap-1 bg-raised p-1.5 rounded-xl border border-line/50">
          <button onClick={() => { setSubTab("solved"); setVisibility(""); }} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${subTab === "solved" ? "bg-raised border border-line-strong text-ink shadow-sm" : "text-ink-muted hover:bg-raised/50"}`}>푼 문제</button>
          <button onClick={() => { setSubTab("failed"); setVisibility(""); }} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${subTab === "failed" ? "bg-raised border border-line-strong text-ink shadow-sm" : "text-ink-muted hover:bg-raised/50"}`}>못 푼 문제</button>
          <button onClick={() => { setSubTab("authored"); setVisibility(""); }} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${subTab === "authored" ? "bg-raised border border-line-strong text-ink shadow-sm" : "text-ink-muted hover:bg-raised/50"}`}>출제한 문제</button>
          <button onClick={() => { setSubTab("groups"); setVisibility(""); }} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${subTab === "groups" ? "bg-raised border border-line-strong text-ink shadow-sm" : "text-ink-muted hover:bg-raised/50"}`}>속한 그룹</button>
          <button onClick={() => { setSubTab("contests"); setVisibility(""); }} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${subTab === "contests" ? "bg-raised border border-line-strong text-ink shadow-sm" : "text-ink-muted hover:bg-raised/50"}`}>참여 대회</button>
        </div>

        {["solved", "failed", "authored"].includes(subTab) && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium pl-1">
            <span className="text-ink-subtle mr-2 font-bold">필터:</span>
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
                  ? "bg-primary/10 border-primary/50 text-primary shadow-sm"
                  : "bg-panel border-line text-ink-muted hover:border-line-strong"
                  }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        )}

        <Card className="border border-line shadow-sm rounded-2xl overflow-hidden min-h-[250px] flex flex-col justify-between">
          <CardContent className="p-0">
            {isSubLoading ? (
              <div className="py-20 text-center text-ink-subtle text-sm font-bold animate-pulse">심해 서버 엔지니어링 동기화 중...</div>
            ) : listData.length === 0 ? (
              <div className="py-20 text-center text-ink-subtle text-sm font-medium">검출된 탐사 기록 데이터가 비어 있습니다.</div>
            ) : (
              <div className="divide-y divide-line">
                {listData.map((item: any) => {
                  if (["solved", "failed", "authored"].includes(subTab)) {
                    return (
                      <Link
                        href={`/challenges/detail?id=${item.probId}`} // [수정 필요] 이동할 문제 상세 페이지 URL 경로를 입력하세요. (예: `/problems/${item.probId}`)
                        key={`prob-${item.probId}`}
                        className="flex items-center justify-between p-4 hover:bg-raised/50 transition-colors group"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-ink-subtle group-hover:text-primary transition-colors">#{item.probId}</span>
                            <Badge variant="secondary" className="text-xs font-semibold bg-raised text-ink-muted rounded-md py-0 px-1.5">{item.category}</Badge>
                            {subTab === "authored" && (
                              <Badge className={`text-xs font-black rounded border-none shadow-none px-1.5 ${item.isSolved ? "bg-success/10 text-success" : "bg-raised text-ink-muted"}`}>
                                {item.isSolved ? "내가 풂" : "미풀이"}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm font-bold text-ink line-clamp-1 group-hover:underline">{item.title}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {renderDepthBadge(item.difficulty)}
                          <span className="text-xs text-ink-subtle font-mono hidden sm:inline">{item.author}</span>
                        </div>
                      </Link>
                    );
                  }

                  if (subTab === "groups") {
                    return (
                      <Link
                        href={`/groups/detail?id=${item.groupId}`} // [수정 필요] 이동할 그룹 상세 페이지 URL 경로를 입력하세요. (예: `/group/detail/${item.groupId}`)
                        key={`group-${item.groupId}`}
                        className="flex items-center justify-between p-4 hover:bg-raised/50 transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-9 w-9 border border-line rounded-xl">
                            <AvatarImage src={item.image} alt={item.title} className="object-cover" />
                            <AvatarFallback className="bg-raised text-ink-muted text-xs font-bold rounded-xl"><Users className="h-4 w-4" /></AvatarFallback>
                          </Avatar>
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-ink line-clamp-1 group-hover:underline">{item.title}</p>
                              <Badge className={`text-xs font-black border-none rounded px-1.5 ${item.role === "LEADER" ? "bg-warning/10 text-warning" : "bg-raised text-ink-muted"}`}>{item.role}</Badge>
                            </div>
                            <p className="text-xs text-ink-subtle font-medium">대원 수 {item.memberCount}명</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs rounded-full font-bold px-2 py-0.5 border-line text-ink-subtle">
                          {item.isPrivate ? "비공개" : "공개"}
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
                        className="flex items-center justify-between p-4 hover:bg-raised/50 transition-colors group"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge className={`text-xs font-black border-none shadow-none rounded px-1.5 ${isOngoing ? "bg-primary/10 text-primary animate-pulse" :
                              isUpcoming ? "bg-warning/10 text-warning" : "bg-raised text-ink-subtle"
                              }`}>
                              {item.status === "ENDED" ? "종료됨" : isOngoing ? "진행중" : "대기중"}
                            </Badge>
                            <Badge variant="outline" className="text-xs font-medium border-line text-ink-subtle uppercase">{item.role}</Badge>
                          </div>
                          <p className="text-sm font-bold text-ink line-clamp-1 group-hover:underline">{item.title}</p>
                        </div>
                        <div className="text-right shrink-0 font-mono text-xs text-ink-subtle space-y-0.5 hidden sm:block">
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
      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-bold transition-all ${active ? "bg-raised border border-line-strong text-ink shadow-md" : "text-ink-muted hover:bg-raised hover:text-ink"
        }`}
    >
      {icon} <span>{label}</span>
    </button>
  );
}

// 테마 선택 카드
function ThemeCard({ value, label, icon }: { value: string, label: string, icon: any }) {
  return (
    <div>
      <RadioGroupItem value={value} id={value} className="peer sr-only" />
      <Label
        htmlFor={value}
        className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-panel p-4 hover:bg-raised/60 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary-soft peer-data-[state=checked]:text-primary cursor-pointer"
      >
        {icon}
        <span className="mt-2 text-xs font-bold uppercase tracking-wider">{label}</span>
      </Label>
    </div>
  );
}


export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-panel">
        <div className="text-ink-subtle font-bold animate-pulse">설정 로딩 중...</div>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}
