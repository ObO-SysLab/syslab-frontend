'use client';

import { useMemo, useRef, useState } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { exampleStateValue, getStateFields } from '../lib/overrideFields';
import { validateTrace } from '../lib/traceValidate';

interface TracePanelProps {
  nodes: Node[];
  edges: Edge[];
  value: string;
  onChange: (text: string) => void;
  testcaseOutputs?: { index: number; output: string }[];
}

export function TracePanel({ nodes, edges, value, onChange, testcaseOutputs }: TracePanelProps) {
  const [pickedIndex, setPickedIndex] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stepCount = value.split('\n').map(l => l.trim()).filter(Boolean).length;

  const issues = useMemo(() => validateTrace(value, nodes, edges), [value, nodes, edges]);
  const errorCount = issues.filter(i => i.severity === 'error').length;

  // 트레이스에 넣을 노드 참조 토큰: 라벨(공백 없을 때) 우선, 없으면 id.
  // 파서도 라벨 우선으로 해석하므로 사용자가 지은 이름이 그대로 쓰인다.
  const tokenFor = (n: Node) => {
    const label = String((n.data as { label?: unknown })?.label ?? '').trim();
    return label && !label.includes(' ') ? label : n.id;
  };

  const handleImport = () => {
    if (!pickedIndex) return;
    const tc = testcaseOutputs?.find(t => String(t.index) === pickedIndex);
    if (!tc) return;
    if (value.trim() && !window.confirm('현재 작성된 트레이스를 테스트케이스 출력으로 덮어쓸까요?')) return;
    onChange(tc.output);
    setPickedIndex('');
  };

  // 텍스트박스 커서 위치에 그대로 삽입 — 리렌더로 value가 반영된 다음(requestAnimationFrame)에
  // 커서 위치를 잡아야 새 텍스트 기준으로 정확한 위치에 놓인다.
  const insertAtCursor = (text: string) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + text + value.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      const pos = start + text.length;
      el?.setSelectionRange(pos, pos);
    });
  };

  return (
    <div className="p-3 space-y-3">
      <p className="text-[10px] text-slate-400 bg-slate-50 rounded px-2 py-1.5 leading-relaxed">
        코딩 채점 모드는 프레임을 직접 만들지 않습니다. 한 줄 = 한 스텝입니다.
        <br />줄 안에서 <b>노드 이름(라벨)</b>을 적으면 그 스텝에서 강조되고(연결된 엣지도 자동 강조),
        노드 이름이 아닌 값은 바로 앞 노드의 필드값으로 들어갑니다.
        <br />예: <code>new ready</code> (두 노드 강조) / <code>frames [7,null,null]</code> (frames 노드의 값 지정)
      </p>

      <div className="space-y-1">
        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">노드 참조</label>
        {nodes.length === 0 ? (
          <p className="text-[10px] text-slate-400 italic">캔버스에 노드를 먼저 추가하세요</p>
        ) : (
          <div className="grid grid-cols-2 gap-1">
            {nodes.map(n => {
              const token = tokenFor(n);
              const field = getStateFields(n.type)[0];
              const example = exampleStateValue(n);
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => insertAtCursor(example ? `${token} ${example} ` : `${token} `)}
                  title="클릭하면 커서 위치에 삽입됩니다"
                  className="text-left bg-slate-50 hover:bg-indigo-50 rounded px-1.5 py-1 min-w-0 transition-colors"
                >
                  <div className="flex items-baseline gap-1 text-[10px]">
                    <code className="font-mono font-bold text-indigo-600 truncate">{token}</code>
                    {field && <span className="text-slate-300 shrink-0">· {field}</span>}
                  </div>
                  {example && (
                    <code className="block text-[10px] text-slate-400 truncate">{example}</code>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {testcaseOutputs && testcaseOutputs.length > 0 && (
        <div className="flex items-center gap-1.5">
          <select
            value={pickedIndex}
            onChange={e => setPickedIndex(e.target.value)}
            className="flex-1 text-xs border border-slate-200 rounded px-2 py-1 bg-white"
          >
            <option value="">테스트케이스 선택...</option>
            {testcaseOutputs.map(tc => (
              <option key={tc.index} value={tc.index}>테스트케이스 {tc.index}</option>
            ))}
          </select>
          <button
            onClick={handleImport}
            disabled={!pickedIndex}
            className="shrink-0 px-2 py-1 text-xs rounded border border-indigo-200 text-indigo-600 hover:bg-indigo-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
          >
            가져오기
          </button>
        </div>
      )}

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">정답 트레이스</label>
          <span className="text-[10px] text-slate-400">
            {stepCount}스텝 인식됨
            {errorCount > 0 && <span className="ml-1.5 text-rose-500 font-bold">· 오류 {errorCount}</span>}
          </span>
        </div>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={14}
          placeholder={'new ready\nready running\nrunning terminated'}
          className="w-full text-xs font-mono border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-indigo-400 transition-colors resize-y"
        />

        {/* 검증 진단 — 미인식 토큰(빨강)/무시·엣지없음·깨진값(앰버) */}
        {value.trim() && (
          issues.length === 0 ? (
            <p className="text-[10px] text-emerald-600 flex items-center gap-1">이상 없음</p>
          ) : (
            <ul className="space-y-0.5">
              {issues.map((it, i) => (
                <li
                  key={i}
                  className={`text-[10px] leading-snug ${it.severity === 'error' ? 'text-rose-600' : 'text-amber-600'}`}
                >
                  <span className="font-bold">L{it.line}</span> · {it.message}
                </li>
              ))}
            </ul>
          )
        )}
      </div>
    </div>
  );
}
