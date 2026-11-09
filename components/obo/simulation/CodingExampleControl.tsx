'use client';
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import type {SimulationDocument} from '../runtime/document.mjs';
import {useSimulation} from './useSimulation';
import {rrInputText,rrOutputText,type ScheduleSegment} from '../runtime/rrText.mjs';
import {inputToText,textReference} from '../runtime/textFormats.mjs';
import {generateHiddenCases,type CaseFormat} from './inputGenerator';

/** Adds the current model input (and its reference output) as a public example or a hidden test. Semantic grading recomputes the answer on the server. */
export function CodingExampleControl({document,onAdd,existing=[]}:{document:SimulationDocument;onAdd:(input:string,output:string,sample:boolean)=>void;existing?:string[]}) {
  const instance=document.instances.find(i=>i.id===document.question.gradingInstanceId);
  if(!instance)return <p className="text-sm text-amber-700">문제 연결 탭에서 의미 채점에 사용할 모델을 선택하세요.</p>;
  const format:CaseFormat=document.question.ioFormat==='text-v1'?'text-v1':document.question.ioFormat==='rr-segments-v1'?'rr-segments-v1':'json-v1';
  return <><Example instance={instance} mode={document.question.assessmentMode} rr={format==='rr-segments-v1'} text={format==='text-v1'} onAdd={onAdd}/>
    <RandomTests instance={instance} format={format} mode={document.question.assessmentMode} existing={existing} onAdd={onAdd}/></>;
}
/** Random hidden tests (2026-11-08): varied inputs from the current model, each with the engine's expected output. */
function RandomTests({instance,format,mode,existing,onAdd}:{instance:SimulationDocument['instances'][number];format:CaseFormat;mode:string;existing:string[];onAdd:(input:string,output:string,sample:boolean)=>void}) {
  const [seed,setSeed]=useState(()=>10000+Math.floor(Math.random()*90000));
  const [status,setStatus]=useState<{text:string;short:boolean}|null>(null);
  const add=(count:number)=>{
    const g=generateHiddenCases(instance.scenarioId,instance.input,{count,seed,format,mode,existing});
    for(const c of g.cases)onAdd(c.input,c.output,false);
    const made=`숨김 테스트 ${g.cases.length}개를 추가했습니다 · 서로 다른 정답 ${g.cases.length}개 · 시도 ${g.tries}번 · 시드 ${g.seed}`;
    setStatus(g.cases.length===count?{text:made,short:false}:{text:`요청한 ${count}개 중 ${g.cases.length}개만 만들었습니다(시도 ${g.tries}번 · 시드 ${g.seed}). 이미 있는 테스트와 정답이 겹치거나 만들 수 있는 정답이 적습니다.${g.cases.length===0&&g.lastError?` 마지막 이유: ${g.lastError}`:''} 모델 입력을 바꾸거나 직접 추가하세요.`,short:true});
    setSeed(value=>value+1);
  };
  return <div className="obo-scope mt-2 space-y-2 rounded-lg border border-indigo-100 bg-white p-3 text-sm" data-random-tests>
    <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">무작위 숨김 테스트</span>
      <label className="flex items-center gap-1 text-xs text-slate-600">시드<input type="number" aria-label="무작위 시드" className="w-24 rounded border px-2 py-1" value={seed} onChange={e=>setSeed(Number(e.target.value)||0)}/></label>
      {[3,5,10].map(count=><Button key={count} type="button" size="sm" variant="outline" onClick={()=>add(count)}>{count}개 추가</Button>)}</div>
    <p className="text-xs text-slate-500">현재 모델 입력을 바탕으로 값을 바꾼 입력을 만들고, 같은 엔진이 계산한 기대 출력과 함께 숨김 테스트로 추가합니다. 엔진이 받아들이는 입력만 쓰고, 이미 있는 테스트와 정답이 같은 입력은 넣지 않습니다. 같은 시드·모델 입력·기존 테스트면 같은 테스트가 다시 만들어집니다.</p>
    {status&&<p role="status" className={status.short?'text-amber-700':'text-indigo-800'}>{status.text}</p>}
  </div>;
}
function Example({instance,mode,rr,text,onAdd}:{instance:SimulationDocument['instances'][number];mode:string;rr:boolean;text:boolean;onAdd:(input:string,output:string,sample:boolean)=>void}) {
  const {execution,error,loading}=useSimulation(instance,!rr&&!text);
  const [added,setAdded]=useState<null|'sample'|'hidden'>(null);
  let rrInput='',formatError='';
  if(rr)try{rrInput=rrInputText(instance.input);}catch(error){formatError=error instanceof Error?error.message:String(error);}
  // Baekjoon-style text (2026-11-08): the input text and the expected lines come from the same engine as grading.
  let textCase:{input:string;expected:string}|null=null;
  if(text)try{const input=inputToText(instance.scenarioId,instance.input);textCase={input,expected:textReference(instance.scenarioId,input).expected};}catch(error){formatError=error instanceof Error?error.message:String(error);}
  return <div className="obo-scope mt-3 space-y-2 rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-sm">
    <p>{text?'각 테스트 입력은 위의 백준식 텍스트입니다. 학생 프로그램은 안내된 줄 형식으로 출력합니다.':rr?'테스트 입력은 N Q와 프로세스별 ID·도착·실행량입니다. 출력은 ID·시작·종료 구간이며 간트 차트로 표시합니다.':`각 테스트 입력은 이 모델의 설정 JSON입니다. 학생 프로그램은 결과 JSON 하나를 출력합니다${mode==='process'?'(필수 사건 기록 포함)':''}.`}</p>
    <div className="flex flex-wrap gap-2">{([['sample','현재 모델로 공개 예제 추가'],['hidden','현재 모델로 숨김 테스트 추가']] as const).map(([kind,label])=><Button key={kind} type="button" size="sm" variant={kind==='sample'?'default':'outline'} disabled={text?!textCase:loading||!execution||!!formatError} onClick={()=>{
      const sample=kind==='sample';
      if(textCase){onAdd(textCase.input,textCase.expected,sample);setAdded(kind);return;}
      if(!execution)return;
      if(rr){onAdd(rrInput,rrOutputText(execution.result.segments as unknown as ScheduleSegment[]),sample);setAdded(kind);return;}
      onAdd(JSON.stringify(instance.input,null,2),JSON.stringify({v:1,result:execution.result,...(mode==='process'?{events:execution.events}:{})},null,2),sample);setAdded(kind);
    }}>{label}</Button>)}</div>
    <p className="text-xs text-indigo-900/70">입력을 바꿔 가며 숨김 테스트를 여러 개 추가하세요. 정답은 서버가 같은 엔진으로 다시 계산합니다.</p>
    {(error||formatError)&&<p role="alert">{error||formatError}</p>}{added&&<p role="status">테스트케이스 목록에 {added==='sample'?'공개 예제':'숨김 테스트'}를 추가했습니다.</p>}
  </div>;
}
