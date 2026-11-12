"use client";
import { requestJson, requestIssue, httpIssue, isRequestCancelled, authHeaders, type RequestIssue } from "@/lib/request";
import { RequestError } from "@/components/feedback/RequestError";
import { useRemoteData } from "@/components/feedback/useRemoteData";
import { logout, pendingSubmission, forgetSubmission } from "@/lib/authSession";
import {problemApi,problemToken} from "@/lib/problemApi";

import Link from "next/link";
import { isSubmissionPending, submissionVerdict } from "@/lib/submission-status";
import { submissionTierLabel } from "@/lib/submission-display";
import { readPracticeBuild, practiceBuildPresentation, watchPracticeBuild } from "@/lib/practice-build";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search, Settings, LogOut, Menu, MessageSquare, Bell, Share2,
  CheckCircle2, XCircle, Clock, LayoutGrid, Users, BarChart3, Trophy, ShoppingBag, Trash2,
  ChevronLeft, MessageCircle, Edit2, Flame, Zap, Flag, Activity
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
import { OboPlayer } from "@/components/obo/OboPlayer";
import { CodingRules } from '@/components/obo/simulation/CodingRules';
import { resolveOboBlob, type OboBlob, type ProblemOboData } from "@/components/obo/types";
import { Header } from "@/components/Header";
import { AdSlot } from "@/components/AdSlot";
import { TierBadge } from "@/components/dv";
import { ProblemTags } from "@/components/problem/ProblemTags";
import { ChoiceList } from "@/components/problem/ChoiceList";
import { SampleCases } from "@/components/problem/SampleCases";

function OboPlayerSection({ oboData, selectedChoiceIndex }: {
  oboData: ProblemOboData | OboBlob;
  selectedChoiceIndex?: number | null;
}) {
  const blob = resolveOboBlob(oboData, selectedChoiceIndex);

  if (!blob || blob.nodes.length === 0) return null;

  return (
    <div className="mt-8 space-y-2">
      <p className="text-sm font-black tracking-tight text-ink flex items-center gap-1.5">
        <Activity className="w-4 h-4 text-primary" /> OBO 시각화
      </p>
      {/* OBO는 라이트 테마 유지 (다른 팀원 담당 영역) */}
      <div className="obo-scope rounded-2xl overflow-hidden border border-line" style={{ height: 440 }}>
        <OboPlayer blob={blob} />
      </div>
    </div>
  );
}

/** Comment author picture; the first letter of the nickname when there is none (2026-11-10 QA #10). */
function AuthorAvatar({ nickname, src, className }: { nickname?: string; src?: string | null; className?: string }) {
  return (
    <Avatar className={`shrink-0 border border-line ${className ?? ''}`}>
      {src && <AvatarImage src={src} alt="" className="object-cover" />}
      <AvatarFallback className="bg-raised text-xs font-bold text-ink-muted">{nickname?.[0] ?? ''}</AvatarFallback>
    </Avatar>
  );
}

function ProblemDetailContent() {
  // URL에서 가져온 값 상태
  const searchParams = useSearchParams();
  const probId = searchParams.get('id');
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || "problem");

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // 페이지 상태
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [showMySubmissions, setShowMySubmissions] = useState(false);
  const [userImgUrl, setUserImgUrl] = useState("");
  const [myNickname, setMyNickname] = useState("");
  // Servers before 2026-11-10 send no author picture; my own comments can still use my profile picture.
  const commentAvatar = (comment: { authorNickname?: string; authorProfileImgUrl?: string | null }) =>
    comment.authorProfileImgUrl ?? (myNickname && comment.authorNickname === myNickname && userImgUrl !== "" ? userImgUrl : null);
  // The server refuses edits to other people's comments; only show the buttons on my own (2026-11-10).
  const isMyComment = (comment: { authorNickname?: string }) => !!myNickname && comment.authorNickname === myNickname;

  // API 연동용 상태
  const [problemData, setProblemData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [practiceStatusError, setPracticeStatusError] = useState('');
  const [practiceStatusRetry, setPracticeStatusRetry] = useState(0);
  const practiceStatusRequested = useRef(0);
  const practiceBuild = readPracticeBuild(isLoading ? null : problemData?.practiceBuild);
  const practiceStatus = practiceBuildPresentation(practiceBuild);
  const [comments, setComments] = useState<any[]>([]);
  const [rankings, setRankings] = useState<any[]>([]);
  const [firstBlood, setFirstBlood] = useState<any>({ user: "", prifile_url: "", date: "" });
  const [ads, setAds] = useState<any[]>([]);
  const [linkCopied, setLinkCopied] = useState(false);
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      window.prompt("이 주소를 복사하세요", window.location.href);
    }
  };

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
  const [pollError,setPollError]=useState<RequestIssue|null>(null);
  const [pollStopped,setPollStopped]=useState(false);
  const pollStarted=useRef(0);
  const [answerIssue,setAnswerIssue]=useState<RequestIssue|null>(null);
  const [answerNotice,setAnswerNotice]=useState('');

  // [STATE] 그룹 추가 관련 상태
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [isFetchingGroups, setIsFetchingGroups] = useState(false);

  useEffect(() => {
    const fetchProfileImage = async () => {
      const token = problemToken();
      if (!token) return;

      setIsLoggedIn(true);

      try {
        const response = await fetch(problemApi("/api/profile/show"), {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          }
        });

        if (response.ok) {
          const result = await response.json();
          const userInfo = result?.data?.userInfo;

          // 서버에 저장된 실서버 S3 프로필 주소가 있다면 상태 동기화
          if (userInfo?.profileImgUrl) {
            setUserImgUrl(userInfo.profileImgUrl);
          }
          if (userInfo?.nickname) setMyNickname(userInfo.nickname);
        }
      } catch (error) {
        console.error("홈페이지 초기 데이터 로드 실패:", error);
      }
    };

    fetchProfileImage();
  }, []);

  const detailQuery=useRemoteData(probId, async signal => {
    const json=await requestJson(problemApi(`/api/problems/${probId}`),{signal,headers:authHeaders()});
    if(!json?.data)throw new Error('Missing problem');
    return json.data;
  });
  const rankQuery=useRemoteData(probId, async signal => {
    const json=await requestJson(problemApi(`/api/problems/${probId}/ranking?page=1`),{signal,headers:authHeaders()});
    return json?.data?.rankings ?? [];
  });
  useEffect(()=>{
    setProblemData(detailQuery.data);setIsOwner(!!detailQuery.data?.isOwner);setIsLoading(detailQuery.loading);
    if(detailQuery.data)fetchComments();
  },[detailQuery.data,detailQuery.loading]);
  useEffect(()=>{
    setRankings(rankQuery.data??[]);
    const first=rankQuery.data?.[0];
    setFirstBlood(first?{user:first.nickname,date:new Date(first.firstSolvedAt).toLocaleDateString('ko-KR',{month:'short',day:'numeric'})}:{user:'',date:''});
  },[rankQuery.data]);
  useEffect(()=>{setSubmissions([]);setSelectedChoices([]);setPollError(null);setPollStopped(false);pollStarted.current=0;},[probId]);

  useEffect(() => {
    if (isLoading || !probId || problemData?.type !== 'practice') return;
    setPracticeStatusError('');
    const manualRefresh = practiceStatusRetry !== practiceStatusRequested.current;
    practiceStatusRequested.current = practiceStatusRetry;
    if (practiceBuild.status !== 'PENDING' && !manualRefresh) return;
    return watchPracticeBuild({
      probId, token: problemToken(),
      onUpdate: state => {
        setPracticeStatusError('');
        setProblemData((previous: any) => ({ ...previous, practiceBuild: state }));
      },
      onError: setPracticeStatusError,
    });
  }, [probId, isLoading, problemData?.type, practiceBuild.status, practiceStatusRetry]);

  const boardQuery=useRemoteData(probId, async signal => {
    const json=await requestJson(problemApi(`/api/problems/${probId}/board?page=1&size=50`),{signal,headers:authHeaders()});
    if(!Array.isArray(json?.data?.submissions))throw new Error('Invalid board');
    return json.data.submissions as any[];
  });
  useEffect(()=>{
    if(!boardQuery.data){setSubmissions([]);setPollError(null);setPollStopped(false);pollStarted.current=0;return;}
    const items=boardQuery.data.map(item=>({...item,_isPending:isSubmissionPending(item)}));
    const pendingId=pendingSubmission(String(probId));
    if(pendingId){
      if(items.some(item=>String(item.submissionId)===pendingId))forgetSubmission(String(probId));
      else items.unshift({submissionId:pendingId,nickname:'내 제출',submissionStatus:'PENDING',progress:0,submittedAt:new Date().toISOString(),_isPending:true});
    }
    setSubmissions(items);
  },[boardQuery.data,probId]);
  const fetchSubmissions=()=>{setPollError(null);setPollStopped(false);pollStarted.current=0;boardQuery.retry();};
  useEffect(()=>{
    const pending=submissions.filter(sub=>sub._isPending);
    if(!pending.length||pollStopped||boardQuery.loading||boardQuery.error)return;
    if(!pollStarted.current)pollStarted.current=Date.now();
    if(Date.now()-pollStarted.current>=120000){setPollStopped(true);setPollError({kind:'timeout',message:'채점이 아직 끝나지 않아 자동 확인을 멈췄습니다. 잠시 후 다시 불러와 주세요.',retryable:true});return;}
    let active=true;const controller=new AbortController();
    const timer=setTimeout(async()=>{
      try{
        const results=await Promise.all(pending.map(async item=>{
          const json=await requestJson(problemApi(`/api/submissions/${item.submissionId}/status`),{signal:controller.signal,headers:authHeaders()});
          if(!json?.data)throw new Error('Missing status');
          return json.data;
        }));
        if(!active)return;
        setSubmissions(previous=>previous.map(sub=>{
          const update=results.find(r=>String(r.submissionId)===String(sub.submissionId));
          return update?{...sub,...update,_isPending:isSubmissionPending(update)}:sub;
        }));
        if(results.some(result=>!isSubmissionPending(result)))boardQuery.retry();
      }catch(error){if(active&&!isRequestCancelled(error)){setPollError(requestIssue(error));setPollStopped(true);}}
    },1500);
    return()=>{active=false;clearTimeout(timer);controller.abort();};
  },[submissions,pollStopped,boardQuery.loading,boardQuery.error]);

  // [API] 객관식 답안 제출
  const handleObjectiveSubmit = async () => {
    if (selectedChoices.length === 0) {
      setAnswerNotice("답안을 최소 하나 이상 선택해주세요.");
      return;
    }

    if(isSubmittingAnswer)return;
    setAnswerIssue(null);setAnswerNotice('');
    setIsSubmittingAnswer(true);
    const token = problemToken();
    if(!token){setAnswerIssue(httpIssue(401));setIsSubmittingAnswer(false);return;}
    try {
      const json = await requestJson(problemApi(`/api/submissions/grade`), {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          probId: Number(probId),
          answer: selectedChoices
        })
      });

      if(problemToken()!==token)return;
      {
        // 제출 API 명세서 기준 submissionId 추출
        const newSubmissionId = json.data.submissionId;

        setAnswerNotice("채점 요청이 접수되었습니다.");

        // 1. 보드 전체를 갱신하지 않고, 화면에 띄울 '임시 대기 항목'을 맨 위에 추가
        const pendingSub = {
          submissionId: newSubmissionId,
          nickname: localStorage.getItem("nickname") || "내 제출",
          submissionStatus: json.data.submissionStatus, // "PENDING"
          progress: 0,
          submittedAt: new Date().toISOString(),
          _isPending: true // 폴링 봇이 추적할 타겟이라는 표시!
        };

        setPollError(null);setPollStopped(false);pollStarted.current=0;
        setSubmissions(prev => [pendingSub, ...prev]);

        setActiveTab("grading");

      }
    } catch (error) {
      setAnswerIssue(requestIssue(error,true));
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  // [API] 댓글 목록 새로고침
  const fetchComments = async () => {
    const token = problemToken();
    const headers: HeadersInit = { "Authorization": `Bearer ${token}` };
    try {
      const res = await fetch(problemApi(`/api/problems/${probId}/comments`), { headers });
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

  // [API] 랭킹 불러오기
  const fetchRanking = async (page = 1) => {
    const token = problemToken();
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const res = await fetch(problemApi(`/api/problems/${probId}/ranking?page=${page}`), {
        method: "GET",
        headers
      });

      if (res.ok) {
        const json = await res.json();
        // 백엔드가 제공하는 데이터 패키지 바인딩
        setRankings(json.data.rankings || []);

        // 만약 첫 번째 해결자(First Blood)가 아직 화면에 매핑 안 되었다면 
        // 랭킹의 1등 정보를 활용해 실시간 연동 처리 가드 기입
        if (json.data.rankings && json.data.rankings.length > 0) {
          const first = json.data.rankings[0];
          setFirstBlood({
            user: first.nickname,
            date: new Date(first.firstSolvedAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })
          });
        }
      }
    } catch (error) {
      console.error("문제 랭킹 로드 실패:", error);
    }
  };

  // [API] 내 그룹 목록 불러오기 (모달 열기)
  const handleOpenGroupModal = async () => {
    setShowGroupModal(true);
    setIsFetchingGroups(true);
    const token = problemToken();

    try {
      const res = await fetch(problemApi(`/api/groups/me?problemId=${probId}`), {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        // API 구조에 맞춰 배열 설정 (보통 json.data 형태)
        setMyGroups(json.data || []);
      }
    } catch (e) {
      console.error("내 그룹 로드 실패:", e);
    } finally {
      setIsFetchingGroups(false);
    }
  };

  // [API] 선택한 그룹에 문제 추가하기
  const handleAddToGroup = async (targetGroupId: number) => {
    const token = problemToken();
    try {
      const res = await fetch(problemApi(`/api/groups/${targetGroupId}/problems`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ problemId: Number(probId) })
      });

      if (res.ok) {
        alert("문제가 그룹에 추가되었습니다.");
        setShowGroupModal(false); // 성공 시 모달 닫기
      } else if (res.status === 409) {
        alert("이미 그룹에 추가된 문제입니다.");
      } else {
        alert("그룹 추가에 실패했습니다.");
      }
    } catch (e) {
      console.error("그룹 추가 오류:", e);
      alert("서버와 통신 중 오류가 발생했습니다.");
    }
  };

  // 객관식 보기 선택 핸들러
  const handleChoiceToggle = (index: number) => {
    setSelectedChoices((prev) => {
      if (prev.includes(index)) {
        // 이미 선택된 보기를 다시 누르면 제거
        return prev.filter((i) => i !== index);
      } else {
        if (problemData?.selectionMode === 'single') return [index];
        if (problemData?.isSeqeuntialAnswer) {
          return [...prev, index];
        }
        // 순서 상관없는 일반 중복 마킹이라면 번호 순서대로 오름차순 정렬 킵
        return [...prev, index].sort((a, b) => a - b);
      }
    });
  };

  // [API] 문제 삭제 핸들러
  const handleDeleteProblem = async () => {
    if (!confirm("정말로 이 문제를 삭제하시겠습니까?\n삭제된 문제는 복구할 수 없습니다.")) return;

    const token = problemToken();
    try {
      const res = await fetch(problemApi(`/api/problems/${probId}`), {
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
    const token = problemToken();
    try {
      const res = await fetch(problemApi(`/api/problems/${probId}/comments/${comment.commentId}`), {
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

    const token = problemToken();
    try {
      // API 명세에 맞게 isPrivate 추가 및 parentId 선택적 할당
      const payload: any = { content, isPrivate: false };
      if (parentId) payload.parentId = parentId;

      const res = await fetch(problemApi(`/api/problems/${probId}/comments`), {
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

    const token = problemToken();
    try {
      const res = await fetch(problemApi(`/api/problems/${probId}/comments/${commentId}`), {
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

    const token = problemToken();
    try {
      const res = await fetch(problemApi(`/api/problems/${probId}/comments/${commentId}`), {
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
    const token = problemToken();
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  // 로그아웃 핸들러
  const handleLogout = () => {
    if (!logout()) return;
    setIsLoggedIn(false);
    window.location.reload(); // 상태 초기화를 위해 새로고침
  };

  // 티어 명칭에 따라 배경/글자/테두리 색상 클래스를 리턴하는 함수
  const getTierColor = (tier: number | null | undefined) => {
    const tierName = submissionTierLabel(tier);

    switch (tierName) {
      case "Challenger":
        return "bg-danger/15 text-danger border-danger/30";
      case "Master":
        return "bg-coral/10 text-coral border-coral/30";
      case "Diamond":
        return "bg-primary/10 text-primary border-primary/30";
      case "Platinum":
        return "bg-success/10 text-success border-success/30";
      case "Gold":
        return "bg-warning/10 text-warning border-warning/30";
      case "Silver":
        return "bg-raised text-ink-muted border-line";
      case "Bronze":
      default:
        return "bg-canvas text-ink-muted border-line";
    }
  };

  if(!probId)return <main className="p-8"><RequestError issue={httpIssue(404)}/></main>;
  if(detailQuery.loading&&!problemData)return <main role="status" className="p-8">문제를 불러오는 중…</main>;
  if(detailQuery.error&&!problemData)return <main className="mx-auto max-w-3xl p-8"><h1 className="text-xl font-bold">문제 조회</h1><RequestError issue={detailQuery.error} retry={detailQuery.retry} busy={detailQuery.loading}/></main>;

  return (
    <div className="min-h-screen bg-panel text-ink font-sans">

      <Header
        isLoggedIn={isLoggedIn}
        userImgUrl={userImgUrl}
        activeMenu="challenge"
        showSearch={false}
        onLogout={async () => {
          if (!logout()) return;
          setIsLoggedIn(false);
          window.location.replace("/");
        }}
      />

      {/* 2. 메인 레이아웃 (Grid 12분할) */}
      <main className="dv-shell dv-shell--wide pt-6 grid grid-cols-1 md:grid-cols-12 gap-6 pb-12">

        {/* [A] 좌측 정보 패널 (2칸) */}
        <aside className="col-span-12 md:col-span-2 space-y-4 order-last md:order-none">

          {/* First Blood 패널 */}
          <Card className="shadow-none border-line overflow-hidden">
            <CardHeader className="pb-2 bg-raised/50">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-ink">
                <Flame className="h-4 w-4 text-danger" /> First Blood
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {firstBlood ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="h-10 w-10 rounded-full bg-line flex items-center justify-center overflow-hidden border border-line">
                        <span className="text-xs font-bold text-ink-muted">
                          {firstBlood.user?.[0]}
                        </span>
                      </div>
                      <div className="absolute -bottom-1 -right-1 bg-danger rounded-full p-0.5 border-2 border-panel">
                        <Flame className="h-2 w-2 text-white" />
                      </div>
                    </div>
                    <span className="font-semibold text-sm text-ink leading-none mb-1">
                      {firstBlood.user}
                    </span>
                  </div>
                  <span className="text-xs text-ink-subtle font-medium tracking-tight">
                    {firstBlood.date}
                  </span>
                </div>
              ) : (
                <div className="py-4 text-center">
                  <p className="text-xs text-ink-subtle italic">아직 문제를 해결한 유저가 없습니다.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top 3 랭킹 패널 */}
          {problemData?.type !== "objective" && (
            <Card className="shadow-none border-line">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-warning" /> Top 3 명예의 전당
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {rankings.slice(0, 3).map((ranker) => (
                  <div key={ranker.userId} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="h-5 w-5 flex items-center justify-center p-0 rounded-full font-black text-xs">
                        {ranker.rank}
                      </Badge>
                      <span className="font-semibold text-ink">{ranker.nickname}</span>
                    </div>
                    {ranker.language ? (
                      <Badge variant="outline" className="text-xs uppercase font-mono px-1.5 h-4 border-line text-ink-subtle">
                        {ranker.language}
                      </Badge>
                    ) : (
                      <span className="text-ink-subtle text-xs font-medium">
                        {new Date(ranker.firstSolvedAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                ))}
                {rankings.length === 0 && (
                  <p className="text-xs text-ink-subtle text-center py-2">랭킹 정보가 없습니다.</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recent 댓글 패널 */}
          <Card className="shadow-none border-line">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" /> Recent
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {comments.slice(0, 5).map((comment) => (
                <div key={comment.commentId} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink">{comment.authorNickname}</span>
                    <span className="text-xs text-ink-subtle">
                      {formatTime(comment.createdAt, true)}
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted line-clamp-2">{comment.content}</p>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-xs text-ink-subtle text-center py-2">최근 댓글이 없습니다.</p>
              )}
            </CardContent>
          </Card>

        </aside>

        {/* [B] 중앙 콘텐츠 영역 (6칸) */}
        <section className="col-span-12 md:col-span-10 xl:col-span-8 space-y-6">

          {/* 탭 컨트롤러 */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-raised p-1 rounded-lg sticky top-16 z-40">
              <TabsTrigger value="problem">문제</TabsTrigger>
              <TabsTrigger value="grading">채점</TabsTrigger>
              <TabsTrigger value="rank">순위</TabsTrigger>
              <TabsTrigger value="comments">댓글</TabsTrigger>
            </TabsList>

            {/* 1. 문제 탭 */}
            <TabsContent value="problem" className="mt-6 space-y-6 animate-in fade-in-50 duration-300">
              <RequestError issue={answerIssue} checkHref={`/challenges/detail?id=${probId}&tab=grading`}/>
              {answerNotice&&<p role="status">{answerNotice}</p>}
              <div className="flex gap-6 items-start">
                <div className="w-24 h-24 bg-deep rounded-2xl grid place-items-center shrink-0 border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/divo.webp" alt="" className="w-16 h-auto" />
                </div>
                <div className="space-y-2 min-w-0">
                  <ProblemTags difficulty={problemData?.difficulty} type={problemData?.type} category={problemData?.category} />
                  <h1 className="text-2xl font-bold text-ink">
                    {isLoading ? "불러오는 중..." : problemData?.title}
                  </h1>
                  <p className="text-sm text-ink-muted leading-relaxed whitespace-pre-wrap">
                    {isLoading ? "" : problemData?.summary || "문제 요약이 없습니다."}
                  </p>
                </div>
              </div>

              {problemData?.type === 'practice' && <div className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-line dark:bg-panel dark:text-ink" aria-label="실습 환경 제작 상태">
                <p className="font-bold text-sm" role="status" aria-live="polite">{practiceStatus.label}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-ink-muted">{practiceStatus.message}</p>
                {practiceStatusError && <p className="mt-2 text-sm text-amber-700 dark:text-warning" role="alert">{practiceStatusError}</p>}
                {(practiceStatusError || practiceBuild.status === 'FAILED' || practiceBuild.status === 'UNAVAILABLE') &&
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setPracticeStatusRetry(value => value + 1)}>다시 확인</Button>}
              </div>}

              <div className="flex flex-wrap items-center justify-between gap-2 w-full">
                {/* 왼쪽 버튼 그룹 (제출, 공유) */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* 문제 유형에 따른 동작 버튼 변경 */}
                  {problemData?.type === "coding" ? (
                    <Link href={`/challenges/editor?id=${probId}`}>
                      <Button className="bg-primary hover:bg-primary-hover shadow-md shadow-black/40 font-bold">
                        코드 제출하기
                      </Button>
                    </Link>
                  ) : problemData?.type === "objective" ? (
                    <Button
                      className="bg-primary hover:bg-primary-hover text-primary-ink font-bold disabled:bg-raised disabled:text-ink-subtle disabled:opacity-100"
                      onClick={handleObjectiveSubmit}
                      disabled={isSubmittingAnswer || selectedChoices.length === 0} // 선택된 게 없으면 비활성화
                    >
                      {isSubmittingAnswer ? "제출 중..." : "답안 제출하기"}
                    </Button>
                  ) : problemData?.type === "practice" ? (
                    practiceBuild.canStart && !practiceStatusError ? <Link href={`/challenges/terminal?id=${probId}`}>
                      <Button className="bg-success hover:bg-success/85 text-primary-ink font-bold shadow-md shadow-black/40">
                        실습 환경 켜기
                      </Button>
                    </Link> : <Button disabled className="bg-success text-primary-ink font-bold">실습 환경 켜기</Button>
                  ) : (
                    <Button className="bg-raised hover:bg-line">답안 제출하기</Button> // Fallback
                  )}

                  {problemData?.visibility === "public" && (
                    <Button
                      variant="outline"
                      className="border-primary/30 text-primary hover:bg-primary/10 font-bold"
                      onClick={handleOpenGroupModal}
                    >
                      <Users className="h-4 w-4 mr-1.5" /> 그룹에 공유
                    </Button>
                  )}

                  <Button variant="outline" size="icon" onClick={handleCopyLink} aria-label="문제 링크 복사">
                    <Share2 className="h-4 w-4" />
                  </Button>
                  {linkCopied && <span role="status" className="text-sm text-success">링크를 복사했어요</span>}
                </div>

                {/* 오른쪽 버튼 그룹 (작성자일 때만 노출) */}
                {isOwner && (
                  <div className="flex flex-wrap gap-2">
                    {/* 문제 수정 버튼 */}
                    <Button
                      variant="outline"
                      className="border-primary/20 text-primary hover:bg-primary/10 shadow-none"
                      onClick={() => {
                        window.location.href = `/challenges/create?id=${probId}`;
                      }}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      문제 수정
                    </Button>
                    <Button
                      variant="default"
                      className="bg-danger/10 text-danger hover:bg-danger/20 hover:text-danger border-danger/20 shadow-none"
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
                <p className="text-ink whitespace-pre-wrap">
                  {problemData?.description}
                </p>

                {/* 객관식 보기 동적 렌더링 (순서 일치 문제는 누른 순서 번호를 보여 준다) */}
                {problemData?.type === "objective" && problemData?.choices && (
                  <ChoiceList choices={problemData.choices} selected={selectedChoices} ordered={!!problemData?.isSeqeuntialAnswer} onToggle={handleChoiceToggle} />
                )}

                {/* 코딩형 입출력 예시 동적 렌더링 */}
                {problemData?.type==='coding'&&<CodingRules contract={problemData.oboContract} inputDescription={problemData.inputDescription} outputDescription={problemData.outputDescription} allowedLanguages={problemData.constraints?.allowedLanguages}/>}
                {problemData?.type === "coding" && <SampleCases cases={problemData?.testcases ?? []} />}
              </div>

              {/* OBO 시각화 플레이어 */}
              {problemData?.oboJson && (
                <OboPlayerSection
                  oboData={problemData.oboJson}
                  selectedChoiceIndex={selectedChoices.length > 0 ? selectedChoices[selectedChoices.length - 1] : null}
                />
              )}

              {/* 실습형(CTF) VM 환경 동적 렌더링 */}
              {problemData?.type === "practice" && (
                <div className="mt-8 p-6 bg-deep rounded-2xl space-y-6 shadow-lg border border-line">

                  {/* 상단 헤더 및 OS 이미지 정보 */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-success fill-success" /> VM 실습 환경
                    </h3>
                    <Badge variant="outline" className="text-ink-subtle border-line font-mono text-xs bg-raised">
                      OS: {problemData?.vm_info?.os_image || "ubuntu:latest"}
                    </Badge>
                  </div>

                  {/* 허용된 명령어 목록 (안전하게 배열 체크) */}
                  {Array.isArray(problemData?.vm_info?.allowed_commands) && problemData.vm_info.allowed_commands.length > 0 && (
                    <div className="bg-deep border border-line p-4 rounded-xl">
                      <span className="text-xs font-bold text-ink-muted mb-2 block uppercase tracking-widest">
                        Allowed Commands
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {problemData.vm_info.allowed_commands.map((cmd: string, idx: number) => (
                          <code key={idx} className="bg-raised text-success px-2 py-1 rounded text-xs font-mono border border-line">
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
              <RequestError issue={boardQuery.error??pollError} retry={fetchSubmissions} busy={boardQuery.loading} stale={submissions.length>0}/>
              {boardQuery.loading&&<p role="status">제출 내역을 불러오는 중…</p>}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">제출 현황</h2>
                <Button
                  variant={showMySubmissions ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowMySubmissions(!showMySubmissions)}
                  className={`rounded-xl font-bold ${showMySubmissions ? "bg-raised border border-line-strong text-white" : "text-ink-muted"}`}
                >
                  내 제출만 보기
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-canvas">
                    <TableRow>
                      <TableHead className="w-[100px]">제출 번호</TableHead>
                      <TableHead>닉네임</TableHead>
                      <TableHead className="w-[80px]">티어</TableHead>
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
                        const verdict = submissionVerdict(sub);
                        const isPending = verdict.kind === "pending";
                        const isSuccess = verdict.kind === "correct";
                        const isFailed = verdict.kind === "failed";
                        const resultText = isPending ? `${verdict.label} (${sub.progress || 0}%)` : verdict.label;

                        return (
                          <TableRow
                            key={sub.submissionId}
                            // 행 전체 클릭(onClick) 제거 (버튼을 따로 둘 것이므로 오작동 방지)
                            className="hover:bg-raised/60 transition-colors"
                          >
                            <TableCell className="font-mono text-xs">{sub.submissionId}</TableCell>
                            <TableCell className="font-bold text-ink">{sub.nickname || "User"}</TableCell>

                            {/* 티어 표시 컬럼 */}
                            <TableCell>
                              <TierBadge tier={sub.userTier} size="sm" showRank={false} />
                            </TableCell>

                            {/* 결과 배지 컬럼 */}
                            <TableCell>
                              {isPending ? (
                                <div className="flex flex-col gap-1">
                                  <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10 w-fit">
                                    <div className="w-3 h-3 mr-1 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                    {resultText}
                                  </Badge>
                                  {sub.progress !== undefined && (
                                    <div className="w-24 h-1 bg-raised rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-primary transition-all duration-500"
                                        style={{ width: `${sub.progress}%` }}
                                      />
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  {/* 판정 코드 라벨 + 문구 (디자인 시스템 Verdict 축약형) */}
                                  <span className="inline-flex items-center gap-2">
                                    <span
                                      className={`min-w-[40px] text-center px-1.5 py-1 rounded-md font-mono text-xs font-bold tracking-[0.08em] ${
                                        isSuccess ? "bg-success-soft text-success" : verdict.kind === "wrong" ? "bg-danger-soft text-danger" : verdict.kind === "error" ? "bg-warning-soft text-warning" : "bg-raised text-ink-muted"
                                      }`}
                                    >
                                      {isSuccess ? "AC" : verdict.kind === "wrong" ? "WA" : verdict.kind === "error" ? "ERR" : "?"}
                                    </span>
                                    <span className={`text-xs font-semibold ${isSuccess ? "text-success" : verdict.kind === "wrong" ? "text-danger" : verdict.kind === "error" ? "text-warning" : "text-ink-muted"}`}>
                                      {isSuccess ? "도달" : verdict.kind === "wrong" ? "산소 부족" : resultText}
                                    </span>
                                  </span>
                                  {verdict.hint && <p className="text-xs text-ink-muted">{verdict.hint}</p>}
                                </div>
                              )}
                            </TableCell>

                            {/* 코딩 문제 전용 데이터 */}
                            {isCoding && (
                              <>
                                <TableCell className="text-xs text-ink-muted">{!isPending && sub.memoryUsage != null ? `${sub.memoryUsage} MB` : "-"}</TableCell>
                                <TableCell className="text-xs text-ink-muted">{!isPending && sub.runtime != null ? `${sub.runtime} ms` : "-"}</TableCell>
                                <TableCell className="text-xs font-bold text-ink-muted">{!isPending ? (sub.language || "-") : "-"}</TableCell>
                              </>
                            )}

                            {/* 실습 문제 전용 데이터 */}
                            {problemData?.type === "practice" && (
                              <TableCell className="text-xs text-ink-subtle">-</TableCell>
                            )}

                            {/* 제출 시간 */}
                            <TableCell className="text-right text-xs text-ink-subtle">
                              {formatTime(sub.submittedAt, false)}
                            </TableCell>

                            {/* 상세 보기 액션 버튼 컬럼 */}
                            <TableCell className="text-center">
                              {/* 1. 객관식: OBO 페이지로 이동 */}
                              {problemData?.type === "objective" && !isPending && (
                                <Button variant="outline" size="sm" className="h-7 text-xs font-bold text-ink-muted" asChild>
                                  <Link href={`/challenges/obo?id=${sub.submissionId}`}>결과 확인</Link>
                                </Button>
                              )}

                              {/* 2. 코딩: 코드 보기 / OBO 보기 2가지 버튼 제공 */}
                              {problemData?.type === "coding" && !isPending && !isFailed && (
                                <div className="flex justify-center gap-1.5">
                                  <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs font-bold text-ink-muted" asChild>
                                    <Link href={`/challenges/submissions?id=${sub.submissionId}`}>코드</Link>
                                  </Button>
                                  {sub.hasObo === true && <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs font-bold border-primary/30 text-primary hover:bg-primary/10" asChild>
                                    <Link href={`/challenges/obo?id=${sub.submissionId}`}>OBO</Link>
                                  </Button>}
                                </div>
                              )}

                              {/* 3. 실습: 버튼 없음 (또는 채점 중일 때 대기 상태 표시) */}
                              {(problemData?.type === "practice" || isPending || isFailed) && (
                                <span className="text-xs text-ink-subtle">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}

                    {submissions.length === 0 && !boardQuery.loading && !boardQuery.error && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-ink-subtle">
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
              <RequestError issue={rankQuery.error} retry={rankQuery.retry} busy={rankQuery.loading}/>
              <h2 className="text-lg font-bold mb-4">전체 랭킹 (실시간 제출 완료 순)</h2>
              <div className="border rounded-lg overflow-hidden bg-panel shadow-sm">
                <Table>
                  <TableHeader className="bg-canvas">
                    <TableRow>
                      <TableHead className="w-[80px] text-center font-bold">순위</TableHead>
                      <TableHead className="font-bold">사용자</TableHead>
                      <TableHead className="w-[80px] text-center font-bold">티어</TableHead>
                      {problemData?.type === "coding" && <TableHead className="w-[120px] text-center font-bold">사용 언어</TableHead>}
                      <TableHead className="text-right pr-6 font-bold">최초 해결 일시</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rankings.map((rank) => (
                      <TableRow key={rank.userId} className="hover:bg-raised/50 transition-colors">
                        <TableCell className="text-center font-black text-ink-subtle">{rank.rank}위</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-7 w-7 border border-line">
                              {/* 백엔드 규칙에 맞게 확장자 떼고 쿼리스트링 매핑 우회 적용 */}
                              <AvatarImage
                                src={`https://d3ghudecvdi62z.cloudfront.net/profiles/users/${rank.userId}?v=${Date.now()}`}
                                className="object-cover"
                              />
                              <AvatarFallback className="bg-raised text-xs text-ink-muted font-bold">
                                {rank.nickname[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-bold text-ink">{rank.nickname}</span>
                          </div>
                        </TableCell>

                        {/* 티어 표시 컬럼 */}
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={`font-mono text-xs font-bold border ${getTierColor(rank.userTier)}`}
                          >
                            {submissionTierLabel(rank.userTier)}
                          </Badge>
                        </TableCell>

                        {/* 코딩 문제일 경우에만 해당 언어 노출 가드 기입 */}
                        {problemData?.type === "coding" && (
                          <TableCell className="text-center">
                            {rank.language ? (
                              <Badge variant="secondary" className="bg-raised hover:bg-line text-ink font-mono text-xs uppercase px-2 py-0.5 rounded-md">
                                {rank.language}
                              </Badge>
                            ) : (
                              <span className="text-ink-subtle">-</span>
                            )}
                          </TableCell>
                        )}

                        <TableCell className="text-right text-xs text-ink-muted font-mono pr-6">
                          {/* 백엔드가 제공하는 firstSolvedAt 파싱 적용 */}
                          {new Date(rank.firstSolvedAt).toLocaleString("ko-KR", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit"
                          })}
                        </TableCell>
                      </TableRow>
                    ))}

                    {rankings.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={problemData?.type === "coding" ? 4 : 3} className="text-center py-12 text-ink-subtle text-sm font-medium">
                          이 문제를 해결한 사용자가 아직 없습니다. 최초의 정답자가 되어보세요! 🚀
                        </TableCell>
                      </TableRow>
                    )}
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
                        className="flex gap-4 p-4 border rounded-xl bg-panel hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group"
                      >
                        <AuthorAvatar nickname={comment.authorNickname} src={commentAvatar(comment)} className="h-10 w-10" />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-ink">{comment.authorNickname}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-ink-subtle flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {formatTime(comment.createdAt, false)}
                              </span>
                              {/* 수정·삭제 버튼: 내 댓글에만 (닉네임은 서버에서 중복 불가) */}
                              {isMyComment(comment) && <>
                              <button aria-label="댓글 수정"
                                onClick={(e) => { e.stopPropagation(); setEditingCommentId(comment.commentId); setEditContent(comment.content); }}
                                className="text-ink-subtle hover:text-primary transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button aria-label="댓글 삭제"
                                onClick={(e) => handleDeleteComment(e, comment.commentId)}
                                className="text-ink-subtle hover:text-danger transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              </>}
                            </div>
                          </div>

                          {/* 내용 표시 or 수정 모드 입력창 */}
                          {editingCommentId === comment.commentId ? (
                            <div className="space-y-2 mt-2" onClick={(e) => e.stopPropagation()}>
                              <Textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="resize-none text-sm min-h-[60px] bg-canvas"
                              />
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="ghost" onClick={() => setEditingCommentId(null)}>취소</Button>
                                <Button size="sm" onClick={(e) => handleUpdateComment(e, comment.commentId, false)}>저장</Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-ink-muted line-clamp-2">{comment.content}</p>
                          )}

                          <div className="pt-2 flex items-center gap-2 text-xs font-bold transition-colors">
                            <div className="flex items-center gap-1 text-ink-subtle group-hover:text-primary">
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>답글 보기 / 달기</span>
                            </div>
                            {/* <span className="text-ink-subtle">|</span>
                            <span className="text-ink-muted group-hover:text-primary transition-colors">상세 보기</span> */}
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
                    className="mb-2 -ml-4 text-ink-muted hover:text-ink"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    목록으로 돌아가기
                  </Button>

                  {/* 선택된 메인 댓글 (크게 표시) */}
                  <div className="flex gap-4 p-6 border-2 border-primary/20 rounded-2xl bg-primary/6 shadow-sm">
                    <AuthorAvatar nickname={selectedComment.authorNickname} src={commentAvatar(selectedComment)} className="h-12 w-12" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-base text-ink">{selectedComment.authorNickname}</span>
                        <span className="text-xs font-medium text-ink-subtle">
                          {formatTime(selectedComment.createdAt, false)}
                        </span>
                      </div>
                      <p className="text-base text-ink leading-relaxed">{selectedComment.content}</p>
                    </div>
                  </div>

                  <Separator />

                  {/* 대댓글 작성창 */}
                  <div className="flex gap-3 items-start">
                    <Textarea
                      value={replyInput}
                      onChange={(e) => setReplyInput(e.target.value)}
                      placeholder={`${selectedComment.authorNickname}님에게 답글 남기기...`}
                      className="resize-none min-h-[80px] bg-canvas focus:bg-raised"
                    />
                    <Button
                      onClick={() => handleCreateComment(selectedComment.commentId)}
                      className="shrink-0 h-[80px]"
                    >
                      답글<br />등록
                    </Button>
                  </div>

                  {/* 대댓글 목록 */}
                  <div className="space-y-3 pl-6 border-l-2 border-line ml-6">
                    {selectedComment.replies && selectedComment.replies.map((reply: any) => (
                      <div key={reply.commentId} className="flex gap-3 p-4 border rounded-xl bg-panel group">
                        <AuthorAvatar nickname={reply.authorNickname} src={commentAvatar(reply)} className="h-8 w-8" />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-ink">{reply.authorNickname}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-ink-subtle">
                                {formatTime(reply.createdAt, false)}
                              </span>
                              {/* 대댓글 수정·삭제 버튼: 내 답글에만 */}
                              {isMyComment(reply) && <>
                              <button aria-label="답글 수정"
                                onClick={() => { setEditingCommentId(reply.commentId); setEditContent(reply.content); }}
                                className="text-ink-subtle hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button aria-label="답글 삭제"
                                onClick={(e) => handleDeleteComment(e, reply.commentId, true)}
                                className="text-ink-subtle hover:text-danger transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                              </>}
                            </div>
                          </div>

                          {/* 대댓글 내용 표시 or 수정 모드 */}
                          {editingCommentId === reply.commentId ? (
                            <div className="space-y-2 mt-2">
                              <Textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="resize-none text-xs min-h-[60px] bg-canvas"
                              />
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="ghost" onClick={() => setEditingCommentId(null)}>취소</Button>
                                <Button size="sm" onClick={(e) => handleUpdateComment(e, reply.commentId, true)}>저장</Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-ink-muted">{reply.content}</p>
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

        {/* [C] 우측 광고 칸 — 광고가 있을 때만 그림 (1280px 이상) */}
        <aside className="hidden xl:block xl:col-span-2">
          <AdSlot ads={ads} />
        </aside>

        {showGroupModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
              <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                <CardTitle className="text-lg">내 그룹에 추가하기</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowGroupModal(false)}>
                  <XCircle className="w-5 h-5 text-ink-muted" />
                </Button>
              </CardHeader>
              <CardContent className="pt-4 max-h-[50vh] overflow-y-auto">
                {isFetchingGroups ? (
                  <div className="py-8 text-center text-ink-subtle text-sm animate-pulse">
                    가입된 그룹을 불러오는 중입니다...
                  </div>
                ) : myGroups.length === 0 ? (
                  <div className="py-8 text-center text-ink-subtle text-sm">
                    가입된 그룹이 없습니다.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {myGroups.map((group) => (
                      <div key={group.groupId} className="flex justify-between items-center p-3 border border-line rounded-xl hover:bg-raised/60 hover:border-primary/20 transition-colors">
                        <span className="font-bold text-sm text-ink">{group.title}</span>

                        <Button
                          size="sm"
                          disabled={group.alreadyAdded}
                          className={group.alreadyAdded ? "bg-raised text-ink-subtle border border-line" : "bg-primary hover:bg-primary-hover text-primary-ink"}
                          onClick={() => handleAddToGroup(group.groupId)}
                        >
                          {group.alreadyAdded ? "추가됨" : "추가"}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

// 2. 헤더 메뉴 전용 보조 컴포넌트
function NavMenuLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-ink-muted hover:text-ink hover:bg-raised/60 transition-all active:scale-95"
    >
      <span className="text-ink-subtle group-hover:text-ink">{icon}</span>
      {label}
    </Link>
  );
}

export default function ProblemDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    }>
      <ProblemDetailContent />
    </Suspense>
  );
}

function formatTime(serverTime: string, onlyDate: boolean) {
  const date = new Date(serverTime);

  // 한국 시간대 기준(KST) 시차 반영을 위한 꼼수 포맷팅
  const offset = date.getTimezoneOffset() * 60000;
  const localIso = new Date(date.getTime() - offset).toISOString();

  // localIso는 "2026-06-04T13:10:24.168Z" 형태가 됩니다.
  const datePart = localIso.split('T')[0];          // "2026-06-04"
  const timePart = localIso.split('T')[1].slice(0, 8); // "13:10:24"

  if (onlyDate) return `${datePart}`;
  else return `${datePart} ${timePart}`;
}
