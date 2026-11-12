import { beforeEach, describe, expect, it, vi } from "vitest";
import { __resetCosmeticsForTest, cachedCosmetics, forgetCosmetics, frameClass, loadCosmetics, themeClass } from "./cosmetics";

const ok = (data: unknown) => ({ ok: true, json: async () => ({ data }) });

describe("cosmetics cache", () => {
  beforeEach(() => __resetCosmeticsForTest());

  it("asks only for users it has not seen, in one request", async () => {
    const fetcher = vi.fn().mockResolvedValue(ok([{ userId: 13, title: "title-root-access", titleName: "Root Access" }]));
    await loadCosmetics([13, 14, 13], fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toContain("userIds=13,14");
    expect(cachedCosmetics(13)?.titleName).toBe("Root Access");
    expect(cachedCosmetics(14)).toBeNull();
    await loadCosmetics([13, 14], fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("splits large lists into batches of 100", async () => {
    const fetcher = vi.fn().mockResolvedValue(ok([]));
    await loadCosmetics(Array.from({ length: 150 }, (_, i) => i + 1), fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("keeps defaults when the request fails and refetches after forgetting", async () => {
    const failing = vi.fn().mockResolvedValue({ ok: false, json: async () => null });
    await loadCosmetics([7], failing);
    expect(cachedCosmetics(7)).toBeNull();
    const fetcher = vi.fn().mockResolvedValue(ok([{ userId: 7, avatar: "frame-neon" }]));
    await loadCosmetics([7], fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    forgetCosmetics(7);
    await loadCosmetics([7], fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("maps asset keys to known class names only", () => {
    expect(frameClass("frame-neon")).toBe("dv-frame-neon");
    expect(themeClass("theme-ocean-drive")).toBe("dv-theme-ocean-drive");
    expect(frameClass("title-root-access")).toBe("");
    expect(frameClass("frame-x; color:red")).toBe("");
    expect(themeClass(null)).toBe("");
  });
});
