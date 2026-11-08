import { describe, expect, it } from 'vitest';
import type { Node } from '@xyflow/react';
import { applyFrame } from '../lib/applyFrame';
import { frameEdges } from '../lib/frameEdges';
import { OBO_TEMPLATES } from '../templates';
import { REMAINING_EXAMPLES, PRODUCER_CONSUMER, ADDRESS_TRANSLATION, MEMORY_FRAGMENTATION, PROCESS_THREADS, INODE_ACCESS, DISK_SEEK, FRAGMENTED, exampleBlob } from './remaining';
import { memoryLayout } from './memory';
const states = (example: typeof PRODUCER_CONSUMER) => {
  const b = exampleBlob(example);
  return b.frames.map((_, i) => Object.fromEntries(applyFrame(b.nodes as Node[], b.frames, i).map(n => [n.id, n.data])));
};
describe('six independently authored operating system examples', () => {
  it('keeps FIFO contents and empty/full counts consistent, including blocked operations and resume', () => {
    const snapshots = states(PRODUCER_CONSUMER);
    const queue: string[] = [];
    const ops = ['blocked-take','put-A','take','put-B','put-C','blocked-put','take','put-D','take','take'];
    const consumed: string[] = [];
    ops.forEach((op, i) => {
      if (op.startsWith('put-')) queue.push(op.slice(4));
      if (op === 'take') consumed.push(queue.shift()!);
      if (op === 'blocked-put') expect(queue).toHaveLength(2);
      if (op === 'blocked-take') expect(queue).toHaveLength(0);
      expect(snapshots[i].buffer.items).toEqual(queue);
      expect(snapshots[i].full.value).toBe(queue.length);
      expect(snapshots[i].empty.value).toBe(2 - queue.length);
    });
    expect(consumed).toEqual(['A','B','C','D']);
  });
  it('uses the page offset unchanged, distinguishes a TLB miss from a nonresident page, and hits on the second address', () => {
    const ss = states(ADDRESS_TRANSLATION);
    for (const [i, va] of [[3,9],[6,10]]) {
      const vpn = Math.floor(va / 4), offset = va % 4;
      const row = (ss[i].pages.rows as unknown[][]).find(r => r[0] === vpn)!;
      expect(row[2]).toBe('있음');
      expect(ss[i].physical.label).toBe(`물리 주소 ${Number(row[1]) * 4 + offset}`);
    }
    expect(ss[1].tlb.rows).not.toContainEqual([2,5]);
    expect(ss[6].tlb.rows).toContainEqual([2,5]);
    expect(ss[7].pages.activeRow).toBe(2);
    expect(ss[7].physical.label).toContain('페이지 Miss');
    const b = exampleBlob(ADDRESS_TRANSLATION);
    expect(frameEdges(b.edges,b.frames[6]).map(e=>e.id)).toEqual(['lookup','hit']);
    expect(frameEdges(b.edges,b.frames[7]).some(e=>e.id==='translate'||e.id==='hit')).toBe(false);
  });
  it('fails a 5-cell request with two 3-cell holes then merges only adjacent free space after B is released', () => {
    const ss=states(MEMORY_FRAGMENTATION);
    const layouts=ss.map(s=>memoryLayout(0,16,s.memory.segments as typeof FRAGMENTED)!);
    expect(layouts[2].free).toBe(6); expect(layouts[2].largest).toBeLessThan(5);
    expect(layouts[3]).toMatchObject({free:10,largest:10});
    expect(layouts[4]).toMatchObject({free:5,largest:5});
    for (const l of layouts) {
      expect(l.segments.reduce((sum,s)=>sum+s.size,0)).toBe(16);
      expect(l.segments.find(s=>s.id==='a')).toMatchObject({start:0,size:4});
      expect(l.segments.find(s=>s.id==='c')).toMatchObject({start:14,size:2});
    }
  });
  it('handles empty partitions and rejects invalid range, overlap, gaps, and duplicate IDs', () => {
    expect(memoryLayout(0,16,[])).toMatchObject({free:16,largest:16});
    expect(memoryLayout(0,0,[])).toBeNull();
    expect(memoryLayout(0,NaN,[])).toBeNull();
    expect(memoryLayout(0,16,[{id:'x',start:1,size:15,label:'x'}])).toBeNull();
    expect(memoryLayout(0,16,[{id:'x',start:0,size:10,label:'x'},{id:'y',start:9,size:7,label:'y'}])).toBeNull();
    expect(memoryLayout(0,16,[{id:'x',start:0,size:8,label:'x'},{id:'x',start:8,size:8,label:'x'}])).toBeNull();
  });
  it('shares data only within P1 while keeping thread-local contexts and P2 untouched', () => {
    const ss=states(PROCESS_THREADS);
    expect(ss[2].p1.sections).toContainEqual({name:'데이터',value:'x = 1',shared:true});
    expect(ss[2].p2).toEqual(ss[0].p2);
    const ts=ss[2].p1.threads as {id:string;register:string;stack:string}[];
    expect(ts.find(t=>t.id==='t1')?.stack).toBe('지역값 7');
    expect(ts.find(t=>t.id==='t2')).toMatchObject({stack:'지역값 9',register:'1'});
  });
  it('keeps the inode/data reachable by the surviving hard link after removing one directory entry', () => {
    const b=exampleBlob(INODE_ACCESS), ss=states(INODE_ACCESS);
    b.frames.forEach((f,i)=>{
      const edges=frameEdges(b.edges,f);
      expect(ss[i].links.value).toBe(edges.filter(e=>e.target==='inode').length);
      expect(edges.find(e=>e.source==='inode')?.target).toBe('block');
      expect(ss[i].block.label).toBe('블록 7 · Hello');
    });
    expect(frameEdges(b.edges,b.frames.at(-1)).map(e=>e.id)).toEqual(['b-inode','inode-block']);
  });
  it('computes independent FCFS travel distances and never reveals unprocessed points', () => {
    const ss=states(DISK_SEEK), positions=[50,20,80,30];
    let total=0;
    positions.forEach((position,i)=>{
      if(i) total+=Math.abs(position-positions[i-1]);
      expect(ss[i].distance.value).toBe(total);
      expect(ss[i].path.progressIndex).toBe(i);
      expect(ss[i].path).toMatchObject({xMin:0,xMax:3,yMin:0,yMax:100});
    });
    expect(total).toBe(140); expect(ss.at(-1)!.path.activePointIndex).toBe(-1);
  });
  it('registers six unique menu templates and preserves the full schema through JSON save, replay and backward navigation',()=>{
    expect(new Set(OBO_TEMPLATES.map(t=>t.id)).size).toBe(OBO_TEMPLATES.length);
    for(const e of REMAINING_EXAMPLES){
      expect(OBO_TEMPLATES.some(t=>t.id===e.template.id)).toBe(true);
      const b=exampleBlob(e), copy=JSON.parse(JSON.stringify(b));
      applyFrame(copy.nodes,copy.frames,copy.frames.length-1);
      expect(copy).toEqual(b);
      expect(applyFrame(copy.nodes,copy.frames,0)).toEqual(applyFrame(b.nodes as Node[],b.frames,0));
      const ids=new Set(b.nodes.map(n=>n.id));
      for(const f of b.frames) for(const id of Object.keys(f.nodeDataOverrides??{})) expect(ids.has(id)).toBe(true);
      for(const edge of b.edges) expect(ids.has(edge.source)&&ids.has(edge.target)).toBe(true);
    }
  });
});
