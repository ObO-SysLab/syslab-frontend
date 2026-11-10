import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import {describeCodingContract,catalog,starterCode,outputSkeleton} from './codingContract';
import {diagramFields,parseDiagramTrace} from '../runtime/freeDiagram.mjs';
import {createDocument} from '../runtime/document.mjs';
import {CodingRules} from '../simulation/CodingRules';
import type {ProblemOboData} from '../types';

describe('public submission guidance',()=>{
  const document:ProblemOboData={mode:'coding_diff',codingDiff:{nodes:[{id:'queue1',type:'queue-strip',position:{x:1,y:2},data:{label:'PRIVATE_LABEL',items:['PRIVATE_VALUE'],capacity:7}}],edges:[{id:'e1',source:'queue1',target:'queue1',data:{label:'PRIVATE_EDGE'}}],referenceTrace:[],sourceTraceText:'PRIVATE_TRACE'}};
  it('publishes IDs and field contracts without authored answers or scene data',()=>{
    const contract=describeCodingContract(document)!;
    expect(contract.nodes?.[0]).toEqual({id:'queue1',type:'queue-strip',fields:catalog['queue-strip'].fields});
    expect(contract.edgeIds).toEqual(['e1']);expect(JSON.stringify(contract)).not.toContain('PRIVATE');
    expect(Object.keys(contract.nodes![0]).sort()).toEqual(['fields','id','type']);
    expect(parseDiagramTrace(outputSkeleton(contract),document.codingDiff!.nodes,document.codingDiff!.edges).errors).toEqual([]);
  });
  it('field documentation stays aligned with the actual 11-element parser',()=>{
    expect(Object.keys(catalog).sort()).toEqual(Object.keys(diagramFields).sort());
    for(const [type,fields]of Object.entries(diagramFields))expect(Object.keys(catalog[type].fields).sort()).toEqual([...fields].sort());
  });
  it('keeps result and process contracts distinct without publishing model inputs',()=>{
    const simulation=createDocument();simulation.question.judgeProfile='obo-v1';simulation.question.gradingInstanceId=simulation.instances[0].id;
    const d:ProblemOboData={mode:'simulation',schemaVersion:2,simulation};
    simulation.question.assessmentMode='result';const result=describeCodingContract(d)!;
    expect(JSON.parse(outputSkeleton(result))).not.toHaveProperty('events');
    simulation.question.assessmentMode='process';const process=describeCodingContract(d)!;
    expect(JSON.parse(outputSkeleton(process))).toHaveProperty('events',[]);
    expect(process).not.toHaveProperty('input');expect(process).not.toHaveProperty('reference');
  });
  it('shows descriptions even without OBO and escapes authored text',()=>{
    const html=renderToStaticMarkup(createElement(CodingRules,{inputDescription:'<script>private</script>',outputDescription:'한 줄에 정수',allowedLanguages:['cpp']}));
    expect(html).toContain('&lt;script&gt;');expect(html).not.toContain('<script>');expect(html).toContain('한 줄에 정수');expect(html).toContain('기존 출력 비교');
    // 2026-11-10: the starter moved into the submission editor (it opens with it), so the guide has no picker.
    expect(html).not.toContain('언어별 시작 코드');
  });
  it('does not mistake JSONL playback for semantic grading',()=>{
    const html=renderToStaticMarkup(createElement(CodingRules,{contract:describeCodingContract(document)}));
    expect(html).toContain('기존 출력 비교');expect(html).toContain('JSONL');expect(html).not.toContain('PRIVATE');expect(html).toContain('정답이 아닙니다');
    for(const language of ['python','c','cpp'])expect(starterCode(language,describeCodingContract(document))).not.toContain('PRIVATE');
  });
});
