import { describe, expect, it } from 'vitest';
import type { Node } from '@xyflow/react';
import { AUTHORING_FIELDS, MANUAL_OVERRIDE_TYPES, changedFields, copyData, nextLocalId, pruneFrameReferences, sceneConflicts, validateElement } from './model';
import { DEFAULT_NODE_DATA } from '../nodes/defaultNodeData';
import { PALETTE_ITEMS, OBO_TEMPLATES } from '../templates';
import { getStateFields } from '../lib/overrideFields';
import { applyFrame } from '../lib/applyFrame';
import type { Frame } from '../types';
const f: Frame={id:'f',label:'scene',highlightNodes:['n'],highlightEdges:['edge'],visibleEdges:['edge'],nodeDataOverrides:{n:{items:['A','B']}}};
describe('manual authoring and data preservation',()=>{
  it('offers all eleven renderers with independent, valid palette defaults',()=>{
    expect(PALETTE_ITEMS).toHaveLength(11);
    for(const p of PALETTE_ITEMS){
      expect(DEFAULT_NODE_DATA[p.type]).toBeDefined();
      if(p.type in AUTHORING_FIELDS) expect(validateElement(p.type,DEFAULT_NODE_DATA[p.type] as Record<string,unknown>).errors).toEqual([]);
    }
    const a=copyData(DEFAULT_NODE_DATA['process-box']) as {threads:{stack:string}[]};
    const b=copyData(DEFAULT_NODE_DATA['process-box']);a.threads[0].stack='changed';
    expect(b).toEqual(DEFAULT_NODE_DATA['process-box']);
  });
  it('rejects empty/non-finite/count errors without mutating drafts',()=>{
    const q={capacity:'',items:['A']};expect(validateElement('queue-strip',q).errors.length).toBeGreaterThan(0);expect(q.capacity).toBe('');
    for(const capacity of [-1,1.5,65,1]) expect(validateElement('queue-strip',{capacity,items:['A','B']}).errors.length).toBeGreaterThan(0);
    expect(validateElement('resource-square',{instances:1,allocated:2}).errors.length).toBeGreaterThan(0);
    expect(validateElement('line-chart',{series:[{name:'x',color:'#000000',points:[{x:0,y:''}]}]}).errors.length).toBeGreaterThan(0);
  });
  it('normalizes multiple related fields as a minimal patch and blocks incompatible later scenes',()=>{
    const node:Node={id:'n',type:'queue-strip',position:{x:0,y:0},data:{capacity:3,items:['A'],direction:'ltr'}};
    const before=copyData(node.data);
    const next=validateElement('queue-strip',{...node.data,capacity:'4',items:['A','C']});
    const patch=changedFields('queue-strip',node.data,next.data);
    expect(patch).toEqual({capacity:4,items:['A','C']});
    expect(sceneConflicts(node,[f],{capacity:1})).toHaveLength(1);
    expect(sceneConflicts(node,[f],{capacity:4})).toEqual([]);
    expect(node.data).toEqual(before);
  });
  it('preserves template scene compatibility and does not extend coding contracts',()=>{
    for(const template of OBO_TEMPLATES) for(const node of template.defaultNodes){
      if(node.type&&node.type in AUTHORING_FIELDS){
        expect(validateElement(node.type,node.data).errors,`${template.id}/${node.id}`).toEqual([]);
        expect(sceneConflicts(node,template.defaultFrames??[],{}),`${template.id}/${node.id}`).toEqual([]);
      }
    }
    for(const type of Object.keys(AUTHORING_FIELDS)) {expect(MANUAL_OVERRIDE_TYPES).toContain(type);expect(getStateFields(type)).toEqual([]);}
    expect(getStateFields('slot-grid')).toEqual(['slots']);
  });
  it('rejects mismatched table shapes, memory totals, duplicate threads and chart axes',()=>{
    expect(validateElement('table-grid',{headers:['a','b'],rows:[[1]]}).errors.length).toBeGreaterThan(0);
    const result=validateElement('memory-range',{start:'4',size:'5',segments:[{id:'a',start:0,size:'2',label:'a'},{id:'b',start:0,size:'3',label:'b'}]});
    expect(result.errors).toEqual([]);expect(result.data.segments).toEqual([{id:'a',start:4,size:2,label:'a'},{id:'b',start:6,size:3,label:'b'}]);
    expect(validateElement('memory-range',{start:0,size:16,segments:[{id:'a',size:5,label:'a'}]}).errors.length).toBeGreaterThan(0);
    expect(validateElement('process-box',{threads:[{id:'x',label:'a'},{id:'x',label:'b'}]}).errors.length).toBeGreaterThan(0);
    expect(nextLocalId([{id:'thread-1'},{id:'thread-3'}],'thread-')).toBe('thread-2');
    expect(validateElement('line-chart',{xMin:2,xMax:1,series:[]}).errors.length).toBeGreaterThan(0);
  });
  it('keeps scene edits separate from the base and cleans references on deletion without changing history',()=>{
    const base:Node={id:'n',type:'queue-strip',position:{x:0,y:0},data:{capacity:3,items:[]}};
    const original=copyData([f]);
    expect(applyFrame([base],[f],0)[0].data.items).toEqual(['A','B']);expect(base.data.items).toEqual([]);
    const pruned=pruneFrameReferences([f],['n'],['edge']);
    expect(pruned[0]).toMatchObject({highlightNodes:[],highlightEdges:[],visibleEdges:[],nodeDataOverrides:{}});
    expect([f]).toEqual(original);
    const legacy={...f,visibleEdges:undefined};expect(pruneFrameReferences([legacy],[],['edge'])[0].visibleEdges).toBeUndefined();
  });
});
