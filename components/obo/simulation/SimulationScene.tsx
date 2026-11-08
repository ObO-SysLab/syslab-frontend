'use client';
import { useMemo } from 'react';
import { ReactFlow, Background, Controls, Handle, Position, NodeResizer, MarkerType, type Node, type NodeProps, type NodeChange, type Connection } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { ModelRun } from '../runtime/index.mjs';
import type { SimulationInstance, SimulationView } from '../runtime/document.mjs';
import { projection, semanticLinks, type Projection } from '../runtime/projection.mjs';
import { LifecycleVisual, LifecycleExplanation } from './LifecycleVisual';

type DisplayData = Record<string, unknown> & { view: SimulationView; projection: Projection; editable: boolean; beginEdit?: () => void; instance:SimulationInstance; execution:ModelRun|null; cursor:number };
type DisplayNode = Node<DisplayData, 'simulation'>;
const palette=['#4f46e5','#0f766e','#c2410c','#a21caf','#0369a1'];
const colorFor=(id:string)=>palette[[...id].reduce((n,c)=>n+c.charCodeAt(0),0)%palette.length];
function SimulationNode({data,selected}:NodeProps<DisplayNode>) {
  const {view,projection:p}=data;
  const lifecycle=data.instance.scenarioId==='ST2'&&['actor','processor','queue','relation'].includes(view.role)&&!view.fields.length;
  return <div className={`h-full w-full overflow-hidden rounded-xl border-2 bg-white shadow-sm ${selected?'shadow-indigo-100':''}`} style={{borderColor:selected?view.color:'#e2e8f0'}}>
    <NodeResizer isVisible={selected&&data.editable} minWidth={100} minHeight={60} maxWidth={2000} maxHeight={2000} onResizeStart={()=>data.beginEdit?.()}/>
    <Handle type="target" position={Position.Left} className="!h-2 !w-2 !bg-slate-400"/><Handle type="source" position={Position.Right} className="!h-2 !w-2 !bg-indigo-500"/>
    <div className="truncate border-b border-slate-100 px-3 py-2 text-xs font-bold" style={{color:view.color}}>{view.label}{view.target&&<span className="ml-2 font-normal text-slate-500">{view.target}</span>}</div>
    <div className="nowheel h-[calc(100%-34px)] overflow-auto p-3 text-xs">
      {lifecycle?<LifecycleVisual instance={data.instance} execution={data.execution} cursor={data.cursor} view={view}/>:<>
      {p.metric!==null&&<p className="mb-2 text-3xl font-bold" style={{color:view.color}}>{p.metric}</p>}
      {p.tokens.length>0&&<div className="flex flex-wrap gap-1">{p.tokens.map((token,i)=><span key={i} className="min-w-8 rounded border border-indigo-100 bg-indigo-50 px-2 py-2 text-center font-semibold text-indigo-900">{token}</span>)}</div>}
      {p.bars.length>0&&<div className="flex min-h-14 overflow-hidden rounded border border-slate-200">{p.bars.map((b,i)=><div key={i} className="min-w-6 overflow-hidden border-r border-white p-1 text-center" style={{flexGrow:b.size,flexBasis:0,background:b.empty?'#f1f5f9':colorFor(b.label),color:b.empty?'#475569':'white'}} title={`${b.start}부터 ${b.size}`}><div className="truncate">{b.label}</div><small>{b.size}</small></div>)}</div>}
      {p.segments.length>0&&<div><div className="flex h-10 overflow-hidden rounded">{p.segments.map((s,i)=><div key={i} className="min-w-px overflow-hidden px-1 py-2 text-center text-[10px] font-bold text-white" style={{flexGrow:s.end-s.start,flexBasis:0,background:colorFor(s.actor)}} title={`${s.actor}: ${s.start}~${s.end}`}>{s.actor}</div>)}</div><div className="mt-1 flex justify-between text-[10px] text-slate-500"><span>{p.segments[0].start}</span><span>{p.segments.at(-1)?.end}</span></div></div>}
      {p.disk&&<svg viewBox="0 0 300 80" role="img" aria-label={`디스크 헤드 ${p.disk.head}`} className="h-20 w-full"><line x1="10" y1="35" x2="290" y2="35" stroke="#cbd5e1" strokeWidth="3"/>{p.disk.requests.map((x,i)=><circle key={i} cx={10+280*x/p.disk!.max} cy="35" r="4" fill="#94a3b8"/>)}<path d={`M ${10+280*p.disk.head/p.disk.max} 18 l -6 -10 h 12 z`} fill={view.color}/><text x="10" y="65" fontSize="12">헤드 {p.disk.head} / {p.disk.max}</text></svg>}
      {p.rows.length>0&&<table className="w-full table-fixed border-collapse text-left"><tbody>{p.rows.slice(0,40).map(([key,value],i)=><tr key={`${key}-${i}`} className="border-b border-slate-100"><th className="w-2/5 break-words py-1.5 pr-2 align-top font-medium text-slate-500">{key}</th><td className="break-words py-1.5 text-slate-800">{value}</td></tr>)}</tbody></table>}
      {!p.rows.length&&!p.tokens.length&&!p.bars.length&&!p.segments.length&&!p.disk&&p.metric===null&&<p className="text-slate-400">현재 표시할 항목이 없습니다.</p>}
      </>}
    </div>
  </div>;
}
const nodeTypes={simulation:SimulationNode};
export function SimulationScene({instance,execution,cursor,editable=false,selectedId,onSelect,onChanges,onConnect,onDeleteViews,onDeleteRelation,onBeginEdit,onExplanationChange,onAddExplanation}:{
  instance:SimulationInstance;execution:ModelRun|null;cursor:number;editable?:boolean;selectedId?:string|null;onSelect?:(id:string|null)=>void;
  onChanges?:(changes:NodeChange<DisplayNode>[])=>void;onConnect?:(connection:Connection)=>void;onDeleteViews?:(ids:string[])=>void;onDeleteRelation?:(id:string)=>void;onBeginEdit?:()=>void;
  onExplanationChange?:(id:string,text:string)=>void;onAddExplanation?:()=>void;
}) {
  const nodes=useMemo<DisplayNode[]>(()=>instance.views.map(view=>{
    let p:Projection;
    try{p=projection(instance,execution,cursor,view);}catch{p={title:view.label,rows:[['설정 확인','입력을 완성하면 표시됩니다.']],tokens:[],bars:[],links:[],metric:null,segments:[],disk:null,visible:!view.hidden,caption:''};}
    return {id:view.id,type:'simulation',position:{x:view.x,y:view.y},style:{width:view.width,height:view.height},width:view.width,height:view.height,measured:{width:view.width,height:view.height},selected:view.id===selectedId,hidden:!p.visible||(instance.scenarioId==='ST2'&&view.role==='annotation'),data:{view,projection:p,editable,beginEdit:onBeginEdit,instance,execution,cursor}};
  }),[instance,execution,cursor,editable,selectedId,onBeginEdit]);
  const edges=useMemo(()=>{
    let semantic:ReturnType<typeof semanticLinks>=[];try{semantic=semanticLinks(instance,execution,cursor);}catch{/* Keep malformed drafts editable. */}
    const result=instance.decorations.map(e=>({...e,type:'default',style:{stroke:'#94a3b8',strokeDasharray:'5 4'},data:{decoration:true}}));
    for(const relation of semantic){const source=instance.views.find(v=>v.target===relation.from&&!v.hidden),target=instance.views.find(v=>v.target===relation.to&&!v.hidden);if(source&&target)result.push({id:relation.id,source:source.id,target:target.id,type:'default',style:{stroke:relation.kind==='request'?'#d97706':'#4f46e5',strokeDasharray:relation.kind==='request'?'4 3':''},data:{decoration:false}});}
    return result.map(e=>({...e,markerEnd:{type:MarkerType.ArrowClosed},label:e.data.decoration?'설명':e.id.startsWith('request')?'요청':'소유'}));
  },[instance,execution,cursor]);
  return <div className="min-w-0"><div className="h-[540px] min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50" data-testid="simulation-canvas">
    <ReactFlow<DisplayNode> nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView minZoom={0.1} maxZoom={2.5} nodesDraggable={editable} nodesConnectable={editable} elementsSelectable onNodesChange={onChanges} onConnect={onConnect} onNodeClick={(_,node)=>onSelect?.(node.id)} onPaneClick={()=>onSelect?.(null)} onNodeDragStart={()=>onBeginEdit?.()} onNodesDelete={nodes=>onDeleteViews?.(nodes.map(n=>n.id))} onEdgesDelete={edges=>edges.forEach(e=>onDeleteRelation?.(e.id))} deleteKeyCode={editable?['Backspace','Delete']:null} proOptions={{hideAttribution:true}}>
      <Background gap={20} color="#dbe3ee"/><Controls showInteractive={false}/>
    </ReactFlow>
  </div>{instance.scenarioId==='ST2'&&<LifecycleExplanation instance={instance} execution={execution} cursor={cursor} onChange={onExplanationChange} onAdd={onAddExplanation}/>}</div>;
}
