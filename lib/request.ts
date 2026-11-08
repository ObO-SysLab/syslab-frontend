import { problemToken } from './problemApi';

export function authHeaders(): Record<string, string> {
  const token = problemToken(); return token ? { Authorization: `Bearer ${token}` } : {};
}

export type RequestIssue = {
  kind: 'http' | 'network' | 'offline' | 'timeout' | 'format';
  message: string;
  status?: number;
  retryable: boolean;
  uncertain?: boolean;
};

export class RequestFailure extends Error {
  constructor(public issue: RequestIssue) { super(issue.message); this.name = 'RequestFailure'; }
}

export function httpIssue(status: number, mutation = false, retryAfter?: string | null): RequestIssue {
  const messages: Record<number, string> = {
    400: '입력 내용을 확인해 주세요. 요청 형식이나 값이 올바르지 않습니다.',
    401: '로그인이 만료되었거나 필요합니다. 작성 내용은 유지됩니다. 로그인 후 이 화면으로 돌아올 수 있습니다.',
    403: '이 자료에 접근할 권한이 없습니다. 계정이나 공개 범위를 확인해 주세요.',
    404: '요청한 자료를 찾을 수 없습니다. 주소를 확인하거나 목록으로 돌아가 주세요.',
    409: '자료가 변경되었거나 현재 상태에서는 처리할 수 없습니다. 작성 내용을 보관하고 최신 자료를 확인해 주세요.',
    429: '요청이 많습니다. 잠시 기다린 뒤 다시 시도해 주세요.',
  };
  let message = messages[status] ?? (status >= 500 ? '서버에서 요청을 처리하지 못했습니다. 잠시 후 다시 확인해 주세요.' : '요청을 처리하지 못했습니다. 입력 내용과 접근 권한을 확인해 주세요.');
  if(mutation && status >= 500)message = '서버 오류 응답으로 저장·제출 결과를 확인하지 못했습니다.';
  if (status === 429 && retryAfter && /^\d+$/.test(retryAfter)) message += ` 약 ${Math.min(Number(retryAfter), 3600)}초 뒤 다시 시도해 주세요.`;
  return { kind: 'http', status, message, retryable: status === 429 || status >= 500, uncertain: mutation && status >= 500 };
}

export function requestIssue(error: unknown, mutation = false): RequestIssue {
  if (error instanceof RequestFailure) return error.issue;
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  return { kind: offline ? 'offline' : 'network', message: offline ? '인터넷 연결이 끊겼습니다. 연결을 확인한 뒤 다시 시도해 주세요.' : mutation ? '요청의 응답을 받지 못했습니다. 네트워크 연결을 확인해 주세요.' : '서버에 연결하지 못했습니다. 네트워크 연결을 확인해 주세요.', retryable: true, uncertain: mutation };
}
export const isRequestCancelled = (error: unknown) => error instanceof Error && error.name === 'AbortError';

/** One request only. No automatic retries, including POST/PATCH. Never display server bodies. */
export async function requestJson<T = any>(url: string, init: RequestInit = {}, options: { timeoutMs?: number; allowEmpty?: boolean } = {}): Promise<T> {
  const mutation = !['GET', 'HEAD'].includes((init.method ?? 'GET').toUpperCase());
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  let cancel: () => void = () => {};
  const interrupted = new Promise<never>((_, reject) => {
    cancel = () => { controller.abort(); reject(new DOMException('Request cancelled', 'AbortError')); };
    init.signal?.addEventListener('abort', cancel, { once: true });
    if (init.signal?.aborted) cancel();
    timer = setTimeout(() => {
      reject(new RequestFailure({ kind: 'timeout', message: '응답을 기다리는 시간이 길어져 응답 대기를 중단했습니다. 다시 확인해 주세요.', retryable: true, uncertain: mutation }));
      controller.abort();
    }, options.timeoutMs ?? 15000);
  });
  const request = async () => {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) throw new RequestFailure(httpIssue(response.status, mutation, response.headers.get('retry-after')));
    const text = await response.text();
    if (!text && options.allowEmpty) return null as T;
    try { return JSON.parse(text) as T; }
    catch { throw new RequestFailure({ kind: 'format', message: '서버 응답 형식을 확인하지 못했습니다. 다시 확인해 주세요.', retryable: true, uncertain: mutation }); }
  };
  try { return await Promise.race([request(), interrupted]); }
  catch (error) {
    if (error instanceof RequestFailure || isRequestCancelled(error)) throw error;
    throw new RequestFailure(requestIssue(error, mutation));
  } finally {
    clearTimeout(timer!);
    init.signal?.removeEventListener('abort', cancel);
  }
}

export function safeReturnPath(value: string | null | undefined, fallback = '/') {
  if (!value?.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value)) return fallback;
  try { const url = new URL(value, 'https://local.invalid'); return url.origin === 'https://local.invalid' ? url.pathname + url.search + url.hash : fallback; }
  catch { return fallback; }
}
export function loginHref(returnTo?: string) {
  const path = returnTo ?? (typeof window === 'undefined' ? '/challenges' : window.location.pathname + window.location.search);
  return '/signin?next=' + encodeURIComponent(safeReturnPath(path, '/challenges'));
}
