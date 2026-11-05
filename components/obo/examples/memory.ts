export interface MemorySegment { id: string; start: number; size: number; label: string; free?: boolean; }
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
