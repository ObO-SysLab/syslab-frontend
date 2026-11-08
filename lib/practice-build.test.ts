import { afterEach, describe, expect, it, vi } from 'vitest';
import { readPracticeBuild, practiceBuildPresentation, watchPracticeBuild, type PracticeBuild } from './practice-build';

describe('practice readiness', () => {
  it('starts only when the server confirms both READY and execution permission', () => {
    expect(readPracticeBuild({ status: 'READY', canStart: true }).canStart).toBe(true);
    expect(readPracticeBuild({ status: 'READY', canStart: false }).canStart).toBe(false);
    expect(practiceBuildPresentation({ status: 'READY', canStart: false }).message).toContain('현재 계정');
    for (const status of ['PENDING', 'FAILED', 'UNAVAILABLE']) {
      expect(readPracticeBuild({ status, canStart: true }).canStart).toBe(false);
    }
  });
  it.each([null, undefined, { status: 'READY' }, { status: 'READY', canStart: 'true' }, { status: 'UNKNOWN', canStart: true }])
    ('blocks a missing or malformed state %j', value => {
      expect(readPracticeBuild(value)).toEqual({ status: 'UNAVAILABLE', canStart: false });
    });
  it('uses safe fixed guidance instead of exposing server failure logs', () => {
    const state = readPracticeBuild({ status: 'FAILED', canStart: false, message: 'internal build URL / private source path' });
    expect(practiceBuildPresentation(state).label).toContain('실패');
    expect(practiceBuildPresentation(state).message).not.toContain('private');
  });
});

describe('practice build refresh lifecycle', () => {
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
  const callbacks = () => ({ probId: '22', token: null, onUpdate: vi.fn(), onError: vi.fn() });
  const ok = (status: PracticeBuild['status']) => ({ ok: true, json: async () => ({ data: { practiceBuild: { status, canStart: status === 'READY' } } }) });

  it.each(['READY', 'FAILED', 'UNAVAILABLE'] as const)('refreshes PENDING then stops at %s', async status => {
    vi.useFakeTimers();
    const options = callbacks();
    const fetcher = vi.fn().mockResolvedValueOnce(ok('PENDING')).mockResolvedValue(ok(status));
    vi.stubGlobal('fetch', fetcher);
    const stop = watchPracticeBuild(options);
    await vi.advanceTimersByTimeAsync(20000);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(options.onUpdate).toHaveBeenLastCalledWith({ status, canStart: status === 'READY' });
    stop();
  });
  it('limits automatic polling to ten minutes without marking a pending build failed', async () => {
    vi.useFakeTimers();
    const options = callbacks();
    const fetcher = vi.fn().mockResolvedValue(ok('PENDING'));
    vi.stubGlobal('fetch', fetcher);
    const stop = watchPracticeBuild(options);
    await vi.advanceTimersByTimeAsync(11 * 60 * 1000);
    expect(fetcher).toHaveBeenCalledTimes(120);
    expect(options.onUpdate).toHaveBeenLastCalledWith({ status: 'PENDING', canStart: false });
    expect(options.onError).toHaveBeenCalledWith(expect.stringContaining('자동 확인을 종료'));
    stop();
  });
  it('does not overlap slow requests or publish after leaving the page', async () => {
    vi.useFakeTimers();
    const options = callbacks();
    let resolve!: (response: unknown) => void;
    const fetcher = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) => new Promise(result => { resolve = result; }));
    vi.stubGlobal('fetch', fetcher);
    const stop = watchPracticeBuild(options);
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetcher).toHaveBeenCalledTimes(1);
    stop();
    resolve(ok('READY'));
    await vi.advanceTimersByTimeAsync(20000);
    expect(options.onUpdate).not.toHaveBeenCalled();
    expect(options.onError).not.toHaveBeenCalled();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });
  it('stops denied requests and keeps server error detail out of the message', async () => {
    vi.useFakeTimers();
    const options = callbacks();
    const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ detail: 'private path' }) });
    vi.stubGlobal('fetch', fetcher);
    const stop = watchPracticeBuild(options);
    await vi.advanceTimersByTimeAsync(20000);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(options.onUpdate).not.toHaveBeenCalled();
    expect(options.onError).toHaveBeenCalledWith('제작 상태를 확인하지 못했습니다. 다시 확인해 주세요.');
    stop();
  });
});
