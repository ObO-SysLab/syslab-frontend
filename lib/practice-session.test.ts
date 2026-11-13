import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatRemaining, readFlagResult } from './practice-session';

afterEach(() => vi.unstubAllGlobals());
const noWait = { sleep: async () => {} };
const answer = (isCorrect: unknown) => ({ ok: true, json: async () => ({ data: { isCorrect } }) });

describe('remaining practice time', () => {
  it.each([[7200, '2:00:00'], [3599, '0:59:59'], [61, '0:01:01'], [0, '0:00:00'], [-5, '0:00:00'], [Number.NaN, '0:00:00']])(
    '%s seconds reads %s', (seconds, text) => expect(formatRemaining(seconds)).toBe(text));
});

describe('practice flag verdict', () => {
  it('reads the verdict of the submission', async () => {
    const fetcher = vi.fn().mockResolvedValue(answer(false)); vi.stubGlobal('fetch', fetcher);
    await expect(readFlagResult(41, 'login', noWait)).resolves.toBe(false);
    expect(fetcher.mock.calls[0][0]).toBe('https://diveon.net/api/submissions/41/result');
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bearer login');
  });
  it('retries a missing verdict a few times before answering', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce({ ok: false, status: 404 }).mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(answer(null)).mockResolvedValue(answer(true));
    vi.stubGlobal('fetch', fetcher);
    await expect(readFlagResult(41, 'login', noWait)).resolves.toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(4);
  });
  it('stays unknown when no verdict arrives, so the environment is kept', async () => {
    const fetcher = vi.fn().mockResolvedValue(answer('yes')); vi.stubGlobal('fetch', fetcher);
    await expect(readFlagResult(41, 'login', { attempts: 3, ...noWait })).resolves.toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it.each([[0, 'login'], [1.5, 'login'], [41, null]])('does not ask without a submission and login: %s', async (id, token) => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    await expect(readFlagResult(id, token as string | null, noWait)).resolves.toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
