'use client';
import { useEffect, useState } from 'react';
import { LegacyOboEditorSection } from '@/components/obo/OboEditorSection';
import { OboPlayer } from '@/components/obo/OboPlayer';
import { createPageReplacementExample } from '@/components/obo/slots/pageReplacementExample';
import type { OboBlob } from '@/components/obo/types';

const storageKey = 'obo:page-replacement-preview:v1';
function isBlob(value: unknown): value is OboBlob {
  if (!value || typeof value !== 'object') return false;
  const blob = value as OboBlob;
  return Array.isArray(blob.nodes) && blob.nodes.every(n => n && typeof n.id === 'string' && n.position && Number.isFinite(n.position.x) && Number.isFinite(n.position.y) && n.data && typeof n.data === 'object')
    && Array.isArray(blob.edges) && blob.edges.every(e => e && typeof e.id === 'string' && typeof e.source === 'string' && typeof e.target === 'string')
    && Array.isArray(blob.frames) && blob.frames.every(f => f && typeof f.id === 'string' && Array.isArray(f.highlightNodes) && Array.isArray(f.highlightEdges));
}
export default function PageReplacementPreview() {
  const [blob, setBlob] = useState(createPageReplacementExample), [editing, setEditing] = useState(false);
  const [revision, setRevision] = useState(0), [notice, setNotice] = useState('');
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) { const saved: unknown = JSON.parse(raw); if (!isBlob(saved)) throw new Error(); setBlob(saved); setRevision(n => n + 1); setNotice('이 브라우저에 보관한 그림을 불러왔습니다.'); }
    } catch { setNotice('보관한 자료를 읽지 못해 기본 예제를 표시합니다.'); }
  }, []);
  const button = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50';
  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 md:px-8 md:py-5"><div className="mx-auto max-w-[1440px] space-y-3">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold text-slate-500">OBO · 페이지 교체</p><h1 className="mt-1 text-2xl font-bold">어떤 페이지가 남고 무엇이 바뀔까?</h1><p className="mt-1 text-sm text-slate-600">현재 참조와 메모리의 변화를 같은 그림에서 따라가 보세요.</p></div>
      <div className="flex gap-2"><button className={button} onClick={() => { if (window.confirm('현재 그림을 기본 FIFO 예제로 바꿀까요? 임시 저장본은 유지됩니다.')) { setBlob(createPageReplacementExample()); setRevision(n => n + 1); setNotice('기본 예제를 불러왔습니다.'); } }}>기본 예제</button>
        <button className={button} onClick={() => { try { localStorage.setItem(storageKey, JSON.stringify(blob)); setNotice('이 브라우저에 임시 저장했습니다.'); } catch { setNotice('브라우저에 저장하지 못했습니다.'); } }}>임시 저장</button></div>
    </header>
    <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex gap-2" role="tablist" aria-label="화면 선택">
      <button role="tab" aria-selected={!editing} className={button + (!editing ? ' ring-2 ring-indigo-500' : '')} onClick={() => setEditing(false)}>재생하며 보기</button>
      <button role="tab" aria-selected={editing} className={button + (editing ? ' ring-2 ring-indigo-500' : '')} onClick={() => setEditing(true)}>그림·장면 편집</button></div><p className="text-xs text-slate-500">FIFO · 직접 작성한 장면</p></div>
    {notice && <p role="status" className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-700">{notice}</p>}
    {editing ? <><p className="text-sm leading-relaxed text-slate-600">칸을 눌러 값을 바꾸세요. 이름을 끌면 묶음이 이동합니다. 속성에서는 기본값·칸 수를, 프레임 탭에서는 장면별 값·표식·설명을 바꿉니다.</p>
      <div className="h-[800px] overflow-hidden rounded-2xl border border-slate-200 bg-white" data-testid="page-editor"><LegacyOboEditorSection key={revision} value={{ mode: 'single', single: blob }} onChange={next => { if (next.single) setBlob(next.single); }} /></div></>
      : <div className="h-[max(360px,calc(100dvh-250px))] max-h-[800px]" data-testid="page-player"><OboPlayer key={revision} blob={blob} /></div>}
    <p className="text-xs leading-relaxed text-slate-500">칸·참조값·장면은 자유롭게 바꿀 수 있습니다. 변경해도 FIFO 결과나 설명이 자동 계산되지는 않습니다. 임시 저장은 이 브라우저에만 보관됩니다.</p>
  </div></main>;
}
