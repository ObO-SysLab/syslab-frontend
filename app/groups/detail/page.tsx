"use client";

import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import {
  Search, Settings, LogOut, Menu, Trophy, Star, Share2, ChevronLeft,
  ShieldCheck, Users, Bell, Trash2, LayoutGrid, BarChart3, ShoppingBag,
  FileText, Edit2, MessageSquare, Crown, UserMinus, ChevronRight, Code2, Pin,
  X, Eye
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { mockTopRankers } from "@/lib/mockData";


function GroupDetailPage() {
  // [STATE] 페이지
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showAllMembersModal, setShowAllMembersModal] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [isGroupLeader, setIsGroupLeader] = useState(false);
  const [myStatus, setMyStatus] = useState<"none" | "pending" | "member">("none");

  // [STATE] 데이터
  const searchParams = useSearchParams();
  const groupId = searchParams.get('id');
  const ACTIVITY_TAGS = ["Study", "Networking", "Mentoring", "Class", "Career"];

  // [STATE] 메인 탭
  const [groupData, setGroupData] = useState<any>(null);
  const [groupTags, setGroupTags] = useState<string[]>([]);

  // [STATE] 그룹 전용 문제/대회 탭
  const [contentView, setContentView] = useState<"problem" | "contest">("problem");
  const [groupProblems, setGroupProblems] = useState<any[]>([]);
  const [groupContests, setGroupContests] = useState<any[]>([]);
  const [activityPage, setActivityPage] = useState(1);
  const [activityTotalPages, setActivityTotalPages] = useState(1);

  // [STATE] 멤버 탭
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState(0);

  // [STATE] 게시판 탭
  const [notifications, setNotifications] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<number>(0);
  const [postDetail, setPostDetail] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [isWriting, setIsWriting] = useState(false);
  const [newPostType, setNewPostType] = useState<"general" | "notice">("general");
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [newComment, setNewComment] = useState("");
  const [boardPage, setBoardPage] = useState(1);
  const [boardTotalPages, setBoardTotalPages] = useState(1);
  const [commentPage, setCommentPage] = useState(1);
  const [commentTotalPages, setCommentTotalPages] = useState(1);
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editCommentContent, setEditCommentContent] = useState("");

  // [STATE] 설정 탭 
  const [isPrivate, setIsPrivate] = useState(false);
  const [isAutoApprove, setIsAutoApprove] = useState(false);
  const [selectedSettingsTags, setSelectedSettingsTags] = useState<string[]>([]);
  const [showJoinQueueModal, setShowJoinQueueModal] = useState(false);
  const [pendingMembers, setPendingMembers] = useState<any[]>([]);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDesc] = useState("");

  // [API] 페이지 초기 데이터 로드
  useEffect(() => {
    const fetchInitData = async () => {
      setIsLoading(true);

      const token = localStorage.getItem("token");
      if (token) setIsLoggedIn(true);

      try {
        await fetchGroupData();
        fetchGroupProblems();
        fetchGroupContests();
        fetchMembers();
        fetchBoards(1);
        fetchPendingApplicant();
      } catch (error) {
        console.error("초기 데이터 로드 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitData();
  }, []);

  // [HANDLER] 게시글 선택 시 상세 정보 다시 불러오기
  useEffect(() => {
    if (selectedPostId !== 0) {
      fetchBoardDetail();
      fetchComments(1);
      setCommentPage(1);
    }
  }, [selectedPostId]);

  // [HANDLER] 게시판 페이지가 바뀌면 게시글 다시 불러오기
  useEffect(() => {
    fetchBoards(boardPage);
  }, [boardPage]);

  useEffect(() => {
    if (selectedPostId !== 0) {
      fetchComments(commentPage);
    }
  }, [commentPage]);

  // [HANDLER] 문제/대회 페이지가 바뀌면 활동 다시 불러오기
  useEffect(() => {
    fetchGroupProblems(activityPage);
  }, [activityPage]);

  // [API] 그룹 메인 데이터 재호출용 함수 추가
  const fetchGroupData = async () => {
    const token = localStorage.getItem("token");
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const grpRes = await fetch(`https://diveon.net/api/groups/${groupId}`, { headers });
      if (grpRes.ok) {
        const grpJson = await grpRes.json();
        setEditTitle(grpJson.data.title);
        setEditDesc(grpJson.data.description);
        setGroupData(grpJson.data);
        setIsPrivate(grpJson.data.settings.isPrivate);
        setIsAutoApprove(grpJson.data.settings.isAutoApprove);
        setGroupTags(grpJson.data.tags);
        setSelectedSettingsTags(grpJson.data.tags);
        setIsGroupLeader(grpJson.data.userContext.isLeader);
        setMyStatus(grpJson.data.userContext.myStatus);
      }
    } catch (error) {
      console.error("그룹 데이터 로드 실패:", error);
    }
  };

  // [API] 그룹 전용 문제 목록 조회 (공개범위: 공개,그룹)
  const fetchGroupProblems = async (page = activityPage) => {
    const token = localStorage.getItem("token");

    const params = new URLSearchParams();
    params.append("page", page.toString());
    // params.append("size", "10");

    try {
      const res = await fetch(`https://diveon.net/api/groups/${groupId}/problems?${params.toString()}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        const json = await res.json();
        setGroupProblems(json.data.problems);
        setActivityPage(json.data.currentPage);
        setActivityTotalPages(json.data.totalPages);
      }

    } catch (error) {
      console.error("그룹 전용 문제 로드 실패:", error);
    }
  };

  // [API] 그룹 전용 대회 목록 조회
  const fetchGroupContests = async () => {
    const token = localStorage.getItem("token");
  };

  // [API] 멤버 목록 조회 
  const fetchMembers = async (page = 1, keyword = "") => {
    const token = localStorage.getItem("token");

    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("size", "50"); // max: 50
    if (keyword) params.append("keyword", keyword);

    try {
      const res = await fetch(`https://diveon.net/api/groups/${groupId}/members?${params.toString()}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        const json = await res.json();
        setMembers(json.data.members);
        // 멤버 탭 페이지네이션
      }

    } catch (error) {
      console.error("멤버 탭 로드 실패:", error);
    }
  };

  // [API] 게시글 목록 조회
  const fetchBoards = async (page = boardPage) => {
    const token = localStorage.getItem("token");

    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("size", "10");

    try {
      const res = await fetch(`https://diveon.net/api/groups/${groupId}/posts?${params.toString()}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        const json = await res.json();
        setPosts(json.data.posts);
        setBoardTotalPages(json.data.totalPages);
      }

    } catch (error) {
      console.error("게시글 탭 로드 실패:", error);
    }
  };

  // [API] 게시글 상세 조회
  const fetchBoardDetail = async () => {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`https://diveon.net/api/groups/${groupId}/posts/${selectedPostId}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        const json = await res.json();
        fetchComments();
        setPostDetail(json.data);
      }

    } catch (error) {
      console.error("게시글 로드 실패:", error);
    }
  };

  // [API] 댓글 목록 조회
  const fetchComments = async (page = commentPage) => {
    if (selectedPostId === 0) return;
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`https://diveon.net/api/groups/${groupId}/posts/${selectedPostId}/comments?page=${page}&size=10`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        const json = await res.json();
        setComments(json.data.comments);
        const total = json.data.totalPages || Math.ceil(json.data.totalElements / 10);
        setCommentTotalPages(total);
      }
    } catch (error) {
      console.error("댓글 로드 실패:", error);
    }
  };

  // [API] 가입 대기자 목록 조회
  const fetchPendingApplicant = async () => {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`https://diveon.net/api/groups/${groupId}/members/pending`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        const json = await res.json();
        setPendingMembers(json.data.pendingMembers);
      }

    } catch (error) {
      console.error("가입 대기자 로드 실패:", error);
    }
  };

  // [API] 그룹 가입
  const handleJoin = async () => {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`https://diveon.net/api/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        alert("가입 신청 되었습니다.");
        const json = await res.json();
        setMyStatus(json.data.newStatus);
        fetchGroupData();
      }

    } catch (error) {
      console.error("가입 신청 실패:", error);
    }
  };

  // [API] 그룹 탈퇴
  const handleLeave = async () => {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`https://diveon.net/api/groups/${groupId}/members/me`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        alert("탈퇴 되었습니다.");
        const json = await res.json();
        setMyStatus(json.data.newStatus);
        fetchGroupData();
      }

    } catch (error) {
      console.error("탈퇴 실패:", error);
    }
  };

  // [API] 가입 신청 철회
  const handleCancel = async () => {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`https://diveon.net/api/groups/${groupId}/members/pending/me`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        alert("가입이 신청 철회 되었습니다.");
        const json = await res.json();
        setMyStatus(json.data.newStatus === "CANCELED" ? "none" : json.data.newStatus);
      }

    } catch (error) {
      console.error("가입 신청 철회 실패:", error);
    }
  };

  // [API] 멤버 강퇴
  const handleResign = async (member: any) => {
    const token = localStorage.getItem("token");
    if (!isGroupLeader) { return; }

    if (!confirm(`${member.nickname}님을 정말 강퇴하시겠습니까?`)) { return; }

    try {
      const res = await fetch(`https://diveon.net/api/groups/${groupId}/members/${member.userId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        alert("강퇴 되었습니다.");
        const json = await res.json();
        fetchMembers();
        fetchGroupData();
      }
    } catch (error) {
      console.error("강퇴 실패:", error);
    }
  };

  // [API] 게시글 생성
  const handleCreatePost = async () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      alert("제목과 내용을 모두 입력해주세요.");
      return;
    }

    const token = localStorage.getItem("token");

    try {
      const body = {
        title: newPostTitle,
        content: newPostContent,
        type: newPostType
      };

      const res = await fetch(`https://diveon.net/api/groups/${groupId}/posts`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        alert("게시글이 생성 되었습니다.");
        setIsWriting(false);
        setNewPostTitle("");
        setNewPostContent("");
        setNewPostType("general");
        fetchBoards(1);
        setBoardPage(1);
      }
    } catch (error) {
      console.error("게시글 생성 실패:", error);
    }
  };

  // [API] 게시글 수정
  const handleEditPost = async () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      alert("제목과 내용을 모두 입력해주세요.");
      return;
    }
    const token = localStorage.getItem("token");

    try {
      const body = {
        title: newPostTitle,
        content: newPostContent,
        type: newPostType
      };

      const res = await fetch(`https://diveon.net/api/groups/${groupId}/posts/${postDetail.postId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        alert("게시글이 수정 되었습니다.");
        setIsEditingPost(false);
        setIsWriting(false);
        fetchBoardDetail();
        fetchBoards();
      }
    } catch (error) {
      console.error("게시글 수정 실패:", error);
    }
  };

  // [API] 게시글 삭제
  const handleDeletePost = async () => {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`https://diveon.net/api/groups/${groupId}/posts/${selectedPostId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        alert("게시글이 삭제 되었습니다.");
        setSelectedPostId(0);
        fetchBoards(boardPage);
      }
    } catch (error) {
      console.error("게시글 삭제 실패:", error);
    }
  };

  // [API] 댓글 생성
  const handleCreateComment = async () => {
    if (!newComment.trim()) {
      alert("댓글을 작성해주세요.");
      return;
    }

    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`https://diveon.net/api/groups/${groupId}/posts/${selectedPostId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ content: newComment })
      });

      if (res.ok) {
        alert("댓글이 생성 되었습니다.");
        setNewComment("");
        fetchBoardDetail();
      }
    } catch (error) {
      console.error("댓글 생성 실패:", error);
    }
  };

  // [API] 댓글 수정
  const handleEditComment = async (commentId: number) => {
    if (!editCommentContent.trim()) {
      alert("댓글 내용을 입력해주세요.");
      return;
    }
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`https://diveon.net/api/groups/${groupId}/posts/${selectedPostId}/comments/${commentId}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ content: editCommentContent })
      });

      if (res.ok) {
        alert("댓글이 수정 되었습니다.");
        setEditingCommentId(null);
        fetchBoardDetail();
      }
    } catch (error) {
      console.error("댓글 수정 실패:", error);
    }
  };

  // [API] 댓글 삭제
  const handleDeleteComment = async (commentId: number) => {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`https://diveon.net/api/groups/${groupId}/posts/${selectedPostId}/comments/${commentId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        alert("댓글이 삭제 되었습니다.");
        fetchBoardDetail();
      }
    } catch (error) {
      console.error("댓글 삭제 실패:", error);
    }
  };

  // [API] 가입 승인
  const handleApprove = async (userId: number) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`https://diveon.net/api/groups/${groupId}/members/pending/${userId}/accept`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ decidedReason: "" })
      });

      if (res.ok) {
        alert("가입 승인 되었습니다.");
        fetchMembers();
        fetchPendingApplicant();
        fetchGroupData();
      }
    } catch (error) {
      console.error("승인 실패:", error);
    }
  };

  // [API] 가입 거절
  const handleReject = async (userId: number) => {
    if (!confirm("가입 요청을 거절하시겠습니까?")) return;

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`https://diveon.net/api/groups/${groupId}/members/pending/${userId}/reject`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ decidedReason: "" })
      });

      if (res.ok) {
        alert("가입 거절 되었습니다.");
        fetchPendingApplicant();
      }
    } catch (error) {
      console.error("거절 실패:", error);
    }
  };

  // [API] 그룹 삭제
  const handleDeleteGroup = async () => {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`https://diveon.net/api/groups/${groupId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        alert("그룹이 삭제 되었습니다.");
        router.push(`/groups`);
      }
    } catch (error) {
      console.error("그룹 삭제 실패:", error);
    }
  };

  // [API] 그룹 설정 수정
  const handleGroupSettings = async () => {
    const token = localStorage.getItem("token");

    const body = {
      title: editTitle,
      description: editDescription,
      tags: selectedSettingsTags,
      isPrivate: isPrivate,
      isAutoApprove: isAutoApprove
    };

    try {
      const res = await fetch(`https://diveon.net/api/groups/${groupId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        alert("그룹 설정이 저장 되었습니다.");
        fetchGroupData();
      }
    } catch (error) {
      console.error("그룹 설정 실패:", error);
    }
  };

  // [HANDLER] 태그 토글
  const toggleSettingTag = (tag: string) => {
    setSelectedSettingsTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

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

      {/* 2. 메인 레이아웃 */}
      <main className="container mx-auto max-w-[1600px] pt-6 grid grid-cols-1 md:grid-cols-12 gap-6 px-4 pb-12">

        {/* [A] 좌측 정보 패널 (2칸) */}
        <aside className="col-span-12 md:col-span-2 space-y-4">
          <Card className="shadow-none border-slate-200 overflow-hidden">
            <CardHeader className="bg-slate-50 pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" /> 명예의 전당
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {mockTopRankers.map((ranker) => (
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
            {/* 최근 활동 패널 */}
            <CardContent className="pt-4 space-y-4">
              {posts.slice(0, 5).map((post) => (
                <div key={post.postId} className="border-l-2 border-indigo-200 pl-3 py-1 cursor-pointer hover:bg-slate-50">
                  <p className="text-[11px] font-bold text-slate-800 flex items-center justify-between">
                    {post.author}
                    {post.type === "notice" && <Badge className="text-[8px] h-4 px-1 py-0 bg-purple-100 text-purple-700">공지</Badge>}
                  </p>
                  <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{post.title}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>

        {/* [B] 중앙 콘텐츠 영역 */}
        <section className="col-span-12 md:col-span-8 space-y-6">

          <Tabs defaultValue="main" className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-slate-100 p-1 rounded-lg sticky top-16 z-40">
              <TabsTrigger value="main">메인</TabsTrigger>
              <TabsTrigger value="activity">챌린지/대회</TabsTrigger>
              <TabsTrigger value="member">멤버</TabsTrigger>
              <TabsTrigger value="board">게시판</TabsTrigger>
              {isGroupLeader && <TabsTrigger value="setting">설정</TabsTrigger>}
            </TabsList>

            {/* 1. 메인 탭 */}
            <TabsContent value="main" className="mt-6 space-y-6 animate-in fade-in-50 duration-300">
              <div className="flex gap-6 items-start">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg">
                  <ShieldCheck className="w-12 h-12 text-white" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold text-slate-900">{groupData?.title}</h1>
                    {/* <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">Official</Badge> */}
                  </div>
                  <p className="text-slate-500 leading-relaxed">
                    {groupData?.description}
                  </p>
                  {/* 그룹 태그 */}
                  <div className="flex gap-2">
                    {groupTags.map(tag => (
                      <Badge key={tag} variant="secondary" className="bg-indigo-50 text-indigo-600 border-indigo-100">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* 그룹 통계 */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-slate-50 border-none shadow-none">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-slate-500 uppercase font-bold">멤버 수</p>
                    <p className="text-2xl font-black text-slate-900">{groupData?.stats?.memberCount}</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-50 border-none shadow-none">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-slate-500 uppercase font-bold">문제 수</p>
                    <p className="text-2xl font-black text-slate-900">{groupData?.stats?.problemCount}</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-50 border-none shadow-none">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-slate-500 uppercase font-bold">대회 수</p>
                    <p className="text-2xl font-black text-slate-900">-</p>
                  </CardContent>
                </Card>
              </div>

              {/* 가입/철회/탈퇴 동적 버튼 */}
              <div className="flex gap-2">
                {isGroupLeader ? (
                  <Badge className="h-10 px-4 py-0 bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 flex items-center gap-2">
                    <Crown className="w-4 h-5 text-amber-500 mx-auto drop-shadow-sm" /> 그룹 리더
                  </Badge>
                ) : (
                  <>
                    {myStatus === "none" && (
                      <Button onClick={handleJoin} className="bg-indigo-600 hover:bg-indigo-700 shadow-md">가입 신청하기</Button>
                    )}

                    {myStatus === "pending" && (
                      <Button onClick={handleCancel} variant="secondary" className="border-indigo-200 text-indigo-600">가입 신청 철회</Button>
                    )}

                    {myStatus === "member" && (
                      <Button onClick={handleLeave} variant="destructive" className="bg-red-50 text-red-600 hover:bg-red-100 border-red-100">탈퇴하기</Button>
                    )}
                  </>
                )}

                {/* 공통 버튼: 공유하기 */}
                <Button variant="outline" size="icon"><Share2 className="h-4 w-4" /></Button>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Pin className="w-5 h-5 text-red-500 fill-current" /> 그룹 소식 (공지)
                </h3>
                {posts.filter(p => p.type === "notice").map(notice => (
                  <Card key={notice.postId} className="border-l-4 border-l-purple-500 shadow-sm hover:bg-slate-50 transition-colors cursor-pointer">
                    <CardContent className="p-4">
                      <p className="text-sm font-bold text-slate-800">{notice.title}</p>
                      <p className="text-sm text-slate-600 mt-1 line-clamp-1">{notice.content}</p>
                      <p className="text-xs text-slate-400 mt-2">{notice.createdAt} · {notice.author}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* 2. 챌린지/대회 탭 */}
            <TabsContent value="activity" className="mt-6 animate-in fade-in-50 duration-300 space-y-6">

              {/* 상단 세그먼트 컨트롤 (토글) */}
              <div className="flex justify-center">
                <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
                  <button
                    onClick={() => setContentView("problem")}
                    className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${contentView === "problem" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      }`}
                  >
                    전용 문제
                  </button>
                  <button
                    onClick={() => setContentView("contest")}
                    className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${contentView === "contest" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      }`}
                  >
                    전용 대회
                  </button>
                </div>
              </div>

              {/* 선택된 모드에 따른 리스트 렌더링 */}
              <div className="grid grid-cols-1 gap-3">
                {contentView === "problem" ? (
                  /* --- [A] 그룹 전용 문제 리스트 --- */
                  groupProblems.map(prob => (
                    <Link
                      key={prob.problemId}
                      href={`/challenges/detail?id=${prob.problemId}`}
                      className="block group"
                    >
                      <Card key={prob.problemId} className="p-4 hover:border-indigo-200 transition-all cursor-pointer group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                              <Code2 size={20} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-slate-900">{prob.title}</h3>
                                {prob.visibility === "group" ? (
                                  <Badge className="bg-rose-100 text-rose-700 h-5 px-1.5 text-[10px]">GROUP</Badge>
                                ) : prob.visibility === "public" ? (
                                  <Badge className="bg-blue-100 text-blue-700 h-5 px-1.5 text-[10px]">PUBLIC</Badge>
                                ) : null}
                              </div>
                              <p className="text-xs text-slate-500 mt-1">작성자: {prob.author} · 해결 {prob.solvedCount}명</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="font-bold border-indigo-100 text-indigo-600">
                            Lvl {prob.difficulty}
                          </Badge>
                        </div>
                      </Card>
                    </Link>
                  ))
                ) : (
                  /* --- [B] 그룹 전용 대회 리스트 --- */
                  groupContests.map(contest => (
                    <Card key={contest.id} className="p-4 hover:border-purple-200 transition-all cursor-pointer group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-purple-50 group-hover:text-purple-500 transition-colors">
                            <Trophy size={20} />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900">{contest.title}</h3>
                            <p className="text-xs text-slate-500">{contest.period}</p>
                          </div>
                        </div>
                        <Badge className={contest.status === "진행 중" ? "bg-emerald-500" : "bg-slate-400"}>
                          {contest.status}
                        </Badge>
                      </div>
                    </Card>
                  ))
                )}

                {/* 데이터가 없을 경우 처리 */}
                {(contentView === "problem" ? groupProblems : groupContests).length === 0 && (
                  <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100">
                    <p className="text-sm text-slate-400 font-medium">등록된 전용 콘텐츠가 없습니다.</p>
                  </div>
                )}
              </div>

              <PaginationUI
                currentPage={activityPage}
                totalPages={activityTotalPages}
                onPageChange={setActivityPage}
              />
            </TabsContent>

            {/* 3. 멤버 탭 */}
            <TabsContent value="member" className="mt-6 animate-in fade-in-50 duration-300">
              <div className="flex justify-between items-end mb-4">
                <h2 className="text-xl font-bold">그룹 멤버 <span className="text-indigo-500 text-sm ml-1">158명</span></h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-slate-500 hover:text-indigo-600"
                  onClick={() => setShowAllMembersModal(true)}
                >
                  전체 보기
                </Button>
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
                      {isGroupLeader && <TableHead className="text-right w-[80px]">관리</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* 그룹장 최상단 로직 */}
                    {[...members]
                      .sort((a, b) => {
                        if (a.role === "그룹장") return -1;
                        if (b.role === "그룹장") return 1;
                        return a.rank - b.rank; // 나머지는 원래 순위대로
                      })
                      .map((member, index) => {
                        const isLeader = member.role === "그룹장";

                        return (
                          <TableRow
                            key={index}
                            className={`transition-colors ${isLeader ? "bg-amber-50/30" : "hover:bg-slate-50/50"}`}
                          >
                            {/* 순위 (그룹장은 왕관) */}
                            <TableCell className="text-center font-bold text-slate-400">
                              {isLeader ? (
                                <Crown className="w-5 h-5 text-amber-500 mx-auto drop-shadow-sm" />
                              ) : (
                                member.rank <= 3 ? <span className="text-amber-500">{member.rank}</span> : member.rank
                              )}
                            </TableCell>

                            {/* 사용자 정보 */}
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {/* 그룹장 프로필 사진에 금색 테두리 부여 */}
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${isLeader
                                  ? "bg-amber-100 text-amber-700 border-2 border-amber-300 shadow-sm"
                                  : "bg-slate-200 text-slate-600"
                                  }`}>
                                  {member.nickname[0]}
                                </div>
                                <span className={`font-semibold ${isLeader ? "text-amber-900" : "text-slate-700"}`}>
                                  {member.nickname}
                                </span>
                              </div>
                            </TableCell>

                            {/* 역할 뱃지 */}
                            <TableCell>
                              {isLeader ? (
                                <Badge className="bg-amber-100 text-amber-700 border-amber-300 shadow-sm hover:bg-amber-100 font-black">
                                  그룹장
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="font-normal text-[10px]">
                                  {member.role}
                                </Badge>
                              )}
                            </TableCell>

                            {/* 티어 */}
                            <TableCell>
                              <span className={`text-xs font-bold ${member.tier === "마스터" ? "text-purple-600" : "text-slate-500"}`}>
                                {member.tier}
                              </span>
                            </TableCell>

                            {/* 가입 날짜 */}
                            <TableCell className="text-right text-xs text-slate-400 font-mono">
                              {member.joinedAt?.split("T")[0]}
                            </TableCell>

                            {/* 강퇴 버튼 (현재 접속자가 그룹장 && 대상이 그룹장이 아닐 때만 노출) */}
                            {isGroupLeader && (
                              <TableCell className="text-right">
                                {!isLeader && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                    onClick={() => handleResign(member)}
                                  >
                                    <UserMinus className="w-3.5 h-3.5 mr-1" /> 강퇴
                                  </Button>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>

              {/* 전체 멤버 보기 모달창 */}
              {showAllMembersModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                  <Card className="w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">

                    {/* 모달 헤더 */}
                    <CardHeader className="flex flex-row items-center justify-between border-b pb-4 shrink-0 bg-white rounded-t-xl">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">전체 멤버</CardTitle>
                        <CardDescription>그룹에 가입된 모든 멤버를 확인하고 관리하세요.</CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setShowAllMembersModal(false);
                          setMemberSearchQuery(""); // 닫을 때 검색어 초기화
                        }}
                      >
                        <X className="w-5 h-5 text-slate-500" />
                      </Button>
                    </CardHeader>

                    {/* 멤버 검색창 */}
                    <div className="p-4 border-b bg-slate-50 shrink-0">
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                          placeholder="멤버 닉네임 검색..."
                          value={memberSearchQuery}
                          onChange={(e) => setMemberSearchQuery(e.target.value)}
                          className="pl-9 bg-white"
                        />
                      </div>
                    </div>

                    {/* 모달 스크롤 바디 (기존 테이블 재사용 및 필터링) */}
                    <CardContent className="overflow-y-auto p-0 flex-1 hide-scrollbar">
                      <Table>
                        <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                          <TableRow>
                            <TableHead className="w-[60px] text-center pl-4">순위</TableHead>
                            <TableHead>사용자</TableHead>
                            <TableHead>역할</TableHead>
                            <TableHead>티어</TableHead>
                            {isGroupLeader && <TableHead className="text-right pr-4">관리</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...members]
                            // 검색어 필터링
                            .filter(m => m.nickname.includes(memberSearchQuery))
                            // 그룹장 위로 정렬
                            .sort((a, b) => {
                              if (a.role === "그룹장") return -1;
                              if (b.role === "그룹장") return 1;
                              return a.rank - b.rank;
                            })
                            .map((member, index) => {
                              const isLeader = member.role === "그룹장";
                              return (
                                <TableRow key={index} className={isLeader ? "bg-amber-50/30" : ""}>
                                  {/* ... (이전 단계에서 작성한 TableCell 내용들 그대로 복사/붙여넣기) ... */}
                                  <TableCell className="text-center font-bold text-slate-400 pl-4">
                                    {isLeader ? <Crown className="w-4 h-4 text-amber-500 mx-auto" /> : member.rank}
                                  </TableCell>
                                  <TableCell className="font-semibold text-slate-700">{member.nickname}</TableCell>
                                  <TableCell><Badge variant="secondary" className="text-[10px]">{member.role}</Badge></TableCell>
                                  <TableCell><span className="text-xs font-bold text-slate-500">{member.tier}</span></TableCell>

                                  {isGroupLeader && (
                                    <TableCell className="text-right pr-4">
                                      {!isLeader && (
                                        <Button variant="ghost" size="sm" className="h-7 text-red-500 hover:bg-red-50" onClick={() => handleResign(member)}>
                                          강퇴
                                        </Button>
                                      )}
                                    </TableCell>
                                  )}
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>

                      {/* 검색 결과가 없을 때 */}
                      {members.filter(m => m.nickname.includes(memberSearchQuery)).length === 0 && (
                        <div className="py-12 text-center text-slate-400 text-sm">
                          검색 결과가 없습니다.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* 4. 게시판 탭 */}
            <TabsContent value="board" className="mt-6 animate-in fade-in-50 duration-300">

              {isWriting ? (
                /* ==========================================
                   [C] 게시글 작성 폼 모드 
                ========================================== */
                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                  <div className="flex justify-between items-center mb-2">
                    <Button variant="ghost" onClick={() => { setIsWriting(false); setIsEditingPost(false); }} className="...">
                      <ChevronLeft className="w-4 h-4 mr-1" /> 목록으로 돌아가기
                    </Button>
                    <h2 className="text-lg font-bold">{isEditingPost ? "게시글 수정" : "새 게시글 작성"}</h2>
                  </div>

                  <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-6 space-y-4">
                      {/* 구석에 박힌 미니 공지 토글 */}
                      {isGroupLeader && (
                        <div className="flex justify-end items-center gap-2 mb-1">
                          <label htmlFor="notice-mode" className={`text-[11px] font-black uppercase tracking-wider cursor-pointer transition-colors ${newPostType === "notice" ? "text-purple-600" : "text-slate-400"}`}>
                            {newPostType === "notice" ? "Notice Mode On" : "Set as Notice"}
                          </label>
                          <button type="button" role="switch" id="notice-mode" onClick={() => setNewPostType(newPostType === "notice" ? "general" : "notice")} className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none ${newPostType === "notice" ? "bg-purple-600" : "bg-slate-200"}`}>
                            <span className={`pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${newPostType === "notice" ? "translate-x-4" : "translate-x-1"}`} />
                          </button>
                        </div>
                      )}
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">제목</label>
                        <Input placeholder="게시글 제목을 입력하세요." value={newPostTitle} onChange={(e) => setNewPostTitle(e.target.value)} className="bg-slate-50" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">내용</label>
                        <Textarea placeholder="내용을 작성해주세요." value={newPostContent} onChange={(e) => setNewPostContent(e.target.value)} className="min-h-[200px] resize-y bg-slate-50" />
                      </div>
                      <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => { setIsWriting(false); setIsEditingPost(false); }}>취소</Button>
                        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={isEditingPost ? handleEditPost : handleCreatePost}>
                          {isEditingPost ? "수정하기" : "등록하기"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : selectedPostId ? (
                /* ==========================================
                   [B] 게시글 상세 보기 모드
                ========================================== */
                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                  <div className="flex justify-between items-center mb-2">
                    <Button variant="ghost" onClick={() => setSelectedPostId(0)} className="text-slate-500 hover:text-slate-900 -ml-4">
                      <ChevronLeft className="w-4 h-4 mr-1" /> 목록으로 돌아가기
                    </Button>
                  </div>

                  {/* 작성자이거나 그룹장일 때만 수정/삭제 버튼 노출 */}
                  {!postDetail ? (
                    <div className="py-24 text-center text-slate-400 text-sm font-bold animate-pulse">
                      게시글을 불러오는 중입니다...
                    </div>
                  ) : (
                    <>
                      {/* 작성자이거나 그룹장일 때만 수정/삭제 버튼 노출 */}
                      {(postDetail.isAuthor || isGroupLeader) && (
                        <div className="flex justify-end gap-2 mb-2">
                          <Button variant="outline" size="sm" onClick={() => {
                            setNewPostTitle(postDetail.title);
                            setNewPostContent(postDetail.content);
                            setNewPostType(postDetail.type);
                            setIsEditingPost(true);
                            setIsWriting(true);
                          }}>수정</Button>
                          <Button variant="destructive" size="sm" onClick={handleDeletePost}>삭제</Button>
                        </div>
                      )}

                      <Card key={postDetail.postId} className="border-slate-200 shadow-sm">
                        <CardHeader className="pb-4 border-b">
                          <div className="space-y-3">
                            {postDetail.type === "notice" && <Badge className="bg-purple-100 text-purple-700 w-fit">공지사항</Badge>}
                            <CardTitle className="text-xl font-bold text-slate-900">{postDetail.title}</CardTitle>
                            <div className="flex items-center justify-between text-xs text-slate-500">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-700">{postDetail.author}</span>
                                <span>·</span>
                                <span>{postDetail.createdAt}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Eye className="w-3.5 h-3.5" /> {postDetail.viewCount ? postDetail.viewCount : 0}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                          {/* 본문 내용 */}
                          <div className="text-sm text-slate-800 whitespace-pre-wrap min-h-[150px] leading-relaxed">
                            {postDetail.content}
                          </div>

                          <Separator className="my-6" />

                          {/* 댓글 영역 */}
                          <div className="space-y-4">
                            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                              <MessageSquare className="w-4 h-4 text-indigo-500" /> 댓글 <span className="text-indigo-500">{comments?.length > 0 || 0}</span>
                            </h4>

                            <div className="space-y-3">
                              {postDetail?.comments.map((comment: any) => (
                                <div key={comment.commentId} className="bg-slate-50 rounded-xl p-4 flex justify-between group border border-slate-100">
                                  {/* 수정 모드일 때와 아닐 때 UI 분기 */}
                                  {editingCommentId === comment.commentId ? (
                                    <div className="flex-1 mr-4 space-y-2">
                                      <Input
                                        value={editCommentContent}
                                        onChange={(e) => setEditCommentContent(e.target.value)}
                                        className="bg-white"
                                      />
                                      <div className="flex gap-2">
                                        <Button size="sm" onClick={() => handleEditComment(comment.commentId)} className="bg-indigo-600">저장</Button>
                                        <Button size="sm" variant="outline" onClick={() => setEditingCommentId(null)}>취소</Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      <p className="text-xs font-bold text-slate-900">{comment.author} <span className="text-[10px] text-slate-400 font-normal ml-2">{comment.createdAt}</span></p>
                                      <p className="text-sm text-slate-700 mt-1.5">{comment.content}</p>
                                    </div>
                                  )}

                                  {/* 작성자이거나 그룹장일 때만 버튼 노출 (수정 모드가 아닐 때만) */}
                                  {(comment.isAuthor || isGroupLeader) && editingCommentId !== comment.commentId && (
                                    <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-indigo-600"
                                        onClick={() => {
                                          setEditingCommentId(comment.commentId);
                                          setEditCommentContent(comment.content); // 기존 내용을 Input에 채움
                                        }}>
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500"
                                        onClick={() => handleDeleteComment(comment.commentId)}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>

                            <PaginationUI
                              currentPage={commentPage}
                              totalPages={commentTotalPages}
                              onPageChange={setCommentPage}
                            />

                            {/* 댓글 작성 폼 */}
                            <div className="flex gap-2 mt-4 pt-2">
                              <Input placeholder="댓글을 남겨보세요..." value={newComment} onChange={(e) => setNewComment(e.target.value)} className="h-10 text-sm bg-slate-50" />
                              <Button className="h-10 px-6 bg-indigo-600 hover:bg-indigo-700 font-bold" onClick={() => handleCreateComment()}>등록</Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </div>
              ) : (
                /* ==========================================
                   [A] 게시글 목록 모드 (리스트/테이블 형태)
                ========================================== */
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-bold flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-500" /> 그룹 게시판</h2>
                    <Button
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-700 shadow-sm"
                      onClick={() => {
                        setNewPostTitle("");
                        setNewPostContent("");
                        setNewPostType("general");
                        setIsWriting(true);
                        setIsEditingPost(false);
                      }}
                    >
                      <Edit2 className="w-4 h-4 mr-1.5" /> 글쓰기
                    </Button>
                  </div>

                  <Card className="border-slate-200 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="w-[60%] pl-4">제목</TableHead>
                          <TableHead className="w-[15%] text-center">작성자</TableHead>
                          <TableHead className="w-[15%] text-center">작성일</TableHead>
                          <TableHead className="w-[10%] text-center pr-4">조회수</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {posts.map(post => (
                          <TableRow
                            key={post.postId}
                            className={`cursor-pointer transition-colors hover:bg-slate-50 ${post.type === "notice" ? "bg-purple-50/30" : ""}`}
                            onClick={() => setSelectedPostId(post.postId)}
                          >
                            <TableCell className="pl-4">
                              <div className="flex items-center gap-2">
                                {post.type === "notice" && <Badge className="bg-purple-100 text-purple-700 h-5 px-1.5 text-[10px]">공지</Badge>}
                                <span className={`font-medium ${post.type === "notice" ? "text-purple-900 font-bold" : "text-slate-700"}`}>
                                  {post.title}
                                </span>
                                {post.comments?.length > 0 && (
                                  <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-1.5 rounded-full">
                                    {post.comments.length}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center text-xs text-slate-600">{post.author}</TableCell>
                            <TableCell className="text-center text-xs text-slate-400 font-mono">{post.createdAt}</TableCell>
                            <TableCell className="text-center text-xs text-slate-400 font-mono pr-4">{post.viewCount}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>

                  <PaginationUI
                    currentPage={boardPage}
                    totalPages={boardTotalPages}
                    onPageChange={setBoardPage}
                  />
                </div>
              )}
            </TabsContent>

            {/* 5. 설정 탭 */}
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
                      <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">그룹 소개</label>
                      <Textarea value={editDescription} onChange={(e) => setEditDesc(e.target.value)} className="text-sm min-h-[80px]" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500">그룹 활동 목적</label>
                      <div className="flex flex-wrap gap-2">
                        {ACTIVITY_TAGS.map(tag => {
                          const isSelected = selectedSettingsTags.includes(tag);
                          return (
                            <Badge
                              key={tag}
                              variant={isSelected ? "default" : "outline"}
                              onClick={() => toggleSettingTag(tag)}
                              className={`cursor-pointer px-3 py-1 transition-all ${isSelected ? "bg-indigo-600 hover:bg-indigo-700" : "text-slate-400 hover:bg-slate-50"
                                }`}
                            >
                              {tag}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                    <Button size="sm" className="w-full" onClick={handleGroupSettings}>변경사항 저장</Button>
                  </CardContent>
                </Card>

                {/* 보안 및 가입 설정 */}
                <Card className="border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-md flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> 가입 관리</CardTitle>
                    <CardDescription className="text-xs">가입 승인 및 권한을 설정합니다.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">

                    {/* 비공개 그룹 토글 */}
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium">비공개 그룹</span>
                      <button
                        type="button"
                        role="switch"
                        onClick={() => setIsPrivate(!isPrivate)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none ${isPrivate ? "bg-indigo-600" : "bg-slate-300"}`}
                      >
                        <span className={`pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${isPrivate ? "translate-x-4" : "translate-x-1"}`} />
                      </button>
                    </div>

                    {/* 자동 승인 토글 */}
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium">자동 승인</span>
                      <button
                        type="button"
                        role="switch"
                        onClick={() => setIsAutoApprove(!isAutoApprove)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none ${isAutoApprove ? "bg-indigo-600" : "bg-slate-300"}`}
                      >
                        <span className={`pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${isAutoApprove ? "translate-x-4" : "translate-x-1"}`} />
                      </button>
                    </div>

                    {/* 자동 승인이 OFF(!isAutoApprove)일 때만 대기열 버튼 노출 */}
                    {!isAutoApprove && (
                      <div className="pt-2">
                        <p className="text-[11px] font-bold text-indigo-500 mb-2 uppercase">Pending Requests</p>
                        <Button
                          variant="outline"
                          className="w-full justify-between group"
                          onClick={() => setShowJoinQueueModal(true)}
                        >
                          <span>가입 대기열 확인</span>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-indigo-100 text-indigo-600">{pendingMembers.length}</Badge>
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </Button>
                      </div>
                    )}
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
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteGroup()}>그룹 폐쇄</Button>
                </CardContent>
              </Card>

              {/* 가입 대기열 모달 */}
              {showJoinQueueModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                  <Card className="w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-200">
                    <CardHeader className="flex flex-row items-center justify-between border-b pb-4 shrink-0 bg-white rounded-t-xl">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">가입 신청 대기열</CardTitle>
                        <CardDescription>가입 신청을 승인하거나 거절할 수 있습니다.</CardDescription>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setShowJoinQueueModal(false)}>
                        <X className="w-5 h-5 text-slate-500" />
                      </Button>
                    </CardHeader>
                    <CardContent className="p-0 max-h-[60vh] overflow-y-auto">
                      <Table>
                        <TableHeader className="bg-slate-50 sticky top-0 z-10">
                          <TableRow>
                            <TableHead className="pl-6">사용자</TableHead>
                            <TableHead>티어</TableHead>
                            <TableHead>신청일</TableHead>
                            <TableHead className="text-right pr-6">액션</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingMembers.length > 0 ? (
                            pendingMembers.map((m) => (
                              <TableRow key={m.userId}>
                                <TableCell className="font-bold text-slate-700 pl-6">{m.nickname}</TableCell>
                                <TableCell><Badge variant="outline" className="text-[10px]">{m.tier ? m.tier : "Diamond"}</Badge></TableCell>
                                <TableCell className="text-xs text-slate-400 font-mono">{m.appliedAt?.split("T")[0]}</TableCell>
                                <TableCell className="text-right pr-6 space-x-2">
                                  <Button
                                    size="sm" variant="ghost" className="text-red-500"
                                    onClick={() => handleReject(m.userId)}
                                  >
                                    거절
                                  </Button>
                                  <Button
                                    size="sm" className="bg-indigo-600"
                                    onClick={() => handleApprove(m.userId)}
                                  >
                                    승인
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center py-12 text-slate-400">대기 중인 신청이 없습니다.</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              )}
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

// [보조 컴포넌트] 헤더 메뉴 전용 
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

// [보조 컴포넌트] 공통 페이지네이션 UI
function PaginationUI({ currentPage, totalPages, onPageChange }: { currentPage: number; totalPages: number; onPageChange: (page: number) => void }) {
  if (totalPages <= 0) return null;

  return (
    <div className="flex justify-center gap-2 pt-6 pb-2">
      <Button
        variant="outline" size="sm" className="rounded-lg"
        disabled={currentPage === 1}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
      >
        이전
      </Button>

      {Array.from({ length: totalPages }).map((_, i) => (
        <Button
          key={i} variant="outline" size="sm"
          onClick={() => onPageChange(i + 1)}
          className={`rounded-lg ${currentPage === i + 1 ? "bg-slate-950 text-white border-slate-950" : ""}`}
        >
          {i + 1}
        </Button>
      ))}

      <Button
        variant="outline" size="sm" className="rounded-lg"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
      >
        다음
      </Button>
    </div>
  );
}

export default function ProblemDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    }>
      <GroupDetailPage />
    </Suspense>
  );
}