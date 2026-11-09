import type {ModelRun} from './index.mjs';
export const TEXT_FORMAT:'text-v1';
export const textFormats:Record<string,{inputHelp:string;outputHelp:string}>;
export function inputToText(id:string,input:unknown):string;
export function parseTextInput(id:string,text:string):Record<string,import('./index.mjs').Json>;
export function textReference(id:string,text:string):{input:Record<string,import('./index.mjs').Json>;reference:ModelRun;expected:string};
export function outputTokens(text:string):string[][];
export function gradeText(id:string,inputText:string,stdout:string):{correct:boolean;kind:'correct'|'wrong';traceValid:false;message:string;reported:{v:1;text:string[]}|null};
export function textHelp(id:string):{input:string;output:string};
