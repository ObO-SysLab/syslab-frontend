import type { ProblemOboData } from '../types';

// 저장 전 OBO 무결성 검사. 사람이 읽는 오류 메시지 배열을 반환(빈 배열 = 통과).
// 토큰 단위 검증은 저작 중 TracePanel(validateTrace)이 담당하고, 여기서는 저장 직전
// "비어 있음/미완성" 같은 치명적 누락만 차단한다.
export function validateProblemObo(
  data: ProblemOboData,
  opts: { choiceCount: number },
): string[] {
  const errors: string[] = [];

  if (data.mode === 'single') {
    if (!data.single?.nodes.length) errors.push('다이어그램에 노드가 없습니다');
  } else if (data.mode === 'coding_diff') {
    if (!data.codingDiff?.nodes.length) errors.push('다이어그램에 노드가 없습니다');
    if (!data.codingDiff?.referenceTrace.length) errors.push('정답 트레이스가 비어 있습니다');
  } else if (data.mode === 'per_choice') {
    const set = data.perChoice ?? {};
    const filled = Object.values(set).filter(b => b.nodes.length > 0).length;
    if (filled !== opts.choiceCount) {
      errors.push(`보기 ${opts.choiceCount}개 중 ${filled}개만 다이어그램이 설정됨`);
    }
  }

  return errors;
}