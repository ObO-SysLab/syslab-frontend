import type {ModelRun,SemanticEvent} from './index.mjs';
import type {SimulationInstance,SimulationView} from './document.mjs';
export interface Projection {title:string;rows:[string,string][];tokens:string[];bars:{label:string;size:number;start:number;empty:boolean}[];links:string[][];metric:string|null;segments:{actor:string;start:number;end:number}[];disk:{head:number;max:number;requests:number[]}|null;visible:boolean;caption:string;}
export function eventLabel(event?:SemanticEvent):string;
export function semanticPosition(instance:SimulationInstance,event?:SemanticEvent):{unit:string;value:string|number;label:string};
export function matchingCursor(primary:SimulationInstance,primaryRun:ModelRun|null,cursor:number,other:SimulationInstance,otherRun:ModelRun|null):number|null;
export function projection(instance:SimulationInstance,execution:ModelRun|null,cursor:number,view:SimulationView):Projection;
export function semanticLinks(instance:SimulationInstance,execution:ModelRun|null,cursor:number):{id:string;from:string;to:string;kind:string;count:number}[];
