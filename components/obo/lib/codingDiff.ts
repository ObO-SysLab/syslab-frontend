import type { Node } from '@xyflow/react';
import type { OboBlob, OboCodingSchema, OboTraceStep } from '../types';
import { generateFramesFromTrace } from './trace';
import { resolveFieldValue } from './resolveFieldValue';

export type CheckpointStatus = 'correct' | 'incorrect';

export interface CheckpointEvalResult {
  frameIndex: number;
  nodeId: string;
  field: string; // 값 비교면 실제 필드명, 강조 비교면 '__highlight__'
  status: CheckpointStatus;
  expected: unknown;
  actual: unknown;
}

export interface CodingDiffPlan {
  results: CheckpointEvalResult[];
  stopAtFrameIndex: number;
  statusByFrameId: Record<string, Record<string, CheckpointStatus>>;
  blob: OboBlob; // 제출 트레이스로 생성된 blob — 정답이 아니라 실제 제출값/강조가 화면에 보인다
}

// 값이 slots/blocks 같은 배열/객체일 수 있어 ===(참조 비교)로는 항상 다르다고 판정된다.
// 전부 채점 API가 반환하는 JSON 직렬화 가능한 데이터이므로 구조적 비교로 처리한다.
function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  return JSON.stringify(a) === JSON.stringify(b);
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

// referenceTrace 전체를 훑어 실제로 값이 등장하는 (nodeId, field) 쌍을 중복 없이 수집한다 —
// 교사가 별도로 "채점 대상"을 지정할 필요 없이 트레이스 자체가 채점 대상을 정의한다.
function collectValueFields(trace: OboTraceStep[]): { nodeId: string; field: string }[] {
  const seen = new Set<string>();
  const result: { nodeId: string; field: string }[] = [];
  for (const step of trace) {
    for (const nodeId of Object.keys(step.overrides)) {
      for (const field of Object.keys(step.overrides[nodeId])) {
        const key = `${nodeId}.${field}`;
        if (!seen.has(key)) {
          seen.add(key);
          result.push({ nodeId, field });
        }
      }
    }
  }
  return result;
}

export function buildCodingDiffPlan(
  schema: OboCodingSchema,
  submittedTrace: OboTraceStep[]
): CodingDiffPlan {
  const frames = generateFramesFromTrace(submittedTrace, schema.edges);
  const referenceFrames = generateFramesFromTrace(schema.referenceTrace, schema.edges);
  const valueFields = collectValueFields(schema.referenceTrace);
  const results: CheckpointEvalResult[] = [];
  const statusByFrameId: Record<string, Record<string, CheckpointStatus>> = {};
  const compareLength = Math.min(schema.referenceTrace.length, submittedTrace.length);
  let stopAtFrameIndex = compareLength - 1;

  const setStatus = (frameId: string, nodeId: string, status: CheckpointStatus) => {
    const existing = statusByFrameId[frameId]?.[nodeId];
    statusByFrameId[frameId] = {
      ...(statusByFrameId[frameId] ?? {}),
      [nodeId]: existing === 'incorrect' ? 'incorrect' : status,
    };
  };

  outer: for (let i = 0; i < compareLength; i++) {
    const frameId = frames[i].id;
    let frameIncorrect = false;

    // 트랙 1: 값 비교 (carry-forward 적용 — 트레이스 스텝이 부분 표기일 수 있으므로 applyFrame 규칙을 그대로 태운다)
    for (const vf of valueFields) {
      const expected = resolveFieldValue(schema.nodes as Node[], referenceFrames, i, vf.nodeId, vf.field);
      const actual = resolveFieldValue(schema.nodes as Node[], frames, i, vf.nodeId, vf.field);
      const status: CheckpointStatus = valuesEqual(actual, expected) ? 'correct' : 'incorrect';

      results.push({ frameIndex: i, nodeId: vf.nodeId, field: vf.field, status, expected, actual });
      setStatus(frameId, vf.nodeId, status);
      if (status === 'incorrect') frameIncorrect = true;
    }

    // 트랙 2: 강조 노드 집합 비교 (carry-forward 없음 — 그 스텝의 강조 배열 그대로 비교)
    const refHighlight = schema.referenceTrace[i]?.highlightNodes ?? [];
    const subHighlight = submittedTrace[i]?.highlightNodes ?? [];
    const highlightUnion = new Set([...refHighlight, ...subHighlight]);
    if (highlightUnion.size > 0) {
      const highlightMatches = sameSet(refHighlight, subHighlight);
      const status: CheckpointStatus = highlightMatches ? 'correct' : 'incorrect';
      for (const nodeId of highlightUnion) {
        results.push({ frameIndex: i, nodeId, field: '__highlight__', status, expected: refHighlight, actual: subHighlight });
        setStatus(frameId, nodeId, status);
      }
      if (!highlightMatches) frameIncorrect = true;
    }

    if (frameIncorrect) {
      stopAtFrameIndex = i;
      break outer;
    }
  }

  return {
    results,
    stopAtFrameIndex,
    statusByFrameId,
    blob: { nodes: schema.nodes, edges: schema.edges, frames },
  };
}
