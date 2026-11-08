import type {Json} from './index.mjs';
export interface SimulationView { id:string; role:string; target:string|null; x:number; y:number; width:number; height:number; label:string; color:string; hidden:boolean; text:string; when:{kind:string|null;actor:string|null}; fields:string[]; }
export interface ViewPlacementOptions { excludedIds?: readonly string[]; }
export interface SimulationInstance { id:string; scenarioId:string; modelVersion:number; name:string; input:Record<string,Json>; views:SimulationView[]; decorations:{id:string;source:string;target:string}[]; labels:Record<string,string>; }
export interface SimulationDocument { schemaVersion:2; instances:SimulationInstance[]; question:{selectionMode:'single'|'multiple';judgeProfile:'text-v1'|'obo-v1';assessmentMode:'result'|'process';gradingInstanceId:string|null;ioFormat?:'json-v1'|'rr-segments-v1'}; explanations:{common:string[];choices:Record<string,string[]>}; }
export const roleLabels:Record<string,string>;
export function freshId(prefix?:string):string;
export function semanticEntities(instance:SimulationInstance):{actor:string[];resource:string[]};
export function createView(role:string,target?:string|null,at?:number):SimulationView;
export function placeNewView(instance:SimulationInstance,view:SimulationView,options?:ViewPlacementOptions):SimulationView;
export function createInstance(scenarioId?:string):SimulationInstance;
export function createDocument(scenarioId?:string):SimulationDocument;
export function arrangeViews(instance:SimulationInstance,options?:ViewPlacementOptions):SimulationInstance;
export function copyInstance(instance:SimulationInstance):SimulationInstance;
export function replaceInput(instance:SimulationInstance,input:Record<string,Json>):SimulationInstance;
export function addActor(instance:SimulationInstance,actorRole?:string,options?:ViewPlacementOptions):SimulationInstance;
export function deleteActor(instance:SimulationInstance,id:string):SimulationInstance;
export function connectResource(instance:SimulationInstance,actor:string,resource:string,kind:string,delta?:number):SimulationInstance;
export function validateDocument(document:unknown,options?:{execute?:boolean}):boolean;
