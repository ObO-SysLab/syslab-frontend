import {describe,it,expect} from 'vitest';
import {parseRrInput,rrInputText,rrOutputText,referenceRrText,gradeRrText} from './rrText.mjs';
import {createDocument,validateDocument} from './document.mjs';
import {grade} from './index.mjs';
const input='3 2\nP1 0 5\nP2 1 3\nP3 2 4';
const output='P1 0 2\nP2 2 4\nP3 4 6\nP1 6 8\nP2 8 9\nP3 9 11\nP1 11 12';
describe('RR student interval contract',()=>{
 it('accepts only intervals, without metrics or presentation data',()=>{
   const verdict=gradeRrText(input,output);expect(verdict.correct).toBe(true);
   expect(Object.keys(verdict.reported.result)).toEqual(['segments']);expect(verdict.reported.events).toBeUndefined();
 });
 it('preserves arrival-before-expiration at a quantum boundary',()=>{
   expect(referenceRrText(input).reference.result.segments[2]).toEqual({actor:'P3',start:4,end:6});
   expect(gradeRrText(input,output.replace('P3 4 6','P1 4 6')).correct).toBe(false);
 });
 it('accepts whitespace and equivalent splitting, including idle',()=>{
   expect(gradeRrText('1 2\nP1 2 3','\n IDLE\t0 1\r\nIDLE 1 2\nP1 2 3\nP1 3 5\n').correct).toBe(true);
 });
 it('rejects readable wrong schedules while retaining the actual submitted segments',()=>{
   const v=gradeRrText(input,'P1 0 12');expect(v.correct).toBe(false);expect(v.reported.result.segments).toEqual([{actor:'P1',start:0,end:12}]);
 });
 it.each(['','P1 1 2','P1 0 2\nP2 1 3','P1 0 0','P1 -1 2','unknown 0 2','P1 0 2 debug','{"overrides":{}}','P1 0 9007199254740993'])('rejects malformed output %s',text=>{
   const v=gradeRrText(input,text);expect(v.correct).toBe(false);expect(v.reported).toBeNull();
 });
 it.each(['2 2\nP1 0 1','1 0\nP1 0 1','1 2\nIDLE 0 1','2 2\nP1 0 1\nP1 1 1','1 2\nP1 2000 1','1 2\nconstructor 0 1'])('rejects invalid test configuration %s',text=>expect(()=>parseRrInput(text)).toThrow());
 it('generates matching human-readable examples from the existing engine',()=>{
   const x=referenceRrText(input);expect(rrInputText(x.input)).toBe(input);expect(rrOutputText(x.reference.result.segments)).toBe(output);
 });
 it('grades the maximum 32-process horizon without generating unused queue traces',()=>{
   const text='32 1\n'+Array.from({length:32},(_,i)=>`P${i} 0 ${i===0?78:62}`).join('\n');
   const reference=referenceRrText(text).reference;
   expect(reference.result.segments.at(-1).end).toBe(2000);
   expect(reference.events).toEqual([]);
   expect(gradeRrText(text,rrOutputText(reference.result.segments)).correct).toBe(true);
 });
 it('keeps legacy documents and JSON grading compatible',()=>{
   const document=createDocument('RR');expect(validateDocument(document)).toBe(true);
   const x=referenceRrText(input);expect(grade('RR',x.input,'result',JSON.stringify({v:1,result:x.reference.result})).correct).toBe(true);
 });
 it('restricts the new format to RR result questions without IO',()=>{
   const document=createDocument('RR');document.instances[0].input=parseRrInput(input);
   Object.assign(document.question,{judgeProfile:'obo-v1',assessmentMode:'result',gradingInstanceId:document.instances[0].id,ioFormat:'rr-segments-v1'});
   expect(validateDocument(document)).toBe(true);
   document.question.assessmentMode='process';expect(()=>validateDocument(document)).toThrow();
   document.question.assessmentMode='result';document.instances[0].input.jobs[0].bursts=[1,1,1];expect(()=>validateDocument(document)).toThrow();
 });
});
