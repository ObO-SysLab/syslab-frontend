"use client";

import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search, Settings, LogOut, User, Menu, MessageSquare, Bell, Share2,
  CheckCircle2, XCircle, Clock, LayoutGrid, Users, BarChart3, Trophy, ShoppingBag, Trash2,
  ChevronLeft, MessageCircle, Edit2, Flame, Zap
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { mockChallenges, mockChallenge, mockAds, mockFullRankings, mockSubmissions, mockComments, mockReplies, mockFirstBlood } from "@/lib/mockData";


function ProblemDetailContent() {
  // API 연동 스위치
  const USE_API_REQUEST = true;

  // URL에서 가져온 값 상태
  const searchParams = useSearchParams();
  const probId = searchParams.get('id');

  // 페이지 상태
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthor, setIsAuthor] = useState(true);
  const [showMySubmissions, setShowMySubmissions] = useState(false);

  // API 연동용 상태
  const [problemData, setProblemData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [comments, setComments] = useState<any[]>([]);
  const [rankings, setRankings] = useState<any[]>([]);
  const [firstBlood, setFirstBlood] = useState<any>({ user: "", prifile_url: "", date: "" });
  const [ads, setAds] = useState<any[]>([]);

  // 객관식 문제 관련 상태
  const [selectedChoices, setSelectedChoices] = useState<number[]>([]);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);

  // 댓글 관련 상태
  const [selectedComment, setSelectedComment] = useState<any | null>(null);
  const [commentInput, setCommentInput] = useState("");
  const [replyInput, setReplyInput] = useState("");

  // 댓글 수정 관련 상태
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");

  // 채점 데이터 상태
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isGradingInProgress, setIsGradingInProgress] = useState(false);

  // [API] 데이터 초기 로드
  useEffect(() => {
    const fetchPageData = async () => {
      setIsLoading(true); // 로딩 시작

      // 테스트
      if (!USE_API_REQUEST) {
        const foundBase = mockChallenges.find(c => String(c.id) === String(probId)) || mockChallenges[0];
        setProblemData({
          ...mockChallenge,
          ...foundBase,
          probId: foundBase.id,
          difficulty: `Lvl ${foundBase.level}`, // "1" -> "Lvl 1" 변환
        });
        setRankings(mockFullRankings.map(r => ({
          rank: r.rank, nickname: r.user, score: r.score, solved_at: new Date().toISOString()
        })));
        setFirstBlood(mockFirstBlood);
        setAds(mockAds);
        fetchComments();
        setIsLoading(false);
        return;
      }

      const token = localStorage.getItem("token");
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      try {
        // 문제 상세 조회, 랭킹, 광고를 병렬로 호출
        const [probRes, rankRes, adRes] = await Promise.all([
          fetch(`https://diveon.net/api/problems/${probId}`, { headers }),
          fetch(`https://diveon.net/api/problems/${probId}/rank?page=0&size=100`, { headers }),
          fetch("https://diveon.net/api/ad/?placement=prob_detail")
        ]);

        if (probRes.ok) {
          const probJson = await probRes.json();
          setProblemData(probJson.data);
        }

        if (rankRes.ok) {
          const rankJson = await rankRes.json();
          if (rankJson.status === 200) setRankings(rankJson.data.rankings);
        }

        if (adRes.ok) {
          const adJson = await adRes.json();
          if (adJson.ads) setAds(adJson.ads);
          else if (adJson.data?.ads) setAds(adJson.data.ads);
        }

        fetchComments(); // 메인 댓글 목록 조회
        fetchSubmissions(); // 제출 탭 데이터 조회
      } catch (error) {
        console.error("데이터 로드 실패:", error);
      } finally {
        setIsLoading(false); // 로딩 종료
      }
    };
    fetchPageData();
  }, [probId]);

  // [API] 채점 탭 데이터 요청
  const fetchSubmissions = async () => {
    if (!USE_API_REQUEST) {
      setSubmissions(mockSubmissions);
      return;
    }

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`https://diveon.net/api/problems/${probId}/board?page=1&size=50`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        let items = json.data.submissions || [];

        // 1. 서버 응답 중 아직 채점이 안 끝난(isCorrect가 null인) 항목들은 폴링 대상(_isPending)으로 지정
        items = items.map((item: any) => {
          if (item.isCorrect === null || item.submissionStatus === "PENDING" || item.submissionStatus === "JUDGING") {
            return { ...item, _isPending: true };
          }
          return item;
        });

        // 2. 다른 페이지(에디터/터미널)에서 갓 제출하고 넘어온 ID 처리 (DB 반영 지연 방어)
        const pendingId = sessionStorage.getItem(`pending_sub_${probId}`);
        if (pendingId) {
          const exists = items.find((s: any) => String(s.submissionId) === String(pendingId));
          
          if (!exists) {
            // DB에 아직 안 나타났다면 가짜 행 추가
            items.unshift({
              submissionId: pendingId,
              nickname: localStorage.getItem("nickname") || "내 제출", // 
              submissionStatus: "PENDING",
              progress: 0,
              submittedAt: new Date().toISOString(),
              _isPending: true
            });
          } else {
            // 서버 보드에 정상적으로 등장했다면 스토리지 비우기!
            sessionStorage.removeItem(`pending_sub_${probId}`);
          }
        }

        setSubmissions(items);
      }
    } catch (e) {
      console.error("채점 보드 로드 실패:", e);
    }
  };

  // [API] 채점 상태 폴링 
  useEffect(() => {
    const pendingItems = submissions.filter((sub) => sub._isPending);
    if (pendingItems.length === 0) return;

    const timer = setTimeout(async () => {
      const token = localStorage.getItem("token");
      let needsBoardRefresh = false;

      const results = await Promise.all(
        pendingItems.map(async (item) => {
          try {
            const res = await fetch(`https://diveon.net/api/submissions/${item.submissionId}/status`, {
              headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
              const json = await res.json();
              return json.data;
            }
          } catch (e) { }
          return null;
        })
      );

      setSubmissions((prev) =>
        prev.map((sub) => {
          if (!sub._isPending) return sub;

          const updatedData = results.find((r) => r && String(r.submissionId) === String(sub.submissionId));

          if (updatedData) {
            // 채점이 끝났다면?
            if (updatedData.submissionStatus === "COMPLETED" || updatedData.submissionStatus === "FAILED") {
              needsBoardRefresh = true; 
              return { ...sub, progress: 100, submissionStatus: updatedData.submissionStatus };
            }
            return { ...sub, progress: updatedData.progress, submissionStatus: updatedData.submissionStatus };
          }
          return sub;
        })
      );

      // 하나라도 'COMPLETED'가 떨어졌다면 보드 갱신
      if (needsBoardRefresh) {
        fetchSubmissions();
      }

    }, 1500);

    return () => clearTimeout(timer);
  }, [submissions]);

  // [API] 객관식 답안 제출
  const handleObjectiveSubmit = async () => {
    if (selectedChoices.length === 0) {
      alert("답안을 최소 하나 이상 선택해주세요.");
      return;
    }

    setIsSubmittingAnswer(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`https://diveon.net/api/submissions/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          probId: Number(probId),
          answer: selectedChoices
        })
      });

      if (res.ok) {
        const json = await res.json();

        // 제출 API 명세서 기준 submissionId 추출
        const newSubmissionId = json.data.submissionId;

        alert("채점 요청이 접수되었습니다!");

        // 1. 보드 전체를 갱신하지 않고, 화면에 띄울 '임시 대기 항목'을 맨 위에 추가
        const pendingSub = {
          submissionId: newSubmissionId,
          nickname: localStorage.getItem("nickname") || "내 제출",
          submissionStatus: json.data.submission_status, // "PENDING"
          progress: 0,
          submittedAt: new Date().toISOString(),
          _isPending: true // 폴링 봇이 추적할 타겟이라는 표시!
        };

        setSubmissions(prev => [pendingSub, ...prev]);

      } else {
        const err = await res.json();
        alert(`제출 실패: ${err.detail || err.message || "오류가 발생했습니다."}`);
      }
    } catch (e) {
      alert("서버와 통신 중 오류가 발생했습니다.");
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  // [API] 댓글 목록 새로고침
  const fetchComments = async () => {
    // 테스트
    if (!USE_API_REQUEST) {
      setComments(mockComments);
      return;
    }

    const token = localStorage.getItem("token");
    const headers: HeadersInit = { "Authorization": `Bearer ${token}` };
    try {
      const res = await fetch(`https://diveon.net/api/problems/${probId}/comments`, { headers });
      const text = await res.text();

      // 텍스트가 비어있지 않은 경우에만 JSON 파싱을 시도합니다.
      if (text) {
        const json = JSON.parse(text);
        if (json.status === 200) {
          setComments(json.data.comments);
        } else {
          console.warn("댓글 로드 실패:", json.message);
        }
      } else {
        // 응답 본문이 비어있을 때 (예: 204 No Content 또는 빈 에러 응답)
        console.warn(`댓글 API 응답이 비어있습니다. (상태 코드: ${res.status})`);
      }
    } catch (e) {
      console.error("댓글 파싱/네트워크 에러:", e);
    }
  };

  // 객관식 보기 선택 핸들러
  const handleChoiceToggle = (index: number) => {
    setSelectedChoices(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  // [API] 문제 삭제 핸들러
  const handleDeleteProblem = async () => {
    if (!confirm("정말로 이 문제를 삭제하시겠습니까?\n삭제된 문제는 복구할 수 없습니다.")) return;

    // 테스트 모드일 때
    if (!USE_API_REQUEST) {
      alert("문제가 삭제되었습니다. (MOCK 모드)");
      window.location.href = "/challenges";
      return;
    }

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`https://diveon.net/api/problems/${probId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (res.ok) {
        alert("문제가 성공적으로 삭제되었습니다.");
        // 삭제 후에는 상세 페이지에 머물 수 없으므로 목록으로 리다이렉트
        window.location.href = "/challenges";
      } else {
        const errorData = await res.json();
        alert(`삭제 실패: ${errorData.message || "문제를 삭제할 권한이 없습니다."}`);
      }
    } catch (error) {
      console.error("삭제 요청 중 오류 발생:", error);
      alert("서버와 통신 중 오류가 발생했습니다.");
    }
  };

  // [API] 특정 댓글(대댓글 포함) 상세 조회
  const handleSelectComment = async (comment: any) => {
    // 테스트
    if (!USE_API_REQUEST) {
      setSelectedComment({
        ...comment,
        replies: mockReplies
      });
      return;
    }

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`https://diveon.net/api/problems/${probId}/comments/${comment.commentId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.status === 200) {
        setSelectedComment(json.data); // 상세 데이터(replies 포함)로 상태 업데이트
      }
    } catch (e) { console.error(e); }
  };

  // [API] 댓글/대댓글 작성
  const handleCreateComment = async (parentId?: number) => {
    const content = parentId ? replyInput : commentInput;
    if (!content.trim()) return;

    // 테스트
    if (!USE_API_REQUEST) {
      console.log(`[MOCK] ${parentId ? '대댓글' : '댓글'} 등록:`, content);
      alert("등록되었습니다. (MOCK 모드)");
      parentId ? setReplyInput("") : setCommentInput("");
      return;
    }

    const token = localStorage.getItem("token");
    try {
      // API 명세에 맞게 isPrivate 추가 및 parentId 선택적 할당
      const payload: any = { content, isPrivate: false };
      if (parentId) payload.parentId = parentId;

      const res = await fetch(`https://diveon.net/api/problems/${probId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(payload) // 수정된 payload 전송
      });
      if (res.ok) {
        if (parentId) {
          setReplyInput("");
          handleSelectComment(selectedComment);
        } else {
          setCommentInput("");
          fetchComments();
        }
      }
    } catch (e) { console.error(e); }
  };

  // [API] 댓글/대댓글 삭제
  const handleDeleteComment = async (e: React.MouseEvent, commentId: number, isReply: boolean = false) => {
    e.stopPropagation(); // 클릭 이벤트 버블링 방지 (상세 창으로 넘어가지 않게)
    if (!confirm("정말로 이 댓글을 삭제하시겠습니까?")) return;

    // 테스트
    if (!USE_API_REQUEST) { alert("완료"); return; }

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`https://diveon.net/api/problems/${probId}/comments/${commentId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        alert("삭제되었습니다.");
        if (isReply) handleSelectComment(selectedComment); // 대댓글 삭제 시 상세 화면 리로드
        else fetchComments(); // 원본 댓글 삭제 시 목록 리로드
      }
    } catch (e) { console.error(e); }
  };

  // [API] 댓글/대댓글 수정
  const handleUpdateComment = async (e: React.MouseEvent, commentId: number, isReply: boolean = false) => {
    e.stopPropagation();
    if (!editContent || !editContent.trim()) return;

    // 테스트
    if (!USE_API_REQUEST) { alert("완료"); return; }

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`https://diveon.net/api/problems/${probId}/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ content: editContent, isPrivate: false })
      });
      if (res.ok) {
        setEditingCommentId(null);
        setEditContent("");
        if (isReply) handleSelectComment(selectedComment); // 대댓글 수정 시 상세 화면 리로드
        else fetchComments(); // 원본 댓글 수정 시 목록 리로드
      } else {
        alert("댓글 수정에 실패했습니다.");
      }
    } catch (e) { console.error(e); }
  };

  // 페이지 로드 시 로그인 상태 확인
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  // 로그아웃 핸들러
  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    window.location.reload(); // 상태 초기화를 위해 새로고침
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">

      {/* 1. 고정 헤더 (기존 디자인 유지) */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur px-6 h-16 flex items-center justify-between">
        { /* [A] Diveon 로고 영역 */}
        <div className="flex items-center gap-8"> {/* gap을 넓혀서 메뉴 공간 확보 */}
          <Menu className="h-6 w-6 text-slate-500 cursor-pointer lg:hidden" />
          <Link href="/" className="text-2xl font-black tracking-tighter text-slate-900 mr-4">
            Diveon
          </Link>

          {/* [B] 중앙 네비게이션 메뉴 영역 */}
          <nav className="hidden lg:flex items-center gap-1">
            <NavMenuLink href="/challenges" icon={<LayoutGrid size={18} />} label="챌린지" />
            <NavMenuLink href="/contests" icon={<Trophy size={18} />} label="대회" />
            <NavMenuLink href="/groups" icon={<Users size={18} />} label="그룹" />
            <NavMenuLink href="/ranking" icon={<BarChart3 size={18} />} label="랭킹" />
            <NavMenuLink href="/store" icon={<ShoppingBag size={18} />} label="스토어" />
          </nav>
        </div>

        {/* [C] 검색창 영역 */}
        <div className="flex-1 max-w-sm px-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input type="search" placeholder="검색..." className="pl-9 bg-slate-50 border-slate-200 rounded-full h-9 text-sm" />
          </div>
        </div>

        {/* [D] 우측 사용자 영역 (로그인 상태에 따라 가변적) */}
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            /* --- 로그인된 상태: 알림 + 프로필(동글) + 로그아웃 --- */
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
            /* --- 로그아웃된 상태: 로그인 / 시작하기 버튼 --- */
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

        {/* [A] 좌측 정보 패널 (2칸) */}
        <aside className="col-span-12 md:col-span-2 space-y-4">

          {/* First Blood 패널 */}
          <Card className="shadow-none border-slate-200 overflow-hidden">
            <CardHeader className="pb-2 bg-slate-50/50">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                <Flame className="h-4 w-4 text-red-500" /> First Blood
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {firstBlood ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border border-slate-100">
                        <span className="text-xs font-bold text-slate-500">
                          {firstBlood.user?.[0]}
                        </span>
                      </div>
                      <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-0.5 border-2 border-white">
                        <Flame className="h-2 w-2 text-white" />
                      </div>
                    </div>
                    <span className="font-semibold text-sm text-slate-900 leading-none mb-1">
                      {firstBlood.user}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium tracking-tight">
                    {new Date(firstBlood.date).toLocaleDateString()}
                  </span>
                </div>
              ) : (
                <div className="py-4 text-center">
                  <p className="text-xs text-slate-400 italic">아직 문제를 해결한 유저가 없습니다.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top 3 랭킹 패널 */}
          {problemData?.type !== "objective" && (
            <Card className="shadow-none border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" /> Top 3
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {rankings.slice(0, 3).map((ranker) => (
                  <div key={ranker.rank} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="h-5 w-5 flex items-center justify-center p-0 rounded-full">
                        {ranker.rank}
                      </Badge>
                      <span className="font-medium text-slate-700">{ranker.nickname}</span>
                    </div>
                    <span className="text-slate-400 text-xs">{ranker.score}점</span>
                  </div>
                ))}
                {rankings.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-2">랭킹 정보가 없습니다.</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recent 댓글 패널 */}
          <Card className="shadow-none border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-500" /> Recent
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {comments.slice(0, 5).map((comment) => (
                <div key={comment.commentId} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">{comment.authorNickname}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">{comment.content}</p>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-2">최근 댓글이 없습니다.</p>
              )}
            </CardContent>
          </Card>

        </aside>

        {/* [B] 중앙 콘텐츠 영역 (6칸) */}
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
                    <div className="w-3 h-3 bg-slate-400 rounded-full" />
                    <div className="w-3 h-3 bg-slate-400 rounded-sm" />
                    <div className="w-3 h-3 bg-slate-400 rounded-sm" />
                    <div className="w-3 h-3 bg-slate-400 rounded-full" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold text-slate-900">
                    {isLoading ? "불러오는 중..." : problemData?.title}
                  </h1>
                  <p className="text-sm text-slate-500 leading-relaxed whitespace-pre-wrap">
                    {isLoading ? "" : problemData?.summary || "문제 요약이 없습니다."}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between w-full">
                {/* 왼쪽 버튼 그룹 (제출, 공유) */}
                <div className="flex gap-2">
                  {/* 문제 유형에 따른 동작 버튼 변경 */}
                  {problemData?.type === "coding" ? (
                    <Link href={`/challenges/editor?id=${probId}`}>
                      <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 font-bold">
                        코드 제출하기
                      </Button>
                    </Link>
                  ) : problemData?.type === "objective" ? (
                    <Button
                      className="bg-slate-900 hover:bg-slate-800 font-bold disabled:opacity-50"
                      onClick={handleObjectiveSubmit}
                      disabled={isSubmittingAnswer || selectedChoices.length === 0} // 선택된 게 없으면 비활성화
                    >
                      {isSubmittingAnswer ? "제출 중..." : "답안 제출하기"}
                    </Button>
                  ) : problemData?.type === "practice" ? (
                    <Link href={`/challenges/terminal?id=${probId}`}>
                      <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-200">
                        실습 환경 켜기
                      </Button>
                    </Link>
                  ) : (
                    <Button className="bg-slate-800 hover:bg-slate-700">답안 제출하기</Button> // Fallback
                  )}

                  <Button variant="outline" size="icon">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* 오른쪽 버튼 그룹 (작성자일 때만 노출) */}
                {isAuthor && (
                  <div className="flex gap-2">
                    {/* 문제 수정 버튼 */}
                    <Button
                      variant="outline"
                      className="border-indigo-100 text-indigo-600 hover:bg-indigo-50 shadow-none"
                      onClick={() => {
                        window.location.href = `/challenges/create?id=${probId}`;
                      }}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      문제 수정
                    </Button>
                    <Button
                      variant="destructive"
                      className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border-red-100 shadow-none"
                      onClick={handleDeleteProblem}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      문제 삭제
                    </Button>
                  </div>
                )}
              </div>
              <Separator />

              <div className="prose prose-slate max-w-none">
                <p className="text-slate-800 whitespace-pre-wrap">
                  {problemData?.description}
                </p>

                {/* 객관식 보기 동적 렌더링 */}
                {problemData?.type === "objective" && problemData?.choices && (
                  <div className="mt-6 space-y-2">
                    {problemData.choices.map((choice: any) => {
                      // 선택되었는지 확인
                      const isSelected = selectedChoices.includes(choice.index);
                      return (
                        <div
                          key={choice.index}
                          onClick={() => handleChoiceToggle(choice.index)}
                          className={`p-4 border-2 rounded-xl flex items-center gap-3 cursor-pointer transition-all ${isSelected
                            ? "border-indigo-600 bg-indigo-50 shadow-sm" // 선택 시 스타일
                            : "border-slate-100 bg-slate-50 hover:border-slate-300 hover:bg-slate-100" // 기본 스타일
                            }`}
                        >
                          <span className={`font-black ${isSelected ? "text-indigo-600" : "text-slate-400"}`}>
                            {choice.index}.
                          </span>
                          <span className={`text-sm ${isSelected ? "text-indigo-900 font-bold" : "text-slate-700"}`}>
                            {choice.content}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 코딩형 입출력 예시 동적 렌더링 */}
                {problemData?.type === "coding" && problemData?.testcases && problemData.testcases.length > 0 && (
                  <div className="mt-6">
                    <span className="text-xs font-bold text-slate-500 mb-1 block">&lt;입력 예시&gt;</span>
                    <pre className="bg-slate-50 border border-slate-200 p-4 rounded-lg font-mono text-sm text-slate-800 leading-6 whitespace-pre-wrap">
                      {problemData.testcases[0].input.replace(/\\n/g, "\n")}
                    </pre>
                  </div>
                )}
              </div>

              {/* 실습형(CTF) VM 환경 동적 렌더링 */}
              {problemData?.type === "practice" && (
                <div className="mt-8 p-6 bg-slate-900 rounded-2xl space-y-6 shadow-lg border border-slate-800">

                  {/* 상단 헤더 및 OS 이미지 정보 */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400" /> VM 실습 환경
                    </h3>
                    <Badge variant="outline" className="text-slate-300 border-slate-700 font-mono text-xs bg-slate-800">
                      OS: {problemData?.vm_info?.os_image || "ubuntu:latest"}
                    </Badge>
                  </div>

                  {/* 허용된 명령어 목록 (안전하게 배열 체크) */}
                  {Array.isArray(problemData?.vm_info?.allowed_commands) && problemData.vm_info.allowed_commands.length > 0 && (
                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-500 mb-2 block uppercase tracking-widest">
                        Allowed Commands
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {problemData.vm_info.allowed_commands.map((cmd: string, idx: number) => (
                          <code key={idx} className="bg-slate-800 text-emerald-400 px-2 py-1 rounded text-xs font-mono border border-slate-700">
                            {`> ${cmd}`}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* 2. 채점 탭 */}
            <TabsContent value="grading" className="mt-6 animate-in fade-in-50 duration-300">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">제출 현황</h2>
                <Button
                  variant={showMySubmissions ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowMySubmissions(!showMySubmissions)}
                  className={`rounded-xl font-bold ${showMySubmissions ? "bg-slate-900 text-white" : "text-slate-600"}`}
                >
                  내 제출만 보기
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-[100px]">제출 번호</TableHead>
                      <TableHead>닉네임</TableHead>
                      <TableHead>결과</TableHead>

                      {/* 코딩 문제 전용 헤더 */}
                      {problemData?.type === "coding" && (
                        <>
                          <TableHead>메모리</TableHead>
                          <TableHead>시간</TableHead>
                          <TableHead>언어</TableHead>
                        </>
                      )}

                      {/* 실습 문제 전용 헤더 */}
                      {problemData?.type === "practice" && (
                        <TableHead>풀이 시간</TableHead>
                      )}

                      <TableHead className="text-right">제출 시간</TableHead>
                      {/* 상세 보기 액션 버튼을 위한 헤더 */}
                      <TableHead className="text-center w-[160px]">상세 보기</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* API 데이터인 submissions 배열을 매핑 */}
                    {submissions
                      .filter(sub => !showMySubmissions || sub.nickname === localStorage.getItem("nickname"))
                      .map((sub: any) => {
                        const isCoding = problemData?.type === "coding";

                        // 렌더링 상태 판별
                        const isPending = sub._isPending ||
                          sub.isCorrect === null ||
                          sub.submissionStatus === "PENDING" ||
                          sub.submissionStatus === "JUDGING";
                        const isSuccess = sub.isCorrect === true; 
                        const isFailed = sub.submissionStatus === "FAILED";

                        let resultText = "결과 대기";
                        if (isFailed) resultText = "시스템 오류";
                        else if (isPending) resultText = `채점 중 (${sub.progress || 0}%)`;
                        else resultText = isSuccess ? "정답" : "오답";

                        return (
                          <TableRow
                            key={sub.submissionId}
                            // 행 전체 클릭(onClick) 제거 (버튼을 따로 둘 것이므로 오작동 방지)
                            className="hover:bg-slate-50 transition-colors"
                          >
                            <TableCell className="font-mono text-xs">{sub.submissionId}</TableCell>
                            <TableCell className="font-bold text-slate-700">{sub.nickname || "User"}</TableCell>
                            
                            {/* 결과 배지 컬럼 */}
                            <TableCell>
                              {isPending ? (
                                <div className="flex flex-col gap-1">
                                  <Badge variant="outline" className="text-indigo-600 border-indigo-200 bg-indigo-50 w-fit">
                                    <div className="w-3 h-3 mr-1 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                                    {resultText}
                                  </Badge>
                                  {sub.progress !== undefined && (
                                    <div className="w-24 h-1 bg-slate-100 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-indigo-500 transition-all duration-500"
                                        style={{ width: `${sub.progress}%` }}
                                      />
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <Badge
                                  variant={isSuccess ? "default" : "destructive"}
                                  className={isSuccess ? "bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm shadow-indigo-100" : "font-bold"}
                                >
                                  {isSuccess ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                                  {resultText}
                                </Badge>
                              )}
                            </TableCell>

                            {/* 코딩 문제 전용 데이터 */}
                            {isCoding && (
                              <>
                                <TableCell className="text-xs text-slate-500">{!isPending && sub.memoryUsage !== undefined ? `${sub.memoryUsage} MB` : "-"}</TableCell>
                                <TableCell className="text-xs text-slate-500">{!isPending && sub.runtime !== undefined ? `${sub.runtime} ms` : "-"}</TableCell>
                                <TableCell className="text-xs font-bold text-slate-600">{!isPending ? (sub.language || "-") : "-"}</TableCell>
                              </>
                            )}

                            {/* 실습 문제 전용 데이터 */}
                            {problemData?.type === "practice" && (
                              <TableCell className="text-xs text-slate-300">-</TableCell>
                            )}

                            {/* 제출 시간 */}
                            <TableCell className="text-right text-xs text-slate-400">
                              {new Date(sub.submittedAt).toLocaleString()}
                            </TableCell>

                            {/* 상세 보기 액션 버튼 컬럼 */}
                            <TableCell className="text-center">
                              {/* 1. 객관식: OBO 페이지로 이동 */}
                              {problemData?.type === "objective" && !isPending && (
                                <Button variant="outline" size="sm" className="h-7 text-xs font-bold text-slate-600" asChild>
                                  <Link href={`/challenges/obo?id=${sub.submissionId}`}>결과 확인</Link>
                                </Button>
                              )}

                              {/* 2. 코딩: 코드 보기 / OBO 보기 2가지 버튼 제공 */}
                              {problemData?.type === "coding" && !isPending && (
                                <div className="flex justify-center gap-1.5">
                                  <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs font-bold text-slate-600" asChild>
                                    <Link href={`/challenges/submissions?id=${sub.submissionId}`}>코드</Link>
                                  </Button>
                                  <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs font-bold border-indigo-200 text-indigo-600 hover:bg-indigo-50" asChild>
                                    <Link href={`/challenges/obo?id=${sub.submissionId}`}>OBO</Link>
                                  </Button>
                                </div>
                              )}

                              {/* 3. 실습: 버튼 없음 (또는 채점 중일 때 대기 상태 표시) */}
                              {(problemData?.type === "practice" || isPending) && (
                                <span className="text-xs text-slate-300">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}

                    {submissions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                          아직 제출된 답안이 없습니다.
                        </TableCell>
                      </TableRow>
                    )}
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
                    {rankings.map((rank) => (
                      <TableRow key={rank.rank}>
                        <TableCell className="font-bold">{rank.rank}</TableCell>
                        <TableCell className="font-medium text-blue-600">{rank.nickname}</TableCell>
                        <TableCell className="text-xs text-slate-500">-</TableCell>
                        <TableCell className="text-xs text-slate-500">-</TableCell>
                        <TableCell className="text-xs"><Badge variant="outline">{rank.score}점</Badge></TableCell>
                        <TableCell className="text-right text-xs text-slate-400">
                          {new Date(rank.solvedAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* 4. 댓글 탭 */}
            <TabsContent value="comments" className="mt-6 animate-in fade-in-50 duration-300">

              {!selectedComment ? (
                /* --- [1] 메인 댓글 목록 화면 --- */
                <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
                  {/* 댓글 입력창 */}
                  <div className="space-y-2">
                    <h2 className="text-lg font-bold">댓글 남기기</h2>
                    <Textarea
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      placeholder="이 문제에 대한 팁이나 질문을 남겨주세요."
                      className="resize-none min-h-[100px]"
                    />
                    <div className="flex justify-end">
                      <Button size="sm" onClick={() => handleCreateComment()}>등록하기</Button>
                    </div>
                  </div>

                  <Separator />

                  {/* 댓글 목록 */}
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div
                        key={comment.commentId}
                        onClick={() => { if (editingCommentId !== comment.commentId) handleSelectComment(comment); }}
                        className="flex gap-4 p-4 border rounded-xl bg-white hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer group"
                      >
                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-indigo-50 transition-colors">
                          <User className="h-5 w-5 text-slate-400 group-hover:text-indigo-400" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-slate-900">{comment.authorNickname}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {new Date(comment.createdAt).toLocaleDateString()}
                              </span>
                              {/* 수정 버튼 */}
                              <button
                                onClick={(e) => { e.stopPropagation(); setEditingCommentId(comment.commentId); setEditContent(comment.content); }}
                                className="text-slate-300 hover:text-indigo-500 transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {/* 삭제 버튼 */}
                              <button
                                onClick={(e) => handleDeleteComment(e, comment.commentId)}
                                className="text-slate-300 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* 내용 표시 or 수정 모드 입력창 */}
                          {editingCommentId === comment.commentId ? (
                            <div className="space-y-2 mt-2" onClick={(e) => e.stopPropagation()}>
                              <Textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="resize-none text-sm min-h-[60px] bg-slate-50"
                              />
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="ghost" onClick={() => setEditingCommentId(null)}>취소</Button>
                                <Button size="sm" onClick={(e) => handleUpdateComment(e, comment.commentId, false)}>저장</Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-600 line-clamp-2">{comment.content}</p>
                          )}

                          <div className="pt-2 flex items-center gap-2 text-xs font-bold transition-colors">
                            <div className="flex items-center gap-1 text-slate-400 group-hover:text-indigo-600">
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>답글 보기 / 달기</span>
                            </div>
                            <span className="text-slate-300">|</span>
                            <span className="text-slate-500 group-hover:text-indigo-600 transition-colors">상세 보기</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* --- [2] 특정 댓글의 상세(대댓글) 화면 --- */
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">

                  {/* 뒤로 가기 버튼 */}
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedComment(null)}
                    className="mb-2 -ml-4 text-slate-500 hover:text-slate-900"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    목록으로 돌아가기
                  </Button>

                  {/* 선택된 메인 댓글 (크게 표시) */}
                  <div className="flex gap-4 p-6 border-2 border-indigo-100 rounded-2xl bg-indigo-50/30 shadow-sm">
                    <div className="h-12 w-12 rounded-full bg-white border border-indigo-100 flex items-center justify-center shrink-0">
                      <User className="h-6 w-6 text-indigo-400" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-base text-slate-900">{selectedComment.authorNickname}</span>
                        <span className="text-xs font-medium text-slate-400">
                          {new Date(selectedComment.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-base text-slate-700 leading-relaxed">{selectedComment.content}</p>
                    </div>
                  </div>

                  <Separator />

                  {/* 대댓글 작성창 */}
                  <div className="flex gap-3 items-start">
                    <Textarea
                      value={replyInput}
                      onChange={(e) => setReplyInput(e.target.value)}
                      placeholder={`${selectedComment.authorNickname}님에게 답글 남기기...`}
                      className="resize-none min-h-[80px] bg-slate-50 focus:bg-white"
                    />
                    <Button
                      onClick={() => handleCreateComment(selectedComment.commentId)}
                      className="shrink-0 h-[80px]"
                    >
                      답글<br />등록
                    </Button>
                  </div>

                  {/* 대댓글 목록 */}
                  <div className="space-y-3 pl-6 border-l-2 border-slate-100 ml-6">
                    {selectedComment.replies && selectedComment.replies.map((reply: any) => (
                      <div key={reply.commentId} className="flex gap-3 p-4 border rounded-xl bg-white group">
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                          <User className="h-4 w-4 text-slate-400" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-slate-900">{reply.authorNickname}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] text-slate-400">
                                {new Date(reply.createdAt).toLocaleString()}
                              </span>
                              {/* 대댓글 수정 버튼 */}
                              <button
                                onClick={() => { setEditingCommentId(reply.commentId); setEditContent(reply.content); }}
                                className="text-slate-300 hover:text-indigo-500 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              {/* 대댓글 삭제 버튼 */}
                              <button
                                onClick={(e) => handleDeleteComment(e, reply.commentId, true)}
                                className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* 대댓글 내용 표시 or 수정 모드 */}
                          {editingCommentId === reply.commentId ? (
                            <div className="space-y-2 mt-2">
                              <Textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="resize-none text-xs min-h-[60px] bg-slate-50"
                              />
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="ghost" onClick={() => setEditingCommentId(null)}>취소</Button>
                                <Button size="sm" onClick={(e) => handleUpdateComment(e, reply.commentId, true)}>저장</Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-600">{reply.content}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              )}

            </TabsContent>

          </Tabs>
        </section>

        {/* [C] 우측 광고 패널 (2칸) */}
        <aside className="col-span-12 md:col-span-2">
          <div className="sticky top-24 space-y-4">
            {ads.length > 0 ? (
              ads.map((ad) => (
                <a key={ad.ad_id} href={ad.link_url} target="_blank" rel="noreferrer" className="block w-full overflow-hidden rounded-xl border border-slate-200 shadow-sm transition-transform hover:scale-105">
                  <img src={ad.image_url} alt={ad.alt_text} className="w-full object-cover" />
                </a>
              ))
            ) : (
              <div className="border border-slate-200 rounded-xl bg-slate-50 h-[500px] flex flex-col items-center justify-center text-slate-400 text-sm font-medium">
                AD Area
              </div>
            )}
          </div>
        </aside>

      </main>
    </div>
  );
}

// 2. 헤더 메뉴 전용 보조 컴포넌트
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

export default function ProblemDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    }>
      <ProblemDetailContent />
    </Suspense>
  );
}