import { describe, expect, it } from 'vitest';
import { isSubmissionPending } from './submission-status';

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
