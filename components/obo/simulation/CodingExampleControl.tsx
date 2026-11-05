'use client';
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import type {SimulationDocument} from '../runtime/document.mjs';
import {useSimulation} from './useSimulation';
import {rrInputText,rrOutputText,type ScheduleSegment} from '../runtime/rrText.mjs';

export function CodingExampleControl({document,onAdd}:{document:SimulationDocument;onAdd:(input:string,output:string)=>void}) {
  const instance=document.instances.find(i=>i.id===document.question.gradingInstanceId);
  if(!instance)return <p className="text-sm text-amber-700">문제 연결 탭에서 의미 채점에 사용할 모델을 선택하세요.</p>;
  return <Example instance={instance} mode={document.question.assessmentMode} rr={document.question.ioFormat==='rr-segments-v1'} onAdd={onAdd}/>;
}
function Example({instance,mode,rr,onAdd}:{instance:SimulationDocument['instances'][number];mode:string;rr:boolean;onAdd:(input:string,output:string)=>void}) {
  const {execution,error,loading}=useSimulation(instance,!rr);
  const [added,setAdded]=useState(false);
  let rrInput='',formatError='';
  if(rr)try{rrInput=rrInputText(instance.input);}catch(error){formatError=error instanceof Error?error.message:String(error);}
  return <div className="mt-3 space-y-2 rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-sm">
    <p>{rr?'테스트 입력은 N Q와 프로세스별 ID·도착·실행량입니다. 출력은 ID·시작·종료 구간이며 간트 차트로 표시합니다.':`각 테스트 입력은 이 모델의 설정 JSON입니다. 학생 프로그램은 결과 JSON 하나를 출력합니다${mode==='process'?'(필수 사건 기록 포함)':''}.`}</p>
    <Button type="button" size="sm" disabled={loading||!execution||!!formatError} onClick={()=>{
      if(!execution)return;
      if(rr){onAdd(rrInput,rrOutputText(execution.result.segments as unknown as ScheduleSegment[]));setAdded(true);return;}
      onAdd(JSON.stringify(instance.input,null,2),JSON.stringify({v:1,result:execution.result,...(mode==='process'?{events:execution.events}:{})},null,2));setAdded(true);
    }}>현재 모델로 공개 예제 추가</Button>
    {(error||formatError)&&<p role="alert">{error||formatError}</p>}{added&&<p role="status">테스트케이스 목록에 공개 예제를 추가했습니다.</p>}
  </div>;
}
