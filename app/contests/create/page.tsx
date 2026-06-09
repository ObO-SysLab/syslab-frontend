"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Menu, Trophy, Settings, LogOut, Calendar, Clock, ShieldAlert, Award, Info, Plus, Bell,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function ContestCreatePage() {
  const router = useRouter();

  // [STATE] 페이지
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [groupId, setGroupId] = useState("");
  const [userImgUrl, setUserImgUrl] = useState("/avatar.png");

  // [STATE] 폼 데이터 
  const [isRewardEnabled, setIsRewardEnabled] = useState(false);
  const [prizeDescription, setPrizeDescription] = useState("");
  const [tags, setTags] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contestType, setContestType] = useState("OFFICIAL");
  const [participationType, setParticipationType] = useState("INDIVIDUAL");
  const [visibility, setVisibility] = useState("PUBLIC");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [duration, setDuration] = useState<string>("");
  const [rules, setRules] = useState("");

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

  // [API] 페이지 초기 데이터 로드
  useEffect(() => {
    const fetchInitData = async () => {
      const token = localStorage.getItem("token");
      if (token) setIsLoggedIn(true);
    }

    fetchInitData();
  }, []);

  // [API] 대회 생성
  const handleCreateContest = async () => {
    // 1. 필수값 검증
    if (!title || !description || !startTime || !endTime || !rules) {
      alert("필수 항목(*)을 모두 입력해주세요.");
      return;
    }

    // 2. 태그 처리 (쉼표로 구분된 문자열을 배열로)
    const tagsArray = tags.split(',').map(t => t.trim()).filter(t => t !== "");

    // 3. Payload (전송할 데이터 묶음)
    const payload = {
      title,
      description,
      contestType,
      participationType,
      visibility,
      tags: tagsArray,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      duration: duration ? Number(duration) : null,
      rules,
      prizeDescription: isRewardEnabled ? prizeDescription : null,
      groupId: groupId ? Number(groupId) : null // 그룹 ID가 있으면 포함
    };

    const token = localStorage.getItem("token");

    try {
      const res = await fetch('https://diveon.net/api/contests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const json = await res.json();
        alert("대회가 성공적으로 생성되었습니다!");
        // 생성된 대회의 상세 페이지로 이동
        router.push(`/contests/detail?id=${json.data.contestId}`);
      } else {
        const errorData = await res.json();
        alert(`대회 생성 실패: ${errorData.message || '입력값을 확인해주세요.'}`);
      }
    } catch (error) {
      console.error("대회 생성 에러:", error);
      alert("서버와의 통신에 실패했습니다.");
    }
  };

  // 시작/종료 시간으로 진행 시간(Hour 단위)을 계산하는 함수
  const updateDuration = (start: string, end: string) => {
    if (!start || !end) return;
    const startDate = new Date(start);
    const endDate = new Date(end);

    const diffMs = endDate.getTime() - startDate.getTime(); // 밀리초(ms) 단위 차이
    if (diffMs > 0) {
      const diffHours = diffMs / (1000 * 60 * 60); // 시간 단위로 변환
      // 소수점 첫째 자리까지 표기하되, .0으로 떨어지면 정수로 변환
      setDuration(Number(diffHours.toFixed(1)).toString());
    } else {
      setDuration(""); // 종료 시간이 시작 시간보다 빠르면 초기화
    }
  };

  // 시작 시간과 진행 시간으로 종료 시간을 계산하는 함수
  const updateEndTime = (start: string, hours: string) => {
    if (!start || !hours || isNaN(Number(hours))) return;
    const startDate = new Date(start);

    // 시작 시간에 진행 시간(Hour) 더하기
    startDate.setHours(startDate.getHours() + Number(hours));

    // datetime-local 인풋이 인식하는 포맷(YYYY-MM-DDTHH:mm)으로 변환
    const yyyy = startDate.getFullYear();
    const mm = String(startDate.getMonth() + 1).padStart(2, "0");
    const dd = String(startDate.getDate()).padStart(2, "0");
    const hh = String(startDate.getHours()).padStart(2, "0");
    const min = String(startDate.getMinutes()).padStart(2, "0");

    setEndTime(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
  };

  const handleStartTimeChange = (value: string) => {
    setStartTime(value);
    if (endTime) updateDuration(value, endTime);
  };

  const handleEndTimeChange = (value: string) => {
    setEndTime(value);
    if (startTime) updateDuration(startTime, value);
  };

  const handleDurationChange = (value: string) => {
    setDuration(value);
    if (startTime && value) updateEndTime(startTime, value);
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
      <main className="container mx-auto max-w-[1400px] pt-8 grid grid-cols-1 md:grid-cols-12 gap-8 px-6 pb-20">

        {/* [A] 좌측 안내 섹션 (3칸) */}
        <aside className="col-span-12 md:col-span-3 space-y-4">
          <Card className="border-none shadow-xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-2xl overflow-hidden">
            <CardHeader className="pb-2">
              <Trophy className="w-10 h-10 text-amber-300 fill-current mb-2" />
              <CardTitle className="text-xl font-black">새 대회 설계</CardTitle>
              <CardDescription className="text-indigo-100 text-xs">사용자들을 위한 최상의 경쟁 환경을 구축하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 text-sm font-medium">
              <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl">
                <Clock className="w-4 h-4 text-amber-300" />
                <span>정확한 시간 설정 필수</span>
              </div>
              <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl">
                <ShieldAlert className="w-4 h-4 text-amber-300" />
                <span>부정행위 방지 규칙 명시</span>
              </div>
              <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl">
                <Award className="w-4 h-4 text-amber-300" />
                <span>매력적인 보상과 혜택</span>
              </div>
            </CardContent>
          </Card>

          <div className="p-4 border rounded-2xl bg-white space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Info size={14} /> 운영 팁
            </h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              대회 시작 전 '예정' 상태로 노출하여 참가자들을 미리 모집하는 것이 좋습니다. 포렌식 대회라면 데이터셋 용량을 미리 확인하세요.
            </p>
          </div>
        </aside>

        {/* [B] 중앙 입력 양식 (9칸) */}
        <section className="col-span-12 md:col-span-9 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">

          {/* 상단 버튼 */}
          <div className="flex justify-between items-end border-b pb-6">
            <div className="space-y-1">
              <h2 className="text-3xl font-black tracking-tighter text-slate-950">Contest Blueprint</h2>
              <p className="text-slate-500 font-medium">대회의 일정, 보상, 규칙을 상세히 설정합니다.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="px-6 rounded-xl">취소</Button>
              <Button className="bg-slate-950 hover:bg-slate-800 px-8 rounded-xl shadow-lg" onClick={handleCreateContest}>대회 생성</Button>
            </div>
          </div>

          {/* 1. 대회 기본 정보 */}
          <Card className="border-slate-200 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" /> 기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* 대회 명칭 */}
              <div className="grid gap-2">
                <Label htmlFor="contest-title">대회 명칭 <span className="text-red-500">*</span></Label>
                <Input
                  id="contest-title"
                  value={title}
                  placeholder="대회 이름을 입력하세요."
                  className="text-lg font-bold h-12"
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {/* 대회 소개 */}
              <div className="grid gap-2">
                <Label htmlFor="contest-desc">대회 소개 <span className="text-red-500">*</span></Label>
                <Textarea
                  id="contest-desc"
                  placeholder="대회의 목적, 주제 등 포스터 탭에 노출될 상세한 소개를 입력하세요."
                  className="min-h-[100px] resize-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* 유형 및 대상 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 대회 유형 (주최) */}
                {/* <div className="space-y-2">
                  <Label>대회 유형</Label>
                  <Select defaultValue="official">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="official">공식</SelectItem>
                      <SelectItem value="group">그룹</SelectItem>
                      <SelectItem value="class">수업</SelectItem>
                      <SelectItem value="individual">개인</SelectItem>
                    </SelectContent>
                  </Select>
                </div> */}
                {/* 참여 유형 (개인/팀) */}
                <div className="space-y-2">
                  <Label>참여 유형</Label>
                  <Select defaultValue="individual" onValueChange={setParticipationType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">개인전</SelectItem>
                      <SelectItem value="team">팀전</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* 참여 대상 수정 (공개/그룹) */}
                <div className="space-y-2">
                  <Label>참여 대상</Label>
                  <Select defaultValue="public" onValueChange={setVisibility}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">공개 (누구나)</SelectItem>
                      <SelectItem value="group">그룹 공개 (특정 그룹 전용)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* 태그 */}
              <div className="grid gap-2">
                <Label htmlFor="contest-tags">대회 태그</Label>
                <Input
                  id="contest-tags"
                  placeholder="예: 웹해킹, 리버싱, 대학생 (쉼표로 구분하여 입력)"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
              </div>

            </CardContent>
          </Card>

          {/* 2. 일정 및 시간 설정 */}
          <Card className="border-slate-200 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Clock className="w-5 h-5 text-indigo-500" /> 일정 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 대회 시작 일시 */}
                <div className="space-y-3">
                  <Label className="text-indigo-600 font-bold">대회 시작 일시</Label>
                  <Input
                    type="datetime-local"
                    value={startTime}
                    className="h-11 font-mono"
                    onChange={(e) => handleStartTimeChange(e.target.value)} // 개별 핸들러 적용
                  />
                </div>
                {/* 대회 종료 일시 */}
                <div className="space-y-3">
                  <Label className="text-red-600 font-bold">대회 종료 일시</Label>
                  <Input
                    type="datetime-local"
                    value={endTime}
                    className="h-11 font-mono"
                    onChange={(e) => handleEndTimeChange(e.target.value)} // 개별 핸들러 적용
                  />
                </div>
                {/* 진행 시간 */}
                <div className="space-y-3">
                  <Label className="font-bold text-slate-700">진행 시간 (시간 단위)</Label>
                  <Input
                    type="number"
                    step="0.5" // 0.5시간(30분) 단위 입력도 지원 가능하도록 설정
                    value={duration}
                    placeholder="예: 8"
                    className="h-11 font-mono"
                    onChange={(e) => handleDurationChange(e.target.value)} // 개별 핸들러 적용
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. 보상 및 규칙 */}
          <Card className="border-slate-200 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Award className="w-5 h-5 text-emerald-500" /> 보상 및 규칙</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* 보상 ON/OFF 로직 */}
              <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="reward-toggle"
                    checked={isRewardEnabled}
                    onCheckedChange={(checked) => setIsRewardEnabled(checked as boolean)}
                  />
                  <Label htmlFor="reward-toggle" className="font-bold cursor-pointer text-slate-800">
                    대회 보상 제공 여부
                  </Label>
                </div>

                {/* 토글이 ON일 때만 입력칸 렌더링 */}
                {isRewardEnabled && (
                  <div className="space-y-2 pl-6 animate-in fade-in duration-300">
                    <Label>보상 및 혜택 내역</Label>
                    <Input placeholder="예: 상금 100만원, 총장 표창, 채용 우대권 등" className="bg-white" onChange={(e) => setPrizeDescription(e.target.value)} />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>참가 규칙 및 주의사항 <span className="text-red-500">*</span></Label>
                <Textarea
                  placeholder="대회 중 금지 행위(부정행위, 공격 등)와 순위 산정 기준을 입력하세요."
                  className="min-h-[120px] resize-none"
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                />
              </div>

              {/* <div className="flex items-center gap-4 pt-2">
                   <div className="flex items-center gap-2">
                     <Checkbox id="rank-reveal" defaultChecked />
                     <Label htmlFor="rank-reveal" className="text-sm font-bold cursor-pointer">실시간 순위 공개</Label>
                   </div>
                   <div className="flex items-center gap-2">
                     <Checkbox id="hint-open" />
                     <Label htmlFor="hint-open" className="text-sm font-bold cursor-pointer">시간별 자동 힌트 공개 활성화</Label>
                   </div>
                </div> */}
            </CardContent>
          </Card>

          {/* 4. 문제지 구성 */}
          {/* <Card className="border-dashed border-2 border-slate-200 shadow-none bg-slate-50/50 rounded-2xl">
             <CardContent className="flex flex-col items-center justify-center py-10 space-y-4">
                <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center border shadow-sm">
                   <Plus className="text-slate-400" />
                </div>
                <div className="text-center">
                   <p className="font-bold text-slate-700">문제 뱅크에서 문제 불러오기</p>
                   <p className="text-xs text-slate-400 mt-1">대회에서 사용할 문제들을 선택하거나 새로 출제할 수 있습니다.</p>
                </div>
                <Button variant="secondary" size="sm">문제지 구성하기</Button>
             </CardContent>
          </Card> */}

        </section>

      </main>
    </div>
  );
}

// [보조 컴포넌트] Badge (UI 라이브러리에 따라 다를 수 있음)
function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${className}`}>
      {children}
    </span>
  );
}