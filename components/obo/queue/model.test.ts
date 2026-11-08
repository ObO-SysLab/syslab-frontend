import { describe, expect, it } from 'vitest';
import { queueLayout } from './model';

describe('authored FIFO queue layout', () => {
  it('preserves the historical left-head order and empty slots', () => {
    const layout = queueLayout(['A', 'B'], 4)!;
    expect(layout.rows[0].map(slot => slot.item)).toEqual(['A', 'B', null, null]);
    expect(layout.headSide).toBe('left');
    expect(layout.rows[0].filter(slot => slot.head).map(slot => slot.index)).toEqual([0]);
  });

  it('places the oldest item at the right edge when partially occupied', () => {
    const layout = queueLayout(['A'], 4, 'rtl')!;
    expect(layout.rows[0].map(slot => slot.item)).toEqual([null, null, null, 'A']);
    expect(layout.rows[0].at(-1)).toEqual({ index: 0, item: 'A', head: true });
  });

  it('uses original positions for duplicate labels rather than highlighting equal values', () => {
    const layout = queueLayout(['A', 'A', 'A'], 3, 'rtl')!;
    expect(layout.rows[0].map(slot => slot.index)).toEqual([2, 1, 0]);
    expect(layout.rows.flat().filter(slot => slot.head)).toHaveLength(1);
    expect(layout.rows[0].at(-1)?.head).toBe(true);
  });

  it('wraps after eight slots and keeps FIFO order within every right-head row', () => {
    const items = Array.from({ length: 10 }, (_, i) => `item-${i}`);
    const layout = queueLayout(items, 11, 'rtl')!;
    expect(layout.rows.map(row => row.map(slot => slot.index))).toEqual([[7, 6, 5, 4, 3, 2, 1, 0], [10, 9, 8]]);
    expect(layout.rows[1].map(slot => slot.item)).toEqual([null, 'item-9', 'item-8']);
    expect(layout.rows.flat().filter(slot => slot.head)).toHaveLength(1);
    expect(layout.columns).toBe(8);
  });

  it('distinguishes a zero-capacity queue from empty available slots', () => {
    expect(queueLayout([], 0)).toMatchObject({ rows: [], columns: 0, capacity: 0, occupied: 0 });
    const empty = queueLayout([], 2, 'rtl')!;
    expect(empty.rows[0]).toHaveLength(2);
    expect(empty.rows.flat().every(slot => slot.item === null && !slot.head)).toBe(true);
  });

  it('rejects impossible sizes and unsupported directions without inventing a repaired state', () => {
    for (const capacity of [-1, 1.5, 65, NaN, Infinity]) expect(queueLayout([], capacity)).toBeNull();
    expect(queueLayout(['A'], 0)).toBeNull();
    expect(queueLayout(['A', 'B'], 1)).toBeNull();
    expect(queueLayout([], 2, 'up' as 'ltr')).toBeNull();
    expect(queueLayout([1] as unknown as string[], 1)).toBeNull();
  });

  it('preserves long and empty authored strings without conflating them with empty slots', () => {
    const long = '길이가 긴 항목 이름 '.repeat(10);
    const layout = queueLayout(['', long], 3, 'rtl')!;
    expect(layout.rows[0].map(slot => slot.item)).toEqual([null, long, '']);
    expect(layout.rows[0].at(-1)?.head).toBe(true);
    expect(layout.occupied).toBe(2);
  });

  it('handles the maximum capacity and never mutates the authored input', () => {
    const items = Object.freeze(Array.from({ length: 64 }, (_, i) => String(i)));
    const before = JSON.stringify(items);
    const layout = queueLayout(items, 64, 'rtl')!;
    expect(layout.rows).toHaveLength(8);
    expect(layout.rows.every(row => row.length === 8)).toBe(true);
    expect(layout.rows.flat().map(slot => slot.index).sort((a, b) => a - b)).toEqual(Array.from({ length: 64 }, (_, i) => i));
    expect(JSON.stringify(items)).toBe(before);
  });
});
