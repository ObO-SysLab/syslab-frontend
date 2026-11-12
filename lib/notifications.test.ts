import { describe, expect, it } from "vitest";
import { badgeCount, relativeTime, safeLink } from "./notifications";

describe("notification helpers", () => {
  const now = new Date(2026, 10, 12, 18, 0, 0);

  it("formats relative time from server local time", () => {
    expect(relativeTime("2026-11-12T17:59:30", now)).toBe("방금");
    expect(relativeTime("2026-11-12T17:45:00.123", now)).toBe("15분 전");
    expect(relativeTime("2026-11-12T15:00:00", now)).toBe("3시간 전");
    expect(relativeTime("2026-11-10T18:00:00", now)).toBe("2일 전");
    expect(relativeTime("2026-10-01T18:00:00", now)).toBe("10/01");
    expect(relativeTime("nope", now)).toBe("");
  });

  it("follows only in-site links", () => {
    expect(safeLink("/challenges/detail?id=1&tab=comments")).toBe("/challenges/detail?id=1&tab=comments");
    expect(safeLink("//evil.example")).toBeNull();
    expect(safeLink("https://evil.example")).toBeNull();
    expect(safeLink(null)).toBeNull();
  });

  it("caps the badge", () => {
    expect(badgeCount(3)).toBe("3");
    expect(badgeCount(120)).toBe("99+");
  });
});
