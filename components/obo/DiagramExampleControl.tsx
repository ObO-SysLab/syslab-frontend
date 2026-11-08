'use client';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { OboCodingSchema } from './types';
import { formatSimpleOutput } from './runtime/freeDiagram.mjs';
import { generateFramesFromTrace } from './lib/trace';
import { sameJudgedOutput } from './guidance/codingContract';

type Testcase = { index: number; input: string; output: string; is_sample: boolean };

/**
 * Coding problem from a free drawing with plain output (2026-11-08): the expected output comes from the scenes.
 * The author still writes the input; grading compares the program's lines with the test output.
 */
export function DiagramExampleControl({ schema, testcases, onAdd, onFill }: {
  schema: OboCodingSchema; testcases: Testcase[];
  onAdd: (output: string, sample: boolean) => void; onFill: (index: number, output: string) => void;
}) {
  const expected = useMemo(() => schema.outputFormat
    ? formatSimpleOutput(schema.nodes, schema.frames ?? generateFramesFromTrace(schema.referenceTrace, schema.edges), schema.outputFormat) : null, [schema]);
  const [target, setTarget] = useState('');
  const [status, setStatus] = useState('');
  if (!expected) return null;
  const ready = expected.lines.length > 0 && expected.issues.length === 0;
  return <div className="mt-3 space-y-2 rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-sm" data-diagram-example>
    <p className="font-semibold text-slate-800">그림에서 만든 정답 출력 · {expected.lines.length}줄</p>
    <pre className="max-h-48 overflow-auto rounded bg-white p-2 text-xs">{expected.text || '(학생 출력에 포함된 장면이 없습니다)'}</pre>
    {expected.issues.map((m, i) => <p key={i} role="alert" className="text-xs text-amber-700">{m}</p>)}
    <p className="text-xs text-slate-600">입력은 직접 쓰세요. 이 출력은 그림의 장면과 같은 입력일 때의 정답입니다. 채점은 줄 단위로 비교합니다(줄 끝 공백 무시).</p>
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" disabled={!ready} onClick={() => { onAdd(expected.text, true); setStatus('공개 예제를 추가했습니다. 입력을 채우세요.'); }}>공개 예제로 추가</Button>
      <Button type="button" size="sm" variant="outline" disabled={!ready} onClick={() => { onAdd(expected.text, false); setStatus('숨김 테스트를 추가했습니다. 입력을 채우세요.'); }}>숨김 테스트로 추가</Button>
      {testcases.length > 0 && <>
        <select aria-label="출력을 채울 테스트케이스" value={target} onChange={e => setTarget(e.target.value)} className="rounded border bg-white px-2 py-1 text-xs">
          <option value="">테스트케이스 선택</option>{testcases.map(tc => <option key={tc.index} value={tc.index}>테스트 {tc.index}{tc.is_sample ? ' (공개)' : ''}</option>)}
        </select>
        <Button type="button" size="sm" variant="outline" disabled={!ready || !target} onClick={() => { onFill(Number(target), expected.text); setStatus(`테스트 ${target}의 출력을 채웠습니다.`); }}>이 테스트 출력에 넣기</Button>
      </>}
    </div>
    {testcases.length > 0 && <ul className="space-y-0.5 text-xs" aria-label="테스트별 정답 출력 비교">
      {testcases.map(tc => { const same = tc.output.trim() !== '' && sameJudgedOutput(tc.output, expected.text);
        return <li key={tc.index} data-testcase-match={same}>테스트 {tc.index}: {same ? '그림의 정답 출력과 같음' : tc.output.trim() ? '다름 (다른 입력이면 정상)' : '출력 없음'}</li>; })}
    </ul>}
    {status && <p role="status" className="text-xs text-indigo-800">{status}</p>}
  </div>;
}
