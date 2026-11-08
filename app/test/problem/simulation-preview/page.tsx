'use client';
import {useEffect,useState} from 'react';
import {SimulationEditor} from '@/components/obo/simulation/SimulationEditor';
import {SimulationPlayer} from '@/components/obo/simulation/SimulationPlayer';
import {createDocument,validateDocument,type SimulationDocument} from '@/components/obo/runtime/document.mjs';
import {registry} from '@/components/obo/runtime/index.mjs';

export default function SimulationPreview(){
  const [document,setDocument]=useState<SimulationDocument|null>(null);
  const [model,setModel]=useState('BK'),[editing,setEditing]=useState(false),[notice,setNotice]=useState('');
  useEffect(()=>{
    const requested=new URLSearchParams(window.location.search).get('model')??'BK';
    const id=Object.hasOwn(registry,requested)?requested:'BK';setModel(id);
    let initial=createDocument(id);
    try{const raw=localStorage.getItem(`obo:simulation-preview:v1:${id}`);if(raw){const saved=JSON.parse(raw);validateDocument(saved,{execute:false});initial=saved;}}
    catch{setNotice('저장본을 읽지 못해 시작 예제를 표시합니다.');}
    setDocument(initial);
  },[]);
  const button='rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50';
  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-6"><div className="mx-auto max-w-[1500px] space-y-4">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold text-indigo-600">OBO · {registry[model]?.metadata.name}</p><h1 className="mt-1 text-2xl font-bold">{document?.instances[0]?.name??'시뮬레이션'}</h1></div>
      <div className="flex flex-wrap items-center gap-2"><label className="text-sm">주제 <select aria-label="점검할 주제" className={button} value={model} onChange={e=>{window.location.href=`?model=${encodeURIComponent(e.target.value)}`;}}>{Object.entries(registry).map(([id,entry])=><option key={id} value={id}>{entry.metadata.name}</option>)}</select></label>
      <button className={button} disabled={!document} onClick={()=>{try{validateDocument(document,{execute:false});localStorage.setItem(`obo:simulation-preview:v1:${model}`,JSON.stringify(document));setNotice('이 브라우저에 임시 저장했습니다.');}catch(e){setNotice(e instanceof Error?e.message:'저장할 수 없습니다.');}}}>임시 저장</button></div>
    </header>
    <div role="tablist" aria-label="화면 선택" className="flex gap-2"><button role="tab" aria-selected={!editing} className={button+(!editing?' ring-2 ring-indigo-500':'')} onClick={()=>setEditing(false)}>재생하며 보기</button><button role="tab" aria-selected={editing} className={button+(editing?' ring-2 ring-indigo-500':'')} onClick={()=>setEditing(true)}>입력·화면 편집</button></div>
    {notice&&<p role="status" className="text-sm text-slate-600">{notice}</p>}
    {document?(editing?<SimulationEditor value={document} onChange={setDocument}/>:<SimulationPlayer document={document}/>):<p>화면을 불러오는 중입니다.</p>}
    <p className="text-xs text-slate-500">이 페이지의 임시 저장은 현재 브라우저에만 적용됩니다.</p>
  </div></main>;
}
