"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search, Settings, LogOut, Menu, Trophy, Flag, Clock, AlertTriangle, Terminal, BarChart3, MessageSquare,
  CheckCircle2, HelpCircle, Send, Filter, Bell, X, ChevronRight, Edit2, Trash2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";


export default function ContestDetailPage() {
  // [STATE] 페이지
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [isGroupLeader, setIsGroupLeader] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");


  // [STATE] 데이터
  const [contestInfo, setContestInfo] = useState<any>({
    title: "제1회 단국대 디지털 포렌식 챌린지",
    remainingTime: "02:14:35",
    progress: 65,
    myScore: 2300,
    myRank: 12,
    totalUser: 50
  });

  // [STATE] 알림
  const [showNotiModal, setShowNotiModal] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, title: "F-03 문제 힌트 추가", time: "10분 전", isRead: false },
    { id: 2, title: "대회 종료 1시간 전입니다.", time: "1시간 전", isRead: true },
  ]);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // [STATE] 포스터 탭

  // [STATE] 대시보드 탭

  // [STATE] 챌린지 탭
  
  // [STATE] 스코어보드 탭

  // [STATE] 질의응답 탭

  // [STATE] 공지 탭


  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">

      {/* 1. 대회 전용 헤더 (고정) */}
      <header className="sticky top-0 z-50 w-full border-b bg-slate-900 px-6 h-16 flex items-center justify-between text-white">
        <div className="flex items-center gap-4">
          <Link href="/contests" className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <Menu className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-400" />
            <span className="font-bold tracking-tight">{contestInfo.title}</span>
          </div>
        </div>

        {/* 중앙 타이머 */}
        <div className="hidden md:flex items-center gap-6 px-6 py-1.5 bg-slate-800 rounded-full border border-slate-700">
          <div className="flex items-center gap-2 text-red-400 font-mono font-bold">
            <Clock size={16} />
            <span>{contestInfo.remainingTime}</span>
          </div>
          <div className="h-4 w-[1px] bg-slate-700" />
          <div className="text-xs font-medium text-slate-400">남은 시간</div>
        </div>

        {/* 알림 버튼 */}
        <div className="relative">
          <button
            onClick={() => setShowNotiModal(!showNotiModal)}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors relative group"
          >
            <Bell className="h-5 w-5 text-slate-300 group-hover:text-white" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-slate-900">
                {unreadCount}
              </span>
            )}
          </button>

          {/* 알림 모달 드롭다운 */}
          {showNotiModal && (
            <Card className="absolute right-0 mt-2 w-72 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 border-slate-200">
              <CardHeader className="p-4 border-b bg-slate-50">
                <CardTitle className="text-sm font-bold flex justify-between">
                  알림 <span>{unreadCount} 확인 안함</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 max-h-64 overflow-y-auto">
                {notifications.map(noti => (
                  <div key={noti.id} className={`p-4 border-b text-sm cursor-pointer hover:bg-slate-50 ${noti.isRead ? 'opacity-50' : 'bg-indigo-50/30'}`}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-slate-800">{noti.title}</span>
                      {!noti.isRead && <span className="w-2 h-2 rounded-full bg-red-500 mt-1"></span>}
                    </div>
                    <span className="text-xs text-slate-400">{noti.time}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </header>

      {/* 2. 메인 레이아웃 */}
      <main className="container mx-auto max-w-[1500px] pt-6 grid grid-cols-1 md:grid-cols-12 gap-6 px-4 pb-12">

        {/* [A] 좌측 사이드바 내비게이션 (2칸) */}
        <aside className="col-span-12 md:col-span-2 space-y-2">
          <nav className="space-y-1">
            <ContestSideBtn icon={<Flag size={18} />} label="포스터" active={activeTab === "poster"} onClick={() => setActiveTab("poster")} />
            <ContestSideBtn icon={<Terminal size={18} />} label="대시보드" active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} />
            <ContestSideBtn icon={<Flag size={18} />} label="챌린지" active={activeTab === "challenges"} onClick={() => setActiveTab("challenges")} />
            <ContestSideBtn icon={<BarChart3 size={18} />} label="스코어보드" active={activeTab === "scoreboard"} onClick={() => setActiveTab("scoreboard")} />
            <ContestSideBtn icon={<MessageSquare size={18} />} label="질의응답(Q&A)" active={activeTab === "qa"} onClick={() => setActiveTab("qa")} />
            {/* 운영자 전용 탭 */}
            {isGroupLeader && (
              <>
                <div className="my-4 border-t border-slate-200" />
                <ContestSideBtn icon={<AlertTriangle size={18} />} label="공지" active={activeTab === "notice"} onClick={() => setActiveTab("notice")} />
              </>
            )}
          </nav>
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm mt-6">
            <p className="text-xs font-bold text-slate-400 mb-2 uppercase">진행률</p>
            <Progress value={contestInfo.progress} className="h-2 mb-2" />
            <p className="text-[10px] text-right text-slate-500 font-mono">{contestInfo.progress}% 진행됨</p>
          </div>
        </aside>

        {/* [B] 중앙 콘텐츠 영역 (10칸) - 탭 상태에 따라 컴포넌트 교체 */}
        <section className="col-span-12 md:col-span-10 space-y-6">
          {activeTab === "poster" && <PosterTab />}
          {activeTab === "dashboard" && <DashboardTab contestInfo={contestInfo} />}
          {activeTab === "challenges" && <ChallengesTab />}
          {activeTab === "scoreboard" && <ScoreboardTab myRank={contestInfo.myRank} />}
          {activeTab === "qa" && <QATab />}
          {activeTab === "notice" && <NoticeManageTab />}
        </section>

      </main>
    </div>
  );
}


/* -------------------------------------------------------------------------- */
/* 1. 포스터 탭 */
/* -------------------------------------------------------------------------- */
function PosterTab() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      {/* 타이틀 및 헤더 영역 */}
      <div className="text-center space-y-4 py-10 bg-slate-900 rounded-3xl text-white relative overflow-hidden">
        <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-indigo-500/30 blur-3xl rounded-full"></div>
        <Badge className="bg-indigo-500 hover:bg-indigo-600 mb-2">제 1회 공식 해커톤</Badge>
        <h1 className="text-4xl font-black tracking-tight">Diveon Security Championship</h1>
        <p className="text-slate-400 font-medium">주최: 단국대학교 소프트웨어학과 / Diveon 운영진</p>

        <div className="flex justify-center gap-4 pt-6">
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 backdrop-blur text-left">
            <p className="text-xs text-slate-400 mb-1">대회 기간</p>
            <p className="font-bold">2026.05.20 10:00 ~ 18:00 (8시간)</p>
          </div>
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 backdrop-blur text-left">
            <p className="text-xs text-slate-400 mb-1">현재 상태</p>
            <p className="font-bold flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span> 진행 중</p>
          </div>
        </div>
      </div>

      {/* 정보 카드들 */}
      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="p-6 text-center space-y-1"><p className="text-slate-500 text-sm font-bold">참여자 수</p><p className="text-3xl font-black text-indigo-600">128<span className="text-sm text-slate-400 ml-1">명</span></p></CardContent></Card>
        <Card><CardContent className="p-6 text-center space-y-1"><p className="text-slate-500 text-sm font-bold">출제된 문제</p><p className="text-3xl font-black text-slate-900">15<span className="text-sm text-slate-400 ml-1">문제</span></p></CardContent></Card>
      </div>

      {/* 상세 설명 */}
      <Card className="shadow-none border-slate-200">
        <CardHeader><CardTitle className="text-lg">대회 설명</CardTitle></CardHeader>
        <CardContent className="prose prose-sm text-slate-600 leading-loose">
          <p>이번 대회는 웹 해킹, 포렌식, 리버싱 등 다양한 분야의 능력을 겨루는 종합 대회입니다. 시스템 공격 행위는 금지되며...</p>
          <div className="mt-4 flex gap-2">
            <Badge variant="outline">#웹해킹</Badge>
            <Badge variant="outline">#포렌식</Badge>
            <Badge variant="outline">#개인전</Badge>
            <Badge variant="outline">#대학생</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. 대시보드 탭 (기존 구현 내용 포함) */
/* -------------------------------------------------------------------------- */
function DashboardTab({ contestInfo }: { contestInfo: any }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
      <div className="lg:col-span-2 space-y-6">
        <Card className="border-indigo-100 bg-indigo-50/30 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-indigo-900">
              <AlertTriangle className="w-5 h-5 text-indigo-600" /> 운영진 공지
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 font-medium">
            <div className="p-3 bg-white rounded-lg border border-indigo-100 text-sm">
              <span className="font-bold text-indigo-600 mr-2">[18:30]</span> F-03번 문제의 힌트가 추가되었습니다.
            </div>
            <div className="p-3 bg-white rounded-lg border border-indigo-100 text-sm">
              <span className="font-bold text-indigo-600 mr-2">[15:00]</span> 서버 점검이 완료되었습니다.
            </div>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <h2 className="text-xl font-black flex items-center gap-2 px-1"><Flag className="text-indigo-600" /> 주요 챌린지</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 0명 솔브 -> 핏빛 UI */}
            <Card className="border-red-200 bg-red-50/30">
              <CardContent className="p-5 space-y-2">
                <Badge className="bg-red-500">First Blood 대기중 🩸</Badge>
                <h4 className="font-bold text-slate-900">커스텀 암호화 분석</h4>
                <div className="flex justify-between items-end pt-2 text-red-600">
                  <span className="text-xs font-bold">해결: 0명</span>
                  <span className="font-black text-lg">1000 pts</span>
                </div>
              </CardContent>
            </Card>
            {/* 엄청 많이 푼 문제 -> 꿀통 UI */}
            <Card className="border-amber-200 bg-amber-50/30">
              <CardContent className="p-5 space-y-2">
                <Badge className="bg-amber-500">챌린지 맛집 🔥</Badge>
                <h4 className="font-bold text-slate-900">기초 패킷 분석</h4>
                <div className="flex justify-between items-end pt-2 text-amber-600">
                  <span className="text-xs font-bold">해결: 112명</span>
                  <span className="font-black text-lg">50 pts</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <div className="space-y-6">
        <Card className="border-slate-200">
          <CardHeader className="pb-2 border-b"><CardTitle className="text-sm font-bold">TOP 5 스코어보드</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                {[1, 2, 3, 4, 5].map((rank) => (
                  <TableRow key={rank}><TableCell className="py-3 font-bold text-slate-400 w-12 text-center">{rank}</TableCell><TableCell className="py-3 font-medium text-sm">Hacker_0{rank}</TableCell><TableCell className="py-3 text-right pr-4 font-mono font-bold text-indigo-600">{2500 - rank * 200}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 text-white border-none overflow-hidden p-6 space-y-4 relative">
          <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl" />
          <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest relative z-10">My Status</p>
          <div className="flex justify-between items-end relative z-10">
            <div><p className="text-3xl font-black">{contestInfo.myScore}</p><p className="text-[10px] text-slate-400 font-bold uppercase">Points</p></div>
            <div className="text-right text-indigo-300 font-bold"><p className="text-xl">#{contestInfo.myRank}/{contestInfo.totalUser}</p><p className="text-[10px] text-slate-400 uppercase">Rank</p></div>
          </div>
          <Button className="w-full bg-indigo-600 hover:bg-indigo-700 relative z-10">내 풀이 기록</Button>
        </Card>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. 문제(Challenges) 탭 */
/* -------------------------------------------------------------------------- */
function ChallengesTab() {
  const [filter, setFilter] = useState("all"); // all, unsolved, popular
  const allChallenges = [
    { id: "F-01", title: "삭제된 파일 복구", points: 100, solved: 85, category: "Disk", status: "solved" },
    { id: "F-02", title: "메모리 덤프 분석", points: 300, solved: 32, category: "Memory", status: "unsolved" },
    { id: "F-03", title: "네트워크 패킷 추출", points: 500, solved: 12, category: "Network", status: "unsolved" },
    { id: "F-04", title: "안드로이드 백업 분석", points: 800, solved: 5, category: "Mobile", status: "unsolved" },
    { id: "F-05", title: "브라우저 히스토리 포렌식", points: 400, solved: 21, category: "Web", status: "solved" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black">대회 문제지</h2>
        <div className="flex gap-2">
          <Badge onClick={() => setFilter("all")} className={`cursor-pointer ${filter === "all" ? "bg-slate-900" : "bg-slate-200 text-slate-500"}`}>전체</Badge>
          <Badge onClick={() => setFilter("unsolved")} className={`cursor-pointer ${filter === "unsolved" ? "bg-indigo-600" : "bg-slate-200 text-slate-500"}`}>안 푼 문제</Badge>
          <Badge onClick={() => setFilter("popular")} className={`cursor-pointer ${filter === "popular" ? "bg-amber-500" : "bg-slate-200 text-slate-500"}`}>많이 푼 문제</Badge>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allChallenges.map((ch) => (
          <Card key={ch.id} className={`group cursor-pointer hover:shadow-md transition-all ${ch.status === 'solved' ? 'bg-slate-50/50' : 'bg-white'}`}>
            <CardContent className="p-5 space-y-4">
              <div className="flex justify-between items-start">
                <Badge variant="secondary" className="text-[10px]">{ch.category}</Badge>
                {ch.status === 'solved' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
              </div>
              <div>
                <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{ch.title}</h4>
                <p className="text-xs text-slate-400 mt-1">{ch.solved} Solvers</p>
              </div>
              <div className="flex justify-between items-end pt-2">
                <span className="text-xs font-mono text-slate-400">{ch.id}</span>
                <span className="text-xl font-black text-slate-800">{ch.points} pts</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                  <span>정답률</span>
                  <span>{Math.round((ch.solved / 128) * 100)}% ({ch.solved}명)</span>
                </div>
                <Progress value={(ch.solved / 128) * 100} className="h-1.5 bg-slate-100" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. 스코어보드 탭 */
/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */
/* 3. 스코어보드 탭 */
/* -------------------------------------------------------------------------- */
function ScoreboardTab({ myRank }: { myRank: number }) {
  // 모달 상태
  const [showFullRank, setShowFullRank] = useState(false);
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // [Mock] 상위 10위 랭킹 (메인 화면용)
  const topRankings = [
    { rank: 1, name: "Dankook_Hacker", solved: 12, score: 2850, lastSolved: "1분 전", isMe: false },
    { rank: 2, name: "Forensic_Master", solved: 11, score: 2600, lastSolved: "5분 전", isMe: false },
    { rank: 3, name: "Code_Warrior", solved: 10, score: 2400, lastSolved: "3분 전", isMe: false },
    { rank: 4, name: "Code_Warrior2", solved: 10, score: 2400, lastSolved: "3분 전", isMe: false },
    { rank: 5, name: "Code_Warrior3", solved: 10, score: 2400, lastSolved: "3분 전", isMe: false },
    { rank: 6, name: "Code_Warrior4", solved: 10, score: 2400, lastSolved: "3분 전", isMe: false },
    { rank: 7, name: "Code_Warrior5", solved: 10, score: 2400, lastSolved: "3분 전", isMe: false },
    { rank: 8, name: "Code_Warrior6", solved: 10, score: 2400, lastSolved: "3분 전", isMe: false },
    { rank: 9, name: "Code_Warrior7", solved: 10, score: 2400, lastSolved: "3분 전", isMe: false },
    { rank: 10, name: "Code_Warrior8", solved: 10, score: 2400, lastSolved: "3분 전", isMe: false }
  ];

  // [Mock] 100명 전체 랭킹 데이터 생성 (모달용)
  const fullRankings = Array.from({ length: 100 }).map((_, i) => ({
    rank: i + 1,
    name: i === 11 ? "박단용 (Me)" : `Hacker_${(i + 1).toString().padStart(3, '0')}`,
    solved: Math.max(0, 15 - Math.floor(i / 5)),
    score: Math.max(0, 3000 - i * 25),
    lastSolved: `${Math.floor(Math.random() * 59) + 1}분 전`,
    isMe: i === 11, // 12위가 나 자신이라고 가정
  }));

  // 페이지네이션 계산 로직
  const totalPages = Math.ceil(fullRankings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentRankings = fullRankings.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black">TOP 10 명예의 전당</h2>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-indigo-600 border-indigo-200 bg-indigo-50">마지막 업데이트: 방금 전</Badge>
          <Button variant="outline" size="sm" onClick={() => setShowFullRank(true)}>전체 순위 보기</Button>
        </div>
      </div>
      
      {/* 메인 화면 스코어보드 (상위권 일부만 노출) */}
      <Card className="border-slate-200 overflow-hidden rounded-2xl">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-20 text-center font-bold">순위</TableHead>
              <TableHead className="font-bold">참가자</TableHead>
              <TableHead className="text-center font-bold">해결 문제</TableHead>
              <TableHead className="text-right font-bold">총 점수</TableHead>
              <TableHead className="text-right pr-6 font-bold text-slate-400">마지막 제출</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topRankings.map((user) => (
              <TableRow key={user.rank} className={user.isMe ? "bg-indigo-50/50" : ""}>
                <TableCell className="text-center font-black text-slate-500">
                  {user.rank === 1 ? "🥇" : user.rank === 2 ? "🥈" : user.rank === 3 ? "🥉" : user.rank}
                </TableCell>
                <TableCell className="font-bold text-slate-800">
                  {user.name} {user.isMe && <Badge className="ml-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-100">ME</Badge>}
                </TableCell>
                <TableCell className="text-center font-mono font-medium">{user.solved}</TableCell>
                <TableCell className="text-right font-black text-indigo-600">{user.score.toLocaleString()}</TableCell>
                <TableCell className="text-right pr-6 text-xs text-slate-400">{user.lastSolved}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* 전체 순위 모달 */}
      {showFullRank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <Card className="w-full max-w-3xl h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <CardHeader className="flex flex-row justify-between items-center border-b pb-4 shrink-0">
              <div className="space-y-1">
                <CardTitle>전체 스코어보드</CardTitle>
                <CardDescription>총 {fullRankings.length}명의 참가자가 경쟁 중입니다.</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowFullRank(false)}>
                <X className="w-5 h-5 text-slate-500" />
              </Button>
            </CardHeader>
            
            {/* 테이블 영역 (스크롤 적용) */}
            <CardContent className="flex-1 overflow-y-auto p-0 relative">
              <Table>
                {/* 💡 헤더를 끈적(sticky)하게 만들어 스크롤 시에도 고정되게 설정 */}
                <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm border-b">
                  <TableRow>
                    <TableHead className="w-[80px] text-center font-bold pl-4">순위</TableHead>
                    <TableHead className="font-bold">참가자</TableHead>
                    <TableHead className="text-center font-bold">해결 문제</TableHead>
                    <TableHead className="text-right font-bold">총 점수</TableHead>
                    <TableHead className="text-right pr-6 font-bold text-slate-400">마지막 제출</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentRankings.map((user) => (
                    <TableRow key={user.rank} className={user.isMe ? "bg-indigo-50/50" : ""}>
                      <TableCell className="text-center font-black text-slate-500 pl-4">
                        {user.rank === 1 ? "🥇" : user.rank === 2 ? "🥈" : user.rank === 3 ? "🥉" : user.rank}
                      </TableCell>
                      <TableCell className="font-bold text-slate-800">
                        {user.name} {user.isMe && <Badge className="ml-2 bg-indigo-100 text-indigo-700">ME</Badge>}
                      </TableCell>
                      <TableCell className="text-center font-mono font-medium">{user.solved}</TableCell>
                      <TableCell className="text-right font-black text-indigo-600">{user.score.toLocaleString()}</TableCell>
                      <TableCell className="text-right pr-6 text-xs text-slate-400">{user.lastSolved}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>

            {/* 페이지네이션 영역 (모달 하단에 고정) */}
            <div className="p-4 border-t bg-white flex justify-center items-center gap-2 shrink-0 rounded-b-xl">
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              >
                이전
              </Button>

              <div className="flex gap-1">
                {Array.from({ length: totalPages }).map((_, i) => {
                  const p = i + 1;
                  // 모달창에서 10개가 넘어가면 번호가 너무 길어지므로 1~5, 6~10 페이지씩 간단히 잘라 보여주기 위한 로직
                  if (totalPages > 7 && p !== 1 && p !== totalPages && Math.abs(p - currentPage) > 1) {
                    if (p === 2 && currentPage > 3) return <span key={p} className="text-slate-400 text-xs px-1 self-end">...</span>;
                    if (p === totalPages - 1 && currentPage < totalPages - 2) return <span key={p} className="text-slate-400 text-xs px-1 self-end">...</span>;
                    return null;
                  }

                  return (
                    <Button
                      key={p}
                      variant={currentPage === p ? "default" : "outline"}
                      size="sm"
                      className={`w-8 h-8 p-0 rounded-lg ${currentPage === p ? "bg-slate-900 text-white" : ""}`}
                      onClick={() => setCurrentPage(p)}
                    >
                      {p}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="rounded-lg"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              >
                다음
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. 질의응답(Q&A) 탭 */
/* -------------------------------------------------------------------------- */
function QATab() {
  // 토글 열림 상태 관리
  const [openQId, setOpenQId] = useState<number | null>(null);
  const faqs = [
    { id: 1, q: "문제 데이터가...", a: "브라우저 설정...", author: "User1", isMe: true },
    { id: 2, q: "플래그 형식...", a: null, author: "User2", isMe: false },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 질문 작성 폼 */}
      <Card className="border-indigo-100 bg-indigo-50/30">
        <CardContent className="p-4 flex gap-2 items-center">
          <Input placeholder="새로운 질문을 등록하세요 (모두에게 공개됩니다)" className="bg-white" />
          <Button>등록</Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {faqs.map((faq) => (
          <Card key={faq.id} className="overflow-hidden">
            {/* 질문 헤더 (토글 버튼 역할) */}
            <div 
              className="p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => setOpenQId(openQId === faq.id ? null : faq.id)}
            >
              <div className="flex items-center gap-3">
                <span className="font-black text-indigo-600">Q.</span>
                <span className="font-bold text-slate-800">{faq.q}</span>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant={faq.a ? 'outline' : 'secondary'}>{faq.a ? '답변완료' : '대기중'}</Badge>
                <ChevronRight className={`w-4 h-4 transition-transform ${openQId === faq.id ? 'rotate-90' : ''}`} />
              </div>
            </div>

            {/* 토글 바디 (답변 및 버튼들) */}
            {openQId === faq.id && (
              <div className="p-4 border-t bg-slate-50 space-y-4">
                {faq.a ? (
                  <p className="text-sm text-slate-700 leading-relaxed"><span className="font-black text-slate-400 mr-2">A.</span> {faq.a}</p>
                ) : (
                  <p className="text-sm text-slate-400 italic">아직 운영진의 답변이 등록되지 않았습니다.</p>
                )}

                {/* 하단 액션 버튼 */}
                <div className="flex justify-end gap-2 pt-2">
                  {faq.isMe && (
                    <>
                      <Button variant="outline" size="sm" className="h-7 text-xs">질문 수정</Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs text-red-500">삭제</Button>
                    </>
                  )}
                  {/* 운영자일 경우 답변 달기 버튼 */}
                  <Button size="sm" className="h-7 text-xs">답변 달기 (운영자)</Button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. 운영진 공지 탭 */
/* -------------------------------------------------------------------------- */
function NoticeManageTab() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-black mb-4">공지사항 관리</h2>
      
      {/* 작성 폼 */}
      <Card className="border-indigo-500 shadow-md">
        <CardHeader><CardTitle className="text-sm">새 공지 등록</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="공지 제목" />
          <Textarea placeholder="내용을 입력하세요..." className="min-h-[100px]" />
          <div className="flex justify-end"><Button>공지 전송 및 알림 발송</Button></div>
        </CardContent>
      </Card>

      {/* 기존 공지 목록 */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-500">등록된 공지</h3>
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="font-bold text-slate-800">서버 점검 안내</p>
                <p className="text-xs text-slate-400">2026.05.20 15:00</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="text-indigo-600"><Edit2 className="w-4 h-4"/></Button>
                <Button variant="ghost" size="sm" className="text-red-500"><Trash2 className="w-4 h-4"/></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 공통 보조 컴포넌트 */
/* -------------------------------------------------------------------------- */
function ContestSideBtn({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${active ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-slate-500 hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200"
      }`}>
      {icon} <span>{label}</span>
    </button>
  );
}

function ChallengeMiniCard({ id, title, points, solved, category }: any) {
  return (
    <Card className="hover:border-indigo-500 transition-colors cursor-pointer group">
      <CardContent className="p-5 flex justify-between items-center">
        <div className="space-y-1">
          <Badge variant="outline" className="text-[10px]">{category}</Badge>
          <h4 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{title}</h4>
          <p className="text-xs text-slate-400">{solved}명 해결</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-black text-slate-900">{points}</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Points</p>
        </div>
      </CardContent>
    </Card>
  );
}