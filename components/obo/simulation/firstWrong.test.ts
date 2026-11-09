import { describe, expect, it } from 'vitest';
import { defaultInput, run, type SemanticEvent } from '../runtime/index.mjs';
import { gradeText, textReference } from '../runtime/textFormats.mjs';
import { firstWrongEvent, firstWrongLine } from './firstWrong';
import { textLines } from './TextCasePlayer';

const lines = (text: string) => textLines(text);

describe('where a wrong answer first goes wrong (2026-11-09 learner-playback)', () => {
  it('exact-line models: the first different line, or where lines run out or run over', () => {
    const input = '7 3 FIFO\n7 0 1 2 0 3 0', expected = lines(textReference('P2', input).expected);
    const changed = [...expected]; changed[4] = changed[4].replace(/Hit|Miss/, m => (m === 'Hit' ? 'Miss' : 'Hit'));
    expect(gradeText('P2', input, changed.join('\n')).correct).toBe(false);
    expect(firstWrongLine('P2', expected, changed)).toBe(4);
    expect(firstWrongLine('P2', expected, expected.slice(0, 2))).toBe(2);
    expect(firstWrongLine('P2', expected, [...expected, '9'])).toBe(expected.length);
  });

  it('CPU scheduling allows merged or split runs, so the wrong line is where the run leaves the timeline', () => {
    const rr = '2 2\nP1 0 3\nP2 6 2', expected = lines(textReference('RR', rr).expected);
    expect(expected).toEqual(['P1 0 3', 'IDLE 3 6', 'P2 6 8']);
    const wrong = ['P1 0 1', 'P1 1 3', 'IDLE 3 5', 'P2 5 8'];
    expect(gradeText('RR', rr, wrong.join('\n')).correct).toBe(false);
    expect(firstWrongLine('RR', expected, wrong)).toBe(3);
    expect(firstWrongLine('RR', expected, ['P1 0 3'])).toBe(1);
    expect(firstWrongLine('RR', expected, ['P1 0 3', 'P2 3 5'])).toBe(1);
    expect(firstWrongLine('RR', expected, ['P1 0 3', 'IDLE 3 6', 'P2 6 8', 'P1 8 9'])).toBe(3);
  });

  it('Banker and one-line answers point at the line that decides', () => {
    expect(firstWrongLine('BK', ['GRANTED', 'SAFE P1 P3'], ['DENIED', 'UNSAFE'])).toBe(0);
    expect(firstWrongLine('BK', ['GRANTED', 'SAFE P1 P3'], ['GRANTED', 'SAFE P3 P1'])).toBe(1);
    expect(firstWrongLine('S3', ['DEADLOCK P1 P2'], ['NONE'])).toBe(0);
  });

  it('process records: the first event the model would not produce, or the final result', () => {
    const input = { ...defaultInput('P2'), refs: [1, 2, 1, 3], frameCount: 2 }, reference = run('P2', input);
    const events = structuredClone(reference.events) as SemanticEvent[];
    const at = Math.min(2, events.length - 1);
    (events[at] as unknown as { data: Record<string, unknown> }).data = { ...(events[at] as unknown as { data: Record<string, unknown> }).data, value: 777 };
    expect(firstWrongEvent('P2', input, { result: reference.result, events })).toEqual({ index: at, finalResult: false });
    expect(firstWrongEvent('P2', input, { result: reference.result, events: reference.events.slice(0, 2) })).toEqual({ index: 2, finalResult: false });
    expect(firstWrongEvent('P2', input, { result: { ...reference.result, faults: 99 }, events: reference.events })).toEqual({ index: reference.events.length - 1, finalResult: true });
  });
});
