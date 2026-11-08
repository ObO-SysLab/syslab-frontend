'use client';
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import type {SimulationDocument,SimulationInstance} from '../runtime/document.mjs';
import {SimulationScene} from './SimulationScene';
import {Playback} from './SimulationEditor';
import {useSimulation} from './useSimulation';
import {explanationGroups,type ExplanationChoice} from './explanationGroups';

function InstancePlayer({instance}:{instance:SimulationInstance}) {
  const {execution,error,loading}=useSimulation(instance);
  const [cursor,setCursor]=useState(-1);
  return <div className="space-y-3">
    {(loading||error)&&<p role="status" className="text-sm text-amber-700">{error??'실행 과정을 계산하는 중…'}</p>}
    <SimulationScene instance={instance} execution={execution} cursor={cursor}/>
    <Playback execution={execution} cursor={cursor} setCursor={setCursor}/>
  </div>;
}

export function SimulationPlayer({document,choices=[],selectedAnswers=[]}:{document:SimulationDocument;choices?:ExplanationChoice[];selectedAnswers?:number[]}) {
  const groups=explanationGroups(document,choices,selectedAnswers);
  const [groupId,setGroupId]=useState(groups[0]?.id??'');
  const group=groups.find(g=>g.id===groupId)??groups[0];
  const instances=group?document.instances.filter(i=>group.instanceIds.includes(i.id)):document.instances;
  const [selected,setSelected]=useState(document.instances[0]?.id??'');
  const active=instances.find(i=>i.id===selected)??instances[0];
  if(!active)return <p className="rounded-xl border bg-white p-8 text-center text-slate-500">등록된 시뮬레이션 해설이 없습니다.</p>;
  return <div className="space-y-3">
    {groups.length>1&&<div className="flex flex-wrap gap-2" aria-label="공통 및 보기별 해설">{groups.map(g=><Button key={g.id} className="h-auto max-w-full whitespace-normal text-left" variant={g.id===group?.id?'default':'outline'} onClick={()=>{setGroupId(g.id);setSelected(g.instanceIds[0]);}}>{g.label}{g.selected?' · 선택한 보기':''}</Button>)}</div>}
    <div className="flex flex-wrap gap-2">{instances.map(instance=><Button key={instance.id} variant={instance.id===active.id?'default':'outline'} onClick={()=>setSelected(instance.id)}>{instance.name}</Button>)}</div>
    <InstancePlayer key={active.id} instance={active}/>
  </div>;
}
