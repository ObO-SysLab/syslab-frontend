'use client';
import { useEffect, useState } from 'react';
import { LegacyOboEditorSection } from '@/components/obo/OboEditorSection';
import { OboPlayer } from '@/components/obo/OboPlayer';
import { OBO_TEMPLATES } from '@/components/obo/templates';
import type { OboBlob } from '@/components/obo/types';
function valid(value: unknown): value is OboBlob {
  if (!value || typeof value !== 'object') return false;
  const b=value as OboBlob;
  return Array.isArray(b.nodes)&&b.nodes.every(n=>n&&typeof n.id==='string'&&n.position&&Number.isFinite(n.position.x)&&Number.isFinite(n.position.y)&&n.data&&typeof n.data==='object')
    &&Array.isArray(b.edges)&&b.edges.every(e=>e&&typeof e.id==='string'&&typeof e.source==='string'&&typeof e.target==='string')
    &&Array.isArray(b.frames)&&b.frames.every(f=>f&&typeof f.id==='string'&&typeof f.label==='string'&&Array.isArray(f.highlightNodes)&&Array.isArray(f.highlightEdges));
}
function initial(id:string):OboBlob {
  const t=OBO_TEMPLATES.find(t=>t.id===id);
  return t?JSON.parse(JSON.stringify({nodes:t.defaultNodes,edges:t.defaultEdges,frames:t.defaultFrames??[]})):{nodes:[],edges:[],frames:[]};
}
export default function ElementsPreview() {
  const [blob,setBlob]=useState<OboBlob>({nodes:[],edges:[],frames:[]});
  const [ready,setReady]=useState(false),[editing,setEditing]=useState(true),[revision,setRevision]=useState(0),[notice,setNotice]=useState(''),[id,setId]=useState('');
  const storageKey=`obo:elements-preview:v1:${id||'blank'}`;
  useEffect(()=>{
    const requested=new URLSearchParams(window.location.search).get('template')??'';
    const key=`obo:elements-preview:v1:${requested||'blank'}`;
    let value=initial(requested);
    try {const raw=localStorage.getItem(key);if(raw){const saved:unknown=JSON.parse(raw);if(!valid(saved))throw new Error();value=saved;setNotice('이 편집 체험의 저장본을 불러왔습니다.');}}
    catch{setNotice('저장본을 읽지 못해 시작 그림을 표시합니다.');}
    setId(requested);setBlob(value);setReady(true);
  },[]);
  const button='rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50';
  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-5"><div className="mx-auto max-w-[1600px] space-y-3">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold text-slate-500">OBO · 공통 요소 편집</p><h1 className="mt-1 text-2xl font-bold">요소를 더하고, 장면을 직접 바꿔보세요</h1></div><div className="flex gap-2">
      <button className={button} disabled={!ready} onClick={()=>{if(window.confirm('현재 그림을 시작 예제로 바꿀까요? 임시 저장본은 유지됩니다.')){setBlob(initial(id));setRevision(v=>v+1);setNotice('시작 그림을 불러왔습니다.');}}}>시작 그림</button>
      <button className={button} disabled={!ready} onClick={()=>{try{localStorage.setItem(storageKey,JSON.stringify(blob));setNotice('이 브라우저에 임시 저장했습니다.');}catch{setNotice('브라우저에 저장하지 못했습니다.');}}}>임시 저장</button>
    </div></header>
    <div className="flex flex-wrap items-center justify-between gap-2"><div role="tablist" aria-label="화면 선택" className="flex gap-2"><button role="tab" aria-selected={editing} className={button+(editing?' ring-2 ring-indigo-500':'')} onClick={()=>setEditing(true)}>그림·장면 편집</button><button role="tab" aria-selected={!editing} className={button+(!editing?' ring-2 ring-indigo-500':'')} onClick={()=>setEditing(false)}>재생하며 보기</button></div><p className="text-xs text-slate-500">기본값은 속성 탭에서 · 장면별 값과 연결선은 장면 탭에서</p></div>
    {notice&&<p role="status" className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-700">{notice}</p>}
    {!ready?<p>편집 자료를 불러오는 중입니다.</p>:editing?<div className="h-[max(540px,calc(100dvh-240px))] overflow-hidden rounded-2xl border border-slate-200 bg-white" data-testid="elements-editor"><LegacyOboEditorSection key={revision} value={{mode:'single',single:blob}} onChange={next=>{if(next.single)setBlob(next.single);}}/></div>:<div className="h-[max(400px,calc(100dvh-240px))]" data-testid="elements-player"><OboPlayer key={revision} blob={blob}/></div>}
    <p className="text-xs leading-relaxed text-slate-500">새 요소는 오른쪽 ‘요소 추가’에서 끌어 놓으세요. 편집한 값으로 설명이나 알고리즘 결과가 자동 계산되지는 않습니다. 임시 저장은 이 편집 체험에만 보관되며 보기 예제 원본을 바꾸지 않습니다.</p>
  </div></main>;
}
