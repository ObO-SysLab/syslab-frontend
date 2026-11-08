import { describe, expect, it } from 'vitest';
import { registry, run } from './index.mjs';
import { createDocument, validateDocument } from './document.mjs';
import { gradeText, inputToText, parseTextInput, textHelp, textReference } from './textFormats.mjs';

const ids = Object.keys(registry);
const defaults = (id: string) => createDocument(id).instances[0].input;

describe('Baekjoon-style text input/output for every rule model (text-v1, 2026-11-08)', () => {
  it.each(ids.map(id => [id]))('%s: text input round-trips, the reference passes, spacing is ignored and one changed token fails', id => {
    const text = inputToText(id, defaults(id));
    expect(run(id, parseTextInput(id, text)).result).toEqual(run(id, defaults(id)).result);
    const { expected } = textReference(id, text);
    expect(expected.length).toBeGreaterThan(0);
    expect(gradeText(id, text, expected).correct).toBe(true);
    const spaced = '\n' + expected.split('\n').map(l => `  ${l.replace(/ /g, '   ')}  `).join('\n') + '\n\n';
    expect(gradeText(id, text, spaced).correct).toBe(true);
    const lines = expected.split('\n'), tokens = lines[0].split(' ');
    tokens[tokens.length - 1] += 'x';
    const wrong = gradeText(id, text, [tokens.join(' '), ...lines.slice(1)].join('\n'));
    expect(wrong.correct).toBe(false);
    expect(wrong.message).not.toContain(tokens.at(-1)!.slice(0, -1) + 'x');
    expect(textHelp(id).input.length).toBeGreaterThan(10);
  });

  it('accepts other valid answers where the meaning allows it', () => {
    const rr = '2 2\nP1 0 3\nP2 6 2';
    expect(textReference('RR', rr).expected).toBe('P1 0 3\nIDLE 3 6\nP2 6 8');
    expect(gradeText('RR', rr, 'P1 0 1\nP1 1 3\nIDLE 3 6\nP2 6 8').correct).toBe(true);
    expect(gradeText('RR', rr, 'P1 0 3\nP2 6 8').correct).toBe(false);
    const bk = ['5 3', 'P0 P1 P2 P3 P4', 'A B C', '3 3 2', '0 1 0', '2 0 0', '3 0 2', '2 1 1', '0 0 2', '7 5 3', '3 2 2', '9 0 2', '2 2 2', '4 3 3', 'none'].join('\n');
    expect(textReference('BK', bk).expected).toBe('SAFE P1 P3 P4 P0 P2');
    expect(gradeText('BK', bk, 'SAFE P1 P3 P0 P2 P4').correct).toBe(true);
    expect(gradeText('BK', bk, 'SAFE P0 P1 P2 P3 P4').correct).toBe(false);
    expect(textReference('BK', bk.replace('none', 'request P1 1 0 2')).expected).toBe('GRANTED\nSAFE P1 P3 P4 P0 P2');
    const s3 = '2 2\nP1 P2\nR1 R2\n1 1\n4\nrequest P1 1 0\nrequest P2 0 1\nrequest P1 0 1\nrequest P2 1 0';
    expect(gradeText('S3', s3, 'DEADLOCK P2 P1').correct).toBe(true);
  });

  it('explains input mistakes by line and refuses inputs that only JSON can express', () => {
    expect(() => textReference('P2', '3 3 FIFO\n7 0')).toThrow(/2번째 줄/);
    expect(() => textReference('G2', '2 RR\nP1 0 3\nP2 1 2')).toThrow(/정책/);
    expect(() => inputToText('IPC', { ...defaults('IPC'), initial: [1] })).toThrow(/JSON/);
    expect(() => inputToText('DP', { ...defaults('DP'), mode: 'findSchedule' })).toThrow(/JSON/);
    expect(gradeText('P2', inputToText('P2', defaults('P2')), 'x'.repeat(10)).correct).toBe(false);
  });

  it('lets saved documents choose text-v1 only for result grading', () => {
    const doc = createDocument('P2');
    doc.question = { ...doc.question, judgeProfile: 'obo-v1', assessmentMode: 'result', gradingInstanceId: doc.instances[0].id, ioFormat: 'text-v1' };
    expect(() => validateDocument(doc)).not.toThrow();
    expect(() => validateDocument({ ...doc, question: { ...doc.question, assessmentMode: 'process' } })).toThrow(/텍스트/);
  });
});
