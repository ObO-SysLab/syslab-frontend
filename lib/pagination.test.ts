import { describe, expect, it } from 'vitest';
import { pageWindow } from './pagination';

describe('pageWindow', () => {
  it('lists every page when there are few', () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(3, 9)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('keeps the first and last page and a five-page window around the current one', () => {
    expect(pageWindow(1, 33)).toEqual([1, 2, 3, 4, 5, 6, 'gap-end', 33]);
    expect(pageWindow(4, 33)).toEqual([1, 2, 3, 4, 5, 6, 'gap-end', 33]);
    expect(pageWindow(17, 33)).toEqual([1, 'gap-start', 15, 16, 17, 18, 19, 'gap-end', 33]);
    expect(pageWindow(33, 33)).toEqual([1, 'gap-start', 28, 29, 30, 31, 32, 33]);
    expect(pageWindow(31, 33)).toEqual([1, 'gap-start', 28, 29, 30, 31, 32, 33]);
  });

  it('never grows past nine slots and always contains the current page', () => {
    for (let total = 1; total <= 120; total++) {
      for (let current = 1; current <= total; current++) {
        const slots = pageWindow(current, total);
        expect(slots.length).toBeLessThanOrEqual(9);
        expect(slots).toContain(current);
        const numbers = slots.filter((s): s is number => typeof s === 'number');
        expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
        expect(numbers[0]).toBe(1);
        expect(numbers[numbers.length - 1]).toBe(total);
      }
    }
  });

  it('clamps odd input instead of drawing nothing or thousands of buttons', () => {
    expect(pageWindow(0, 0)).toEqual([1]);
    expect(pageWindow(50, 10)).toEqual([1, 'gap-start', 5, 6, 7, 8, 9, 10]);
    expect(pageWindow(NaN, 3)).toEqual([1, 2, 3]);
  });
});
