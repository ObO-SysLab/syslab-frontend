"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Users, Settings, Menu, Trophy, Flag, Clock, AlertTriangle, Terminal, BarChart3, MessageSquare,
  CheckCircle2, PlusCircle, Bell, X, ChevronRight, Edit2, Trash2, Search, Crown
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { desc } from "framer-motion/client";


function ContestDetailPage() {
  // [STATE] 페이지
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [isContestHost, setIsContestHost] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isJoined, setIsJoined] = useState(false);
  const router = useRouter();

  // [STATE] 데이터
  const searchParams = useSearchParams();
  const contestId = searchParams.get('id');

  // [STATE] 알림
  const [showNotiModal, setShowNotiModal] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // [STATE] 포스터 탭
  const [contestInfo, setContestInfo] = useState<any>();

  // [STATE] 대시보드 탭
  const [myScore, setMyScore] = useState(0);
  const [myRank, setMyRank] = useState(0);

  // [STATE] 챌린지 탭
  const [showAddChallengeModal, setShowAddChallengeModal] = useState(false);
  const [allChallenges, setAllChallenges] = useState<any[]>([]);

  // [STATE] 스코어보드 탭
  const [fullRankings, setFullRankings] = useState<any[]>([]);
  const [scoreBoardTotalPages, setScoreBoardTotalPages] = useState(1);
  const [scoreBoardCurrentPage, setScoreBoardCurrentPage] = useState(1);

  // [STATE] 질의응답 탭
  const [faqs, setFaqs] = useState<any[]>([]);

  // [STATE] 공지 탭
  const [notices, setNotices] = useState<any[]>([]);

  // [STATE] 참가자 관리 탭
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [participantsTotalPages, setParticipantsTotalPages] = useState(1);
  const [participantsCurrentPage, setParticipantsCurrentPage] = useState(1);
  const [participants, setParticipants] = useState<any[]>([]);

  // [API] 초기 페이지 데이터 로드
  useEffect(() => {
    const fetchInitData = async () => {
      const token = localStorage.getItem("token");
      if (token) setIsLoggedIn(true);

      if (contestId) {
        try {
          await Promise.all([
            fetchPosterUser(),
            fetchChallenges(),
            fetchScoreboard(),
            fetchFaqs(),
            fetchNotice()
          ]);
        } catch (error) {
          console.error("초기 데이터 로드 중 일부 실패:", error);
        }
      }
    };

    fetchInitData();
  }, [contestId]);

  useEffect(() => {
    if (activeTab === "scoreboard") fetchScoreboard();
  }, [scoreBoardCurrentPage, activeTab]);

  useEffect(() => {
    if (activeTab === "participants") fetchParticipants();
  }, [participantsCurrentPage, activeTab]);

  // [API] 포스터, 유저 정보
  const fetchPosterUser = async () => {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`https://diveon.net/api/contests/${contestId}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        const json = await res.json();
        setContestInfo(json.data);
        setMyScore(json.data.userContext.myScore);
        setMyRank(json.data.userContext.myRank);
        setIsJoined(json.data.userContext.isJoined);
        setIsContestHost(json.data.userContext.isContestLeader);
      }
    } catch (error) {
      console.error("대회 정보 로드 실패:", error);
    }
  };

  // [API] 대회 참가
  const handleEnterContest = async () => {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`https://diveon.net/api/contests/${contestId}/join`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        alert("대회에 참가하였습니다.");
        setIsJoined(true);
        await Promise.all([
          fetchPosterUser(),
          fetchChallenges(),
          fetchScoreboard(),
          fetchFaqs(),
          fetchNotice()
        ]);
      }
    } catch (error) {
      console.error("대회 참가 실패:", error);
    }
  };

  // [API] 대회 취소
  const handleCancelContest = async () => {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`https://diveon.net/api/contests/${contestId}/leave`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        alert("대회 참가 취소하였습니다.");
        setIsJoined(false);
        await Promise.all([
          fetchPosterUser(),
          fetchChallenges(),
          fetchScoreboard(),
          fetchFaqs(),
          fetchNotice()
        ]);
      }
    } catch (error) {
      console.error("대회 참가 취소 실패:", error);
    }
  };

  // [API] 대회 문제 목록 조회
  const fetchChallenges = async () => {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`https://diveon.net/api/contests/${contestId}/problems`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        const json = await res.json();
        setAllChallenges(json.data.problems || []);
      }
    } catch (error) {
      console.error("대회 챌린지 로드 실패:", error);
    }
  };

  // [API] 문제 점수 설정
  const handleChallengePoint = async (problemId: string, points: string) => {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`https://diveon.net/api/contests/${contestId}/problems/${problemId}/points`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          points: points
        })
      });

      if (res.ok) {
        const json = await res.json();
        fetchChallenges();
      }
    } catch (error) {
      console.error("챌린지 점수 설정 실패:", error);
    }
  };

  // [API] 문제 제거
  const handleRemoveChallenge = async (problemId: string) => {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`https://diveon.net/api/contests/${contestId}/problems/${problemId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        const json = await res.json();
        fetchChallenges();
      }
    } catch (error) {
      console.error("챌린지 제거 실패:", error);
    }
  };

  // [API] 스코어보드
  const fetchScoreboard = async () => {
    const token = localStorage.getItem("token");

    const params = new URLSearchParams();
    params.append("page", scoreBoardCurrentPage.toString());
    params.append("size", "10");

    try {
      const res = await fetch(`https://diveon.net/api/contests/${contestId}/rankings?${params.toString()}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        const json = await res.json();
        setScoreBoardTotalPages(json.data.totalPages);
        setTotalParticipants(json.data.totalElements);
        setFullRankings(json.data.rankings);
      }

    } catch (error) {
      console.error("스코어보드 로드 실패:", error);
    }
  };

  // [API] 질문 목록 조회
  const fetchFaqs = async () => {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`https://diveon.net/api/contests/${contestId}/qnas`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        const json = await res.json();
        setFaqs(json.data.qnas);
      }
    } catch (error) {
      console.error("질문 불러오기 실패:", error);
      setFaqs([]);
    }
  };

  // [API] 질문 생성
  const handleCreateQuestion = async (question: string) => {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`https://diveon.net/api/contests/${contestId}/qnas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          question: question
        })
      });

      if (res.ok) {
        alert("질문이 생성 되었습니다.");
        fetchFaqs();
      }
    } catch (error) {
      console.error("질문 생성 실패:", error);
    }
  };

  // [API] 질문 삭제
  const handleDeleteQuestion = async (faqId: string) => {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`https://diveon.net/api/contests/${contestId}/qnas/${faqId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        alert("질문이 삭제 되었습니다.");
        fetchFaqs();
      }
    } catch (error) {
      console.error("질문 삭제 실패:", error);
    }
  };

  // [API] 답변 생성
  const handleCreateAnswer = async (faqId: string, answer: string) => {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`https://diveon.net/api/contests/${contestId}/qnas/${faqId}/answers`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          answer: answer
        })
      });

      if (res.ok) {
        alert("답변이 생성 되었습니다.");
        fetchFaqs();
      }
    } catch (error) {
      console.error("답변 생성 실패:", error);
    }
  };

  // [API] 답변 삭제
  const handleDeleteAnswer = async (faqId: string, answerId: string) => {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`https://diveon.net/api/contests/${contestId}/qnas/${faqId}/answers/${answerId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        alert("답변이 삭제 되었습니다.");
        fetchFaqs();
      }
    } catch (error) {
      console.error("답변 삭제 실패:", error);
    }
  }

  // [API] 공지 목록 조회
  const fetchNotice = async () => {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`https://diveon.net/api/contests/${contestId}/notices`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        const json = await res.json();
        setNotices(json.data.notices);
      }
    } catch (error) {
      console.error("공지 불러오기 실패:", error);
    }
  };

  // [API] 공지 생성
  const handleCreateNotice = async (title: string, content: string) => {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`https://diveon.net/api/contests/${contestId}/notices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title,
          content: content
        })
      });

      if (res.ok) {
        alert("공지가 생성 되었습니다.");
        fetchNotice();
      }
    } catch (error) {
      console.error("공지 생성 실패:", error);
    }
  };

  // [API] 공지 수정
  const handleEditNotice = async (noticeId: string, title: string, content: string) => {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`https://diveon.net/api/contests/${contestId}/notices/${noticeId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title,
          content: content
        })
      });

      if (res.ok) {
        alert("공지가 수정 되었습니다.");
        fetchNotice();
      }
    } catch (error) {
      console.error("공지 수정 실패:", error);
    }
  };

  // [API] 공지 삭제
  const handleDeleteNotice = async (noticeId: string) => {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`https://diveon.net/api/contests/${contestId}/notices/${noticeId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        alert("공지가 삭제 되었습니다.");
        fetchNotice();
      }
    } catch (error) {
      console.error("공지 삭제 실패:", error);
    }
  };

  // [API] 참가자 목록 조회
  const fetchParticipants = async () => {
    const token = localStorage.getItem("token");

    const params = new URLSearchParams();
    params.append("page", participantsCurrentPage.toString());
    params.append("size", "10");

    try {
      const res = await fetch(`https://diveon.net/api/contests/${contestId}/participants?${params.toString()}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        const json = await res.json();
        setParticipants(json.data.participants);
        setParticipantsTotalPages(json.data.totalPages);
      }
    } catch (error) {
      console.error("참가자 목록 로드 실패:", error);
    }
  };

  // [API] 참가자 실격 처리
  const handleBan = async (userId: string, ban: boolean) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`https://diveon.net/api/contests/${contestId}/participants/${userId}/ban`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ isBanned: ban })
      });
      if (res.ok) {
        alert("참가자 상태가 변경되었습니다.");
        fetchParticipants();
      }
    } catch (error) { console.error(error); }
  };

  // [API] 대회 설정 수정
  const handleEditSettings = async (title: string, description: string, startTime: string, endTime: string) => {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`https://diveon.net/api/contests/${contestId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title,
          description: description,
          startTime: startTime,
          endTime: endTime
        })
      });

      if (res.ok) {
        alert("대회 설정이 수정 되었습니다.");
        fetchPosterUser();
      }
    } catch (error) {
      console.error("대회 설정 실패:", error);
    }
  };

  // [API] 대회 삭제
  const handleDeleteContest = async () => {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`https://diveon.net/api/contests/${contestId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        alert("대회가 삭제 되었습니다.");
        router.push(`/contests`);
      }
    } catch (error) {
      console.error("대회 삭제 실패:", error);
    }
  };

  // [HANDLER] 로그아웃
  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    window.location.href = "/";
  };

  if (!contestInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

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
            <span>-</span>
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
            {isContestHost && (
              <>
                <div className="my-4 border-t border-slate-200" />
                <ContestSideBtn icon={<Users size={18} />} label="참가자 관리" active={activeTab === "participants"} onClick={() => setActiveTab("participants")} />
                <ContestSideBtn icon={<AlertTriangle size={18} />} label="공지 관리" active={activeTab === "notice"} onClick={() => setActiveTab("notice")} />
                <ContestSideBtn icon={<Settings size={18} />} label="대회 설정" active={activeTab === "settings"} onClick={() => setActiveTab("settings")} />
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
          {activeTab === "poster" && (
            <PosterTab
              contestInfo={contestInfo}
              isJoined={isJoined}
              isContestHost={isContestHost}
              handleEnterContest={handleEnterContest}
              handleCancelContest={handleCancelContest}
            />
          )}
          {activeTab === "dashboard" && (
            <DashboardTab
              contestInfo={contestInfo}
              notices={notices}
              allChallenges={allChallenges}
              fullRankings={fullRankings}
              router={router}
              setActiveTab={setActiveTab}
              contestId={contestId}
            />
          )}
          {activeTab === "challenges" && (
            <ChallengesTab
              contestId={contestId}
              isContestHost={isContestHost}
              allChallenges={allChallenges}
              handleChallengePoint={handleChallengePoint}
              handleRemoveChallenge={handleRemoveChallenge}
              setShowAddChallengeModal={setShowAddChallengeModal}
              router={router}
            />
          )}
          {activeTab === "scoreboard" && (
            <ScoreboardTab
              myRank={myRank}
              fullRankings={fullRankings}
              scoreBoardTotalPages={scoreBoardTotalPages}
              scoreBoardCurrentPage={scoreBoardCurrentPage}
              setScoreBoardCurrentPage={setScoreBoardCurrentPage}
            />
          )}
          {activeTab === "qa" && <QATab faqs={faqs} isContestHost={isContestHost} handleCreateQuestion={handleCreateQuestion} handleDeleteQuestion={handleDeleteQuestion} handleCreateAnswer={handleCreateAnswer} handleDeleteAnswer={handleDeleteAnswer} />}
          {activeTab === "participants" && <ParticipantsManageTab participants={participants} handleBan={handleBan} />}
          {activeTab === "notice" && <NoticeManageTab notices={notices} handleCreateNotice={handleCreateNotice} handleEditNotice={handleEditNotice} handleDeleteNotice={handleDeleteNotice} />}
          {activeTab === "settings" && <ContestSettingsTab contestInfo={contestInfo} handleEditSettings={handleEditSettings} handleDeleteContest={handleDeleteContest} />}
        </section>

        {showAddChallengeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <Card className="w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
              {/* 모달 헤더 */}
              <CardHeader className="flex flex-row items-center justify-between border-b pb-4 shrink-0 bg-white rounded-t-xl">
                <div className="space-y-1">
                  <CardTitle className="text-lg">기존 문제 추가</CardTitle>
                  <CardDescription>공개된 문제나 그룹 내 문제를 검색하여 대회에 추가합니다.</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowAddChallengeModal(false)}>
                  <X className="w-5 h-5 text-slate-500" />
                </Button>
              </CardHeader>

              {/* 검색창 */}
              <div className="p-4 border-b bg-slate-50 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input placeholder="문제 제목, 카테고리 또는 작성자 검색..." className="pl-9 bg-white" />
                </div>
              </div>

              {/* 검색 결과 리스트 */}
              <CardContent className="overflow-y-auto p-0 flex-1 hide-scrollbar">
                <Table>
                  <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                    <TableRow>
                      <TableHead className="pl-6 w-24">ID</TableHead>
                      <TableHead>문제명</TableHead>
                      <TableHead>카테고리</TableHead>
                      <TableHead className="text-right pr-6">액션</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Mock 데이터 렌더링 */}
                    {[1, 2, 3, 4, 5].map((i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs text-slate-500 pl-6">P-10{i}</TableCell>
                        <TableCell className="font-bold text-slate-800">커널 동작 기초 {i}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">Kernel</Badge></TableCell>
                        <TableCell className="text-right pr-6">
                          <Button
                            size="sm"
                            className="bg-slate-900 text-white hover:bg-slate-800 h-8 text-xs"
                            onClick={() => alert(`문제 P-10${i}가 대회에 추가되었습니다.`)}
                          >
                            추가하기
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}


/* -------------------------------------------------------------------------- */
/* 1. 포스터 탭 */
/* -------------------------------------------------------------------------- */
function PosterTab({ contestInfo, isJoined, isContestHost, handleEnterContest, handleCancelContest }: any) {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      {/* 타이틀 및 헤더 영역 */}
      <div className="text-center space-y-4 py-10 bg-slate-900 rounded-3xl text-white relative overflow-hidden">
        <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-indigo-500/30 blur-3xl rounded-full"></div>
        {/* <Badge className="bg-indigo-500 hover:bg-indigo-600 mb-2">제 1회 공식 해커톤</Badge> */}
        <h1 className="text-4xl font-black tracking-tight">{contestInfo.title}</h1>
        <p className="text-slate-400 font-medium">주최: -</p>

        <div className="flex justify-center gap-4 pt-6">
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 backdrop-blur text-left">
            <p className="text-xs text-slate-400 mb-1">대회 기간</p>
            <p className="font-bold">{contestInfo.startTime} ~ {contestInfo.endTime}</p>
          </div>
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 backdrop-blur text-left">
            <p className="text-xs text-slate-400 mb-1">현재 상태</p>
            <p className="font-bold flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span> {contestInfo.status}</p>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          {isContestHost ? (
            <div className="bg-slate-800 text-slate-300 font-bold px-10 py-4 rounded-xl border border-slate-700 shadow-inner flex items-center justify-center gap-2">
              <Crown className="w-4 h-4 text-amber-500 mx-auto" /> 이 대회의 운영진 계정으로 접속 중입니다.
            </div>
          ) : isJoined ? (
            <Button
              variant="destructive"
              className="bg-red-500 hover:bg-red-600 text-white px-10 py-6 h-auto shadow-lg shadow-red-500/10 font-black tracking-tight rounded-xl transition-all active:scale-95 duration-150"
              onClick={() => {
                if (confirm("정말 대회 참가를 취소하시겠습니까?")) handleCancelContest();
              }}
            >
              대회 참가 취소
            </Button>
          ) : (
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg px-10 py-6 h-auto shadow-lg shadow-indigo-500/20 transition-all active:scale-95 duration-150"
              onClick={() => {
                if (confirm("대회에 참가하시겠습니까?")) handleEnterContest();
              }}
            >
              지금 참가하기
            </Button>
          )}
        </div>
      </div>

      {/* 정보 카드들 */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6 text-center space-y-1">
            <p className="text-slate-500 text-sm font-bold">참여자 수</p>
            <p className="text-3xl font-black text-indigo-600">{contestInfo.totalUser}<span className="text-sm text-slate-400 ml-1">명</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center space-y-1">
            <p className="text-slate-500 text-sm font-bold">출제된 문제</p>
            <p className="text-3xl font-black text-slate-900">-<span className="text-sm text-slate-400 ml-1">문제</span></p>
          </CardContent>
        </Card>
      </div>

      {/* 상세 설명 */}
      <Card className="shadow-none border-slate-200">
        <CardHeader><CardTitle className="text-lg">대회 설명</CardTitle></CardHeader>
        <CardContent className="prose prose-sm text-slate-600 leading-loose">
          <p>{contestInfo.description}</p>
          <div className="mt-4 flex gap-2">
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
function DashboardTab({
  contestInfo,
  notices = [],
  allChallenges = [],
  fullRankings = [],
  router,
  setActiveTab,
  contestId
}: {
  contestInfo: any,
  notices?: any[],
  allChallenges?: any[],
  fullRankings?: any[],
  router: any,
  setActiveTab: (tab: string) => void,
  contestId: string | null
}) {
  const firstBloodChallenge = allChallenges.find(ch => ch.solvedCount === 0) || allChallenges[0];
  const hotChallenge = allChallenges.find(ch => ch.solvedCount > 50) || allChallenges[1];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
      <div className="lg:col-span-2 space-y-6">

        {/* 1. 운영진 공지 영역 동적 연동 */}
        <Card className="border-indigo-100 bg-indigo-50/30 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-indigo-900">
              <AlertTriangle className="w-5 h-5 text-indigo-600" /> 운영진 공지
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 font-medium">
            {notices.length === 0 ? (
              <p className="text-sm text-slate-400 italic p-2">등록된 공지사항이 없습니다.</p>
            ) : (
              notices.slice(0, 2).map((noti) => (
                <div key={noti.id} className="p-3 bg-white rounded-lg border border-indigo-100 text-sm flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setActiveTab("notice")}>
                  <div>
                    <span className="font-bold text-indigo-600 mr-2">[{noti.createdAt?.substring(11, 16)}]</span>
                    <span className="text-slate-700 font-semibold">{noti.title}</span>
                  </div>
                  <span className="text-xs text-slate-400 truncate max-w-[200px] md:max-w-[300px]">{noti.content}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* 2. 주요 챌린지 동적 연동 */}
        <div className="space-y-4">
          <h2 className="text-xl font-black flex items-center gap-2 px-1"><Flag className="text-indigo-600" /> 주요 챌린지</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* [A] 퍼스트 블러드 대기 문제 (클릭 시 상세 이동) */}
            {firstBloodChallenge ? (
              <Link href={`/contests/challenge/?probId=${firstBloodChallenge.problemId}&contestProblemId=${firstBloodChallenge.contestProblemId}&contestId=${contestId}`} className="block">
                <Card className="border-red-200 bg-red-50/30 hover:border-red-300 hover:shadow-md transition-all cursor-pointer">
                  <CardContent className="p-5 space-y-2">
                    <Badge className="bg-red-500">First Blood 대기중 🩸</Badge>
                    <h4 className="font-bold text-slate-900 group-hover:text-indigo-600">{firstBloodChallenge.title}</h4>
                    <div className="flex justify-between items-end pt-2 text-red-600">
                      <span className="text-xs font-bold">해결: {firstBloodChallenge.solvedCount}명</span>
                      <span className="font-black text-lg">{firstBloodChallenge.points} pts</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ) : (
              <div className="text-sm text-slate-400 italic p-6 border rounded-xl bg-white text-center">출제된 문제가 없습니다.</div>
            )}

            {/* [B] 챌린지 맛집 문제 (클릭 시 상세 이동) */}
            {hotChallenge ? (
              <Link href={`/contests/challenge/?probId=${hotChallenge.problemId}&contestProblemId=${hotChallenge.contestProblemId}&contestId=${contestId}`} className="block">
                <Card className="border-amber-200 bg-amber-50/30 hover:border-amber-300 hover:shadow-md transition-all cursor-pointer">
                  <CardContent className="p-5 space-y-2">
                    <Badge className="bg-amber-500">챌린지 맛집 🔥</Badge>
                    <h4 className="font-bold text-slate-900">{hotChallenge.title}</h4>
                    <div className="flex justify-between items-end pt-2 text-amber-600">
                      <span className="text-xs font-bold">해결: {hotChallenge.solvedCount}명</span>
                      <span className="font-black text-lg">{hotChallenge.points} pts</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ) : null}

          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* 3. TOP 5 스코어보드 동적 연동 (클릭 시 스코어보드 탭 전환) */}
        <Card className="border-slate-200 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer overflow-hidden" onClick={() => setActiveTab("scoreboard")}>
          <CardHeader className="pb-2 border-b bg-slate-50/50 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold">TOP 5 스코어보드</CardTitle>
            <span className="text-[11px] text-indigo-600 font-bold hover:underline">전체보기</span>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                {fullRankings.length === 0 ? (
                  <TableRow><TableCell className="text-center py-6 text-sm text-slate-400">참가자 데이터가 없습니다.</TableCell></TableRow>
                ) : (
                  fullRankings.slice(0, 5).map((user, index) => (
                    <TableRow key={user.userId || index} className={user.isMe ? "bg-indigo-50/30" : ""}>
                      <TableCell className="py-3 font-bold text-slate-400 w-12 text-center">{index + 1}</TableCell>
                      <TableCell className="py-3 font-medium text-sm">
                        {user.nickname} {user.isMe && <Badge className="ml-1 text-[9px] bg-indigo-100 text-indigo-700">ME</Badge>}
                      </TableCell>
                      <TableCell className="py-3 text-right pr-4 font-mono font-bold text-indigo-600">
                        {user.score?.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 4. 내 상태(My Status) 동적 연동 */}
        <Card className="bg-slate-900 text-white border-none overflow-hidden p-6 space-y-4 relative">
          <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl" />
          <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest relative z-10">My Status</p>
          <div className="flex justify-between items-end relative z-10">
            <div>
              <p className="text-3xl font-black">{contestInfo?.userContext?.myScore?.toLocaleString() || 0}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Points</p>
            </div>
            <div className="text-right text-indigo-300 font-bold">
              <p className="text-xl">#{contestInfo?.userContext?.myRank || "-"} / {contestInfo?.totalUser || 0}</p>
              <p className="text-[10px] text-slate-400 uppercase">Rank</p>
            </div>
          </div>
          {/* 💡 내 풀이기록 버튼 클릭 시 스코어보드 탭으로 워프하도록 핸들링 변경 */}
          <Button className="w-full bg-indigo-600 hover:bg-indigo-700 relative z-10 font-bold" onClick={() => setActiveTab("scoreboard")}>
            내 풀이 기록 확인
          </Button>
        </Card>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. 챌린지 탭 */
/* -------------------------------------------------------------------------- */
function ChallengesTab({ allChallenges, contestId, isContestHost, setShowAddChallengeModal, handleRemoveChallenge, handleChallengePoint, router }: { allChallenges: any[], contestId: string | null, isContestHost: boolean, setShowAddChallengeModal: any, handleRemoveChallenge: any, handleChallengePoint: any, router: any }) {
  const [filter, setFilter] = useState("all");

  // 포인트 수정용 State 추가
  const [editingPointsId, setEditingPointsId] = useState<string | null>(null);
  const [newPoints, setNewPoints] = useState<number | "">("");

  const handleSavePoints = async () => {
    if (newPoints === "" || isNaN(Number(newPoints))) { alert("올바른 점수를 입력해주세요."); return; }
    if (editingPointsId) {
      await handleChallengePoint(editingPointsId, newPoints.toString());
      alert("배점이 정상적으로 수정되었습니다.");
      setEditingPointsId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black">대회 문제지</h2>
        <div className="flex gap-2">
          <Badge onClick={() => setFilter("all")} className={`cursor-pointer ${filter === "all" ? "bg-slate-900" : "bg-slate-200 text-slate-500"}`}>전체</Badge>
          <Badge onClick={() => setFilter("unsolved")} className={`cursor-pointer ${filter === "unsolved" ? "bg-indigo-600" : "bg-slate-200 text-slate-500"}`}>안 푼 문제</Badge>
          <Badge onClick={() => setFilter("popular")} className={`cursor-pointer ${filter === "popular" ? "bg-amber-500" : "bg-slate-200 text-slate-500"}`}>많이 푼 문제</Badge>
          {isContestHost && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="ml-4 bg-slate-900">
                  <PlusCircle className="w-4 h-4 mr-1.5" /> 문제 관리
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setShowAddChallengeModal(true)}>
                  <Search className="w-4 h-4 mr-2" /> 기존 문제 검색/추가
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`/challenges/create?contestId=${contestId}`)}>
                  <Edit2 className="w-4 h-4 mr-2" /> 새 대회 문제 출제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allChallenges.length === 0 ? (
          <div className="col-span-12 md:col-span-2 lg:col-span-3 flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-2xl bg-white text-center">
            <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center border shadow-sm mb-4">
              <Flag className="text-slate-400 h-5 w-5" />
            </div>
            <p className="font-bold text-slate-700">등록된 챌린지가 없습니다.</p>
            <p className="text-xs text-slate-400 mt-1">
              {isContestHost ? "우측 상단의 문제 관리 메뉴를 통해 대회의 문제를 구성해 보세요!" : "운영진이 문제를 준비 중입니다. 잠시만 기다려주세요."}
            </p>
          </div>
        ) : (
          allChallenges.map((ch) => {
            let cardColorClass = "border-slate-200 bg-white";
            let badgeUI = null;

            if (ch.solvedCount === 0) {
              cardColorClass = "border-red-300 bg-red-50/30";
              badgeUI = <Badge className="bg-red-500 w-fit mb-1">First Blood 대기중 🩸</Badge>;
            } else if (ch.solvedCount > 50) {
              cardColorClass = "border-amber-300 bg-amber-50/30";
              badgeUI = <Badge className="bg-amber-500 w-fit mb-1">많이 푼 문제 🔥</Badge>;
            } else if (ch.isSolved) {
              cardColorClass = "border-green-300 bg-green-50/30";
            }

            return (
              // 💡 1. 문제 카드 전체를 Link로 래핑하여 상세 페이지 이동 경로 연동
              <Link key={ch.id} href={`/contests/challenge/?probId=${ch.problemId}&contestProblemId=${ch.contestProblemId}&contestId=${contestId}`} className="block">
                <Card className={`group cursor-pointer hover:shadow-md transition-all border-2 h-full ${cardColorClass}`}>
                  <CardContent className="p-5 flex flex-col h-full">
                    {badgeUI}

                    <div className="flex justify-between items-start mt-1 mb-3">
                      <Badge variant="secondary" className="text-[10px]">{ch.category}</Badge>
                      {ch.isSolved && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{ch.title}</h4>
                      <p className="text-xs text-slate-400 mt-1">{ch.solvedCount} Solvers</p>
                    </div>

                    <div className="flex justify-between items-end pt-3 mt-auto">
                      <span className="text-xs font-mono text-slate-400">{ch.id}</span>
                      <span className="text-xl font-black text-slate-800">{ch.points} pts</span>
                    </div>

                    <div className="space-y-1 mt-4 border-t border-slate-200/50 pt-3">
                      <div className="flex justify-between text-[10px] font-bold text-slate-400">
                        <span>정답률</span>
                        <span>{Math.round((ch.solvedCount / 128) * 100)}% ({ch.solvedCount}명)</span>
                      </div>
                      <Progress value={(ch.solvedCount / 128) * 100} className="h-1.5 bg-slate-100" />
                    </div>

                    {isContestHost && (
                      <div
                        className="mt-4 pt-3 border-t border-slate-200/50 flex gap-2"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs h-7"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setEditingPointsId(ch.problemId);
                            setNewPoints(ch.points);
                          }}
                        >
                          포인트 수정
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-500 flex-1 text-xs h-7 hover:bg-red-50"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRemoveChallenge(ch.problemId);
                          }}
                        >
                          제거
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })
        )}
      </div>

      {editingPointsId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-xs shadow-2xl animate-in zoom-in-95 duration-200">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <CardTitle className="text-lg">포인트 수정</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setEditingPointsId(null)}>
                <X className="w-5 h-5 text-slate-500" />
              </Button>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <Label>배점 (Points)</Label>
                <Input
                  type="number"
                  value={newPoints}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewPoints(val === "" ? "" : Number(val));
                  }}
                  className="font-mono text-lg font-bold"
                />
              </div>
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={handleSavePoints}>저장하기</Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. 스코어보드 탭 */
/* -------------------------------------------------------------------------- */
function ScoreboardTab({ myRank, fullRankings, scoreBoardTotalPages, scoreBoardCurrentPage, setScoreBoardCurrentPage }: { myRank: any, fullRankings: any[], scoreBoardTotalPages: any, scoreBoardCurrentPage: any, setScoreBoardCurrentPage: any }) {
  // 모달 상태
  const [showFullRank, setShowFullRank] = useState(false);

  // 페이지네이션 상태
  const itemsPerPage = 10;

  // 페이지네이션 계산 로직
  const totalPages = Math.ceil(fullRankings.length / itemsPerPage);
  const startIndex = (scoreBoardCurrentPage - 1) * itemsPerPage;
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
            {fullRankings.slice(0, 10).map((user) => (
              <TableRow key={user.rank} className={user.isMe ? "bg-indigo-50/50" : ""}>
                <TableCell className="text-center font-black text-slate-500">
                  {user.rank === 1 ? "🥇" : user.rank === 2 ? "🥈" : user.rank === 3 ? "🥉" : user.rank}
                </TableCell>
                <TableCell className="font-bold text-slate-800">
                  {user.nickname} {user.isMe && <Badge className="ml-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-100">ME</Badge>}
                </TableCell>
                <TableCell className="text-center font-mono font-medium">{user.solvedCount}</TableCell>
                <TableCell className="text-right font-black text-indigo-600">{user.score.toLocaleString()}</TableCell>
                <TableCell className="text-right pr-6 text-xs text-slate-400">{user.lastSolvedAt}</TableCell>
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
                        {user.nickname} {user.isMe && <Badge className="ml-2 bg-indigo-100 text-indigo-700">ME</Badge>}
                      </TableCell>
                      <TableCell className="text-center font-mono font-medium">{user.solvedCount}</TableCell>
                      <TableCell className="text-right font-black text-indigo-600">{user.score.toLocaleString()}</TableCell>
                      <TableCell className="text-right pr-6 text-xs text-slate-400">{user.lastSolvedAt}</TableCell>
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
                disabled={scoreBoardCurrentPage === 1}
                onClick={() => setScoreBoardCurrentPage(Math.max(1, scoreBoardCurrentPage - 1))}
              >
                이전
              </Button>

              <div className="flex gap-1">
                {Array.from({ length: totalPages }).map((_, i) => {
                  const p = i + 1;
                  // 모달창에서 10개가 넘어가면 번호가 너무 길어지므로 1~5, 6~10 페이지씩 간단히 잘라 보여주기 위한 로직
                  if (totalPages > 7 && p !== 1 && p !== totalPages && Math.abs(p - scoreBoardCurrentPage) > 1) {
                    if (p === 2 && scoreBoardCurrentPage > 3) return <span key={p} className="text-slate-400 text-xs px-1 self-end">...</span>;
                    if (p === totalPages - 1 && scoreBoardCurrentPage < totalPages - 2) return <span key={p} className="text-slate-400 text-xs px-1 self-end">...</span>;
                    return null;
                  }

                  return (
                    <Button
                      key={p}
                      variant={scoreBoardCurrentPage === p ? "default" : "outline"}
                      size="sm"
                      className={`w-8 h-8 p-0 rounded-lg ${scoreBoardCurrentPage === p ? "bg-slate-900 text-white" : ""}`}
                      onClick={() => setScoreBoardCurrentPage(p)}
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
                disabled={scoreBoardCurrentPage === totalPages}
                onClick={() => setScoreBoardCurrentPage(Math.min(totalPages, scoreBoardCurrentPage + 1))}
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
function QATab({
  faqs,
  isContestHost,
  handleCreateQuestion,
  handleDeleteQuestion,
  handleCreateAnswer,
  handleDeleteAnswer
}: {
  faqs: any[],
  isContestHost: boolean,
  handleCreateQuestion: any,
  handleDeleteQuestion: any,
  handleCreateAnswer: any,
  handleDeleteAnswer: any
}) {
  const [openQId, setOpenQId] = useState<number | null>(null);
  const [questionText, setQuestionText] = useState("");
  const [answerInputs, setAnswerInputs] = useState<{ [key: string]: string }>({});

  const handleAnswerInputChange = (qnaId: string, value: string) => {
    setAnswerInputs(prev => ({ ...prev, [qnaId]: value }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 질문 작성 폼 */}
      <Card className="border-indigo-100 bg-indigo-50/30">
        <CardContent className="p-4 flex gap-2 items-center">
          <Input
            placeholder="새로운 질문을 등록하세요 (모두에게 공개됩니다)"
            className="bg-white"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
          />
          <Button onClick={async () => {
            if (!questionText.trim()) { alert("질문 내용을 입력해주세요."); return; }
            await handleCreateQuestion(questionText);
            setQuestionText("");
          }}>
            등록
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {faqs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-2xl bg-white text-center">
            <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center border shadow-sm mb-4">
              <MessageSquare className="text-slate-400 h-5 w-5" />
            </div>
            <p className="font-bold text-slate-700">등록된 질문이 없습니다.</p>
            <p className="text-xs text-slate-400 mt-1">대회 진행 중 궁금한 점이 있다면 첫 번째로 질문을 등록해 보세요!</p>
          </div>
        ) : (
          faqs.map((faq) => (
            <Card key={faq.qnaId} className="overflow-hidden">

              {/* 질문 헤더 영역 */}
              <div className="p-4 flex justify-between items-center bg-white border-b border-slate-100">
                {/* 왼쪽: 질문 내용 (클릭 시 토글) */}
                <div
                  className="flex items-center gap-3 cursor-pointer flex-1"
                  onClick={() => setOpenQId(openQId === faq.qnaId ? null : faq.qnaId)}
                >
                  <span className="font-black text-indigo-600">Q.</span>
                  <span className="font-bold text-slate-800">{faq.question}</span>
                  <Badge variant={faq.answers && faq.answers.length > 0 ? 'outline' : 'secondary'}>
                    {faq.isAnswered ? `답변 ${faq.answers.length}` : '대기중'}
                  </Badge>
                  <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${openQId === faq.qnaId ? 'rotate-90' : ''}`} />
                </div>

                <div className="flex items-center gap-2">
                  {faq.isMe && (
                    <Button variant="ghost" size="sm" className="h-8 text-xs text-red-500 hover:bg-red-50" onClick={() => {
                      if (confirm("이 질문을 삭제하시겠습니까?")) handleDeleteQuestion(faq.qnaId);
                    }}>
                      삭제
                    </Button>
                  )}
                  {isContestHost && (
                    <Button variant="ghost" size="sm" className="h-8 text-xs text-red-600 hover:bg-red-100 font-bold" onClick={() => {
                      if (confirm("[운영자 권한] 이 질문을 강제 삭제하시겠습니까?")) handleDeleteQuestion(faq.qnaId);
                    }}>
                      강제삭제
                    </Button>
                  )}
                </div>
              </div>

              {/* 토글 바디 영역 */}
              {openQId === faq.qnaId && (
                <div className="p-4 bg-slate-50/50 space-y-4">
                  <div className="space-y-2">
                    {faq.answers && faq.answers.length > 0 ? (
                      faq.answers.map((ans: any) => (
                        <div key={ans.answerId} className="bg-white p-3 rounded-lg border border-slate-200/60 flex justify-between items-start gap-4 shadow-sm">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-700">{ans.author || "운영진"}</span>
                              <span className="text-[10px] text-slate-400">{ans.createdAt}</span>
                            </div>
                            <p className="text-sm text-slate-600 whitespace-pre-wrap">{ans.content || ans.answer}</p>
                          </div>

                          {(isContestHost || ans.isMe) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-slate-400 hover:text-red-500 shrink-0"
                              onClick={() => {
                                if (confirm("이 답변 댓글을 삭제하시겠습니까?")) {
                                  handleDeleteAnswer(faq.qnaId, ans.answerId);
                                }
                              }}
                            >
                              <Trash2 size={14} />
                            </Button>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400 italic pl-2">아직 등록된 답변이 없습니다.</p>
                    )}
                  </div>

                  {(isContestHost || faq.isMe) && (
                    <div className="pt-2 border-t border-slate-200/60 space-y-2">
                      <Label className="text-xs font-bold text-slate-500">
                        {isContestHost ? "운영진 답변 추가" : "추가 질의 / 피드백 남기기"}
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder={isContestHost ? "참가자에게 추가 답변 댓글을 작성하세요..." : "운영진에게 추가 내용을 전달하세요..."}
                          className="bg-white h-9 text-sm"
                          value={answerInputs[faq.qnaId] || ""}
                          onChange={(e) => handleAnswerInputChange(faq.qnaId, e.target.value)}
                        />
                        <Button size="sm" className="h-9 bg-slate-900 text-xs px-4 shrink-0" onClick={async () => {
                          const currentInput = answerInputs[faq.qnaId] || "";
                          if (!currentInput.trim()) return;
                          await handleCreateAnswer(faq.qnaId, currentInput);
                          handleAnswerInputChange(faq.qnaId, ""); // 전송 성공 후 해당 칸 초기화
                        }}>
                          답변 등록
                        </Button>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. 운영진 공지 탭 */
/* -------------------------------------------------------------------------- */
function NoticeManageTab({
  notices,
  handleCreateNotice,
  handleEditNotice,
  handleDeleteNotice
}: {
  notices: any[],
  handleCreateNotice: any,
  handleEditNotice: any,
  handleDeleteNotice: any
}) {
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeContent, setNoticeContent] = useState("");

  const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  // 수정 버튼 클릭 시 인라인 입력 창으로 전환하며 값을 채우는 함수
  const startEdit = (id: string, title: string, content: string) => {
    setEditingNoticeId(id);
    setEditTitle(title);
    setEditContent(content);
  };

  // 수정 취소 시 값 리셋 함수
  const cancelEdit = () => {
    setEditingNoticeId(null);
    setEditTitle("");
    setEditContent("");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-black mb-4">공지사항 관리</h2>

      {/* [A] 새 공지 등록 폼 (상단에 독립 고정) */}
      <Card className="border-indigo-500 shadow-md">
        <CardHeader>
          <CardTitle className="text-sm">새 공지 등록</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="공지 제목"
            value={noticeTitle}
            onChange={(e) => setNoticeTitle(e.target.value)}
          />
          <Textarea
            placeholder="내용을 입력하세요..."
            className="min-h-[100px]"
            value={noticeContent}
            onChange={(e) => setNoticeContent(e.target.value)}
          />
          <div className="flex justify-end">
            <Button onClick={async () => {
              if (!noticeTitle.trim() || !noticeContent.trim()) {
                alert("제목과 내용을 모두 입력해주세요.");
                return;
              }
              await handleCreateNotice(noticeTitle, noticeContent);
              setNoticeTitle("");
              setNoticeContent("");
            }}>
              공지 생성
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* [B] 기존 공지 목록 (하단 리스트 및 인라인 수정) */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-500">등록된 공지</h3>

        {notices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-2xl bg-white text-center">
            <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center border shadow-sm mb-4">
              <AlertTriangle className="text-slate-400 h-5 w-5" />
            </div>
            <p className="font-bold text-slate-700">아직 등록된 공지사항이 없습니다.</p>
            <p className="text-xs text-slate-400 mt-1">대회 관련 중요한 변경 사항이나 힌트가 여기에 실시간으로 게시됩니다.</p>
          </div>
        ) : (
          notices.map((n) => (
            <Card
              key={n.id}
              className={`transition-all ${editingNoticeId === n.id
                ? "border-amber-500 ring-1 ring-amber-500/30 bg-amber-50/5"
                : "border-slate-200"
                }`}
            >
              <CardContent className="p-5">
                {editingNoticeId === n.id ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                        <Edit2 size={12} /> 카드에서 바로 수정 중
                      </span>
                      <Button variant="ghost" size="sm" className="h-6 text-xs text-slate-500" onClick={cancelEdit}>
                        수정 취소
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Input
                        placeholder="수정할 공지 제목"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="font-bold bg-white"
                      />
                      <Textarea
                        placeholder="수정할 공지 내용..."
                        className="min-h-[80px] bg-white"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end pt-1">
                      <Button
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700 text-xs px-4"
                        onClick={async () => {
                          if (!editTitle.trim() || !editContent.trim()) {
                            alert("제목과 내용을 모두 입력해주세요.");
                            return;
                          }
                          await handleEditNotice(editingNoticeId, editTitle, editContent);
                          cancelEdit();
                        }}
                      >
                        수정 완료
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-2 flex-1">
                      <div>
                        <p className="font-bold text-base text-slate-900 mb-0.5">{n.title}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{n.createdAt}</p>
                      </div>
                      <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed bg-slate-50/50 p-3 rounded-lg border border-slate-100/70">
                        {n.content}
                      </p>
                    </div>

                    {/* 우측 관리용 액션 버튼 영역 */}
                    <div className="flex gap-1 shrink-0 pt-1">
                      <Button
                        variant="ghost" size="sm" className="text-indigo-600 h-8 w-8 p-0"
                        onClick={() => startEdit(n.id, n.title, n.content)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost" size="sm" className="text-red-500 h-8 w-8 p-0 hover:bg-red-50"
                        onClick={() => { if (confirm("이 공지를 삭제하시겠습니까?")) handleDeleteNotice(n.id); }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 참가자 관리 탭 (운영진 전용) */
/* -------------------------------------------------------------------------- */
function ParticipantsManageTab({ participants, handleBan }: { participants: any[], handleBan: any }) {

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <h2 className="text-2xl font-black mb-4">참가자 관리</h2>
      <Card>
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>참가자 명</TableHead>
              <TableHead>참가일</TableHead>
              <TableHead className="text-center">현재 점수</TableHead>
              <TableHead className="text-right">관리 (Ban)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {participants.map((p) => (
              <TableRow key={p.userId} className={p.isBanned ? "opacity-50 bg-red-50/10" : ""}>
                <TableCell className="font-bold text-slate-800">
                  {p.nickname} {p.isBanned && <Badge variant="destructive" className="ml-2">BANNED</Badge>}
                </TableCell>
                <TableCell className="text-xs text-slate-500">{p.joinedAt}</TableCell>
                <TableCell className="text-center font-mono font-bold text-indigo-600">{p.score}</TableCell>
                <TableCell className="text-right">
                  {!p.isBanned ? (
                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleBan(p.userId, true)}>
                      실격(Ban) 처리
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" className="text-slate-500" onClick={() => handleBan(p.userId, false)}>
                      차단 해제
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 대회 설정 탭 (운영진 전용) */
/* -------------------------------------------------------------------------- */
function ContestSettingsTab({ contestInfo, handleEditSettings, handleDeleteContest }: any) {
  const [editTitle, setEditTitle] = useState(contestInfo.title);
  const [editDesc, setEditDesc] = useState(contestInfo.description);
  const [editStartTime, setEditStartTime] = useState(contestInfo.startTime);
  const [editEndTime, setEditEndTime] = useState(contestInfo.endTime);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <h2 className="text-2xl font-black mb-4">대회 설정</h2>

      {/* 정보 수정 */}
      <Card className="shadow-sm">
        <CardHeader><CardTitle className="text-md">기본 정보 수정</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>대회 명칭</Label>
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>대회 소개 및 공지 (Markdown)</Label>
            <Textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>시작 일시</Label>
              <Input
                type="datetime-local"
                value={editStartTime?.substring(0, 16)}
                onChange={(e) => setEditStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>종료 일시</Label>
              <Input
                type="datetime-local"
                value={editEndTime?.substring(0, 16)}
                onChange={(e) => setEditEndTime(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <Button className="bg-indigo-600" onClick={() => handleEditSettings(editTitle, editDesc, editStartTime, editEndTime)}>변경사항 저장</Button>
          </div>
        </CardContent>
      </Card>

      {/* 위험 구역 */}
      <Card className="border-red-200 bg-red-50/30">
        <CardHeader><CardTitle className="text-md text-red-600 flex items-center gap-2"><Trash2 size={18} /> 위험 구역</CardTitle></CardHeader>
        <CardContent className="flex justify-between items-center">
          <div>
            <p className="font-bold text-slate-800">대회 삭제</p>
            <p className="text-xs text-slate-500">대회를 삭제하면 참가자 데이터와 모든 스코어 기록이 영구적으로 삭제됩니다.</p>
          </div>
          <Button variant="destructive" onClick={() => { if (confirm("정말 대회 참가를 취소하시겠습니까?")) handleDeleteContest(); }}>대회 삭제</Button>
        </CardContent>
      </Card>
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

export default function ContestDetailPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    }>
      <ContestDetailPage />
    </Suspense>
  );
}