import {registry} from './index.mjs';
import {semanticEntities} from './document.mjs';
const names={arrive:'도착',dispatch:'실행 선택',run:'실행',block:'대기',unblock:'대기 해제',finish:'완료',idle:'유휴',expire:'할당량 만료',preempt:'선점',reference:'페이지 참조',lookup:'조회',pageTable:'페이지 테이블 조회',translate:'주소 변환',fault:'페이지 부재',allocate:'할당',free:'해제',reject:'거절',request:'요청',grant:'자원 할당',release:'반납',detect:'교착 검사',wait:'대기',acquire:'획득',put:'삽입',take:'제거',wake:'재개',check:'안전성 검사',deny:'거절',think:'생각',eat:'식사',inode:'inode 조회',indirect:'간접 참조',data:'데이터 접근',eof:'파일 끝',move:'헤드 이동',service:'처리',wrap:'반대편 경계로 복귀',read:'읽기',write:'쓰기',send:'송신',receive:'수신',resume:'재개',enter:'커널 진입',save:'문맥 저장',restore:'문맥 복원',select:'실행 대상 선택',return:'반환',interrupt:'인터럽트',handle:'핸들러 실행',create:'생성',io:'I/O 요청',completeIO:'I/O 완료'};
const show=value=>value===null||value===undefined?'—':typeof value==='object'?JSON.stringify(value):String(value);
const stateNames={new:'생성 전',New:'생성',ready:'준비',Ready:'준비',running:'실행',Running:'실행',blocked:'대기',Waiting:'대기',done:'완료',Terminated:'종료',thinking:'생각 중',hungry:'포크 대기',waiting:'포크 대기',eating:'식사 중'};
const pairs=value=>value&&typeof value==='object'?Object.entries(value).map(([k,v])=>[k,show(v)]):[['값',show(value)]];
export function eventLabel(event){return event?`${names[event.kind]??event.kind}${event.actor?` · ${event.actor}`:''}`:'초기 상태';}
export function semanticPosition(instance,event){
  if(!event)return {unit:'initial',value:-1,label:'초기 상태'};
  if(registry[instance.scenarioId].family==='cpu-scheduling')return {unit:'time',value:event.data.time,label:`t=${event.data.time}`};
  if(typeof event.data.index==='number')return {unit:'input',value:event.data.index,label:`입력 ${event.data.index+1}`};
  return {unit:'named',value:`${event.kind}:${event.actor??''}`,label:eventLabel(event)};
}
export function matchingCursor(primary,primaryRun,cursor,other,otherRun) {
  if(registry[primary.scenarioId].family!==registry[other.scenarioId].family)return null;
  const p=semanticPosition(primary,primaryRun?.events[cursor]);if(p.unit==='initial')return -1;
  let result=null;
  otherRun?.events.forEach((event,index)=>{const q=semanticPosition(other,event);if(q.unit===p.unit&&q.value===p.value)result=index;});
  return result;
}
export function projection(instance,execution,cursor,view) {
  const input=instance.input,id=instance.scenarioId,family=registry[id].family;
  const prefix=execution?.events.slice(0,cursor+1)??[],event=prefix.at(-1),data=event?.data??{},entities=semanticEntities(instance);
  const final=execution&&cursor===execution.events.length-1&&cursor>=0?execution.result:null;
  const title=view.label,label=x=>Object.hasOwn(instance.labels,x)?instance.labels[x]:x;
  const lifecycleStates={...input.processes};if(id==='ST2')for(const e of prefix)lifecycleStates[e.actor]=e.data.after;
  const effectiveSpaces=structuredClone(input.spaces??{});
  if(family==='process-structure')for(const e of prefix)if(e.kind==='write'&&e.data.scope==='shared')effectiveSpaces[input.threads[e.actor].process][e.data.key]=e.data.value;
  let rows=[],tokens=[],bars=[],links=[],metric=null,segments=[],disk=null;
  if(view.role==='actor') {
    let states=data.states??{};
    if(id==='ST2'){states={...input.processes};for(const e of prefix)states[e.actor]=e.data.after;}
    else if(family==='context-switch')states=Object.fromEntries(entities.actor.map(p=>[p,p===(data.current??input.initialId)?'Running':'Ready']));
    else if(family==='bounded-buffer')states=Object.fromEntries(entities.actor.map(p=>[p,data.actors?.[p]?.blocked?'Waiting':`동작 ${data.actors?.[p]?.pc??0}`]));
    else if(family==='banker')states=Object.fromEntries(entities.actor.map(p=>[p,data.finish?.[p]?'검사 완료':'미완료']));
    else if(family==='process-structure')states=Object.fromEntries(entities.actor.map(p=>[p,`주소 공간 ${input.threads[p].process}`]));
    // Before the first event the engine's initial states apply: current runs, blocked waits, the rest are ready.
    else if(family==='kernel-flow'&&!event)states=Object.fromEntries(entities.actor.map(p=>[p,p===input.current?'Running':p===input.blocked?'Waiting':'Ready']));
    rows=entities.actor.filter(p=>!view.target||p===view.target).map(p=>[label(p),show(stateNames[states[p]]??states[p]??(event?.actor===p?'현재 동작':'준비'))]);
  }else if(view.role==='processor')rows=[['실행 대상',show(id==='ST2'?Object.keys(lifecycleStates).find(p=>lifecycleStates[p]==='Running'):data.current??(cursor<0?input.current??null:null))],['시각',show(data.time??(family==='kernel-flow'?input.at:0))],['실행 영역',show(data.mode??(family==='kernel-flow'?'user':null))]];
  else if(view.role==='queue') {
    const values=data.ready??data.buffer??data.channel??input.initial??[];tokens=Array.isArray(values)?values.map(show):[];
    if(family==='disk-scheduling'){const serviced=new Set(prefix.filter(e=>e.kind==='service').map(e=>e.data.service));tokens=input.requests.filter(r=>!serviced.has(r.id)).map(r=>`${r.id}: ${r.position}`);}
  }else if(view.role==='resource') {
    if(family==='dining-philosophers')rows=entities.resource.map((r,i)=>[r,show(data.owners?.[i]??null)]).filter(([r])=>!view.target||r===view.target);
    else if(family==='bounded-buffer')rows=pairs(data.semaphores??{empty:input.capacity-input.initial.length,full:input.initial.length,mutex:null}).filter(([r])=>!view.target||r===view.target);
    else rows=entities.resource.map((r,i)=>[r,`가용 ${(data.available??input.available)[i]}`]).filter(([r])=>!view.target||r===view.target);
  }else if(view.role==='memory') {
    if(family==='contiguous-allocation')bars=(data.blocks??input.initial).map(b=>({label:b.owner??'여유',size:b.size,start:b.start,empty:b.owner===null}));
    else if(family==='memory-pressure'){
      rows=Object.keys(input.quotas).map(p=>{const last=prefix.filter(e=>e.actor===p).at(-1);return [label(p),show(last?.data.frames??Array(input.quotas[p]).fill(null))];});
    }else if(family==='address-translation')rows=input.table.map((p,i)=>[`페이지 ${i}`,p===null?'부재':`프레임 ${p}`]);
    else if(family==='process-structure')rows=pairs(effectiveSpaces);
    else if(family==='ipc')rows=pairs(data.shared??input.shared);
    else tokens=(data.frames??Array(input.frameCount??input.capacities?.[0]??1).fill(null)).map(show);
  }else if(view.role==='record') {
    let value=data;
    if(family==='cpu-scheduling')value={남은실행량:data.remaining??Object.fromEntries(input.jobs.map(p=>[p.id,p.bursts[0]])),상태:data.states??{}};
    else if(family==='bounded-buffer')value={버퍼:data.buffer??input.initial,'실행 주체':data.actors??Object.fromEntries(input.actors.map(actor=>[actor.id,{role:actor.role,pc:0,blocked:false}])),세마포어:data.semaphores??{empty:input.capacity-input.initial.length,full:input.initial.length,mutex:null},'진행 상태':data.stopReason??'initial'};
    else if(family==='ipc'){
      const blocked=new Set(),reads=[];
      for(const e of prefix){if(e.data.blocked)blocked.add(e.actor);else{blocked.delete(e.actor);const op=input.operations[e.data.index]?.op;if(op==='read'||op==='receive')reads.push(e.data.value);}}
      value={'실행 주체':Object.fromEntries(input.actors.map(actor=>[actor,blocked.has(actor)?'대기':event?.actor===actor?'현재 동작':'준비'])),채널:data.channel??input.initial,공유값:data.shared??input.shared,'읽은 값':reads};
    }
    else if(family==='context-switch')value={현재:data.current??input.initialId,레지스터:data.registers??input.pcbs[input.initialId],PCB:data.pcbs??input.pcbs};
    else if(family==='banker'){
      const need=data.need??input.max.map((row,p)=>row.map((v,i)=>v-input.allocated[p][i]));
      // A request may be tentatively allocated in the current safety check.
      value={Available:data.available??input.available,Allocation:input.max.map((row,p)=>row.map((v,i)=>v-need[p][i])),Max:input.max,Need:need,Work:data.work??input.available,Finish:data.finish??{}};
    }
    else if(family==='address-translation')value={페이지테이블:input.table,TLB:data.tlb??input.initialTlb,페이지:data.page??null,오프셋:data.offset??null};
    else if(family==='process-structure'){const spaces=structuredClone(input.spaces),threads=structuredClone(input.threads);for(const e of prefix)if(e.kind==='write'){const target=e.data.scope==='shared'?spaces[threads[e.actor].process]:threads[e.actor].registers;target[e.data.key]=e.data.value;}value={주소공간:spaces,스레드:threads};}
    else if(family==='kernel-flow')value={모드:data.mode==='kernel'?'커널':'사용자',...Object.fromEntries(Object.entries(data.contexts??input.contexts).map(([actor,registers])=>[actor,Object.entries(registers).map(([key,value])=>`${key} = ${value}`).join(' · ')])),반환값:data.returnValue??null};
    rows=pairs(value);
  }else if(view.role==='region') {
    if(family==='kernel-flow')rows=[['사용자',data.mode==='kernel'?'일시 중단':'실행 영역'],['커널',data.mode==='kernel'?'실행 영역':'대기']];
    else rows=pairs(family==='ipc'?data.shared??input.shared:effectiveSpaces);
    if(!rows.length)rows=[['영역','이 실행 내부의 독립 공간']];
  }else if(view.role==='relation') {
    links=semanticLinks(instance,execution,cursor).map(e=>[e.from,e.to,e.kind]);rows=links.map(([a,b,k])=>[`${label(a)} → ${label(b)}`,k]);
  }else if(view.role==='timeline') {
    if(family==='cpu-scheduling')for(const e of prefix.filter(e=>['run','idle'].includes(e.kind))){const actor=e.actor??'유휴',end=e.data.time,last=segments.at(-1);if(last&&last.actor===actor&&last.end===end-1)last.end=end;else segments.push({actor,start:end-1,end});}
    else rows=prefix.slice(-12).map(e=>[String(e.step+1),eventLabel(e)]);
  }else if(view.role==='metric') {
    if(family==='page-replacement'){const faults=prefix.filter(e=>!e.data.hit).length;metric=String(faults);rows=[['지표','현재까지의 부재 수']];if(id==='P3'){metric=null;rows=input.capacities.map(n=>[`${n}프레임`,`${prefix.filter(e=>e.data.capacity===n&&!e.data.hit).length}회`]);}}
    else if(family==='memory-pressure')rows=Object.keys(input.quotas).map(p=>{const last=prefix.filter(e=>e.actor===p).at(-1);return [p,`부재 ${last?.data.faults??0} · 작업집합 ${last?.data.workingSet??0}`];});
    else if(family==='cpu-scheduling')rows=final?Object.entries(final.metrics).map(([actor,m])=>[label(actor),`대기 ${m.waiting} · 응답 ${m.response} · 반환 ${m.turnaround}`]):[['시각',show(data.time??0)],['대기 중',String(data.ready?.length??0)]];
    else if(family==='disk-scheduling')metric=String(data.distance??0);
    else if(family==='bounded-buffer')rows=pairs(data.semaphores??{});
    else rows=final?pairs(final):[['진행한 사건',String(prefix.length)]];
  }else if(view.role==='storage') {
    if(family==='disk-scheduling')disk={head:data.to??input.start,max:input.max,requests:input.requests.map(r=>r.position)};
    else rows=pairs({디렉터리:input.fs.directory,inode:input.fs.inodes,간접블록:input.fs.indirect,데이터:input.fs.blocks});
  }else rows=[[eventLabel(event),view.text||registry[id].metadata.learning_goal]];
  if(view.role==='annotation'&&data.stopReason==='deadlocked')rows.push(['실행 상태','교착: 모든 주체가 자원을 기다리고 있습니다.']);
  if(view.fields.length)rows=rows.filter(([key])=>view.fields.includes(key));
  const visible=!view.hidden&&(!view.when.kind||view.when.kind===event?.kind)&&(!view.when.actor||view.when.actor===event?.actor);
  return {title,rows,tokens,bars,links,metric,segments,disk,visible,caption:eventLabel(event)};
}
export function semanticLinks(instance,execution,cursor) {
  const x=instance.input,data=execution?.events[cursor]?.data??{},family=registry[instance.scenarioId].family,links=[];
  if(family==='resource-allocation') {
    const allocated=data.allocations??x.allocated,requests=data.requests??x.requests;
    x.actors.forEach((p,i)=>x.resources.forEach((r,j)=>{if(allocated[i][j])links.push({id:`assign-${p}-${r}`,from:r,to:p,kind:'assign',count:allocated[i][j]});if(requests[i][j])links.push({id:`request-${p}-${r}`,from:p,to:r,kind:'request',count:requests[i][j]});}));
  }else if(family==='dining-philosophers') {
    (data.owners??x.actors.map(()=>null)).forEach((owner,i)=>{if(owner!==null)links.push({id:`own-${i}`,from:`fork_${i}`,to:owner,kind:'소유',count:1});});
    x.actors.forEach((actor,i)=>{
      if(data.states?.[actor]!=='waiting')return;
      const forks=[i,(i+1)%x.actors.length];if(x.policy==='ordered')forks.sort((a,b)=>a-b);
      const wanted=forks.find(index=>data.owners?.[index]!==actor);
      if(wanted!==undefined&&data.owners?.[wanted]!=null)links.push({id:`request-${actor}-${wanted}`,from:actor,to:`fork_${wanted}`,kind:'request',count:1});
    });
  }else if(family==='kernel-flow') {
    const prefix=execution?.events.slice(0,cursor+1)??[];
    // Mode changes only on enter/interrupt (user→kernel) and restore (kernel→user); return stays in kernel mode.
    for(const e of prefix){
      const entry=e.kind==='enter'||e.kind==='interrupt';
      if(entry||e.kind==='restore')links.push({id:`mode-${e.step}`,from:entry?'사용자 영역':'커널 영역',to:entry?'커널 영역':'사용자 영역',kind:entry?'진입':'복귀',count:1});
    }
  }else if(family==='lifecycle') {
    const prefix=execution?.events.slice(0,cursor+1)??[];for(const e of prefix)links.push({id:`transition-${e.step}`,from:e.data.before,to:e.data.after,kind:names[e.kind]??e.kind,count:1});
  }else if(family==='inode-access') {
    Object.entries(x.fs.directory).forEach(([name,id])=>links.push({id:`name-${name}`,from:name,to:id,kind:'inode',count:1}));
    Object.entries(x.fs.inodes).forEach(([id,n])=>n.direct.forEach((b,i)=>links.push({id:`block-${id}-${i}`,from:id,to:b,kind:'직접',count:1})));
  }
  return links;
}
