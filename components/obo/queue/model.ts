export type QueueDirection = 'ltr' | 'rtl';

export interface QueueSlot {
  /** Logical FIFO position, independent of visual direction or repeated labels. */
  index: number;
  item: string | null;
  head: boolean;
}

export interface QueueLayout {
  rows: QueueSlot[][];
  columns: number;
  capacity: number;
  occupied: number;
  headSide: 'left' | 'right';
}

/** Display only: no enqueue/dequeue, semaphore inference, or mutation of authored values. */
export function queueLayout(items: readonly string[], capacity: number, direction: QueueDirection = 'ltr'): QueueLayout | null {
  if (!Array.isArray(items) || !Number.isInteger(capacity) || capacity < 0 || capacity > 64
    || items.length > capacity || items.some(item => typeof item !== 'string')
    || !['ltr', 'rtl'].includes(direction)) return null;

  const slots: QueueSlot[] = Array.from({ length: capacity }, (_, index) => ({
    index, item: index < items.length ? items[index] : null, head: index === 0 && items.length > 0,
  }));
  const rows: QueueSlot[][] = [];
  for (let offset = 0; offset < slots.length; offset += 8) {
    const row = slots.slice(offset, offset + 8);
    rows.push(direction === 'rtl' ? row.reverse() : row);
  }
  return { rows, columns: Math.min(capacity, 8), capacity, occupied: items.length, headSide: direction === 'rtl' ? 'right' : 'left' };
}
