"use client";
import { logout } from "@/lib/authSession";
import { CodingRules } from '@/components/obo/simulation/CodingRules';
import { ProblemTags } from "@/components/problem/ProblemTags";
import { ChoiceList } from "@/components/problem/ChoiceList";
import { SampleCases } from "@/components/problem/SampleCases";

import Link from "next/link";
import { submissionVerdict } from "@/lib/submission-status";
import { watchContestBoard, contestCodingLinks, type ContestSubmission } from "@/lib/contest-submissions";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Settings, User, MessageSquare, Share2, CheckCircle2, XCircle, Clock, Trash2, ChevronLeft, MessageCircle, Edit2, Flame } from "lucide-react";
import { readCommandAllowlist } from "@/lib/command-allowlist";
import { CommandAllowlistBox } from "@/components/problem/CommandAllowlistBox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Header } from "@/components/Header";
import { AdSlot } from "@/components/AdSlot";


function ProblemDetailContent() {
	const router = useRouter();

	// URL에서 가져온 값 상태
	const searchParams = useSearchParams();
	const probId = searchParams.get('probId');
	const contestProbId = searchParams.get('contestProblemId');
	const contestId = searchParams.get('contestId');

	// 페이지 상태
	const [isLoggedIn, setIsLoggedIn] = useState(false);
	const [activeTab, setActiveTab] = useState(searchParams.get("tab") === "grading" ? "grading" : "problem");
	const [userImgUrl, setUserImgUrl] = useState("");

	// API 연동용 상태
	const [problemData, setProblemData] = useState<any>(null);
	const commandAllowlist = readCommandAllowlist(problemData?.vmInfo);
	const [isLoading, setIsLoading] = useState(true);
	const [firstBlood, setFirstBlood] = useState<any>({ user: "", prifile_url: "", date: "" });
	const [ads, setAds] = useState<any[]>([]);

	// 객관식 문제 관련 상태
	const [selectedChoices, setSelectedChoices] = useState<number[]>([]);
	const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);

	// 채점 데이터 상태
	const [submissions, setSubmissions] = useState<ContestSubmission[]>([]);
	const [boardError, setBoardError] = useState<string | null>(null);
	const [boardPage, setBoardPage] = useState(1);
	const [boardLoading, setBoardLoading] = useState(true);
	const [boardPages, setBoardPages] = useState(0);
	const [totalScore, setTotalScore] = useState<number | null>(null);
	const [boardRevision, setBoardRevision] = useState(0);
	const fetchSubmissions = () => { setBoardPage(1); setBoardRevision(value => value + 1); };

	useEffect(() => {
		const fetchProfileImage = async () => {
			const token = localStorage.getItem("token");
			if (!token) return;

			setIsLoggedIn(true);

			try {
				const response = await fetch("https://diveon.net/api/profile/show", {
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
				}
			} catch (error) {
				console.error("홈페이지 초기 데이터 로드 실패:", error);
			}
		};

		fetchProfileImage();
	}, []);

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


			} catch (error) {
				console.error("데이터 로드 실패:", error);
			} finally {
				setIsLoading(false); // 로딩 종료
			}
		};
		fetchPageData();
	}, [probId]);

	// The board is authoritative for all three types; generic pending_sub storage is never read.
	useEffect(() => { setBoardPage(1); }, [contestId, contestProbId, probId]);
	useEffect(() => {
		setSubmissions([]); setBoardError(null); setTotalScore(null); setBoardPages(0); setBoardLoading(true);
		return watchContestBoard({
			contestId: Number(contestId), contestProblemId: Number(contestProbId), page: boardPage,
			token: localStorage.getItem("token"),
			onBoard: board => {
				setBoardLoading(false);
				if (board.probId !== Number(probId)) {
					setSubmissions([]); setTotalScore(null); setBoardError("대회와 문제 정보가 일치하지 않습니다."); return;
				}
				setSubmissions(board.submissions); setTotalScore(board.currentTotalScore);
				setBoardPages(board.totalPages); setBoardError(null);
			},
			onError: message => { setSubmissions([]); setTotalScore(null); setBoardPages(0); setBoardLoading(false); setBoardError(message); },
		});
	}, [contestId, contestProbId, probId, boardPage, boardRevision]);

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
		// 명세: answer는 문자열. 단일 정답은 "2", 복수 정답은 JSON 배열 문자열 "[1,3]"
		// 순서 일치 문제는 누른 순서 그대로 보낸다(서버가 순서까지 비교).
		const sortedChoices = problemData?.isSeqeuntialAnswer ? [...selectedChoices] : [...selectedChoices].sort((a, b) => a - b);
		const finalAnswer = sortedChoices.length === 1
			? String(sortedChoices[0])
			: JSON.stringify(sortedChoices);

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
				const json = await res.json();
				alert(json.data.isCorrect === true ? "정답입니다." : json.data.isCorrect === false ? "오답입니다." : "결과를 확인해주세요.");
				setActiveTab("grading");
				fetchSubmissions();
			} else if (res.status === 409) { // conflict/contest-cooldown
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
		if(problemData?.selectionMode==='single'){setSelectedChoices([index]);return;}
		setSelectedChoices(prev =>
			prev.includes(index) ? prev.filter(i => i !== index)
				: problemData?.isSeqeuntialAnswer ? [...prev, index] : [...prev, index].sort((a, b) => a - b)
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
		if (!logout()) return;
		setIsLoggedIn(false);
		window.location.reload(); // 상태 초기화를 위해 새로고침
	};

	return (
		<div className="min-h-screen bg-panel text-ink font-sans">

			<Header
				isLoggedIn={isLoggedIn}
				userImgUrl={userImgUrl}
				activeMenu="contest"
				onLogout={() => { if (logout()) window.location.replace("/"); }}
			/>

			{/* 2. 메인 레이아웃 (Grid 12분할) */}
			<main className="dv-shell dv-shell--wide pt-6 grid grid-cols-1 md:grid-cols-12 gap-6 pb-12">

				{/* [A] 좌측 정보 패널 (2칸) */}
				<aside className="col-span-12 md:col-span-2 space-y-4 order-last md:order-none">
					<Button
						variant="outline"
						className="w-full justify-start border-line text-ink-muted hover:bg-raised/60 font-bold h-11 rounded-xl"
						onClick={() => router.push(`/contests/detail?id=${contestId}`)}
					>
						<ChevronLeft size={16} className="mr-2" /> 대회로 돌아가기
					</Button>

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
										{new Date(firstBlood.date).toLocaleDateString()}
									</span>
								</div>
							) : (
								<div className="py-4 text-center">
									<p className="text-xs text-ink-subtle italic">아직 문제를 해결한 유저가 없습니다.</p>
								</div>
							)}
						</CardContent>
					</Card>

					{/* 배점 표시 패널 */}
					<Card className="shadow-none border-line rounded-xl">
						<CardContent className="p-4 flex justify-between items-center text-sm font-bold">
							<span className="text-ink-muted">배점</span>
							<span className="text-primary text-lg font-black">{problemData?.points} pts</span>
						</CardContent>
					</Card>


				</aside>

				{/* [B] 중앙 콘텐츠 영역 (6칸) */}
				<section className="col-span-12 md:col-span-10 xl:col-span-8 space-y-6">

					{/* 탭 컨트롤러 */}
					<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
						<TabsList className="grid w-full grid-cols-2 bg-raised p-1 rounded-lg sticky top-16 z-40">
							<TabsTrigger value="problem">문제</TabsTrigger>
							<TabsTrigger value="grading">채점</TabsTrigger>
						</TabsList>

						{/* 1. 문제 탭 */}
						<TabsContent value="problem" className="mt-6 space-y-6 animate-in fade-in-50 duration-300">
							<div className="flex gap-6 items-start">
								<div className="w-24 h-24 bg-raised rounded-2xl flex items-center justify-center shrink-0 border border-line">
									<div className="grid grid-cols-2 gap-1 opacity-50">
										<div className="w-3 h-3 bg-ink-subtle rounded-full" />
										<div className="w-3 h-3 bg-ink-subtle rounded-sm" />
										<div className="w-3 h-3 bg-ink-subtle rounded-sm" />
										<div className="w-3 h-3 bg-ink-subtle rounded-full" />
									</div>
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

							<div className="flex items-center justify-between w-full">
								{/* 왼쪽 버튼 그룹 (제출, 공유) */}
								<div className="flex gap-2">
									{/* 문제 유형에 따른 동작 버튼 변경 */}
									{problemData?.type === "coding" ? (
										<Link href={`/contests/editor?probId=${probId}&contestProblemId=${contestProbId}&contestId=${contestId}`}>
											<Button className="bg-primary hover:bg-primary-hover shadow-md shadow-black/40 font-bold">
												코드 제출하기
											</Button>
										</Link>
									) : problemData?.type === "objective" ? (
										<Button
											className="bg-raised border border-line-strong text-ink hover:bg-line font-bold disabled:opacity-50"
											onClick={handleObjectiveSubmit}
											disabled={isSubmittingAnswer || selectedChoices.length === 0} // 선택된 게 없으면 비활성화
										>
											{isSubmittingAnswer ? "제출 중..." : "답안 제출하기"}
										</Button>
									) : problemData?.type === "practice" ? (
										<Link href={`/contests/terminal?probId=${probId}&contestProblemId=${contestProbId}&contestId=${contestId}`}>
											<Button className="bg-success hover:bg-success/85 text-primary-ink font-bold shadow-md shadow-black/40">
												실습 환경 켜기
											</Button>
										</Link>
									) : (
										<Button className="bg-raised hover:bg-line">답안 제출하기</Button> // Fallback
									)}
									<Button variant="outline" size="icon">
										<Share2 className="h-4 w-4" />
									</Button>
								</div>
							</div>
							<Separator />

							<div className="prose prose-slate max-w-none">
								<p className="text-ink whitespace-pre-wrap">
									{problemData?.description}
								</p>

								{/* 객관식 보기 동적 렌더링 */}
								{problemData?.type === "objective" && problemData?.choices && (
									<ChoiceList choices={problemData.choices} selected={selectedChoices} ordered={!!problemData?.isSeqeuntialAnswer} onToggle={handleChoiceToggle} />
								)}

								{/* 코딩형 입출력 예시 동적 렌더링 */}
								{problemData?.type==='coding'&&<CodingRules contract={problemData.oboContract} inputDescription={problemData.inputDescription} outputDescription={problemData.outputDescription} allowedLanguages={problemData.constraints?.allowedLanguages}/>}
								{problemData?.type === "coding" && <SampleCases cases={problemData?.testcases ?? []} />}
							</div>

							{/* 실습 이미지가 허용하는 명령어 (제한이 있을 때만) */}
							{problemData?.type === "practice" && commandAllowlist && (
								<CommandAllowlistBox commands={commandAllowlist} />
							)}
						</TabsContent>

						{/* 2. 채점 탭 */}
						<TabsContent value="grading" className="mt-6 animate-in fade-in-50 duration-300">
							<div className="flex items-center justify-between mb-4">
								<h2 className="text-lg font-bold">내 제출 현황</h2>
								<span className="text-ink-muted">대회 총점: {totalScore ?? "-"}점</span>
								<Button variant="outline" size="sm" onClick={fetchSubmissions}>새로고침</Button>
							</div>
							{boardError && <p role="alert" className="mb-3 text-danger">{boardError}</p>}
							{boardLoading && <p role="status" className="text-ink-muted">제출 기록을 불러오는 중입니다.</p>}
							<div className="flex items-center gap-3 mb-3">
								<Button variant="outline" size="sm" disabled={boardPage <= 1} onClick={() => setBoardPage(p => p - 1)}>이전</Button>
								<span className="text-ink-muted">{boardPage} / {Math.max(1, boardPages)}</span>
								<Button variant="outline" size="sm" disabled={boardPage >= boardPages} onClick={() => setBoardPage(p => p + 1)}>다음</Button>
							</div>

							<div className="border rounded-lg overflow-hidden">
								<Table>
									<TableHeader className="bg-canvas">
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
											.map(sub => {
												const isCoding = problemData?.type === "coding";
												const detailLinks = contestCodingLinks(problemData?.type, sub);

												// 렌더링 상태 판별
												const verdict = submissionVerdict(sub);
												const isPending = verdict.kind === "pending";
												const isSuccess = verdict.kind === "correct";
												const resultText = verdict.label;

												return (
													<TableRow
														key={sub.submissionId}
														// 행 전체 클릭(onClick) 제거 (버튼을 따로 둘 것이므로 오작동 방지)
														className="hover:bg-raised/60 transition-colors"
													>
														<TableCell className="font-mono text-xs">{sub.submissionId}</TableCell>
														<TableCell className="font-bold text-ink">{sub.nickname || "User"}</TableCell>

														{/* 결과 배지 컬럼 */}
														<TableCell>
															{isPending ? (
																<div className="flex flex-col gap-1">
																	<Badge variant="outline" className="text-primary border-primary/30 bg-primary/10 w-fit">
																		<div className="w-3 h-3 mr-1 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
																		{resultText}
																	</Badge>
																</div>
															) : (
																<div className="space-y-1">
																	<Badge
																		variant={isSuccess ? "default" : verdict.kind === "unknown" || verdict.kind === "error" ? "outline" : "destructive"}
																		className={isSuccess ? "bg-primary hover:bg-primary-hover text-primary-ink font-bold shadow-sm shadow-black/40" : verdict.kind === "error" ? "font-bold border-warning/30 bg-warning-soft text-warning" : "font-bold"}
																	>
																		{isSuccess ? <CheckCircle2 className="w-3 h-3 mr-1" /> : verdict.kind === "unknown" ? <Clock className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
																		{resultText}
																	</Badge>
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
															{new Date(sub.submittedAt).toLocaleString()}
														</TableCell>

														{/* 상세 보기 액션 버튼 컬럼 */}
														<TableCell className="text-center">
															{/* 객관식/실습은 보드에서 결과 확인; 일반 제출 ID를 추정하지 않습니다. */}
															{/* 2. 코딩: 코드 보기 / OBO 보기 2가지 버튼 제공 */}
															{detailLinks && (
																<div className="flex justify-center gap-1.5">
																	{detailLinks.code && <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs font-bold text-ink-muted" asChild>
																		<Link href={detailLinks.code}>코드</Link>
																	</Button>}
																	{detailLinks.obo && <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs font-bold border-primary/30 text-primary hover:bg-primary/10" asChild>
																		<Link href={detailLinks.obo}>{problemData?.type === "objective" ? "결과 확인" : "OBO"}</Link>
																	</Button>}
																</div>
															)}

															{/* 3. 실습: 버튼 없음 (또는 채점 중일 때 대기 상태 표시) */}
															{!detailLinks && (
																<span className="text-xs text-ink-subtle">-</span>
															)}
														</TableCell>
													</TableRow>
												);
											})}

										{submissions.length === 0 && !boardError && !boardLoading && (
											<TableRow>
												<TableCell
													colSpan={problemData?.type === "coding" ? 8 : problemData?.type === "practice" ? 6 : 5}
													className="text-center py-8 text-ink-subtle text-sm italic"
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

				{/* [C] 우측 광고 칸 — 광고가 있을 때만 그림 (1280px 이상) */}
				<aside className="hidden xl:block xl:col-span-2">
					<AdSlot ads={ads} />
				</aside>
			</main>
		</div>
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
