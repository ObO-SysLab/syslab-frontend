"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, User, Mail, Phone, ShieldCheck, Fingerprint } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function FindAccountPage() {
  // [상태] 현재 어떤 탭이 선택되었는지 (id 또는 pw)
  const [activeTab, setActiveTab] = useState("id");

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 font-sans">
      
      {/* 1. 상단 헤더 (뒤로가기 포함) */}
      <header className="w-full px-8 py-6 flex items-center justify-between">
        <Link 
          href="/signin" 
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors group"
        >
          <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-bold">Back to Login</span>
        </Link>
        <h1 className="text-2xl font-black tracking-tighter italic">Diveon</h1>
      </header>

      {/* 2. 메인 콘텐츠 */}
      <main className="flex-1 flex items-center justify-center p-4 bg-slate-50/30">
        
        <div className="w-full max-w-[450px] space-y-6">
          
          <div className="text-center space-y-2 mb-8">
            <div className="bg-indigo-600 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-100">
              <Fingerprint className="text-white w-7 h-7" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">계정 정보 찾기</h2>
            <p className="text-slate-400 text-sm font-medium">가입 시 등록한 정보로 본인 인증을 진행해 주세요.</p>
          </div>

          <Card className="border-none shadow-2xl shadow-slate-200/50 bg-white rounded-3xl overflow-hidden">
            <CardContent className="p-2">
              
              <Tabs defaultValue="id" className="w-full" onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 bg-slate-50 p-1 rounded-2xl h-14">
                  <TabsTrigger value="id" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    아이디 찾기
                  </TabsTrigger>
                  <TabsTrigger value="pw" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    비밀번호 재설정
                  </TabsTrigger>
                </TabsList>

                {/* --- 아이디 찾기 탭 --- */}
                <TabsContent value="id" className="p-8 pt-6 space-y-6 animate-in fade-in duration-500">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">이름</label>
                      <div className="relative">
                        <User className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                        <Input placeholder="홍길동" className="pl-11 bg-slate-50 border-none h-12 rounded-xl focus-visible:ring-1 focus-visible:ring-slate-900" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">연락처</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                        <Input placeholder="010-0000-0000" className="pl-11 bg-slate-50 border-none h-12 rounded-xl focus-visible:ring-1 focus-visible:ring-slate-900" />
                      </div>
                    </div>
                  </div>
                  <Button className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg shadow-slate-100 transition-all active:scale-[0.98]">
                    아이디 찾기
                  </Button>
                </TabsContent>

                {/* --- 비밀번호 재설정 탭 --- */}
                <TabsContent value="pw" className="p-8 pt-6 space-y-6 animate-in fade-in duration-500">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">아이디</label>
                      <div className="relative">
                        <User className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                        <Input placeholder="Dankook123" className="pl-11 bg-slate-50 border-none h-12 rounded-xl focus-visible:ring-1 focus-visible:ring-slate-900" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">이메일</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                        <Input type="email" placeholder="name@dankook.ac.kr" className="pl-11 bg-slate-50 border-none h-12 rounded-xl focus-visible:ring-1 focus-visible:ring-slate-900" />
                      </div>
                    </div>
                  </div>
                  <Button className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 transition-all active:scale-[0.98]">
                    인증번호 발송
                  </Button>
                </TabsContent>
              </Tabs>

            </CardContent>
          </Card>

          {/* 하단 링크 */}
          <div className="flex justify-center gap-6 pt-2">
            <Link href="/signup" className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors underline underline-offset-4 decoration-slate-200">
              신규 회원가입
            </Link>
            <div className="w-[1px] h-3 bg-slate-200 self-center" />
            <Link href="/support" className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors underline underline-offset-4 decoration-slate-200">
              고객센터 문의
            </Link>
          </div>

        </div>
      </main>

      <footer className="py-8 text-center">
        <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">
          Diveon Identity Management System
        </p>
      </footer>
    </div>
  );
}