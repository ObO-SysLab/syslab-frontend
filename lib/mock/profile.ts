// references/auth_profile.md
import { ME, MOCK_TOKEN, fromNow, ok } from "./common";
import { mockProblemList } from "./problems";
import { mockGroupList } from "./groups";

// POST /api/auth/google/login
// 명세 6번(로그인) 본문이 references에 없어 signin 페이지가 읽는 필드(data.accessToken, data.userInfo.*) 기준으로 작성
export const mockLoginResponse = ok(
  {
    accessToken: MOCK_TOKEN,
    refreshToken: "mock-refresh-token",
    userInfo: {
      nickname: ME.nickname,
      profileImgUrl: ME.profileImgUrl,
    },
  },
  "로그인에 성공하였습니다."
);

// POST /api/auth/refresh — data는 토큰 문자열 하나
export const mockRefreshResponse = ok(MOCK_TOKEN, "토큰이 재발급되었습니다.");

// POST /api/auth/logout
export const mockLogoutResponse = ok(null, "로그아웃되었습니다.");

// GET /api/profile/show
export const mockProfileResponse = ok(
  {
    userInfo: {
      nickname: ME.nickname,
      profileImgUrl: ME.profileImgUrl,
      selfComment: "커널 공부 중인 심해 다이버입니다.",
      createdAt: "2026-03-05T00:00:00",
      email: "dy.park@dankook.ac.kr",
      belong: "단국대학교 소프트웨어학과",
      interest: ["Digital Forensics", "Cyber Investigation"],
    },
  },
  "성공"
);

// PATCH /api/profile, PATCH /api/profile/password
export const mockProfileUpdateResponse = ok(null, "프로필이 수정되었습니다.");
export const mockPasswordUpdateResponse = ok(null, "비밀번호가 변경되었습니다.");

// POST /api/users/me/profile-image
export const mockProfileImageResponse = ok(
  { imageUrl: "https://placehold.co/200x200/0066FF/FFFFFF?text=DY" },
  "프로필 이미지 업로드 성공"
);

// GET /api/profile/category-stats
export const mockCategoryStatsResponse = ok(
  {
    categoryScores: { Process: 110, Memory: 80, Kernel: 30, Thread: 0, FileSystem: 50 },
    categoryMax: 1080,
  },
  "카테고리별 점수 조회에 성공하였습니다."
);

// GET /api/profile/problems/{solved|failed|authored} — 페이지당 20개
const profileProblemPage = (problems: typeof mockProblemList) =>
  ok({
    total: problems.length,
    page: 1,
    pageSize: 20,
    totalPages: Math.max(1, Math.ceil(problems.length / 20)),
    problems: problems.slice(0, 20),
  });

export const mockProfileSolvedResponse = profileProblemPage(mockProblemList.filter((p) => p.isSolved));
export const mockProfileFailedResponse = profileProblemPage(
  mockProblemList.filter((p) => !p.isSolved && [5, 8, 10].includes(p.probId))
);
export const mockProfileAuthoredResponse = profileProblemPage(
  mockProblemList.filter((p) => p.author === ME.nickname)
);

// GET /api/profile/groups
const myGroups = mockGroupList.filter((g) => g.joined);
export const mockProfileGroupsResponse = ok({
  total: myGroups.length,
  page: 1,
  pageSize: 20,
  totalPages: 1,
  groups: myGroups.map((g) => ({
    groupId: g.groupId,
    title: g.title,
    image: null as string | null,
    role: g.leader === ME.nickname ? "LEADER" : "MEMBER",
    isPrivate: g.isPrivate,
    memberCount: g.memberCount,
  })),
});

// GET /api/profile/contests — status는 영문 대문자, role은 ADMIN/PARTICIPANT
export const mockProfileContestsResponse = ok({
  total: 3,
  page: 1,
  pageSize: 20,
  totalPages: 1,
  contests: [
    { contestId: 1, title: "제1회 DiveOn 커널 다이빙 챌린지", startTime: fromNow(-3), endTime: fromNow(5), status: "ONGOING", role: "PARTICIPANT" },
    { contestId: 4, title: "DK-기사단 11월 내부 모의고사", startTime: fromNow(24 * 4), endTime: fromNow(24 * 4 + 3), status: "UPCOMING", role: "ADMIN" },
    { contestId: 3, title: "2026 상반기 OS 경진대회", startTime: "2026-05-16T09:00:00", endTime: "2026-05-16T18:00:00", status: "ENDED", role: "PARTICIPANT" },
  ],
});
