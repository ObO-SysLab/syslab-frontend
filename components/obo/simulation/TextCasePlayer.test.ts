import { describe, expect, it } from 'vitest';
import { lineComparison, textLines } from './TextCasePlayer';

describe('text-v1 result comparison (2026-11-08)', () => {
  it('reads lines the way the grader does and points at the first different line', () => {
    expect(textLines('  7   Miss 7 - -\r\n\n0 Hit 7 0 -  \n')).toEqual(['7 Miss 7 - -', '0 Hit 7 0 -']);
    expect(lineComparison(['a 1', 'b 2', 'c 3'], ['a 1', 'b 9']).firstDifference).toBe(1);
    const extra = lineComparison(['a 1'], ['a 1', 'b 2']);
    expect(extra.firstDifference).toBe(1);
    expect(extra.rows[1]).toMatchObject({ expected: null, actual: 'b 2', same: false });
    expect(lineComparison(['a'], ['a']).firstDifference).toBeNull();
  });
});
