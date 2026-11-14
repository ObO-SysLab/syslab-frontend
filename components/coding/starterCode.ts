import { CODE_SNIPPETS } from '@/lib/codeDraft';
import { starterCode, type CodingContract } from '@/components/obo/guidance/codingContract';

/** Language order of the submission editor's picker; the author preview uses the same order. */
export const EDITOR_LANGUAGES = ['c', 'cpp', 'python'] as const;
export const LANGUAGE_LABEL: Record<string, string> = { c: 'C', cpp: 'C++', python: 'Python' };

/** Languages the learner can pick, in editor order. An empty or unknown list falls back to all three. */
export function editorLanguages(allowed?: readonly string[] | null): string[] {
  const list = EDITOR_LANGUAGES.filter(language => !allowed?.length || allowed.includes(language));
  return list.length ? list : [...EDITOR_LANGUAGES];
}

/**
 * The code the submission editor opens with. Problems with a public input/output contract get its
 * skeleton; plain problems keep the bare main. The author's learner preview shows exactly this.
 */
export function editorStarterCode(language: string, contract?: CodingContract | null): string {
  return contract ? starterCode(language, contract) : CODE_SNIPPETS[language] ?? '';
}
