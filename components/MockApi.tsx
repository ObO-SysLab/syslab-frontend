"use client";

// NEXT_PUBLIC_ 값은 빌드 시점에 문자열로 치환되므로, 목 모드가 꺼진 빌드에서는
// 아래 require 분기가 통째로 제거되어 목 데이터가 번들에 들어가지 않는다.
const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK === "true";

// 모듈이 로드되는 시점(하이드레이션 전)에 설치해야 페이지의 첫 useEffect fetch부터 가로챌 수 있다.
// (useEffect 안에서 설치하면 자식 페이지의 effect가 먼저 실행되어 첫 요청을 놓친다)
if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@/lib/mock/install").installMockFetch();
}

export default function MockApi() {
  if (!USE_MOCK_API) return null;
  return (
    <div className="fixed bottom-3 left-3 z-[9999] rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-amber-950 shadow-lg pointer-events-none">
      MOCK API
    </div>
  );
}
