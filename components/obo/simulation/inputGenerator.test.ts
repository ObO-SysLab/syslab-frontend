import { describe, expect, it } from 'vitest';
import { registry, run } from '../runtime/index.mjs';
import { createDocument } from '../runtime/document.mjs';
import { gradeText } from '../runtime/textFormats.mjs';
import { gradeRrText } from '../runtime/rrText.mjs';
import { generateHiddenCases, type CaseFormat } from './inputGenerator';

const ids = Object.keys(registry);
const base = (id: string) => createDocument(id).instances[0].input;

describe('random hidden tests (2026-11-08)', () => {
  it.each(ids.map(id => [id]))('%s: five different answers within 50 tries for ten seeds, in text and JSON, all checked by the engine', id => {
    for (const format of ['text-v1', 'json-v1'] as CaseFormat[]) for (let seed = 1; seed <= 10; seed++) {
      const g = generateHiddenCases(id, base(id), { count: 5, seed, format, maxTries: 50 });
      expect(g.cases.length, `${format} seed ${seed}: ${g.lastError}`).toBe(5);
      expect(new Set(g.cases.map(c => c.key)).size).toBe(5);
      for (const c of g.cases) {
        if (format === 'text-v1') { expect(c.input.trim().startsWith('{')).toBe(false); expect(gradeText(id, c.input, c.output).correct).toBe(true); }
        else expect(JSON.parse(c.output).result).toEqual(run(id, JSON.parse(c.input)).result);
      }
    }
  }, 30000); // 10 seeds × 2 formats; took 8 s for P3 when the whole suite ran in parallel (2026-11-08).

  it('repeats with the same seed, changes with another, and skips answers that existing tests already have', () => {
    const one = generateHiddenCases('P2', base('P2'), { count: 5, seed: 42, format: 'text-v1' });
    expect(generateHiddenCases('P2', base('P2'), { count: 5, seed: 42, format: 'text-v1' }).cases).toEqual(one.cases);
    expect(generateHiddenCases('P2', base('P2'), { count: 5, seed: 43, format: 'text-v1' }).cases).not.toEqual(one.cases);
    const next = generateHiddenCases('P2', base('P2'), { count: 5, seed: 42, format: 'text-v1', existing: one.cases.map(c => c.input) });
    expect(next.cases).toHaveLength(5);
    expect(next.cases.some(c => one.cases.some(o => o.key === c.key))).toBe(false);
  });

  it('never repeats the author\'s own answer and supports the legacy RR interval format', () => {
    const own = generateHiddenCases('BK', base('BK'), { count: 1, seed: 1, format: 'text-v1', maxTries: 1 });
    const rr = generateHiddenCases('RR', base('RR'), { count: 3, seed: 5, format: 'rr-segments-v1' });
    expect(rr.cases).toHaveLength(3);
    for (const c of rr.cases) expect(gradeRrText(c.input, c.output).correct).toBe(true);
    expect(own.tries).toBe(1);
  });

  it('explains why nothing could be made when the model input cannot be written as text', () => {
    // A context value with a space still needs JSON (DP order finding became text-expressible on 2026-11-09).
    const g = generateHiddenCases('K-SYSCALL', { ...base('K-SYSCALL'), contexts: { P: { pc: 42, note: 'a b' }, Q: { pc: 8 } } }, { count: 3, seed: 1, format: 'text-v1' });
    expect(g.cases).toHaveLength(0);
    expect(g.lastError).toMatch(/JSON/);
  });
});
