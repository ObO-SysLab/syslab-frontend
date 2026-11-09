// https://diveon.net/api/... 요청을 목 응답으로 바꿔 주는 라우터.
// installMockFetch()가 window.fetch를 감싸서 이 라우터로 보낸다.
import { ME, MOCK_TOKEN, fromNow, ok, toLocalIso } from "./common";
import * as profile from "./profile";
import * as problems from "./problems";
import * as subs from "./submissions";
import * as rank from "./rankings";
import * as groups from "./groups";
import * as contests from "./contests";
import * as vmAd from "./vmAd";

export const MOCK_API_ORIGIN = "https://diveon.net";

export type MockRequest = {
  method: string;
  url: URL;
  authorized: boolean;
  body: unknown; // JSON 본문은 파싱된 객체, FormData는 그대로
};

export type MockResult = { status: number; body: unknown };

const json = (body: unknown, status = 200): MockResult => ({ status, body });
const error = (status: number, message: string): MockResult => ({ status, body: { status, message, data: null } });
const notFound = (what = "리소스") => error(404, `${what}를 찾을 수 없습니다.`);

// ---------- 채점 상태 (새로고침해도 유지되도록 sessionStorage에 저장) ----------

type StoredSubmission = {
  submissionId: number;
  probId: number;
  probType: problems.ProblemType;
  contestId: number | null;
  isCorrect: boolean;
  answer: unknown;
  language: string | null;
  submittedAt: string;
  createdAtMs: number;
};

const STORE_KEY = "diveon-mock-submissions";
// PENDING → JUDGING → COMPLETED 전환 시점 (제출 후 경과 ms)
const JUDGING_AFTER_MS = 1500;
const COMPLETED_AFTER_MS = 4000;

const loadSubmissions = (): StoredSubmission[] => {
  try {
    return JSON.parse(sessionStorage.getItem(STORE_KEY) || "[]");
  } catch {
    return [];
  }
};

const saveSubmissions = (list: StoredSubmission[]) => {
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(list));
  } catch {
    // 저장 실패해도 목 동작에는 지장 없음
  }
};

const progressOf = (s: StoredSubmission) => {
  const elapsed = Date.now() - s.createdAtMs;
  if (elapsed >= COMPLETED_AFTER_MS) return { submissionStatus: "COMPLETED", progress: 100 };
  if (elapsed >= JUDGING_AFTER_MS) return { submissionStatus: "JUDGING", progress: 60 };
  return { submissionStatus: "PENDING", progress: 0 };
};

const sameArray = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i]);

const gradeAnswer = (probId: number, type: problems.ProblemType, answer: unknown) => {
  if (type === "objective") {
    const key = problems.mockObjectiveAnswers[probId] ?? [];
    const picked = (Array.isArray(answer) ? answer : []).map(Number);
    const sequential = [4, 13].includes(probId);
    return sequential ? sameArray(picked, key) : sameArray([...picked].sort(), [...key].sort());
  }
  if (type === "practice") return String(answer).trim() === problems.MOCK_PRACTICE_FLAG;
  // 코딩: 비어 있지 않으면 정답, 코드에 "WRONG"이 있으면 오답 (오답 흐름 테스트용)
  const code = String(answer ?? "");
  return code.trim().length > 0 && !code.includes("WRONG");
};

const addSubmission = (s: Omit<StoredSubmission, "submissionId" | "submittedAt" | "createdAtMs">) => {
  const list = loadSubmissions();
  const submissionId = 5000 + list.length + 1;
  const entry: StoredSubmission = { ...s, submissionId, submittedAt: toLocalIso(new Date()), createdAtMs: Date.now() };
  saveSubmissions([...list, entry]);
  return entry;
};

const findSubmission = (id: number) => loadSubmissions().find((s) => s.submissionId === id);

// 내 제출(완료된 것)을 채점 보드 항목 형식으로
const toBoardItem = (s: StoredSubmission) => ({
  submissionId: s.submissionId,
  nickname: ME.nickname,
  ...(s.probType === "coding"
    ? {
        language: s.language,
        isCorrect: s.isCorrect,
        score: s.isCorrect ? 100 : 0,
        runtime: 12,
        memoryUsage: 9200,
        codeSize: String(s.answer ?? "").length,
      }
    : { isCorrect: s.isCorrect }),
  submittedAt: s.submittedAt,
  judgedAt: s.submittedAt,
});

// ---------- 라우트 테이블 ----------

type Handler = (req: MockRequest, params: string[]) => MockResult;

type Route = {
  method: string;
  pattern: RegExp;
  handler: Handler;
  public?: boolean; // 토큰 없이 호출 가능
};

const n = (v: string) => Number(v);
const q = (req: MockRequest, key: string) => req.url.searchParams.get(key);
const qNum = (req: MockRequest, key: string, fallback: number) => Number(q(req, key) ?? fallback) || fallback;
const qBool = (req: MockRequest, key: string) => q(req, key) === "true";
const body = <T = Record<string, unknown>>(req: MockRequest) =>
  (req.body && typeof req.body === "object" && !(req.body instanceof FormData) ? req.body : {}) as T;

const routes: Route[] = [
  // ----- 인증 / 계정 (전부 성공 처리) -----
  { method: "POST", pattern: /^\/api\/(local\/)?auth\/google\/login$/, public: true, handler: () => json(profile.mockLoginResponse) },
  { method: "POST", pattern: /^\/api\/auth\/refresh$/, public: true, handler: () => json(profile.mockRefreshResponse) },
  { method: "POST", pattern: /^\/api\/auth\/logout$/, handler: () => json(profile.mockLogoutResponse) },
  { method: "GET", pattern: /^\/api\/auth\/check-(loginId|nickname)$/, public: true, handler: () => json(ok(null, "사용 가능합니다.")) },
  { method: "POST", pattern: /^\/api\/auth\/email\/(send|send-reset|verify)$/, public: true, handler: () => json(ok(null, "처리되었습니다.")) },
  { method: "POST", pattern: /^\/api\/auth\/email\/find-id$/, public: true, handler: () => json(ok({ loginId: "dypark" }, "아이디 조회 성공")) },
  { method: "POST", pattern: /^\/api\/auth\/email\/password\/reset$/, public: true, handler: () => json(ok(null, "비밀번호가 재설정되었습니다.")) },
  { method: "POST", pattern: /^\/api\/auth\/signup$/, public: true, handler: () => json(ok(null, "회원가입이 완료되었습니다.", 201), 201) },

  // ----- 프로필 -----
  { method: "GET", pattern: /^\/api\/profile\/show$/, handler: () => json(profile.mockProfileResponse) },
  { method: "PATCH", pattern: /^\/api\/profile$/, handler: () => json(profile.mockProfileUpdateResponse) },
  { method: "PATCH", pattern: /^\/api\/profile\/password$/, handler: () => json(profile.mockPasswordUpdateResponse) },
  { method: "POST", pattern: /^\/api\/users\/me\/profile-image$/, handler: () => json(profile.mockProfileImageResponse) },
  { method: "GET", pattern: /^\/api\/profile\/category-stats$/, handler: () => json(profile.mockCategoryStatsResponse) },
  { method: "GET", pattern: /^\/api\/profile\/problems\/solved$/, handler: () => json(profile.mockProfileSolvedResponse) },
  { method: "GET", pattern: /^\/api\/profile\/problems\/failed$/, handler: () => json(profile.mockProfileFailedResponse) },
  { method: "GET", pattern: /^\/api\/profile\/problems\/authored$/, handler: () => json(profile.mockProfileAuthoredResponse) },
  { method: "GET", pattern: /^\/api\/profile\/groups$/, handler: () => json(profile.mockProfileGroupsResponse) },
  { method: "GET", pattern: /^\/api\/profile\/contests$/, handler: () => json(profile.mockProfileContestsResponse) },

  // ----- 문제 -----
  {
    method: "GET",
    pattern: /^\/api\/problems$/,
    handler: (req) =>
      json(
        problems.getMockProblemList({
          page: qNum(req, "page", 1),
          title: q(req, "title") ?? undefined,
          type: q(req, "type") ?? undefined,
          category: q(req, "category") ?? undefined,
          difficulty: q(req, "difficulty") ?? undefined,
          onlyUnsolved: qBool(req, "onlyUnsolved"),
          onlyMine: qBool(req, "onlyMine"),
        })
      ),
  },
  { method: "GET", pattern: /^\/api\/problems\/today$/, handler: () => json(problems.mockTodayProblemResponse) },
  { method: "GET", pattern: /^\/api\/problems\/random$/, handler: () => json(problems.mockRandomProblemResponse) },
  { method: "GET", pattern: /^\/api\/problems\/recommend$/, handler: () => json(problems.mockRecommendProblemResponse) },
  { method: "GET", pattern: /^\/api\/problems\/obo$/, handler: () => json(problems.mockOboTemplatesResponse) },
  { method: "GET", pattern: /^\/api\/challenges\/obo$/, handler: () => json(problems.mockProblemOboResponse) },
  {
    method: "GET",
    pattern: /^\/api\/problems\/(\d+)$/,
    handler: (_req, [id]) => {
      const detail = problems.getMockProblemDetail(n(id));
      return detail ? json(detail) : notFound("문제");
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/problems\/(objective|coding|practice)$/,
    handler: (req, [type]) => {
      const title = req.body instanceof FormData ? String(req.body.get("title") ?? "") : String(body(req).title ?? "새 문제");
      return json(ok({ probId: 101, type, title, createdAt: toLocalIso(new Date()) }, "문제가 등록되었습니다.", 201), 201);
    },
  },
  {
    method: "PATCH",
    pattern: /^\/api\/problems\/(objective|coding|practice)\/(\d+)$/,
    handler: (req, [type, id]) =>
      json(ok({ probId: n(id), type, title: body(req).title ?? "", updatedAt: toLocalIso(new Date()) }, "문제가 수정되었습니다.")),
  },
  { method: "DELETE", pattern: /^\/api\/problems\/(\d+)$/, handler: (_req, [id]) => json(ok({ probId: n(id) }, "문제가 삭제되었습니다.")) },

  // ----- 문제 댓글 (메모리에서 실제로 추가/수정/삭제) -----
  {
    method: "GET",
    pattern: /^\/api\/problems\/(\d+)\/comments$/,
    handler: (req, [id]) => json(problems.getMockComments(n(id), qNum(req, "page", 1), qNum(req, "size", 20))),
  },
  {
    method: "GET",
    pattern: /^\/api\/problems\/(\d+)\/comments\/(\d+)$/,
    handler: (_req, [id, cid]) => {
      const detail = problems.getMockCommentDetail(n(id), n(cid));
      return detail ? json(detail) : notFound("댓글");
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/problems\/(\d+)\/comments$/,
    handler: (req, [id]) => {
      const { content, isPrivate, parentId } = body<{ content?: string; isPrivate?: boolean; parentId?: number }>(req);
      if (!content?.trim()) return error(400, "댓글 내용을 입력해 주세요.");
      const now = toLocalIso(new Date());
      const commentId = Math.max(0, ...problems.mockProblemComments.map((c) => c.commentId)) + 1;
      problems.mockProblemComments.push({
        commentId, probId: n(id), parentId: parentId ?? null, authorNickname: ME.nickname,
        content, isPrivate: !!isPrivate, createdAt: now, updatedAt: now,
      });
      return json(ok({ commentId, probId: n(id), authorNickname: ME.nickname, content, createdAt: now }, "댓글이 작성되었습니다.", 201), 201);
    },
  },
  {
    method: "PATCH",
    pattern: /^\/api\/problems\/(\d+)\/comments\/(\d+)$/,
    handler: (req, [id, cid]) => {
      const c = problems.mockProblemComments.find((x) => x.probId === n(id) && x.commentId === n(cid));
      if (!c) return notFound("댓글");
      if (c.authorNickname !== ME.nickname) return error(403, "작성자만 수정할 수 있습니다.");
      const { content, isPrivate } = body<{ content?: string; isPrivate?: boolean }>(req);
      if (content !== undefined) c.content = content;
      if (isPrivate !== undefined) c.isPrivate = isPrivate;
      c.updatedAt = toLocalIso(new Date());
      return json(ok({ commentId: c.commentId, content: c.content, isPrivate: c.isPrivate, updatedAt: c.updatedAt }, "댓글이 수정되었습니다."));
    },
  },
  {
    method: "DELETE",
    pattern: /^\/api\/problems\/(\d+)\/comments\/(\d+)$/,
    handler: (_req, [id, cid]) => {
      const list = problems.mockProblemComments;
      const c = list.find((x) => x.probId === n(id) && x.commentId === n(cid));
      if (!c) return notFound("댓글");
      if (c.authorNickname !== ME.nickname) return error(403, "작성자만 삭제할 수 있습니다.");
      // 원댓글을 지우면 대댓글도 함께 삭제
      for (let i = list.length - 1; i >= 0; i--) {
        if (list[i].commentId === c.commentId || list[i].parentId === c.commentId) list.splice(i, 1);
      }
      return json(ok({ commentId: c.commentId }, "댓글이 삭제되었습니다."));
    },
  },

  // ----- 채점 -----
  {
    method: "POST",
    pattern: /^\/api\/submissions\/grade$/,
    handler: (req) => {
      const { probId, answer, language } = body<{ probId?: number; answer?: unknown; language?: string }>(req);
      const type = problems.getMockProblemType(Number(probId));
      if (!type) return error(500, "존재하지 않는 문제입니다.");
      const s = addSubmission({
        probId: Number(probId), probType: type, contestId: null,
        isCorrect: gradeAnswer(Number(probId), type, answer), answer, language: language ?? null,
      });
      return json(subs.mockGradeResponse(s.probId, type, s.submissionId));
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/submissions\/(\d+)\/status$/,
    handler: (_req, [id]) => {
      const s = findSubmission(n(id));
      if (!s) return notFound("제출");
      return json(ok({ submissionId: String(s.submissionId), probId: s.probId, probType: s.probType, ...progressOf(s) }, "채점 상태 조회에 성공하였습니다."));
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/submissions\/(\d+)\/result$/,
    handler: (_req, [id]) => {
      const s = findSubmission(n(id));
      // 목에서 만든 제출이 아니면 유형별 샘플 결과를 돌려준다 (결과 페이지 단독 테스트용)
      if (!s) return json(subs.mockCodingResultResponse);
      if (progressOf(s).submissionStatus !== "COMPLETED") return error(409, "채점이 아직 완료되지 않았습니다.");
      const base = {
        submissionId: s.submissionId, probId: s.probId, probType: s.probType,
        isCorrect: s.isCorrect, correct: s.isCorrect, submittedAt: s.submittedAt, judgedAt: s.submittedAt,
      };
      if (s.probType === "objective") return json(ok({ ...base, selectedAnswers: s.answer }, "채점 결과 조회에 성공하였습니다."));
      if (s.probType === "coding") {
        const code = String(s.answer ?? "");
        return json(ok({ ...base, language: s.language, score: s.isCorrect ? 100 : 0, runtime: 12, memoryUsage: 9200, codeSize: code.length, code }, "채점 결과 조회에 성공하였습니다."));
      }
      return json(ok(base, "채점 결과 조회에 성공하였습니다."));
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/problems\/(\d+)\/board$/,
    handler: (req, [id]) => {
      const probId = n(id);
      const type = problems.getMockProblemType(probId);
      if (!type) return notFound("문제");
      const sample = type === "coding" ? subs.mockCodingBoardResponse.data.submissions : subs.mockObjectiveBoardResponse.data.submissions;
      // 완료된 내 제출을 최신순으로 앞에 붙인다
      const mine = loadSubmissions()
        .filter((s) => s.probId === probId && s.contestId === null && progressOf(s).submissionStatus === "COMPLETED")
        .reverse()
        .map(toBoardItem);
      let items: { isCorrect: boolean; submittedAt: string }[] = [...mine, ...sample];
      const result = q(req, "result");
      if (result === "correct") items = items.filter((s) => s.isCorrect);
      if (result === "wrong") items = items.filter((s) => !s.isCorrect);
      if (q(req, "sort") === "oldest") items = [...items].reverse();
      return json(ok({ probId, total: mine.length + sample.length, submissions: items }, "채점 보드 조회에 성공하였습니다."));
    },
  },

  // ----- 랭킹 -----
  { method: "GET", pattern: /^\/api\/problems\/(\d+)\/ranking$/, handler: () => json(rank.mockProblemRankingResponse) },
  { method: "GET", pattern: /^\/api\/groups\/ranking$/, public: true, handler: () => json(rank.mockGroupRankingResponse) },
  { method: "GET", pattern: /^\/api\/users\/ranking$/, handler: () => json(rank.mockUserRankingResponse) },

  // ----- 그룹 -----
  {
    method: "GET",
    pattern: /^\/api\/groups$/,
    public: true,
    handler: (req) => {
      if (qBool(req, "isJoined") && !req.authorized) return error(404, "사용자를 찾을 수 없습니다.");
      return json(groups.getMockGroupList({ page: qNum(req, "page", 1), size: qNum(req, "size", 5), tag: q(req, "tag") ?? undefined, isJoined: qBool(req, "isJoined") }));
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/groups\/search$/,
    public: true,
    handler: (req) => json(groups.getMockGroupSearch(q(req, "keyword") ?? "", qNum(req, "page", 1), qNum(req, "size", 5))),
  },
  { method: "GET", pattern: /^\/api\/groups\/me$/, handler: () => json(groups.mockMyGroupsResponse) },
  { method: "POST", pattern: /^\/api\/groups$/, handler: () => json(groups.mockGroupCreateResponse, 201) },
  {
    method: "POST",
    pattern: /^\/api\/groups\/join$/,
    handler: (req) => {
      const code = q(req, "code") ?? "";
      if (code === "expired") return error(410, "만료된 초대코드입니다.");
      if (code === "full") return error(409, "그룹 정원이 초과되었습니다.");
      if (code === groups.mockInviteCodeResponse.data.invitationCode) return json(groups.mockJoinByCodeAlreadyResponse);
      if (code.length < 4) return notFound("초대코드에 해당하는 그룹");
      return json(groups.mockJoinByCodeResponse);
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/groups\/(\d+)$/,
    public: true,
    handler: (req, [id]) => {
      const detail = groups.getMockGroupDetail(n(id));
      if (!detail) return notFound("그룹");
      // 비로그인이면 내 정보는 채워지지 않는다
      if (!req.authorized) return json({ ...detail, data: { ...detail.data, userContext: { myStatus: "none", isLeader: false } } });
      return json(detail);
    },
  },
  { method: "PATCH", pattern: /^\/api\/groups\/(\d+)$/, handler: () => json(groups.mockGroupUpdateResponse) },
  { method: "DELETE", pattern: /^\/api\/groups\/(\d+)$/, handler: () => json(groups.mockGroupDeleteResponse) },
  { method: "POST", pattern: /^\/api\/groups\/(\d+)\/image$/, handler: () => json(groups.mockGroupImageResponse) },
  { method: "GET", pattern: /^\/api\/groups\/(\d+)\/invite-code$/, handler: () => json(groups.mockInviteCodeResponse) },
  { method: "PATCH", pattern: /^\/api\/groups\/(\d+)\/invite-code$/, handler: () => json(groups.mockInviteCodeReissueResponse) },
  { method: "GET", pattern: /^\/api\/groups\/(\d+)\/problems$/, handler: () => json(groups.mockGroupProblemsResponse) },
  { method: "POST", pattern: /^\/api\/groups\/(\d+)\/problems$/, handler: () => json(groups.mockGroupAddProblemResponse, 201) },
  { method: "DELETE", pattern: /^\/api\/groups\/(\d+)\/problems\/(\d+)$/, handler: () => json(ok(null, "문제가 그룹에서 삭제되었습니다.")) },
  { method: "GET", pattern: /^\/api\/groups\/(\d+)\/contests$/, handler: () => json(groups.mockGroupContestsResponse) },
  { method: "POST", pattern: /^\/api\/groups\/(\d+)\/members$/, handler: () => json(groups.mockGroupApplyResponse) },
  { method: "GET", pattern: /^\/api\/groups\/(\d+)\/members$/, handler: () => json(groups.mockGroupMembersResponse) },
  { method: "GET", pattern: /^\/api\/groups\/(\d+)\/members\/pending$/, handler: () => json(groups.mockGroupPendingResponse) },
  { method: "PATCH", pattern: /^\/api\/groups\/(\d+)\/members\/pending\/me$/, handler: () => json(groups.mockGroupCancelApplyResponse) },
  {
    method: "PATCH",
    pattern: /^\/api\/groups\/(\d+)\/members\/pending\/(\d+)\/accept$/,
    handler: (_req, [, uid]) => json(ok({ userId: n(uid), newStatus: "member" }, "가입 요청이 승인되었습니다.")),
  },
  {
    method: "PATCH",
    pattern: /^\/api\/groups\/(\d+)\/members\/pending\/(\d+)\/reject$/,
    handler: (_req, [, uid]) => json(ok({ userId: n(uid), newStatus: "rejected" }, "가입 요청이 거절되었습니다.")),
  },
  { method: "DELETE", pattern: /^\/api\/groups\/(\d+)\/members\/me$/, handler: () => json(groups.mockGroupLeaveResponse) },
  {
    method: "DELETE",
    pattern: /^\/api\/groups\/(\d+)\/members\/(\d+)$/,
    handler: (_req, [, uid]) => json(ok({ kickedUserId: n(uid) }, "해당 멤버를 성공적으로 강퇴했습니다.")),
  },
  { method: "GET", pattern: /^\/api\/groups\/(\d+)\/posts$/, handler: () => json(groups.mockGroupPostsResponse) },
  {
    method: "GET",
    pattern: /^\/api\/groups\/(\d+)\/posts\/(\d+)$/,
    handler: (_req, [, pid]) => {
      const detail = groups.getMockGroupPostDetail(n(pid));
      return detail ? json(detail) : notFound("게시글");
    },
  },
  { method: "POST", pattern: /^\/api\/groups\/(\d+)\/posts$/, handler: () => json(groups.mockGroupPostCreateResponse, 201) },
  { method: "PATCH", pattern: /^\/api\/groups\/(\d+)\/posts\/(\d+)$/, handler: () => json(groups.mockGroupPostUpdateResponse) },
  { method: "DELETE", pattern: /^\/api\/groups\/(\d+)\/posts\/(\d+)$/, handler: () => json(groups.mockGroupPostDeleteResponse) },
  { method: "GET", pattern: /^\/api\/groups\/(\d+)\/posts\/(\d+)\/comments$/, handler: () => json(groups.mockGroupPostCommentsResponse) },
  { method: "POST", pattern: /^\/api\/groups\/(\d+)\/posts\/(\d+)\/comments$/, handler: () => json(groups.mockGroupCommentCreateResponse, 201) },
  { method: "PATCH", pattern: /^\/api\/groups\/(\d+)\/posts\/(\d+)\/comments\/(\d+)$/, handler: () => json(groups.mockGroupCommentUpdateResponse) },
  { method: "DELETE", pattern: /^\/api\/groups\/(\d+)\/posts\/(\d+)\/comments\/(\d+)$/, handler: () => json(groups.mockGroupCommentDeleteResponse) },

  // ----- 대회 -----
  {
    method: "GET",
    pattern: /^\/api\/contests$/,
    public: true,
    handler: (req) =>
      json(
        contests.getMockContestList({
          keyword: q(req, "keyword") ?? undefined,
          status: q(req, "status") ?? undefined,
          onlyJoined: qBool(req, "onlyJoined"),
          page: qNum(req, "page", 1),
          size: qNum(req, "size", 10),
        })
      ),
  },
  { method: "GET", pattern: /^\/api\/contests\/me\/owned$/, handler: () => json(contests.mockOwnedContestsResponse) },
  { method: "POST", pattern: /^\/api\/contests$/, handler: () => json(contests.mockContestCreateResponse, 201) },
  {
    method: "GET",
    pattern: /^\/api\/contests\/(\d+)$/,
    public: true,
    handler: (_req, [id]) => {
      const detail = contests.getMockContestDetail(n(id));
      return detail ? json(detail) : notFound("대회");
    },
  },
  { method: "PATCH", pattern: /^\/api\/contests\/(\d+)$/, handler: () => json(contests.mockContestUpdateResponse) },
  { method: "DELETE", pattern: /^\/api\/contests\/(\d+)$/, handler: () => json(contests.mockContestDeleteResponse) },
  { method: "POST", pattern: /^\/api\/contests\/(\d+)\/join$/, handler: () => json(contests.mockContestJoinResponse) },
  { method: "DELETE", pattern: /^\/api\/contests\/(\d+)\/leave$/, handler: () => json(contests.mockContestLeaveResponse) },
  {
    method: "GET",
    pattern: /^\/api\/contests\/(\d+)\/rankings$/,
    handler: (_req, [id]) => {
      const detail = contests.getMockContestDetail(n(id));
      const isOngoing = detail?.data.status === "진행 중";
      return json({ ...contests.mockContestRankingsResponse, data: { ...contests.mockContestRankingsResponse.data, contestId: n(id), isOngoing } });
    },
  },
  { method: "GET", pattern: /^\/api\/contests\/(\d+)\/problems$/, handler: () => json(contests.mockContestProblemsResponse) },
  { method: "PATCH", pattern: /^\/api\/contests\/(\d+)\/problems\/(\d+)\/points$/, handler: () => json(contests.mockContestPointsUpdateResponse) },
  { method: "DELETE", pattern: /^\/api\/contests\/(\d+)\/problems\/(\d+)$/, handler: () => json(contests.mockContestProblemRemoveResponse) },
  {
    method: "POST",
    pattern: /^\/api\/contests\/(\d+)\/problems\/(\d+)\/submit$/,
    handler: (req, [cid, cpid]) => {
      const detail = contests.getMockContestDetail(n(cid));
      if (detail?.data.status !== "진행 중") return error(403, "진행 중인 대회가 아닙니다.");
      const cp = contests.mockContestProblemsResponse.data.problems.find((p) => p.contestProblemId === n(cpid));
      if (!cp) return notFound("대회 문제");
      const type = problems.getMockProblemType(cp.problemId)!;

      // 쿨다운 30초: 같은 대회 문제에 최근 제출이 있으면 409
      const recent = loadSubmissions().find(
        (s) => s.contestId === n(cid) && s.probId === cp.problemId && Date.now() - s.createdAtMs < 30_000
      );
      if (recent) return error(409, "제출 쿨다운 중입니다. 잠시 후 다시 시도해 주세요.");

      const b = body<{ submissionType?: string; answer?: string; code?: string; language?: string }>(req);
      let answer: unknown = b.answer;
      if (b.submissionType === "OBJECTIVE") {
        const raw = String(b.answer ?? "");
        answer = raw.startsWith("[") ? JSON.parse(raw) : [Number(raw)];
      }
      if (b.submissionType === "CODING") answer = b.code;

      const s = addSubmission({
        probId: cp.problemId, probType: type, contestId: n(cid),
        isCorrect: gradeAnswer(cp.problemId, type, answer), answer, language: b.language ?? null,
      });
      const myScore = detail.data.userContext.myScore + (s.isCorrect ? cp.points : 0);
      if (type === "coding") return json(ok({ submissionId: s.submissionId, submissionStatus: "PENDING" }, "채점 요청이 접수되었습니다.", 202), 202);
      return json(ok({ submissionId: s.submissionId, submissionStatus: "COMPLETED", isCorrect: s.isCorrect, score: myScore, rank: s.isCorrect ? 6 : 7 }, "채점 요청이 접수되었습니다."));
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/contests\/(\d+)\/submissions\/(\d+)\/status$/,
    handler: (_req, [, sid]) => {
      const s = findSubmission(n(sid));
      if (!s) return notFound("제출");
      const prog = progressOf(s);
      const done = prog.submissionStatus === "COMPLETED";
      return json(ok({ submissionId: s.submissionId, ...prog, ...(done ? { isCorrect: s.isCorrect, score: s.isCorrect ? 550 : 350, rank: s.isCorrect ? 5 : 7 } : {}) }, "채점 상태 조회에 성공하였습니다."));
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/contests\/(\d+)\/submissions\/(\d+)\/result$/,
    handler: (_req, [, sid]) => {
      const s = findSubmission(n(sid));
      if (!s) return json(contests.mockContestSubmissionResultResponse);
      return json(ok({ submissionId: s.submissionId, language: s.language, code: String(s.answer ?? "") }, "제출 코드 조회에 성공하였습니다."));
    },
  },
  { method: "GET", pattern: /^\/api\/contests\/(\d+)\/participants$/, handler: () => json(contests.mockContestParticipantsResponse) },
  { method: "GET", pattern: /^\/api\/contests\/(\d+)\/participants\/banned$/, handler: () => json(contests.mockContestBannedResponse) },
  {
    method: "PATCH",
    pattern: /^\/api\/contests\/(\d+)\/participants\/(\d+)\/ban$/,
    handler: (req) => json(ok({ isBanned: !!body(req).isBanned }, "해당 참가자의 상태가 변경되었습니다.")),
  },
  { method: "PATCH", pattern: /^\/api\/contests\/(\d+)\/participants\/leadership\/transfer$/, handler: () => json(contests.mockContestTransferResponse) },
  { method: "GET", pattern: /^\/api\/contests\/(\d+)\/notices$/, public: true, handler: () => json(contests.mockContestNoticesResponse) },
  { method: "POST", pattern: /^\/api\/contests\/(\d+)\/notices$/, handler: () => json(contests.mockContestNoticeCreateResponse, 201) },
  { method: "PATCH", pattern: /^\/api\/contests\/(\d+)\/notices\/(\d+)$/, handler: () => json(ok(null, "공지사항이 수정되었습니다.")) },
  { method: "DELETE", pattern: /^\/api\/contests\/(\d+)\/notices\/(\d+)$/, handler: () => json(ok(null, "공지사항이 삭제되었습니다.")) },
  { method: "GET", pattern: /^\/api\/contests\/(\d+)\/qnas$/, handler: () => json(contests.mockContestQnasResponse) },
  { method: "POST", pattern: /^\/api\/contests\/(\d+)\/qnas$/, handler: () => json(contests.mockContestQnaCreateResponse, 201) },
  { method: "DELETE", pattern: /^\/api\/contests\/(\d+)\/qnas\/(\d+)$/, handler: () => json(ok(null, "질문이 삭제되었습니다.")) },
  { method: "PATCH", pattern: /^\/api\/contests\/(\d+)\/qnas\/(\d+)\/answers$/, handler: () => json(contests.mockContestAnswerResponse) },
  { method: "DELETE", pattern: /^\/api\/contests\/(\d+)\/qnas\/(\d+)\/answers\/(\d+)$/, handler: () => json(ok(null, "답변이 삭제되었습니다.")) },

  // ----- VM / 광고 -----
  { method: "GET", pattern: /^\/api\/vm\/status\/(\d+)$/, handler: () => json(vmAd.mockVmStatusNoneResponse) },
  {
    method: "POST",
    pattern: /^\/api\/vm\/create$/,
    handler: (req) => {
      const type = problems.getMockProblemType(Number(body(req).probId));
      if (type !== "practice") return notFound("실습 문제");
      return json(vmAd.mockVmCreateResponse, 201);
    },
  },
  { method: "DELETE", pattern: /^\/api\/vm\/stop$/, handler: () => json(vmAd.mockVmStopResponse) },
  { method: "POST", pattern: /^\/api\/vm\/reset$/, handler: () => json({ ...vmAd.mockVmResetResponse, data: { ...vmAd.mockVmResetResponse.data, expiresAt: fromNow(2) } }) },
  {
    method: "GET",
    pattern: /^\/api\/ad\/?$/,
    public: true,
    handler: (req) => {
      const placement = q(req, "placement") as vmAd.AdPlacement;
      if (!["main", "probList", "probDetail"].includes(placement)) {
        return json({ status: 200, message: "유효하지 않은 placement 값입니다. 허용값: main, probList, probDetail", data: null }, 400);
      }
      return json(vmAd.getMockAd(placement));
    },
  },
];

export const handleMockRequest = (req: MockRequest): MockResult => {
  const path = req.url.pathname;
  for (const route of routes) {
    if (route.method !== req.method) continue;
    const match = path.match(route.pattern);
    if (!match) continue;
    if (!route.public && !req.authorized) return error(401, "인증이 필요합니다.");
    return route.handler(req, match.slice(1));
  }
  return error(404, `[MOCK] 등록되지 않은 API입니다: ${req.method} ${path}`);
};

export { MOCK_TOKEN };
