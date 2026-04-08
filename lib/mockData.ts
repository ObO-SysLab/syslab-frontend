// [Diveon main] 현재 로그인한 사용자 정보 (나중에 DB 연동)
export const user = {
	name: "박단용",
	avatar: "/avatar.png",
	tier: "골드 I",
	score: 1850,
	solved: 125,
	ranking: 158,
	progress: 85, // 다음 티어까지 85%
};

// [Diveon main] 최신/추천 문제 목록
export const featuredProblems = [
	{ id: "102", title: "숨겨진 플래그를 찾아라", category: "CTF", difficulty: "중", solvedCount: 1258 },
	{ id: "105", title: "라운드로빈", category: "Process", difficulty: "상", solvedCount: 452 },
	{ id: "108", title: "나만의 MFT", category: "File System", difficulty: "하", solvedCount: 2351 }, // [전공 특화]
];

export const notifications = [
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

// [challenges] 문제 리스트 목 데이터
export const challenges = [
	{ id: "1", title: "라운드로빈", author: "박단용", category: "Process", level: "1", successRate: "78%", solved: true },
	{ id: "2", title: "FIFO", author: "조트리버", category: "Process", level: "1", successRate: "75%", solved: true },
	{ id: "3", title: "문제1", author: "어굿이야", category: "Process", level: "2", successRate: "72%", solved: true },
	{ id: "4", title: "문제2", author: "백준 고수", category: "Process", level: "2", successRate: "73%", solved: true },
	{ id: "5", title: "문제3", author: "오마에와모", category: "Process", level: "2", successRate: "32%", solved: false },
	{ id: "6", title: "문제4", author: "아단최", category: "Process", level: "3", successRate: "18%", solved: false },
	{ id: "7", title: "문제5", author: "아단최", category: "Process", level: "3", successRate: "52%", solved: false },
	{ id: "8", title: "문제6", author: "아단최", category: "Process", level: "3", successRate: "10%", solved: false },
];

// [challenges main] 우측 패널용 (Top3 & 최근 댓글)
export const topRankers = [
	{ rank: 1, name: "Guido", score: 2400 },
	{ rank: 2, name: "Torvalds", score: 2350 },
	{ rank: 3, name: "Gosling", score: 2100 },
];

// [challenges main] 채점 현황 데이터
export const sidebarComments = [
	{ user: "Hacker1", text: "입력값 범위 확인하세요.", time: "10분 전" },
	{ user: "Newbie", text: "이거 DFS로 풀리나요?", time: "1시간 전" },
];

// [challenges main] 채점 현황 데이터
export const submissions = [
	{ id: "1024", result: "맞았습니다!!", memory: "2024 KB", time: "12 ms", lang: "Python3", date: "1분 전", isCorrect: true },
	{ id: "1023", result: "틀렸습니다", memory: "1020 KB", time: "4 ms", lang: "C++", date: "5분 전", isCorrect: false },
	{ id: "1022", result: "시간 초과", memory: "---", time: "2000 ms", lang: "Python3", date: "10분 전", isCorrect: false },
];

// [challenges main] 전체 순위 데이터
export const fullRankings = [
	{ rank: 1, user: "Guido", memory: "1120 KB", time: "4 ms", lang: "Python3", date: "2025.11.12" },
	{ rank: 2, user: "Torvalds", memory: "980 KB", time: "0 ms", lang: "C", date: "2025.10.04" },
	{ rank: 3, user: "Gosling", memory: "2200 KB", time: "12 ms", lang: "Java", date: "2025.09.21" },
	{ rank: 4, user: "DanKook", memory: "2400 KB", time: "16 ms", lang: "Node.js", date: "2026.01.18" },
	{ rank: 5, user: "Security", memory: "2024 KB", time: "14 ms", lang: "Python3", date: "2026.01.19" },
];

// [contests] 대회 목록 (상태: 진행 중, 예정, 종료)
export const contests = [
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

// [contest main] 대회 정보
export const contestInfo = {
	title: "제1회 단국대 디지털 포렌식 챌린지",
	remainingTime: "02:14:35",
	progress: 65,
	myRank: 12,
	myScore: 1450,
};

// [groups] 그룹 리스트 목 데이터
export const groups = [
	{ id: "1", title: "DK-알고리즘 덕후 모임", leader: "박단용", tier: "1" },
	{ id: "2", title: "그룹 이름 1", leader: "조트리버", tier: "1" },
	{ id: "3", title: "그룹 이름 2", leader: "어굿이야", tier: "2" },
	{ id: "4", title: "그룹 이름 3", leader: "백준 씹 고인물", tier: "2" },
	{ id: "5", title: "그룹 이름 4", leader: "오마에와모신데이루", tier: "2" },
	{ id: "6", title: "그룹 이름 5", leader: "아단최", tier: "3" },
	{ id: "7", title: "그룹 이름 6", leader: "아단최", tier: "3" },
	{ id: "8", title: "그룹 이름 7", leader: "아단최", tier: "3" },
];

// [groups main] 
export const fullMember = [
	{ rank: 1, user: "Guido", role: "그룹장", tier: "마스터", lang: "Python3", date: "2025.11.12" },
	{ rank: 2, user: "Torvalds", role: "매니저", tier: "다이아", lang: "C", date: "2025.10.04" },
	{ rank: 3, user: "Gosling", role: "매니저", tier: "플래티넘", lang: "Java", date: "2025.09.21" },
	{ rank: 4, user: "DanKook", role: "일반", tier: "골드", lang: "Node.js", date: "2026.01.18" },
	{ rank: 5, user: "Security", role: "일반", tier: "실버", lang: "Python3", date: "2026.01.19" },
];