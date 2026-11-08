'use client';
import {useMemo,useState} from 'react';
import {Button} from '@/components/ui/button';
import {createInstance,createView,type SimulationInstance} from '../runtime/document.mjs';
import {matchingCursor} from '../runtime/projection.mjs';
import type {Json,ModelRun,SemanticEvent} from '../runtime/index.mjs';
import {SimulationScene} from './SimulationScene';
import {Playback} from './SimulationEditor';
import {RrSchedulePlayer} from './RrSchedulePlayer';

export interface PublicCase {
  kind?:string;
  caseIndex:number; scenarioId?:string; input?:Record<string,Json>; reference?:ModelRun;
  reported?:{v:1;result:Record<string,Json>;events?:SemanticEvent[]}|null;
  correct?:boolean; traceValid?:boolean; message?:string; omitted?:string;
}

function Comparison({record}:{record:PublicCase}) {
  const [referenceCursor,setReferenceCursor]=useState(-1),[reportedCursor,setReportedCursor]=useState(-1);
  const instance=useMemo(()=>{
    if(!record.scenarioId||!record.input)return null;
    const base=createInstance(record.scenarioId);
    // Targeted defaults refer to example IDs, which may differ in the public input.
    const views=base.views.some(view=>view.target!==null)
      ? [...new Set(base.views.map(view=>view.role))].map((role,index)=>createView(role,null,index))
      : base.views;
    return {...base,input:record.input,views} as SimulationInstance;
  },[record]);
  if(record.omitted)return <p className="rounded border p-4 text-sm text-slate-500">{record.omitted}</p>;
  if(!instance||!record.reference)return <p>표시할 실행 기록이 없습니다.</p>;
  // The result page's 896px content area leaves at most 440px per comparison column.
  const needsFullWidth=instance.views.some(view=>!view.hidden&&view.width>440);
  const reported:ModelRun|null=record.reported?.events?{id:instance.scenarioId,modelVersion:1,result:record.reported.result,events:record.reported.events,stats:{events:record.reported.events.length,bytes:0}}:null;
  return <div className="space-y-3">
    <p className={`rounded-lg p-3 text-sm ${record.correct?'bg-indigo-50 text-indigo-800':'bg-amber-50 text-amber-800'}`}>{record.message}</p>
    <div className={`grid gap-4 ${needsFullWidth?'':'xl:grid-cols-2'}`}>
      <section className="min-w-0 space-y-2"><h3 className="font-semibold">기준 실행</h3>
        <SimulationScene instance={instance} execution={record.reference} cursor={referenceCursor}/>
        <Playback execution={record.reference} cursor={referenceCursor} setCursor={setReferenceCursor}/>
      </section>
      <section className="min-w-0 space-y-2"><div className="flex items-center justify-between"><h3 className="font-semibold">학생이 출력한 기록</h3>
        {reported&&<Button size="sm" variant="outline" onClick={()=>{const cursor=matchingCursor(instance,record.reference!,referenceCursor,instance,reported);if(cursor!==null)setReportedCursor(cursor);}}>같은 기준으로 탐색</Button>}</div>
        {reported?<><p className="text-xs text-slate-500">{record.traceValid?'의미 규칙을 통과한 기록입니다.':'형식은 읽을 수 있지만 의미 규칙을 통과하지 않은 기록입니다.'} 실제 변수 추적 기록은 아닙니다.</p>
          <SimulationScene instance={instance} execution={reported} cursor={reportedCursor}/>
          <Playback execution={reported} cursor={reportedCursor} setCursor={setReportedCursor}/></>:
          <div className="rounded-lg border bg-white p-4 text-sm"><p>{record.reported?'검증된 과정 기록이 없어 최종 결과만 표시합니다.':'출력 형식을 읽을 수 없어 제출 기록을 시각화할 수 없습니다.'}</p>
            {record.reported&&<pre className="mt-3 max-h-96 overflow-auto text-xs">{JSON.stringify(record.reported.result,null,2)}</pre>}</div>}
      </section>
    </div>
  </div>;
}

export function PublicCasePlayer({records}:{records:PublicCase[]}) {
  const [selected,setSelected]=useState(records[0]?.caseIndex);
  const record=records.find(item=>item.caseIndex===selected)??records[0];
  if(!record)return null;
  return <div className="space-y-3"><h2 className="text-lg font-semibold">공개 예제의 제출 결과</h2>
    <div className="flex flex-wrap gap-2">{records.map(item=><Button key={item.caseIndex} variant={record.caseIndex===item.caseIndex?'default':'outline'} onClick={()=>setSelected(item.caseIndex)}>예제 {item.caseIndex}</Button>)}</div>
    {record.kind==='rr-schedule'?<RrSchedulePlayer key={record.caseIndex} record={record}/>:<Comparison key={record.caseIndex} record={record}/>}
  </div>;
}
