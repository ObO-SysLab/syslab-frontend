// [Diveon main] 현재 로그인한 사용자 정보 
export const mockUser = {
	name: "박단용",
	avatar: "/avatar.png",
	tier: "골드 I",
	score: 1850,
	solved: 125,
	ranking: 158,
	progress: 85, // 다음 티어까지 85%
};

// [Diveon main] 최신/추천 문제 목록
export const mockFeaturedProblems = [
	{ id: "102", title: "숨겨진 플래그를 찾아라", category: "CTF", difficulty: "중", solvedCount: 1258, depthLabel: "500m" },
	{ id: "105", title: "라운드로빈", category: "Process", difficulty: "상", solvedCount: 452, depthLabel: "50m" },
	{ id: "108", title: "나만의 MFT", category: "File System", difficulty: "하", solvedCount: 2351, depthLabel: "100m" }, 
];

export const mockNotifications = [
  {
    id: 1,
    type: "challenge",
    title: "새로운 챌린지 공개",
    description: "Memory 카테고리에 'Page Table Walk' 문제가 추가되었습니다.",
    time: "2시간 전",
    isRead: false,
  },
  {
    id: 2,
    type: "success",
    title: "풀이 성공",
    description: "[Process 102] 문제 검증이 완료되었습니다. +50pts",
    time: "5시간 전",
    isRead: true,
  },
  {
    id: 3,
    type: "system",
    title: "서버 점검 안내",
    description: "내일 새벽 02:00 ~ 04:00 시스템 최적화 작업이 진행됩니다.",
    time: "1일 전",
    isRead: true,
  },
];

// 1. [Challenges] 문제 목록 데이터
export const mockChallenges = [
  { id: "1", title: "라운드로빈 스케줄링 구현", author: "박단용", category: "Process", level: "1", successRate: "78%", solved: true, summary: "CPU 스케줄링의 기초인 라운드로빈 알고리즘을 코드로 구현해보세요.", type: "coding" },
  { id: "2", title: "FIFO 큐 시뮬레이션", author: "조트리버", category: "Process", level: "1", successRate: "75%", solved: true, summary: "먼저 들어온 데이터가 먼저 나가는 FIFO 구조를 이해합시다.", type: "coding" },
  { id: "3", title: "커널 메모리 덤프 분석", author: "어굿이야", category: "Kernel", level: "2", successRate: "72%", solved: true, summary: "메모리 덤프 파일에서 특정 커널 구조체의 데이터를 추출하세요.", type: "coding" },
  { id: "4", title: "시스템 콜 추적 (ptrace)", author: "백준 고수", category: "Kernel", level: "2", successRate: "73%", solved: true, summary: "프로세스가 실행될 때 호출되는 시스템 콜의 순서를 분석합니다.", type: "coding" },
  { id: "5", title: "MFT 엔트리 헤더 구조", author: "오마에와", category: "File System", level: "3", successRate: "32%", solved: false, summary: "MFT 엔트리 헤더의 각 필드 의미를 올바르게 연결하세요.", type: "objective" },
  { id: "6", title: "루트킷 숨김 파일 탐지", author: "아단최", category: "File System", level: "4", successRate: "18%", solved: false, summary: "리눅스 서버 환경에서 LKM 루트킷에 의해 숨겨진 스크립트를 찾으세요.", type: "practice" },
  { id: "7", title: "식사하는 철학자 문제", author: "병렬마스터", category: "Thread", level: "3", successRate: "45%", solved: false, summary: "데드락(Deadlock) 현상을 방지하는 세마포어 로직을 작성하세요.", type: "coding" },
  { id: "8", title: "힙 오버플로우 분석", author: "PwnStar", category: "Memory", level: "4", successRate: "21%", solved: false, summary: "동적 할당 영역에서 발생하는 취약점을 분석하여 플래그를 획득하세요.", type: "practice" },
  { id: "9", title: "좀비 프로세스 청소", author: "유닉스장인", category: "Process", level: "2", successRate: "60%", solved: true, summary: "부모 프로세스가 자식을 제대로 수거하지 않아 생긴 좀비를 처리하세요.", type: "coding" },
  { id: "10", title: "데드락 탐지 알고리즘", author: "박단용", category: "Thread", level: "3", successRate: "38%", solved: false, summary: "자원 할당 그래프를 통해 데드락 발생 여부를 판별하는 퀴즈입니다.", type: "objective" },
  { id: "11", title: "페이지 교체 LRU 구현", author: "메모리박사", category: "Memory", level: "2", successRate: "55%", solved: true, summary: "가장 오랫동안 참조되지 않은 페이지를 교체하는 알고리즘을 구현하세요.", type: "coding" },
  { id: "12", title: "EXT4 저널 복구", author: "포렌식경장", category: "File System", level: "5", successRate: "8%", solved: false, summary: "파손된 EXT4 파일 시스템의 저널 로그를 분석하여 파일을 복구하세요.", type: "practice" },
  { id: "13", title: "EXT4 저널 복구2", author: "포렌식경장", category: "File System", level: "5", successRate: "8%", solved: false, summary: "파손된 EXT4 파일 시스템의 저널 로그를 분석하여 파일을 복구하세요.", type: "objective" },
];

// 2. [Challenges Detail] 기본 문제 상세 데이터
export const mockChallenge = {
  description: "이 문제는 운영체제 및 시스템 구조의 핵심 개념을 다룹니다.\n\n### 권장 해결 방법\n1. 제시된 조건을 꼼꼼히 읽으세요.\n2. 입출력 형식 및 플래그(`DK{...}`) 포맷을 반드시 준수해야 합니다.\n\n**주의사항**: 비정상적인 서버 접근 시도는 밴 처리됩니다.",
  type: "coding", // 기본값
  
  // [코딩형 데이터]
  testcases: [
    { input: "5\n1 2 3 4 5", output: "15", is_sample: true },
    { input: "3\n10 20 30", output: "60", is_sample: true }
  ],

  // [객관식형 데이터] - id: 5번 문제에서 사용
  choices: [
    { index: 1, content: "MFT 엔트리의 기본 크기는 512바이트이다." },
    { index: 2, content: "모든 파일과 디렉터리는 최소 1개 이상의 MFT 엔트리를 가진다." },
    { index: 3, content: "$DATA 속성은 항상 Resident 형태로만 저장된다." },
    { index: 4, content: "MFT 엔트리의 시그니처는 'FILE'이 아니라 'BAAD'이다." }
  ],

  // [실습형(CTF) 데이터] - id: 6번 문제에서 사용
  vm_info: {
    os_image: "ubuntu:22.04 LTS (Security Hardened)",
    allowed_commands: ["ls", "cat", "grep", "find", "strings", "netstat", "ps"]
  }
};

// [challenges] 광고 데이터
export const mockAds = [
  { ad_id: "ad_1", link_url: "#", image_url: "https://via.placeholder.com/300x250?text=Ad+1", alt_text: "광고 1" },
  { ad_id: "ad_2", link_url: "#", image_url: "https://via.placeholder.com/300x250?text=Ad+2", alt_text: "광고 2" }
];

// [challenges] 랭킹 데이터
export const mockMyRanking = { ranking: "158", total: "5200" };

// [challenges detail] 사이브바 Top3 데이터 
export const mockTopRankers = [
	{ rank: 1, name: "Guido", score: 2400 },
	{ rank: 2, name: "Torvalds", score: 2350 },
	{ rank: 3, name: "Gosling", score: 2100 },
];

// [challenges detail] 사이드바 최신 댓글 데이터
export const mockSidebarComments = [
	{ user: "Hacker1", text: "입력값 범위 확인하세요.", time: "10분 전" },
	{ user: "Newbie", text: "이거 DFS로 풀리나요?", time: "1시간 전" },
];

// [challenges] 사이드바 First Blood 데이터
export const mockFirstBlood = { user: "대단용", profile_url: "", date: "2026-04-27T14:30:00Z" }

// [challenges detail] 채점 현황 데이터
export const mockSubmissions = [
	{ id: "1024", nickname: "박단용", result: "맞았습니다!!", memory: "2024 KB", time: "12 ms", lang: "Python3", date: "1분 전", isCorrect: true, isMine: true },
	{ id: "1023", nickname: "박단용", result: "틀렸습니다", memory: "1020 KB", time: "4 ms", lang: "C++", date: "5분 전", isCorrect: false, isMine: true },
	{ id: "1022", nickname: "박단용", result: "시간 초과", memory: "---", time: "2000 ms", lang: "Python3", date: "10분 전", isCorrect: false, isMine: true },
	{ id: "1021", nickname: "대단용", result: "틀렸습니다", memory: "---", time: "2000 ms", lang: "C", date: "30분 전", isCorrect: false, isMine: false },
	{ id: "1020", nickname: "굿이야", result: "시간 초과", memory: "---", time: "2000 ms", lang: "Python3", date: "50분 전", isCorrect: false, isMine: false },
];

// [challenges detail] 전체 순위 데이터
export const mockFullRankings = [
	{ rank: 1, user: "Guido", score: 2400, memory: "1120 KB", time: "4 ms", lang: "Python3", date: "2025.11.12" },
	{ rank: 2, user: "Torvalds", score: 2350, memory: "980 KB", time: "0 ms", lang: "C", date: "2025.10.04" },
	{ rank: 3, user: "Gosling", score: 2200, memory: "2200 KB", time: "12 ms", lang: "Java", date: "2025.09.21" },
	{ rank: 4, user: "DanKook", score: 1900, memory: "2400 KB", time: "16 ms", lang: "Node.js", date: "2026.01.18" },
	{ rank: 5, user: "Security", score: 1950, memory: "2024 KB", time: "14 ms", lang: "Python3", date: "2026.01.19" },
];

// [challenges detail] 댓글 데이터
export const mockComments = [
	{ comment_id: 1, author_nickname: "AlgorithmMaster", created_at: "2026-04-27T14:30:00Z", content: "이 문제 시간복잡도 O(N)으로 푸신 분 있나요?", repliesCount: 3 },
	{ comment_id: 2, author_nickname: "CodeNewbie", created_at: "2026-04-27T13:00:00Z", content: "DP로 접근해야 하나요? 감이 안 잡히네요.", repliesCount: 0 },
	{ comment_id: 3, author_nickname: "PythonLover", created_at: "2026-04-26T22:15:00Z", content: "입력 예시 2번 케이스에서 자꾸 틀리는데 엣지 케이스 힌트 좀 부탁드립니다.", repliesCount: 1 },
];

// [challenges detail] 대댓글 데이터
export const mockReplies = [
	{ comment_id: 101, author_nickname: "FastCoder", created_at: "2026-04-27T14:30:00Z", content: "투 포인터 쓰면 O(N) 가능합니다!" },
	{ comment_id: 102, author_nickname: "JavaDev", created_at: "2026-04-27T13:00:00Z", content: "저도 투 포인터로 통과했어요. 큐 써도 될 듯?" },
	{ comment_id: 103, author_nickname: "AlgorithmMaster", created_at: "2026-04-26T22:15:00Z", content: "아 하트 감사합니다! 다시 해볼게요." },
];

// [contests] 대회 목록 (상태: 진행 중, 예정, 종료)
export const mockContests = [
	{
		id: "1",
		title: "제1회 단국대 디지털 포렌식 챌린지",
		host: "단국대학교 소프트웨어학과",
		type: "Forensics",
		status: "진행 중",
		date: "2026.04.01 - 2026.04.05",
		participants: 128,
		prize: "총 상금 200만원",
		isHot: true,
	},
	{
		id: "2",
		title: "Diveon 알고리즘 정기전 (April)",
		host: "Diveon 운영팀",
		type: "Algorithm",
		status: "접수 중",
		date: "2026.04.10 14:00",
		participants: 512,
		prize: "Platinum 티어 포인트",
		isHot: false,
	},
	{
		id: "3",
		title: "Spring Security CTF 2026",
		host: "보안 연구회",
		type: "CTF",
		status: "종료",
		date: "2026.03.15",
		participants: 1024,
		prize: "취업 우대권 및 상장",
		isHot: false,
	},
];

// [contest main] 대회 정보 데이터
export const mockContestInfo = {
	title: "제1회 단국대 디지털 포렌식 챌린지",
	remainingTime: "02:14:35",
	progress: 65,
	myRank: 12,
	myScore: 1450,
};

// [groups] 그룹 리스트 데이터
export const mockGroups = [
	{ id: "1", title: "DK-알고리즘 덕후 모임", leader: "박단용", tier: "1" },
	{ id: "2", title: "그룹 이름 1", leader: "조트리버", tier: "1" },
	{ id: "3", title: "그룹 이름 2", leader: "어굿이야", tier: "2" },
	{ id: "4", title: "그룹 이름 3", leader: "백준 씹 고인물", tier: "2" },
	{ id: "5", title: "그룹 이름 4", leader: "오마에와모신데이루", tier: "2" },
	{ id: "6", title: "그룹 이름 5", leader: "아단최", tier: "3" },
	{ id: "7", title: "그룹 이름 6", leader: "아단최", tier: "3" },
	{ id: "8", title: "그룹 이름 7", leader: "아단최", tier: "3" },
];

// [groups detail] 그룹 멤버 데이터 
export const mockFullMember = [
	{ rank: 1, user: "Guido", role: "그룹장", tier: "마스터", lang: "Python3", date: "2025.11.12" },
	{ rank: 2, user: "Torvalds", role: "매니저", tier: "다이아", lang: "C", date: "2025.10.04" },
	{ rank: 3, user: "Gosling", role: "매니저", tier: "플래티넘", lang: "Java", date: "2025.09.21" },
	{ rank: 4, user: "DanKook", role: "일반", tier: "골드", lang: "Node.js", date: "2026.01.18" },
	{ rank: 5, user: "Security", role: "일반", tier: "실버", lang: "Python3", date: "2026.01.19" },
];

// [ranking] Top3 데이터
export const mockTop3 = [
  { rank: 1, nickname: "OS_Master", score: 15420, tier: "Master", solved: 412, avatar: "OM" },
  { rank: 2, nickname: "KernelHacker", score: 14200, tier: "Diamond", solved: 380, avatar: "KH" },
  { rank: 3, nickname: "ByteMage", score: 13850, tier: "Diamond", solved: 355, avatar: "BM" },
];

// [ranking] 랭킹 데이터
export const mockRankings = [
  { rank: 4, nickname: "SysAdmin_01", score: 12100, tier: "Platinum", solved: 310, recentActivity: "2시간 전" },
  { rank: 5, nickname: "ThreadLover", score: 11800, tier: "Platinum", solved: 295, recentActivity: "5시간 전" },
  { rank: 6, nickname: "DeadlockHunter", score: 10500, tier: "Gold", solved: 250, recentActivity: "1일 전" },
  { rank: 7, nickname: "MemoryLeak", score: 9800, tier: "Gold", solved: 210, recentActivity: "3시간 전" },
  { rank: 8, nickname: "PageFault", score: 9200, tier: "Gold", solved: 198, recentActivity: "2일 전" },
  { rank: 9, nickname: "MutexLock", score: 8500, tier: "Silver", solved: 150, recentActivity: "10분 전" },
  { rank: 10, nickname: "DevBeginner", score: 8100, tier: "Silver", solved: 142, recentActivity: "방금 전" },
];

export const mockTop3Groups = [
  { rank: 1, nickname: "단국대 보안동아리", avatar: "DK", score: 98400, master: "거뇽이형", memberCount: 42 },
  { rank: 2, nickname: "알고리즘 뿌시기", avatar: "AL", score: 85200, master: "JohnDoe", memberCount: 28 },
  { rank: 3, nickname: "CTF 워리어스", avatar: "CT", score: 71900, master: "Alice", memberCount: 15 },
];

export const mockGroupRankings = [
  { rank: 1, nickname: "단국대 보안동아리", tier: "Challenger", solved: 412, score: 98400, recentActivity: "5분 전 문제 해결" },
  { rank: 2, nickname: "알고리즘 뿌시기", tier: "Master", solved: 325, score: 85200, recentActivity: "20분 전 문제 해결" },
  { rank: 3, nickname: "CTF 워리어스", tier: "Diamond", solved: 289, score: 71900, recentActivity: "1시간 전 대회 종료" },
  { rank: 4, nickname: "WebHacking.kr 파티", tier: "Platinum", solved: 210, score: 64200, recentActivity: "3시간 전 글 작성" },
  { rank: 5, nickname: "초보자 환영 스터디", tier: "Gold", solved: 145, score: 48900, recentActivity: "어제 멤버 가입" },
];