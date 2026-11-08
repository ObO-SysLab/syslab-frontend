'use client';
import { useState } from 'react';
import type { Json } from '../runtime/index.mjs';

export type FieldSchema = {
  type?: string; properties?: Record<string, FieldSchema>; required?: string[];
  additionalProperties?: boolean | FieldSchema; items?: FieldSchema; enum?: Json[]; const?: Json;
  anyOf?: FieldSchema[]; oneOf?: FieldSchema[]; minimum?: number; maximum?: number;
  minItems?: number; maxItems?: number; maxLength?: number;
};
const labels: Record<string, string> = {
  jobs:'프로세스', id:'식별 이름', arrival:'도착 시각', bursts:'CPU / I/O 실행량', priority:'우선순위', policy:'규칙', quantum:'시간 할당량',
  processes:'프로세스 상태', actions:'사건 일정', event:'사건', pcbs:'PCB', initialId:'첫 실행 대상', order:'행동 순서',
  refs:'페이지 참조열', frameCount:'프레임 수', initial:'초기 내용', capacities:'비교할 프레임 수', stream:'참조 일정', quotas:'프로세스별 프레임', window:'작업집합 관찰 창', frameBudget:'전체 프레임 예산',
  page:'페이지', addresses:'가상 주소열', pageSize:'페이지 크기', table:'페이지 테이블', capacity:'용량', initialTlb:'초기 TLB', frame:'물리 프레임',
  total:'전체 크기', operations:'동작 일정', op:'동작', size:'크기', start:'시작 위치', owner:'소유자', actors:'주체', resources:'자원 종류',
  available:'가용 자원', allocated:'현재 할당', requests:'요청', max:'최대 요구 / 범위', request:'추가 요청', values:'수량', actor:'주체',
  role:'역할', mode:'방식', thinkTicks:'생각 시간', eatTicks:'식사 시간', goalMeals:'목표 식사 횟수', fs:'파일 시스템', blockSize:'블록 크기',
  directory:'파일 이름 연결', inodes:'inode', direct:'직접 블록', indirect:'간접 블록', blocks:'데이터 블록', accesses:'접근 일정', name:'이름', offset:'오프셋',
  position:'실린더 위치', direction:'진행 방향', spaces:'공유 주소 공간', threads:'스레드', process:'소속 프로세스', registers:'레지스터', stack:'개별 스택', thread:'스레드', scope:'접근 영역', key:'필드 이름', value:'값',
  shared:'공유 값', scenario:'처리 경로', current:'실행 중인 주체', blocked:'대기 중인 주체', contexts:'주체별 문맥', at:'사건 시점', returnValue:'반환값',
};
export function seed(schema: FieldSchema): Json {
  if ('const' in schema) return schema.const ?? null;
  if (schema.enum) return structuredClone(schema.enum[0]);
  if (schema.anyOf || schema.oneOf) return seed((schema.anyOf ?? schema.oneOf)![0]);
  if (schema.type === 'object') return Object.fromEntries(Object.entries(schema.properties ?? {}).filter(([k]) => schema.required?.includes(k)).map(([k,s]) => [k,seed(s)]));
  if (schema.type === 'array') return Array.from({length:schema.minItems ?? 0},()=>seed(schema.items ?? {}));
  if (schema.type === 'integer' || schema.type === 'number') return Math.max(0,schema.minimum ?? 0);
  if (schema.type === 'boolean') return false;
  if (schema.type === 'null') return null;
  return '';
}
const box = 'w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300';
function accepts(schema: FieldSchema,value: Json | undefined): boolean {
  if (schema.type === 'null') return value === null;
  if (schema.type === 'array') return Array.isArray(value);
  if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    return Object.entries(schema.properties ?? {}).every(([k,s]) => !('const' in s) || value[k] === s.const);
  }
  return schema.type === 'integer' || schema.type === 'number' ? typeof value === 'number' : typeof value === schema.type;
}
export function InputForm({schema,value,onChange,label='입력',path='input'}:{schema:FieldSchema;value:Json|undefined;onChange:(value:Json)=>void;label?:string;path?:string}) {
  const [newKey,setNewKey] = useState('');
  const [page,setPage] = useState(0);
  const variants=schema.anyOf ?? schema.oneOf;
  if (variants) {
    const selected=Math.max(0,variants.findIndex(s=>accepts(s,value)));
    return <div className="space-y-2 rounded-md border border-slate-100 p-2"><label className="text-xs font-semibold text-slate-600">{label}</label>
      <select aria-label={`${label} 값 종류`} className={box} value={selected} onChange={e=>onChange(seed(variants[Number(e.target.value)]))}>
        {variants.map((s,i)=><option key={i} value={i}>{String(s.properties?.op?.const ?? ({null:'없음',string:'문자',integer:'정수',boolean:'참/거짓',object:'설정',array:'목록'}[s.type ?? ''] ?? `형식 ${i+1}`))}</option>)}
      </select>{variants[selected].type!=='null'&&<InputForm schema={variants[selected]} value={value} onChange={onChange} label={label} path={path}/>}</div>;
  }
  if (schema.enum || 'const' in schema) {
    const values=schema.enum ?? [schema.const ?? null];
    return <label className="block space-y-1 text-xs font-medium text-slate-600">{label}<select className={box} aria-label={label} value={Math.max(0,values.findIndex(v=>v===value))} onChange={e=>onChange(values[Number(e.target.value)])}>
      {values.map((v,i)=><option key={i} value={i}>{String(v)}</option>)}</select></label>;
  }
  if (schema.type==='object') {
    const record=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
    const known=schema.properties ?? {};
    const entries=schema.properties?Object.keys(known):Object.keys(record);
    const extra=typeof schema.additionalProperties==='object'?schema.additionalProperties:null;
    const set=(key:string,v:Json)=>onChange({...record,[key]:v});
    const remove=(key:string)=>{const next={...record};delete next[key];onChange(next);};
    return <fieldset className="min-w-0 space-y-3 rounded-lg border border-slate-200 p-3"><legend className="px-1 text-xs font-bold text-slate-700">{label}</legend>
      {entries.slice(page*20,page*20+20).map(key=>{
        const child=Object.hasOwn(known,key)?known[key]:extra??{};
        const optional=!!schema.properties&&!schema.required?.includes(key);
        return <div key={key} className="space-y-1">
          {optional&&<label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={Object.hasOwn(record,key)} onChange={e=>e.target.checked?set(key,seed(child)):remove(key)}/>{Object.hasOwn(labels,key)?labels[key]:key} 사용</label>}
          {(!optional||Object.hasOwn(record,key))&&<InputForm schema={child} value={record[key]} onChange={v=>set(key,v)} label={Object.hasOwn(labels,key)?labels[key]:key} path={`${path}.${key}`}/>}
          {!schema.properties&&<button type="button" className="text-xs text-rose-600" onClick={()=>remove(key)}>{key} 삭제</button>}
        </div>;
      })}
      {entries.length>20&&<div className="flex items-center gap-2 text-xs"><button type="button" disabled={page===0} onClick={()=>setPage(p=>p-1)}>이전</button><span>{page+1} / {Math.ceil(entries.length/20)}</span><button type="button" disabled={(page+1)*20>=entries.length} onClick={()=>setPage(p=>p+1)}>다음</button></div>}
      {extra&&<div className="flex gap-1"><input className={box} value={newKey} placeholder="새 필드 이름" aria-label={`${label} 새 이름`} onChange={e=>setNewKey(e.target.value)}/><button type="button" className="shrink-0 rounded border px-2 text-xs" disabled={!/^[A-Za-z0-9_-]{1,64}$/.test(newKey)||Object.hasOwn(record,newKey)||['__proto__','constructor','prototype'].includes(newKey)} onClick={()=>{set(newKey,seed(extra));setNewKey('');}}>추가</button></div>}
    </fieldset>;
  }
  if (schema.type==='array') {
    const items=Array.isArray(value)?value:[];
    return <fieldset className="min-w-0 space-y-2 rounded-lg border border-slate-200 p-3"><legend className="px-1 text-xs font-bold text-slate-700">{label} · {items.length}</legend>
      {items.slice(page*20,page*20+20).map((item,offset)=>{const index=page*20+offset;return <div key={`${path}-${index}`} className="space-y-1 border-b border-slate-100 pb-2">
        <InputForm schema={schema.items??{}} value={item} onChange={v=>onChange(items.map((x,i)=>i===index?v:x))} label={`${label} ${index+1}`} path={`${path}[${index}]`}/>
        <div className="flex gap-3 text-xs"><button type="button" disabled={items.length<=(schema.minItems??0)} className="text-rose-600 disabled:opacity-30" onClick={()=>onChange(items.filter((_,i)=>i!==index))}>삭제</button>
          <button type="button" disabled={index===0} className="disabled:opacity-30" onClick={()=>{const next=[...items];[next[index-1],next[index]]=[next[index],next[index-1]];onChange(next);}}>위로</button></div>
      </div>;})}
      {items.length>20&&<div className="flex gap-2 text-xs"><button type="button" disabled={page===0} onClick={()=>setPage(p=>p-1)}>이전</button><span>{page+1}/{Math.ceil(items.length/20)}</span><button type="button" disabled={(page+1)*20>=items.length} onClick={()=>setPage(p=>p+1)}>다음</button></div>}
      <button type="button" className="rounded-md bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 disabled:opacity-40" disabled={items.length>=(schema.maxItems??10000)} onClick={()=>onChange([...items,seed(schema.items??{})])}>항목 추가</button>
    </fieldset>;
  }
  if (schema.type==='null') return <p className="text-xs text-slate-500">{label}: 없음</p>;
  if (schema.type==='boolean') return <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={value===true} onChange={e=>onChange(e.target.checked)}/>{label}</label>;
  const numeric=schema.type==='integer'||schema.type==='number';
  return <label className="block space-y-1 text-xs font-medium text-slate-600">{label}<input aria-label={label} className={box} type={numeric?'number':'text'} min={schema.minimum} max={schema.maximum} step={numeric?1:undefined} maxLength={schema.maxLength} value={typeof value==='string'||typeof value==='number'?value:''} onChange={e=>onChange(numeric?Number(e.target.value):e.target.value)}/></label>;
}
