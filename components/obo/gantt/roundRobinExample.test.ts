import { describe, it, expect } from 'vitest';
import { RR_INPUTS, RR_QUANTUM, RR_RUNS, ROUND_ROBIN_TEMPLATE } from './roundRobinExample';
import { applyFrame } from '../lib/applyFrame';

describe('authored round robin example', () => {
  it('matches an independent FIFO ready-queue simulation, including an empty ready queue', () => {
    const pending = RR_INPUTS.map(p => ({ ...p, remaining: p.burst }));
    const ready: typeof pending = [];
    const actual: Array<{process: string | null; start: number; end: number}> = [];
    let time = 0;
    while (pending.length || ready.length) {
      while (pending[0]?.arrival <= time) ready.push(pending.shift()!);
      if (!ready.length) { actual.push({process: null, start: time, end: pending[0].arrival}); time = pending[0].arrival; continue; }
      const process = ready.shift()!;
      const duration = Math.min(process.remaining, RR_QUANTUM);
      actual.push({process: process.id, start: time, end: time + duration});
      time += duration; process.remaining -= duration;
      while (pending[0]?.arrival <= time) ready.push(pending.shift()!);
      if (process.remaining) ready.push(process);
    }
    expect(RR_RUNS).toEqual(actual);
    expect(time).toBe(15);
    for (const process of RR_INPUTS) {
      const runs = RR_RUNS.filter(r => r.process === process.id);
      expect(runs.reduce((sum, r) => sum + r.end - r.start, 0)).toBe(process.burst);
      expect(runs.every(r => r.start >= process.arrival && r.end - r.start <= RR_QUANTUM)).toBe(true);
    }
  });
  it('highlights exactly the running interval; idle and completion have no running process', () => {
    const frames = ROUND_ROBIN_TEMPLATE.defaultFrames!;
    expect(frames.map(f => f.cursorTime)).toEqual([0, 2, 4, 6, 7, 8, 12, 14, 15]);
    for (let i = 0; i < frames.length; i++) {
      const active = applyFrame(ROUND_ROBIN_TEMPLATE.defaultNodes, frames, i).filter(n => typeof n.data.activeBlockIndex === 'number');
      const run = RR_RUNS[i];
      if (!run?.process) { expect(active).toHaveLength(0); continue; }
      expect(active).toHaveLength(1);
      expect(active[0].data.trackId).toBe(run.process);
      const blocks = active[0].data.blocks as Array<{start: number; end: number}>;
      expect(blocks[active[0].data.activeBlockIndex as number]).toMatchObject({start: run.start, end: run.end});
    }
  });
});
