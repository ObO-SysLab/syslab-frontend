'use client';
import { useEffect, useState } from 'react';
import { AUTHORING_FIELDS, changedFields, copyData, nextLocalId, validateElement } from './model';
import { ProcessDisplayFields } from './ProcessDisplayFields';

type Data = Record<string, unknown>;
type Row = Record<string, unknown>;
const inputClass = 'w-full min-w-0 rounded border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800';
const buttonClass = 'rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40';
const names: Record<string,string> = { label:'장면 이름', instances:'자원 개수', allocated:'사용 중 개수', capacity:'버퍼 용량', items:'항목', direction:'순서 방향', headers:'열 제목', rows:'셀 값', activeRow:'강조 행', width:'너비', height:'높이', start:'시작 주소', size:'전체 크기', segments:'메모리 구간', activeIds:'강조 구간', sections:'공유 영역', threads:'스레드 문맥', activeThreadId:'현재 스레드', xLabel:'가로축 이름',yLabel:'세로축 이름',xMin:'가로축 최소',xMax:'가로축 최대',yMin:'세로축 최소',yMax:'세로축 최대',xTicks:'가로축 눈금',yTicks:'세로축 눈금',series:'선과 좌표',progressIndex:'마지막 표시 점',activePointIndex:'현재 점' };
Object.assign(names, { hiddenSectionNames: '숨긴 영역', hiddenThreadIds: '숨긴 스레드', threadFields: '스레드 표시 항목', threadLayout: '스레드 배치', sectionLayout: '영역 배치', showSharedLinks: '공유 관계선' });
Object.assign(names, { displayStyle: '표시 방식', showCount: '점유 개수 표시', showDirection: '입출구 방향 표시' });
function Field({ label, value, onChange, number = false }: { label:string; value:unknown; onChange:(v:string)=>void; number?:boolean }) {
  return <label className="block space-y-1 text-xs text-slate-600"><span>{label}</span><input aria-label={label} className={inputClass} inputMode={number ? 'decimal' : undefined} value={String(value ?? '')} onChange={e=>onChange(e.target.value)} /></label>;
}
function Group({ title, children }: { title:string; children:React.ReactNode }) {
  return <fieldset className="min-w-0 space-y-2 rounded-lg border border-slate-200 p-2"><legend className="px-1 text-xs font-semibold text-slate-600">{title}</legend>{children}</fieldset>;
}
function Move({ index, length, onMove, onRemove, name }: { index:number; length:number; onMove:(delta:number)=>void; onRemove:()=>void; name:string }) {
  return <div className="flex gap-1"><button type="button" className={buttonClass} aria-label={`${name} 위로`} disabled={index===0} onClick={()=>onMove(-1)}>↑</button><button type="button" className={buttonClass} aria-label={`${name} 아래로`} disabled={index===length-1} onClick={()=>onMove(1)}>↓</button><button type="button" className={buttonClass} aria-label={`${name} 삭제`} onClick={onRemove}>삭제</button></div>;
}
function reordered<T,>(rows:T[],index:number,delta:number) { const next=[...rows];[next[index],next[index+delta]]=[next[index+delta],next[index]];return next; }

export function ElementFields({ type, data, onApply, scope='base', validatePatch, override, onClear }: {
  type:string; data:Data; onApply:(patch:Data)=>void; scope?:'base'|'scene'; validatePatch?:(patch:Data)=>string[];
  override?:Data; onClear?:(field:string)=>void;
}) {
  const [draft,setDraft]=useState(()=>copyData(data));
  const signature=JSON.stringify(data);
  useEffect(()=>{setDraft(JSON.parse(signature));},[signature,type]);
  const set=(field:string,value:unknown)=>setDraft(d=>({...d,[field]:value}));
  const rows=(key:string):Row[]=>Array.isArray(draft[key])?draft[key] as Row[]:[];
  const updateRow=(key:string,index:number,patch:Row)=>set(key,rows(key).map((r,i)=>i===index?{...r,...patch}:r));
  const result=validateElement(type,draft);
  const patch=changedFields(type,data,result.data);
  const conflicts=result.errors.length?[]:validatePatch?.(patch)??[];
  const errors=[...result.errors,...conflicts];
  const numeric=(key:string,label:string,fallback:number)=><Field label={label} number value={draft[key]??fallback} onChange={v=>set(key,v)} />;
  const select=(key:string,label:string,options:{value:string;label:string}[],empty:unknown=null)=><label className="block space-y-1 text-xs text-slate-600"><span>{label}</span><select aria-label={label} className={inputClass} value={draft[key]==null?'':String(draft[key])} onChange={e=>set(key,e.target.value===''?empty:typeof empty==='string'?e.target.value:Number(e.target.value))}>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
  const tableRows=Array.isArray(draft.rows)?draft.rows as (string|number)[][]:[];
  const headers=Array.isArray(draft.headers)?draft.headers as string[]:[];
  const columns=headers.length || tableRows[0]?.length || 0;
  const setTableRows=(next:(string|number)[][])=>setDraft(d=>({...d,rows:next,activeRow:typeof d.activeRow==='number'&&d.activeRow>=next.length?null:d.activeRow}));
  const series=rows('series');
  const setSeries=(next:Row[])=>{
    const last=Math.max(0,...next.map(s=>Array.isArray(s.points)?s.points.length:0))-1;
    setDraft(d=>({...d,series:next,...(d.progressIndex!==undefined?{progressIndex:Math.min(Number(d.progressIndex),last)}:{}),...(d.activePointIndex!==undefined&&Number(d.activePointIndex)>last?{activePointIndex:-1}:{})}));
  };
  return <div data-element-fields={type} data-edit-scope={scope} className="space-y-3">
    <p className="rounded bg-indigo-50 p-2 text-xs leading-relaxed text-indigo-700">{scope==='base'?'기본 그림의 값입니다. 장면에 따로 정한 값은 유지됩니다.':'선택한 장면의 값입니다. 바뀐 값은 다음에 다른 값을 정할 때까지 이어집니다.'}</p>
    {type==='state-node'&&<><Field label="이 장면의 이름" value={draft.label} onChange={v=>set('label',v)} />
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" aria-label="삭제됨으로 표시" checked={draft.removed===true} onChange={e=>set('removed',e.target.checked)}/>삭제됨으로 표시 (점선·취소선)</label></>}
    {type==='resource-square'&&<>{numeric('instances','자원 개수',1)}{numeric('allocated','사용 중 개수',0)}</>}
    {type==='queue-strip'&&<>
      <Group title="버퍼 표시">
        <label className="block space-y-1 text-xs text-slate-600"><span>버퍼 표시 방식</span><select aria-label="버퍼 표시 방식" className={inputClass} value={String(draft.displayStyle ?? 'strip')} onChange={e=>set('displayStyle',e.target.value)}><option value="strip">기본 큐</option><option value="buffer">버퍼 칸과 입출구</option></select></label>
        {(['showCount','showDirection'] as const).map(key=><label key={key} className="flex items-center gap-2 text-xs"><input type="checkbox" aria-label={key==='showCount'?'점유 개수 표시':'입출구 방향 표시'} checked={draft[key]!==false} onChange={e=>set(key,e.target.checked)}/>{key==='showCount'?'점유 개수 표시':'입출구 방향 표시'}</label>)}
      </Group>
      {numeric('capacity','버퍼 용량 (0~64)',0)}
      <label className="block text-xs">먼저 꺼낼 쪽<select aria-label="먼저 꺼낼 쪽" className={inputClass} value={String(draft.direction??'ltr')} onChange={e=>set('direction',e.target.value)}><option value="ltr">왼쪽</option><option value="rtl">오른쪽</option></select></label>
      <Group title="먼저 꺼낼 순서"><div className="space-y-2">{(Array.isArray(draft.items)?draft.items as string[]:[]).map((value,i,items)=><div key={i} className="space-y-1"><Field label={`항목 ${i+1}`} value={value} onChange={v=>set('items',items.map((s,j)=>j===i?v:s))}/><Move index={i} length={items.length} name={`항목 ${i+1}`} onMove={delta=>set('items',reordered(items,i,delta))} onRemove={()=>set('items',items.filter((_,j)=>j!==i))}/></div>)}</div>
      <button type="button" className={buttonClass} onClick={()=>set('items',[...(Array.isArray(draft.items)?draft.items:[]),'새 항목'])}>항목 추가</button></Group>
    </>}
    {type==='table-grid'&&<>
      {numeric('width','표 너비',300)}
      <Group title="표의 열">{Array.from({length:columns},(_,i)=><div key={i} className="flex items-end gap-1"><Field label={`열 ${i+1} 제목`} value={headers[i]??''} onChange={v=>set('headers',Array.from({length:columns},(_,j)=>j===i?v:headers[j]??''))}/><button type="button" className={buttonClass} aria-label={`열 ${i+1} 삭제`} onClick={()=>setDraft(d=>({...d,headers:Array.from({length:columns},(_,j)=>headers[j]??'').filter((_,j)=>j!==i),rows:tableRows.map(row=>row.filter((_,j)=>j!==i))}))}>삭제</button></div>)}
        <button type="button" className={buttonClass} onClick={()=>setDraft(d=>({...d,headers:[...Array.from({length:columns},(_,j)=>headers[j]??''),'새 열'],rows:tableRows.map(row=>[...row,''])}))}>열 추가</button>
      </Group>
      <Group title="셀 값">{tableRows.map((row,r)=><div key={r} className="space-y-2 border-b border-slate-100 pb-2">{row.map((cell,c)=><Field key={c} label={`행 ${r+1} · 열 ${c+1}`} value={cell} onChange={v=>setTableRows(tableRows.map((cells,i)=>i===r?cells.map((x,j)=>j===c?v:x):cells))}/>)}<Move index={r} length={tableRows.length} name={`행 ${r+1}`} onMove={delta=>setTableRows(reordered(tableRows,r,delta))} onRemove={()=>setTableRows(tableRows.filter((_,i)=>i!==r))}/></div>)}
        <button type="button" className={buttonClass} disabled={!columns} onClick={()=>setTableRows([...tableRows,Array(columns).fill('')])}>행 추가</button>
      </Group>
      {select('activeRow','강조 행',[{value:'',label:'강조 없음'},...tableRows.map((_,i)=>({value:String(i),label:`${i+1}행`}))])}
    </>}
    {type==='memory-range'&&<>
      {numeric('start','시작 주소',0)}{numeric('size','전체 크기',16)}
      <p className="text-xs leading-relaxed text-slate-500">아래 순서와 길이로 주소 경계를 정합니다. 구간 길이 합을 전체 크기에 맞추세요.</p>
      <Group title="주소 순서의 구간">{rows('segments').map((r,i,segments)=><div key={String(r.id)} className="space-y-2 border-b pb-2">
        <Field label={`구간 ${i+1} 이름`} value={r.label} onChange={v=>updateRow('segments',i,{label:v})}/><Field label={`구간 ${i+1} 길이`} number value={r.size} onChange={v=>updateRow('segments',i,{size:v})}/>
        <label className="flex gap-2 text-xs"><input type="checkbox" aria-label={`구간 ${i+1} 빈 공간`} checked={!!r.free} onChange={e=>updateRow('segments',i,{free:e.target.checked})}/>빈 공간</label>
        <label className="flex gap-2 text-xs"><input type="checkbox" aria-label={`구간 ${i+1} 강조`} checked={Array.isArray(draft.activeIds)&&draft.activeIds.includes(r.id)} onChange={e=>set('activeIds',e.target.checked?[...(Array.isArray(draft.activeIds)?draft.activeIds:[]),r.id]:(Array.isArray(draft.activeIds)?draft.activeIds:[]).filter(id=>id!==r.id))}/>이 구간 강조</label>
        <Move index={i} length={segments.length} name={`구간 ${i+1}`} onMove={delta=>set('segments',reordered(segments,i,delta))} onRemove={()=>setDraft(d=>({...d,segments:segments.filter((_,j)=>i!==j),activeIds:(Array.isArray(d.activeIds)?d.activeIds:[]).filter(id=>id!==r.id)}))}/>
      </div>)}<button type="button" className={buttonClass} onClick={()=>set('segments',[...rows('segments'),{id:nextLocalId(rows('segments'),'region-'),label:'새 구간',size:1,start:0,free:true}])}>구간 추가</button></Group>
    </>}
    {type==='process-box'&&<>
      <ProcessDisplayFields data={draft} set={set} />
      <details className="space-y-3 rounded-lg border border-slate-200 p-2"><summary className="cursor-pointer text-xs font-semibold text-slate-700">영역·스레드 값 편집</summary>
      <Group title="프로세스 안의 영역">{rows('sections').map((r,i,sections)=><div key={i} className="space-y-2 border-b pb-2"><Field label={`영역 ${i+1} 이름`} value={r.name} onChange={v=>updateRow('sections',i,{name:v})}/><Field label={`영역 ${i+1} 값`} value={r.value} onChange={v=>updateRow('sections',i,{value:v})}/><label className="flex gap-2 text-xs"><input type="checkbox" aria-label={`영역 ${i+1} 공유`} checked={!!r.shared} onChange={e=>updateRow('sections',i,{shared:e.target.checked})}/>같은 프로세스 안에서 공유</label><Move index={i} length={sections.length} name={`영역 ${i+1}`} onMove={delta=>set('sections',reordered(sections,i,delta))} onRemove={()=>set('sections',sections.filter((_,j)=>i!==j))}/></div>)}<button type="button" className={buttonClass} onClick={()=>set('sections',[...rows('sections'),{name:'새 영역',value:'',shared:true}])}>영역 추가</button></Group>
      <Group title="스레드별 실행 문맥">{rows('threads').map((r,i,threads)=><div key={String(r.id)} className="space-y-2 border-b pb-2">{[['label','이름'],['pc','PC'],['register','레지스터'],['stack','스택']].map(([field,label])=><Field key={field} label={`스레드 ${i+1} ${label}`} value={r[field]} onChange={v=>updateRow('threads',i,{[field]:v})}/>)}<Move index={i} length={threads.length} name={`스레드 ${i+1}`} onMove={delta=>set('threads',reordered(threads,i,delta))} onRemove={()=>setDraft(d=>({...d,threads:threads.filter((_,j)=>i!==j),activeThreadId:d.activeThreadId===r.id?null:d.activeThreadId}))}/></div>)}<button type="button" className={buttonClass} onClick={()=>set('threads',[...rows('threads'),{id:nextLocalId(rows('threads'),'thread-'),label:'새 스레드',pc:'대기',register:'0',stack:'지역값 0'}])}>스레드 추가</button></Group>
      </details>
      {select('activeThreadId','현재 스레드',[{value:'',label:'강조 없음'},...rows('threads').map(t=>({value:String(t.id),label:String(t.label)}))],'')}
    </>}
    {type==='line-chart'&&<>
      <Field label="가로축 이름" value={draft.xLabel} onChange={v=>set('xLabel',v)}/><Field label="세로축 이름" value={draft.yLabel} onChange={v=>set('yLabel',v)}/>
      {numeric('width','그래프 너비',300)}{numeric('height','그래프 높이',190)}
      <Group title="축 범위">{['xMin','xMax','yMin','yMax'].map(key=><Field key={key} label={`${names[key]} (빈칸은 자동)`} number value={draft[key]} onChange={v=>set(key,v.trim()===''?null:v)}/>)}<button type="button" className={buttonClass} onClick={()=>setDraft(d=>({...d,xTicks:null,yTicks:null}))}>눈금 자동으로 맞추기</button></Group>
      <Group title="선과 좌표">{series.map((s,si)=>{
        const points=Array.isArray(s.points)?s.points as Row[]:[];
        const change=(patch:Row)=>setSeries(series.map((v,i)=>i===si?{...v,...patch}:v));
        return <div key={si} className="space-y-2 border-b pb-3"><Field label={`선 ${si+1} 이름`} value={s.name} onChange={v=>change({name:v})}/><label className="flex items-center justify-between text-xs">선 색<input type="color" aria-label={`선 ${si+1} 색`} value={String(s.color??'#0f766e')} onChange={e=>change({color:e.target.value})}/></label>
          {points.map((p,i)=><div key={i} className="space-y-1 rounded bg-slate-50 p-1"><div className="grid grid-cols-2 gap-1"><Field label={`선 ${si+1} 점 ${i+1} X`} number value={p.x} onChange={v=>change({points:points.map((p,j)=>j===i?{...p,x:v}:p)})}/><Field label={`선 ${si+1} 점 ${i+1} Y`} number value={p.y} onChange={v=>change({points:points.map((p,j)=>j===i?{...p,y:v}:p)})}/></div><Move index={i} length={points.length} name={`선 ${si+1} 점 ${i+1}`} onMove={delta=>change({points:reordered(points,i,delta)})} onRemove={()=>change({points:points.filter((_,j)=>j!==i)})}/></div>)}
          <button type="button" className={buttonClass} onClick={()=>change({points:[...points,{x:points.length,y:0}]})}>선 {si+1} 점 추가</button><button type="button" className={buttonClass} onClick={()=>setSeries(series.filter((_,i)=>i!==si))}>선 {si+1} 삭제</button>
        </div>;
      })}<button type="button" className={buttonClass} onClick={()=>setSeries([...series,{name:'새 선',color:'#0f766e',points:[]}])}>선 추가</button></Group>
      <Field label="마지막 표시 점 (0부터, -1은 없음)" number value={draft.progressIndex??Math.max(0,...series.map(s=>Array.isArray(s.points)?s.points.length:0))-1} onChange={v=>set('progressIndex',v)}/>
      <Field label="현재 점 (0부터, -1은 없음)" number value={draft.activePointIndex??-1} onChange={v=>set('activePointIndex',v)}/>
    </>}
    {errors.length>0&&<div role="alert" className="rounded bg-rose-50 p-2 text-xs leading-relaxed text-rose-700">{errors.slice(0,4).map((s,i)=><p key={i}>{s}</p>)}{conflicts.length>0&&<p>충돌하는 장면 값을 먼저 수정하거나 변경 범위를 조정하세요. 저장된 자료는 바꾸지 않았습니다.</p>}</div>}
    <div className="flex gap-2"><button type="button" className="rounded bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40" disabled={errors.length>0||!Object.keys(patch).length} onClick={()=>onApply(patch)}>변경 적용</button><button type="button" className={buttonClass} onClick={()=>setDraft(copyData(data))}>입력 취소</button></div>
    {scope==='scene'&&<button type="button" className={buttonClass} disabled={errors.length>0} onClick={()=>onApply(Object.fromEntries((AUTHORING_FIELDS[type]??[]).filter(k=>result.data[k]!==undefined).map(k=>[k,result.data[k]])))}>현재 값을 이 장면에 고정</button>}
    {onClear&&override&&Object.keys(override).length>0&&<Group title="이 장면에 따로 정한 값">{Object.keys(override).map(key=><div key={key} className="flex items-center justify-between gap-1 text-xs"><span>{names[key]??key}</span><button type="button" className={buttonClass} aria-label={`${names[key]??key} 이전 값 사용`} onClick={()=>onClear(key)}>이전 값 사용</button></div>)}</Group>}
  </div>;
}
