import type {Json,ModelRun} from './index.mjs';
export const RR_TEXT:'rr-segments-v1';
export interface ScheduleSegment {actor:string|null;start:number;end:number;}
export function parseRrInput(text:string):Record<string,Json>;
export function rrInputText(input:Record<string,Json>):string;
export function rrOutputText(segments:ScheduleSegment[]):string;
export function parseRrOutput(text:string,input:Record<string,Json>):ScheduleSegment[];
export function normalizeSegments(segments:ScheduleSegment[]):ScheduleSegment[];
export function referenceRrText(text:string):{input:Record<string,Json>;reference:ModelRun};
export function gradeRrText(input:string,stdout:string):{correct:boolean;kind:string;traceValid:boolean;message:string;reported:{v:1;result:{segments:ScheduleSegment[]}}|null};
