'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { OboPlayer } from '@/components/obo/OboPlayer';
import { LegacyOboEditorSection } from '@/components/obo/OboEditorSection';
import { createSt2Preview } from '@/components/obo/lib/st2Preview';
import type { OboBlob } from '@/components/obo/types';

const storageKey = 'obo:st2-visibility-preview:v1';

export default function St2PreviewPage() {
  const [blob, setBlob] = useState<OboBlob>(createSt2Preview);
  const [editing, setEditing] = useState(false);
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges) || !Array.isArray(parsed.frames)) throw new Error();
        setBlob(parsed); setRevision(r => r + 1); setNotice('이 브라우저에 보관한 그림을 불러왔습니다.');
      }
    } catch { setNotice('보관한 그림을 불러오지 못해 기본 예제를 표시합니다.'); }
  }, []);

  const save = () => {
    try { localStorage.setItem(storageKey, JSON.stringify(blob)); setNotice('이 브라우저에 임시 저장했습니다.'); }
    catch { setNotice('브라우저 저장 공간에 보관하지 못했습니다.'); }
  };
  const reset = () => {
    if (!window.confirm('현재 편집한 내용 대신 기본 ST2 예제를 불러올까요?')) return;
    setBlob(createSt2Preview()); setRevision(r => r + 1);
    setNotice('기본 예제를 불러왔습니다. 임시 저장을 누르면 보관한 그림도 교체됩니다.');
  };

  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-8">
    <div className="mx-auto max-w-[1440px] space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-semibold text-indigo-600">OBO · ST2</p>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">프로세스 상태 전이</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">전체 흐름을 보면서 장면마다 강조되는 상태와 경로를 따라가 보세요.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={reset}>기본 예제</Button>
          <Button variant="outline" onClick={save}>임시 저장</Button>
        </div>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2" role="tablist" aria-label="화면 선택">
          <Button role="tab" aria-selected={!editing} variant={!editing ? 'default' : 'outline'} onClick={() => setEditing(false)}>재생하며 보기</Button>
          <Button role="tab" aria-selected={editing} variant={editing ? 'default' : 'outline'} onClick={() => setEditing(true)}>그림·장면 편집</Button>
        </div>
        <p className="text-xs text-slate-500">편집한 내용은 이 체험 화면에만 적용됩니다. 문제로 게시되지 않습니다.</p>
      </div>
      {notice && <p role="status" className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-2 text-sm text-indigo-700">{notice}</p>}
      {editing ? <>
        <p className="text-sm text-slate-600">동그라미를 끌면 위치가 바뀌고, 빈 공간을 끌면 화면이 이동합니다. 마우스 휠로 확대·축소하고, 왼쪽 아래 자물쇠로 화면 이동을 잠글 수 있습니다. 오른쪽 ‘프레임’ 탭에서는 장면을 고른 뒤 동그라미와 화살표를 눌러 강조를 바꿀 수 있습니다.</p>
        <div className="h-[760px] min-h-[580px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <LegacyOboEditorSection key={revision} value={{mode:'single',single:blob}} onChange={next => {if(next.single)setBlob(next.single);}} />
        </div>
      </> : <div className="h-[min(740px,calc(100dvh-220px))] min-h-[480px]" data-testid="st2-player">
        <OboPlayer key={revision} blob={blob} />
      </div>}
      <p className="text-sm leading-relaxed text-slate-500">노드와 경로의 배치는 장면을 넘겨도 유지됩니다. 확대해서 살펴본 뒤 캔버스 왼쪽 아래의 전체 맞춤 버튼으로 돌아올 수 있습니다.</p>
    </div>
  </main>;
}
