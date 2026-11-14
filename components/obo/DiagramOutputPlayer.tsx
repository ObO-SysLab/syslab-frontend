'use client';
import {useMemo,useState} from 'react';
import type {OboCodingSchema} from './types';
import {parseDiagramTrace,parseSimpleOutput} from './runtime/freeDiagram.mjs';
import {generateFramesFromTrace} from './lib/trace';
import {OboPlayer} from './OboPlayer';
import {Button} from '@/components/ui/button';
export interface DiagramOutputRecord {kind:'diagram';caseIndex:number;stdout?:string;omitted?:string;
 /** Whether this example was right and, when not, the first wrong output line (one line = one scene). */
 correct?:boolean;firstWrong?:number|null}

/** Free-mode coding result: my public example output as scenes; a wrong one stops and is marked at its first wrong scene. */
export function DiagramOutputPlayer({schema,records}:{schema:OboCodingSchema;records:DiagramOutputRecord[]}){
 const [index,setIndex]=useState(0);const record=records[index]??records[0];
 // Plain (Baekjoon-style) output is read with the author's line rule; JSON records keep the existing parser.
 const parsed=useMemo(()=>schema.outputFormat?parseSimpleOutput(record?.stdout??'',schema.nodes,schema.edges,schema.outputFormat):parseDiagramTrace(record?.stdout??'',schema.nodes,schema.edges),[record,schema]);
 const frames=useMemo(()=>generateFramesFromTrace(parsed.trace,schema.edges),[parsed,schema]);
 const wrong=record?.correct===false,at=wrong&&Number.isInteger(record?.firstWrong)?record!.firstWrong!:null;
 const wrongFrame=at!==null&&at<frames.length?at:undefined;
 const headline=record?.correct===true?'정답입니다.':!wrong?null:at===null?'오답입니다.'
  :at>=frames.length?`오답 · 출력이 ${frames.length}줄에서 끝났습니다. 줄이 더 있어야 합니다.`:`오답 · ${at+1}번째 줄(장면)부터 정답과 다릅니다.`;
 return <section className="space-y-3" aria-label="내 출력 재생">
  <h2 className="font-bold">공개 예제의 내 출력</h2>
  <div className="flex flex-wrap gap-2">{records.map((r,i)=><Button key={r.caseIndex} variant={i===index?'default':'outline'} onClick={()=>setIndex(i)} aria-pressed={i===index}>예제 {r.caseIndex}</Button>)}</div>
  {headline&&<p data-verdict className={`rounded-lg p-3 text-sm font-semibold ${wrong?'bg-rose-50 text-rose-800':'bg-indigo-50 text-indigo-800'}`}>{headline}</p>}
  {record?.omitted?<p role="alert">{record.omitted}</p>:parsed.errors.length?<div role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{parsed.errors.map((e,i)=><p key={i}>{e.message}</p>)}<p>출력을 장면으로 바꿀 수 없습니다.</p></div>
   :frames.length?<div className="h-[560px] rounded-xl border bg-white"><OboPlayer key={record.caseIndex} blob={{nodes:schema.nodes,edges:schema.edges,frames}} maxFrameIndex={wrongFrame} wrongFrameIndex={wrongFrame}/></div>:<p>재생할 출력 장면이 없습니다.</p>}
 </section>;
}
