"use client";

import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
	Search, Settings, LogOut, User, Menu, MessageSquare, Bell, Share2,
	CheckCircle2, XCircle, Clock, LayoutGrid, Users, BarChart3, Trophy, ShoppingBag, Trash2,
	ChevronLeft, MessageCircle, Edit2, Flame, Zap, Flag
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


function ProblemDetailContent() {
	const router = useRouter();

	// API 연동 스위치
	const USE_API_REQUEST = true;

	// URL에서 가져온 값 상태
	const searchParams = useSearchParams();
	const probId = searchParams.get('probId');
	const contestProbId = searchParams.get('contestProblemId');
	const contestId = searchParams.get('contestId');

	// 페이지 상태
	const [isLoggedIn, setIsLoggedIn] = useState(false);
	const [showMySubmissions, setShowMySubmissions] = useState(false);

	// API 연동용 상태
	const [problemData, setProblemData] = useState<any>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [firstBlood, setFirstBlood] = useState<any>({ user: "", prifile_url: "", date: "" });
	const [ads, setAds] = useState<any[]>([]);

	// 객관식 문제 관련 상태
	const [selectedChoices, setSelectedChoices] = useState<number[]>([]);
	const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);

	// 채점 데이터 상태
	const [submissions, setSubmissions] = useState<any[]>([]);
	const [isGradingInProgress, setIsGradingInProgress] = useState(false);

	// [API] 데이터 초기 로드
	useEffect(() => {
		const fetchPageData = async () => {
			setIsLoading(true); // 로딩 시작

			const token = localStorage.getItem("token");
			const headers: HeadersInit = { "Content-Type": "application/json" };
			if (token) headers["Authorization"] = `Bearer ${token}`;

			try {
				// 문제 상세 조회, 랭킹, 광고를 병렬로 호출
				const [probRes] = await Promise.all([
					fetch(`https://diveon.net/api/problems/${probId}`, { headers }),
					// fetch(`https://diveon.net/api/problems/${probId}/rank?page=0&size=100`, { headers }),
					// fetch("https://diveon.net/api/ad/?placement=prob_detail")
				]);

				if (probRes.ok) {
					const probJson = await probRes.json();
					setProblemData(probJson.data);
				}

				// if (rankRes.ok) {
				//   const rankJson = await rankRes.json();
				//   if (rankJson.status === 200) setRankings(rankJson.data.rankings);
				// }

				// if (adRes.ok) {
				//   const adJson = await adRes.json();
				//   if (adJson.ads) setAds(adJson.ads);
				//   else if (adJson.data?.ads) setAds(adJson.data.ads);
				// }

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

      // 아직 채점 중인 항목들만 모아서 상태값 병렬 병합 조회
      const results = await Promise.all(
        pendingItems.map(async (item) => {
          try {
            const res = await fetch(`https://diveon.net/api/contests/${contestId}/submissions/${item.submissionId}/status`, {
              headers: { "Authorization": `Bearer ${token}` }
            });
            
            if (res.ok) {
              const json = await res.json();
              return json.data; // 명세서 상의 data 객체 반환 (submissionStatus, progress 인입)
            }
          } catch (e) {
            console.error("폴링 조회 실패:", e);
          }
          return null;
        })
      );

      // 브라우저 내부 submissions 상태값을 서버 최신 데이터로 동기화 가공
      setSubmissions((prev) =>
        prev.map((sub) => {
          if (!sub._isPending) return sub;

          // 현재 순회 중인 제출 건에 매칭되는 최신 백엔드 결과물 탐색
          const updatedData = results.find((r) => r && String(r.submissionId) === String(sub.submissionId));

          if (updatedData) {
            if (updatedData.submissionStatus === "COMPLETED" || updatedData.submissionStatus === "FAILED") {
              needsBoardRefresh = true; // 채점 완료 시 전체 리스트 새로고침 플래그 On
              
              return { 
                ...sub, 
                progress: 100, 
                submissionStatus: updatedData.submissionStatus,
                isCorrect: updatedData.isCorrect, // 정답 여부 주입
                _isPending: false
              };
            }
            // 아직 PENDING / JUDGING인 경우 진행률(progress)만 계속 실시간 업데이트
            return { 
              ...sub, 
              progress: updatedData.progress ?? 0, 
              submissionStatus: updatedData.submissionStatus 
            };
          }
          return sub;
        })
      );

      // 하나라도 채점 완료(COMPLETED) 신호가 수신되었다면 히스토리 보드 전면 새로고침
      if (needsBoardRefresh) {
        fetchSubmissions();
      }

    }, 1500); // 1.5초 주기 무한 루프 틱 가동

    return () => clearTimeout(timer);
  }, [submissions, contestId]); // contestId 의존성 체인 추가

	// [API] 객관식 답안 제출
  const handleObjectiveSubmit = async () => {
    if (selectedChoices.length === 0) {
      alert("답안을 최소 하나 이상 선택해주세요.");
      return;
    }

    if (!contestId || contestId === "null") {
      alert("대회 식별 정보가 올바르지 않습니다. 대시보드에서 문제를 다시 클릭해주세요.");
      return;
    }

    setIsSubmittingAnswer(true);
    const token = localStorage.getItem("token");
    const finalAnswer = selectedChoices[0]?.toString() || "";

    try {
      const res = await fetch(`https://diveon.net/api/contests/${contestId}/problems/${contestProbId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          submissionType: "OBJECTIVE",
          answer: finalAnswer
        })
      });

      if (res.ok) {
        // const json = await res.json();
				alert("정답을 제출하였습니다.");
      } else if (res.status === 429) {
        alert("제출 쿨다운 제한 시간(30초)이 걸려있습니다. 잠시 후 다시 시도해 주세요.");
      } else {
        const err = await res.json();
        alert(`제출 실패: ${err.message || "오류가 발생했습니다."}`);
      }
    } catch (e: any) {
      console.error("프론트엔드 파싱/자바스크립트 에러 디버깅:", e);
      alert("응답 데이터를 처리하는 중 오류가 발생했습니다. 개발자 도구 콘솔을 확인하세요.");
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

	// 객관식 보기 선택 핸들러
	const handleChoiceToggle = (index: number) => {
		setSelectedChoices(prev =>
			prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
		);
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
						<NavMenuLink href="/challenges" icon={<Flag size={18} />} label="챌린지" />
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
					<Button
						variant="outline"
						className="w-full justify-start border-slate-200 text-slate-600 hover:bg-slate-50 font-bold h-11 rounded-xl"
						onClick={() => router.push(`/contests/detail?id=${contestId}`)}
					>
						<ChevronLeft size={16} className="mr-2" /> 대회로 돌아가기
					</Button>

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

					{/* 배점 표시 패널 */}
					<Card className="shadow-none border-slate-200 rounded-xl">
						<CardContent className="p-4 flex justify-between items-center text-sm font-bold">
							<span className="text-slate-500">배점</span>
							<span className="text-indigo-600 text-lg font-black">{problemData?.points} pts</span>
						</CardContent>
					</Card>


				</aside>

				{/* [B] 중앙 콘텐츠 영역 (6칸) */}
				<section className="col-span-12 md:col-span-8 space-y-6">

					{/* 탭 컨트롤러 */}
					<Tabs defaultValue="problem" className="w-full">
						<TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1 rounded-lg sticky top-16 z-40">
							<TabsTrigger value="problem">문제</TabsTrigger>
							<TabsTrigger value="grading">채점</TabsTrigger>
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
										<Link href={`/contests/editor?probId=${probId}&contestProblemId=${contestProbId}&contestId=${contestId}`}>
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
										<Link href={`/contests/terminal?probId=${probId}&contestProblemId=${contestProbId}&contestId=${contestId}`}>
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
									<div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
										{/* 입력 예시 */}
										<div>
											<span className="text-xs font-bold text-slate-500 mb-1 block">&lt;입력 예시&gt;</span>
											<pre className="bg-slate-50 border border-slate-200 p-4 rounded-lg font-mono text-sm text-slate-800 leading-6 whitespace-pre-wrap min-h-[100px]">
												{problemData.testcases[0].input.replace(/\\n/g, "\n")}
											</pre>
										</div>

										{/* 출력 예시 */}
										<div>
											<span className="text-xs font-bold text-slate-500 mb-1 block">&lt;출력 예시&gt;</span>
											<pre className="bg-slate-50 border border-slate-200 p-4 rounded-lg font-mono text-sm text-slate-800 leading-6 whitespace-pre-wrap min-h-[100px]">
												{problemData.testcases[0].output.replace(/\\n/g, "\n")}
											</pre>
										</div>
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
												<TableCell
													colSpan={problemData?.type === "coding" ? 7 : 5}
													className="text-center py-8 text-slate-400 text-sm italic"
												>
													아직 제출된 답안이 없습니다.
												</TableCell>
											</TableRow>
										)}
									</TableBody>
								</Table>
							</div>
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