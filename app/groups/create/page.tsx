"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Menu, Settings, LogOut, User, Users, ShieldCheck, 
  Globe, Lock, Image as ImageIcon, Plus, Info, Check
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function GroupCreatePage() {
  
  // [상태 관리] 가입 승인 방식 제어
  const [isPrivate, setIsPrivate] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      
      {/* 1. 헤더 */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Menu className="h-6 w-6 text-slate-500 cursor-pointer lg:hidden" />
          <Link href="/" className="text-xl font-bold tracking-tight text-slate-900">
            Diveon
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-slate-100 rounded-full"><User className="h-5 w-5 text-slate-600" /></button>
          <button className="p-2 hover:bg-slate-100 rounded-full text-red-500"><LogOut className="h-5 w-5" /></button>
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
                <Input id="group-name" placeholder="예: 단국대 알고리즘 스터디" className="focus-visible:ring-indigo-400" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="group-desc">그룹 한 줄 소개</Label>
                <Textarea id="group-desc" placeholder="그룹의 목적과 활동 내용을 간단히 적어주세요." className="resize-none min-h-[100px] focus-visible:ring-indigo-400" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>카테고리</Label>
                  <Select defaultValue="study">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="study">스터디 / 교육</SelectItem>
                      <SelectItem value="contest">대회 준비 (CTF/PS)</SelectItem>
                      <SelectItem value="club">동아리 / 학회</SelectItem>
                      <SelectItem value="project">팀 프로젝트</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>최대 인원</Label>
                  <Input type="number" placeholder="제한 없음" className="focus-visible:ring-indigo-400" />
                </div>
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

              <div className="space-y-2 pt-2">
                <Label>가입 승인 방식</Label>
                <Select defaultValue="auto">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">자동 승인 (누구나 즉시 가입)</SelectItem>
                    <SelectItem value="manual">관리자 승인 (신청 후 승인 필요)</SelectItem>
                    <SelectItem value="password">비밀번호 입력 (비밀번호 아는 사람만)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* 하단 버튼 */}
          <div className="flex items-center justify-end gap-3">
             <Button variant="ghost" className="text-slate-500" asChild>
               <Link href="/groups">취소</Link>
             </Button>
             <Button className="bg-indigo-600 hover:bg-indigo-700 px-8 shadow-lg shadow-indigo-100">
               그룹 생성하기 <Check className="ml-2 w-4 h-4" />
             </Button>
          </div>
        </section>

      </main>
    </div>
  );
}