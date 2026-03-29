import Link from "next/link";
import { Settings, User, LogIn } from "lucide-react"; // 아이콘
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card"; // 카드 컴포넌트

export default function LoginPage() {
  return (
    // 전체 컨테이너: 화면 꽉 채우기 (Flexbox)
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      
      {/* 1. 헤더 영역 */}
      <header className="w-full px-8 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Login</h1>
          
          {/* 우측 아이콘 메뉴 */}
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

      {/* 2. 메인 컨텐츠 (중앙 정렬) */}
      <main className="flex-1 flex items-center justify-center p-4">
        
        <div className="w-full max-w-[420px] space-y-4">
          
          {/* 로그인 카드 */}
          <Card className="border border-slate-200 shadow-sm bg-white">
            <CardContent className="pt-10 pb-10 px-8 space-y-6">
              
              {/* 이메일 입력 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="email">
                  Email
                </label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="Value" 
                  className="bg-slate-50 border-slate-200 focus-visible:ring-slate-900 h-11"
                />
              </div>

              {/* 비밀번호 입력 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="password">
                  Password
                </label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="Value" 
                  className="bg-slate-50 border-slate-200 focus-visible:ring-slate-900 h-11"
                />
              </div>

              {/* 로그인 버튼 (검은색) */}
              <Button className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-medium text-md mt-2">
                Sign In
              </Button>

              {/* 비밀번호 찾기 링크 */}
              <div className="text-left">
                <Link 
                  href="/forgot-password" 
                  className="text-sm font-medium text-slate-900 underline underline-offset-4 hover:text-slate-600"
                >
                  Forgot password?
                </Link>
              </div>

            </CardContent>
          </Card>

          {/* 회원가입 버튼 (카드 밖 우측 하단 배치) */}
          <div className="flex justify-end">
            <Link href="/signup">
              <span className="px-4 py-1.5 bg-slate-200 text-slate-600 text-xs font-bold rounded-full hover:bg-slate-300 transition-colors">
                회원가입
              </span>
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}