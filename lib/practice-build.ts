import { problemApi } from './problemApi';
import { isCommandName } from './command-allowlist';

/** Validated build failure reason; the server sends it to the problem's author only. */
export type BuildFailure = { code: string; command: string | null };

export type PracticeBuild = {
  status: 'PENDING' | 'READY' | 'FAILED' | 'UNAVAILABLE';
  canStart: boolean;
  failure?: BuildFailure;
};

// Same codes as the image build script (syslab-infra vm/codebuild/build_image.py).
const FAILURE_CODES = new Set(['SOURCE_INVALID', 'POLICY_INVALID', 'DOCKERFILE_FAILED', 'COMMAND_NOT_FOUND',
  'BUSYBOX_COMMAND', 'LAB_ACCOUNT_EXISTS', 'IMAGE_TOOL_MISSING', 'RESTRICTION_FAILED', 'PUSH_FAILED']);

function readFailure(value: unknown): BuildFailure | undefined {
  const failure = value as { code?: unknown; command?: unknown } | null | undefined;
  if (!failure || typeof failure.code !== 'string' || !FAILURE_CODES.has(failure.code)) return undefined;
  return { code: failure.code, command: isCommandName(failure.command) ? failure.command : null };
}

export function readPracticeBuild(value: unknown): PracticeBuild {
  const state = value as (Partial<Omit<PracticeBuild, 'failure'>> & { failure?: unknown }) | null;
  if (!state || !['PENDING', 'READY', 'FAILED', 'UNAVAILABLE'].includes(state.status ?? '')
      || typeof state.canStart !== 'boolean') return { status: 'UNAVAILABLE', canStart: false };
  const failure = state.status === 'FAILED' ? readFailure(state.failure) : undefined;
  return { status: state.status!, canStart: state.status === 'READY' && state.canStart, ...(failure ? { failure } : {}) };
}

/** Fixed guidance per reason code; the server's raw build output never reaches the page. */
function failureMessage({ code, command }: BuildFailure): string | null {
  switch (code) {
    case 'SOURCE_INVALID': return '업로드한 zip을 열 수 없거나 zip 맨 위에 Dockerfile이 없습니다.';
    case 'POLICY_INVALID': return '허용 명령어 형식이 올바르지 않습니다. 허용 명령어를 다시 저장해 주세요.';
    case 'DOCKERFILE_FAILED': return 'Dockerfile 빌드가 실패했습니다. Dockerfile을 확인해 주세요.';
    case 'COMMAND_NOT_FOUND': return command
      ? `이미지에 ${command} 명령어가 없습니다. Dockerfile에서 설치하거나 허용 명령어에서 빼 주세요.`
      : '허용 명령어 중 이미지에 없는 명령어가 있습니다.';
    case 'BUSYBOX_COMMAND': return `${command ?? '허용 명령어'}가 busybox 명령어라서 제한할 수 없습니다. busybox를 쓰지 않는 이미지(ubuntu, debian 등)를 사용해 주세요.`;
    case 'LAB_ACCOUNT_EXISTS': return '이미지에 이미 lab 계정(또는 uid 10001)이 있어서 허용 명령어를 적용할 수 없습니다.';
    case 'IMAGE_TOOL_MISSING': return `이미지에 허용 명령어 적용에 필요한 기본 도구${command ? `(${command})` : ''}가 없습니다.`;
    case 'RESTRICTION_FAILED': return '허용 명령어를 적용하지 못했습니다. 운영자에게 문의해 주세요.';
    case 'PUSH_FAILED': return '실습 환경을 저장하지 못했습니다. 잠시 후 다시 시도하거나 운영자에게 문의해 주세요.';
    default: return null;
  }
}

/** restricted: the practice has allowed commands, which fail the build when the image lacks one. */
export function practiceBuildPresentation(state: PracticeBuild, restricted = false) {
  switch (state.status) {
    case 'PENDING': return { label: '실습 환경 제작 중', message: '완료되면 실습을 시작할 수 있습니다. 이 화면에서 상태를 자동으로 확인합니다.' };
    case 'READY': return { label: '실습 환경 제작 완료', message: state.canStart ? '실습을 시작할 수 있습니다.' : '현재 계정으로 이 실습을 시작할 수 없습니다.' };
    case 'FAILED': return { label: '실습 환경 제작 실패', message: (state.failure && failureMessage(state.failure)) || (restricted
      ? '실습 환경을 만들지 못했습니다. 허용 명령어가 모두 이미지에 설치돼 있는지 확인해 주세요.'
      : '실습 환경을 만들지 못했습니다. 업로드한 자료를 확인하거나 운영자에게 문의해 주세요.') };
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
