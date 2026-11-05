import {describe,it,expect} from 'vitest';
import {OBO_TEMPLATES,PALETTE_ITEMS} from '../templates';
import {DEFAULT_NODE_DATA} from '../nodes/defaultNodeData';
import {validateFreeDiagram} from './freeDiagram.mjs';
const blob=()=>({nodes:[{id:'q',type:'queue-strip',position:{x:0,y:0},data:{capacity:2,items:['A']}}],edges:[],frames:[]});
const scene=(extra={})=>({id:'f1',label:'장면',highlightNodes:[],highlightEdges:[],...extra});
describe('free diagram saving boundary',()=>{
 for(const t of OBO_TEMPLATES)it(`preserves ${t.id} unchanged`,()=>{
  const b={nodes:t.defaultNodes,edges:t.defaultEdges,frames:t.defaultFrames??[]};const before=JSON.stringify(b);
  for(const d of [b,{mode:'single',single:b},{mode:'per_choice',perChoice:{choice_1:b}}])expect(()=>validateFreeDiagram(d)).not.toThrow();
  expect(JSON.stringify(b)).toBe(before);
 });
 for(const {type}of PALETTE_ITEMS)it(`accepts independent ${type}`,()=>{const b=blob();b.nodes[0]={id:'a',type,position:{x:1,y:2},data:DEFAULT_NODE_DATA[type]};expect(()=>validateFreeDiagram(b)).not.toThrow();});
 it('rejects dangling and duplicate IDs',()=>{
  let b=blob();b.nodes.push({...b.nodes[0]});expect(()=>validateFreeDiagram(b)).toThrow(/중복/);
  b=blob();b.edges.push({id:'e',source:'q',target:'missing'});expect(()=>validateFreeDiagram(b)).toThrow(/대상/);
 });
 it('validates carried values in subsequent scenes without mutation',()=>{
  const b=blob();b.frames=[scene({nodeDataOverrides:{q:{items:['A','B']}}}),scene({id:'f2',nodeDataOverrides:{q:{capacity:1}}})];
  const before=JSON.stringify(b);expect(()=>validateFreeDiagram(b)).toThrow(/장면 2/);expect(JSON.stringify(b)).toBe(before);
 });
 it('checks scene references, types and reserved keys',()=>{
  for(const patch of [{highlightNodes:['missing']},{visibleEdges:['missing']},{nodeDataOverrides:{q:{items:42}}},{nodeDataOverrides:{q:{unknown:1}}}]){
   const b=blob();b.frames=[scene(patch)];expect(()=>validateFreeDiagram(b)).toThrow();
  }
  expect(()=>validateFreeDiagram(JSON.parse('{"__proto__":{}}'))).toThrow(/예약/);
 });
 it('allows empty draft and historical omitted visibility',()=>{
  expect(()=>validateFreeDiagram({nodes:[],edges:[],frames:[]})).not.toThrow();const b=blob();b.frames=[scene()];expect(()=>validateFreeDiagram(b)).not.toThrow();
 });
 it('rejects unsupported mode and excessive payload',()=>{
  expect(()=>validateFreeDiagram({mode:'other'})).toThrow();const b=blob();b.nodes[0].data.label='a'.repeat(1048576);expect(()=>validateFreeDiagram(b)).toThrow(/1MiB/);
 });
 it('checks malformed each new element payload',()=>{
  const invalid={'resource-square':{instances:1,allocated:2},'queue-strip':{capacity:1,items:['a','b']},'table-grid':{headers:['a'],rows:[['a','b']]},'memory-range':{start:0,size:3,segments:[{id:'x',start:0,size:4}]},'process-box':{threads:[{id:'t',label:'T'}],activeThreadId:'x'},'line-chart':{series:[{points:[{x:0,y:2}]}],yMax:1},'slot-grid':{slotCount:1,slots:[1,2]},'gantt-lane':{blocks:[{start:3,end:1}]} };
  for(const [type,data]of Object.entries(invalid)){const b=blob();b.nodes[0]={id:'a',type,position:{x:0,y:0},data};expect(()=>validateFreeDiagram(b)).toThrow();}
 });
});
