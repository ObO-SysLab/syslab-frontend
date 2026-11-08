import { describe, expect, it } from 'vitest';
import { memoryTicks, segmentText } from '../examples/memory';
import { FRAGMENTED } from '../examples/remaining';
import { keptChartLabels, type ChartLabel } from './chartLabels';

describe('free memory-range boundary labels (2026-11-08)', () => {
  it('keeps every boundary of the default example and aligns the ends inward', () => {
    const ticks = memoryTicks(FRAGMENTED.map(s => s.start), 0, 16, 640);
    expect(ticks.map(t => t.value)).toEqual([0, 4, 7, 11, 14, 16]);
    expect(ticks[0]).toMatchObject({ left: 0, align: 'start' });
    expect(ticks.at(-1)).toMatchObject({ value: 16, left: 100, align: 'end' });
  });
  it('drops inner boundaries closer than the gap but always keeps both ends', () => {
    const starts = Array.from({ length: 40 }, (_, i) => i).concat([40, 46]);
    const ticks = memoryTicks(starts, 0, 64, 640), px = ticks.map(t => t.left / 100 * 640);
    expect(ticks[0].value).toBe(0); expect(ticks.at(-1)!.value).toBe(64);
    for (let i = 1; i < px.length; i++) expect(px[i] - px[i - 1]).toBeGreaterThanOrEqual(26);
    expect(ticks.length).toBeLessThan(starts.length);
  });
  it('lets narrow blocks hold only what fits', () => {
    expect([10, 22, 43, 44, 200].map(segmentText)).toEqual(['none', 'size', 'size', 'full', 'full']);
  });
});

describe('free line-chart value labels (2026-11-08)', () => {
  const at = (x: number, y: number, text = '50', anchor: ChartLabel['anchor'] = 'middle') => ({ x, y, text, anchor });
  it('keeps every label of a spread-out chart', () => {
    expect([...keptChartLabels([at(60, 80), at(220, 40), at(380, 120), at(540, 60)])]).toEqual([0, 1, 2, 3]);
  });
  it('drops labels that would overlap and keeps the priority ones', () => {
    const labels = Array.from({ length: 20 }, (_, i) => at(100 + i * 10, 80, String(40 + i)));
    const kept = keptChartLabels(labels, [13, 19]);
    expect(kept.has(13)).toBe(true); expect(kept.has(19)).toBe(true);
    expect(kept.size).toBeLessThan(20);
    const boxes = [...kept].map(i => ({ l: labels[i].x - 10, r: labels[i].x + 10 }));
    for (const a of boxes) for (const b of boxes) if (a !== b) expect(a.r <= b.l || b.r <= a.l).toBe(true);
  });
  it('treats start/end anchored labels by their real extent', () => {
    const kept = keptChartLabels([at(52, 80, '100', 'start'), at(70, 80, '20')]);
    expect([...kept]).toEqual([0]);
  });
});
