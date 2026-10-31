export const diagramFields: Record<string,string[]>;
export function validateDiagramElement(type:string|undefined,data:unknown,path?:string):void;
export function validateDiagramBlob(blob:unknown,path?:string,trace?:boolean):void;
export function validateFreeDiagram(document:unknown):unknown;
export function parseDiagramTrace(text:string,nodes:unknown[],edges:unknown[]):{trace:import('../types').OboTraceStep[];errors:{line:number;message:string}[]};
