'use client';
import type {ScheduleSegment} from '../runtime/rrText.mjs';
import {TIMELINE_COLOR_PALETTE} from '../nodes/ganttColors';

/** Present released intervals only, with shared row order and a shared numeric axis. */
export function RrTimeline({rows,actors,end,time,difference,onSeek,name}:{
  rows:ScheduleSegment[];actors:string[];end:number;time:number;difference:number|null;onSeek:(time:number)=>void;name:string;
}) {
  const colors=['indigo','teal','amber','rose','slate','violet'];
  const step=Math.max(1,Math.ceil(end/4));
  const ticks=[0,...Array.from({length:3},(_,i)=>(i+1)*step).filter(t=>end-t>=step*0.4),end];
  return <div tabIndex={0} role="region" aria-label={`${name} 간트 그림`} className="max-h-[420px] overflow-auto rounded-lg border bg-white p-2">
    <div className="sticky top-0 z-10 grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-2 bg-white pb-2">
      <span className="text-xs text-slate-600">시간</span>
      <div data-rr-axis className="relative h-5 text-[11px] text-slate-600">{ticks.map(t=><span key={t} className="absolute" style={{left:`${t/end*100}%`,transform:t===0?'none':t===end?'translateX(-100%)':'translateX(-50%)'}}>{t}</span>)}</div>
    </div>
    {actors.map((actor,index)=>{
      const blocks=rows.filter(row=>(row.actor??'IDLE')===actor);
      const color=TIMELINE_COLOR_PALETTE[actor==='IDLE'?'slate':colors[index%colors.length]]??'#64748b';
      return <div key={actor} data-rr-row={actor} className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-x-2 border-t border-slate-100 py-2">
        <span title={actor} className="break-all text-xs font-semibold leading-4 text-slate-700">{actor}</span>
        <div className="relative h-12 rounded bg-slate-50">
          {ticks.map(t=><div key={t} className="pointer-events-none absolute inset-y-0 border-l border-slate-200" style={{left:`${t/end*100}%`}}/>)}
          {blocks.map((block,i)=>{
            const active=block.start<=time&&time<block.end;
            return <button key={i} type="button" tabIndex={-1} aria-label={`${actor} 구간 ${i+1}: ${block.start}–${block.end}`} title={`${actor}: [${block.start}, ${block.end})`} data-rr-block={i} data-active={active}
              onClick={()=>onSeek(block.start)} className="absolute inset-y-1 overflow-hidden rounded-sm border text-[10px] font-semibold" style={{left:`${block.start/end*100}%`,width:`${(block.end-block.start)/end*100}%`,minWidth:1,background:active?color:`${color}24`,borderColor:color,color:active?'white':'#334155',outline:active?`2px solid ${color}`:undefined,outlineOffset:1,zIndex:active?2:1}}>
              {(block.end-block.start)/end>=0.2?`${block.start}–${block.end}`:''}
            </button>;
          })}
          {difference!==null&&<div aria-hidden="true" className="pointer-events-none absolute inset-y-0 z-[3] border-l-2 border-dashed border-amber-600" style={{left:`${difference/end*100}%`}}/>}
          <div data-rr-cursor aria-hidden="true" className="pointer-events-none absolute inset-y-0 z-[4] border-l-2 border-rose-600" style={{left:`${time/end*100}%`}}/>
        </div>
      </div>;
    })}
  </div>;
}
