import {describe,it,expect} from 'vitest';
import {parseDiagramTrace,diagramFields,validateFreeDiagram} from './freeDiagram.mjs';
import {DEFAULT_NODE_DATA} from '../nodes/defaultNodeData';
import {OBO_TEMPLATES} from '../templates';
import {generateFramesFromTrace} from '../lib/trace';
import {stringifyTrace,parseTraceText} from '../lib/traceParser';
describe('diagram execution output contract',()=>{
 for(const [type,data]of Object.entries(DEFAULT_NODE_DATA))it(`replays ${type} values and highlight`,()=>{
  const nodes=[{id:'n',type,position:{x:0,y:0},data}];
  const step={v:1,overrides:{n:Object.fromEntries(diagramFields[type].filter(k=>data[k]!==undefined).map(k=>[k,data[k]]))},highlightNodes:['n'],visibleEdges:[]};
  const result=parseDiagramTrace(JSON.stringify(step),nodes,[]);expect(result.errors).toEqual([]);expect(result.trace[0].overrides).toEqual(step.overrides);expect(generateFramesFromTrace(result.trace,[])[0].visibleEdges).toEqual([]);
  expect(parseTraceText(stringifyTrace(result.trace,nodes),nodes)).toEqual(result.trace);
 });
 for(const t of OBO_TEMPLATES)it(`accepts authored scene output for ${t.id}`,()=>{
  const steps=(t.defaultFrames??[]).map(f=>({v:1,overrides:f.nodeDataOverrides??{},highlightNodes:f.highlightNodes,...(f.visibleEdges?{visibleEdges:f.visibleEdges}:{})}));
  if(!steps.length)steps.push({v:1,overrides:{},highlightNodes:[t.defaultNodes[0].id]});
  const text=steps.map(s=>JSON.stringify(s)).join('\n');expect(parseDiagramTrace(text,t.defaultNodes,t.defaultEdges).errors).toEqual([]);
 });
 const nodes=[{id:'q',type:'queue-strip',position:{x:0,y:0},data:{capacity:2,items:[]}}];
 it('preserves spaces, rejects duplicate keys, references and invalid values',()=>{
  const text='{"v":1,"overrides":{"q":{"items":["A B"]}},"highlightNodes":["q"]}';
  expect(parseDiagramTrace(text,nodes,[]).trace[0].overrides.q.items).toEqual(['A B']);
  for(const s of ['{"v":1,"v":1}','{"v":2}','{"v":1,"visibleEdges":["missing"]}','{"v":1,"overrides":{"q":{"capacity":0,"items":["A"]}}}','q 3'])expect(parseDiagramTrace(s,nodes,[]).errors.length).toBeGreaterThan(0);
 });
 it('does not silently publish incomplete or inconsistent author source',()=>{
  expect(()=>validateFreeDiagram({mode:'coding_diff',codingDiff:{nodes,edges:[],referenceTrace:[],sourceTraceText:'{"v":'}})).toThrow();
  expect(()=>validateFreeDiagram({mode:'coding_diff',codingDiff:{nodes,edges:[],referenceTrace:[],sourceTraceText:'q'}})).toThrow();
 });
 it('keeps old four-type output compatible',()=>{
  const n=[{id:'count',type:'counter-badge',position:{x:0,y:0},data:{value:0}}];expect(parseDiagramTrace('count 3',n,[])).toEqual({trace:[{overrides:{count:{value:3}},highlightNodes:['count']}],errors:[]});
 });
});
