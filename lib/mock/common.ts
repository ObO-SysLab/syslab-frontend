// 목 데이터 공통 유틸
// 모든 목 응답은 references/의 API 명세와 같은 형태(`{ status, message, data }`)를 따른다.

export type ApiResponse<T> = {
  status: number;
  message: string;
  data: T;
};

export const ok = <T>(data: T, message = "성공", status = 200): ApiResponse<T> => ({
  status,
  message,
  data,
});

const pad = (n: number) => String(n).padStart(2, "0");

// 서버 명세 형식인 로컬 시각 "YYYY-MM-DDTHH:mm:ss"(타임존 없음)
export const toLocalIso = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
  `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

// 현재 시각 기준 상대 시각. 대회 진행 중/접수 중 상태가 항상 유지되도록 사용한다.
export const fromNow = (hours: number) => toLocalIso(new Date(Date.now() + hours * 60 * 60 * 1000));

// 그룹 게시글/댓글 전용 날짜 형식 "yyyy.MM.dd"
export const toDotDate = (iso: string) => iso.slice(0, 10).replace(/-/g, ".");

// 1부터 시작하는 페이지네이션
export const paginate = <T>(items: T[], page = 1, size = 10) => {
  const totalElements = items.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / size));
  const start = (page - 1) * size;
  return { totalElements, totalPages, currentPage: page, items: items.slice(start, start + size) };
};

// 로그인한 "나" — 다른 목 파일에서 isOwner / isMine / isAuthor 판단 기준으로 쓴다.
export const ME = {
  userId: 99,
  nickname: "박단용",
  profileImgUrl: null as string | null,
  tier: 4,
  score: 2450,
};

// 목 환경에서 쓰는 가짜 토큰
export const MOCK_TOKEN = "mock-access-token";
