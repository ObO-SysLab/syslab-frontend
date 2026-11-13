'use client';
import { useEffect, useState } from 'react';
import { OboPlayer } from '@/components/obo/OboPlayer';
import { LegacyOboEditorSection } from '@/components/obo/OboEditorSection';
import { ALL_OBO_TEMPLATES } from '@/components/obo/templates';
import type { OboBlob } from '@/components/obo/types';
type ExampleId = 'G1' | 'G2';
const storageKey = (id: ExampleId) => id === 'G2' ? 'obo:gantt-rr-preview:v1' : 'obo:gantt-preview:v1';
function example(id: ExampleId = 'G1'): OboBlob {
  const template = ALL_OBO_TEMPLATES.find(t => t.id === id)!;
  return structuredClone({ nodes: template.defaultNodes, edges: template.defaultEdges, frames: template.defaultFrames ?? [] }) as OboBlob;
}
export default function GanttPreviewPage() {
  const [blob, setBlob] = useState(() => example()), [editing, setEditing] = useState(false);
  const [exampleId, setExampleId] = useState<ExampleId>('G1');
  const key = storageKey(exampleId);
  const [revision, setRevision] = useState(0), [notice, setNotice] = useState('');
  const loadExample = (id: ExampleId) => {
    let next = example(id), message = '';
    try {
      const raw = localStorage.getItem(storageKey(id));
      if (raw) {
        const value = JSON.parse(raw);
        if (!Array.isArray(value.nodes) || !Array.isArray(value.edges) || !Array.isArray(value.frames)) throw new Error();
        next = value; message = '이 브라우저에 보관한 간트를 불러왔습니다.';
      }
    } catch { message = '보관한 자료를 읽지 못해 기본 예제를 표시합니다.'; }
    setBlob(next); setExampleId(id); setRevision(n => n + 1); setEditing(false); setNotice(message);
  };
  useEffect(() => { loadExample(new URLSearchParams(window.location.search).get('example') === 'rr' ? 'G2' : 'G1'); }, []);
  const switchExample = (id: ExampleId) => {
    if (id === exampleId) return;
    if (!window.confirm('다른 예제로 이동할까요? 임시 저장하지 않은 편집 내용은 사라집니다. 저장한 자료는 예제별로 유지됩니다.')) return;
    loadExample(id);
    const url = new URL(window.location.href);
    if (id === 'G2') url.searchParams.set('example', 'rr'); else url.searchParams.delete('example');
    window.history.replaceState(null, '', url);
  };
  const button = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50';
  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-8"><div className="mx-auto max-w-[1440px] space-y-4">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-slate-500">OBO · {exampleId}</p><h1 className="mt-1 text-3xl font-bold">{exampleId === 'G2' ? '번갈아 실행하는 라운드 로빈' : '시간으로 보는 CPU 실행'}</h1><p className="mt-2 text-sm text-slate-600">프로세스별 실행 구간을 같은 시간축에서 비교하세요. 막대를 누르면 구간 정보를 볼 수 있습니다.</p></div>
      <div className="flex gap-2"><button className={button} onClick={() => { if (window.confirm('현재 편집 내용을 기본 간트 예제로 바꿀까요?')) { setBlob(example(exampleId)); setRevision(n => n + 1); setNotice('기본 예제를 불러왔습니다. 저장본은 임시 저장을 눌러야 바뀝니다.'); } }}>기본 예제</button>
      <button className={button} onClick={() => { try { localStorage.setItem(key, JSON.stringify(blob)); setNotice('이 브라우저에 임시 저장했습니다.'); } catch { setNotice('브라우저에 저장하지 못했습니다.'); } }}>임시 저장</button></div>
    </header>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex gap-2" role="tablist" aria-label="화면 선택"><button role="tab" aria-selected={!editing} className={button + (!editing ? ' ring-2 ring-indigo-500' : '')} onClick={() => setEditing(false)}>재생하며 보기</button><button role="tab" aria-selected={editing} className={button + (editing ? ' ring-2 ring-indigo-500' : '')} onClick={() => setEditing(true)}>그림·장면 편집</button></div>
      <div className="flex gap-2" role="group" aria-label="간트 예제"><button type="button" className={button} aria-pressed={exampleId === 'G1'} onClick={() => switchExample('G1')}>FCFS 예제</button><button type="button" className={button + (exampleId === 'G2' ? ' border-indigo-400 text-indigo-700' : '')} aria-pressed={exampleId === 'G2'} onClick={() => switchExample('G2')}>라운드로빈 예제</button></div>
    </div>
    {notice && <p role="status" className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-700">{notice}</p>}
    {editing ? <><p className="text-sm leading-relaxed text-slate-600">속성 탭에서는 기본 그림을, 프레임 탭에서 장면을 고르면 그 장면을 수정합니다. 막대를 눌러 시간·색을 바꾸세요. 프로세스 이름을 끌면 같은 간트가 함께 이동합니다.</p><div className="h-[800px] overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <LegacyOboEditorSection key={revision} value={{ mode: 'single', single: blob }} onChange={next => { if (next.single) setBlob(next.single); }} />
    </div></> : <div className="h-[min(740px,calc(100dvh-270px))] min-h-[360px]" data-testid="gantt-player"><OboPlayer key={revision} blob={blob} /></div>}
    <p className="text-xs leading-relaxed text-slate-500">단위: 시간 단위 · 직접 작성하는 실행 예제입니다. 구간을 수정해도 실행 순서나 설명이 자동 계산되지는 않습니다. 임시 저장은 이 브라우저에만 보관됩니다.</p>
  </div></main>;
}
