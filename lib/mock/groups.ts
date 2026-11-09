// references/group.md
import { ME, fromNow, ok, paginate } from "./common";

export type GroupListItem = {
  groupId: number;
  title: string;
  leader: string;
  memberCount: number;
  totalMembers: number;
  tags: string[];
  joined: boolean;
  isPrivate: boolean;
};

// 그룹 상세용 부가 정보
type GroupMeta = {
  description: string;
  problemCount: number;
  contestCount: number;
  isAutoApprove: boolean;
  myStatus: "none" | "pending" | "member";
};

const groups: (GroupListItem & GroupMeta)[] = [
  { groupId: 1, title: "DK-기사단", leader: ME.nickname, memberCount: 42, totalMembers: 50, tags: ["Study", "Mentoring"], joined: true, isPrivate: false, description: "단국대 OS 스터디 그룹입니다. 매주 수요일 문제 풀이 세션을 진행합니다.", problemCount: 32, contestCount: 2, isAutoApprove: false, myStatus: "member" },
  { groupId: 2, title: "커널 해부학 스터디", leader: "어굿이야", memberCount: 28, totalMembers: 30, tags: ["Study", "Kernel"], joined: true, isPrivate: true, description: "리눅스 커널 소스를 함께 읽는 비공개 스터디입니다.", problemCount: 18, contestCount: 1, isAutoApprove: false, myStatus: "member" },
  { groupId: 3, title: "OS 기초반", leader: "조트리버", memberCount: 31, totalMembers: 100, tags: ["Beginner"], joined: false, isPrivate: false, description: "운영체제를 처음 공부하는 분들을 위한 그룹입니다.", problemCount: 12, contestCount: 0, isAutoApprove: true, myStatus: "none" },
  { groupId: 4, title: "초보자 환영 스터디", leader: "DevBeginner", memberCount: 50, totalMembers: 50, tags: ["Beginner", "Mentoring"], joined: false, isPrivate: false, description: "정원이 가득 찬 그룹입니다. (정원 초과 테스트용)", problemCount: 5, contestCount: 0, isAutoApprove: true, myStatus: "none" },
  { groupId: 5, title: "CTF 워리어스", leader: "PwnStar", memberCount: 15, totalMembers: 20, tags: ["CTF", "Competition"], joined: false, isPrivate: false, description: "실습형 문제와 CTF 대회를 준비합니다.", problemCount: 24, contestCount: 3, isAutoApprove: false, myStatus: "pending" },
  { groupId: 6, title: "메모리 포렌식 랩", leader: "포렌식경장", memberCount: 9, totalMembers: 15, tags: ["Forensics", "Memory"], joined: false, isPrivate: false, description: "메모리 덤프 분석 실습 위주의 그룹입니다.", problemCount: 8, contestCount: 0, isAutoApprove: false, myStatus: "none" },
  { groupId: 7, title: "스레드 동기화 연구회", leader: "병렬마스터", memberCount: 12, totalMembers: 30, tags: ["Study", "Thread"], joined: false, isPrivate: false, description: "동기화 기법을 깊게 파는 연구 모임입니다.", problemCount: 10, contestCount: 1, isAutoApprove: true, myStatus: "none" },
];

const toListItem = ({ groupId, title, leader, memberCount, totalMembers, tags, joined, isPrivate }: GroupListItem): GroupListItem => ({
  groupId, title, leader, memberCount, totalMembers, tags, joined, isPrivate,
});

// 비공개 그룹은 내가 속한 경우에만 목록에 나온다
export const mockGroupList: GroupListItem[] = groups.filter((g) => !g.isPrivate || g.joined).map(toListItem);

// GET /api/groups — 기본 size 5
export const getMockGroupList = (query: { page?: number; size?: number; tag?: string; isJoined?: boolean } = {}) => {
  const filtered = mockGroupList
    .filter((g) => !query.tag || g.tags.includes(query.tag))
    .filter((g) => !query.isJoined || g.joined);
  const { totalElements, totalPages, currentPage, items } = paginate(filtered, query.page ?? 1, query.size ?? 5);
  return ok({ totalElements, totalPages, currentPage, groups: items }, "그룹 목록 조회에 성공하였습니다.");
};

// GET /api/groups/search — 비공개 그룹도 검색된다
export const getMockGroupSearch = (keyword: string, page = 1, size = 5) => {
  const filtered = groups.filter((g) => g.title.toLowerCase().includes(keyword.toLowerCase())).map(toListItem);
  const { totalElements, totalPages, currentPage, items } = paginate(filtered, page, size);
  return ok({ totalElements, totalPages, currentPage, groups: items }, "그룹 검색에 성공하였습니다.");
};

export const mockGroupListResponse = getMockGroupList();

// GET /api/groups/me?problemId= — 필드명 alreadyAdded
export const mockMyGroupsResponse = ok(
  [
    { groupId: 1, title: "DK-기사단", alreadyAdded: true },
    { groupId: 2, title: "커널 해부학 스터디", alreadyAdded: false },
  ],
  "내 그룹 목록 조회 성공"
);

// POST /api/groups
export const mockGroupCreateResponse = ok({ groupId: 8 }, "그룹이 성공적으로 생성되었습니다.", 201);

// GET /api/groups/{groupId}
export const getMockGroupDetail = (groupId: number) => {
  const g = groups.find((x) => x.groupId === groupId);
  if (!g) return null;
  return ok(
    {
      groupId: g.groupId,
      title: g.title,
      description: g.description,
      imageUrl: null as string | null,
      tags: g.tags,
      stats: { memberCount: g.memberCount, problemCount: g.problemCount, contestCount: g.contestCount },
      settings: { isPrivate: g.isPrivate, isAutoApprove: g.isAutoApprove },
      userContext: { myStatus: g.myStatus, isLeader: g.leader === ME.nickname },
    },
    "그룹 상세 정보 조회 성공"
  );
};

// 상태별 대표 상세: 그룹장 / 일반 멤버 / 미가입 / 가입 대기
export const mockGroupDetailLeaderResponse = getMockGroupDetail(1)!;
export const mockGroupDetailMemberResponse = getMockGroupDetail(2)!;
export const mockGroupDetailNoneResponse = getMockGroupDetail(3)!;
export const mockGroupDetailPendingResponse = getMockGroupDetail(5)!;

export const mockGroupUpdateResponse = ok(null, "그룹 설정이 수정되었습니다.");
export const mockGroupDeleteResponse = ok(null, "그룹이 성공적으로 삭제(폐쇄)되었습니다.");
export const mockGroupImageResponse = ok(
  { imageUrl: "https://placehold.co/400x400/00A3FF/FFFFFF?text=DK" },
  "그룹 이미지 업로드 성공"
);

// GET / PATCH /api/groups/{groupId}/invite-code — 만료 30일
export const mockInviteCodeResponse = ok(
  { invitationCode: "3f2c9a1e-7b4d-4c2a-9e51-8d0f6a2b7c13", expiresAt: fromNow(24 * 30) },
  "초대코드 조회 성공"
);
export const mockInviteCodeReissueResponse = ok(
  { invitationCode: "a8e4d1f0-2c3b-4e5f-8a9b-0c1d2e3f4a5b", expiresAt: fromNow(24 * 30) },
  "초대코드 재발급 성공"
);

// POST /api/groups/join?code=
export const mockJoinByCodeResponse = ok(
  { userId: ME.userId, newStatus: "member", groupId: 2, groupTitle: "커널 해부학 스터디" },
  "그룹에 참여했습니다."
);
export const mockJoinByCodeAlreadyResponse = ok(
  { userId: ME.userId, newStatus: "already_member", groupId: 1, groupTitle: "DK-기사단" },
  "이미 가입된 그룹입니다."
);

// GET /api/groups/{groupId}/problems — ID 필드명이 problemId, 페이지당 10개
export const mockGroupProblemsResponse = ok(
  {
    currentPage: 1,
    totalPages: 1,
    problems: [
      { problemId: 1, title: "라운드로빈 스케줄링 구현", author: "박단용", solvedCount: 31, difficulty: "1", visibility: "public" },
      { problemId: 10, title: "데드락 발생 조건", author: "박단용", solvedCount: 18, difficulty: "3", visibility: "public" },
      { problemId: 11, title: "페이지 교체 LRU 구현", author: "메모리박사", solvedCount: 22, difficulty: "3", visibility: "public" },
      { problemId: 201, title: "[DK] 주간 과제: fork 트리 그리기", author: "박단용", solvedCount: 12, difficulty: "2", visibility: "group" },
      { problemId: 202, title: "[DK] 주간 과제: 세마포어 퀴즈", author: "Torvalds", solvedCount: 9, difficulty: "2", visibility: "group" },
    ],
  },
  "그룹 문제 목록 조회 성공"
);

export const mockGroupAddProblemResponse = ok(null, "문제가 그룹에 추가되었습니다.", 201);

// GET /api/groups/{groupId}/contests
export const mockGroupContestsResponse = ok(
  {
    currentPage: 1,
    totalPages: 1,
    contests: [
      { contestId: 4, title: "DK-기사단 11월 내부 모의고사", host: ME.nickname, startTime: fromNow(24 * 4), endTime: fromNow(24 * 4 + 3), status: "접수 중", participantCount: 12 },
      { contestId: 5, title: "DK-기사단 9월 내부 모의고사", host: ME.nickname, startTime: "2026-09-20T19:00:00", endTime: "2026-09-20T22:00:00", status: "종료", participantCount: 18 },
    ],
  },
  "그룹 전용 대회 목록 조회 성공"
);

// ---------- 멤버 ----------

export const mockGroupApplyResponse = ok({ userId: ME.userId, newStatus: "pending" }, "가입 신청이 완료되었습니다.");

// GET /api/groups/{groupId}/members
export const mockGroupMembersResponse = ok(
  {
    totalElements: 6,
    totalPages: 1,
    currentPage: 1,
    members: [
      { userId: ME.userId, nickname: ME.nickname, role: "LEADER", joinedAt: "2026-03-01T09:00:00" },
      { userId: 12, nickname: "Torvalds", role: "MEMBER", joinedAt: "2026-03-02T10:00:00" },
      { userId: 7, nickname: "Guido", role: "MEMBER", joinedAt: "2026-03-05T21:00:00" },
      { userId: 15, nickname: "Gosling", role: "MEMBER", joinedAt: "2026-04-11T13:00:00" },
      { userId: 21, nickname: "DanKook", role: "MEMBER", joinedAt: "2026-06-18T18:30:00" },
      { userId: 30, nickname: "CodeNewbie", role: "MEMBER", joinedAt: "2026-10-01T08:00:00" },
    ],
  },
  "멤버 목록 조회 성공"
);

// GET /api/groups/{groupId}/members/pending
export const mockGroupPendingResponse = ok(
  {
    totalElements: 3,
    totalPages: 1,
    currentPage: 1,
    pendingMembers: [
      { userId: 41, nickname: "ThreadLover", appliedAt: "2026-10-27T10:00:00" },
      { userId: 42, nickname: "MutexLock", appliedAt: "2026-10-28T15:20:00" },
      { userId: 43, nickname: "DevBeginner", appliedAt: "2026-10-29T09:05:00" },
    ],
  },
  "가입 대기자 목록 조회 성공"
);

export const mockGroupCancelApplyResponse = ok({ userId: ME.userId, newStatus: "CANCELED" }, "성공적으로 철회 되었습니다.");
export const mockGroupAcceptResponse = ok({ userId: 41, newStatus: "member" }, "가입 요청이 승인되었습니다.");
export const mockGroupRejectResponse = ok({ userId: 42, newStatus: "rejected" }, "가입 요청이 거절되었습니다.");
export const mockGroupLeaveResponse = ok({ userId: ME.userId, newStatus: "none" }, "성공적으로 탈퇴(또는 신청 철회) 되었습니다.");
export const mockGroupKickResponse = ok({ kickedUserId: 30 }, "해당 멤버를 성공적으로 강퇴했습니다.");

// ---------- 게시판 (createdAt은 yyyy.MM.dd) ----------

const posts = [
  { postId: 6, type: "notice", title: "11월 모의고사 일정 안내", author: ME.nickname, viewCount: 41, createdAt: "2026.10.28", content: "11월 첫째 주 일요일 19시에 그룹 대회를 진행합니다.\n대회 탭에서 미리 참가 신청해 주세요." },
  { postId: 5, type: "notice", title: "그룹 이용 규칙", author: ME.nickname, viewCount: 128, createdAt: "2026.03.01", content: "1. 풀이 코드 전체 공유 금지\n2. 질문은 게시판에 남겨주세요." },
  { postId: 4, type: "general", title: "LRU 문제 반례 공유합니다", author: "Torvalds", viewCount: 23, createdAt: "2026.10.26", content: "프레임 수가 1일 때를 꼭 확인해 보세요." },
  { postId: 3, type: "general", title: "세마포어 vs 뮤텍스 정리글", author: "Guido", viewCount: 57, createdAt: "2026.10.20", content: "세마포어는 카운터, 뮤텍스는 소유권 개념이 있다는 점이 핵심입니다." },
  { postId: 2, type: "general", title: "스터디 시간 변경 건의", author: "CodeNewbie", viewCount: 12, createdAt: "2026.10.15", content: "수요일 대신 목요일은 어떨까요?" },
  { postId: 1, type: "general", title: "가입 인사드립니다!", author: "DanKook", viewCount: 9, createdAt: "2026.06.18", content: "잘 부탁드립니다 🙇" },
];

// GET /api/groups/{groupId}/posts — 최신순(공지 먼저 정렬은 프론트 몫)
export const mockGroupPostsResponse = ok(
  {
    totalElements: posts.length,
    totalPages: 1,
    currentPage: 1,
    posts: posts.map(({ postId, type, title, author, viewCount, createdAt }) => ({ postId, type, title, author, viewCount, createdAt })),
  },
  "게시글 목록 조회 성공"
);

// GET /api/groups/{groupId}/posts/{postId}
export const getMockGroupPostDetail = (postId: number) => {
  const p = posts.find((x) => x.postId === postId);
  if (!p) return null;
  return ok(
    { postId: p.postId, type: p.type, title: p.title, content: p.content, author: p.author, createdAt: p.createdAt, isAuthor: p.author === ME.nickname },
    "게시글 상세 조회 성공"
  );
};

export const mockGroupPostCreateResponse = ok({ postId: 7 }, "게시글이 성공적으로 등록되었습니다.", 201);
export const mockGroupPostUpdateResponse = ok(null, "게시글이 성공적으로 수정되었습니다.");
export const mockGroupPostDeleteResponse = ok(null, "게시글이 삭제되었습니다.");

// GET /api/groups/{groupId}/posts/{postId}/comments
export const mockGroupPostCommentsResponse = ok(
  {
    totalElements: 3,
    comments: [
      { commentId: 1, author: "Guido", content: "참가 신청했습니다!", createdAt: "2026.10.28", isAuthor: false },
      { commentId: 2, author: ME.nickname, content: "문제 범위는 Process / Thread 입니다.", createdAt: "2026.10.28", isAuthor: true },
      { commentId: 3, author: "CodeNewbie", content: "초보도 참가 가능한가요?", createdAt: "2026.10.29", isAuthor: false },
    ],
  },
  "댓글 조회 성공"
);

export const mockGroupCommentCreateResponse = ok({ commentId: 4 }, "댓글이 등록되었습니다.", 201);
export const mockGroupCommentUpdateResponse = ok(null, "댓글이 성공적으로 수정되었습니다.");
export const mockGroupCommentDeleteResponse = ok(null, "댓글이 삭제되었습니다.");
