import { describe, expect, it } from 'vitest';
import { textResult, textLines } from './TextCasePlayer';

describe('text-v1 result for the learner (2026-11-08, 2026-11-09 learner-playback)', () => {
  it('reads lines the way the grader does', () => {
    expect(textLines('  7   Miss 7 - -\r\n\n0 Hit 7 0 -  \n')).toEqual(['7 Miss 7 - -', '0 Hit 7 0 -']);
  });
  it('shows a wrong answer up to its first wrong line and never the expected lines', () => {
    const wrong = textResult({ scenarioId: 'P2', expected: 'a 1\nb 2\nc 3', reported: { v: 1, text: ['a 1', 'b 9', 'c 3', 'd 4'] }, correct: false });
    expect(wrong).toMatchObject({ wrongLine: 1, shown: ['a 1', 'b 9'], hiddenAfter: 2, missing: false });
    expect(JSON.stringify(wrong)).not.toContain('b 2');
    expect(textResult({ scenarioId: 'P2', expected: 'a 1\nb 2', reported: { v: 1, text: ['a 1'] }, correct: false })).toMatchObject({ wrongLine: 1, missing: true, shown: ['a 1'] });
    // A right answer shows every line; an older server without expected lines shows them unmarked.
    expect(textResult({ scenarioId: 'P2', expected: 'a 1', reported: { v: 1, text: ['a 1'] }, correct: true })).toMatchObject({ wrongLine: null, shown: ['a 1'] });
    expect(textResult({ scenarioId: 'P2', reported: { v: 1, text: ['a 1', 'b'] }, correct: false })).toMatchObject({ wrongLine: null, shown: ['a 1', 'b'] });
  });
});
