'use client';
import { useEffect, useMemo, useState } from 'react';
import { OboEditorSection } from '@/components/obo/OboEditorSection';
import { CodingExampleControl } from '@/components/obo/simulation/CodingExampleControl';
import { DiagramExampleControl } from '@/components/obo/DiagramExampleControl';
import { DiagramOutputPlayer } from '@/components/obo/DiagramOutputPlayer';
import { CodingRules } from '@/components/obo/simulation/CodingRules';
import { describeCodingContract } from '@/components/obo/guidance/codingContract';
import { OBO_TEMPLATES } from '@/components/obo/templates';
import { framesToTrace } from '@/components/obo/runtime/freeDiagram.mjs';
import type { ProblemOboData } from '@/components/obo/types';

/** Local preview of the coding-problem free-drawing flow (2026-11-08). Same components as the problem creation page; nothing is saved. */
function initial(id: string): ProblemOboData {
  const t = OBO_TEMPLATES.find(t => t.id === id);
  if (!t) return { mode: 'coding_diff', codingDiff: { nodes: [], edges: [], frames: [], referenceTrace: [] } };
  const copy = structuredClone({ nodes: t.defaultNodes, edges: t.defaultEdges, frames: t.defaultFrames ?? [] });
  return { mode: 'coding_diff', codingDiff: { nodes: copy.nodes, edges: copy.edges, frames: copy.frames, referenceTrace: framesToTrace(copy.nodes, copy.frames) } };
}

export default function CodingAuthoringPreview() {
  const [ready, setReady] = useState(false);
  const [oboData, setOboData] = useState<ProblemOboData>(() => initial(''));
  const [testcases, setTestcases] = useState([{ index: 1, input: '', output: '', is_sample: true }]);
  const [stdout, setStdout] = useState('');
  useEffect(() => { setOboData(initial(new URLSearchParams(window.location.search).get('template') ?? 'S1')); setReady(true); }, []);
  const contract = useMemo(() => describeCodingContract(oboData), [oboData]);
  const schema = oboData.codingDiff;
  return <main className="min-h-screen space-y-4 bg-slate-50 p-4 text-slate-900 md:p-5"><div className="mx-auto max-w-[1600px] space-y-4">
    <header><p className="text-xs font-semibold text-indigo-600">OBO · 코딩형 문제 만들기 미리보기</p><h1 className="mt-1 text-2xl font-bold">장면으로 정답을 만들고, 학생 출력으로 다시 그려 보세요</h1>
      <p className="mt-1 text-sm text-slate-500">문제 등록 화면과 같은 편집기입니다. 저장되지 않습니다.</p></header>
    <div className="h-[max(620px,calc(100dvh-260px))] overflow-hidden rounded-2xl border border-slate-200 bg-white" data-testid="coding-editor">
      {ready && <OboEditorSection value={oboData} onChange={setOboData} allowCodingDiff testcaseOutputs={testcases.filter(tc => tc.is_sample).map(tc => ({ index: tc.index, output: tc.output }))} />}
    </div>
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border bg-white p-4" aria-label="테스트케이스">
        <h2 className="font-semibold">테스트케이스</h2>
        {oboData.mode === 'simulation' && oboData.simulation?.question.judgeProfile === 'obo-v1' && <CodingExampleControl document={oboData.simulation} existing={testcases.map(tc => tc.input)}
          onAdd={(input, output, sample) => setTestcases(prev => { const kept = prev.filter(tc => tc.input.trim() || tc.output.trim()); return [...kept, { index: kept.length + 1, input, output, is_sample: sample }]; })} />}
        {oboData.mode === 'coding_diff' && schema && <DiagramExampleControl schema={schema} testcases={testcases}
          onAdd={(output, sample) => setTestcases(prev => { const kept = prev.filter(tc => tc.input.trim() || tc.output.trim()); return [...kept, { index: kept.length + 1, input: '', output, is_sample: sample }]; })}
          onFill={(index, output) => setTestcases(prev => prev.map(tc => tc.index === index ? { ...tc, output } : tc))} />}
        <ol className="mt-3 space-y-2 text-xs">{testcases.map(tc => <li key={tc.index} data-testcase={tc.index} className="rounded border p-2"><b>테스트 {tc.index}</b> {tc.is_sample ? '공개' : '숨김'}<pre className="mt-1 whitespace-pre-wrap">{tc.output || '(출력 없음)'}</pre></li>)}</ol>
      </div>
      <div className="rounded-2xl border bg-white p-4"><h2 className="font-semibold">학생에게 보이는 안내</h2><CodingRules contract={contract} outputDescription="" inputDescription="" /></div>
    </section>
    {oboData.mode === 'coding_diff' && schema && <section className="space-y-3 rounded-2xl border bg-white p-4" aria-label="학생 출력 재생 체험">
      <h2 className="font-semibold">학생 출력 재생 체험</h2>
      <textarea aria-label="학생 프로그램 출력" rows={5} value={stdout} onChange={e => setStdout(e.target.value)} className="w-full rounded-lg border p-2 font-mono text-sm" placeholder={'7 - -\n7 0 -'} />
      {stdout.trim() && <DiagramOutputPlayer schema={schema} records={[{ kind: 'diagram', caseIndex: 1, stdout }]} />}
    </section>}
  </div></main>;
}
