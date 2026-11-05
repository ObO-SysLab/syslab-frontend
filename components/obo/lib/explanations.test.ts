import { describe, expect, it } from 'vitest';
import { listOboExplanations, type OboBlob } from '../types';
const blob:OboBlob={nodes:[],edges:[],frames:[]};
describe('legacy explanation navigation',()=>{
  it('keeps every selected explanation and makes unselected authored explanations available',()=>{
    const items=listOboExplanations({mode:'per_choice',perChoice:{choice_1:blob,choice_2:blob,choice_3:blob}},[1,3]);
    expect(items.map(i=>[i.id,i.selected])).toEqual([['choice_1',true],['choice_3',true],['choice_2',false]]);
  });
  it('preserves legacy single diagrams and handles missing data',()=>{
    expect(listOboExplanations(blob)[0].blob).toBe(blob);
    expect(listOboExplanations({mode:'single',single:blob})[0].blob).toBe(blob);
    expect(listOboExplanations(null)).toEqual([]);
  });
});
