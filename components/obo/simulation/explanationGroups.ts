import type {SimulationDocument} from '../runtime/document.mjs';
export interface ExplanationChoice {id:string;index:number;content:string}
export function explanationGroups(document:SimulationDocument,choices:ExplanationChoice[]=[],selectedAnswers:number[]=[]){
  const groups:{id:string;label:string;selected:boolean;instanceIds:string[]}[]=[];
  if(document.explanations.common.length)groups.push({id:'common',label:'공통 해설',selected:false,instanceIds:document.explanations.common});
  const selected=new Set(selectedAnswers);
  const items=Object.entries(document.explanations.choices).filter(([,ids])=>ids.length).map(([id,instanceIds])=>{
    const choice=choices.find(choice=>choice.id===id);
    return {id,label:choice?`보기 ${choice.index} · ${choice.content}`:id,selected:!!choice&&selected.has(choice.index),instanceIds};
  });
  groups.push(...items.filter(g=>g.selected),...items.filter(g=>!g.selected));
  return groups;
}
