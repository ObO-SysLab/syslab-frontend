// window.fetch를 감싸서 https://diveon.net/api/... 요청만 목 라우터로 보낸다.
// 그 외 요청(Monaco CDN, 구글 등)은 원래 fetch로 그대로 나간다.
import { ME, MOCK_TOKEN } from "./common";
import { MOCK_API_ORIGIN, handleMockRequest } from "./router";

// 켜는 방법: Diveon/.env.local에 NEXT_PUBLIC_USE_MOCK=true 를 넣고 dev 서버 재시작.
// 설치는 components/MockApi.tsx가 담당한다.

// 응답 지연(ms) — 로딩 상태를 눈으로 확인할 수 있게
const LATENCY_MS = 250;

const AUTO_LOGIN_KEY = "diveon-mock-auto-login";

let installed = false;

const readBody = async (input: RequestInfo | URL, init?: RequestInit): Promise<unknown> => {
  const raw = init?.body ?? (input instanceof Request ? await input.clone().text() : undefined);
  if (raw == null) return undefined;
  if (raw instanceof FormData) return raw;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
};

const readAuthorization = (input: RequestInfo | URL, init?: RequestInit) => {
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
  const auth = headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  // 페이지가 토큰 없이 `Bearer null`을 보내는 경우가 있어 문자열 값도 걸러낸다
  return token.length > 0 && token !== "null" && token !== "undefined";
};

export const installMockFetch = () => {
  if (installed || typeof window === "undefined") return;
  installed = true;

  // 탭을 처음 열 때 한 번만 자동 로그인 (로그아웃하면 그 탭에서는 로그아웃 상태 유지)
  try {
    if (!sessionStorage.getItem(AUTO_LOGIN_KEY)) {
      sessionStorage.setItem(AUTO_LOGIN_KEY, "1");
      if (!localStorage.getItem("token")) {
        localStorage.setItem("token", MOCK_TOKEN);
        localStorage.setItem("nickname", ME.nickname);
      }
    }
  } catch {
    // 스토리지 접근 불가 환경이면 자동 로그인만 건너뛴다
  }

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!rawUrl.startsWith(`${MOCK_API_ORIGIN}/api`)) return originalFetch(input, init);

    const url = new URL(rawUrl);
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    const result = handleMockRequest({
      method,
      url,
      authorized: readAuthorization(input, init),
      body: await readBody(input, init),
    });

    await new Promise((r) => setTimeout(r, LATENCY_MS));
    console.log(`[MOCK] ${method} ${url.pathname}${url.search} → ${result.status}`, result.body);

    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: { "Content-Type": "application/json" },
    });
  };

  console.info("[MOCK] 목 API 모드가 켜져 있습니다. (NEXT_PUBLIC_USE_MOCK=true)");
};
