import { describe, expect, it } from 'vitest';
import { isSubmissionPending, settledSubmissions, submissionVerdict } from './submission-status';

describe('submission status', () => {
  it.each(['FAILED', 'COMPLETED'])('stops polling %s even with null verdict and stale local flag', submissionStatus => {
    expect(isSubmissionPending({ submissionStatus, isCorrect: null, _isPending: true })).toBe(false);
  });
  it.each(['PENDING', 'JUDGING'])('keeps polling %s', submissionStatus => {
    expect(isSubmissionPending({ submissionStatus, isCorrect: null })).toBe(true);
  });
  it('supports legacy board records without a status', () => {
    expect(isSubmissionPending({ isCorrect: null })).toBe(true);
    expect(isSubmissionPending({ isCorrect: false })).toBe(false);
  });
});

describe('submission verdict display', () => {
  it.each([
    ['CORRECT', false, 'correct', '정답'],
    ['WRONG', true, 'wrong', '오답'],
    ['ERROR', false, 'error', '코드 오류'],
  ] as const)('preserves %s instead of inferring a verdict from the boolean', (resultStatus, isCorrect, kind, label) => {
    expect(submissionVerdict({submissionStatus: 'COMPLETED', resultStatus, isCorrect})).toMatchObject({kind, label});
  });

  it.each([true, false, null])('prioritizes grading failure over stale verdict %s', isCorrect => {
    expect(submissionVerdict({submissionStatus: 'FAILED', resultStatus: 'CORRECT', isCorrect}))
      .toEqual({kind: 'failed', label: '채점 실패'});
  });

  it.each(['PENDING', 'JUDGING'])('keeps %s separate from final errors', submissionStatus => {
    expect(submissionVerdict({submissionStatus, resultStatus: 'ERROR', isCorrect: false}))
      .toEqual({kind: 'pending', label: '채점 중'});
  });

  it.each([null, undefined, 'UNKNOWN', 'TIMEOUT'])('does not invent a verdict for explicit %s', resultStatus => {
    expect(submissionVerdict({submissionStatus: 'COMPLETED', resultStatus, isCorrect: false}))
      .toEqual({kind: 'unknown', label: '결과 확인 필요'});
  });

  it('uses legacy booleans only when resultStatus is absent', () => {
    expect(submissionVerdict({isCorrect: true}).kind).toBe('correct');
    expect(submissionVerdict({isCorrect: false}).kind).toBe('wrong');
    expect(submissionVerdict({isCorrect: null}).kind).toBe('unknown');
    expect(submissionVerdict(null).kind).toBe('unknown');
  });

  it('uses a safe explanation without guessing the exact code failure', () => {
    expect(submissionVerdict({resultStatus: 'ERROR'}).hint).toBe('컴파일 또는 실행 중 오류');
    expect(submissionVerdict({resultStatus: 'WRONG'}).hint).toBeUndefined();
  });
});

describe('settled submissions', () => {
  const watched = new Set(['7', '8']);
  it('reports a watched submission that turned correct', () => {
    const items = [
      { submissionId: 7, submissionStatus: 'COMPLETED', resultStatus: 'CORRECT' },
      { submissionId: 8, submissionStatus: 'JUDGING', resultStatus: null },
    ];
    expect(settledSubmissions(watched, items)).toEqual({ settled: ['7'], solved: true });
  });
  it('settles wrong answers without solving', () => {
    const items = [{ submissionId: '8', submissionStatus: 'COMPLETED', resultStatus: 'WRONG' }];
    expect(settledSubmissions(watched, items)).toEqual({ settled: ['8'], solved: false });
  });
  it('keeps watching while the verdict is not known yet', () => {
    const items = [
      { submissionId: 7, submissionStatus: 'COMPLETED' },
      { submissionId: 8, _isPending: true, isCorrect: null },
    ];
    expect(settledSubmissions(watched, items)).toEqual({ settled: [], solved: false });
  });
  it('ignores correct submissions nobody watched', () => {
    const items = [{ submissionId: 9, submissionStatus: 'COMPLETED', resultStatus: 'CORRECT' }];
    expect(settledSubmissions(watched, items)).toEqual({ settled: [], solved: false });
  });
});
