import type { Node } from '@xyflow/react';

// 노드 라벨은 트레이스에서 노드를 가리키는 키로 쓰이므로 유일해야 한다.
// 트레이스 토큰은 공백 없는 단일 토큰이라 중복 해소는 접미 숫자(KKK → KKK2)로 붙인다.
export function makeUniqueLabel(base: string, taken: Set<string>): string {
  const b = base.trim() || 'node';
  if (!taken.has(b)) return b;
  let i = 2;
  while (taken.has(`${b}${i}`)) i++;
  return `${b}${i}`;
}

// 트레이스에서 노드를 가리키는 토큰: 라벨(공백 없을 때) 우선, 없으면 id.
// 파서/역직렬화/삽입이 모두 같은 규칙을 쓰도록 한 곳에서 정의한다.
export function traceTokenFor(n: Node): string {
  const label = String((n.data as { label?: unknown })?.label ?? '').trim();
  return label && !label.includes(' ') ? label : n.id;
}

// 특정 노드(excludeId)를 제외한 나머지 노드들의 라벨 집합.
export function collectLabels(nodes: Node[], excludeId?: string): Set<string> {
  const set = new Set<string>();
  for (const n of nodes) {
    if (excludeId && n.id === excludeId) continue;
    const label = String((n.data as { label?: unknown })?.label ?? '').trim();
    if (label) set.add(label);
  }
  return set;
}