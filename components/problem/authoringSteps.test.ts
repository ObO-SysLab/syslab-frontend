import { describe, expect, it } from 'vitest';
import { createDocument } from '@/components/obo/runtime/document.mjs';
import { authoringChecklist, requiredFieldErrors, type AuthoringState } from './authoringSteps';

const blank: AuthoringState = {
  title: '', category: 'kernel', description: '', isEditMode: false, visibility: 'public', selectedGroupId: null, selectedContestId: null,
  problemType: 'coding', choices: [{ content: '' }, { content: '' }, { content: '' }, { content: '' }], selectedAnswers: [1],
  hasDockerfile: false, flag: '', oboEnabled: false, oboData: { mode: 'single', single: { nodes: [], edges: [], frames: [] } },
  testcases: [{ input: '', output: '', is_sample: true }], previewed: false,
};
const state = (patch: Partial<AuthoringState>): AuthoringState => ({ ...blank, ...patch });
const status = (s: AuthoringState) => Object.fromEntries(authoringChecklist(s).map(step => [step.id, step.status]));
const node = { id: 'n', type: 'text-label', position: { x: 0, y: 0 }, data: { text: '설명' } };

describe('create page steps (2026-11-09)', () => {
  it('keeps the register button messages exactly', () => {
    expect(requiredFieldErrors(blank)).toEqual({ title: '문제 제목을 입력해 주세요.', description: '문제 설명을 입력해 주세요.' });
    expect(requiredFieldErrors(state({ category: '', visibility: 'group' })).audience).toBe('공개할 그룹을 선택해 주세요.');
    expect(requiredFieldErrors(state({ category: '' })).category).toBe('카테고리를 선택해 주세요.');
    expect(requiredFieldErrors(state({ visibility: 'contest' })).audience).toBe('공개할 대회를 선택해 주세요.');
    expect(requiredFieldErrors(state({ visibility: 'contest', isEditMode: true })).audience).toBeUndefined();
    expect(requiredFieldErrors(state({ problemType: 'objective' })).choices).toBe('보기를 2개 이상 입력하고 빈 보기의 내용을 채우거나 삭제해 주세요.');
    expect(requiredFieldErrors(state({ problemType: 'practice' })).dockerfile).toBe('Dockerfile zip 파일을 선택해 주세요.');
    expect(requiredFieldErrors(state({ problemType: 'practice', isEditMode: true })).dockerfile).toBeUndefined();
  });

  it('counts exactly what registration would stop on as required', () => {
    const cases = [blank, state({ title: 'T', description: 'D' }), state({ problemType: 'objective', visibility: 'group' }), state({ problemType: 'practice', title: 'T' }),
      state({ oboEnabled: true, problemType: 'objective', choices: [{ content: 'a' }, { content: 'b' }], oboData: { mode: 'per_choice', perChoice: { choice_1: { nodes: [node], edges: [], frames: [] } } } })];
    for (const s of cases) {
      const required = authoringChecklist(s).filter(step => step.status === 'required').length;
      const errors = Object.keys(requiredFieldErrors(s)), basic = ['title', 'category', 'audience'].filter(k => errors.includes(k)).length;
      expect(required).toBe(errors.length - Math.max(0, basic - 1));
    }
  });

  it('coding: guides test cases, public examples and hidden tests', () => {
    expect(status(blank)).toEqual({ basic: 'required', description: 'required', obo: 'optional', testcases: 'check', samples: 'check', hidden: 'check', preview: 'optional' });
    const ready = state({ title: 'T', description: 'D', previewed: true, testcases: [{ input: '1', output: '1', is_sample: true }, { input: '2', output: '2', is_sample: false }] });
    expect(status(ready)).toEqual({ basic: 'done', description: 'done', obo: 'optional', testcases: 'done', samples: 'done', hidden: 'done', preview: 'done' });
    const missing = authoringChecklist(state({ testcases: [{ input: '1', output: '', is_sample: true }, { input: '', output: '', is_sample: false }] })).find(s => s.id === 'testcases')!;
    expect(missing).toMatchObject({ status: 'check', hint: '입력이나 출력이 빈 테스트가 1개 있어요', target: 'testcases-field' });
  });

  it('semantic grading needs inputs only, since the engine computes the answer', () => {
    const simulation = createDocument('P2'); simulation.question = { ...simulation.question, judgeProfile: 'obo-v1', gradingInstanceId: simulation.instances[0].id, ioFormat: 'text-v1', assessmentMode: 'result' };
    const s = state({ oboEnabled: true, oboData: { schemaVersion: 2, mode: 'simulation', simulation }, testcases: [{ input: '3 3 FIFO\n1 2 3', output: '', is_sample: true }] });
    expect(status(s).testcases).toBe('done');
  });

  it('objective free drawings: shows the missing choice drawings before registering', () => {
    const s = state({ problemType: 'objective', title: 'T', description: 'D', choices: [{ content: 'a' }, { content: 'b' }, { content: 'c' }, { content: 'd' }], oboEnabled: true,
      oboData: { mode: 'per_choice', perChoice: { choice_1: { nodes: [node], edges: [], frames: [] } } } });
    const obo = authoringChecklist(s).find(step => step.id === 'obo')!;
    expect(obo).toMatchObject({ status: 'required', hint: '보기 4개 중 1개만 다이어그램이 설정됨', target: 'obo-field' });
    expect(status(s)).toEqual({ basic: 'done', description: 'done', choices: 'done', obo: 'required', preview: 'optional' });
  });

  it('practice: Dockerfile is required for a new problem and the flag is worth checking', () => {
    expect(status(state({ problemType: 'practice', title: 'T', description: 'D' }))).toEqual({ basic: 'done', description: 'done', dockerfile: 'required', flag: 'check' });
    expect(status(state({ problemType: 'practice', title: 'T', description: 'D', hasDockerfile: true, flag: 'DK{x}' }))).toEqual({ basic: 'done', description: 'done', dockerfile: 'done', flag: 'done' });
  });
});
