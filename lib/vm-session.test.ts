import { afterEach, describe, expect, it, vi } from "vitest";
import { readVmSession, stopVmSession } from "./vm-session";

afterEach(() => vi.unstubAllGlobals());
describe("VM session contract", () => {
  it("retains server identity and absolute expiry", () => {
    const value = { sessionId: 12, containerId: "a".repeat(64), expiresAtEpochMs: 1900000000000 };
    expect(readVmSession(value)).toEqual(value);
  });
  it.each([null, {}, { sessionId: 12 }, { sessionId: -1 }, { sessionId: 1.5 }, { sessionId: Number.MAX_SAFE_INTEGER + 1 }])(
    "rejects missing or ambiguous session data: %j", value => expect(() => readVmSession(value)).toThrow());
  it("sends the original session even if a newer session exists", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true }); vi.stubGlobal("fetch", fetcher);
    await stopVmSession(9, 12, "login");
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ probId: 9, sessionId: 12 });
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBe("Bearer login");
  });
  it.each([null, 0, -1, 1.5])("never falls back to problem-only deletion: %s", async id => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    await expect(stopVmSession(9, id, "login")).rejects.toThrow(); expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([404, 409, 503])("does not claim cleanup succeeded after HTTP %s", async status => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status }));
    await expect(stopVmSession(9, 12, "login")).rejects.toThrow();
  });
});
