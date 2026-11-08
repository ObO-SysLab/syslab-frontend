'use client';
import { useId } from 'react';
import type { ModelRun } from '../runtime/index.mjs';
import type { SimulationInstance, SimulationView } from '../runtime/document.mjs';
import { lifecycleSnapshot, lifecycleStates, lifecycleTransitions, stateLabel, visibleLifecycleExplanation } from './lifecycleModel';
import styles from './LifecycleVisual.module.css';

const positions:Record<string,[number,number]>={New:[85,192],Ready:[280,92],Running:[490,192],Waiting:[280,310],Terminated:[685,192]};
const paths=[
  'M 143 165 Q 185 110 214 106', 'M 335 126 Q 380 185 424 190',
  'M 454 246 Q 415 310 346 310', 'M 280 244 L 280 158',
  'M 490 126 Q 480 30 346 72', 'M 556 192 L 619 192',
];
const labels=[[171,126],[385,160],[405,298],[238,205],[444,51],[589,177]];

export function LifecycleVisual({instance,execution,cursor,view}:{instance:SimulationInstance;execution:ModelRun|null;cursor:number;view:SimulationView}) {
  const marker=useId().replaceAll(':','');
  const {states,transition,current}=lifecycleSnapshot(instance,execution,cursor);
  if(view.role!=='relation') {
    let entries=Object.entries(states).filter(([id])=>!view.target||id===view.target);
    if(view.role==='processor')entries=entries.filter(([,state])=>state==='Running');
    if(view.role==='queue')entries=entries.filter(([,state])=>state==='Ready'||state==='Waiting');
    if(view.fields.length&&view.role==='actor')entries=entries.filter(([id])=>view.fields.includes(instance.labels[id]??id));
    return <div className="flex flex-wrap gap-2" data-lifecycle-summary={view.role}>
      {entries.map(([id,state])=><span key={id} title={`${instance.labels[id]??id} · ${stateLabel(state)}`} className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${state==='Running'?'bg-teal-600':'bg-slate-400'}`}/>
        <strong className="break-all">{instance.labels[id]??id}</strong><span className="shrink-0 text-slate-500">{stateLabel(state)}</span>
      </span>)}
      {!entries.length&&<span className="text-sm text-slate-400">{view.role==='processor'?'유휴':'비어 있음'}</span>}
    </div>;
  }
  // Older authored documents keep their small view sizes and layout.
  if(view.width<600)return <div data-lifecycle-compact className="flex h-full flex-col justify-center gap-3">
    {transition?<><p className="truncate text-center text-xs text-slate-500" title={current?.actor?instance.labels[current.actor]??current.actor:undefined}>{current?.actor?instance.labels[current.actor]??current.actor:''} · {transition.label}</p>
      <div className="flex items-center justify-center gap-3 text-base font-semibold"><span>{stateLabel(transition.from)}</span><span aria-hidden="true" className="text-slate-400">→</span><span style={{color:view.color}}>{stateLabel(transition.to)}</span></div></>
      :<div className="flex flex-wrap justify-center gap-2">{lifecycleStates.map(s=><span key={s.id} className="rounded-full border px-2 py-1 text-xs">{s.label} <strong>{Object.values(states).filter(v=>v===s.id).length}</strong></span>)}</div>}
  </div>;
  return <svg width="770" height="390" viewBox="0 0 770 390" role="group" aria-label="프로세스 상태 전이" className="block h-auto w-full" data-lifecycle-diagram>
    <defs>{[false,true].map(active=><marker key={String(active)} id={`${marker}-${active}`} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 Z" fill={active?view.color:'#94a3b8'}/></marker>)}</defs>
    {lifecycleTransitions.map((edge,i)=>{
      const active=transition?.kind===edge.kind;
      return <g key={edge.kind} data-transition={edge.kind} data-active={active}>
        {active&&<path d={paths[i]} fill="none" stroke={view.color} strokeOpacity="0.15" strokeWidth="10"/>}
        <path d={paths[i]} fill="none" stroke={active?view.color:'#cbd5e1'} strokeWidth={active?3.5:1.5} markerEnd={`url(#${marker}-${active})`} className={active?styles.flow:undefined} data-lifecycle-flow={active||undefined}/>
        <text x={labels[i][0]} y={labels[i][1]} textAnchor="middle" fontSize={active?14:13} fontWeight={active?800:400} fill={active?view.color:'#64748b'} paintOrder="stroke" stroke="white" strokeWidth="5" strokeLinejoin="round">{edge.label}</text>
      </g>;
    })}
    {lifecycleStates.map(state=>{
      const [x,y]=positions[state.id];const entries=Object.entries(states).filter(([,s])=>s===state.id);
      const active=current?.data.after===state.id;
      return <g key={state.id} data-lifecycle-state={state.id} data-active={active}>
        {active&&<>
          <circle cx={x} cy={y} r="78" fill={view.color} fillOpacity="0.07"/>
          <circle cx={x} cy={y} r="72" fill="none" stroke={view.color} strokeWidth="2.5" className={styles.orbit} data-lifecycle-orbit/>
        </>}
        <circle cx={x} cy={y} r="65" fill={entries.length?`${view.color}${active?'25':'0d'}`:'white'} stroke={entries.length||active?view.color:'#cbd5e1'} strokeWidth={active?4:entries.length?2:1.5}/>
        <text x={x} y={y-27} textAnchor="middle" fontSize="17" fontWeight="700" fill="#1e293b">{state.label}</text>
        <foreignObject x={x-53} y={y-16} width="106" height="64">
          <div tabIndex={0} className="nodrag nowheel flex h-full flex-wrap content-start justify-center gap-1 overflow-auto px-1 py-1" aria-label={`${state.label} 프로세스`}>
            {entries.map(([id])=><span key={id} data-lifecycle-process={id} title={instance.labels[id]??id} className={`max-w-full break-all rounded px-2 py-1 font-bold ${current?.actor===id?'bg-slate-900 text-sm text-white ring-2 ring-white':'bg-white text-xs text-slate-700'}`}>{instance.labels[id]??id}</span>)}
            {!entries.length&&<span className="pt-2 text-sm text-slate-300" aria-label="프로세스 없음">—</span>}
          </div>
        </foreignObject>
      </g>;
    })}
  </svg>;
}

export function LifecycleExplanation({instance,execution,cursor,onChange,onAdd}:{instance:SimulationInstance;execution:ModelRun|null;cursor:number;onChange?:(id:string,text:string)=>void;onAdd?:()=>void}) {
  const notes=instance.views.filter(v=>v.role==='annotation');
  const visible=notes.filter(v=>visibleLifecycleExplanation(v,execution,cursor)&&v.text.trim());
  const {summary}=lifecycleSnapshot(instance,execution,cursor);
  return <section aria-label="ST2 하단 설명" className="border-t border-slate-200 bg-white px-4 py-3" data-lifecycle-explanation>
    <p className="text-sm font-semibold text-slate-800" aria-live="polite">{summary}</p>
    {onChange?<div className="mt-3 space-y-3">
      {notes.map((view,i)=><label key={view.id} className="block text-sm text-slate-600">
        <span className="mb-1 flex flex-wrap items-center gap-2"><span>{notes.length===1?'설명':`설명 ${i+1}`}</span><span className="text-xs text-slate-400">{view.hidden?'숨김':view.when.kind||view.when.actor?`${lifecycleTransitions.find(t=>t.kind===view.when.kind)?.label??view.when.kind??'모든 사건'} · ${view.when.actor??'모든 프로세스'}`:'항상 표시'}</span></span>
        <textarea aria-label={`ST2 설명 ${i+1}`} rows={3} maxLength={4000} value={view.text} onChange={e=>onChange(view.id,e.target.value)} placeholder="이 그림에서 전달할 내용을 적으세요." className="w-full resize-y rounded-lg border border-slate-200 bg-white p-3 text-sm leading-relaxed text-slate-800"/>
      </label>)}
      {onAdd&&<button type="button" onClick={onAdd} className="text-sm font-medium text-teal-700">+ 설명 추가</button>}
    </div>:visible.map(view=><p key={view.id} className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600">{view.text}</p>)}
  </section>;
}
