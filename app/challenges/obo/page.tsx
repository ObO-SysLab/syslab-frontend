"use client";

import { useState, useEffect } from "react";
import {
	ArrowLeft, ArrowRight, Activity, Info, RotateCcw,
	CheckCircle2, AlertCircle, Share2, ChevronLeft, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

// --- 상수 및 데이터 (기존 로직 유지) ---
const STATES = ["New", "Ready", "Running", "Waiting", "Terminated"];
const SPOS: Record<string, { x: number; y: number }> = {
	New: { x: 55, y: 130 },
	Ready: { x: 200, y: 65 },
	Running: { x: 355, y: 130 },
	Waiting: { x: 200, y: 210 },
	Terminated: { x: 510, y: 130 }
};
const SCOL: Record<string, string> = {
	New: "#64748b",
	Ready: "#7c3aed",
	Running: "#0d9488",
	Waiting: "#d97706",
	Terminated: "#e11d48"
};
const TRANS = [
	{ from: "New", to: "Ready", label: "admitted", cx: 127, cy: 78 },
	{ from: "Ready", to: "Running", label: "dispatch", cx: 277, cy: 74 },
	{ from: "Running", to: "Ready", label: "interrupt", cx: 277, cy: 110 },
	{ from: "Running", to: "Waiting", label: "I/O wait", cx: 285, cy: 185 },
	{ from: "Waiting", to: "Ready", label: "I/O done", cx: 200, cy: 152 },
	{ from: "Running", to: "Terminated", label: "exit", cx: 432, cy: 110 },
];
const STEPS = [
	{ state: "New", desc: "프로세스가 생성되었습니다. OS가 PCB를 초기화하고 자원을 할당할 준비를 합니다.", edge: null },
	{ state: "Ready", desc: "준비 완료! 메모리에 적재되어 CPU를 할당받기 위해 Ready Queue에서 대기합니다.", edge: { from: "New", to: "Ready" } },
	{ state: "Running", desc: "Dispatch! CPU 스케줄러에 의해 선택되어 실제로 명령어를 실행 중입니다.", edge: { from: "Ready", to: "Running" } },
	{ state: "Ready", desc: "타이머 인터럽트 발생! 할당된 시간(Time Quantum)을 모두 소모하여 다시 Ready 상태로 쫓겨납니다.", edge: { from: "Running", to: "Ready" } },
	{ state: "Running", desc: "다시 차례가 돌아와 Dispatch 되었습니다. 멈췄던 곳부터 실행을 재개합니다.", edge: { from: "Ready", to: "Running" } },
	{ state: "Waiting", desc: "I/O 요청 발생. 데이터를 읽거나 쓸 때까지 CPU를 반납하고 대기 상태로 전환됩니다.", edge: { from: "Running", to: "Waiting" } },
	{ state: "Ready", desc: "I/O 작업 완료 인터럽트 발생. 다시 실행될 준비가 되어 Ready 상태로 돌아갑니다.", edge: { from: "Waiting", to: "Ready" } },
	{ state: "Running", desc: "다시 선택되었습니다. 중단되었던 시점부터 실행을 재개합니다.", edge: { from: "Ready", to: "Running" } },
	{ state: "Terminated", desc: "작업 완료 또는 오류로 인해 종료되었습니다. 할당된 모든 자원이 회수됩니다.", edge: { from: "Running", to: "Terminated" } },
];

// 화살표 경로 계산 함수
function arrowPath(from: string, to: string, off = 0) {
	const f = SPOS[from], t = SPOS[to];
	const dx = t.x - f.x, dy = t.y - f.y, len = Math.sqrt(dx * dx + dy * dy), r = 26;
	const nx = dx / len, ny = dy / len, ox = -ny * off, oy = nx * off;
	return `M${f.x + nx * r + ox} ${f.y + ny * r + oy} L${t.x - nx * r + ox} ${t.y - ny * r + oy}`;
}

export default function StateTransitionPage() {
	const [step, setStep] = useState(0);
	const [isPlaying, setIsPlaying] = useState(false);
	const cur = STEPS[step];

	useEffect(() => {
		let timer: NodeJS.Timeout;
		if (isPlaying) {
			// 1.5초(1500ms)마다 다음 단계로 자동으로 넘어감
			timer = setInterval(() => {
				setStep((prev) => {
					if (prev >= STEPS.length - 1) {
						setIsPlaying(false); // 마지막 단계면 재생 멈춤
						return prev;
					}
					return prev + 1;
				});
			}, 1500);
		}
		return () => clearInterval(timer);
	}, [isPlaying]);

	return (
		<div className="min-h-screen bg-slate-50 py-12 px-6">
			<div className="max-w-[1000px] mx-auto space-y-8">

				{/* 상단 내비게이션 & 제목 */}
				<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
					<div className="space-y-1">
						<Link href="/challenges" className="group text-sm font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors">
							<ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
							문제 상세 페이지로 돌아가기
						</Link>
						<h1 className="text-3xl font-black tracking-tighter text-slate-900 flex items-center gap-3 mt-2">
							<Activity className="w-8 h-8 text-indigo-600" />
							프로세스 상태 전이 시각화
						</h1>
					</div>
					<div className="flex gap-2">
						<Button variant="outline" size="sm" className="rounded-xl border-slate-200 text-slate-600 gap-2 font-bold">
							<Share2 className="w-4 h-4" /> 공유하기
						</Button>
					</div>
				</div>

				{/* 💡 수정 1: 사이드바가 없으므로 8칸 제한을 풀고 중앙 넓은 레이아웃으로 변경 */}
				<div className="w-full max-w-4xl mx-auto space-y-6">

					{/* SVG 다이어그램 카드 */}
					<Card className="border-slate-100 shadow-xl bg-white overflow-hidden p-6 md:p-12">
						<div className="flex justify-center items-center h-full min-h-[350px]">
							{/* 💡 수정 2: max-w를 늘려 UI가 작아 보이는 현상 해결 */}
							<svg width="100%" viewBox="0 0 580 280" className="overflow-visible max-w-full">
								<defs>
									<marker id="ma_inactive" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
										<polygon points="0 0, 10 5, 0 10" fill="#cbd5e1" />
									</marker>
									{STATES.map(s => (
										<marker key={`ma_${s}`} id={`ma_${s}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
											<polygon points="0 0, 10 5, 0 10" fill={SCOL[s]} />
										</marker>
									))}
								</defs>

								{/* 전이(Transition) 화살표 */}
								{TRANS.map((tr, i) => {
									const active = cur.edge && cur.edge.from === tr.from && cur.edge.to === tr.to;
									const off = (tr.from === "Running" && tr.to === "Ready") || (tr.from === "Ready" && tr.to === "Running") ? -15 : 0;
									const activeColor = SCOL[tr.to];

									return (
										<g key={i}>
											<path
												d={arrowPath(tr.from, tr.to, off)}
												stroke={active ? activeColor : "#e2e8f0"}
												strokeWidth={active ? 3.5 : 2}
												fill="none"
												markerEnd={active ? `url(#ma_${tr.to})` : "url(#ma_inactive)"}
											/>
											<text
												x={tr.cx}
												y={tr.cy - (active ? 1.5 : 0)}
												textAnchor="middle"
												fontSize={active ? 11 : 10}
												fill={active ? activeColor : "#94a3b8"}
												fontWeight={active ? "900" : "600"}
												className="font-mono transition-none"
											>
												{tr.label}
											</text>
										</g>
									);
								})}

								{/* 상태(State) 원형 노드 */}
								{STATES.map(s => {
									const p = SPOS[s], c = SCOL[s], act = s === cur.state;
									return (
										<g key={s} className="transition-all duration-500">
											{/* 💡 수정 3: 점선 원이 제자리에서 돌도록 transformOrigin 설정 */}
											{act && (
												<circle
													cx={p.x} cy={p.y} r={36}
													fill="none" stroke={c} strokeWidth={2}
													strokeDasharray="4 4"
													className="animate-[spin_6s_linear_infinite] opacity-50"
													style={{ transformOrigin: `${p.x}px ${p.y}px` }}
												/>
											)}
											<circle
												cx={p.x} cy={p.y} r={28}
												fill={act ? c : "white"}
												stroke={act ? c : "#cbd5e1"}
												strokeWidth={act ? 0 : 2.5}
												className="shadow-xl"
											/>
											<text
												x={p.x} y={p.y + 4}
												textAnchor="middle"
												fontSize={11}
												fill={act ? "white" : "#475569"}
												fontWeight="900"
											>
												{s}
											</text>
										</g>
									);
								})}
							</svg>
						</div>
					</Card>

					{/* 컨트롤 버튼 영역 (중앙 정렬 보강) */}
					<div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
						<Button
							size="lg"
							onClick={() => setIsPlaying(!isPlaying)}
							disabled={step === STEPS.length - 1 && !isPlaying}
							className={`rounded-2xl font-bold h-12 px-8 shadow-lg transition-all ${isPlaying ? "bg-rose-500 hover:bg-rose-600 shadow-rose-200" : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200"}`}
						>
							{isPlaying ? "⏸ 일시정지" : "▶ 자동 재생 시퀀스"}
						</Button>

						<div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-slate-200 shadow-sm">
							<Button
								variant="ghost"
								size="icon"
								onClick={() => { setStep(s => Math.max(0, s - 1)); setIsPlaying(false); }}
								disabled={step === 0}
								className="rounded-xl text-slate-400 hover:text-slate-900"
							>
								<ArrowLeft className="w-5 h-5" />
							</Button>

							<div className="flex gap-2 px-3">
								{STEPS.map((s, i) => (
									<div
										key={i}
										onClick={() => { setStep(i); setIsPlaying(false); }}
										className="transition-all duration-500 rounded-full cursor-pointer hover:opacity-80"
										style={{
											width: i === step ? 28 : 10,
											height: 10,
											background: i === step ? SCOL[s.state] : i < step ? SCOL[s.state] + "66" : "#e2e8f0",
										}}
									/>
								))}
							</div>

							<Button
								variant="ghost"
								size="icon"
								onClick={() => { setStep(s => Math.min(STEPS.length - 1, s + 1)); setIsPlaying(false); }}
								disabled={step === STEPS.length - 1}
								className="rounded-xl text-slate-400 hover:text-slate-900"
							>
								<ArrowRight className="w-5 h-5" />
							</Button>
						</div>

						<Button
							variant="outline"
							size="lg"
							onClick={() => { setStep(0); setIsPlaying(false); }}
							className="rounded-2xl font-bold h-12 px-6 border-slate-200 shadow-sm text-slate-500 hover:text-slate-900 hover:bg-slate-100"
						>
							<RotateCcw className="w-5 h-5 mr-1.5" /> 초기화
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}