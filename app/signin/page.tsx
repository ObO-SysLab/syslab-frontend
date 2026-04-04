"use client";

import Link from "next/link";
import { Settings, User, LogIn } from "lucide-react"; 
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 font-sans">
      
      {/* 1. 헤더 영역 */}
      <header className="w-full px-8 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black tracking-tighter text-slate-900">Diveon</h1>
          
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <User className="h-6 w-6 text-slate-900" />
            </button>
            <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <Settings className="h-6 w-6 text-slate-900" />
            </button>
            <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <LogIn className="h-6 w-6 text-slate-900" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. 메인 컨텐츠 */}
      <main className="flex-1 flex items-center justify-center p-4 bg-slate-50/30">
        
        <div className="w-full max-w-[420px] space-y-4">
          
          <Card className="border-none shadow-2xl shadow-slate-200/50 bg-white rounded-3xl overflow-hidden">
            <CardContent className="pt-12 pb-10 px-10 space-y-8">
              
              <div className="space-y-6">
                {/* 이메일 입력 */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1" htmlFor="email">
                    Email Address
                  </label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="name@dankook.ac.kr" 
                    className="bg-slate-50 border-none focus-visible:ring-1 focus-visible:ring-slate-900 h-12 rounded-xl"
                  />
                </div>

                {/* 비밀번호 입력 */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1" htmlFor="password">
                    Password
                  </label>
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    className="bg-slate-50 border-none focus-visible:ring-1 focus-visible:ring-slate-900 h-12 rounded-xl"
                  />
                </div>
              </div>

              {/* 로그인 버튼 */}
              <Button className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold text-base rounded-xl shadow-lg shadow-slate-200 transition-all active:scale-[0.98]">
                Sign In
              </Button>

              {/* [수정 및 추가] 카드 하단 유틸리티 링크 영역 */}
              <div className="flex justify-between items-center pt-2">
                {/* 왼쪽: ID/PW 찾기 */}
                <Link 
                  href="/find-account" 
                  className="text-xs font-bold text-slate-400 underline underline-offset-4 decoration-slate-200 hover:text-slate-900 hover:decoration-slate-900 transition-all"
                >
                  아이디/비밀번호 찾기
                </Link>

                {/* 오른쪽: 회원가입 (Sign Up) */}
                <Link 
                  href="/signup" 
                  className="text-xs font-bold text-indigo-600 underline underline-offset-4 decoration-indigo-100 hover:text-indigo-800 hover:decoration-indigo-800 transition-all"
                >
                  회원가입
                </Link>
              </div>

            </CardContent>
          </Card>

          {/* 하단 문구 (선택 사항) */}
          <p className="text-center text-[10px] text-slate-300 font-medium uppercase tracking-[0.2em]">
            Secured by Diveon Protection System
          </p>

        </div>
      </main>
    </div>
  );
}