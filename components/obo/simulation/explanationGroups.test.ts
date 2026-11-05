import {it,expect} from 'vitest';
import {createDocument} from '../runtime/document.mjs';
import {explanationGroups} from './explanationGroups';
import {examples,exampleDocument} from '../runtime/examples';
import {validateDocument} from '../runtime/document.mjs';
it('uses revision choice IDs and the full selected set after reordering',()=>{
  const doc=createDocument();doc.explanations.choices={a:['A'],b:['B'],c:['C']};
  const groups=explanationGroups(doc,[{id:'b',index:1,content:'B'},{id:'c',index:2,content:'C'},{id:'a',index:3,content:'A'}],[3,2]);
  expect(groups.map(g=>[g.id,g.selected])).toEqual([['common',false],['a',true],['c',true],['b',false]]);
});
it.each(examples)('$id example is executable and has no overlapping initial cards',example=>{
  const doc=exampleDocument(example.id);expect(validateDocument(doc)).toBe(true);
  const views=doc.instances[0].views;
  for(let i=0;i<views.length;i++)for(const b of views.slice(i+1)){
    const a=views[i];expect(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y).toBe(true);
  }
});
