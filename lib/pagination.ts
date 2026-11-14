/**
 * Page buttons for long lists (2026-11-14): the problem list reached 33 pages and drew every number
 * in one row. Shows the first and last page, a fixed-width window around the current page, and a gap
 * marker where numbers are skipped, so the row never grows with the page count (at most 9 slots).
 */
export type PageSlot = number | 'gap-start' | 'gap-end';

export function pageWindow(current: number, total: number, around = 2): PageSlot[] {
  const last = Math.max(1, Math.floor(total) || 1);
  const page = Math.min(Math.max(1, Math.floor(current) || 1), last);
  const width = around * 2 + 1;
  if (last <= width + 4) return Array.from({ length: last }, (_, i) => i + 1);
  // Keep the middle window the same width near both ends.
  let from = Math.max(2, page - around);
  let to = Math.min(last - 1, page + around);
  if (to - from + 1 < width) {
    if (from === 2) to = Math.min(last - 1, from + width - 1);
    else from = Math.max(2, to - width + 1);
  }
  const slots: PageSlot[] = [1];
  if (from > 2) slots.push('gap-start');
  for (let p = from; p <= to; p++) slots.push(p);
  if (to < last - 1) slots.push('gap-end');
  slots.push(last);
  return slots;
}
