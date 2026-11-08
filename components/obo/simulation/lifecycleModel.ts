import type { ModelRun } from '../runtime/index.mjs';
import type { SimulationInstance, SimulationView } from '../runtime/document.mjs';

export const lifecycleStates = [
  {id:'New',label:'생성'}, {id:'Ready',label:'준비'}, {id:'Running',label:'실행'},
  {id:'Waiting',label:'대기'}, {id:'Terminated',label:'종료'},
] as const;
export const lifecycleTransitions = [
  {kind:'create',from:'New',to:'Ready',label:'등록'},
  {kind:'dispatch',from:'Ready',to:'Running',label:'실행'},
  {kind:'io',from:'Running',to:'Waiting',label:'I/O 요청'},
  {kind:'completeIO',from:'Waiting',to:'Ready',label:'I/O 완료'},
  {kind:'preempt',from:'Running',to:'Ready',label:'선점'},
  {kind:'finish',from:'Running',to:'Terminated',label:'종료'},
] as const;
export const stateLabel = (state: string) => lifecycleStates.find(s=>s.id===state)?.label ?? state;

// Display only: consume the existing validated trace, never simulate ahead of the cursor.
export function lifecycleSnapshot(instance:SimulationInstance,execution:ModelRun|null,cursor:number) {
  const states:Record<string,string>={};
  const initial=instance.input.processes;
  if(initial&&typeof initial==='object'&&!Array.isArray(initial))
    for(const [id,state] of Object.entries(initial))if(typeof state==='string')states[id]=state;
  const events=execution?.events.slice(0,Math.max(0,cursor+1))??[];
  for(const event of events)if(event.actor&&typeof event.data.after==='string')states[event.actor]=event.data.after;
  const current=events.at(-1);
  const transition=current&&lifecycleTransitions.find(t=>t.kind===current.kind&&t.from===current.data.before&&t.to===current.data.after);
  const actor=current?.actor;
  return {states,current,transition,summary:transition&&actor
    ? `${Object.hasOwn(instance.labels,actor)?instance.labels[actor]:actor}: ${stateLabel(transition.from)} → ${stateLabel(transition.to)} · ${transition.label}`
    : '초기 상태'};
}

export function visibleLifecycleExplanation(view:SimulationView,execution:ModelRun|null,cursor:number) {
  const event=execution?.events[cursor];
  return !view.hidden&&(!view.when.kind||view.when.kind===event?.kind)&&(!view.when.actor||view.when.actor===event?.actor);
}
