'use client';
import type { useCodeDraft } from './useCodeDraft';

export function CodeDraftPanel({ state }: { state: ReturnType<typeof useCodeDraft> }) {
  const { draft } = state;
  if (!draft) return <p role="status">코드 보관함 준비 중…</p>;
  const button = 'rounded border border-slate-300 bg-white px-3 py-1 text-xs hover:bg-slate-100 focus-visible:outline-indigo-500';
  return <section aria-label="코드 보관함" className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
    <div className="flex flex-wrap items-center gap-2">
      <p role="status" className="mr-auto">{!draft.scope ? '계정 보관 불가 · 코드를 파일로 저장해 주세요.' : draft.dirty ? '변경 내용 보관 대기 중…' : draft.savedAt ? `브라우저 보관 완료 · ${new Date(draft.savedAt).toLocaleTimeString('ko-KR')} · 서버 제출과 별개` : '아직 보관하지 않은 코드 · 작성하면 자동 보관됩니다.'}</p>
      <button className={button} onClick={state.exportFile}>코드 파일로 저장</button>
      <button className={button} onClick={() => { if (confirm('현재 코드를 보관하고 이 언어의 기본 코드로 초기화할까요?')) { draft.reset(); state.redraw(); } }}>코드 초기화</button>
    </div>
    {draft.error && <p role="alert" className="mt-2 text-red-700">{draft.error} <button className={button} onClick={state.flush}>보관 재시도</button></p>}
    {draft.warning && <p role="alert" className="mt-2 text-amber-800">{draft.warning}</p>}
    {draft.versionChanged && <p role="alert" className="mt-2 text-amber-800">보관 당시와 문제 버전이 다릅니다. 제출 전 문제를 다시 확인해 주세요.</p>}
    {draft.scope && <details className="mt-2" open={draft.candidates.length > 0 ? true : undefined}>
      <summary className="cursor-pointer">복구 가능한 초안 {draft.candidates.length}개 · 공용 기기 보관 안내</summary>
      <p className="my-2 text-xs text-slate-500">코드는 암호화 없이 이 브라우저에 남고, 같은 계정으로 로그인하면 복구할 수 있습니다. 공용 기기에서는 사용 후 보관본을 삭제하세요.</p>
      <div className="max-h-28 overflow-auto space-y-1">
        {draft.candidates.map(record => <div key={record.id} className="flex flex-wrap items-center gap-2">
          <span>{record.language} · {new Date(record.savedAt).toLocaleString('ko-KR')}{record.version && draft.version && record.version !== draft.version ? ' · 다른 문제 버전' : ''}</span>
          <code className="max-w-full truncate text-xs text-slate-500" title={record.code.slice(0,200)}>{record.code.trim().split('\n')[0]?.slice(0,60) || '(빈 코드)'}</code>
          <button className={button} onClick={() => { if (confirm('현재 코드를 먼저 보관하고 이 초안을 복구할까요?')) { draft.recover(record); state.redraw(); } }}>초안 복구</button>
        </div>)}
      </div>
      <button className={`${button} mt-2`} onClick={() => { if (confirm('이 계정의 현재 문제·대회 보관본을 모든 언어와 탭에 걸쳐 삭제할까요? 화면의 코드는 유지되며 다시 편집하면 새로 보관됩니다.')) { draft.deleteSaved(); state.redraw(); } }}>이 문제의 보관본 삭제</button>
    </details>}
  </section>;
}
