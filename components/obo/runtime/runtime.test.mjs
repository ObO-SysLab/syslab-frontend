import {describe,it,expect} from 'vitest';
import {modelList,defaultInput,run,grade,parseBoundedJson} from './index.mjs';

const normal={
  ST2:r=>expect(r.states).toEqual({P:'Ready'}),
  G2:r=>expect(r).toEqual({segments:[{actor:'P',start:0,end:1}],metrics:{P:{waiting:0,response:0,turnaround:1}}}),
  RR:r=>expect(r.metrics.P.turnaround).toBe(1),PS:r=>expect(r.segments[0].actor).toBe('P'),
  CS:r=>expect(r).toEqual({current:'Q',registers:{pc:2},pcbs:{P:{pc:1},Q:{pc:2}}}),
  P2:r=>expect(r).toEqual({frames:[1],faults:1}),OPT:r=>expect(r).toEqual({frames:[1],faults:1}),
  P3:r=>expect(r.faultsByCapacity).toEqual({'1':1,'2':1}),TH:r=>expect(r.processes.P).toEqual({faults:1,workingSet:1,frames:[1]}),
  TLB:r=>expect(r.translations).toEqual([{hit:false,fault:false,physical:13}]),
  MF:r=>expect(r).toEqual({blocks:[{start:0,size:4,owner:'P'}],outcomes:[true]}),
  S3:r=>expect(r).toEqual({deadlocked:[],available:[1],allocations:[[0]]}),
  PC:r=>expect(r).toEqual({buffer:[],actors:{P:{role:'producer',pc:1,blocked:false}},semaphores:{empty:0,full:0,mutex:null},stopReason:'scheduleEnd'}),
  BK:r=>expect(r).toEqual({safe:true,sequence:['P'],granted:null}),
  DP:r=>expect(r).toEqual({owners:[null,null],states:{P:'hungry',Q:'thinking'},stopReason:'scheduleEnd'}),
  IN:r=>expect(r.accesses).toEqual([{inode:'i',logical:0,block:'b',offset:0,eof:false}]),
  DS:r=>expect(r).toEqual({services:['r'],moves:[{from:0,to:2,service:'r'}],distance:2}),
  PT:r=>expect(r.reads).toEqual([1]),IPC:r=>expect(r).toEqual({channel:[7],shared:{},reads:[],blocked:[]}),
  'K-SYSCALL':r=>{expect(r.current).toBe('P');expect(r.mode).toBe('user');expect(r.contexts).toEqual({P:{pc:42},Q:{pc:8}});expect(r.returnValue).toBe(0);},
  'K-INTERRUPT':r=>{expect(r.current).toBe('P');expect(r.states.Q).toBe('Ready');expect(r.returnValue).toBeNull();},
};
const cpuInput={jobs:[{id:'A',arrival:0,bursts:[5],priority:2},{id:'B',arrival:1,bursts:[2],priority:1}],policy:'FCFS',quantum:2};
const refs=[1,2,3,4,1,2,5,1,2,3,4,5];
const bk={actors:['P0','P1','P2','P3','P4'],resources:['A','B','C'],available:[3,3,2],allocated:[[0,1,0],[2,0,0],[3,0,2],[2,1,1],[0,0,2]],max:[[7,5,3],[3,2,2],[9,0,2],[2,2,2],[4,3,3]],request:null};
const dp={actors:['A','B','C'],order:['A','B','C','A','B','C','A','B','C'],policy:'left',mode:'fixedSchedule',thinkTicks:{A:0,B:0,C:0},eatTicks:{A:1,B:1,C:1},goalMeals:{}};
const boundary={
  ST2:()=>{const x={processes:{P:'Running'},actions:[{id:'P',event:'io'},{id:'P',event:'completeIO'}]};expect(run('ST2',x).result.states.P).toBe('Ready');},
  G2:()=>{expect(run('G2',{...cpuInput,policy:'SRTF'}).result.segments).toEqual([{actor:'A',start:0,end:1},{actor:'B',start:1,end:3},{actor:'A',start:3,end:7}]);},
  RR:()=>{expect(run('RR',{...cpuInput,policy:'RR'}).result.segments).toEqual([{actor:'A',start:0,end:2},{actor:'B',start:2,end:4},{actor:'A',start:4,end:7}]);},
  PS:()=>{expect(run('PS',{...cpuInput,policy:'PS-P'}).result.metrics.B.response).toBe(0);expect(run('PS',{...cpuInput,policy:'PS'}).result.metrics.B.response).toBe(4);},
  CS:()=>{const x=defaultInput('CS');x.order=['Q','P'];expect(run('CS',x).result.registers.pc).toBe(1);},
  P2:()=>{expect(run('P2',{refs:[1,1,2],frameCount:1,policy:'FIFO',initial:[]}).result.faults).toBe(2);},
  OPT:()=>{expect(run('OPT',{refs,frameCount:3,policy:'OPT',initial:[]}).result.faults).toBe(7);},
  P3:()=>{expect(run('P3',{refs,capacities:[3,4],policy:'FIFO'}).result.faultsByCapacity).toEqual({'3':9,'4':10});},
  TH:()=>{const stream=[1,2,3,1,2,3].map(page=>({id:'P',page}));expect(run('TH',{stream,quotas:{P:2},window:3,frameBudget:2}).result.processes.P.faults).toBe(6);},
  TLB:()=>{expect(run('TLB',{addresses:[5,6,9],pageSize:4,table:[7,3,null],capacity:1,initialTlb:[]}).result.translations).toEqual([{hit:false,fault:false,physical:13},{hit:true,fault:false,physical:14},{hit:false,fault:true,physical:null}]);},
  MF:()=>{const x={total:10,initial:[{start:0,size:10,owner:null}],operations:[{op:'alloc',id:'A',size:4},{op:'alloc',id:'B',size:4},{op:'free',id:'A'},{op:'alloc',id:'C',size:5},{op:'free',id:'B'}],policy:'first'};expect(run('MF',x).result).toEqual({blocks:[{start:0,size:10,owner:null}],outcomes:[true,true,true,false,true]});},
  S3:()=>{const x={actors:['A','B'],resources:['X','Y'],available:[0,0],allocated:[[1,0],[0,1]],requests:[[0,1],[1,0]],actions:[]};expect(run('S3',x).result.deadlocked).toEqual(['A','B']);expect(run('S3',{...x,available:[1,0]}).result.deadlocked).toEqual([]);},
  PC:()=>{const x={capacity:1,initial:[],actors:[{id:'P',role:'producer'},{id:'C',role:'consumer'}],order:['C','C','P','P'],policy:'lock-first'};const r=run('PC',x);expect(r.result.stopReason).toBe('deadlocked');expect(r.events.at(-1).data.stopReason).toBe('deadlocked');},
  BK:()=>{expect(run('BK',bk).result.sequence).toEqual(['P1','P3','P4','P0','P2']);expect(run('BK',{...bk,request:{actor:'P4',values:[3,3,0]}}).result).toEqual({safe:false,sequence:[],granted:false});},
  DP:()=>{const r=run('DP',dp);expect(r.result.owners).toEqual(['A','B','C']);expect(r.result.stopReason).toBe('deadlocked');expect(r.events.at(-1).data.stopReason).toBe('deadlocked');},
  IN:()=>{const x=defaultInput('IN');x.accesses=[{name:'a',offset:4}];expect(run('IN',x).result.accesses[0]).toEqual({inode:'i',logical:null,block:null,offset:null,eof:true});},
  DS:()=>{const requests=[98,183,37,122,14,124,65,67].map((position,i)=>({id:`r${i}`,position}));expect(run('DS',{requests,start:53,max:199,policy:'CSCAN',direction:1}).result.distance).toBe(382);},
  PT:()=>{const x=defaultInput('PT');x.spaces.Q={x:2};x.threads.U={process:'P',registers:{r:7},stack:[]};x.operations=[{op:'write',thread:'T',scope:'shared',key:'x',value:8},{op:'read',thread:'U',scope:'shared',key:'x'}];const r=run('PT',x).result;expect(r.reads).toEqual([8]);expect(r.spaces.Q.x).toBe(2);expect(r.threads.U.registers.r).toBe(7);},
  IPC:()=>{const x=defaultInput('IPC');x.operations=[{actor:'P',op:'receive'},{actor:'P',op:'send',value:3},{actor:'P',op:'receive'}];const r=run('IPC',x);expect(r.result.reads).toEqual([3]);expect(r.events[0].kind).toBe('block');},
  'K-SYSCALL':()=>{const x=defaultInput('K-SYSCALL');x.scenario='blocking';expect(run('K-SYSCALL',x).result.current).toBeNull();x.scenario='error';expect(run('K-SYSCALL',x).result.returnValue).toBe(-1);},
  'K-INTERRUPT':()=>{const x=defaultInput('K-INTERRUPT');x.scenario='timer';x.contexts.R={pc:9};const r=run('K-INTERRUPT',x).result;expect(r.current).toBe('R');expect(r.states.P).toBe('Ready');},
};
const invalid={
  ST2:x=>x.actions=[{id:'P',event:'completeIO'}],G2:x=>x.jobs[0].bursts=[1,2],RR:x=>x.quantum=0,PS:x=>x.jobs.push(structuredClone(x.jobs[0])),
  CS:x=>x.order=['missing'],P2:x=>x.initial=[1,1],OPT:x=>x.frameCount=0,P3:x=>x.capacities=[1,1],TH:x=>x.frameBudget=0,
  TLB:x=>x.initialTlb=[{page:0,frame:99}],MF:x=>x.initial[0].start=1,S3:x=>x.available=[],PC:x=>x.order=['unknown'],
  BK:x=>x.max=[[0]],DP:x=>x.actors=['P','P'],IN:x=>x.fs.inodes.i.direct=['absent'],DS:x=>x.requests[0].position=11,
  PT:x=>x.threads.T.process='missing',IPC:x=>x.operations[0].op='write','K-SYSCALL':x=>x.blocked=x.current,'K-INTERRUPT':x=>x.scenario='syscall',
};
// BK default allocation is zero: make its Max-invalid case genuinely invalid.
invalid.BK=x=>{x.allocated=[[1]];x.max=[[0]];};
describe('21 OBO model acceptance cases',()=>{
  for(const {id}of modelList){
    it(`T-${id}-N independent expected outcome`,()=>normal[id](run(id,defaultInput(id)).result));
    it(`T-${id}-B boundary`,boundary[id]);
    it(`T-${id}-E invalid input`,()=>{const x=defaultInput(id);invalid[id](x);expect(()=>run(id,x)).toThrow();});
  }
});
describe('grading and data boundaries',()=>{
  it('accepts a different valid Banker sequence, rejects an impossible permutation',()=>{
    const payload={v:1,result:{safe:true,sequence:['P3','P1','P4','P0','P2'],granted:null}};
    expect(grade('BK',bk,'result',JSON.stringify(payload)).correct).toBe(true);
    payload.result.sequence=['P0','P1','P2','P3','P4'];expect(grade('BK',bk,'result',JSON.stringify(payload)).correct).toBe(false);
  });
  it('accepts alternative process trace for Banker',()=>{
    const r=run('BK',bk,{preferredSequence:['P3','P1','P4','P0','P2']});
    expect(grade('BK',bk,'process',JSON.stringify({v:1,result:r.result,events:r.events})).correct).toBe(true);
  });
  it('result mode ignores an invalid optional trace; process mode rejects it',()=>{
    const r=run('P2',defaultInput('P2'));const payload={v:1,result:r.result,events:[{step:0,kind:'reference',actor:null,data:{index:0,page:99,hit:true,victim:null,frames:[99]}}]};
    const result=grade('P2',defaultInput('P2'),'result',JSON.stringify(payload));expect(result.correct).toBe(true);expect(result.traceValid).toBe(false);
    expect(grade('P2',defaultInput('P2'),'process',JSON.stringify(payload)).correct).toBe(false);
  });
  it('requires every process event and rejects unknown fields',()=>{
    const r=run('G2',cpuInput);const good={v:1,result:r.result,events:r.events};expect(grade('G2',cpuInput,'process',JSON.stringify(good)).correct).toBe(true);
    expect(grade('G2',cpuInput,'process',JSON.stringify({...good,events:r.events.slice(1)})).correct).toBe(false);
    expect(grade('G2',cpuInput,'result',JSON.stringify({...good,extra:1})).correct).toBe(false);
  });
  it('normalizes harmless CPU segment splitting in results',()=>{
    const x=defaultInput('G2');x.jobs[0].bursts=[2];const r=run('G2',x);r.result.segments=[{actor:'P',start:0,end:1},{actor:'P',start:1,end:2}];
    expect(grade('G2',x,'result',JSON.stringify({v:1,result:r.result})).correct).toBe(true);
  });
  it('separates configuration failure from a wrong student answer',()=>{
    expect(grade('RR',{...cpuInput,policy:'RR',quantum:0},'result','{}').kind).toBe('configuration');
    expect(grade('G2',cpuInput,'result','{}').kind).toBe('wrong');
  });
  it('rejects duplicates, prototype keys, nonfinite values, depth and trailing logs',()=>{
    for(const text of ['{"v":1,"v":1}','{"a":1,"\\u0061":2}','{"__proto__":{}}','{"x":1e999}','{} log','{"x":true,}'])expect(()=>parseBoundedJson(text)).toThrow();
    expect(()=>parseBoundedJson('['.repeat(34)+'0'+']'.repeat(34))).toThrow();
    expect(()=>parseBoundedJson('"12345"',{bytes:4})).toThrow();
    expect(parseBoundedJson('{"문자":"한글","a":[1,true,null]}')).toEqual({'문자':'한글',a:[1,true,null]});
  });
  it('input and different executions cannot mutate each other',()=>{
    const input=structuredClone(cpuInput),before=JSON.stringify(input);const a=run('G2',input),b=run('RR',{...input,policy:'RR'});
    b.events[0].data.ready.push('corrupt');expect(a.events[0].data.ready).not.toContain('corrupt');expect(JSON.stringify(input)).toBe(before);
  });
  it('enforces finite events and serialized output budget',()=>{
    expect(()=>run('G2',cpuInput,{maxEvents:2})).toThrow();expect(()=>run('G2',cpuInput,{maxBytes:20})).toThrow();
  });
  it('valid schedule search supports a different witness and rejects unmet goals',()=>{
    const x={...dp,policy:'ordered',mode:'findSchedule',goalMeals:{A:1,B:1,C:1},order:Array.from({length:60},()=>['A','B','C']).flat()};
    const reference=run('DP',x);expect(reference.result.stopReason).toBe('goalReached');
    const alternative=run('DP',{...x,order:Array.from({length:60},()=>['C','B','A']).flat()});
    expect(grade('DP',x,'process',JSON.stringify({v:1,result:alternative.result,events:alternative.events})).correct).toBe(true);
    expect(()=>run('DP',{...x,order:['A']})).toThrow();expect(grade('DP',x,'result',JSON.stringify({v:1,result:reference.result})).kind).toBe('configuration');
  });
});
