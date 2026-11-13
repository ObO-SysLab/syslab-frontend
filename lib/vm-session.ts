export type VmSession = { sessionId: number; containerId: string; expiresAtEpochMs: number };

export function readVmSession(value: unknown): VmSession {
  const data = value as Partial<VmSession> | null;
  if (!data || !Number.isSafeInteger(data.sessionId) || data.sessionId! <= 0
      || typeof data.containerId !== "string" || !/^[a-f0-9]{64}$/.test(data.containerId)
      || !Number.isSafeInteger(data.expiresAtEpochMs) || data.expiresAtEpochMs! <= 0) {
    throw new Error("실습 세션 정보를 확인할 수 없습니다. 새로고침 후 다시 시도해주세요.");
  }
  return data as VmSession;
}

/** Replaces the displayed session with a fresh container from the same image (work is discarded). */
export async function resetVmSession(probId: number, sessionId: number | null, token: string | null): Promise<VmSession> {
  if (!Number.isSafeInteger(probId) || probId <= 0 || !Number.isSafeInteger(sessionId) || sessionId! <= 0 || !token) {
    throw new Error("초기화할 실습 세션을 확인할 수 없습니다.");
  }
  const response = await fetch("https://diveon.net/api/vm/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({ probId, sessionId }),
  });
  if (!response.ok) throw new Error("실습 환경을 초기화하지 못했습니다. 잠시 후 다시 시도해주세요.");
  return readVmSession((await response.json())?.data);
}

// Capture the displayed session, never infer the latest session from a problem ID.
export async function stopVmSession(probId: number, sessionId: number | null, token: string | null) {
  if (!Number.isSafeInteger(probId) || probId <= 0 || !Number.isSafeInteger(sessionId) || sessionId! <= 0 || !token) {
    throw new Error("종료할 실습 세션을 확인할 수 없습니다.");
  }
  const response = await fetch("https://diveon.net/api/vm/stop", {
    method: "DELETE",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({ probId, sessionId }),
  });
  if (!response.ok) throw new Error("실습 종료를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.");
}
