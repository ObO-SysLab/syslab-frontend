import { describe, expect, it } from "vitest";
import { mergeCategoryScores } from "./categoryScores";

describe("mergeCategoryScores", () => {
  it("adds up the same category written differently", () => {
    // 2026-11-12 운영 응답 그대로: File System 10점이 0으로 보이던 경우
    const merged = mergeCategoryScores({ Process: 0, Memory: 0, Kernel: 0, Thread: 0, FileSystem: 0, "file system": 10, kernel: 90, memory: 50 });
    expect(merged).toEqual({ process: 0, memory: 50, kernel: 90, thread: 0, filesystem: 10 });
  });

  it("ignores missing or non-numeric values", () => {
    expect(mergeCategoryScores(null)).toEqual({});
    expect(mergeCategoryScores({ Kernel: "x", kernel: 20 })).toEqual({ kernel: 20 });
  });
});
