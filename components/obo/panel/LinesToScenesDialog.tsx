'use client';
import { useMemo, useRef, useState } from 'react';
import type { Edge, Node } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import type { Frame, SimpleOutputFormat } from '../types';
import { formatSimpleOutput } from '../runtime/freeDiagram.mjs';
import { LineFormatControls, lineTargets } from './OutputFormatPanel';
import { currentLines, lineRule, scenesFromLines, suggestLineFormat, type LinesApplyMode, type SkippedScene } from '../lib/scenesFromLines';

/** 2, 3, 4, 7 → "2–4, 7" (scene numbers from 1). */
const ranges = (scenes: number[]) => {
  const out: string[] = [];
  for (let i = 0; i < scenes.length; i++) {
    let j = i; while (j + 1 < scenes.length && scenes[j + 1] === scenes[j] + 1) j++;
    out.push(i === j ? `${scenes[i] + 1}` : `${scenes[i] + 1}–${scenes[j] + 1}`); i = j;
  }
  return out.join(', ');
};
const WHY: Record<SkippedScene['why'], string> = { 'before-start': '줄 번호 강조 전', excluded: '학생 출력에서 뺌', unwritable: '한 줄로 쓸 수 없음' };
const norm = (line: string) => line.trim().split(/\s+/).join(' ');

/**
 * Free mode: one line per scene instead of editing every scene by hand. The dialog opens with the
 * current scenes already written as lines, so the author edits only what changes
 * instead of learning each element's line rule first.
 */
export function LinesToScenesDialog({ nodes, edges, frames, selectedFrameId, initialFormat, onApply, onClose }: {
  nodes: Node[]; edges: Edge[]; frames: Frame[]; selectedFrameId: string | null; initialFormat?: SimpleOutputFormat | null;
  onApply: (frames: Frame[], selectId: string | null) => void; onClose: () => void;
}) {
  const targets = lineTargets(nodes);
  const [format, setFormat] = useState<SimpleOutputFormat | null>(() => initialFormat && targets.some(n => n.id === initialFormat.target)
    ? initialFormat : suggestLineFormat(nodes, frames, targets.map(n => n.id)));
  const listing = useMemo(() => format ? currentLines(nodes, frames, format) : null, [nodes, frames, format]);
  const loaded = listing && listing.lines.length > 0 ? listing : null;
  const rule = useMemo(() => format ? lineRule(nodes, format) : null, [nodes, format]);
  const sample = useMemo(() => {
    if (!format) return '';
    const shown = formatSimpleOutput(nodes, frames, format);
    return (!shown.issues.length && shown.lines.length ? shown.lines.slice(0, 3).map(l => l.text).join('\n') : '') || rule?.example || '';
  }, [nodes, frames, format, rule]);
  const [chosen, setChosen] = useState<LinesApplyMode>(() => (loaded || selectedFrameId ? 'fill' : 'append'));
  const mode: LinesApplyMode = chosen === 'fill' && !loaded && !selectedFrameId ? 'append' : chosen;
  const editing = mode === 'fill' && !!loaded;
  // Edited text; until the author types, the box shows the current scenes' lines (or nothing when adding).
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? (mode !== 'append' && loaded ? loaded.text : '');
  const result = useMemo(() => format && text.trim()
    ? scenesFromLines({ nodes, edges, frames, format, text, mode, startFrameId: selectedFrameId, sceneIds: editing ? loaded!.lines.map(l => l.frameId) : undefined })
    : null, [nodes, edges, frames, format, text, mode, selectedFrameId, editing, loaded]);
  const typed = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const changed = editing ? typed.slice(0, loaded!.lines.length).flatMap((l, i) => (norm(l) !== norm(loaded!.lines[i].text) ? [loaded!.lines[i].scene] : [])) : [];
  const extra = editing ? Math.max(0, typed.length - loaded!.lines.length) : 0, untouched = editing ? Math.max(0, loaded!.lines.length - typed.length) : 0;
  const nothingToDo = editing && changed.length === 0 && extra === 0;
  const startNo = selectedFrameId ? frames.findIndex(f => f.id === selectedFrameId) + 1 : 0;
  // Which scene each typed line goes into, shown beside the line (blank lines are ignored, as when reading).
  const gutterRef = useRef<HTMLSpanElement>(null), physical = text.split('\n');
  const into = (k: number): string => {
    if (mode === 'append') return '새 장면';
    if (mode === 'replace') return `장면 ${k + 1}`;
    if (editing) return k < loaded!.lines.length ? `장면 ${loaded!.lines[k].scene + 1}` : '새 장면';
    const open = frames.map((f, i) => ({ f, i })).filter(({ f, i }) => i >= startNo - 1 && f.excludeFromOutput !== true);
    return k < open.length ? `장면 ${open[k].i + 1}` : '새 장면';
  };
  let seen = 0;
  const gutter = physical.map(line => (line.trim() ? into(seen++) : ''));
  const option = (value: LinesApplyMode, label: string, disabled = false) =>
    <label className={`flex items-start gap-2 ${disabled ? 'text-slate-400' : ''}`}><input type="radio" name="lines-to-scenes-mode" checked={mode === value} disabled={disabled} onChange={() => setChosen(value)} /><span>{label}</span></label>;
  const skippedBy = (why: SkippedScene['why']) => listing?.skipped.filter(s => s.why === why).map(s => s.scene) ?? [];

  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/30 p-4" onKeyDown={e => { if (e.key === 'Escape') onClose(); }}>
    <div role="dialog" aria-modal="true" aria-label="줄로 장면 만들기" className="max-h-[90dvh] w-full max-w-lg space-y-3 overflow-y-auto rounded-xl bg-white p-4 text-xs shadow-xl">
      <div><h3 className="text-sm font-semibold text-slate-800">줄로 장면 만들기</h3>
        <p className="mt-1 text-slate-500">{loaded ? '한 줄이 장면 하나입니다. 지금 장면을 줄로 불러왔으니 바꿀 줄만 고치세요.' : '한 줄이 장면 하나입니다.'}</p></div>
      {targets.length === 0 || !format
        ? <p role="alert" className="text-amber-700">칸 묶음·큐·숫자·표·상태·간트·그래프처럼 한 줄로 쓸 수 있는 요소를 먼저 그리세요.</p>
        : <div className="space-y-2 rounded-lg border border-slate-200 p-2">
          <LineFormatControls nodes={nodes} format={format} onChange={next => { if (next.target !== format.target) setDraft(null); setFormat(next); }} />
          {rule?.rule && <p className="leading-relaxed text-slate-600" data-line-rule>한 줄 = {rule.rule} · 예: <code className="rounded bg-slate-100 px-1">{rule.example}</code></p>}
        </div>}
      <label className="block space-y-1"><span className="font-semibold text-slate-700">붙여 넣을 줄</span>
        <span className="flex rounded border border-slate-200 focus-within:border-indigo-300">
          <span ref={gutterRef} aria-hidden data-line-scenes className="w-14 shrink-0 overflow-hidden border-r border-slate-100 bg-slate-50 py-1 text-right font-mono text-[10px] text-slate-400">
            {gutter.map((g, i) => <span key={i} className="block h-5 pr-1.5 leading-5">{g}</span>)}</span>
          <textarea aria-label="붙여 넣을 줄" rows={Math.min(14, Math.max(6, physical.length + 1))} wrap="off" className="min-w-0 flex-1 resize-y px-2 py-1 font-mono leading-5 outline-none" value={text}
            onChange={e => setDraft(e.target.value)} onScroll={e => { if (gutterRef.current) gutterRef.current.scrollTop = e.currentTarget.scrollTop; }} placeholder={sample} />
        </span></label>
      {format && editing && <div className="space-y-0.5 text-slate-500" data-line-pairs>
        <p>{loaded!.lines.length === 1 ? '1줄' : `1–${loaded!.lines.length}줄`} → 장면 {ranges(loaded!.lines.map(l => l.scene))}{extra > 0 || listing!.stoppedAt === null ? ' · 그 뒤 줄은 맨 뒤에 새 장면' : ''}</p>
        {(['before-start', 'excluded', 'unwritable'] as const).map(why => skippedBy(why).length > 0 && <p key={why}>건너뜀({WHY[why]}): 장면 {ranges(skippedBy(why))}</p>)}
        {listing!.stoppedAt !== null && <p>불러오지 않음: 장면 {listing!.stoppedAt + 1}부터 (줄로 옮기면 모양이 달라짐)</p>}
      </div>}
      {format && !loaded && frames.length > 0 && listing && <p className="text-slate-500" data-line-pairs>
        {listing.stoppedAt !== null ? '지금 장면은 줄로 옮기면 모양이 달라져 불러오지 않았습니다. 예시를 보고 줄을 쓰세요.' : '지금 장면 중에는 한 줄로 쓸 수 있는 장면이 없습니다. 예시를 보고 줄을 쓰세요.'}</p>}
      <div className="flex items-start justify-between gap-2">
        <fieldset className="space-y-1" aria-label="적용 방법"><legend className="font-semibold text-slate-700">적용 방법</legend>
          {loaded
            ? option('fill', '지금 장면 고치기 (고친 줄의 장면만 바뀜 · 장면 설명과 다른 값은 그대로)')
            : option('fill', selectedFrameId ? `선택한 장면부터 채우기 (${startNo}번 장면부터 · 장면 설명과 다른 값은 그대로)` : '선택한 장면부터 채우기 (먼저 장면을 고르세요)', !selectedFrameId)}
          {option('append', '맨 뒤에 새 장면으로 추가')}
          {option('replace', `모든 장면 새로 만들기 (지금 장면 ${frames.length}개는 지워집니다)`)}
        </fieldset>
        {draft !== null && loaded && mode !== 'append' && <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(null)}>지금 장면 다시 불러오기</Button>}
      </div>
      {result && (result.errors.length
        ? <div role="alert" className="space-y-0.5 text-amber-700">{result.errors.slice(0, 4).map(e => <p key={e.line}>{e.message}</p>)}{result.errors.length > 4 && <p>그 밖에 {result.errors.length - 4}줄</p>}</div>
        : <p role="status" className="text-indigo-700">{editing
          ? (nothingToDo ? '고친 줄이 없습니다. 바꿀 줄만 고치면 그 장면만 바뀝니다.'
            : [changed.length ? `고친 줄 ${changed.length}개 (장면 ${ranges(changed)})` : '', extra ? `새 장면 ${extra}개` : '', untouched ? `나머지 장면 ${untouched}개는 그대로` : ''].filter(Boolean).join(' · '))
          : mode === 'fill' ? (result.created ? `장면 ${result.filled}개를 채우고 ${result.created}개를 새로 만듭니다.` : `장면 ${result.filled}개를 채웁니다.`) : `장면 ${result.created}개를 만듭니다.`}</p>)}
      {editing && extra > 0 && listing!.stoppedAt !== null && !result?.errors.length && <p role="alert" className="text-amber-700" data-spill>
        {loaded!.lines.length + 1}줄부터는 맨 뒤 새 장면이 됩니다(장면 {listing!.stoppedAt + 1}부터는 불러오지 않음). 그 장면들은 장면 편집에서 직접 고치세요.</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onClose}>취소</Button>
        <Button type="button" size="sm" disabled={!result || result.errors.length > 0 || nothingToDo} onClick={() => { if (result) { onApply(result.frames, result.selectId); onClose(); } }}>장면에 적용</Button>
      </div>
    </div>
  </div>;
}
