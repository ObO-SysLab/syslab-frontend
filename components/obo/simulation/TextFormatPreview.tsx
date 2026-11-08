'use client';
import { useMemo } from 'react';
import type { SimulationInstance } from '../runtime/document.mjs';
import { inputToText, textHelp, textReference } from '../runtime/textFormats.mjs';

/** Shows the learner's text input/output for the graded model (text-v1, 2026-11-08). */
export function TextFormatPreview({ instance }: { instance: SimulationInstance }) {
  const preview = useMemo(() => {
    try {
      const input = inputToText(instance.scenarioId, instance.input);
      return { input, expected: textReference(instance.scenarioId, input).expected, error: '' };
    } catch (error) { return { input: '', expected: '', error: error instanceof Error ? error.message : String(error) }; }
  }, [instance.scenarioId, instance.input]);
  const help = textHelp(instance.scenarioId);
  const clip = (text: string) => { const lines = text.split('\n'); return lines.length > 8 ? [...lines.slice(0, 8), `… (${lines.length}줄)`].join('\n') : text; };
  return <div className="space-y-2 rounded-lg border border-indigo-100 bg-indigo-50/50 p-2 text-xs" data-text-format-preview>
    <p><b>입력</b> {help.input}</p>
    <p><b>출력</b> {help.output}</p>
    {preview.error ? <p role="alert" className="text-amber-700">현재 모델 입력은 {preview.error}</p> : <div className="grid gap-2">
      <div><p className="font-semibold text-slate-600">예제 입력</p><pre className="max-h-40 overflow-auto rounded bg-white p-2">{clip(preview.input)}</pre></div>
      <div><p className="font-semibold text-slate-600">예제 출력</p><pre className="max-h-40 overflow-auto rounded bg-white p-2">{clip(preview.expected)}</pre></div>
    </div>}
  </div>;
}
