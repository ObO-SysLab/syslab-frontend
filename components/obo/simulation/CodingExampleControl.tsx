'use client';
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import type {SimulationDocument} from '../runtime/document.mjs';
import {useSimulation} from './useSimulation';

export function CodingExampleControl({document,onAdd}:{document:SimulationDocument;onAdd:(input:string,output:string)=>void}) {
  const instance=document.instances.find(i=>i.id===document.question.gradingInstanceId);
  if(!instance)return <p className="text-sm text-amber-700">문제 연결 탭에서 의미 채점에 사용할 모델을 선택하세요.</p>;
  return <Example instance={instance} mode={document.question.assessmentMode} onAdd={onAdd}/>;
}
function Example({instance,mode,onAdd}:{instance:SimulationDocument['instances'][number];mode:string;onAdd:(input:string,output:string)=>void}) {
  const {execution,error,loading}=useSimulation(instance);
  const [added,setAdded]=useState(false);
  return <div className="mt-3 space-y-2 rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-sm">
    <p>각 테스트 입력은 이 모델의 설정 JSON입니다. 학생 프로그램은 결과 JSON 하나를 출력합니다{mode==='process'?'(필수 사건 기록 포함)':''}.</p>
    <Button type="button" size="sm" disabled={loading||!execution} onClick={()=>{
      if(!execution)return;
      onAdd(JSON.stringify(instance.input,null,2),JSON.stringify({v:1,result:execution.result,...(mode==='process'?{events:execution.events}:{})},null,2));setAdded(true);
    }}>현재 모델로 공개 예제 추가</Button>
    {error&&<p role="alert">{error}</p>}{added&&<p role="status">테스트케이스 목록에 공개 예제를 추가했습니다.</p>}
  </div>;
}
