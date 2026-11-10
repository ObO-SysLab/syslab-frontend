'use client';
import Link from 'next/link';
import { loginHref, type RequestIssue } from '@/lib/request';

// Abyss pages get theme colors through dark: (light inside .obo-scope and /test, 2026-11-10).
export function RequestError({ issue, retry, busy = false, stale = false, checkHref, checkLabel = '제출 내역 확인' }: {
  issue: RequestIssue | null; retry?: () => void; busy?: boolean; stale?: boolean; checkHref?: string; checkLabel?: string;
}) {
  if (!issue) return null;
  return <div role="alert" className="my-3 space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-warning/30 dark:bg-warning/10 dark:text-ink">
    <p>{issue.message}</p>
    {stale && <p>이전에 불러온 자료를 표시하고 있습니다. 최신 상태와 다를 수 있습니다.</p>}
    {issue.uncertain && <p>접수 여부는 확인되지 않았습니다. 작성 내용은 유지됩니다. 중복 요청을 피하려면 내역을 먼저 확인해 주세요.</p>}
    <div className="flex flex-wrap gap-3">
      {issue.status === 401 && <Link className="font-semibold underline" href={loginHref()}>로그인 후 돌아오기</Link>}
      {retry && <button type="button" disabled={busy} onClick={retry} className="rounded border border-amber-300 bg-white px-3 py-1 font-semibold disabled:opacity-50 dark:border-warning/40 dark:bg-raised dark:text-ink dark:hover:bg-line">{busy ? '불러오는 중…' : '다시 불러오기'}</button>}
      {checkHref && <Link className="font-semibold underline" href={checkHref}>{checkLabel}</Link>}
      {(issue.status === 403 || issue.status === 404) && <Link className="underline" href="/challenges">문제 목록으로</Link>}
    </div>
  </div>;
}
