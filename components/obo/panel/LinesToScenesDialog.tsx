'use client';
import { useMemo, useState } from 'react';
import type { Edge, Node } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import type { Frame, SimpleOutputFormat } from '../types';
import { LineFormatControls, lineTargets } from './OutputFormatPanel';
import { scenesFromLines, suggestLineFormat, type LinesApplyMode } from '../lib/scenesFromLines';

/** Free mode (2026-11-09): paste one line per scene instead of editing every scene by hand. */
export function LinesToScenesDialog({ nodes, edges, frames, selectedFrameId, initialFormat, onApply, onClose }: {
  nodes: Node[]; edges: Edge[]; frames: Frame[]; selectedFrameId: string | null; initialFormat?: SimpleOutputFormat | null;
  onApply: (frames: Frame[], selectId: string | null) => void; onClose: () => void;
}) {
  const targets = lineTargets(nodes);
  const [format, setFormat] = useState<SimpleOutputFormat | null>(() => initialFormat && targets.some(n => n.id === initialFormat.target)
    ? initialFormat : suggestLineFormat(nodes, frames, targets.map(n => n.id)));
  const [text, setText] = useState('');
  const [mode, setMode] = useState<LinesApplyMode>(selectedFrameId ? 'fill' : 'append');
  const result = useMemo(() => format && text.trim() ? scenesFromLines({ nodes, edges, frames, format, text, mode, startFrameId: selectedFrameId }) : null,
    [nodes, edges, frames, format, text, mode, selectedFrameId]);
  const startNo = selectedFrameId ? frames.findIndex(f => f.id === selectedFrameId) + 1 : 0;
  const option = (value: LinesApplyMode, label: string, disabled = false) =>
    <label className={`flex items-start gap-2 ${disabled ? 'text-slate-400' : ''}`}><input type="radio" name="lines-to-scenes-mode" checked={mode === value} disabled={disabled} onChange={() => setMode(value)} /><span>{label}</span></label>;

  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/30 p-4" onKeyDown={e => { if (e.key === 'Escape') onClose(); }}>
    <div role="dialog" aria-modal="true" aria-label="줄로 장면 만들기" className="max-h-[90dvh] w-full max-w-lg space-y-3 overflow-y-auto rounded-xl bg-white p-4 text-xs shadow-xl">
      <div><h3 className="text-sm font-semibold text-slate-800">줄로 장면 만들기</h3>
        <p className="mt-1 text-slate-500">한 줄이 장면 하나입니다. 예를 들어 메모리 칸이면 <code>7 0 -</code>처럼 칸 값을 띄어 쓰고, 빈 칸은 기호로 씁니다.</p></div>
      {targets.length === 0 || !format
        ? <p role="alert" className="text-amber-700">칸 묶음·큐·숫자·표·상태·간트·그래프처럼 한 줄로 쓸 수 있는 요소를 먼저 그리세요.</p>
        : <div className="space-y-2 rounded-lg border border-slate-200 p-2"><LineFormatControls nodes={nodes} format={format} onChange={setFormat} /></div>}
      <label className="block space-y-1"><span className="font-semibold text-slate-700">붙여 넣을 줄</span>
        <textarea aria-label="붙여 넣을 줄" rows={8} className="w-full rounded border border-slate-200 px-2 py-1 font-mono" value={text}
          onChange={e => setText(e.target.value)} placeholder={'7 - -\n7 0 -\n7 0 1'} /></label>
      <fieldset className="space-y-1" aria-label="적용 방법"><legend className="font-semibold text-slate-700">적용 방법</legend>
        {option('fill', selectedFrameId ? `선택한 장면부터 채우기 (${startNo}번 장면부터 · 장면 설명과 다른 값은 그대로)` : '선택한 장면부터 채우기 (먼저 장면을 고르세요)', !selectedFrameId)}
        {option('append', '맨 뒤에 새 장면으로 추가')}
        {option('replace', `모든 장면 새로 만들기 (지금 장면 ${frames.length}개는 지워집니다)`)}
      </fieldset>
      {result && (result.errors.length
        ? <div role="alert" className="space-y-0.5 text-amber-700">{result.errors.slice(0, 4).map(e => <p key={e.line}>{e.message}</p>)}{result.errors.length > 4 && <p>그 밖에 {result.errors.length - 4}줄</p>}</div>
        : <p role="status" className="text-indigo-700">{mode === 'fill' ? (result.created ? `장면 ${result.filled}개를 채우고 ${result.created}개를 새로 만듭니다.` : `장면 ${result.filled}개를 채웁니다.`) : `장면 ${result.created}개를 만듭니다.`}</p>)}
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onClose}>취소</Button>
        <Button type="button" size="sm" disabled={!result || result.errors.length > 0} onClick={() => { if (result) { onApply(result.frames, result.selectId); onClose(); } }}>장면에 적용</Button>
      </div>
    </div>
  </div>;
}
