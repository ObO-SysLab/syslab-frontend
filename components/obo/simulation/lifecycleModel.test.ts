import {describe,it,expect} from 'vitest';
import {createInstance,createDocument,createView,validateDocument} from '../runtime/document.mjs';
import {registry,run} from '../runtime/index.mjs';
import {lifecycleSnapshot,visibleLifecycleExplanation} from './lifecycleModel';

const instance=()=>({...createInstance('ST2'),input:{processes:{P:'New',Q:'Ready'},actions:[
  {id:'P',event:'create'},{id:'P',event:'dispatch'},{id:'P',event:'io'},
  {id:'Q',event:'dispatch'},{id:'P',event:'completeIO'},{id:'Q',event:'preempt'},
  {id:'P',event:'dispatch'},{id:'P',event:'finish'},
]}});
describe('ST2 visual projection without changing execution',()=>{
 it('starts with a state diagram and a separately stored explanation',()=>{
  const doc=createDocument('ST2');expect(doc.instances[0].views.map(v=>v.role)).toEqual(['relation','annotation']);
  doc.instances[0].views[1].text='그림 아래 설명';expect(validateDocument(JSON.parse(JSON.stringify(doc)))).toBe(true);
 });
 it('starts new documents with two processes passing every transition, keeping the contract example minimal',()=>{
  const i=createDocument('ST2').instances[0],execution=run('ST2',i.input);
  expect(i.views[0]).toMatchObject({role:'relation',width:800,height:460});
  expect(execution.events).toHaveLength(11);
  expect(new Set(execution.events.map(e=>e.kind))).toEqual(new Set(['create','dispatch','io','completeIO','preempt','finish']));
  expect(execution.result).toEqual({states:{P1:'Terminated',P2:'Terminated'}});
  for(let c=0;c<execution.events.length;c++)expect(Object.values(lifecycleSnapshot(i,execution,c).states).filter(s=>s==='Running').length).toBeLessThanOrEqual(1);
  expect(registry.ST2.inputExample).toEqual({processes:{P:'New'},actions:[{id:'P',event:'create'}]});
 });
 it('uses only events up to the selected cursor, including I/O, preemption and completion',()=>{
  const i=instance(),execution=run('ST2',i.input),original=JSON.stringify(i);
  expect(lifecycleSnapshot(i,execution,-1).states).toEqual({P:'New',Q:'Ready'});
  for(let cursor=0;cursor<execution.events.length;cursor++){
   const s=lifecycleSnapshot(i,execution,cursor),event=execution.events[cursor];
   expect(s.states[event.actor!]).toBe(event.data.after);expect(s.transition?.kind).toBe(event.kind);
  }
  expect(lifecycleSnapshot(i,execution,2).states).toEqual({P:'Waiting',Q:'Ready'});
  expect(lifecycleSnapshot(i,execution,7).states).toEqual({P:'Terminated',Q:'Ready'});
  expect(JSON.stringify(i)).toBe(original);
 });
 it('retains authored names and does not invent transitions without a trace',()=>{
  const i=instance();i.labels.P='프로세스 이름이 아주 길어도 그대로 유지';
  const execution=run('ST2',i.input);
  expect(lifecycleSnapshot(i,execution,0).summary).toContain(i.labels.P);
  expect(lifecycleSnapshot(i,null,100).states.P).toBe('New');
  expect(lifecycleSnapshot(i,null,100).transition).toBeUndefined();
 });
 it('preserves annotation actor/event/hidden conditions at initial and replay positions',()=>{
  const i=instance(),execution=run('ST2',i.input),view=createView('annotation');
  view.when={kind:'dispatch',actor:'Q'};
  expect(visibleLifecycleExplanation(view,execution,-1)).toBe(false);
  expect(visibleLifecycleExplanation(view,execution,1)).toBe(false);
  expect(visibleLifecycleExplanation(view,execution,3)).toBe(true);
  view.hidden=true;expect(visibleLifecycleExplanation(view,execution,3)).toBe(false);
 });
 it('loads old ST2 views and explanations without migrating or deleting them',()=>{
  const doc=createDocument('ST2');doc.instances[0].views=['actor','processor','queue','relation','annotation'].map(r=>createView(r));
  doc.instances[0].views[4].text='기존 설명';const encoded=JSON.stringify(doc);
  expect(validateDocument(doc)).toBe(true);lifecycleSnapshot(doc.instances[0],null,-1);
  expect(JSON.stringify(doc)).toBe(encoded);
 });
});
