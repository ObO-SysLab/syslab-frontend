'use client';
import {useMemo,useState} from 'react';
import {Button} from '@/components/ui/button';
import type {SimulationDocument} from '../runtime/document.mjs';
import {instanceForCase} from './publicCaseViews';
import {matchingCursor} from '../runtime/projection.mjs';
import type {Json,ModelRun,SemanticEvent} from '../runtime/index.mjs';
import {SimulationScene} from './SimulationScene';
import {Playback} from './SimulationEditor';
import {RrSchedulePlayer} from './RrSchedulePlayer';
import {TextCasePlayer} from './TextCasePlayer';
import {firstWrongEvent} from './firstWrong';

export interface PublicCase {
  kind?:string;
  caseIndex:number; scenarioId?:string; input?:Record<string,Json>; reference?:ModelRun;
  reported?:{v:1;result:Record<string,Json>;events?:SemanticEvent[];text?:undefined}|{v:1;text:string[];result?:undefined;events?:undefined}|null;
  /** text-v1: the example's stdin text and expected output lines. */
  inputText?:string; expected?:string;
  correct?:boolean; traceValid?:boolean; message?:string; omitted?:string;
}

function Comparison({record,document}:{record:PublicCase;document?:SimulationDocument|null}) {
  const [referenceCursor,setReferenceCursor]=useState(-1),[reportedCursor,setReportedCursor]=useState(-1);
  // The author's graded simulation keeps its cards and layout; see instanceForCase.
  const instance=useMemo(()=>record.scenarioId&&record.input?instanceForCase(document,record.scenarioId,record.input):null,[record,document]);
  const reported:ModelRun|null=useMemo(()=>record.reported?.events&&instance?{id:instance.scenarioId,modelVersion:1,result:record.reported.result,events:record.reported.events,stats:{events:record.reported.events.length,bytes:0}}:null,[record,instance]);
  // A wrong answer stops at its first wrong scene; the reference stays hidden.
  const wrong=record.correct===false;
  const firstWrong=useMemo(()=>wrong&&reported&&record.scenarioId&&record.input?firstWrongEvent(record.scenarioId,record.input,{result:reported.result,events:reported.events}):null,[wrong,reported,record]);
  if(record.omitted)return <p className="rounded border p-4 text-sm text-slate-500">{record.omitted}</p>;
  if(!instance||!record.reference)return <p>표시할 실행 기록이 없습니다.</p>;
  const events=reported?.events.length??0;
  const wrongAt=firstWrong?Math.min(firstWrong.index,events-1):null;
  const headline=!wrong?(record.correct?'정답입니다.':'판정 정보가 없습니다.')
    :!firstWrong?'오답입니다.':firstWrong.finalResult?'오답 · 장면은 모두 맞지만 마지막 결과가 정답과 다릅니다.'
    :firstWrong.index>=events?`오답 · ${events}번째 장면 뒤에 장면이 더 있어야 합니다.`:`오답 · ${firstWrong.index+1}번째 장면부터 정답과 다릅니다.`;
  const mine=<section className="min-w-0 space-y-2"><div className="flex items-center justify-between"><h3 className="font-semibold">내 출력</h3>
      {!wrong&&reported&&<Button size="sm" variant="outline" onClick={()=>{const cursor=matchingCursor(instance,record.reference!,referenceCursor,instance,reported);if(cursor!==null)setReportedCursor(cursor);}}>정답 풀이와 같은 장면 보기</Button>}</div>
    {reported?<>
      <SimulationScene instance={instance} execution={reported} cursor={reportedCursor}/>
      <Playback execution={reported} cursor={reportedCursor} setCursor={setReportedCursor} stopAt={wrongAt??undefined} wrongAt={wrongAt}/></>:
      <div className="rounded-lg border bg-white p-4 text-sm"><p>{record.reported?'과정 기록이 없어 최종 결과만 표시합니다.':'출력 형식을 읽을 수 없어 내 출력을 그림으로 보여 줄 수 없습니다.'}</p>
        {record.reported&&<pre className="mt-3 max-h-96 overflow-auto text-xs">{JSON.stringify(record.reported.result,null,2)}</pre>}</div>}
  </section>;
  return <div className="space-y-3">
    <div className={`rounded-lg p-3 text-sm ${wrong?'bg-rose-50 text-rose-800':'bg-indigo-50 text-indigo-800'}`}><p className="font-semibold" data-verdict>{headline}</p>
      {wrong&&!firstWrong&&record.message&&<p className="mt-1">{record.message}</p>}</div>
    {wrong?mine
      :<div className={`grid gap-4 ${instance.views.some(view=>!view.hidden&&view.width>440)?'':'xl:grid-cols-2'}`}>
        <section className="min-w-0 space-y-2"><h3 className="font-semibold">정답 풀이</h3>
          <SimulationScene instance={instance} execution={record.reference} cursor={referenceCursor}/>
          <Playback execution={record.reference} cursor={referenceCursor} setCursor={setReferenceCursor}/>
        </section>
        {mine}
      </div>}
  </div>;
}

export function PublicCasePlayer({records,document}:{records:PublicCase[];document?:SimulationDocument|null}) {
  const [selected,setSelected]=useState(records[0]?.caseIndex);
  const record=records.find(item=>item.caseIndex===selected)??records[0];
  if(!record)return null;
  return <div className="space-y-3"><h2 className="text-lg font-semibold">공개 예제의 내 출력</h2>
    <div className="flex flex-wrap gap-2">{records.map(item=><Button key={item.caseIndex} variant={record.caseIndex===item.caseIndex?'default':'outline'} onClick={()=>setSelected(item.caseIndex)}>예제 {item.caseIndex}</Button>)}</div>
    {record.kind==='rr-schedule'?<RrSchedulePlayer key={record.caseIndex} record={record}/>:record.kind==='text-lines'?<TextCasePlayer key={record.caseIndex} record={record} document={document}/>:<Comparison key={record.caseIndex} record={record} document={document}/>}
  </div>;
}
