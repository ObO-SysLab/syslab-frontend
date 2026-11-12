import { describe, expect, it } from "vitest";
import { filterOwnProblems } from "./contestProblems";

const list = [
  { probId: 110, title: "FIFO 페이지 교체 과정 출력", category: "Memory" },
  { probId: 111, title: "라운드 로빈 스케줄링 실행 구간", category: "Process" },
  { probId: 96, title: "테스트", category: "kernel" },
];

describe("filterOwnProblems", () => {
  it("returns everything for an empty query", () => {
    expect(filterOwnProblems(list, "  ")).toHaveLength(3);
  });

  it("matches number with or without #, title, and category", () => {
    expect(filterOwnProblems(list, "#110").map((p) => p.probId)).toEqual([110]);
    expect(filterOwnProblems(list, "111").map((p) => p.probId)).toEqual([111]);
    expect(filterOwnProblems(list, "fifo").map((p) => p.probId)).toEqual([110]);
    expect(filterOwnProblems(list, "KERNEL").map((p) => p.probId)).toEqual([96]);
  });
});
