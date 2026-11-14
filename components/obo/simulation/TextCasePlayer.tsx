'use client';
import { useMemo, useState } from 'react';
import type { SimulationDocument } from '../runtime/document.mjs';
import type { PublicCase } from './PublicCasePlayer';
import { instanceForCase } from './publicCaseViews';
import { SimulationScene } from './SimulationScene';
import { Playback } from './SimulationEditor';
import { firstWrongLine } from './firstWrong';

/** Lines read the way the grader reads them: trimmed, single spaces, blank lines dropped. */
export function textLines(text: string | string[] | undefined): string[] {
  const lines = Array.isArray(text) ? text : (text ?? '').split(/\r?\n/);
  return lines.map(l => l.trim().split(/\s+/).filter(Boolean).join(' ')).filter(Boolean);
}
/**
 * What a learner sees of their own text answer: every line when right; when wrong,
 * the lines up to the first wrong one (marked), never the expected lines.
 */
export function textResult(record: Pick<PublicCase, 'scenarioId' | 'expected' | 'reported' | 'correct'>) {
  const mine = textLines(record.reported?.text), expected = textLines(record.expected);
  // Older servers did not pass the expected lines on; then the wrong line cannot be located.
  const wrongLine = record.correct === false && record.reported && expected.length ? firstWrongLine(record.scenarioId, expected, mine) : null;
  return { mine, wrongLine, shown: wrongLine === null ? mine : mine.slice(0, wrongLine + 1), missing: wrongLine !== null && wrongLine >= mine.length,
    hiddenAfter: wrongLine === null ? 0 : Math.max(0, mine.length - wrongLine - 1) };
}

/** Public example of a Baekjoon-style text problem: my output lines; the reference drawing only once the answer is right. */
export function TextCasePlayer({ record, document }: { record: PublicCase; document?: SimulationDocument | null }) {
  const [cursor, setCursor] = useState(-1);
  const instance = useMemo(() => record.scenarioId && record.input ? instanceForCase(document, record.scenarioId, record.input) : null, [record, document]);
  const { shown, wrongLine, missing, hiddenAfter, mine } = useMemo(() => textResult(record), [record]);
  if (record.omitted) return <p className="rounded border p-4 text-sm text-slate-500">{record.omitted}</p>;
  const wrong = record.correct === false;
  const headline = record.correct === true ? '정답입니다.' : !wrong ? '판정 정보가 없습니다.'
    : wrongLine === null ? '오답입니다.' : missing ? `오답 · 출력이 ${mine.length}줄에서 끝났습니다. 줄이 더 있어야 합니다.` : `오답 · ${wrongLine + 1}번째 줄부터 정답과 다릅니다.`;
  return <div className="space-y-4" data-text-case>
    <div className={`rounded-lg p-3 text-sm ${wrong ? 'bg-rose-50 text-rose-800' : 'bg-indigo-50 text-indigo-800'}`}>
      <p className="font-semibold" data-verdict>{headline}</p>
      {wrong && wrongLine === null && record.message && <p className="mt-1">{record.message}</p>}
    </div>
    {record.inputText && <section className="space-y-1"><h3 className="font-semibold">예제 입력</h3>
      <pre className="max-h-48 overflow-auto rounded-lg border bg-slate-50 p-3 text-xs">{record.inputText}</pre>
    </section>}
    <section className="space-y-2"><h3 className="font-semibold">내 출력</h3>
      {!record.reported ? <p className="text-sm text-slate-500">출력을 읽을 수 없습니다.</p>
        : <ol className="overflow-x-auto rounded-lg border font-mono text-xs" data-my-output>
          {shown.map((line, i) => <li key={i} data-wrong-line={i === wrongLine || undefined} className={`flex gap-3 border-t px-3 py-1.5 first:border-t-0 ${i === wrongLine ? 'bg-rose-50 font-semibold text-rose-800' : ''}`}>
            <span className="w-6 shrink-0 text-right text-slate-400">{i + 1}</span><span className="min-w-0 flex-1 break-all">{line}</span>
            {i === wrongLine && <span className="shrink-0 font-sans">여기서부터 틀렸습니다</span>}
          </li>)}
          {missing && <li data-wrong-line className="border-t px-3 py-1.5 font-sans font-semibold text-rose-700">{mine.length + 1}번째 줄이 더 있어야 합니다.</li>}
        </ol>}
      {hiddenAfter > 0 && <p className="text-xs text-slate-500">이후 {hiddenAfter}줄은 표시하지 않습니다.</p>}
    </section>
    {!wrong && instance && record.reference && <section className="space-y-2"><h3 className="font-semibold">정답 풀이</h3>
      <SimulationScene instance={instance} execution={record.reference} cursor={cursor} />
      <Playback execution={record.reference} cursor={cursor} setCursor={setCursor} />
    </section>}
  </div>;
}
