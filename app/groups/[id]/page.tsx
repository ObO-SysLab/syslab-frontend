"use client";

import Link from "next/link";
import { Search, Settings, LogOut, User, Menu, Trophy, MessageSquare, Star, Share2, CheckCircle, 
  XCircle, Clock, ShieldCheck, Users, Bell, Trash2, Shield, Terminal, SearchCode, Database, Code2, 
  LayoutGrid, BarChart3, ShoppingBag 
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress"; // [수정] 진행바 추가

export default function ProblemDetailPage() {

  // [Mock Data]
  const topRankers = [
    { rank: 1, name: "Guido", score: 2400 },
    { rank: 2, name: "Torvalds", score: 2350 },
    { rank: 3, name: "Gosling", score: 2100 },
  ];
  const sidebarComments = [
    { user: "Hacker1", text: "앙 기모링", time: "10분 전" },
    { user: "Newbie", text: "쪼아요 쪼아요 물걸레질 쪼아요", time: "1시간 전" },
  ];

  const submissions = [
    { id: 1024, result: "맞았습니다!!", memory: "2024 KB", time: "12 ms", lang: "Python3", date: "1분 전", isCorrect: true },
    { id: 1023, result: "틀렸습니다", memory: "1020 KB", time: "4 ms", lang: "C++", date: "5분 전", isCorrect: false },
    { id: 1022, result: "시간 초과", memory: "---", time: "2000 ms", lang: "Python3", date: "10분 전", isCorrect: false },
  ];

  const fullMember = [
    { rank: 1, user: "Guido", role: "그룹장", tier: "마스터", lang: "Python3", date: "2025.11.12" },
    { rank: 2, user: "Torvalds", role: "매니저", tier: "다이아", lang: "C", date: "2025.10.04" },
    { rank: 3, user: "Gosling", role: "매니저", tier: "플래티넘", lang: "Java", date: "2025.09.21" },
    { rank: 4, user: "DanKook", role: "일반", tier: "골드", lang: "Node.js", date: "2026.01.18" },
    { rank: 5, user: "Security", role: "일반", tier: "실버", lang: "Python3", date: "2026.01.19" },
  ];


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

        {/* 우측 아이콘 메뉴 (올바른 Link 사용법 적용) */}
        <div className="flex items-center gap-2">
          <Link href="/settings" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <User className="h-5 w-5 text-slate-600" />
          </Link>
          <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <Settings className="h-5 w-5 text-slate-600" />
          </button>
          <button className="p-2 hover:bg-slate-100 rounded-full text-red-500 transition-colors">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* 2. 메인 레이아웃 */}
      <main className="container mx-auto max-w-[1600px] pt-6 grid grid-cols-1 md:grid-cols-12 gap-6 px-4 pb-12">

        {/* [A] 우측 정보 패널 (2칸) */}
        <aside className="col-span-12 md:col-span-2 space-y-4">
          <Card className="shadow-none border-slate-200 overflow-hidden">
            <CardHeader className="bg-slate-50 pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" /> 명예의 전당
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {topRankers.map((ranker) => (
                <div key={ranker.rank} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`font-black ${ranker.rank === 1 ? "text-yellow-500" : "text-slate-300"}`}># {ranker.rank}</span>
                    <span className="font-medium text-slate-700">{ranker.name}</span>
                  </div>
                  <span className="text-slate-400 text-xs font-mono">{ranker.score}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          
          <Card className="shadow-none border-slate-200">
            <CardHeader className="pb-2 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Bell className="h-4 w-4 text-indigo-500" /> 최근 활동
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {sidebarComments.map((comment, idx) => (
                <div key={idx} className="border-l-2 border-slate-100 pl-3 py-1">
                  <p className="text-[11px] font-bold text-slate-800">{comment.user}</p>
                  <p className="text-[10px] text-slate-500 line-clamp-1">{comment.text}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>

        {/* [B] 중앙 콘텐츠 영역 */}
        <section className="col-span-12 md:col-span-8 space-y-6">

          <Tabs defaultValue="main" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-slate-100 p-1 rounded-lg sticky top-16 z-40">
              <TabsTrigger value="main">메인</TabsTrigger>
              <TabsTrigger value="member">멤버</TabsTrigger>
              <TabsTrigger value="comments">댓글</TabsTrigger>
              <TabsTrigger value="setting">설정</TabsTrigger>
            </TabsList>

            {/* 1. 메인 탭 [수정: 시각적 대시보드 요소 추가] */}
            <TabsContent value="main" className="mt-6 space-y-6 animate-in fade-in-50 duration-300">
              <div className="flex gap-6 items-start">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg">
                  <ShieldCheck className="w-12 h-12 text-white" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold text-slate-900">알고리즘 기사단</h1>
                    <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">Official</Badge>
                  </div>
                  <p className="text-slate-500 leading-relaxed">
                    성스러운 알고리즘을 찾아 DK 마왕을 무찌르고 세상을 구원할 마지막 희망.. "알고리즘 기사단"
                  </p>
                </div>
              </div>

              {/* [수정] 그룹 통계 요약 카드 추가 */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-slate-50 border-none shadow-none">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-slate-500 uppercase font-bold">멤버 수</p>
                    <p className="text-2xl font-black text-slate-900">158</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-50 border-none shadow-none">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-slate-500 uppercase font-bold">해결한 문제</p>
                    <p className="text-2xl font-black text-slate-900">1.2k</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-50 border-none shadow-none">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-slate-500 uppercase font-bold">그룹 랭킹</p>
                    <p className="text-2xl font-black text-slate-900">#4</p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex gap-2">
                <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-md">가입 신청하기</Button>
                <Button variant="outline" size="icon"><Share2 className="h-4 w-4" /></Button>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500 fill-current" /> 기사단 소식
                </h3>
                <Card className="border-l-4 border-l-purple-500 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-sm font-medium">"알고리즘 기사단"은 알고리즘에 빠져있는 단국대 학생이라면 누구나 환영합니다.</p>
                    <p className="text-xs text-slate-400 mt-2">2026.02.08 관리자 공지</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* 2. 멤버 탭 [수정: 티어별 색상 및 가독성 강화] */}
            <TabsContent value="member" className="mt-6 animate-in fade-in-50 duration-300">
              <div className="flex justify-between items-end mb-4">
                <h2 className="text-xl font-bold">그룹 멤버 <span className="text-indigo-500 text-sm ml-1">158명</span></h2>
                <Button variant="ghost" size="sm" className="text-xs">전체 보기</Button>
              </div>
              <div className="border rounded-xl overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-[60px] text-center">순위</TableHead>
                      <TableHead>사용자</TableHead>
                      <TableHead>역할</TableHead>
                      <TableHead>티어</TableHead>
                      <TableHead className="text-right">가입 날짜</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fullMember.map((rank) => (
                      <TableRow key={rank.rank} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="text-center font-bold text-slate-400">
                          {rank.rank <= 3 ? <span className="text-amber-500">{rank.rank}</span> : rank.rank}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold">
                              {rank.user[0]}
                            </div>
                            <span className="font-semibold text-slate-700">{rank.user}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-normal text-[10px]">
                            {rank.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs font-bold ${rank.tier === "마스터" ? "text-purple-600" : "text-slate-500"}`}>
                            {rank.tier}
                          </span >
                        </TableCell>
                        <TableCell className="text-right text-xs text-slate-400 font-mono">{rank.date}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* 3. 댓글 탭 [기존 유지] */}
            <TabsContent value="comments" className="mt-6 animate-in fade-in-50 duration-300 space-y-6">
              <div className="space-y-2">
                <h2 className="text-lg font-bold">방명록</h2>
                <Textarea placeholder="기사단원들에게 한마디 남겨보세요!" className="resize-none min-h-[100px] border-slate-200 focus:ring-purple-500" />
                <div className="flex justify-end">
                  <Button size="sm" className="bg-purple-600">등록하기</Button>
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                {sidebarComments.map((comment, i) => (
                  <div key={i} className="flex gap-4 p-4 border border-slate-100 rounded-xl bg-slate-50/30">
                    <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-slate-500" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900">{comment.user}</span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" /> {comment.time}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 leading-snug">{comment.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* 4. 설정 탭 [수정: 그룹 관리 대시보드로 전면 개편] */}
            <TabsContent value="setting" className="mt-6 animate-in fade-in-50 duration-300 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 일반 설정 */}
                <Card className="border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-md flex items-center gap-2"><Settings className="w-4 h-4" /> 일반 설정</CardTitle>
                    <CardDescription className="text-xs">그룹의 기본 정보를 수정합니다.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">그룹 이름</label>
                      <Input defaultValue="알고리즘 기사단" className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">그룹 소개</label>
                      <Textarea defaultValue="성스러운 알고리즘을 찾아..." className="text-sm min-h-[80px]" />
                    </div>
                    <Button size="sm" className="w-full">변경사항 저장</Button>
                  </CardContent>
                </Card>

                {/* 보안 및 가입 설정 */}
                <Card className="border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-md flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> 가입 관리</CardTitle>
                    <CardDescription className="text-xs">가입 승인 및 권한을 설정합니다.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium">비공개 그룹</span>
                      <div className="w-10 h-5 bg-slate-300 rounded-full relative cursor-pointer">
                        <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium">자동 승인</span>
                      <div className="w-10 h-5 bg-indigo-500 rounded-full relative cursor-pointer">
                        <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400">* 현재 가입 대기 중인 인원: 3명</p>
                    <Button variant="outline" size="sm" className="w-full">가입 대기열 보기</Button>
                  </CardContent>
                </Card>
              </div>

              {/* 위험 구역 */}
              <Card className="border-red-100 bg-red-50/30">
                <CardHeader>
                  <CardTitle className="text-md text-red-600 flex items-center gap-2">
                    <Trash2 className="w-4 h-4" /> 위험 구역
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="text-sm font-bold">그룹 폐쇄</p>
                    <p className="text-xs text-slate-500">모든 멤버 정보와 데이터가 삭제됩니다.</p>
                  </div>
                  <Button variant="destructive" size="sm">그룹 폐쇄</Button>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </section>

        {/* [C] 우측 광고 패널 */}
        <aside className="col-span-12 md:col-span-2">
          <div className="border border-slate-100 rounded-2xl bg-slate-50 h-[500px] flex flex-col items-center justify-center sticky top-24 group transition-all hover:bg-white hover:border-slate-200">
            <div className="text-slate-300 text-sm font-black tracking-widest uppercase">Ad Space</div>
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