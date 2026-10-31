'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SimulationEditor } from '@/components/obo/simulation/SimulationEditor';
import { createDocument, validateDocument, type SimulationDocument } from '@/components/obo/runtime/document.mjs';
import { parseBoundedJson } from '@/components/obo/runtime/index.mjs';
import {examples,exampleDocument} from '@/components/obo/runtime/examples';

const draftKey = 'obo-simulation-lab-v2';

export default function SimulationLabPage() {
  const [document, setDocument] = useState<SimulationDocument | null>(null);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    try {
      const example=new URLSearchParams(window.location.search).get('example');
      if(examples.some(item=>item.id===example)){
        setDocument(exampleDocument(example!));setNotice('예제 구성을 열었습니다. 입력과 배치를 자유롭게 바꿔보세요.');return;
      }
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = parseBoundedJson(saved) as unknown as SimulationDocument;
        validateDocument(parsed, { execute: false });
        setDocument(parsed);
        setNotice('이 브라우저에 보관한 구성을 불러왔습니다.');
        return;
      }
    } catch {
      setNotice('보관한 구성을 읽을 수 없어 기본 구성을 열었습니다.');
    }
    setDocument(createDocument('ST2'));
  }, []);

  return <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
    <div className="mx-auto max-w-[1800px] space-y-4">
      <Link href="/challenges" className="text-sm text-slate-500 hover:text-indigo-600">← 문제 목록</Link>
      <div><h1 className="text-2xl font-bold text-slate-900">운영체제 시뮬레이션 작업실</h1>
        <p className="mt-2 text-sm text-slate-600">개념을 골라 입력과 화면 구성을 바꾸고 실행 과정을 살펴보세요. 각 시뮬레이션은 독립적으로 계산합니다.</p>
        <p className="mt-1 text-xs text-slate-500">임시 보관은 이 브라우저에만 저장됩니다. 문제에 게시되지는 않습니다.</p></div>
      {notice && <p role="status" className="rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-sm text-indigo-800">{notice}</p>}
      <div className="grid gap-3 md:grid-cols-3" aria-label="시작 예제">{examples.map(example=><a key={example.id} href={`/challenges/obo/lab?example=${example.id}`} className="rounded-xl border border-slate-200 bg-white p-4 hover:border-indigo-300"><strong className="text-sm text-indigo-700">{example.name}</strong><p className="mt-1 text-xs text-slate-500">{example.description}</p></a>)}</div>
      {document ? <SimulationEditor value={document} onChange={setDocument} onSave={() => {
        try {
          validateDocument(document, { execute: false });
          localStorage.setItem(draftKey, JSON.stringify(document));
          setNotice('현재 구성을 이 브라우저에 보관했습니다.');
        } catch (error) { setNotice(error instanceof Error ? error.message : '보관하지 못했습니다.'); }
      }}/> : <p role="status">작업실을 여는 중…</p>}
    </div>
  </main>;
}
