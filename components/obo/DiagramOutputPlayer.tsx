'use client';
import {useMemo,useState} from 'react';
import type {OboCodingSchema} from './types';
import {parseDiagramTrace,parseSimpleOutput} from './runtime/freeDiagram.mjs';
import {generateFramesFromTrace} from './lib/trace';
import {OboPlayer} from './OboPlayer';
export interface DiagramOutputRecord {kind:'diagram';caseIndex:number;stdout?:string;omitted?:string}
export function DiagramOutputPlayer({schema,records}:{schema:OboCodingSchema;records:DiagramOutputRecord[]}){
 const [index,setIndex]=useState(0);const record=records[index]??records[0];
 // Plain (Baekjoon-style) output is read with the author's line rule; JSON records keep the existing parser (2026-11-08).
 const parsed=useMemo(()=>schema.outputFormat?parseSimpleOutput(record?.stdout??'',schema.nodes,schema.edges,schema.outputFormat):parseDiagramTrace(record?.stdout??'',schema.nodes,schema.edges),[record,schema]);
 return <section className="space-y-3" aria-label="실행 출력 재생">
  <h2 className="font-bold">내 코드의 공개 테스트 출력</h2>
  <p className="text-sm text-slate-600">실제 실행에서 나온 기록을 재생합니다. 그림의 차이로 정답을 판정하지 않으며 채점 결과는 서버 판정을 따릅니다.</p>
  <div className="flex flex-wrap gap-2">{records.map((r,i)=><button key={r.caseIndex} onClick={()=>setIndex(i)} aria-pressed={i===index} className="rounded-lg border px-3 py-2 text-sm">공개 테스트 {r.caseIndex}</button>)}</div>
  {record?.omitted?<p role="alert">{record.omitted}</p>:parsed.errors.length?<div role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{parsed.errors.map((e,i)=><p key={i}>{e.message}</p>)}<p>출력 기록을 재생할 수 없습니다. 이 안내는 채점 결과를 바꾸지 않습니다.</p></div>:parsed.trace.length?<div className="h-[560px] rounded-xl border bg-white"><OboPlayer key={record.caseIndex} blob={{nodes:schema.nodes,edges:schema.edges,frames:generateFramesFromTrace(parsed.trace,schema.edges)}}/></div>:<p>재생할 출력 장면이 없습니다.</p>}
 </section>;
}
