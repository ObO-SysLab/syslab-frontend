"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Search, LogOut, User, Menu, Lock, Bell, Paintbrush, Trash2, Camera, ShieldCheck, 
  Laptop, Moon, Sun, LayoutGrid, Trophy, Users, BarChart3, ShoppingBag 
} from "lucide-react";
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


export default function SettingsPage() {
  // 현재 로그인 상태를 관리 (나중에는 실제 토큰 유무로 판단)
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  // [상태 관리] 현재 활성화된 탭 (profile, security, notifications, appearance)
  const [activeTab, setActiveTab] = useState("profile");

  // 프로필 데이터를 저장할 상태
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

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
            <NavMenuLink href="/challenges" icon={<LayoutGrid size={18} />} label="챌린지" />
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
                  <AvatarImage src="/avatar.png" alt="User" />
                  <AvatarFallback className="bg-slate-100 text-xs font-bold text-slate-600">DY</AvatarFallback>
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
              <ProfileSection data={profileData} />
            )
          )}
          {activeTab === "security" && <SecuritySection />}
          {activeTab === "notifications" && <NotificationSection />}
          {activeTab === "appearance" && <AppearanceSection />}
        </section>

      </main>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 1. 프로필 및 개인정보 관리 섹션 */
/* -------------------------------------------------------------------------- */
function ProfileSection({ data }: { data: any }) {
  // [기능 수정] API 응답 구조(data.data.user_info)에 맞춰 경로 설정
  const info = data?.data?.userInfo;

  const defaultProfile = {
    nickname: info?.nickname || "박단용",
    avatar: info?.profileImgUrl || "/avatar.png",
    bio: info?.selfComment || "디지털 포렌식 전문가를 꿈꾸는 개발자입니다.",
    realName: info?.realName || "박단용",
    birth: info?.birthDate || "2003년 05월 26일",
    createdAt: info?.createdAt || "2026년 03월 05일",
    email: info?.email || "dy.park@dankook.ac.kr",
    phone: info?.phoneNumber || "010-1234-5678",
    org: info?.belong || "단국대학교 소프트웨어학과",
    // 관심 분야가 문자열로 올 경우를 대비해 처리 (배열이 아닐 경우 기본 배열 사용)
    interests: Array.isArray(info?.interest) 
      ? info.interest 
      : (info?.interest ? info.interest.split(',') : ['Digital Forensics', 'Cyber Investigation', 'System Programming', 'Malware Analysis'])
  };

  return (
    <div className="space-y-10 animate-in fade-in-50 duration-300 pb-10">
      
      {/* (1) 기본 프로필 (아바타, 닉네임, 자기소개) */}
      <section className="space-y-6">
        <div className="space-y-1">
          <h3 className="text-xl font-bold">프로필 편집</h3>
          <p className="text-sm text-slate-500">다른 사용자에게 보여지는 정보를 설정합니다.</p>
        </div>
        <Separator />
        
        <div className="flex items-center gap-6 p-6 bg-slate-50/50 rounded-3xl border border-slate-100">
          <div className="relative group cursor-pointer">
            <Avatar className="w-24 h-24 border-4 border-white shadow-xl">
              {/* [수정] 아바타 이미지 연결 */}
              <AvatarImage src={defaultProfile.avatar} />
              <AvatarFallback className="bg-indigo-100 text-indigo-600 font-black text-xl">DY</AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={24} className="text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-bold text-slate-900">프로필 이미지</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="rounded-xl">사진 변경</Button>
              <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50">삭제</Button>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">* 5MB 이하의 JPG, PNG 파일만 가능합니다.</p>
          </div>
        </div>

        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="nickname" className="font-bold ml-1">닉네임</Label>
            {/* [수정] 닉네임 연결 */}
            <Input id="nickname" defaultValue={defaultProfile.nickname} className="rounded-xl h-11 border-slate-200" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bio" className="font-bold ml-1">자기소개</Label>
            {/* [수정] 자기소개 연결 */}
            <Textarea id="bio" defaultValue={defaultProfile.bio} className="rounded-xl min-h-[100px] border-slate-200" />
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
              실명 <Lock size={12} />
            </Label>
            {/* [수정] 실명 연결 */}
            <div className="h-11 px-4 bg-slate-100 border border-slate-200 rounded-xl flex items-center text-slate-500 text-sm font-medium cursor-not-allowed">
              {defaultProfile.realName}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-400 flex items-center gap-2 ml-1">
              생년월일 <Lock size={12} />
            </Label>
            {/* [수정] 생년월일 연결 */}
            <div className="h-11 px-4 bg-slate-100 border border-slate-200 rounded-xl flex items-center text-slate-500 text-sm font-medium cursor-not-allowed">
              {defaultProfile.birth}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-400 flex items-center gap-2 ml-1">
              계정 생성일 <Lock size={12} />
            </Label>
            {/* [수정] 계정 생성일 연결 */}
            <div className="h-11 px-4 bg-slate-100 border border-slate-200 rounded-xl flex items-center text-slate-500 text-sm font-medium cursor-not-allowed">
              {defaultProfile.createdAt}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="font-bold ml-1">이메일</Label>
            {/* [수정] 이메일 연결 */}
            <Input id="email" defaultValue={defaultProfile.email} className="rounded-xl h-11 border-slate-200" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="font-bold ml-1">전화번호</Label>
            {/* [수정] 전화번호 연결 */}
            <Input id="phone" defaultValue={defaultProfile.phone} className="rounded-xl h-11 border-slate-200" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="org" className="font-bold ml-1">소속</Label>
            {/* [수정] 소속 연결 */}
            <Input id="org" defaultValue={defaultProfile.org} className="rounded-xl h-11 border-slate-200" />
          </div>
        </div>
      </section>

      {/* (3) 추가 구성 요소: 기술 스택 및 관심 분야 */}
      <section className="space-y-6">
        <div className="space-y-1">
          <h3 className="text-xl font-bold">커리어 정보</h3>
          <p className="text-sm text-slate-500">포트폴리오나 챌린지 매칭에 활용되는 정보입니다.</p>
        </div>
        <Separator />
        
        <div className="grid gap-6">
          <div className="grid gap-3">
            <Label className="font-bold ml-1">주요 관심 분야</Label>
            <div className="flex flex-wrap gap-2">
              {/* [수정] 관심 분야 태그 연결 */}
              {defaultProfile.interests.map((tag: string) => (
                <Badge key={tag} className="px-3 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 cursor-pointer border-none rounded-lg">
                  #{tag}
                </Badge>
              ))}
              <Button variant="outline" size="sm" className="rounded-lg h-7 text-[10px]">+ 추가</Button>
            </div>
          </div>
        </div>
      </section>

      <div className="flex justify-end gap-3 pt-6">
        <Button variant="outline" className="rounded-xl px-6">취소</Button>
        <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-xl px-8 shadow-lg shadow-indigo-100 font-bold">
          모든 변경사항 저장
        </Button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. 보안 및 계정 섹션 */
/* -------------------------------------------------------------------------- */
function SecuritySection() {
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
            <Label>현재 비밀번호</Label>
            <Input type="password" />
          </div>
          <div className="grid gap-2">
            <Label>새 비밀번호</Label>
            <Input type="password" />
          </div>
          <Button variant="secondary">비밀번호 업데이트</Button>
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
/* 보조 컴포넌트들 */
/* -------------------------------------------------------------------------- */

// 사이드바 네비게이션 아이템
function SettingsNavItem({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-bold transition-all ${
        active ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
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