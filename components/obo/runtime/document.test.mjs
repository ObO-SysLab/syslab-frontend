import {describe,it,expect} from 'vitest';
import {modelList,run} from './index.mjs';
import {createDocument,createView,copyInstance,addActor,deleteActor,replaceInput,connectResource,validateDocument} from './document.mjs';
import {projection,matchingCursor} from './projection.mjs';

describe('simulation documents and projections',()=>{
  for(const model of modelList)it(`${model.id}: default document, every role, every prefix`,()=>{
    const document=createDocument(model.id),instance=document.instances[0];
    expect(validateDocument(document)).toBe(true);
    expect(document.explanations.common).toEqual([instance.id]);
    const execution=run(model.id,instance.input);
    for(let cursor=-1;cursor<execution.events.length;cursor++)for(const view of instance.views){
      const p=projection(instance,execution,cursor,view);
      expect(p.visible).toBe(true);expect(p.rows).toBeInstanceOf(Array);
      expect(()=>JSON.stringify(p)).not.toThrow();
    }
  });
  it('copy and display edits leave calculation and original instance untouched',()=>{
    const original=createDocument('G2').instances[0],copy=copyInstance(original);
    copy.views[0].x+=100;copy.views.push(createView('timeline'));
    expect(run(copy.scenarioId,copy.input)).toEqual(run(original.scenarioId,original.input));
    copy.input.jobs[0].arrival+=2;
    expect(copy.input.jobs[0].arrival).not.toBe(original.input.jobs[0].arrival);
  });
  it('added actor enters actual calculation and removing it restores original model',()=>{
    const original=createDocument('G2').instances[0],added=addActor(original);
    const newId=added.input.jobs.at(-1).id;
    expect(run('G2',added.input).events.some(e=>e.actor===newId)).toBe(true);
    expect(deleteActor(added,newId).input).toEqual(original.input);
  });
  it('semantic resource ownership conserves availability and rejects over-allocation',()=>{
    const original=createDocument('S3').instances[0];
    original.input.available[0]=1;
    const next=connectResource(original,original.input.actors[0],original.input.resources[0],'assign');
    expect(next.input.available[0]).toBe(0);
    expect(next.input.allocated[0][0]).toBe(original.input.allocated[0][0]+1);
    expect(()=>connectResource(next,next.input.actors[0],next.input.resources[0],'assign')).toThrow();
  });
  it('initial projection does not expose future state and an event updates it',()=>{
    const instance=createDocument('ST2').instances[0],execution=run('ST2',instance.input);
    const view=createView('actor');
    expect(projection(instance,execution,-1,view).rows).toContainEqual(['P','생성']);
    expect(projection(instance,execution,0,view).rows).toContainEqual(['P','준비']);
  });
  it('different model families never align by raw event number',()=>{
    const a=createDocument('ST2').instances[0],b=createDocument('P2').instances[0];
    expect(matchingCursor(a,run(a.scenarioId,a.input),0,b,run(b.scenarioId,b.input))).toBeNull();
  });
  it('invalid references, duplicate identifiers, unknown payloads and malformed annotations fail',()=>{
    for(const mutate of [
      d=>d.instances[0].id='',
      d=>d.instances.push(structuredClone(d.instances[0])),
      d=>d.explanations.common.push('missing'),
      d=>d.hiddenTestcases=['secret'],
      d=>d.instances[0].views[0].when.kind={},
      d=>d.instances[0].views[0].fields=[{}],
      d=>d.instances[0].decorations.push({id:'edge',source:'missing',target:'missing'}),
      d=>d.instances[0].views[0].x=NaN,
    ]) {const d=createDocument();mutate(d);expect(()=>validateDocument(d)).toThrow();}
  });
  it('input replacement removes deleted view bindings and stale annotation actor conditions',()=>{
    const instance=createDocument('ST2').instances[0];
    instance.views.unshift(createView('actor','P'));instance.views.at(-1).when.actor='P';
    const next=replaceInput(instance,{processes:{Q:'New'},actions:[]});
    expect(next.views.some(v=>v.target==='P')).toBe(false);
    expect(next.views.at(-1).when.actor).toBeNull();
  });
});
