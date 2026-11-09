'use client';
import { useMemo } from 'react';
import type { Node } from '@xyflow/react';
import type { Frame, SimpleOutputFormat } from '../types';
import { formatSimpleOutput, parseSimpleOutput, simpleOutputTypes } from '../runtime/freeDiagram.mjs';
import { describeOutputFormat, publicOutputFormat } from '../guidance/codingContract';
import { LINE_TYPE_PRIORITY as TYPE_PRIORITY } from '../lib/scenesFromLines';

export const TYPE_NAMES: Record<string, string> = {
  'slot-grid': '칸 값들', 'queue-strip': '큐 항목들', 'counter-badge': '숫자 하나', 'resource-square': '사용 중 개수',
  'text-label': '문장 한 줄', 'table-grid': '표의 한 행', 'state-node': '상태 이름', 'gantt-lane': 'ID 시작 종료', 'line-chart': 'x y 점',
};
const field = 'w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs';
/** Per-scene marks (reset every scene); they do not count as the element's own changing value. */
const EVENT_FIELDS = ['activeBlockIndex', 'faultSlotIndex', 'hitSlotIndex', 'activeSlotIndex', 'pointerSlotIndex', 'delta', 'activeRow', 'activePointIndex', 'progressIndex', 'activeIds', 'activeThreadId'];
export const nameOf = (n: Node) => String((n.data as { label?: unknown }).label || n.id);

/**
 * Coding problems from a free drawing (2026-11-08): how a learner's plain output line fills the drawing.
 * The expected output shown here is generated from the scenes; grading compares lines with the test output.
 */
export function OutputFormatPanel({ nodes, frames, format, onChange }: {
  nodes: Node[]; frames: Frame[]; format: SimpleOutputFormat | null; onChange: (format: SimpleOutputFormat | null) => void;
}) {
  const targets = nodes.filter(n => simpleOutputTypes.includes(n.type ?? ''));
  const target = format ? nodes.find(n => n.id === format.target) : undefined;
  const preview = useMemo(() => format && target ? formatSimpleOutput(nodes, frames, format) : null, [nodes, frames, format, target]);
  const roundTrip = useMemo(() => format && target && preview && preview.text ? parseSimpleOutput(preview.text, nodes, [], format).errors : [], [nodes, format, target, preview]);
  const shape = format && target ? publicOutputFormat({ nodes, edges: [], referenceTrace: [], outputFormat: format }) : null;
  // Default to the element whose own values change most across scenes (S1: memory cells, not the reference string).
  const usePlain = () => {
    const changes = (n: Node) => frames.filter(f => Object.keys(f.nodeDataOverrides?.[n.id] ?? {}).some(k => !EVENT_FIELDS.includes(k))).length;
    const rank = (n: Node) => TYPE_PRIORITY.indexOf(n.type ?? '');
    const changing = targets.filter(n => changes(n) > 0);
    const best = [...(changing.length ? changing : targets)].sort((a, b) => rank(a) - rank(b) || changes(b) - changes(a))[0];
    if (best) onChange({ kind: 'lines-v1', target: best.id });
  };

  return <section aria-label="학생 출력 형식" className="space-y-2 rounded-lg border border-indigo-100 bg-indigo-50/40 p-2 text-xs" data-output-format={format ? 'plain' : 'json'}>
    <h4 className="font-semibold text-slate-700">학생 출력 형식</h4>
    <div role="radiogroup" aria-label="학생 출력 형식 선택" className="grid gap-1">
      <label className="flex items-start gap-2"><input type="radio" name="output-format" checked={!!format} disabled={!targets.length} onChange={usePlain} />
        <span><b>단순 줄 (백준식, 추천)</b><br /><span className="text-slate-500">예: <code>7 0 1</code> 한 줄에 한 장면</span></span></label>
      <label className="flex items-start gap-2"><input type="radio" name="output-format" checked={!format} onChange={() => onChange(null)} />
        <span><b>JSON 장면 줄 (고급)</b><br /><span className="text-slate-500">모든 요소·여러 값을 한 줄 JSON으로</span></span></label>
    </div>
    {!targets.length && <p className="text-slate-500">단순 줄로 쓸 수 있는 요소(칸 묶음·큐·숫자·표·상태·간트·그래프 등)를 먼저 그리세요.</p>}
    {format && <>
      <LineFormatControls nodes={nodes} format={format} onChange={next => onChange(next)} />
      {shape && <p className="rounded bg-white p-2 leading-relaxed text-slate-600" data-learner-format>학생 안내: {describeOutputFormat(shape)}</p>}
      {preview && <div className="space-y-1">
        <p className="font-semibold text-slate-700">정답 출력 미리보기 · {preview.lines.length}줄</p>
        {preview.lines.length > 0 ? <ol className="max-h-48 overflow-auto rounded bg-white p-2 font-mono" data-expected-output>
          {preview.lines.map((l, i) => <li key={i} className="flex gap-2"><span className="w-12 shrink-0 text-slate-400">장면 {l.scene + 1}</span><span className="break-all">{l.text}</span></li>)}
        </ol> : <p className="text-slate-500">학생 출력에 포함된 장면이 없습니다.</p>}
        {[...preview.issues, ...roundTrip.map(e => e.message)].slice(0, 4).map((m, i) => <p key={i} role="alert" className="text-amber-700">{m}</p>)}
        {preview.issues.length > 0 && <p className="text-slate-500">설명용 장면은 장면 편집에서 ‘학생 출력에 포함’을 끄세요.</p>}
      </div>}
      <p className="text-slate-500">메모리 구간·프로세스 영역은 한 줄로 쓰기 어려워 JSON 장면 줄을 쓰세요.</p>
    </>}
  </section>;
}

/** How one line fills the drawing: shared by the coding output format and lines → scenes (2026-11-09). */
export function LineFormatControls({ nodes, format, onChange }: { nodes: Node[]; format: SimpleOutputFormat; onChange: (format: SimpleOutputFormat) => void }) {
  const targets = lineTargets(nodes), target = nodes.find(n => n.id === format.target);
  const others = nodes.filter(n => n.type === 'slot-grid' && n.id !== format.target);
  const set = (patch: Partial<SimpleOutputFormat>) => onChange(Object.fromEntries(Object.entries({ ...format, ...patch }).filter(([, v]) => v !== undefined && v !== '')) as unknown as SimpleOutputFormat);
  return <>
      <label className="block space-y-1"><span>한 줄이 채울 요소</span>
        <select aria-label="한 줄이 채울 요소" className={field} value={format.target} onChange={e => onChange({ kind: 'lines-v1', target: e.target.value, ...(format.blank ? { blank: format.blank } : {}) })}>
          {!target && <option value={format.target}>다시 고르세요</option>}
          {targets.map(n => <option key={n.id} value={n.id}>{nameOf(n)} · {TYPE_NAMES[n.type ?? '']}</option>)}
        </select></label>
      {(target?.type === 'slot-grid' || target?.type === 'queue-strip') && <label className="block space-y-1"><span>빈 칸 기호</span>
        <input aria-label="빈 칸 기호" className={field} maxLength={4} value={format.blank ?? '-'} onChange={e => set({ blank: e.target.value.trim() || undefined })} /></label>}
      {target?.type === 'slot-grid' && others.length > 0 && <fieldset className="space-y-1 rounded border border-slate-200 bg-white p-2">
        <legend className="px-1 font-semibold text-slate-600">칸 묶음 표시</legend>
        <label className="block space-y-1"><span>줄 번호에 맞춰 강조할 칸 묶음</span>
          <select aria-label="줄 번호에 맞춰 강조할 칸 묶음" className={field} value={format.lineIndexTarget ?? ''} onChange={e => set({ lineIndexTarget: e.target.value || undefined })}>
            <option value="">강조 안 함</option>{others.map(n => <option key={n.id} value={n.id}>{nameOf(n)}</option>)}
          </select></label>
        <label className="flex items-center gap-2"><input type="checkbox" aria-label="바뀐 칸을 Miss로 표시" checked={!!format.markChanged} onChange={e => set({ markChanged: e.target.checked || undefined, ...(e.target.checked ? {} : { markFoundFrom: undefined }) })} />바뀐 칸을 Miss로 표시</label>
        {format.markChanged && <label className="block space-y-1"><span>안 바뀌면 Hit로 표시할 기준 (줄 번호 칸의 값)</span>
          <select aria-label="Hit 기준 칸 묶음" className={field} value={format.markFoundFrom ?? ''} onChange={e => set({ markFoundFrom: e.target.value || undefined })}>
            <option value="">표시 안 함</option>{others.map(n => <option key={n.id} value={n.id}>{nameOf(n)}</option>)}
          </select></label>}
      </fieldset>}
  </>;
}
/** Elements a line can fill, value-carrying ones first. */
export const lineTargets = (nodes: Node[]) => nodes.filter(n => simpleOutputTypes.includes(n.type ?? '')).sort((a, b) => TYPE_PRIORITY.indexOf(a.type ?? '') - TYPE_PRIORITY.indexOf(b.type ?? ''));
