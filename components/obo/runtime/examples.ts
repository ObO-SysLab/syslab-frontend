import {createDocument,createView,arrangeViews,type SimulationDocument} from './document.mjs';

export const examples = [
  {id:'cpu',name:'라운드 로빈 간트차트',description:'3개 프로세스가 CPU를 번갈아 사용하는 흐름'},
  {id:'philosophers',name:'식사하는 철학자',description:'5명이 왼쪽 포크를 먼저 잡을 때 생기는 교착'},
  {id:'kernel',name:'시스템 호출',description:'사용자 영역 → 커널 진입 → 문맥 복원과 반환'},
];

export function exampleDocument(id:string):SimulationDocument {
  const document=createDocument(id==='cpu'?'RR':id==='philosophers'?'DP':'K-SYSCALL');
  const instance=document.instances[0];
  if(id==='cpu') {
    instance.name='라운드 로빈 · 할당량 2';
    instance.input={jobs:[{id:'P1',arrival:0,bursts:[5]},{id:'P2',arrival:1,bursts:[3]},{id:'P3',arrival:2,bursts:[4]}],policy:'RR',quantum:2};
    instance.views.find(v=>v.role==='timeline')!.label='CPU 간트차트';
  } else if(id==='philosophers') {
    const actors=['P1','P2','P3','P4','P5'];
    instance.name='왼쪽 포크 먼저 · 교착 관찰';
    instance.input={actors,order:[...actors,...actors,...actors],policy:'left',mode:'fixedSchedule',
      thinkTicks:Object.fromEntries(actors.map(p=>[p,0])),eatTicks:Object.fromEntries(actors.map(p=>[p,1])),goalMeals:{}};
    instance.views=[...actors.map(p=>createView('actor',p)),...actors.map((_,i)=>createView('resource',`fork_${i}`)),
      createView('relation'),createView('timeline'),createView('annotation')];
  } else {
    instance.name='시스템 호출 · 사용자와 커널';
    instance.input={scenario:'syscall',current:'P1',blocked:'P2',contexts:{P1:{pc:120,sp:4096},P2:{pc:80,sp:8192}},at:3,returnValue:7};
  }
  document.instances[0]=arrangeViews(instance);
  return document;
}
