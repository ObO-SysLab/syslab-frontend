'use client';
import { useEffect, useRef, useState } from 'react';
import { AUTH_CHANGED, BEFORE_LOGOUT, clearPendingSubmissions, draftAccount } from '@/lib/authSession';
import { problemToken } from '@/lib/problemApi';
import { CodeDraftSession, type CodeContext } from '@/lib/codeDraft';

export function useCodeDraft(context: Omit<CodeContext, 'account'>, version: string | null) {
  const [, update] = useState(0);
  const redraw = () => update(value => value + 1);
  const session = useRef<CodeDraftSession | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [generation, setGeneration] = useState(0);
  const identity = JSON.stringify(context);
  useEffect(() => {
    const readAccount = () => { try { return draftAccount(problemToken()); } catch { return null; } };
    let owner: string | null = null;
    const makeSession = () => {
      const user = readAccount();
      owner = user;
      setAccount(user);
      session.current = new CodeDraftSession({ ...JSON.parse(identity), account: user }, () => localStorage);
      session.current.scan(); redraw(); setGeneration(value => value + 1);
    };
    makeSession();
    const flush = () => { session.current?.flush(); redraw(); };
    const auth = () => {
      if (readAccount() === owner) return;
      // Flush to the captured owner's keys, even if another tab already changed token.
      session.current?.flush();
      try { clearPendingSubmissions(sessionStorage); } catch { /* No stored markers available. */ }
      makeSession();
    };
    const storage = (event: StorageEvent) => {
      if (event.key === 'token' || event.key === null) { auth(); return; }
      if (session.current?.scope && event.key?.startsWith(session.current.scope)) { session.current.scan(); redraw(); }
    };
    const beforeLogout = (event: Event) => {
      if (session.current?.dirty && !session.current.flush()) {
        redraw();
        if (!window.confirm('코드를 보관하지 못했습니다. 취소 후 파일로 저장할 수 있습니다. 보관하지 않은 내용을 버리고 로그아웃할까요?')) event.preventDefault();
      }
    };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (session.current?.dirty && !session.current.flush()) { event.preventDefault(); event.returnValue = ''; }
    };
    const beforeNavigate = (event: Event) => {
      if (!event.cancelable || !session.current?.dirty || session.current.flush()) return;
      redraw();
      if (!window.confirm('코드를 브라우저에 보관하지 못했습니다. 취소 후 파일로 저장할 수 있습니다. 보관하지 않은 내용을 버리고 이동할까요?')) event.preventDefault();
    };
    const navigation = (window as Window & { navigation?: EventTarget }).navigation;
    const navigate = (event: Event) => {
      // Full navigations use beforeunload, including browser-controlled closing.
      const navigationEvent = event as Event & { destination?: { sameDocument: boolean }; navigationType?: string };
      if (navigationEvent.destination?.sameDocument && navigationEvent.navigationType === 'traverse') beforeNavigate(event);
    };
    const click = (event: MouseEvent) => {
      if ((event.target as Element)?.closest?.('a[href]') && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
        beforeNavigate(event);
        if (event.defaultPrevented) event.stopPropagation();
      }
    };
    navigation?.addEventListener('navigate', navigate);
    document.addEventListener('click', click, true);
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', beforeUnload);
    window.addEventListener('storage', storage);
    window.addEventListener(BEFORE_LOGOUT, beforeLogout);
    window.addEventListener(AUTH_CHANGED, auth);
    return () => {
      session.current?.flush(); session.current = null;
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', beforeUnload);
      window.removeEventListener('storage', storage);
      window.removeEventListener(BEFORE_LOGOUT, beforeLogout);
      window.removeEventListener(AUTH_CHANGED, auth);
      navigation?.removeEventListener('navigate', navigate);
      document.removeEventListener('click', click, true);
    };
  }, [identity]);
  useEffect(() => { session.current?.setVersion(version); redraw(); }, [version, generation]);
  const draft = session.current;
  const code = draft?.code ?? '';
  useEffect(() => {
    if (!draft?.dirty) return;
    const timer = setTimeout(() => { draft.flush(); redraw(); }, 500);
    return () => clearTimeout(timer);
  }, [draft, code]);
  const edit = (code: string) => { draft?.edit(code); redraw(); };
  const select = (language: string) => { draft?.select(language); redraw(); };
  const flush = () => { const ok = draft?.flush() ?? false; redraw(); return ok; };
  const exportFile = () => {
    if (!draft) return;
    const url = URL.createObjectURL(new Blob([draft.code], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url;
    a.download = `problem-${context.problem}.${({ c: 'c', cpp: 'cpp', python: 'py' })[draft.language] ?? 'txt'}`;
    a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return { draft, code, language: draft?.language ?? 'c', account, generation, edit, select, flush, exportFile, redraw };
}
