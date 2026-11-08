'use client';
import { useEffect, useRef, useState } from 'react';
import { AUTH_CHANGED } from '@/lib/authSession';
import { isRequestCancelled, requestIssue, type RequestIssue } from '@/lib/request';

/** Cancelling is an optimization; the active flag also rejects transports that ignore abort. */
export function useRemoteData<T>(key: string | null, read: (signal: AbortSignal) => Promise<T>, options: { delay?: number; keepPrevious?: boolean } = {}) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<RequestIssue | null>(null);
  const [loading, setLoading] = useState(key !== null);
  const [attempt, setAttempt] = useState(0);
  const reader = useRef(read); reader.current = read;
  const retry = () => setAttempt(value => value + 1);
  useEffect(() => {
    const changed = () => { setData(null); setError(null); retry(); };
    const storage = (event: StorageEvent) => { if (event.key === 'token' || event.key === null) changed(); };
    window.addEventListener(AUTH_CHANGED, changed); window.addEventListener('storage', storage);
    return () => { window.removeEventListener(AUTH_CHANGED, changed); window.removeEventListener('storage', storage); };
  }, []);
  useEffect(() => {
    if (key === null) { setLoading(false); setData(null); return; }
    let active = true;
    const controller = new AbortController();
    const load = reader.current;
    setLoading(true); setError(null);
    if (!options.keepPrevious) setData(null);
    const timer = setTimeout(async () => {
      try { const result = await load(controller.signal); if (active) setData(result); }
      catch (cause) { if (active && !isRequestCancelled(cause)) setError(requestIssue(cause)); }
      finally { if (active) setLoading(false); }
    }, options.delay ?? 0);
    return () => { active = false; controller.abort(); clearTimeout(timer); };
  }, [key, attempt, options.delay, options.keepPrevious]);
  return { data, error, loading, retry };
}
