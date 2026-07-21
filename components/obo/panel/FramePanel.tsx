'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { Node, Edge } from '@xyflow/react';
import type { Frame } from '../types';
import { OVERRIDABLE_NODE_TYPES } from '../lib/overrideFields';
import { NodeOverrideEditor } from './overrides/NodeOverrideEditor';

interface FramePanelProps {
  frames: Frame[];
  selectedFrameId: string | null;
  onSelectFrame: (id: string) => void;
  onAddFrame: () => void;
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
  frames, selectedFrameId,
  onSelectFrame, onAddFrame, onRemoveFrame, onUpdateLabel,
  onRemoveHighlightNode, onRemoveHighlightEdge,
  onAddNodeOverride, onRemoveNodeOverride, onSetOverrideField, onClearOverrideField, onUpdateFrameCursorTime,
  nodes, edges,
}: FramePanelProps) {
  const selectedFrame = frames.find(f => f.id === selectedFrameId) ?? null;
  const selectedFrameIndex = selectedFrame ? frames.findIndex(f => f.id === selectedFrame.id) : -1;
  const [pickerNodeId, setPickerNodeId] = useState('');

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
              onClick={() => onSelectFrame(frame.id)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs transition-colors ${
                selectedFrameId === frame.id
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'hover:bg-slate-50 text-slate-600'
              }`}
            >
              <span className="text-slate-400 font-mono w-4 shrink-0">{i + 1}</span>
              <span className="flex-1 truncate">{frame.label || '(제목 없음)'}</span>
              <button
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

          {/* 설명 */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">설명</label>
            <input
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

          {/* 오버라이드 */}
          <div className="border-t pt-3 space-y-2">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">오버라이드</label>
            {(() => {
              const overrides = selectedFrame.nodeDataOverrides ?? {};
              const overriddenIds = Object.keys(overrides);
              const candidates = nodes.filter(n =>
                n.type && OVERRIDABLE_NODE_TYPES.includes(n.type) && !overriddenIds.includes(n.id)
              );
              return (
                <>
                  {candidates.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <select
                        value={pickerNodeId}
                        onChange={e => setPickerNodeId(e.target.value)}
                        className="flex-1 text-xs border border-slate-200 rounded px-2 py-1 bg-white"
                      >
                        <option value="">노드 선택...</option>
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
                    <p className="text-[10px] text-slate-400 italic">오버라이드된 노드가 없습니다</p>
                  ) : (
                    <div className="space-y-3">
                      {overriddenIds.map(nodeId => {
                        const node = nodes.find(n => n.id === nodeId);
                        if (!node) return null;
                        return (
                          <div key={nodeId} className="border border-slate-100 rounded-lg p-2 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-600 truncate">{nodeLabel(nodes, nodeId)}</span>
                              <button
                                onClick={() => onRemoveNodeOverride(selectedFrame.id, nodeId)}
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
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">커서 시간 (선택)</label>
            <input
              type="number"
              value={selectedFrame.cursorTime ?? ''}
              onChange={e => onUpdateFrameCursorTime(selectedFrame.id, e.target.value === '' ? undefined : Number(e.target.value))}
              placeholder="-"
              className="w-full text-xs border border-slate-200 rounded px-2 py-1 outline-none focus:border-indigo-400 transition-colors"
            />
          </div>
        </div>
      )}
    </div>
  );
}