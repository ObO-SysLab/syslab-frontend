import { describe, expect, it } from "vitest";
import { activityStatus, activityTime, parseActivity } from "./activity";

describe("activity log helpers", () => {
  it("maps result status to short codes", () => {
    expect(activityStatus("CORRECT")).toEqual({ code: "AC", tone: "success" });
    expect(activityStatus("WRONG")).toEqual({ code: "WA", tone: "danger" });
    expect(activityStatus("ERROR").code).toBe("ERR");
    expect(activityStatus("TIMEOUT").code).toBe("TIM");
  });

  it("shows time of day for today and date otherwise", () => {
    const now = new Date(2026, 10, 12, 16, 0, 0);
    expect(activityTime("2026-11-12T15:02:11.771", now)).toBe("15:02:11");
    expect(activityTime("2026-11-10T09:05:00", now)).toBe("11/10 09:05");
    expect(activityTime(null, now)).toBe("--:--:--");
    expect(activityTime("bad", now)).toBe("--:--:--");
  });

  it("keeps only well-formed rows", () => {
    const rows = parseActivity({ data: { activities: [
      { resultId: 3, resultStatus: "CORRECT", submittedAt: null, userId: 1, nickname: "a", probId: 112, title: "t" },
      { resultId: "x" },
      null,
    ] } });
    expect(rows.map((r) => r.resultId)).toEqual([3]);
    expect(parseActivity(null)).toEqual([]);
  });
});
