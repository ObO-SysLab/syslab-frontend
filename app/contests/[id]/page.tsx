"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Search, Settings, LogOut, User, Menu, Trophy, Flag, Clock, 
  AlertTriangle, Terminal, BarChart3, MessageSquare, ChevronRight,
  CheckCircle2, HelpCircle, Send, Filter
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

export default function ContestDetailPage() {
  // [상태 관리] 현재 활성화된 탭 (dashboard, challenges, scoreboard, qa)
  const [activeTab, setActiveTab] = useState("dashboard");

  // [Mock Data] 대회 정보
  const contestInfo = {
    title: "제1회 단국대 디지털 포렌식 챌린지",
    remainingTime: "02:14:35",
    progress: 65,
    myRank: 12,
    myScore: 1450,
  };

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

        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right mr-2">
            <p className="text-[10px] text-slate-500 uppercase font-bold">My Rank</p>
            <p className="text-sm font-black text-indigo-400">#{contestInfo.myRank}</p>
          </div>
          <div className="h-9 w-9 rounded-full bg-indigo-500 border-2 border-slate-700 flex items-center justify-center font-bold text-xs">JD</div>
        </div>
      </header>

      {/* 2. 메인 레이아웃 */}
      <main className="container mx-auto max-w-[1500px] pt-6 grid grid-cols-1 md:grid-cols-12 gap-6 px-4 pb-12">

        {/* [A] 좌측 사이드바 내비게이션 (2칸) */}
        <aside className="col-span-12 md:col-span-2 space-y-2">
           <nav className="space-y-1">
             <ContestSideBtn icon={<Terminal size={18}/>} label="대시보드" active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} />
             <ContestSideBtn icon={<Flag size={18}/>} label="문제(Challenges)" active={activeTab === "challenges"} onClick={() => setActiveTab("challenges")} />
             <ContestSideBtn icon={<BarChart3 size={18}/>} label="스코어보드" active={activeTab === "scoreboard"} onClick={() => setActiveTab("scoreboard")} />
             <ContestSideBtn icon={<MessageSquare size={18}/>} label="질의응답(Q&A)" active={activeTab === "qa"} onClick={() => setActiveTab("qa")} />
           </nav>
           <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm mt-6">
              <p className="text-xs font-bold text-slate-400 mb-2 uppercase">진행률</p>
              <Progress value={contestInfo.progress} className="h-2 mb-2" />
              <p className="text-[10px] text-right text-slate-500 font-mono">{contestInfo.progress}% 진행됨</p>
           </div>
        </aside>

        {/* [B] 중앙 콘텐츠 영역 (10칸) - 탭 상태에 따라 컴포넌트 교체 */}
        <section className="col-span-12 md:col-span-10 space-y-6">
          {activeTab === "dashboard" && <DashboardTab contestInfo={contestInfo} />}
          {activeTab === "challenges" && <ChallengesTab />}
          {activeTab === "scoreboard" && <ScoreboardTab myRank={contestInfo.myRank} />}
          {activeTab === "qa" && <QATab />}
        </section>

      </main>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 1. 대시보드 탭 (기존 구현 내용 포함) */
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
            <ChallengeMiniCard id="F-01" title="삭제된 파일 복구" points={100} solved={85} category="Disk" />
            <ChallengeMiniCard id="F-02" title="메모리 덤프 분석" points={300} solved={32} category="Memory" />
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
            <div className="text-right text-indigo-300 font-bold"><p className="text-xl">#{contestInfo.myRank}</p><p className="text-[10px] text-slate-400 uppercase">Rank</p></div>
          </div>
          <Button className="w-full bg-indigo-600 hover:bg-indigo-700 relative z-10">내 풀이 기록</Button>
        </Card>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. 문제(Challenges) 탭 */
/* -------------------------------------------------------------------------- */
function ChallengesTab() {
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
          <Button variant="outline" size="sm" className="rounded-lg"><Filter className="w-4 h-4 mr-2" /> 필터</Button>
          <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-none px-3">총 12문제</Badge>
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. 스코어보드 탭 */
/* -------------------------------------------------------------------------- */
function ScoreboardTab({ myRank }: { myRank: number }) {
  const rankings = [
    { rank: 1, name: "Dankook_Hacker", solved: 12, score: 2850, lastSolved: "1분 전" },
    { rank: 2, name: "Forensic_Master", solved: 11, score: 2600, lastSolved: "5분 전" },
    { rank: 12, name: "박단용 (Me)", solved: 8, score: 1450, lastSolved: "12분 전", isMe: true },
    { rank: 13, name: "Code_Warrior", solved: 8, score: 1400, lastSolved: "3분 전" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black">실시간 순위표</h2>
        <Badge variant="outline" className="text-indigo-600 border-indigo-200 bg-indigo-50">마지막 업데이트: 방금 전</Badge>
      </div>
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
            {rankings.map((user) => (
              <TableRow key={user.rank} className={user.isMe ? "bg-indigo-50/50" : ""}>
                <TableCell className="text-center font-black text-slate-500">
                  {user.rank === 1 ? "🥇" : user.rank === 2 ? "🥈" : user.rank}
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
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. 질의응답(Q&A) 탭 */
/* -------------------------------------------------------------------------- */
function QATab() {
  const faqs = [
    { q: "문제 데이터가 다운로드되지 않습니다.", a: "브라우저의 팝업 차단 설정을 확인하거나 다른 브라우저(Chrome/Edge)를 사용해 보세요.", status: "resolved" },
    { q: "F-02번 문제 플래그 형식이 어떻게 되나요?", a: "기본 형식인 DK{...}를 유지하며 대소문자를 구분합니다.", status: "resolved" },
    { q: "서버가 가끔 느려지는 것 같습니다.", a: "운영진에서 확인 중입니다. 잠시 후 다시 시도해 주세요.", status: "pending" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black">궁금한 점이 있으신가요?</h2>
        <p className="text-slate-500">운영진에게 질문하거나 기존 답변을 확인하세요.</p>
      </div>
      
      <div className="flex gap-3">
        <Input placeholder="질문 내용을 입력하세요..." className="h-12 bg-white shadow-sm focus-visible:ring-indigo-500" />
        <Button className="h-12 px-6 bg-slate-900"><Send className="w-4 h-4 mr-2" /> 질문하기</Button>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-slate-400 uppercase tracking-widest text-xs px-1">최근 문의 내역</h3>
        {faqs.map((faq, i) => (
          <Card key={i} className="border-slate-100 shadow-sm overflow-hidden">
            <CardHeader className="py-4 bg-slate-50/50">
              <div className="flex justify-between items-start gap-4">
                <div className="flex gap-3">
                  <HelpCircle className="w-5 h-5 text-indigo-500 mt-0.5" />
                  <p className="font-bold text-slate-800">{faq.q}</p>
                </div>
                <Badge variant={faq.status === 'resolved' ? 'outline' : 'secondary'} className={faq.status === 'resolved' ? 'text-green-600 border-green-200' : ''}>
                  {faq.status === 'resolved' ? '답변완료' : '검토중'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="py-4 border-t bg-white">
              <p className="text-sm text-slate-600 leading-relaxed pl-8">
                <span className="font-black text-indigo-600 mr-2">A.</span> {faq.a}
              </p>
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
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
      active ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-slate-500 hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200"
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