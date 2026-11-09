// API 명세(references/) 형태 그대로의 목 응답 모음.
// 각 값은 fetch 후 `await res.json()` 결과와 같은 모양이다. (예: result.data.problems)
// 기존 lib/mockData.ts는 화면용 가공 데이터라 형태가 다르다 — 새 목 연동은 이 모듈을 쓴다.
export * from "./common";
export * from "./profile";
export * from "./problems";
export * from "./submissions";
export * from "./rankings";
export * from "./groups";
export * from "./contests";
export * from "./vmAd";
