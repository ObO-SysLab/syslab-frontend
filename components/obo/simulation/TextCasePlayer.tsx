'use client';
import { useMemo, useState } from 'react';
import type { SimulationDocument } from '../runtime/document.mjs';
import type { PublicCase } from './PublicCasePlayer';
import { instanceForCase } from './publicCaseViews';
import { SimulationScene } from './SimulationScene';
import { Playback } from './SimulationEditor';

/** Lines compared the way the grader reads them: trimmed, single spaces, blank lines dropped. */
export function textLines(text: string | string[] | undefined): string[] {
  const lines = Array.isArray(text) ? text : (text ?? '').split(/\r?\n/);
  return lines.map(l => l.trim().split(/\s+/).filter(Boolean).join(' ')).filter(Boolean);
}
export function lineComparison(expected: string[], actual: string[]) {
  const rows = Array.from({ length: Math.max(expected.length, actual.length) }, (_, i) => ({ index: i, expected: expected[i] ?? null, actual: actual[i] ?? null, same: expected[i] === actual[i] }));
  return { rows, firstDifference: rows.find(r => !r.same)?.index ?? null };
}

/** Public example of a Baekjoon-style text problem (text-v1, 2026-11-08): reference drawing + line-by-line output comparison. */
export function TextCasePlayer({ record, document }: { record: PublicCase; document?: SimulationDocument | null }) {
  const [cursor, setCursor] = useState(-1);
  const instance = useMemo(() => record.scenarioId && record.input ? instanceForCase(document, record.scenarioId, record.input) : null, [record, document]);
  const { rows, firstDifference } = useMemo(() => lineComparison(textLines(record.expected), textLines(record.reported?.text)), [record]);
  if (record.omitted) return <p className="rounded border p-4 text-sm text-slate-500">{record.omitted}</p>;
  return <div className="space-y-4" data-text-case>
    <div className={`rounded-lg p-3 text-sm ${record.correct ? 'bg-indigo-50 text-indigo-800' : 'bg-amber-50 text-amber-800'}`}>
      <p className="font-semibold">서버 판정: {record.correct === true ? '정답' : record.correct === false ? '오답' : '판정 정보 없음'}</p>
      {record.message && <p className="mt-1">{record.message}</p>}
      {record.correct && firstDifference !== null && <p className="mt-1 text-xs">정답이 여러 개일 수 있는 문제라 기준 출력과 줄이 달라도 정답으로 판정되었습니다.</p>}
    </div>
    {record.inputText && <section className="space-y-1"><h3 className="font-semibold">예제 입력</h3>
      <pre className="max-h-48 overflow-auto rounded-lg border bg-slate-50 p-3 text-xs">{record.inputText}</pre>
    </section>}
    {instance && record.reference && <section className="space-y-2"><h3 className="font-semibold">기준 실행</h3>
      <SimulationScene instance={instance} execution={record.reference} cursor={cursor} />
      <Playback execution={record.reference} cursor={cursor} setCursor={setCursor} />
    </section>}
    <section className="space-y-2"><h3 className="font-semibold">출력 비교</h3>
      {!record.reported && <p className="text-sm text-slate-500">출력을 읽을 수 없어 비교하지 못했습니다.</p>}
      <div className="overflow-x-auto rounded-lg border"><table className="w-full text-left text-xs">
        <thead className="bg-slate-50"><tr><th className="w-12 p-2">줄</th><th className="p-2">기준 출력</th><th className="p-2">내 출력</th></tr></thead>
        <tbody>{rows.map(r => <tr key={r.index} data-first-difference={r.index === firstDifference || undefined} className={`border-t align-top ${r.index === firstDifference ? 'bg-amber-50' : ''}`}>
          <td className="p-2 text-slate-400">{r.index + 1}</td>
          <td className="p-2 font-mono">{r.expected ?? <span className="text-slate-400">(없음)</span>}</td>
          <td className={`p-2 font-mono ${r.same ? '' : 'font-semibold text-amber-800'}`}>{r.actual ?? <span className="text-slate-400">(없음)</span>}</td>
        </tr>)}</tbody>
      </table></div>
      <p className="text-xs text-slate-500">{firstDifference === null ? '모든 줄이 기준 출력과 같습니다.' : `${firstDifference + 1}번째 줄부터 다릅니다.`} 줄 앞뒤 공백·여러 칸 공백·빈 줄은 무시하고 비교합니다.</p>
    </section>
  </div>;
}
