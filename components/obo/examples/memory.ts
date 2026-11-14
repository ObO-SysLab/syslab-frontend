export interface MemorySegment { id: string; start: number; size: number; label: string; free?: boolean; }
export interface MemoryTick { value: number; left: number; align: 'start' | 'center' | 'end' }
/**
 * Address boundary labels that do not collide at the drawn width. The first and last boundaries always show
 * (aligned inward so they stay inside the card); an inner boundary shows only if it is `minGap` px from both neighbours kept.
 */
export function memoryTicks(values: number[], start: number, size: number, width: number, minGap = 26): MemoryTick[] {
  const px = (v: number) => (v - start) / size * width, end = start + size, kept: MemoryTick[] = [{ value: start, left: 0, align: 'start' }];
  for (const v of values) if (v > start && v < end && px(v) - px(kept.at(-1)!.value) >= minGap && px(end) - px(v) >= minGap) kept.push({ value: v, left: px(v) / width * 100, align: 'center' });
  kept.push({ value: end, left: 100, align: 'end' });
  return kept;
}
/** How much text a segment of this drawn width can hold without breaking into unreadable fragments. */
export const segmentText = (widthPx: number): 'full' | 'size' | 'none' => widthPx >= 44 ? 'full' : widthPx >= 22 ? 'size' : 'none';
/** Geometry validation only; this does not allocate or move memory. */
export function memoryLayout(start: number, size: number, segments: MemorySegment[]) {
  if (!Number.isFinite(start) || !Number.isFinite(size) || size <= 0 || !Number.isFinite(start + size)) return null;
  if (!Array.isArray(segments)) return null;
  const sorted = [...segments].sort((a, b) => (a?.start ?? 0) - (b?.start ?? 0));
  if (!sorted.length) sorted.push({ id: 'free', start, size, label: '빈 공간', free: true });
  let cursor = start;
  const ids = new Set<string>();
  for (const s of sorted) {
    if (!s || !s.id || ids.has(s.id) || !Number.isFinite(s.start) || !Number.isFinite(s.size) || s.size <= 0 || s.start !== cursor) return null;
    cursor = s.start + s.size; ids.add(s.id);
  }
  if (cursor !== start + size) return null;
  return { segments: sorted, free: sorted.filter(s => s.free).reduce((sum, s) => sum + s.size, 0),
    largest: sorted.filter(s => s.free).reduce((max, s) => Math.max(max, s.size), 0) };
}
