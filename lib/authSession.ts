import { problemApi, problemToken } from './problemApi';

export const BEFORE_LOGOUT = 'diveon:before-logout';
export const AUTH_CHANGED = 'diveon:auth-changed';

/** Local namespace only; authorization remains the server's responsibility. */
export function draftAccount(token: string | null): string | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    const id = payload.sub ?? payload.userId;
    return (typeof id === 'string' || typeof id === 'number') && String(id) ? String(id) : null;
  } catch { return null; }
}

export function clearAuthentication(local: Storage, session: Storage) {
  for (const key of ['token', 'nickname', 'userImgUrl']) local.removeItem(key);
  session.removeItem('obo:preview:token');
  clearPendingSubmissions(session);
}

export function clearPendingSubmissions(session: Storage) {
  // These markers belonged to the outgoing session, not to its durable drafts.
  for (let i = session.length - 1; i >= 0; i--) {
    const key = session.key(i);
    if (key?.startsWith('pending_sub_')) session.removeItem(key);
  }
}

export function pendingSubmissionKey(problem: string, token: string | null): string | null {
  const account = draftAccount(token);
  return account ? `pending_sub_${encodeURIComponent(account)}:${encodeURIComponent(problem)}` : null;
}

export function pendingSubmission(problem: string): string | null {
  try { const key = pendingSubmissionKey(problem, problemToken()); return key ? sessionStorage.getItem(key) : null; } catch { return null; }
}

export function rememberSubmission(problem: string, id: string | number, token: string | null) {
  const key = pendingSubmissionKey(problem, token);
  try { if (key) sessionStorage.setItem(key, String(id)); } catch { /* Server receipt is independent of browser storage. */ }
}

export function forgetSubmission(problem: string) {
  try { const key = pendingSubmissionKey(problem, problemToken()); if (key) sessionStorage.removeItem(key); } catch { /* Optional local marker. */ }
}

/** Synchronous local boundary; never waits for an unavailable logout server. */
export function logout(): boolean {
  if (!window.dispatchEvent(new Event(BEFORE_LOGOUT, { cancelable: true }))) return false;
  let token: string | null = null;
  try {
    token = problemToken();
    clearAuthentication(localStorage, sessionStorage);
  } catch {
    window.alert('인증 정보를 지우지 못했습니다. 브라우저 저장소 설정을 확인해 주세요.');
    return false;
  }
  window.dispatchEvent(new Event(AUTH_CHANGED));
  if (token) {
    void fetch(problemApi('/api/auth/logout'), {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }, keepalive: true,
    }).then(response => {
      if (!response.ok && response.status !== 401) throw new Error('logout');
    }).catch(() => window.alert('이 브라우저에서는 로그아웃했습니다. 서버 세션 종료는 확인하지 못했습니다.'));
  }
  return true;
}
