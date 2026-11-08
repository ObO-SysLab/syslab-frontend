import { problemApi } from './problemApi';

export type PracticeBuild = {
  status: 'PENDING' | 'READY' | 'FAILED' | 'UNAVAILABLE';
  canStart: boolean;
};

export function readPracticeBuild(value: unknown): PracticeBuild {
  const state = value as Partial<PracticeBuild> | null;
  if (!state || !['PENDING', 'READY', 'FAILED', 'UNAVAILABLE'].includes(state.status ?? '')
      || typeof state.canStart !== 'boolean') return { status: 'UNAVAILABLE', canStart: false };
  return { status: state.status!, canStart: state.status === 'READY' && state.canStart };
}

export function practiceBuildPresentation(state: PracticeBuild) {
  switch (state.status) {
    case 'PENDING': return { label: '실습 환경 제작 중', message: '완료되면 실습을 시작할 수 있습니다. 이 화면에서 상태를 자동으로 확인합니다.' };
    case 'READY': return { label: '실습 환경 제작 완료', message: state.canStart ? '실습을 시작할 수 있습니다.' : '현재 계정으로 이 실습을 시작할 수 없습니다.' };
    case 'FAILED': return { label: '실습 환경 제작 실패', message: '실습 환경을 만들지 못했습니다. 업로드한 자료를 확인하거나 운영자에게 문의해 주세요.' };
    default: return { label: '제작 상태 확인 필요', message: '실습 환경의 준비 상태를 확인한 뒤 시작할 수 있습니다.' };
  }
}

/** Poll only pending builds, one request at a time, for at most ten minutes. */
export function watchPracticeBuild(options: {
  probId: string; token: string | null;
  onUpdate: (state: PracticeBuild) => void;
  onError: (message: string) => void;
}) {
  let closed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let request: AbortController | undefined;
  const expiresAt = Date.now() + 10 * 60 * 1000;
  const load = async () => {
    if (closed) return;
    if (Date.now() >= expiresAt) {
      options.onError('자동 확인을 종료했습니다. 다시 확인 버튼으로 최신 상태를 확인할 수 있습니다.');
      return;
    }
    request = new AbortController();
    const deadline = setTimeout(() => request?.abort(), 10000);
    try {
      if (!/^\d+$/.test(options.probId) || Number(options.probId) < 1) throw new Error('invalid problem');
      const headers: HeadersInit = {};
      if (options.token) headers.Authorization = `Bearer ${options.token}`;
      const response = await fetch(problemApi(`/api/problems/${options.probId}`), {
        headers, signal: request.signal, cache: 'no-store',
      });
      if (!response.ok) throw new Error('status unavailable');
      const data = (await response.json()).data;
      if (closed) return;
      const state = readPracticeBuild(data?.practiceBuild);
      options.onUpdate(state);
      if (state.status === 'PENDING') timer = setTimeout(load, Math.min(5000, expiresAt - Date.now()));
    } catch {
      if (!closed) options.onError('제작 상태를 확인하지 못했습니다. 다시 확인해 주세요.');
    } finally {
      clearTimeout(deadline);
    }
  };
  void load();
  return () => { closed = true; clearTimeout(timer); request?.abort(); };
}
