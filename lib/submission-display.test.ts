import { describe, expect, it } from "vitest";
import { submissionTierLabel } from "./submission-display";

describe("submission user tier", () => {
  it("uses the submitter's tier independently of leaderboard position", () => {
    const row = { rank: 1, userTier: 6 };
    expect(submissionTierLabel(row.userTier)).toBe("Master");
  });

  it.each([undefined, null, 0, 8, NaN, 1.5])("shows an empty marker for unavailable tier %s", userTier => {
    expect(submissionTierLabel(userTier)).toBe("—");
  });
});
