import {describe,it,expect} from 'vitest';
import {compareRr,describeAt,segmentAt} from './rrComparison';
import {gradeRrText,referenceRrText,rrOutputText,type ScheduleSegment} from '../runtime/rrText.mjs';
import type {PublicCase} from './PublicCasePlayer';
const source='2 2\nP1 0 3\nP2 0 2';
const {input,reference}=referenceRrText(source);
const expected=reference.result.segments as unknown as ScheduleSegment[];
const row=(actor:string|null,start:number,end:number)=>({actor,start,end});
const record=(rows:ScheduleSegment[]|null=expected):PublicCase=>({caseIndex:1,kind:'rr-schedule',input,reference,reported:rows?{v:1,result:{segments:rows as any}}:null});
const compare=(rows:ScheduleSegment[])=>{const result=compareRr(record(rows));if(result.error!==null)throw Error(result.error);return result;};
describe('RR comparison uses the released interval contract',()=>{
  it('matches identical schedules and leaves input untouched',()=>{
    const data=record(),before=JSON.stringify(data);const result=compareRr(data);
    expect(result.error).toBeNull();expect(result.firstDifference).toBeNull();expect(JSON.stringify(data)).toBe(before);
  });
  it.each([
    [[row('P2',0,2),row('P1',2,5)],0],
    [[row('P1',0,5)],2],
    [[row('P1',0,2),row('P2',2,5)],4],
    [[row('P1',0,2),row('P2',2,4)],4],
    [[...expected,row('P2',5,6)],5],
  ])('finds first/middle/end, missing and additional intervals', (rows,time)=>{
    expect(compare(rows as ScheduleSegment[]).firstDifference).toBe(time);
    expect(gradeRrText(source,rrOutputText(rows as ScheduleSegment[])).correct).toBe(false);
  });
  it('uses union boundaries, accepting equivalent partitions',()=>{
    const rows=[row('P1',0,1),row('P1',1,2),row('P2',2,3),row('P2',3,4),row('P1',4,5)];
    expect(compare(rows).times).toEqual([0,1,2,3,4,5]);expect(compare(rows).firstDifference).toBeNull();
    expect(gradeRrText(source,rrOutputText(rows)).correct).toBe(true);
  });
  it('treats IDLE as a real actor, distinct from an ended record',()=>{
    const data=referenceRrText('1 2\nP1 2 1');
    const result=compareRr({...record([row(null,0,1),row(null,1,2),row('P1',2,3)]),...data});
    expect(result.firstDifference).toBeNull();expect(result.actors).toEqual(['P1','IDLE']);
    expect(segmentAt([row(null,0,2)],2)).toBeNull();expect(describeAt([row(null,0,2)],0)).toContain('IDLE');
  });
  it.each([[],[row('UNKNOWN',0,5)],[row('P1',1,2)],[row('P1',0,2),row('P2',1,3)],[row('P1',0,0)],[row('P1',0,2001)],[row('P1',0,1.5)]].map(rows=>[rows]))('rejects malformed output instead of drawing an empty normal chart',rows=>{
    const result=compare(rows);expect(result.reported).toBeNull();expect(result.reportedError).not.toBe('');expect(result.firstDifference).toBeNull();
  });
  it('does not reconstruct withheld or missing reference records',()=>{
    expect(compareRr({...record(),omitted:'공개하지 않는 기록'}).error).toBe('공개하지 않는 기록');
    expect(compareRr({...record(),reference:undefined}).error).not.toBeNull();
    expect(compareRr({...record(),input:undefined}).error).not.toBeNull();
    expect(compareRr(record(null)).reported).toBeNull();
  });
  it('has half-open highlights and clears both players at the final time',()=>{
    expect(segmentAt(expected,1)?.actor).toBe('P1');
    expect(segmentAt(expected,2)?.actor).toBe('P2');
    expect(segmentAt(expected,5)).toBeNull();
    expect(describeAt(expected,5)).toContain('기록 종료');
  });
  it('agrees with server grading across all unit-length actor sequences',()=>{
    for(let mask=0;mask<32;mask++){
      const rows=Array.from({length:5},(_,i)=>row(mask&(1<<i)?'P1':'P2',i,i+1));
      expect(compare(rows).firstDifference===null).toBe(gradeRrText(source,rrOutputText(rows)).correct);
    }
  });
  it('supports the 2000-time horizon and maximum-length IDs',()=>{
    const id='P'+'x'.repeat(31),text=`1 1\n${id} 0 2000`,data=referenceRrText(text);
    const rows=Array.from({length:2000},(_,i)=>row(id,i,i+1));
    const result=compareRr({...record(rows),...data});
    expect(result.error).toBeNull();expect(result.times?.length).toBe(2001);expect(result.firstDifference).toBeNull();
  });
});
