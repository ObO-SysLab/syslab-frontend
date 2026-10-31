import type {ProblemOboData} from '../types';
export interface ProblemDraft {
 problemType:string;title:string;summary:string;description:string;category:string;difficulty:string;visibility:string;
 timeLimit:number;memoryLimit:number;inputDesc:string;outputDesc:string;allowedLanguages:string[];
 testcases:{index:number;input:string;output:string;is_sample:boolean}[];
 choices:{id:string;index:number;content:string}[];selectedAnswers:number[];isOrderedAnswer:boolean;
 oboEnabled:boolean;oboData:ProblemOboData;editVersion:string|null;selectedGroupId:number|null;selectedContestId:number|null;
 oboAlternates:{legacy?:ProblemOboData;simulation?:ProblemOboData};
}
export function isProblemDraft(v:unknown):v is ProblemDraft{
 if(!v||typeof v!=='object')return false;const d=v as ProblemDraft;
 return ['coding','objective'].includes(d.problemType)&&['title','summary','description','category','difficulty','visibility','inputDesc','outputDesc'].every(k=>typeof d[k as keyof ProblemDraft]==='string')
 &&Number.isFinite(d.timeLimit)&&Number.isFinite(d.memoryLimit)&&typeof d.oboEnabled==='boolean'&&typeof d.isOrderedAnswer==='boolean'
 &&Array.isArray(d.allowedLanguages)&&d.allowedLanguages.every(x=>typeof x==='string')
 &&Array.isArray(d.testcases)&&d.testcases.every(c=>c&&Number.isInteger(c.index)&&typeof c.input==='string'&&typeof c.output==='string'&&typeof c.is_sample==='boolean')
 &&Array.isArray(d.choices)&&d.choices.every(c=>c&&typeof c.id==='string'&&Number.isInteger(c.index)&&typeof c.content==='string')
 &&Array.isArray(d.selectedAnswers)&&d.selectedAnswers.every(Number.isInteger)
 &&!!d.oboData&&['single','per_choice','coding_diff','simulation'].includes(d.oboData.mode)&&!!d.oboAlternates
 &&(d.editVersion===null||typeof d.editVersion==='string')&&[d.selectedGroupId,d.selectedContestId].every(x=>x===null||Number.isInteger(x));
}
