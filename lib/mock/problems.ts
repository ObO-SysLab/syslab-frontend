// references/challenges.md
// difficulty는 프론트 규약대로 "1"~"7" 문자열(수심 레벨, getLevelLabel 참고)을 쓴다.
import { ME, ok, paginate } from "./common";

export type ProblemType = "objective" | "coding" | "practice";
export type ProblemCategory = "Process" | "Memory" | "Kernel" | "Thread" | "FileSystem";
export type Visibility = "public" | "private" | "group" | "contest";

export type ProblemListItem = {
  probId: number;
  type: ProblemType;
  title: string;
  author: string;
  category: ProblemCategory;
  difficulty: string;
  solvedCount: number;
  isSolved: boolean;
};

// 상세 조회용 메타 (목록 항목에 없는 공통 필드)
type ProblemMeta = {
  visibility: Visibility;
  summary: string;
  submittedCount: number;
  createdAt: string;
  updatedAt: string;
};

const problems: (ProblemListItem & ProblemMeta)[] = [
  { probId: 1, type: "coding", title: "라운드로빈 스케줄링 구현", author: "박단용", category: "Process", difficulty: "1", solvedCount: 317, isSolved: true, visibility: "public", summary: "CPU 스케줄링의 기초인 라운드로빈 알고리즘을 코드로 구현해보세요.", submittedCount: 412, createdAt: "2026-03-01T09:00:00", updatedAt: "2026-03-10T14:30:00" },
  { probId: 2, type: "objective", title: "프로세스 상태 전이 이해하기", author: "조트리버", category: "Process", difficulty: "1", solvedCount: 528, isSolved: true, visibility: "public", summary: "Ready / Running / Waiting 상태 전이 조건을 고르는 문제입니다.", submittedCount: 640, createdAt: "2026-03-02T10:00:00", updatedAt: "2026-03-02T10:00:00" },
  { probId: 3, type: "practice", title: "커널 메모리 덤프 분석", author: "어굿이야", category: "Kernel", difficulty: "2", solvedCount: 88, isSolved: true, visibility: "public", summary: "메모리 덤프 파일에서 특정 커널 구조체의 데이터를 추출하세요.", submittedCount: 203, createdAt: "2026-03-05T13:20:00", updatedAt: "2026-03-07T08:00:00" },
  { probId: 4, type: "objective", title: "시스템 콜 호출 순서", author: "백준고수", category: "Kernel", difficulty: "2", solvedCount: 241, isSolved: false, visibility: "public", summary: "fork → exec → wait 과정에서 호출되는 시스템 콜의 순서를 맞추세요.", submittedCount: 377, createdAt: "2026-03-08T11:00:00", updatedAt: "2026-03-08T11:00:00" },
  { probId: 5, type: "objective", title: "MFT 엔트리 헤더 구조", author: "오마에와", category: "FileSystem", difficulty: "3", solvedCount: 73, isSolved: false, visibility: "public", summary: "MFT 엔트리 헤더의 각 필드 의미로 옳은 것을 고르세요.", submittedCount: 229, createdAt: "2026-03-12T16:40:00", updatedAt: "2026-03-12T16:40:00" },
  { probId: 6, type: "practice", title: "루트킷 숨김 파일 탐지", author: "아단최", category: "FileSystem", difficulty: "4", solvedCount: 21, isSolved: false, visibility: "public", summary: "LKM 루트킷에 의해 숨겨진 스크립트를 찾아 플래그를 획득하세요.", submittedCount: 118, createdAt: "2026-03-15T20:00:00", updatedAt: "2026-03-16T09:10:00" },
  { probId: 7, type: "coding", title: "식사하는 철학자 문제", author: "병렬마스터", category: "Thread", difficulty: "3", solvedCount: 96, isSolved: false, visibility: "public", summary: "데드락을 방지하는 세마포어 로직을 작성하세요.", submittedCount: 287, createdAt: "2026-03-20T14:00:00", updatedAt: "2026-03-20T14:00:00" },
  { probId: 8, type: "practice", title: "힙 오버플로우 분석", author: "PwnStar", category: "Memory", difficulty: "5", solvedCount: 12, isSolved: false, visibility: "public", summary: "동적 할당 영역의 취약점을 분석하여 플래그를 획득하세요.", submittedCount: 95, createdAt: "2026-04-01T09:30:00", updatedAt: "2026-04-01T09:30:00" },
  { probId: 9, type: "coding", title: "좀비 프로세스 청소", author: "유닉스장인", category: "Process", difficulty: "2", solvedCount: 154, isSolved: true, visibility: "public", summary: "자식 프로세스를 올바르게 수거하는 프로그램을 작성하세요.", submittedCount: 260, createdAt: "2026-04-03T18:00:00", updatedAt: "2026-04-03T18:00:00" },
  { probId: 10, type: "objective", title: "데드락 발생 조건", author: "박단용", category: "Thread", difficulty: "3", solvedCount: 132, isSolved: false, visibility: "public", summary: "자원 할당 그래프를 보고 데드락 발생 여부를 판별하세요.", submittedCount: 301, createdAt: "2026-04-10T12:00:00", updatedAt: "2026-04-11T09:00:00" },
  { probId: 11, type: "coding", title: "페이지 교체 LRU 구현", author: "메모리박사", category: "Memory", difficulty: "3", solvedCount: 110, isSolved: true, visibility: "public", summary: "가장 오래 참조되지 않은 페이지를 교체하는 알고리즘을 구현하세요.", submittedCount: 245, createdAt: "2026-04-15T15:00:00", updatedAt: "2026-04-15T15:00:00" },
  { probId: 12, type: "practice", title: "EXT4 저널 복구", author: "포렌식경장", category: "FileSystem", difficulty: "6", solvedCount: 4, isSolved: false, visibility: "public", summary: "파손된 EXT4 저널 로그를 분석해 삭제된 파일을 복구하세요.", submittedCount: 61, createdAt: "2026-05-01T10:00:00", updatedAt: "2026-05-01T10:00:00" },
  { probId: 13, type: "objective", title: "TLB와 페이지 테이블 워크", author: "메모리박사", category: "Memory", difficulty: "4", solvedCount: 58, isSolved: false, visibility: "public", summary: "TLB miss 발생 시 주소 변환 과정을 순서대로 고르세요.", submittedCount: 170, createdAt: "2026-05-10T11:00:00", updatedAt: "2026-05-10T11:00:00" },
  { probId: 14, type: "coding", title: "스핀락 vs 뮤텍스 벤치마크", author: "병렬마스터", category: "Thread", difficulty: "4", solvedCount: 37, isSolved: false, visibility: "public", summary: "두 동기화 기법의 임계 구역 처리 결과를 출력하세요.", submittedCount: 140, createdAt: "2026-06-01T09:00:00", updatedAt: "2026-06-01T09:00:00" },
  { probId: 15, type: "practice", title: "커널 패닉 원인 추적", author: "어굿이야", category: "Kernel", difficulty: "7", solvedCount: 1, isSolved: false, visibility: "public", summary: "oops 로그와 vmcore로 커널 패닉의 원인 함수를 찾으세요.", submittedCount: 38, createdAt: "2026-07-01T09:00:00", updatedAt: "2026-07-01T09:00:00" },
  // 내가 만든 비공개 문제 (onlyMine=true 목록용)
  { probId: 16, type: "objective", title: "[초안] 세마포어 P/V 연산", author: "박단용", category: "Thread", difficulty: "2", solvedCount: 0, isSolved: false, visibility: "private", summary: "작성 중인 비공개 문제입니다.", submittedCount: 0, createdAt: "2026-10-20T22:00:00", updatedAt: "2026-10-21T09:00:00" },
];

const toListItem = ({ probId, type, title, author, category, difficulty, solvedCount, isSolved }: ProblemListItem): ProblemListItem => ({
  probId, type, title, author, category, difficulty, solvedCount, isSolved,
});

// 공개 문제 목록 원본 (다른 목 파일에서도 사용)
export const mockProblemList: ProblemListItem[] = problems.filter((p) => p.visibility === "public").map(toListItem);

// GET /api/problems — 페이지당 10개
export const getMockProblemList = (query: {
  page?: number;
  title?: string;
  type?: string;
  category?: string;
  difficulty?: string;
  onlyUnsolved?: boolean;
  onlyMine?: boolean;
} = {}) => {
  const filtered = problems
    .filter((p) => (query.onlyMine ? p.visibility === "private" && p.author === ME.nickname : p.visibility === "public"))
    .filter((p) => !query.title || p.title.includes(query.title))
    .filter((p) => !query.type || p.type === query.type)
    .filter((p) => !query.category || p.category === query.category)
    .filter((p) => !query.difficulty || p.difficulty === query.difficulty)
    .filter((p) => !query.onlyUnsolved || !p.isSolved)
    .map(toListItem);
  const { totalElements, totalPages, currentPage, items } = paginate(filtered, query.page ?? 1, 10);
  return ok(
    { total: totalElements, page: currentPage, pageSize: 10, totalPages, problems: items },
    "문제 목록 조회에 성공하였습니다."
  );
};

export const mockProblemListResponse = getMockProblemList();

// ---------- 상세 ----------

const sampleDescription = (body: string) =>
  `${body}\n\n### 참고\n- 플래그 형식은 \`DK{...}\` 입니다.\n- 비정상적인 서버 접근 시도는 제재될 수 있습니다.`;

const objectiveExtras: Record<number, object> = {
  2: {
    description: "다음 중 프로세스 상태 전이에 대한 설명으로 **옳은 것을 모두** 고르시오.",
    choices: [
      { index: 1, content: "Running 상태에서 타임 퀀텀이 끝나면 Ready 상태로 전이된다.", imageUrl: null },
      { index: 2, content: "Waiting 상태에서 바로 Running 상태로 전이될 수 있다.", imageUrl: null },
      { index: 3, content: "I/O 요청 시 Running 상태에서 Waiting 상태로 전이된다.", imageUrl: null },
      { index: 4, content: "New 상태의 프로세스는 곧바로 Terminated 상태가 된다.", imageUrl: null },
    ],
    isSeqeuntialAnswer: false,
  },
  4: {
    description: "셸에서 `ls`를 실행할 때 호출되는 시스템 콜을 **호출 순서대로** 선택하시오.",
    choices: [
      { index: 1, content: "fork()", imageUrl: null },
      { index: 2, content: "execve()", imageUrl: null },
      { index: 3, content: "wait4()", imageUrl: null },
      { index: 4, content: "exit_group()", imageUrl: null },
    ],
    isSeqeuntialAnswer: true,
  },
  5: {
    description: "NTFS MFT 엔트리 헤더에 대한 설명으로 옳은 것은?",
    choices: [
      { index: 1, content: "MFT 엔트리의 기본 크기는 512바이트이다.", imageUrl: null },
      { index: 2, content: "모든 파일과 디렉터리는 최소 1개 이상의 MFT 엔트리를 가진다.", imageUrl: null },
      { index: 3, content: "$DATA 속성은 항상 Resident 형태로만 저장된다.", imageUrl: null },
      { index: 4, content: "정상 MFT 엔트리의 시그니처는 'BAAD'이다.", imageUrl: null },
    ],
    isSeqeuntialAnswer: false,
  },
  10: {
    description: "데드락 발생의 4가지 필요조건이 **아닌** 것을 고르시오.",
    choices: [
      { index: 1, content: "상호 배제 (Mutual Exclusion)", imageUrl: null },
      { index: 2, content: "점유 대기 (Hold and Wait)", imageUrl: null },
      { index: 3, content: "선점 가능 (Preemption)", imageUrl: null },
      { index: 4, content: "순환 대기 (Circular Wait)", imageUrl: null },
    ],
    isSeqeuntialAnswer: false,
  },
  13: {
    description: "TLB miss가 발생했을 때 주소 변환 과정을 순서대로 고르시오.",
    choices: [
      { index: 1, content: "TLB 조회", imageUrl: null },
      { index: 2, content: "페이지 테이블 워크", imageUrl: null },
      { index: 3, content: "TLB 갱신", imageUrl: null },
      { index: 4, content: "물리 주소로 메모리 접근", imageUrl: null },
    ],
    isSeqeuntialAnswer: true,
  },
  16: {
    description: "세마포어 P/V 연산에 대한 설명으로 옳은 것은?",
    choices: [
      { index: 1, content: "P 연산은 세마포어 값을 증가시킨다.", imageUrl: null },
      { index: 2, content: "V 연산은 대기 중인 프로세스를 깨울 수 있다.", imageUrl: null },
    ],
    isSeqeuntialAnswer: false,
  },
};

const codingExtras: Record<number, object> = {
  1: {
    description: "N개의 프로세스 도착 시간과 실행 시간, 타임 퀀텀 Q가 주어질 때 라운드로빈 스케줄링의 평균 대기 시간을 구하시오.",
    constraints: { timeLimitMs: 1000, memoryLimitMb: 256, allowedLanguages: ["c", "cpp", "python"] },
    inputDescription: "첫 줄에 N과 Q (1 ≤ N ≤ 100, 1 ≤ Q ≤ 10)\n다음 N줄에 도착 시간과 실행 시간",
    outputDescription: "평균 대기 시간을 소수점 둘째 자리까지 출력",
    testcases: [
      { index: 1, input: "3 2\n0 5\n1 3\n2 1", output: "3.67", isSample: true },
      { index: 2, input: "2 4\n0 4\n0 4", output: "2.00", isSample: true },
      { index: 3, input: "1 1\n0 1", output: "0.00", isSample: false },
    ],
    fileUrl: null,
  },
  7: {
    description: "5명의 철학자가 각자 M번 식사를 마칠 때까지 데드락 없이 실행되는 프로그램을 작성하고, 총 식사 횟수를 출력하시오.",
    constraints: { timeLimitMs: 2000, memoryLimitMb: 256, allowedLanguages: ["c", "cpp"] },
    inputDescription: "식사 횟수 M (1 ≤ M ≤ 1000)",
    outputDescription: "전체 식사 횟수",
    testcases: [
      { index: 1, input: "3", output: "15", isSample: true },
      { index: 2, input: "10", output: "50", isSample: false },
    ],
    fileUrl: null,
  },
  9: {
    description: "N개의 자식 프로세스를 생성한 뒤 모두 수거하고, 수거된 자식 수를 출력하시오.",
    constraints: { timeLimitMs: 1000, memoryLimitMb: 128, allowedLanguages: ["c", "cpp", "python"] },
    inputDescription: "자식 프로세스 수 N (1 ≤ N ≤ 50)",
    outputDescription: "수거된 자식 프로세스 수",
    testcases: [{ index: 1, input: "5", output: "5", isSample: true }],
    fileUrl: null,
  },
  11: {
    description: "프레임 수 F와 페이지 참조열이 주어질 때 LRU 교체 알고리즘의 페이지 폴트 횟수를 구하시오.",
    constraints: { timeLimitMs: 1000, memoryLimitMb: 256, allowedLanguages: ["c", "cpp", "python"] },
    inputDescription: "첫 줄에 F와 참조열 길이 N\n둘째 줄에 참조열",
    outputDescription: "페이지 폴트 횟수",
    testcases: [
      { index: 1, input: "3 12\n7 0 1 2 0 3 0 4 2 3 0 3", output: "9", isSample: true },
      { index: 2, input: "4 6\n1 2 3 4 1 2", output: "4", isSample: true },
    ],
    fileUrl: null,
  },
  14: {
    description: "스레드 수 T와 반복 횟수 K가 주어질 때 공유 카운터의 최종 값을 출력하시오.",
    constraints: { timeLimitMs: 3000, memoryLimitMb: 512, allowedLanguages: ["c", "cpp"] },
    inputDescription: "T K",
    outputDescription: "최종 카운터 값",
    testcases: [{ index: 1, input: "4 1000", output: "4000", isSample: true }],
    fileUrl: null,
  },
};

const practiceExtras: Record<number, object> = {
  3: { vmInfo: { osImage: "ubuntu:22.04", allowedCommands: ["ls", "cat", "grep", "strings", "xxd"] } },
  6: { vmInfo: { osImage: "ubuntu:22.04", allowedCommands: ["ls", "cat", "grep", "find", "lsmod", "dmesg", "ps"] } },
  8: { vmInfo: { osImage: "ubuntu:20.04", allowedCommands: ["ls", "cat", "gdb", "objdump", "python3"] } },
  12: { vmInfo: { osImage: "debian:12", allowedCommands: ["ls", "cat", "debugfs", "dumpe2fs", "xxd"] } },
  15: { vmInfo: { osImage: "ubuntu:22.04", allowedCommands: ["ls", "cat", "crash", "dmesg", "grep"] } },
};

// GET /api/problems/{probId} — 없거나 남의 비공개 문제면 null(실제 서버는 404)
export const getMockProblemDetail = (probId: number) => {
  const p = problems.find((x) => x.probId === probId);
  if (!p) return null;
  if (p.visibility === "private" && p.author !== ME.nickname) return null;

  const common = {
    probId: p.probId,
    author: p.author,
    isOwner: p.author === ME.nickname,
    type: p.type,
    title: p.title,
    category: p.category,
    difficulty: p.difficulty,
    visibility: p.visibility,
    summary: p.summary,
    solvedCount: p.solvedCount,
    submittedCount: p.submittedCount,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };

  if (p.type === "objective") {
    return ok(
      {
        ...common,
        ...objectiveExtras[p.probId],
        oboEnabled: false,
        oboSteps: [],
      },
      "문제 상세 조회에 성공하였습니다."
    );
  }
  if (p.type === "coding") {
    const extra = codingExtras[p.probId] as { description: string };
    return ok({ ...common, ...extra, description: sampleDescription(extra.description) }, "문제 상세 조회에 성공하였습니다.");
  }
  return ok(
    { ...common, description: sampleDescription(p.summary), ...practiceExtras[p.probId] },
    "문제 상세 조회에 성공하였습니다."
  );
};

// 유형별 대표 상세 응답
export const mockObjectiveDetailResponse = getMockProblemDetail(5)!;
export const mockCodingDetailResponse = getMockProblemDetail(1)!;
export const mockPracticeDetailResponse = getMockProblemDetail(6)!;

// ---------- 채점용 정답 (상세 응답에는 포함되지 않음) ----------

// 객관식 정답 보기 번호. isSeqeuntialAnswer 문제는 순서까지 일치해야 정답
export const mockObjectiveAnswers: Record<number, number[]> = {
  2: [1, 3],
  4: [1, 2, 3, 4],
  5: [2],
  10: [3],
  13: [1, 2, 3, 4],
  16: [2],
};

// 실습형 정답 플래그 (모든 실습 문제 공통)
export const MOCK_PRACTICE_FLAG = "DK{mock_flag}";

export const getMockProblemType = (probId: number) => problems.find((p) => p.probId === probId)?.type ?? null;

// ---------- 오늘의 / 랜덤 / 추천 ----------

const byId = (id: number) => mockProblemList.find((p) => p.probId === id)!;

export const mockTodayProblemResponse = ok(byId(7), "오늘의 문제 조회에 성공하였습니다.");
export const mockRandomProblemResponse = ok(byId(11), "랜덤 문제 조회에 성공하였습니다.");
export const mockRecommendProblemResponse = ok(
  { reason: "Thread 카테고리를 자주 틀리셨어요", problems: [byId(10), byId(7), byId(14)] },
  "추천 문제 조회에 성공하였습니다."
);

// ---------- 생성 / 수정 / 삭제 ----------

export const mockProblemCreateResponse = ok(
  { probId: 101, type: "objective" as ProblemType, title: "새 문제", createdAt: "2026-10-29T13:52:36" },
  "문제가 등록되었습니다.",
  201
);
export const mockProblemUpdateResponse = ok(
  { probId: 16, type: "objective" as ProblemType, title: "[초안] 세마포어 P/V 연산", updatedAt: "2026-10-29T14:00:00" },
  "문제 변경에 성공했습니다."
);
export const mockProblemDeleteResponse = ok({ probId: 16 }, "문제가 삭제되었습니다.");

// ---------- 댓글 ----------

type Comment = {
  commentId: number;
  authorNickname: string;
  content: string;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
};

// 목 라우터가 댓글 작성/수정/삭제 시 이 배열을 직접 변경한다 (새로고침하면 초기화)
export const mockProblemComments: (Comment & { probId: number; parentId: number | null })[] = [
  { commentId: 1, probId: 1, parentId: null, authorNickname: "AlgorithmMaster", content: "도착 시간이 같을 때는 입력 순서대로 큐에 넣으면 되나요?", isPrivate: false, createdAt: "2026-10-27T14:30:00", updatedAt: "2026-10-27T14:30:00" },
  { commentId: 2, probId: 1, parentId: null, authorNickname: "CodeNewbie", content: "타임 퀀텀이 실행 시간보다 클 때 처리 방법이 헷갈리네요.", isPrivate: false, createdAt: "2026-10-27T13:00:00", updatedAt: "2026-10-27T13:00:00" },
  { commentId: 3, probId: 1, parentId: null, authorNickname: "박단용", content: "예제 1번 손으로 따라가 보면 이해가 빨라요.", isPrivate: false, createdAt: "2026-10-26T22:15:00", updatedAt: "2026-10-26T22:20:00" },
  { commentId: 4, probId: 1, parentId: null, authorNickname: "PythonLover", content: "(비밀 댓글) 제 풀이 맞는지 봐주실 수 있나요?", isPrivate: true, createdAt: "2026-10-25T09:00:00", updatedAt: "2026-10-25T09:00:00" },
  { commentId: 5, probId: 1, parentId: 1, authorNickname: "박단용", content: "네, 도착 시간이 같으면 입력 순서를 따릅니다.", isPrivate: false, createdAt: "2026-10-27T15:00:00", updatedAt: "2026-10-27T15:00:00" },
  { commentId: 6, probId: 1, parentId: 1, authorNickname: "AlgorithmMaster", content: "감사합니다! 통과했어요.", isPrivate: false, createdAt: "2026-10-27T16:10:00", updatedAt: "2026-10-27T16:10:00" },
  { commentId: 7, probId: 1, parentId: 3, authorNickname: "FastCoder", content: "간트 차트 그려보니까 바로 보이네요 👍", isPrivate: false, createdAt: "2026-10-27T08:00:00", updatedAt: "2026-10-27T08:00:00" },
  { commentId: 8, probId: 5, parentId: null, authorNickname: "포렌식경장", content: "$DATA가 Non-resident가 되는 기준을 같이 찾아보세요.", isPrivate: false, createdAt: "2026-10-20T11:00:00", updatedAt: "2026-10-20T11:00:00" },
];

// 응답에는 작성자 프로필 사진 주소(없으면 null)가 함께 온다 (2026-11-10 백엔드와 같은 형태)
const strip = ({ commentId, authorNickname, content, isPrivate, createdAt, updatedAt }: Comment) => ({
  commentId, authorNickname, authorProfileImgUrl: authorNickname === ME.nickname ? ME.profileImgUrl : null, content, isPrivate, createdAt, updatedAt,
});

// GET /api/problems/{probId}/comments — 최상위 댓글만, 최신순
export const getMockComments = (probId: number, page = 1, size = 20) => {
  const top = mockProblemComments
    .filter((c) => c.probId === probId && c.parentId === null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(strip);
  const { totalElements, items } = paginate(top, page, size);
  return ok({ total: totalElements, page, size, comments: items }, "댓글 목록 조회에 성공하였습니다.");
};

// GET /api/problems/{probId}/comments/{commentId} — 대댓글은 오래된 순
export const getMockCommentDetail = (probId: number, commentId: number) => {
  const c = mockProblemComments.find((x) => x.probId === probId && x.commentId === commentId);
  if (!c) return null;
  const replies = mockProblemComments
    .filter((r) => r.parentId === commentId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map(strip);
  return ok({ ...strip(c), replies }, "댓글 조회에 성공하였습니다.");
};

export const mockCommentsResponse = getMockComments(1);
export const mockCommentDetailResponse = getMockCommentDetail(1, 1)!;

export const mockCommentCreateResponse = ok(
  { commentId: 100, probId: 1, authorNickname: ME.nickname, content: "새 댓글", createdAt: "2026-10-29T10:00:00" },
  "댓글이 작성되었습니다.",
  201
);
export const mockCommentUpdateResponse = ok(
  { commentId: 3, content: "수정한 내용", isPrivate: false, updatedAt: "2026-10-29T10:05:00" },
  "댓글이 수정되었습니다."
);
export const mockCommentDeleteResponse = ok({ commentId: 3 }, "댓글이 삭제되었습니다.");

// ---------- OBO ----------
// OBO JSON 자체(components/obo 영역)는 담당 팀원 데이터 형식을 따라야 하므로 여기서는 비워 둔다.

// GET /api/problems/obo — ApiResponse 래퍼 없이 최상위에 바로 온다
export const mockOboTemplatesResponse = {
  status: 200,
  message: "OBO 템플릿이 조회되었습니다.",
  enabled: false,
  templates: [] as { id: number; name: string; whiteboardData: string; mappings: string }[],
};

// GET /api/challenges/obo?id= — 래퍼 없이 OBO JSON 자체 또는 null
export const mockProblemOboResponse = null;
