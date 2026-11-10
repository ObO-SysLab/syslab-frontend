import type { ProblemOboData } from '@/components/obo/types';
import { validateProblemObo } from '@/components/obo/lib/validateObo';

/** What the create page knows; the same values the register button checks. */
export interface AuthoringState {
  title: string; category: string; description: string;
  isEditMode: boolean; visibility: string; selectedGroupId: unknown; selectedContestId: unknown;
  problemType: string; choices: { content: string }[]; selectedAnswers: number[];
  hasDockerfile: boolean; flag: string;
  oboEnabled: boolean; oboData: ProblemOboData;
  testcases: { input: string; output: string; is_sample: boolean }[];
  previewed: boolean;
}

/** Register-time field checks (moved from the create page's handleSubmit on 2026-11-09; messages unchanged). */
export function requiredFieldErrors(s: AuthoringState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!s.title.trim()) errors.title = '문제 제목을 입력해 주세요.';
  if (!s.category) errors.category = '카테고리를 선택해 주세요.';
  if (!s.description.trim()) errors.description = '문제 설명을 입력해 주세요.';
  if (!s.isEditMode && s.visibility === 'group' && !s.selectedGroupId) errors.audience = '공개할 그룹을 선택해 주세요.';
  if (!s.isEditMode && s.visibility === 'contest' && !s.selectedContestId) errors.audience = '공개할 대회를 선택해 주세요.';
  if (s.problemType === 'objective' && (s.choices.length < 2 || s.choices.some(c => !c.content.trim()))) errors.choices = '보기를 2개 이상 입력하고 빈 보기의 내용을 채우거나 삭제해 주세요.';
  if (!s.isEditMode && s.problemType === 'practice' && !s.hasDockerfile) errors.dockerfile = 'Dockerfile zip 파일을 선택해 주세요.';
  // Practice problems carry no OBO; a drawing left from another type stays in memory but is not checked or sent.
  if (s.oboEnabled && s.problemType !== 'practice') { const obo = validateProblemObo(s.oboData, { choiceCount: s.choices.length }); if (obo.length) errors.obo = obo.join(' · '); }
  return errors;
}

/**
 * Step list for the create page (2026-11-09).
 * required: registration stops here (same rules as requiredFieldErrors).
 * check: registration goes through but the server or learners may run into trouble.
 * optional: worth doing.
 */
export type StepStatus = 'done' | 'required' | 'check' | 'optional';
export interface AuthoringStep { id: string; label: string; status: StepStatus; hint: string; target: string }

export function authoringChecklist(s: AuthoringState): AuthoringStep[] {
  const errors = requiredFieldErrors(s), steps: AuthoringStep[] = [];
  const add = (id: string, label: string, status: StepStatus, hint: string, target: string) => steps.push({ id, label, status, hint, target });
  const firstOf = (...keys: string[]) => keys.map(k => errors[k]).find(Boolean);
  const basic = firstOf('title', 'category', 'audience');
  add('basic', '기본 정보', basic ? 'required' : 'done', basic ?? '제목·카테고리·공개 범위', errors.title || !basic ? 'title' : errors.category ? 'category-field' : 'audience-field');
  add('description', '문제 설명', errors.description ? 'required' : 'done', errors.description ?? '설명 작성됨', 'description');

  if (s.problemType === 'objective') {
    add('choices', '보기와 정답', errors.choices ? 'required' : 'done', errors.choices ?? `보기 ${s.choices.length}개 · 정답 ${s.selectedAnswers.length}개`, 'choices-field');
  }
  if (s.problemType === 'practice') {
    add('dockerfile', 'Dockerfile', errors.dockerfile ? 'required' : 'done', errors.dockerfile ?? (s.isEditMode ? '기존 실습 환경 유지' : '파일 선택됨'), 'dockerfile-field');
    add('flag', '정답 flag', s.flag.trim() ? 'done' : 'check', s.flag.trim() ? 'flag 입력됨' : '학습자가 제출할 flag를 입력하세요', 'flag');
  }
  if (s.problemType === 'coding' || s.problemType === 'objective') {
    const obo = errors.obo?.split(' · ')[0];
    add('obo', '그림 (OBO)', !s.oboEnabled ? 'optional' : obo ? 'required' : 'done', !s.oboEnabled ? '켜면 그림으로 설명하거나 채점할 수 있어요' : obo ?? '그림 준비됨', 'obo-field');
  }
  if (s.problemType === 'coding') {
    const semantic = s.oboEnabled && s.oboData.mode === 'simulation' && s.oboData.simulation?.question.judgeProfile === 'obo-v1';
    const filled = s.testcases.filter(t => t.input.trim() || t.output.trim());
    const incomplete = filled.filter(t => !t.input.trim() || (!semantic && !t.output.trim())).length;
    const empty = s.testcases.length - filled.length;
    add('testcases', '테스트케이스', !filled.length ? 'check' : incomplete || empty ? 'check' : 'done',
      !filled.length ? '테스트케이스를 1개 이상 만드세요' : incomplete ? `${semantic ? '입력' : '입력이나 출력'}이 빈 테스트가 ${incomplete}개 있어요` : empty ? `빈 테스트 ${empty}개는 지우거나 채우세요` : `${filled.length}개`, 'testcases-field');
    const samples = filled.filter(t => t.is_sample).length, hidden = filled.length - samples;
    add('samples', '공개 예제', samples ? 'done' : 'check', samples ? `${samples}개 · 학습자가 형식을 확인합니다` : '학습자가 형식을 확인할 공개 예제가 없어요', 'testcases-field');
    add('hidden', '숨김 테스트', hidden ? 'done' : 'check', hidden ? `${hidden}개` : '공개 예제만으로는 정답을 외워 통과할 수 있어요', 'testcases-field');
  }
  if (s.problemType !== 'practice') add('preview', s.problemType === 'coding' ? '학습자 미리보기 확인' : '문제 미리보기 확인', s.previewed ? 'done' : 'optional', s.previewed ? '확인함' : '학습자가 볼 화면을 한 번 확인하세요', s.problemType === 'coding' ? 'learner-preview' : 'problem-description');
  return steps;
}
