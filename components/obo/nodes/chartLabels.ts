export interface ChartLabel { x: number; y: number; text: string; anchor: 'start' | 'middle' | 'end' }
const box = (l: ChartLabel, charWidth: number) => {
  const w = l.text.length * charWidth + 4, left = l.anchor === 'start' ? l.x : l.anchor === 'end' ? l.x - w : l.x - w / 2;
  return { left, right: left + w, top: l.y - 13, bottom: l.y + 2 };
};
/**
 * Value labels to draw so that none overlaps another. `priority` labels (the active point, the last drawn point)
 * are kept first; the rest are kept in order only if they do not intersect a kept label. Points and lines are never hidden.
 */
export function keptChartLabels(labels: ChartLabel[], priority: number[] = [], charWidth = 8): Set<number> {
  const kept: number[] = [], boxes = labels.map(l => box(l, charWidth));
  const free = (i: number) => kept.every(k => boxes[i].right <= boxes[k].left || boxes[k].right <= boxes[i].left || boxes[i].bottom <= boxes[k].top || boxes[k].bottom <= boxes[i].top);
  for (const i of priority) if (i >= 0 && i < labels.length && !kept.includes(i) && free(i)) kept.push(i);
  for (let i = 0; i < labels.length; i++) if (!kept.includes(i) && free(i)) kept.push(i);
  return new Set(kept);
}
