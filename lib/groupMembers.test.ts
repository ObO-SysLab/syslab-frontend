import { describe, expect, it } from "vitest";
import { hallOfFame, memberRanks } from "./groupMembers";

const m = (userId: number, nickname: string, score?: number | null) => ({ userId, nickname, score });

describe("group member ranking", () => {
  it("ranks by score with shared ranks for ties", () => {
    const ranks = memberRanks([m(1, "a", 50), m(2, "b", 240), m(3, "c", 50), m(4, "d", 0)]);
    expect(ranks.get(2)).toBe(1);
    expect(ranks.get(1)).toBe(2);
    expect(ranks.get(3)).toBe(2);
    expect(ranks.get(4)).toBe(4);
  });

  it("hall of fame keeps only scored members, top three", () => {
    const top = hallOfFame([m(1, "a", 10), m(2, "b", 240), m(3, "c", 0), m(4, "d", 90), m(5, "e", 70)]);
    expect(top.map((x) => x.nickname)).toEqual(["b", "d", "e"]);
    expect(top.map((x) => x.rank)).toEqual([1, 2, 3]);
  });

  it("hall of fame is empty when nobody has points", () => {
    expect(hallOfFame([m(1, "a", 0), m(2, "b", null), m(3, "c")])).toEqual([]);
  });
});
