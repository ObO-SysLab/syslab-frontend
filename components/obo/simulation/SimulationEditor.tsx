'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Plus, Copy, Trash2, Undo2, Redo2, Play, Pause, ChevronLeft, ChevronRight, Download, Upload, Eye, EyeOff } from 'lucide-react';
import type { Connection } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { modelList, registry, parseBoundedJson, type Json, type ModelRun } from '../runtime/index.mjs';
import { createInstance, copyInstance, createView, addActor, deleteActor, replaceInput, connectResource, validateDocument, semanticEntities, freshId, roleLabels, type SimulationDocument, type SimulationInstance, type SimulationView } from '../runtime/document.mjs';
import { eventLabel, matchingCursor, semanticPosition, projection } from '../runtime/projection.mjs';
import { arrangeViews, placeNewView } from '../runtime/document.mjs';
import { InputForm, type FieldSchema } from './InputForm';
import { SimulationScene } from './SimulationScene';
import { hasLowerExplanation } from './lowerExplanations';
import { useSimulation } from './useSimulation';

const domains:Record<string,string>={process:'프로세스·스레드',cpu:'CPU',sync:'동기화·교착',memory:'메모리',filesystem:'파일·디스크',kernel:'커널·I/O'};
const fieldClass='w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs';
export function Playback({execution,cursor,setCursor}:{execution:ModelRun|null;cursor:number;setCursor:(cursor:number)=>void}) {
  const [playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1);
  const last=(execution?.events.length??0)-1;
  const stepDurationMs=execution?.id==='ST2'?2000:700;
  useEffect(()=>{
    if(!playing||cursor>=last)return;
    const timer=window.setTimeout(()=>setCursor(cursor+1),stepDurationMs/speed);
    return ()=>window.clearTimeout(timer);
  },[playing,cursor,last,speed,setCursor,stepDurationMs]);
  return <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" size="icon" variant="outline" aria-label="이전 사건" disabled={cursor<0} onClick={()=>{setPlaying(false);setCursor(cursor-1);}}><ChevronLeft className="h-4 w-4"/></Button>
      <Button type="button" size="icon" aria-label={playing&&cursor<last?'일시 정지':'재생'} disabled={!execution||last<0} onClick={()=>{if(cursor>=last){setCursor(-1);setPlaying(true);}else setPlaying(p=>!p);}}>{playing&&cursor<last?<Pause className="h-4 w-4"/>:<Play className="h-4 w-4"/>}</Button>
      <Button type="button" size="icon" variant="outline" aria-label="다음 사건" disabled={cursor>=last} onClick={()=>{setPlaying(false);setCursor(cursor+1);}}><ChevronRight className="h-4 w-4"/></Button>
      <select aria-label="재생 속도" className="rounded border px-2 py-1 text-xs" value={speed} onChange={e=>setSpeed(Number(e.target.value))}>{[.5,1,2,4].map(n=><option key={n} value={n}>{n}배</option>)}</select>
      <span className="text-xs font-medium text-slate-600">{cursor<0?'초기 상태':`${cursor+1} / ${last+1}`}</span>
    </div>
    <input className="w-full accent-indigo-600" type="range" aria-label="사건 탐색" min={-1} max={Math.max(-1,last)} value={Math.min(cursor,last)} onChange={e=>{setPlaying(false);setCursor(Number(e.target.value));}}/>
    <p className="min-h-4 text-xs text-slate-600" aria-live="polite">{eventLabel(execution?.events[cursor])}</p>
  </div>;
}
function ComparisonPane({instance,primary,primaryRun,primaryCursor}:{instance:SimulationInstance;primary:SimulationInstance;primaryRun:ModelRun|null;primaryCursor:number}) {
  const {execution,error,loading}=useSimulation(instance),[cursor,setCursor]=useState(-1),[notice,setNotice]=useState('');
  const comparable=registry[instance.scenarioId].family===registry[primary.scenarioId].family;
  return <div className="min-w-0 space-y-2"><div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold">{instance.name}</span><Button type="button" size="sm" variant="outline" disabled={!execution||!primaryRun||!comparable} onClick={()=>{const next=matchingCursor(primary,primaryRun,primaryCursor,instance,execution);if(next===null)setNotice('이 실행에는 대응하는 시점이 없습니다.');else{setCursor(next);setNotice('');}}}>같은 기준으로 탐색</Button></div>
    {(notice||error||loading)&&<p className="text-xs text-amber-700">{notice||error||(loading?'계산 중…':'')}</p>}
    <SimulationScene instance={instance} execution={execution} cursor={Math.min(cursor,(execution?.events.length??0)-1)}/><Playback execution={execution} cursor={cursor} setCursor={setCursor}/>
    {!comparable&&<p className="text-xs text-slate-500">다른 모델은 독립적으로 재생합니다.</p>}
  </div>;
}

export function SimulationEditor({value,onChange,choices=[],allowCoding=false,onSave}:{value:SimulationDocument;onChange:(value:SimulationDocument)=>void;choices?:{id:string;text:string}[];allowCoding?:boolean;onSave?:()=>void}) {
  const docRef=useRef(value);docRef.current=value;
  const [activeId,setActiveId]=useState(value.instances[0].id),[selectedId,setSelectedId]=useState<string|null>(null),[cursor,setCursor]=useState(-1);
  const [selectedModel,setSelectedModel]=useState('ST2'),[panel,setPanel]=useState<'input'|'view'|'question'>('input'),[compareId,setCompareId]=useState<string>('');
  const [history,setHistory]=useState<SimulationDocument[]>([]),[future,setFuture]=useState<SimulationDocument[]>([]),[notice,setNotice]=useState('');
  const [connectionKind,setConnectionKind]=useState('decoration');
  const [revealViewId,setRevealViewId]=useState<string|null>(null);
  const fileInput=useRef<HTMLInputElement>(null);
  const active=value.instances.find(i=>i.id===activeId)??value.instances[0];
  const lowerExplanation=hasLowerExplanation(active.scenarioId);
  const placementOptions={excludedIds:lowerExplanation?active.views.filter(view=>view.role==='annotation').map(view=>view.id):[]};
  const selected=active.views.find(v=>v.id===selectedId);
  const {execution,error,loading}=useSimulation(active);
  let fields:string[]=[];
  try {if(selected)fields=[...new Set([...projection(active,execution,cursor,{...selected,fields:[]}).rows.map(([key])=>key),...selected.fields])];}catch{/* Draft input can be incomplete. */}
  const comparison=value.instances.find(i=>i.id===compareId&&i.id!==active.id);
  const remember=useCallback(()=>{setHistory(h=>[...h.slice(-29),structuredClone(docRef.current)]);setFuture([]);},[]);
  const commit=useCallback((next:SimulationDocument,saveHistory=true)=>{if(saveHistory)remember();docRef.current=next;onChange(next);},[onChange,remember]);
  const updateInstance=useCallback((next:SimulationInstance,saveHistory=true)=>commit({...docRef.current,instances:docRef.current.instances.map(i=>i.id===next.id?next:i)},saveHistory),[commit]);
  const attempt=(fn:()=>void)=>{try{fn();setNotice('');}catch(e){setNotice(e instanceof Error?e.message:'설정을 확인하세요.');}};
  const changeView=(patch:Partial<SimulationView>)=>{if(selected)updateInstance({...active,views:active.views.map(v=>v.id===selected.id?{...v,...patch}:v)});};
  const selectInstance=(id:string)=>{setActiveId(id);setSelectedId(null);setRevealViewId(null);setCursor(-1);};
  const removeViews=(ids:string[])=>{const removed=new Set(ids);updateInstance({...active,views:active.views.filter(v=>!removed.has(v.id)),decorations:active.decorations.filter(e=>!removed.has(e.source)&&!removed.has(e.target))});setSelectedId(null);};
  const connect=(c:Connection)=>attempt(()=>{
    if(!c.source||!c.target)return;
    if(connectionKind==='decoration'){updateInstance({...active,decorations:[...active.decorations,{id:freshId('line'),source:c.source,target:c.target}]});return;}
    const source=active.views.find(v=>v.id===c.source),target=active.views.find(v=>v.id===c.target);
    if(!source?.target||!target?.target)throw Error('개별 주체와 자원에 연결된 표시를 선택하세요.');
    const actor=connectionKind==='request'?source:target,resource=connectionKind==='request'?target:source;
    if(actor.role!=='actor'||resource.role!=='resource')throw Error('요청은 주체→자원, 소유는 자원→주체 방향으로 연결하세요.');
    updateInstance(connectResource(active,actor.target!,resource.target!,connectionKind));setCursor(-1);
  });
  const removeRelation=(id:string)=>attempt(()=>{
    if(active.decorations.some(e=>e.id===id)){updateInstance({...active,decorations:active.decorations.filter(e=>e.id!==id)});return;}
    if(active.scenarioId!=='S3')throw Error('이 관계는 실행 결과입니다. 입력을 바꾸면 다시 계산됩니다.');
    const entities=semanticEntities(active);
    for(const actor of entities.actor)for(const resource of entities.resource)for(const kind of ['assign','request'])if(id===`${kind}-${actor}-${resource}`){updateInstance(connectResource(active,actor,resource,kind,-1));setCursor(-1);return;}
  });
  const download=()=>attempt(()=>{validateDocument(value,{execute:false});const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='obo-simulation.json';a.click();URL.revokeObjectURL(url);});
  return <div className="space-y-3 text-slate-800" data-testid="simulation-editor">
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
      <select className="max-w-64 rounded-md border px-2 py-2 text-sm" aria-label="시뮬레이션 모델" value={selectedModel} onChange={e=>setSelectedModel(e.target.value)}>{Object.entries(domains).map(([domain,label])=><optgroup key={domain} label={label}>{modelList.filter(m=>m.domain===domain).map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</optgroup>)}</select>
      <Button type="button" size="sm" disabled={value.instances.length>=8} onClick={()=>{const instance=createInstance(selectedModel);commit({...value,instances:[...value.instances,instance],explanations:{...value.explanations,common:[...value.explanations.common,instance.id]}});selectInstance(instance.id);}}><Plus className="mr-1 h-4 w-4"/>새 시뮬레이션</Button>
      <Button type="button" size="sm" variant="outline" disabled={value.instances.length>=8} onClick={()=>{const copy=copyInstance(active);commit({...value,instances:[...value.instances,copy]});setCompareId(copy.id);}}><Copy className="mr-1 h-4 w-4"/>독립 비교 만들기</Button>
      <Button type="button" size="sm" variant="outline" onClick={()=>attempt(()=>updateInstance(arrangeViews(active,placementOptions)))}>배치 정리</Button>
      <Button type="button" size="icon" variant="ghost" aria-label="되돌리기" disabled={!history.length} onClick={()=>{const previous=history.at(-1)!;setFuture(f=>[structuredClone(value),...f].slice(0,30));setHistory(h=>h.slice(0,-1));commit(previous,false);setCursor(-1);}}><Undo2 className="h-4 w-4"/></Button>
      <Button type="button" size="icon" variant="ghost" aria-label="다시하기" disabled={!future.length} onClick={()=>{const next=future[0];setHistory(h=>[...h,structuredClone(value)].slice(-30));setFuture(f=>f.slice(1));commit(next,false);setCursor(-1);}}><Redo2 className="h-4 w-4"/></Button>
      <Button type="button" size="icon" variant="ghost" aria-label="설정 내보내기" onClick={download}><Download className="h-4 w-4"/></Button>
      <Button type="button" size="icon" variant="ghost" aria-label="설정 가져오기" onClick={()=>fileInput.current?.click()}><Upload className="h-4 w-4"/></Button>
      <input ref={fileInput} hidden type="file" accept="application/json,.json" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>1048576)throw Error('파일은 1MiB 이하여야 합니다.');const doc=parseBoundedJson(await file.text());validateDocument(doc,{execute:false});commit(doc as unknown as SimulationDocument);setActiveId((doc as unknown as SimulationDocument).instances[0].id);setSelectedId(null);setCursor(-1);setCompareId('');}catch(error){setNotice(error instanceof Error?error.message:'파일을 읽을 수 없습니다.');}e.target.value='';}}/>
      {onSave&&<Button type="button" size="sm" variant="outline" disabled={loading||!!error} onClick={()=>attempt(()=>{validateDocument(value,{execute:false});onSave();})}>임시 보관</Button>}
    </div>
    <div className="flex flex-wrap gap-1">{value.instances.map(i=><button type="button" key={i.id} onClick={()=>selectInstance(i.id)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${i.id===active.id?'bg-indigo-600 text-white':'border border-slate-200 bg-white text-slate-600'}`}>{i.name}</button>)}</div>
    {(notice||error)&&<p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{notice||error}</p>}
    <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-[180px_minmax(320px,1fr)_300px]">
      <aside className="max-h-[720px] space-y-4 overflow-auto rounded-xl border border-slate-200 bg-white p-3">
        <div><h3 className="mb-2 text-xs font-bold text-slate-500">표시 추가</h3><div className="grid grid-cols-2 gap-1">{registry[active.scenarioId].metadata.elements.map(role=><button type="button" key={role} className="rounded-md border border-slate-200 p-2 text-xs hover:bg-indigo-50" onClick={()=>attempt(()=>{const draft=createView(role,null,active.views.length);const view=lowerExplanation&&role==='annotation'?draft:placeNewView(active,draft,placementOptions);updateInstance({...active,views:[...active.views,view]});setSelectedId(view.id);setPanel('view');if(!(lowerExplanation&&role==='annotation'))setRevealViewId(view.id);})}>{roleLabels[role]}</button>)}</div></div>
        {registry[active.scenarioId].metadata.elements.includes('actor')&&<div className="space-y-2 border-t pt-3"><h3 className="text-xs font-bold text-slate-500">계산 대상</h3><Button type="button" size="sm" variant="outline" className="w-full text-xs" onClick={()=>attempt(()=>{const next=addActor(active,'producer',placementOptions);const view=next.views.find(view=>!active.views.some(previous=>previous.id===view.id));updateInstance(next);setCursor(-1);if(view){setSelectedId(view.id);setPanel('view');setRevealViewId(view.id);}})}>실행 주체 추가</Button><p className="text-[11px] text-slate-400">대상을 추가하면 계산에 반영됩니다.</p></div>}
        <div className="space-y-1 border-t pt-3"><h3 className="mb-2 text-xs font-bold text-slate-500">화면의 표시</h3>{active.views.map(v=><div key={v.id} className={`flex items-center gap-1 rounded p-1 ${selectedId===v.id?'bg-indigo-50':''}`}><button type="button" className="min-w-0 flex-1 truncate text-left text-xs" onClick={()=>{setSelectedId(v.id);setPanel('view');}}>{v.label}{v.target?` · ${v.target}`:''}</button><button type="button" aria-label={`${v.label} ${v.hidden?'보이기':'숨기기'}`} onClick={()=>updateInstance({...active,views:active.views.map(x=>x.id===v.id?{...x,hidden:!x.hidden}:x)})}>{v.hidden?<EyeOff className="h-3 w-3 text-slate-400"/>:<Eye className="h-3 w-3 text-slate-500"/>}</button></div>)}</div>
      </aside>
      <main className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs"><span className="font-semibold">{loading?'계산 중…':semanticPosition(active,execution?.events[cursor]).label}</span>
          <label className="ml-auto flex items-center gap-1">연결<select className="rounded border bg-white p-1" value={connectionKind} onChange={e=>setConnectionKind(e.target.value)}><option value="decoration">설명 선</option>{active.scenarioId==='S3'&&<><option value="request">요청 관계</option><option value="assign">소유 관계</option></>}</select></label>
          <label className="flex items-center gap-1">비교<select className="max-w-40 rounded border bg-white p-1" value={comparison?.id??''} onChange={e=>setCompareId(e.target.value)}><option value="">없음</option>{value.instances.filter(i=>i.id!==active.id).map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select></label>
        </div>
        <SimulationScene key={active.id} instance={active} execution={execution} cursor={Math.min(cursor,(execution?.events.length??0)-1)} editable selectedId={selectedId} revealViewId={revealViewId} onSelect={id=>{setSelectedId(id);if(id)setPanel('view');}} onBeginEdit={remember} onChanges={changes=>{
          const positions=new Map(changes.filter(c=>c.type==='position').map(c=>[c.id,c.type==='position'?c.position:undefined]));
          const sizes=new Map(changes.filter(c=>c.type==='dimensions').map(c=>[c.id,c.type==='dimensions'?c.dimensions:undefined]));
          if(!positions.size&&!sizes.size)return;
          const current=docRef.current.instances.find(i=>i.id===active.id)!;
          updateInstance({...current,views:current.views.map(v=>{const p=positions.get(v.id),s=sizes.get(v.id);return p||s?{...v,...(p?{x:p.x,y:p.y}:{}),...(s?{width:s.width,height:s.height}:{})}:v;})},false);
        }} onConnect={connect} onDeleteViews={removeViews} onDeleteRelation={removeRelation}
          onExplanationChange={(id,text)=>updateInstance({...active,views:active.views.map(v=>v.id===id?{...v,text}:v)})}
          onAddExplanation={()=>{const view=createView('annotation',null,active.views.length);updateInstance({...active,views:[...active.views,view]});setSelectedId(view.id);setPanel('view');}}/>
        <Playback execution={execution} cursor={cursor} setCursor={setCursor}/>
        {comparison&&<ComparisonPane key={`${comparison.id}-${JSON.stringify(comparison.input)}`} instance={comparison} primary={active} primaryRun={execution} primaryCursor={cursor}/>}
      </main>
      <aside className="max-h-[720px] overflow-auto rounded-xl border border-slate-200 bg-white p-3">
        <div className="mb-4 flex rounded-lg bg-slate-100 p-1">{(['input','view','question'] as const).map(tab=><button type="button" key={tab} className={`flex-1 rounded py-2 text-xs font-semibold ${panel===tab?'bg-white text-indigo-700 shadow-sm':'text-slate-500'}`} onClick={()=>setPanel(tab)}>{tab==='input'?'모델 입력':tab==='view'?'표시 속성':'문제 연결'}</button>)}</div>
        {panel==='input'&&<div className="space-y-4"><label className="block text-xs font-semibold">시뮬레이션 이름<input className={`${fieldClass} mt-1`} value={active.name} onChange={e=>updateInstance({...active,name:e.target.value})}/></label><p className="text-xs leading-relaxed text-slate-500">{registry[active.scenarioId].metadata.learning_goal}</p>
          <InputForm schema={registry[active.scenarioId].inputSchema as FieldSchema} value={active.input} label="계산 입력" onChange={input=>attempt(()=>{updateInstance(replaceInput(active,input as Record<string,Json>));setCursor(-1);})}/>
          <details className="text-xs text-slate-500"><summary className="cursor-pointer">모델의 지원 범위</summary><p className="mt-2 leading-relaxed">{registry[active.scenarioId].metadata.boundary}</p></details>
          <Button type="button" variant="outline" size="sm" disabled={value.instances.length<=1} onClick={()=>{const next={...value,instances:value.instances.filter(i=>i.id!==active.id),explanations:{common:value.explanations.common.filter(id=>id!==active.id),choices:Object.fromEntries(Object.entries(value.explanations.choices).map(([key,ids])=>[key,ids.filter(id=>id!==active.id)]))},question:{...value.question,gradingInstanceId:value.question.gradingInstanceId===active.id?null:value.question.gradingInstanceId}};commit(next);selectInstance(next.instances[0].id);}}><Trash2 className="mr-1 h-3 w-3"/>이 시뮬레이션 삭제</Button>
        </div>}
        {panel==='view'&&(selected?<div className="space-y-3"><p className="text-xs text-slate-500">표시 속성은 계산 결과를 바꾸지 않습니다.</p><label className="block text-xs">제목<input className={fieldClass} value={selected.label} onChange={e=>changeView({label:e.target.value})}/></label>
          <label className="block text-xs">색상<input type="color" className="mt-1 block h-9 w-full" value={selected.color} onChange={e=>changeView({color:e.target.value})}/></label>
          {fields.length>0&&<fieldset className="space-y-1 rounded border p-2 text-xs"><legend>표시할 값</legend>
            <label className="flex gap-2"><input type="checkbox" checked={!selected.fields.length} onChange={()=>changeView({fields:[]})}/>전체 표시</label>
            {fields.map(field=><label key={field} className="flex gap-2"><input type="checkbox" checked={!selected.fields.length||selected.fields.includes(field)} onChange={e=>{const current=selected.fields.length?selected.fields:fields;const next=e.target.checked?[...new Set([...current,field])]:current.filter(f=>f!==field);if(next.length)changeView({fields:next});}}/>{field}</label>)}
          </fieldset>}
          {selected.role==='annotation'&&<label className="block text-xs">나타날 실행 주체<select className={fieldClass} value={selected.when.actor??''} onChange={e=>changeView({when:{...selected.when,actor:e.target.value||null}})}><option value="">모든 주체</option>{semanticEntities(active).actor.map(id=><option key={id}>{id}</option>)}</select></label>}
          {['actor','resource'].includes(selected.role)&&<label className="block text-xs">표시할 대상<select className={fieldClass} value={selected.target??''} onChange={e=>changeView({target:e.target.value||null})}><option value="">전체</option>{(semanticEntities(active)[selected.role as 'actor'|'resource']??[]).map(id=><option key={id} value={id}>{id}</option>)}</select></label>}
          {selected.target&&selected.role==='actor'&&<label className="block text-xs">화면 이름<input className={fieldClass} value={Object.hasOwn(active.labels,selected.target)?active.labels[selected.target]:selected.target} onChange={e=>updateInstance({...active,labels:{...active.labels,[selected.target!]:e.target.value}})}/></label>}
          {selected.role==='annotation'&&<>{lowerExplanation?<p className="text-xs text-slate-500">설명은 그림 아래 입력란에서 작성합니다.</p>:<label className="block text-xs">설명<textarea className={fieldClass} rows={5} value={selected.text} onChange={e=>changeView({text:e.target.value})}/></label>}<label className="block text-xs">나타날 사건<select className={fieldClass} value={selected.when.kind??''} onChange={e=>changeView({when:{...selected.when,kind:e.target.value||null}})}><option value="">항상</option>{[...new Set(execution?.events.map(e=>e.kind)??[])].map(k=><option key={k}>{k}</option>)}</select></label></>}
          <Button type="button" size="sm" variant="outline" className="w-full" onClick={()=>{const view={...structuredClone(selected),id:freshId('view'),x:selected.x+35,y:selected.y+35};updateInstance({...active,views:[...active.views,view]});setSelectedId(view.id);}}>같은 대상의 표시 복제</Button>
          <Button type="button" size="sm" variant="outline" className="w-full" onClick={()=>removeViews([selected.id])}>표시만 삭제</Button>
          {selected.role==='actor'&&selected.target&&<Button type="button" size="sm" variant="destructive" className="w-full" onClick={()=>attempt(()=>{updateInstance(deleteActor(active,selected.target!));setSelectedId(null);setCursor(-1);})}>계산 대상과 연결 표시 삭제</Button>}
        </div>:<p className="text-sm text-slate-400">캔버스 또는 표시 목록에서 선택하세요.</p>)}
        {panel==='question'&&<div className="space-y-4">
          {allowCoding?<><label className="block text-xs">코딩 채점<select aria-label="코딩 채점" className={fieldClass} value={value.question.judgeProfile} onChange={e=>commit({...value,question:{...value.question,judgeProfile:e.target.value as 'text-v1'|'obo-v1',ioFormat:'json-v1',gradingInstanceId:e.target.value==='obo-v1'?active.id:null}})}><option value="text-v1">기존 출력 비교 · 시각화는 해설용</option><option value="obo-v1">시뮬레이션 의미 검사</option></select></label>
            {value.question.judgeProfile==='obo-v1'&&<><label className="block text-xs">채점할 모델<select className={fieldClass} value={value.question.gradingInstanceId??''} onChange={e=>commit({...value,question:{...value.question,gradingInstanceId:e.target.value,ioFormat:'json-v1'}})}><option value="">선택하세요</option>{value.instances.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select></label><label className="block text-xs">검증 범위<select className={fieldClass} value={value.question.assessmentMode} onChange={e=>commit({...value,question:{...value.question,assessmentMode:e.target.value as 'result'|'process',ioFormat:'json-v1'}})}><option value="result">최종 결과</option><option value="process">결과와 필수 과정</option></select></label><p className="text-xs text-slate-500">학생은 안내된 형식으로 결과·기록을 출력합니다. 화면 배치와 색상은 채점하지 않습니다.</p></>}
            {value.question.judgeProfile==='obo-v1'&&value.question.assessmentMode==='result'&&value.instances.find(i=>i.id===value.question.gradingInstanceId)?.scenarioId==='RR'&&<label className="block text-xs">학생 입출력 형식<select aria-label="학생 입출력 형식" className={fieldClass} value={value.question.ioFormat??'json-v1'} onChange={e=>commit({...value,question:{...value.question,ioFormat:e.target.value as 'json-v1'|'rr-segments-v1'}})}><option value="json-v1">기존 JSON 결과 · 시간 지표 포함</option><option value="rr-segments-v1">RR 실행 구간 · ID 시작 종료</option></select><p className="mt-2 text-slate-500">실행 구간을 선택하면 학생은 구간만 출력합니다. I/O 없는 RR에 사용하며, 아래 버튼으로 현재 모델의 입력·출력 예제를 만들 수 있습니다.</p></label>}
          </>:<label className="block text-xs">선택 형식<select className={fieldClass} value={value.question.selectionMode} onChange={e=>commit({...value,question:{...value.question,selectionMode:e.target.value as 'single'|'multiple'}})}><option value="single">단일 선택</option><option value="multiple">복수 선택</option></select></label>}
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={value.explanations.common.includes(active.id)} onChange={e=>commit({...value,explanations:{...value.explanations,common:e.target.checked?[...new Set([...value.explanations.common,active.id])]:value.explanations.common.filter(id=>id!==active.id)}})}/>공통 해설에 이 실행 포함</label>
          {choices.length>0&&<fieldset className="space-y-2 rounded border p-3 text-xs"><legend>현재 실행을 연결할 보기</legend>{choices.map(choice=><label key={choice.id} className="flex items-start gap-2"><input type="checkbox" checked={(value.explanations.choices[choice.id]??[]).includes(active.id)} onChange={e=>{const ids=value.explanations.choices[choice.id]??[];commit({...value,explanations:{...value.explanations,choices:{...value.explanations.choices,[choice.id]:e.target.checked?[...new Set([...ids,active.id])]:ids.filter(id=>id!==active.id)}}});}}/>{choice.text||choice.id}</label>)}</fieldset>}
          {choices.length>0&&<div className="space-y-2"><h4 className="text-xs font-semibold">보기별 독립 해설</h4>{choices.map(choice=><div key={choice.id} className="rounded border p-2 text-xs"><p className="mb-1 truncate">{choice.text||choice.id}</p><p className="mb-2 text-slate-400">{(value.explanations.choices[choice.id]??[]).map(id=>value.instances.find(i=>i.id===id)?.name).filter(Boolean).join(', ')||'연결 없음'}</p><button type="button" disabled={value.instances.length>=8} className="text-indigo-600 disabled:text-slate-300" onClick={()=>{const copy=copyInstance(active);copy.name=`${choice.text.slice(0,20)||choice.id} 해설`;commit({...value,instances:[...value.instances,copy],explanations:{...value.explanations,choices:{...value.explanations.choices,[choice.id]:[...(value.explanations.choices[choice.id]??[]),copy.id]}}});selectInstance(copy.id);}}>현재 구성을 독립 복사</button></div>)}</div>}
          <p className="rounded bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">일반 학습은 본인 채점 완료 후 해설을 제공합니다. 대회 참가자의 해당 문제 해설은 대회 종료까지 잠깁니다. 숨김 테스트는 공개하지 않습니다.</p>
        </div>}
      </aside>
    </div>
  </div>;
}
