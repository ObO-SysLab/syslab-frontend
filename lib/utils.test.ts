import { describe, expect, it } from 'vitest';
import { formatDateTime, formatPeriod } from './utils';

const now = new Date(2026, 10, 11, 12, 0);

describe('formatPeriod', () => {
  it('같은 날이면 날짜를 한 번만 쓴다', () => {
    expect(formatPeriod('2026-11-11T07:17:30', '2026-11-11T15:17:30', now)).toBe('11월 11일(수) 07:17 – 15:17');
  });

  it('다른 날이면 양쪽 날짜를 쓴다', () => {
    expect(formatPeriod('2026-11-11T07:17:00', '2026-11-13T15:00:00', now)).toBe('11월 11일(수) 07:17 – 11월 13일(금) 15:00');
  });

  it('올해가 아니면 연도를 붙인다', () => {
    expect(formatDateTime('2025-03-01T09:05:00', now)).toBe('2025년 3월 1일(토) 09:05');
  });

  it('값이 없거나 잘못되면 빈 문자열 또는 있는 쪽만', () => {
    expect(formatPeriod(null, undefined, now)).toBe('');
    expect(formatPeriod('2026-11-11T07:00:00', 'nope', now)).toBe('11월 11일(수) 07:00');
  });
});
