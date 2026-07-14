'use client';

import { Plus, X } from 'lucide-react';
import type { Node, Edge } from '@xyflow/react';
import type { Frame } from '../types';

interface FramePanelProps {
  frames: Frame[];
  selectedFrameId: string | null;
  onSelectFrame: (id: string) => void;
  onAddFrame: () => void;
  onRemoveFrame: (id: string) => void;
  onUpdateLabel: (id: string, label: string) => void;
  onRemoveHighlightNode: (frameId: string, nodeId: string) => void;
  onRemoveHighlightEdge: (frameId: string, edgeId: string) => void;
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
  nodes, edges,
}: FramePanelProps) {
  const selectedFrame = frames.find(f => f.id === selectedFrameId) ?? null;

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
        </div>
      )}
    </div>
  );
}