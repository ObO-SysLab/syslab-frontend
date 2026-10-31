'use client';

import { useEffect, useState } from 'react';
import { Plus, X, Copy, ArrowUp, ArrowDown } from 'lucide-react';
import type { Node, Edge } from '@xyflow/react';
import type { Frame } from '../types';
import { MANUAL_OVERRIDE_TYPES, sceneConflicts } from '../authoring/model';
import { NodeOverrideEditor } from './overrides/NodeOverrideEditor';

interface FramePanelProps {
  onUpdateFrameVisibleEdges: (frameId: string, visibleEdges: string[] | undefined) => void;
  frames: Frame[];
  selectedFrameId: string | null;
  onSelectFrame: (id: string) => void;
  onAddFrame: () => void;
  onDuplicateFrame: (id: string) => void;
  onMoveFrame: (id: string, direction: -1 | 1) => void;
  onRemoveFrame: (id: string) => void;
  onUpdateLabel: (id: string, label: string) => void;
  onRemoveHighlightNode: (frameId: string, nodeId: string) => void;
  onRemoveHighlightEdge: (frameId: string, edgeId: string) => void;
  onAddNodeOverride: (frameId: string, nodeId: string) => void;
  onRemoveNodeOverride: (frameId: string, nodeId: string) => void;
  onSetOverrideField: (frameId: string, nodeId: string, field: string, value: unknown) => void;
  onClearOverrideField: (frameId: string, nodeId: string, field: string) => void;
  onUpdateFrameCursorTime: (frameId: string, cursorTime: number | undefined) => void;
  nodes: Node[];
  edges: Edge[];
}

function nodeLabel(nodes: Node[], id: string): string {
  const n = nodes.find(n => n.id === id);
  return (n?.data as { label?: string })?.label ?? id;
}

function edgeLabel(edges: Edge[], id: string): string {
  const e = edges.find(e => e.id === id);
  const d = (e?.data ?? {}) as { label?: string };
  return d.label || `${e?.source ?? ''}→${e?.target ?? ''}`;
}

export function FramePanel({
  onUpdateFrameVisibleEdges,
  frames, selectedFrameId,
  onSelectFrame, onAddFrame, onRemoveFrame, onUpdateLabel,
  onDuplicateFrame, onMoveFrame,
  onRemoveHighlightNode, onRemoveHighlightEdge,
  onAddNodeOverride, onRemoveNodeOverride, onSetOverrideField, onClearOverrideField, onUpdateFrameCursorTime,
  nodes, edges,
}: FramePanelProps) {
  const selectedFrame = frames.find(f => f.id === selectedFrameId) ?? null;
  const selectedFrameIndex = selectedFrame ? frames.findIndex(f => f.id === selectedFrame.id) : -1;
  const [pickerNodeId, setPickerNodeId] = useState('');
  const [removeError, setRemoveError] = useState('');
  useEffect(() => setRemoveError(''), [selectedFrameId, frames]);
  const removeOverride = (node: Node) => {
    if (!selectedFrame) return;
    const overrides = { ...selectedFrame.nodeDataOverrides };
    delete overrides[node.id];
    const next = frames.map(f => f.id === selectedFrame.id ? { ...f, nodeDataOverrides: overrides } : f);
    const conflicts = sceneConflicts(node, next, {});
    if (conflicts.length) { setRemoveError(conflicts[0] + ' · 장면 값을 유지했습니다.'); return; }
    onRemoveNodeOverride(selectedFrame.id, node.id);
  };

  return (
    <div className="p-3 space-y-3">

      {/* 추가 버튼 */}
      <button
        onClick={onAddFrame}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded border border-dashed border-slate-300 text-xs text-slate-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
      >
        <Plus size={12} /> 프레임 추가
      </button>

      {/* 프레임 목록 */}
      {frames.length === 0 ? (
        <p className="text-[11px] text-slate-400 text-center py-3 leading-relaxed">
          프레임이 없습니다.<br />추가 후 캔버스 클릭으로<br />노드·엣지를 지정하세요.
        </p>
      ) : (
        <div className="space-y-0.5">
          {frames.map((frame, i) => (
            <div
              key={frame.id}
              data-frame-id={frame.id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs transition-colors ${
                selectedFrameId === frame.id
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'hover:bg-slate-50 text-slate-600'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectFrame(frame.id)}
                aria-pressed={selectedFrameId === frame.id}
                aria-label={`${i + 1}번 장면 선택: ${frame.label || '설명 없음'}`}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <span className="text-slate-400 font-mono w-4 shrink-0">{i + 1}</span>
                <span className="flex-1 truncate">{frame.label || '(제목 없음)'}</span>
              </button>
              <button
                type="button"
                aria-label={`${i + 1}번 장면 삭제`}
                onClick={e => { e.stopPropagation(); onRemoveFrame(frame.id); }}
                className="text-slate-300 hover:text-red-400 transition-colors shrink-0"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 선택된 프레임 편집 */}
      {selectedFrame && (
        <div className="border-t pt-3 space-y-3">

          <div className="space-y-2">
            <p className="text-xs font-semibold text-indigo-700">{selectedFrameIndex + 1}번 장면 편집</p>
            <div className="flex gap-1">
              <button type="button" onClick={() => onDuplicateFrame(selectedFrame.id)}
                className="flex flex-1 items-center justify-center gap-1 rounded border border-slate-200 px-2 py-2 text-xs text-slate-700 hover:bg-slate-50">
                <Copy size={13} /> 장면 복제
              </button>
              <button type="button" onClick={() => onMoveFrame(selectedFrame.id, -1)}
                disabled={selectedFrameIndex === 0} aria-label="장면 위로 이동" title="장면 위로 이동"
                className="rounded border border-slate-200 p-2 text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed">
                <ArrowUp size={14} />
              </button>
              <button type="button" onClick={() => onMoveFrame(selectedFrame.id, 1)}
                disabled={selectedFrameIndex === frames.length - 1} aria-label="장면 아래로 이동" title="장면 아래로 이동"
                className="rounded border border-slate-200 p-2 text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed">
                <ArrowDown size={14} />
              </button>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">복제하면 바로 다음에 추가됩니다. 화살표로 재생 순서를 바꿔보세요.</p>
            {frames.some(frame => Object.keys(frame.nodeDataOverrides ?? {}).length > 0) && (
              <p className="text-[11px] leading-relaxed text-slate-500">순서를 바꾸면 앞 장면에서 이어받는 값도 달라질 수 있습니다.</p>
            )}
          </div>

          {/* 설명 */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">설명</label>
            <input
              aria-label="장면 설명"
              value={selectedFrame.label}
              onChange={e => onUpdateLabel(selectedFrame.id, e.target.value)}
              placeholder="이 단계의 설명..."
              className="w-full text-xs border border-slate-200 rounded px-2 py-1 outline-none focus:border-indigo-400 transition-colors"
            />
          </div>

          {/* 강조 노드 */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">강조 노드</label>
            {selectedFrame.highlightNodes.length === 0 ? (
              <p className="text-[10px] text-slate-400 italic">캔버스에서 노드 클릭 시 추가</p>
            ) : (
              <div className="space-y-0.5">
                {selectedFrame.highlightNodes.map(nid => (
                  <div key={nid} className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
                    <span className="flex-1 text-[10px] text-amber-800 truncate">{nodeLabel(nodes, nid)}</span>
                    <button
                      onClick={() => onRemoveHighlightNode(selectedFrame.id, nid)}
                      className="text-amber-400 hover:text-red-400 transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 강조 엣지 */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">강조 엣지</label>
            {selectedFrame.highlightEdges.length === 0 ? (
              <p className="text-[10px] text-slate-400 italic">캔버스에서 엣지 클릭 시 추가</p>
            ) : (
              <div className="space-y-0.5">
                {selectedFrame.highlightEdges.map(eid => (
                  <div key={eid} className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
                    <span className="flex-1 text-[10px] text-amber-800 truncate">{edgeLabel(edges, eid)}</span>
                    <button
                      onClick={() => onRemoveHighlightEdge(selectedFrame.id, eid)}
                      className="text-amber-400 hover:text-red-400 transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-[10px] text-slate-400 bg-slate-50 rounded px-2 py-1.5 leading-relaxed">
            캔버스에서 노드/엣지를 클릭하면 이 프레임에 추가됩니다
          </p>

          <section className="space-y-2 rounded-lg border border-slate-200 p-2" aria-label="장면 연결선 표시">
            <h4 className="text-xs font-semibold text-slate-700">이 장면의 연결선</h4>
            <label className="flex gap-2 text-xs"><input type="checkbox" aria-label="표시할 연결선 직접 선택" checked={Array.isArray(selectedFrame.visibleEdges)} onChange={e => onUpdateFrameVisibleEdges(selectedFrame.id, e.target.checked ? edges.map(edge => edge.id) : undefined)} />표시할 연결선 직접 선택</label>
            {Array.isArray(selectedFrame.visibleEdges) ? <>
              <div className="flex gap-2"><button type="button" className="text-xs text-indigo-600" onClick={() => onUpdateFrameVisibleEdges(selectedFrame.id, edges.map(e => e.id))}>모두 표시</button><button type="button" className="text-xs text-slate-600" onClick={() => onUpdateFrameVisibleEdges(selectedFrame.id, [])}>모두 숨김</button></div>
              {edges.map(edge => <label key={edge.id} className="flex items-start gap-2 text-xs text-slate-600"><input type="checkbox" aria-label={`연결선 ${edge.id} 표시`} checked={selectedFrame.visibleEdges!.includes(edge.id)} onChange={e => onUpdateFrameVisibleEdges(selectedFrame.id, e.target.checked ? [...selectedFrame.visibleEdges!, edge.id] : selectedFrame.visibleEdges!.filter(id => id !== edge.id))}/><span>{nodeLabel(nodes, edge.source)} → {nodeLabel(nodes, edge.target)} · {edgeLabel(edges, edge.id)}</span></label>)}
              {!edges.length && <p className="text-xs text-slate-500">기본 그림에서 연결선을 먼저 만드세요.</p>}
            </> : <p className="text-xs text-slate-500">기본 그림의 모든 연결선을 표시합니다.</p>}
          </section>

          {/* 수동 장면 값: 코딩 출력 필드 목록과 분리 */}
          <div className="border-t pt-3 space-y-2">
            <label className="text-xs font-semibold text-slate-600">장면별 값</label>
            {removeError && <p role="alert" className="rounded bg-rose-50 p-2 text-xs text-rose-700">{removeError}</p>}
            {(() => {
              const overrides = selectedFrame.nodeDataOverrides ?? {};
              const overriddenIds = Object.keys(overrides);
              const candidates = nodes.filter(n =>
                n.type && MANUAL_OVERRIDE_TYPES.includes(n.type) && !overriddenIds.includes(n.id)
              );
              return (
                <>
                  {candidates.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <select
                        aria-label="장면 값을 정할 요소"
                        value={pickerNodeId}
                        onChange={e => setPickerNodeId(e.target.value)}
                        className="flex-1 text-xs border border-slate-200 rounded px-2 py-1 bg-white"
                      >
                        <option value="">요소 선택...</option>
                        {candidates.map(n => (
                          <option key={n.id} value={n.id}>{nodeLabel(nodes, n.id)}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => {
                          if (!pickerNodeId) return;
                          onAddNodeOverride(selectedFrame.id, pickerNodeId);
                          setPickerNodeId('');
                        }}
                        disabled={!pickerNodeId}
                        className="shrink-0 px-2 py-1 text-xs rounded border border-indigo-200 text-indigo-600 hover:bg-indigo-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                      >
                        추가
                      </button>
                    </div>
                  )}

                  {overriddenIds.length === 0 ? (
                    <p className="text-xs text-slate-400">이 장면에 따로 정한 값이 없습니다.</p>
                  ) : (
                    <div className="space-y-3">
                      {overriddenIds.map(nodeId => {
                        const node = nodes.find(n => n.id === nodeId);
                        if (!node) return null;
                        return (
                          <div key={nodeId} data-scene-element={nodeId} className="border border-slate-100 rounded-lg p-2 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-600 truncate">{nodeLabel(nodes, nodeId)}</span>
                              <button
                                aria-label={`${nodeLabel(nodes, nodeId)} 장면 값 삭제`}
                                onClick={() => removeOverride(node)}
                                className="text-slate-300 hover:text-red-400 transition-colors shrink-0"
                              >
                                <X size={11} />
                              </button>
                            </div>
                            <NodeOverrideEditor
                              node={node}
                              frames={frames}
                              frameIndex={selectedFrameIndex}
                              override={overrides[nodeId] ?? {}}
                              onFieldChange={(field, value) => onSetOverrideField(selectedFrame.id, nodeId, field, value)}
                              onFieldClear={field => onClearOverrideField(selectedFrame.id, nodeId, field)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* cursorTime */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">현재 시간 (간트 표시 · 선택)</label>
            <input
              type="number"
              aria-label="현재 시간"
              min={0}
              step="any"
              value={selectedFrame.cursorTime ?? ''}
              onChange={e => { const value = Number(e.target.value); if (e.target.value === '') onUpdateFrameCursorTime(selectedFrame.id, undefined); else if (Number.isFinite(value) && value >= 0) onUpdateFrameCursorTime(selectedFrame.id, value); }}
              placeholder="-"
              className="w-full text-xs border border-slate-200 rounded px-2 py-1 outline-none focus:border-indigo-400 transition-colors"
            />
          </div>
        </div>
      )}
    </div>
  );
}
