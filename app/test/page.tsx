"use client";

import { useState, useEffect } from "react";
import { 
  Cpu, Layers, HardDrive, Users, Lock, Anchor, Target, BarChart3 
} from "lucide-react";
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer 
} from "recharts";

/* ========================================================================== */
/* [MOCK DATA FIELD] 독립 테스트용 목데이터 엔프라                             */
/* ========================================================================== */
const mockCategoryStats = {
  Process: 720,
  Memory: 450,
  Kernel: 300,
  Thread: 80,
  FileSystem: 180
};

const mockSolvedProblems = [
  { probId: 101, category: "Memory", title: "가상 메모리 LRU 페이지 교체 알고리즘과 Page Fault 오버헤드 분석", author: "KernelMaster", difficulty: "5", solvedCount: 142, visibility: "public" },
  { probId: 102, category: "Thread", title: "세마포어와 뮤텍스를 활용한 생산자-소비자 패턴 동기화 큐 구현", author: "SysAdmin", difficulty: "3", solvedCount: 89, visibility: "group" },
  { probId: 103, category: "File System", title: "EXT4 파일 시스템 I-node 구조 파싱 및 디렉터리 엔트리 복구 연습", author: "ForensicCop", difficulty: "2", solvedCount: 211, visibility: "contest" },
  { probId: 104, category: "Process", title: "라운드로빈 스케줄러의 타임 퀀텀 크기에 따른 컨텍스트 스위칭 효율성", author: "OS_Professor", difficulty: "4", solvedCount: 56, visibility: "private" },
];

const mockFailedProblems = [
  { probId: 201, category: "Process", title: "데드락(Deadlock) 탐지를 위한 은행원 알고리즘 시뮬레이터 빌드", author: "SecurityGod", difficulty: "5", solvedCount: 12, visibility: "public" },
  { probId: 202, category: "Kernel", title: "리눅스 커널 소켓 버퍼(sk_buff) 할당 구조와 메모리 누수 추적", author: "RootUser", difficulty: "4", solvedCount: 23, visibility: "group" },
];

const mockAuthoredProblems = [
  { probId: 801, category: "Kernel", title: "인터럽트 벡터 테이블(IVT) 마스킹과 분산 처리 루틴 설계", author: "내닉네임", difficulty: "5", solvedCount: 45, isSolved: true, visibility: "public" },
  { probId: 802, category: "Memory", title: "FIFO vs 가상 페이지 메모리 벤치마킹 분석 모듈", author: "내닉네임", difficulty: "3", solvedCount: 110, isSolved: false, visibility: "private" },
];

const mockGroups = [
  { groupId: 1, title: "단국대 사이버 수사대 경장 합격 스터디", role: "LEADER", isPrivate: true, memberCount: 8 },
  { groupId: 2, title: "Windows 아티팩트 및 포렌식 커널 분석회", role: "MEMBER", isPrivate: false, memberCount: 42 },
  { groupId: 3, title: "OS 핵심 원리 PBL 시각화 가이드 클럽", role: "MEMBER", isPrivate: false, memberCount: 128 },
];

const mockContests = [
  { contestId: 11, title: "제1회 DiveOn 크래시 덤프 분석 레이스", status: "UPCOMING", role: "PARTICIPANT" },
  { contestId: 12, title: "2026 가상 메모리 스케줄러 최적화 경진대회", status: "ONGOING", role: "PARTICIPANT" },
  { contestId: 13, title: "시스템 엔지니어링 동기화 해커톤 (Ended)", status: "ENDED", role: "ADMIN" },
];

/* ========================================================================== */
/* MAIN PAGE COMPONENT                                                        */
/* ========================================================================== */
export default function TestChartPage() {
  // [STATE] 서브 메뉴 및 필터 상태 제어
  const [subTab, setSubTab] = useState<"solved" | "failed" | "authored" | "groups" | "contests">("solved");
  const [visibility, setVisibility] = useState<string>("");
  const [displayList, setDisplayList] = useState<any[]>([]);

  // 명세서 기반 최댓값(max) 동적 정규화 연산
  const scoreValues = Object.values(mockCategoryStats);
  const maxScore = Math.max(...scoreValues);
  const dynamicMax = maxScore > 0 ? maxScore : 100;

  const formattedChartData = [
    { subject: "Process", depth: mockCategoryStats.Process },
    { subject: "Memory", depth: mockCategoryStats.Memory },
    { subject: "Kernel", depth: mockCategoryStats.Kernel },
    { subject: "Thread", depth: mockCategoryStats.Thread },
    { subject: "File System", depth: mockCategoryStats.FileSystem },
  ];

  // 필터 및 탭 전환 시 동적 가공 엔진 효과
  useEffect(() => {
    let rawList: any[] = [];
    if (subTab === "solved") rawList = mockSolvedProblems;
    else if (subTab === "failed") rawList = mockFailedProblems;
    else if (subTab === "authored") rawList = mockAuthoredProblems;
    else if (subTab === "groups") rawList = mockGroups;
    else if (subTab === "contests") rawList = mockContests;

    if (["solved", "failed", "authored"].includes(subTab) && visibility) {
      rawList = rawList.filter((item) => item.visibility === visibility);
    }
    setDisplayList(rawList);
  }, [subTab, visibility]);

  // 공용 수심 배지 테마 렌더팩
  const renderDepthBadge = (diff: string) => {
    const labels: Record<string, string> = { "1": "100m", "2": "300m", "3": "500m", "4": "1,000m", "5": "3,000m+" };
    return (
      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-mono font-black tracking-tight shadow-none
        ${diff === "1" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : ""}
        ${diff === "2" ? "bg-amber-50 text-amber-600 border-amber-200" : ""}
        ${diff === "3" ? "bg-rose-50 text-rose-600 border-rose-100" : ""}
        ${diff === "4" ? "bg-violet-50 text-violet-700 border-violet-200" : ""}
        ${diff === "5" ? "bg-slate-900 text-white border-slate-950" : ""}
      `}>
        {labels[diff] || "100m"}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-slate-900 font-sans py-12 px-6">
      <div className="container mx-auto max-w-[1100px] space-y-12">
        
        {/* [A] 대시보드 타이틀 헤더 패널 */}
        <div className="flex items-center justify-between border-b pb-5 border-slate-200">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-indigo-600" /> 대원 통합 능력치 대시보드
              </h1>
              <span className="bg-blue-600 text-white font-black text-[9px] px-1.5 py-0.5 rounded-md h-4 flex items-center">STANDALONE TEST</span>
            </div>
            <p className="text-sm text-slate-500">카테고리 스태츠 및 활동 로그 기록 분석 샌드박스입니다.</p>
          </div>
        </div>

        {/* [B] 오각형 차트 분석 블록 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="col-span-12 lg:col-span-7 bg-slate-950 border border-slate-900 shadow-2xl rounded-3xl h-[400px] flex items-center justify-center p-6 relative overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={formattedChartData}>
                <PolarGrid stroke="#1e293b" />
                <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={11} fontWeight="bold" />
                <PolarRadiusAxis angle={30} domain={[0, dynamicMax]} tick={{ fill: '#475569', fontSize: 10 }} />
                <Radar name="최고 탐사 수심" dataKey="depth" stroke="#00D1FF" fill="#0055FF" fillOpacity={0.15} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="col-span-12 lg:col-span-5 space-y-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Live Score Metrics</span>
            {formattedChartData.map((item) => (
              <div key={item.subject} className="p-3.5 bg-white border border-slate-100 shadow-sm rounded-xl flex items-center justify-between transition-all hover:bg-slate-50">
                <span className="text-sm font-bold text-slate-700">{item.subject}</span>
                <span className="font-mono text-xs font-black text-indigo-600 bg-indigo-50/70 px-2.5 py-1 rounded-md">
                  {item.depth.toLocaleString()} m
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* [C] 하단 인터랙션 스위칭 테이블 리스트 팩 */}
        <div className="space-y-6 pt-4">
          <div className="flex flex-wrap gap-1 bg-slate-200/60 p-1.5 rounded-xl border border-slate-200/50">
            <button onClick={() => { setSubTab("solved"); setVisibility(""); }} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${subTab === "solved" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:bg-white/50"}`}>🌊 푼 문제</button>
            <button onClick={() => { setSubTab("failed"); setVisibility(""); }} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${subTab === "failed" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:bg-white/50"}`}>❌ 못 푼 문제</button>
            <button onClick={() => { setSubTab("authored"); setVisibility(""); }} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${subTab === "authored" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:bg-white/50"}`}>🛠️ 출제한 문제</button>
            <button onClick={() => { setSubTab("groups"); setVisibility(""); }} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${subTab === "groups" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:bg-white/50"}`}>👥 속한 그룹</button>
            <button onClick={() => { setSubTab("contests"); setVisibility(""); }} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${subTab === "contests" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:bg-white/50"}`}>🏆 참여 대회</button>
          </div>

          {["solved", "failed", "authored"].includes(subTab) && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium pl-1">
              <span className="text-slate-400 mr-2 font-bold">필터 적용:</span>
              {[
                { label: "전체 목록", value: "" },
                { label: "공개 스펙", value: "public" },
                { label: "그룹 소속", value: "group" },
                { label: "대회 기출", value: "contest" },
                { label: "비공개 룸", value: "private" },
              ].map((filter) => (
                <button
                  key={filter.label}
                  onClick={() => setVisibility(filter.value)}
                  className={`px-3 py-1 rounded-full border transition-all font-bold ${
                    visibility === filter.value
                      ? "bg-indigo-50 border-indigo-300 text-indigo-600 shadow-sm"
                      : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          )}

          <div className="bg-white border border-slate-100 shadow-xl rounded-2xl overflow-hidden min-h-[300px]">
            {displayList.length === 0 ? (
              <div className="py-24 text-center text-slate-400 text-sm font-medium">선택된 분기 필터 스펙에 부합하는 가상 데이터 로그가 비어 있습니다.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {displayList.map((item: any) => {
                  if (["solved", "failed", "authored"].includes(subTab)) {
                    return (
                      <div key={`test-p-${item.probId}`} className="flex items-center justify-between p-4.5 hover:bg-slate-50/70 transition-colors group">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-slate-400 group-hover:text-indigo-600 transition-colors">#{item.probId}</span>
                            <span className="inline-flex items-center bg-slate-100 text-slate-500 text-[10px] font-bold px-1.5 py-0.5 rounded-md">{item.category}</span>
                            <span className="inline-flex items-center border border-slate-200 text-slate-400 text-[9px] uppercase font-mono px-1.5 rounded">{item.visibility}</span>
                            {subTab === "authored" && (
                              <span className={`text-[9px] font-black rounded px-1.5 py-0.5 border-none shadow-none ${item.isSolved ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                                {item.isSolved ? "SOLVED" : "UNSOLVED"}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-indigo-600 group-hover:underline cursor-pointer transition-colors">{item.title}</p>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          {renderDepthBadge(item.difficulty)}
                          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">{item.author}</span>
                        </div>
                      </div>
                    );
                  }

                  if (subTab === "groups") {
                    return (
                      <div key={`test-g-${item.groupId}`} className="flex items-center justify-between p-4.5 hover:bg-slate-50/70 transition-colors group">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-9 w-9 bg-slate-900 rounded-xl flex items-center justify-center text-white text-sm shadow-md">👥</div>
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors cursor-pointer">{item.title}</p>
                              <span className={`text-[9px] font-black rounded px-1.5 py-0.5 ${item.role === "LEADER" ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500"}`}>{item.role}</span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-medium">대원 수 {item.memberCount}명</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 border border-slate-200 px-2 py-0.5 rounded-full bg-white">{item.isPrivate ? "🔒 비공개" : "🌐 공개"}</span>
                      </div>
                    );
                  }

                  if (subTab === "contests") {
                    return (
                      <div key={`test-c-${item.contestId}`} className="flex items-center justify-between p-4.5 hover:bg-slate-50/70 transition-colors group">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-black rounded px-1.5 py-0.5 ${
                              item.status === "ONGOING" ? "bg-blue-50 text-blue-600 animate-pulse" :
                              item.status === "UPCOMING" ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-400"
                            }`}>{item.status}</span>
                            <span className="text-[9px] font-bold border border-slate-200 text-slate-400 px-1.5 rounded uppercase">{item.role}</span>
                          </div>
                          <p className="text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors cursor-pointer">{item.title}</p>
                        </div>
                        <div className="text-right shrink-0 font-mono text-[10px] text-slate-400 hidden sm:block">
                          <p className="font-bold text-[#0066FF]">탐사 세션 매핑 완료</p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}