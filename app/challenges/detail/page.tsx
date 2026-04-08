"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, Settings, LogOut, User, Menu, MessageSquare, Bell, Share2, 
  CheckCircle, XCircle, Clock, LayoutGrid, Users, BarChart3, Trophy, ShoppingBag
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea"; // 댓글 입력용
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"; // 표 컴포넌트
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { topRankers, sidebarComments, submissions, fullRankings } from "@/lib/mockData";


export default function ProblemDetailPage() {
  // 현재 로그인 상태를 관리 (나중에는 실제 토큰 유무로 판단)
  const [isLoggedIn, setIsLoggedIn] = useState(true);


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

      {/* 2. 메인 레이아웃 (Grid 12분할) */}
      <main className="container mx-auto max-w-[1600px] pt-6 grid grid-cols-1 md:grid-cols-12 gap-6 px-4 pb-12">

        {/* [A] 우측 정보 패널 (2칸 - 고정) */}
        <aside className="col-span-12 md:col-span-2 space-y-4">
          <Card className="shadow-none border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" /> Top 3
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topRankers.map((ranker) => (
                <div key={ranker.rank} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="h-5 w-5 flex items-center justify-center p-0 rounded-full">
                      {ranker.rank}
                    </Badge>
                    <span className="font-medium text-slate-700">{ranker.name}</span>
                  </div>
                  <span className="text-slate-400 text-xs">{ranker.score}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="shadow-none border-slate-200">
             <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-500" /> Recent
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sidebarComments.map((comment, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">{comment.user}</span>
                    <span className="text-[10px] text-slate-400">{comment.time}</span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">{comment.text}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>

        {/* [B] 중앙 콘텐츠 영역 (6칸 - 탭에 따라 변경되는 부분) */}
        <section className="col-span-12 md:col-span-8 space-y-6">
          
          {/* 탭 컨트롤러 */}
          <Tabs defaultValue="problem" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-slate-100 p-1 rounded-lg sticky top-16 z-40">
              <TabsTrigger value="problem">문제</TabsTrigger>
              <TabsTrigger value="grading">채점</TabsTrigger>
              <TabsTrigger value="rank">순위</TabsTrigger>
              <TabsTrigger value="comments">댓글</TabsTrigger>
            </TabsList>
            
            {/* 1. 문제 탭 */}
            <TabsContent value="problem" className="mt-6 space-y-6 animate-in fade-in-50 duration-300">
              <div className="flex gap-6 items-start">
                <div className="w-24 h-24 bg-slate-100 rounded-2xl flex items-center justify-center shrink-0 border border-slate-200">
                  <div className="grid grid-cols-2 gap-1 opacity-50">
                    <div className="w-3 h-3 bg-slate-400 rounded-full"/>
                    <div className="w-3 h-3 bg-slate-400 rounded-sm"/>
                    <div className="w-3 h-3 bg-slate-400 rounded-sm"/>
                    <div className="w-3 h-3 bg-slate-400 rounded-full"/>
                  </div>
                </div>
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold text-slate-900">미로탈출 2</h1>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    멍청한 고양이 톰이 또 제리의 함정에 빠져 미로에 갇혀버렸어요.
                    이번에는 영악한 제리가 열쇠로 탈출구를 잠그고 열쇠를 여러 조각으로 쪼개어 미로 곳곳에 숨겨두었어요.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="bg-slate-800 hover:bg-slate-700">답안 제출하기</Button>
                <Button variant="outline" size="icon"><Share2 className="h-4 w-4" /></Button>
              </div>
              <Separator />
              <div className="prose prose-slate max-w-none">
                <p className="text-slate-800">
                  N * N 크기의 미로에서 M개의 열쇠 조각을 찾아야 한다... (문제 상세 내용)
                </p>
                <div className="mt-4">
                  <span className="text-xs font-bold text-slate-500 mb-1 block">&lt;입력 예시&gt;</span>
                  <pre className="bg-slate-50 border border-slate-200 p-4 rounded-lg font-mono text-sm text-slate-800 leading-6">
{`5 3
0 0 1 0 2
0 0 0 0 0`}
                  </pre>
                </div>
              </div>
            </TabsContent>

            {/* 2. 채점 탭 */}
            <TabsContent value="grading" className="mt-6 animate-in fade-in-50 duration-300">
              <h2 className="text-lg font-bold mb-4">나의 제출 현황</h2>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-[100px]">제출 번호</TableHead>
                      <TableHead>결과</TableHead>
                      <TableHead>메모리</TableHead>
                      <TableHead>시간</TableHead>
                      <TableHead>언어</TableHead>
                      <TableHead className="text-right">제출 시간</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-mono text-xs">{sub.id}</TableCell>
                        <TableCell>
                          <Badge variant={sub.isCorrect ? "default" : "destructive"} className={sub.isCorrect ? "bg-green-600 hover:bg-green-700" : ""}>
                            {sub.isCorrect ? <CheckCircle className="w-3 h-3 mr-1"/> : <XCircle className="w-3 h-3 mr-1"/>}
                            {sub.result}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{sub.memory}</TableCell>
                        <TableCell className="text-xs">{sub.time}</TableCell>
                        <TableCell className="text-xs font-bold text-slate-600">{sub.lang}</TableCell>
                        <TableCell className="text-right text-xs text-slate-400">{sub.date}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* 3. 순위 탭 */}
            <TabsContent value="rank" className="mt-6 animate-in fade-in-50 duration-300">
               <h2 className="text-lg font-bold mb-4">전체 랭킹 (Top 100)</h2>
               <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-[60px]">순위</TableHead>
                      <TableHead>사용자</TableHead>
                      <TableHead>메모리</TableHead>
                      <TableHead>시간</TableHead>
                      <TableHead>언어</TableHead>
                      <TableHead className="text-right">날짜</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fullRankings.map((rank) => (
                      <TableRow key={rank.rank}>
                        <TableCell className="font-bold">{rank.rank}</TableCell>
                        <TableCell className="font-medium text-blue-600">{rank.user}</TableCell>
                        <TableCell className="text-xs text-slate-500">{rank.memory}</TableCell>
                        <TableCell className="text-xs text-slate-500">{rank.time}</TableCell>
                        <TableCell className="text-xs"><Badge variant="outline">{rank.lang}</Badge></TableCell>
                        <TableCell className="text-right text-xs text-slate-400">{rank.date}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
               </div>
            </TabsContent>

            {/* 4. 댓글 탭 */}
            <TabsContent value="comments" className="mt-6 animate-in fade-in-50 duration-300 space-y-6">
              {/* 댓글 입력창 */}
              <div className="space-y-2">
                <h2 className="text-lg font-bold">댓글 남기기</h2>
                <Textarea placeholder="이 문제에 대한 팁이나 질문을 남겨주세요." className="resize-none min-h-[100px]" />
                <div className="flex justify-end">
                  <Button size="sm">등록하기</Button>
                </div>
              </div>
              
              <Separator />

              {/* 댓글 목록 */}
              <div className="space-y-4">
                {sidebarComments.map((comment, i) => (
                  <div key={i} className="flex gap-4 p-4 border rounded-lg bg-slate-50/50">
                     <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                        <User className="h-5 w-5 text-slate-500" />
                     </div>
                     <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-slate-900">{comment.user}</span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {comment.time}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">{comment.text}</p>
                     </div>
                  </div>
                ))}
              </div>
            </TabsContent>

          </Tabs>
        </section>

        {/* [C] 우측 광고 패널 (2칸 - 고정) */}
        <aside className="col-span-12 md:col-span-2">
          <div className="border border-slate-200 rounded-xl bg-slate-50 h-[500px] flex flex-col items-center justify-center sticky top-24">
            <span className="text-slate-400 text-sm font-medium">AD Area</span>
          </div>
        </aside>

      </main>
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