"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Menu, Search, User, Settings, LogOut, CheckCircle2, AlertTriangle, 
  Terminal, BarChart3, Target, Zap, Clock, Code2, PlusCircle, Trash2, ShieldCheck
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

export default function ProblemCreatePage() {
  
  // [상태 관리] 문제 유형 (algorithm / wargame)
  const [problemType, setProblemType] = useState("algorithm");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      
      {/* 1. 고정 헤더 (기존 디자인 유지) */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Menu className="h-6 w-6 text-slate-500 cursor-pointer lg:hidden" />
          <Link href="/" className="text-xl font-bold tracking-tight text-slate-900">
            Diveon
            <span className="text-[10px] font-black text-indigo-500 ml-1">ADMIN</span>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm font-medium text-slate-600">admin_prof@dankook.ac.kr</div>
          <button className="p-2 hover:bg-slate-100 rounded-full text-red-500"><LogOut className="h-5 w-5" /></button>
        </div>
      </header>

      {/* 2. 메인 레이아웃 */}
      <main className="container mx-auto max-w-[1400px] pt-8 grid grid-cols-1 md:grid-cols-12 gap-10 px-6 pb-20">

        {/* [A] 좌측 출제 가이드 (3칸 - 고정) */}
        <aside className="col-span-12 md:col-span-3 space-y-4 md:sticky md:top-24 h-fit">
          <Card className="border-indigo-100 bg-white shadow-sm overflow-hidden rounded-2xl">
             <div className="bg-indigo-600 p-6">
                <ShieldCheck className="w-10 h-10 text-white fill-current" />
                <p className="text-xl font-black text-white mt-2">새 문제 출제</p>
                <p className="text-xs text-indigo-200 mt-1">문제 양식에 맞춰 정보를 입력하세요.</p>
             </div>
             <CardContent className="p-5 text-sm text-slate-600 space-y-3 font-medium">
               <div className="flex gap-2.5 items-center"><Target className="w-4 h-4 text-indigo-500" /> 제목은 명확하게</div>
               <div className="flex gap-2.5 items-center"><Code2 className="w-4 h-4 text-indigo-500" /> 설명은 Markdown 지원</div>
               <div className="flex gap-2.5 items-center"><CheckCircle2 className="w-4 h-4 text-indigo-500" /> 정확한 테스트케이스 필수</div>
             </CardContent>
          </Card>
           <Button variant="outline" className="w-full text-slate-500" asChild>
              <Link href="/challenges">출제 취소</Link>
           </Button>
        </aside>

        {/* [B] 중앙 출제 양식 (9칸) */}
        <section className="col-span-12 md:col-span-9 space-y-8 animate-in fade-in-50 duration-500">
          
          {/* 타이틀 및 저장 버튼 */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
             <div className="space-y-1">
               <h1 className="text-3xl font-black tracking-tighter text-slate-950">문제 등록 시스템</h1>
               <p className="text-slate-500">Diveon의 기사단원이 해결할 새로운 알고리즘/보안 문제를 만듭니다.</p>
             </div>
             <div className="flex gap-2">
                <Button variant="secondary" className="px-6">임시 저장</Button>
                <Button className="bg-indigo-600 hover:bg-indigo-700 px-6 shadow-md shadow-indigo-200">문제 등록 <Zap size={16} className="ml-2" /></Button>
             </div>
          </div>
          
          <Separator />

          {/* 1. 기본 정보 설정 카드 */}
          <Card className="border-slate-100 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg">기본 정보 설정</CardTitle>
              <CardDescription>문제의 제목, 분류, 난이도를 정의합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="title">문제 제목 <span className="text-red-500">*</span></Label>
                <Input id="title" placeholder="문제 제목을 입력하세요." className="focus-visible:ring-indigo-400" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                <div className="space-y-2">
                  <Label>문제 분류</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="카테고리 선택" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="web">Web Security</SelectItem>
                      <SelectItem value="pwn">Pwnable</SelectItem>
                      <SelectItem value="forensic">Forensics</SelectItem>
                      <SelectItem value="algo">Algorithm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>난이도 (Difficulty)</Label>
                  <Select defaultValue="lv1">
                    <SelectTrigger><SelectValue placeholder="난이도 선택" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lv1" className="text-green-600 font-bold">Level 1</SelectItem>
                      <SelectItem value="lv2" className="text-blue-600 font-bold">Level 2</SelectItem>
                      <SelectItem value="lv3" className="text-orange-600 font-bold">Level 3</SelectItem>
                      <SelectItem value="lv4" className="text-red-600 font-bold">Level 4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. 문제 본문 카드 (설명 및 입력/출력 정의) */}
          <Card className="border-slate-100 shadow-sm rounded-2xl overflow-hidden">
             <Tabs defaultValue="desc">
               <CardHeader className="bg-slate-50/50 pb-0 border-b">
                 <TabsList className="bg-slate-100 p-0.5 h-auto">
                   <TabsTrigger value="desc" className="px-5 py-2.5 text-xs">문제 설명 (Markdown)</TabsTrigger>
                   <TabsTrigger value="hint" className="px-5 py-2.5 text-xs">힌트 (Hints)</TabsTrigger>
                 </TabsList>
               </CardHeader>
               <CardContent className="p-6">
                 <TabsContent value="desc" className="space-y-2 mt-0">
                    <Textarea placeholder="문제를 해결하기 위한 배경, 시나리오, 목표를 Markdown 형식으로 상세히 기술하세요." className="min-h-[300px] resize-none focus-visible:ring-indigo-400 font-mono text-sm leading-relaxed" />
                    <p className="text-xs text-slate-400 text-right">Markdown Preview 지원 예정</p>
                 </TabsContent>
                 <TabsContent value="hint" className="space-y-2 mt-0">
                     <Input placeholder="힌트 내용을 입력하세요. (옵션)" />
                     <p className="text-xs text-slate-400">문제 상세 페이지에서 사용자에게 보여줄 힌트입니다.</p>
                 </TabsContent>
               </CardContent>
             </Tabs>
          </Card>

          {/* 3. 데이터셋 및 정답 설정 카드 [핵심] */}
          <Card className="border-slate-100 shadow-sm rounded-2xl">
             <CardHeader>
                <div className="flex justify-between items-center">
                   <div>
                     <CardTitle className="text-lg">데이터셋 및 정답 설정 <span className="text-red-500">*</span></CardTitle>
                     <CardDescription>문제 유형에 따라 정답 판별 방식을 정의합니다.</CardDescription>
                   </div>
                   <Select defaultValue="algo" onValueChange={setProblemType}>
                      <SelectTrigger className="w-[140px] bg-slate-100"><SelectValue /></SelectTrigger>
                      <SelectContent>
                         <SelectItem value="algo">알고리즘형</SelectItem>
                         <SelectItem value="wargame">워게임형 (Flag)</SelectItem>
                      </SelectContent>
                   </Select>
                </div>
             </CardHeader>
             <CardContent className="pt-2">
                {/* [조건부 렌더링 A] 알고리즘형일 때 (테스트케이스) */}
                {problemType === "algo" && (
                   <div className="space-y-5 animate-in fade-in-30 duration-300">
                      <div className="grid md:grid-cols-2 gap-5 text-sm">
                         <div className="space-y-1.5"><Label>시간 제한 (sec)</Label><Input type="number" defaultValue={1} className="font-mono" /></div>
                         <div className="space-y-1.5"><Label>메모리 제한 (MB)</Label><Input type="number" defaultValue={128} className="font-mono" /></div>
                      </div>
                      <div className="pt-2 space-y-3">
                        <Label>테스트케이스 (관리용 5개 이하 권장)</Label>
                        {[1].map(i => (
                           <div key={i} className="grid md:grid-cols-2 gap-4 p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                              <Textarea placeholder={`Input Case #${i}`} className="min-h-[80px] bg-white resize-none font-mono text-xs" />
                              <Textarea placeholder={`Output Case #${i}`} className="min-h-[80px] bg-white resize-none font-mono text-xs" />
                           </div>
                        ))}
                        <Button variant="outline" size="sm" className="w-full border-dashed text-slate-500"><PlusCircle size={14} className="mr-2"/> 케이스 추가</Button>
                      </div>
                   </div>
                )}

                {/* [조건부 렌더링 B] 워게임형일 때 (Flag)  */}
                {problemType === "wargame" && (
                    <div className="space-y-5 animate-in fade-in-30 duration-300">
                        <div className="space-y-2 pt-1">
                           <Label htmlFor="flag">Secret Flag 인증 문자열 <span className="text-red-500">*</span></Label>
                           <Input id="flag" placeholder="DK{Correct_Flag_Here}" className="focus-visible:ring-indigo-400 font-mono text-sm border-indigo-200" />
                        </div>
                        <div className="space-y-2.5">
                           <Label>첨부 파일 업로드</Label>
                           <div className="p-5 border-2 border-dashed border-slate-200 rounded-2xl text-center bg-slate-50 hover:bg-slate-100/50 cursor-pointer">
                              <Zap className="h-6 h-6 text-slate-300 mx-auto fill-current" />
                              <span className="text-xs font-medium text-slate-500 mt-1 block">Click or Drag & Drop to upload binary/pcap/image</span>
                           </div>
                        </div>
                    </div>
                )}
             </CardContent>
          </Card>

        </section>

      </main>
    </div>
  );
}