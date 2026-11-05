'use client';
import {useMemo} from 'react';
import {OboPlayer} from '../OboPlayer';
import type {OboBlob} from '../types';
import type {ScheduleSegment} from '../runtime/rrText.mjs';
import type {PublicCase} from './PublicCasePlayer';

function blob(segments:ScheduleSegment[],actors:string[],end:number):OboBlob {
  const names=[...actors,...(segments.some(s=>s.actor===null)?['IDLE']:[])];
  const colors=['indigo','emerald','amber','rose','cyan','violet'];
  const nodes=names.map((name,index)=>({id:`rr_row_${index}`,type:'gantt-lane',position:{x:0,y:index*128},
    data:{trackId:name==='IDLE'?'CPU 유휴':name,ganttGroup:'rr',axisEnd:end,
      blocks:segments.filter(s=>(s.actor??'IDLE')===name).map(s=>({start:s.start,end:s.end,colorKey:name==='IDLE'?'slate':colors[index%colors.length]}))}}));
  const indexes:Record<string,number>={};let previous:string|undefined;
  const frames=segments.map((segment,index)=>{
    const actor=segment.actor??'IDLE',id=`rr_row_${names.indexOf(actor)}`;
    const active=indexes[actor]??0;indexes[actor]=active+1;
    const nodeDataOverrides:Record<string,Record<string,unknown>>={};
    if(previous)nodeDataOverrides[previous]={activeBlockIndex:-1};
    nodeDataOverrides[id]={activeBlockIndex:active};previous=id;
    return {id:`rr_step_${index}`,label:`${actor} · ${segment.start}–${segment.end}`,highlightNodes:[id],highlightEdges:[],nodeDataOverrides,cursorTime:segment.end};
  });
  return {nodes,edges:[],frames};
}

export function RrSchedulePlayer({record}:{record:PublicCase}) {
  const diagrams=useMemo(()=>{
    const reference=record.reference?.result.segments as unknown as ScheduleSegment[]|undefined;
    const reported=record.reported?.result.segments as unknown as ScheduleSegment[]|undefined;
    const jobs=record.input?.jobs as unknown as {id:string}[]|undefined;
    if(!reference||!jobs)return null;
    const end=Math.max(1,...reference.map(s=>s.end),...(reported??[]).map(s=>s.end));
    return {reference:blob(reference,jobs.map(j=>j.id),end),reported:reported?blob(reported,jobs.map(j=>j.id),end):null};
  },[record]);
  if(!diagrams)return <p>표시할 실행 구간이 없습니다.</p>;
  return <div className="space-y-5">
    <p className={`rounded-lg p-3 text-sm ${record.correct?'bg-indigo-50 text-indigo-800':'bg-amber-50 text-amber-800'}`}>{record.message}</p>
    <section aria-label="내 RR 실행 구간" className="space-y-2">
      <h3 className="font-semibold">내가 출력한 실행 구간</h3>
      <p className="text-sm text-slate-500">제출한 ID·시작·종료를 그림으로 표시합니다. 프로그램 내부 변수나 대기 큐를 추적한 기록은 아닙니다.</p>
      {diagrams.reported?<div className="h-[560px] overflow-hidden rounded-xl border bg-white"><OboPlayer blob={diagrams.reported}/></div>:<p className="rounded border p-4 text-sm">출력 형식을 읽을 수 없어 내 구간을 표시할 수 없습니다. 위 오류 설명을 확인하세요.</p>}
    </section>
    <section aria-label="기준 RR 실행 구간" className="space-y-2">
      <h3 className="font-semibold">기준 RR 실행 구간</h3>
      <p className="text-sm text-slate-500">같은 입력을 RR 규칙으로 계산한 해설입니다. 두 그림의 시간축 범위는 같습니다.</p>
      <div className="h-[560px] overflow-hidden rounded-xl border bg-white"><OboPlayer blob={diagrams.reference}/></div>
    </section>
  </div>;
}
