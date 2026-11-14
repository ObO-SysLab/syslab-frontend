import { describe, expect, it } from 'vitest';
import { CodeDraftSession, CODE_SNIPPETS } from '@/lib/codeDraft';
import { starterCode, type CodingContract } from '@/components/obo/guidance/codingContract';
import { editorLanguages, editorStarterCode } from './starterCode';

class MemoryStorage implements Storage {
  values = new Map<string, string>();
  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
}
const text: CodingContract = { kind: 'simulation', modelVersion: 1, scenarioId: 'P2', assessmentMode: 'result', ioFormat: 'text-v1' };
let n = 0;
const open = () => new CodeDraftSession({ account: 'alice', kind: 'challenge', problem: '7' }, () => new MemoryStorage(), () => `v${n++}`);

// The author preview's first code and the submission editor's first code are one function.
describe('submission editor first code', () => {
  it('uses the problem skeleton when the problem has a public contract, else the bare main', () => {
    expect(editorStarterCode('python', text)).toBe(starterCode('python', text));
    for (const language of ['c', 'cpp', 'python']) expect(editorStarterCode(language, null)).toBe(CODE_SNIPPETS[language]);
  });
  it('lists allowed languages in the editor order and never an empty picker', () => {
    expect(editorLanguages(['python', 'c'])).toEqual(['c', 'python']);
    expect(editorLanguages(['python'])).toEqual(['python']);
    expect(editorLanguages([])).toEqual(['c', 'cpp', 'python']);
    expect(editorLanguages(['java'])).toEqual(['c', 'cpp', 'python']);
  });
  it('switches untouched buffers to the problem code once it loads, but never written code', () => {
    const draft = open();
    expect(draft.code).toBe(CODE_SNIPPETS.c);
    draft.setStarter(language => editorStarterCode(language, text));
    expect(draft.code).toBe(starterCode('c', text));
    draft.select('python'); draft.edit('print(1)');
    draft.setStarter(language => editorStarterCode(language, null));
    expect(draft.code).toBe('print(1)');
    draft.select('c'); expect(draft.code).toBe(CODE_SNIPPETS.c);
  });
  it('resets to the problem code, not the bare main', () => {
    const draft = open();
    draft.setStarter(language => editorStarterCode(language, text));
    draft.edit('mine'); expect(draft.reset()).toBe(true);
    expect(draft.code).toBe(starterCode('c', text));
  });
});
