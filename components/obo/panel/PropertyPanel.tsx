'use client';

import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { EdgeType } from '../templates';
import type { Frame, OboMode, SimpleOutputFormat } from '../types';
import { NodeEditor } from './NodeProps';
import { collectLabels } from '../lib/label';
import { EdgeEditor } from './EdgeProps';
import { Palette } from './Palette';
import { FramePanel } from './FramePanel';
import { TracePanel } from './TracePanel';
import { OutputFormatPanel } from './OutputFormatPanel';

type PanelMode = 'palette' | 'property' | 'json';

interface PropertyPanelProps {
  onUpdateFrameVisibleEdges: (frameId: string, visibleEdges: string[] | undefined) => void;
  // 탭
  activeTab: 'property' | 'frame';
  onTabChange: (tab: 'property' | 'frame') => void;
  // 속성 탭
  mode: PanelMode;
  selectedId: string | null;
  selectedKind: 'node' | 'edge' | null;
  nodes: Node[];
  edges: Edge[];
  updateNodeData: (id: string, patch: Record<string, unknown>) => void;
  updateEdgeData: (id: string, patch: object) => void;
  activeEdgeType: EdgeType;
  onEdgeTypeChange: (type: EdgeType) => void;
  currentNodes: Node[];
  currentEdges: Edge[];
  onJsonClose: () => void;
  onDelete: () => void;
  // 프레임 탭
  oboMode: OboMode;
  frames: Frame[];
  selectedFrameId: string | null;
  onSelectFrame: (id: string) => void;
  onAddFrame: () => void;
  onDuplicateFrame: (id: string) => void;
  onMoveFrame: (id: string, direction: -1 | 1) => void;
  onRemoveFrame: (id: string) => void;
  onUpdateFrameLabel: (id: string, label: string) => void;
  onRemoveHighlightNode: (frameId: string, nodeId: string) => void;
  onRemoveHighlightEdge: (frameId: string, edgeId: string) => void;
  onAddNodeOverride: (frameId: string, nodeId: string) => void;
  onRemoveNodeOverride: (frameId: string, nodeId: string) => void;
  onSetOverrideField: (frameId: string, nodeId: string, field: string, value: unknown) => void;
  onClearOverrideField: (frameId: string, nodeId: string, field: string) => void;
  onUpdateFrameCursorTime: (frameId: string, cursorTime: number | undefined) => void;
  // coding_diff 전용 (frames 대신 트레이스 텍스트로 프레임 자동 생성)
  traceText: string;
  onTraceTextChange: (text: string) => void;
  testcaseOutputs?: { index: number; output: string }[];
  // coding_diff (2026-11-08): reference built from scenes (default) or written as records; learner output format
  codingSource?: 'scenes' | 'text';
  onCodingSourceChange?: (source: 'scenes' | 'text') => void;
  outputFormat?: SimpleOutputFormat | null;
  onOutputFormatChange?: (format: SimpleOutputFormat | null) => void;
  formatFrames?: Frame[];
  onUpdateFrameExclude?: (frameId: string, exclude: boolean) => void;
}

export function PropertyPanel({
  onUpdateFrameVisibleEdges,
  activeTab, onTabChange,
  mode, selectedId, selectedKind, nodes, edges,
  updateNodeData, updateEdgeData,
  activeEdgeType, onEdgeTypeChange,
  currentNodes, currentEdges, onJsonClose, onDelete,
  oboMode, frames, selectedFrameId, onSelectFrame, onAddFrame, onRemoveFrame,
  onDuplicateFrame, onMoveFrame,
  onUpdateFrameLabel, onRemoveHighlightNode, onRemoveHighlightEdge,
  onAddNodeOverride, onRemoveNodeOverride, onSetOverrideField, onClearOverrideField, onUpdateFrameCursorTime,
  traceText, onTraceTextChange, testcaseOutputs,
  codingSource = 'text', onCodingSourceChange, outputFormat = null, onOutputFormatChange, formatFrames = [], onUpdateFrameExclude,
}: PropertyPanelProps) {
  const coding = oboMode === 'coding_diff';
  const codingScenes = coding && codingSource === 'scenes';
  const selectedNode = selectedKind === 'node' ? nodes.find(n => n.id === selectedId) ?? null : null;
  const selectedEdge = selectedKind === 'edge' ? edges.find(e => e.id === selectedId) ?? null : null;
  const [toolView, setToolView] = useState<'palette' | 'property'>('property');
  useEffect(() => { setToolView('property'); }, [selectedId, selectedKind]);
  const hasSelection = !!(selectedNode || selectedEdge);
  const showProperties = hasSelection && toolView === 'property';

  const propertyTitle =
    mode === 'json' ? '저장 자료 (JSON)' :
    showProperties && selectedKind === 'node' ? '선택한 요소' :
    showProperties && selectedKind === 'edge' ? '선택한 연결선' :
    '요소 추가';

  const cleanBlob = {
    nodes: currentNodes.map(({ id, type, position, data }) => ({ id, type, position, data })),
    edges: currentEdges.map(({ id, source, target, data }) => ({ id, source, target, data })),
    frames,
  };

  return (
    <div className="w-64 border-l bg-white flex flex-col shrink-0 overflow-hidden" data-obo-property-panel>

      {/* 탭 스위처 */}
      <div className="h-9 border-b flex items-stretch shrink-0">
        <button
          onClick={() => onTabChange('property')}
          className={`flex-1 text-xs font-semibold transition-colors ${
            activeTab === 'property'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          속성
        </button>
        <button
          onClick={() => onTabChange('frame')}
          className={`flex-1 text-xs font-semibold transition-colors ${
            activeTab === 'frame'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          {coding && !codingScenes
            ? `출력 기록${traceText.trim() ? ` (${traceText.split('\n').filter(l => l.trim()).length})` : ''}`
            : `장면${frames.length > 0 ? ` (${frames.length})` : ''}`}
        </button>
      </div>

      {activeTab === 'frame' ? (
        <div className="flex-1 overflow-y-auto">
          {coding && (
            <div className="space-y-2 border-b border-slate-100 p-3" data-coding-source={codingSource}>
              <div role="group" aria-label="정답 장면 만드는 방법" className="grid grid-cols-2 gap-1">
                {([['scenes', '장면으로 만들기'], ['text', '출력 기록 직접 쓰기']] as const).map(([value, label]) => (
                  <button key={value} type="button" aria-pressed={codingSource === value} onClick={() => onCodingSourceChange?.(value)}
                    className={`rounded-lg px-1 py-1.5 text-xs font-semibold ${codingSource === value ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{label}</button>
                ))}
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500">{codingScenes ? '일반 그림처럼 장면을 만들면 정답 재생 기록이 자동으로 만들어집니다.' : '고급: 재생 기록을 줄마다 직접 씁니다.'}</p>
              {onOutputFormatChange && <OutputFormatPanel nodes={nodes} frames={formatFrames} format={outputFormat} onChange={onOutputFormatChange} />}
            </div>
          )}
          {coding && !codingScenes ? (
            <TracePanel
              nodes={nodes}
              edges={edges}
              value={traceText}
              onChange={onTraceTextChange}
              testcaseOutputs={testcaseOutputs}
            />
          ) : (
            <FramePanel
              onUpdateFrameVisibleEdges={onUpdateFrameVisibleEdges}
              frames={frames}
              selectedFrameId={selectedFrameId}
              onSelectFrame={onSelectFrame}
              onAddFrame={onAddFrame}
              onDuplicateFrame={onDuplicateFrame}
              onMoveFrame={onMoveFrame}
              onRemoveFrame={onRemoveFrame}
              onUpdateLabel={onUpdateFrameLabel}
              onRemoveHighlightNode={onRemoveHighlightNode}
              onRemoveHighlightEdge={onRemoveHighlightEdge}
              onAddNodeOverride={onAddNodeOverride}
              onRemoveNodeOverride={onRemoveNodeOverride}
              onSetOverrideField={onSetOverrideField}
              onClearOverrideField={onClearOverrideField}
              onUpdateFrameCursorTime={onUpdateFrameCursorTime}
              nodes={nodes}
              edges={edges}
              codingOutput={codingScenes}
              onUpdateFrameExclude={onUpdateFrameExclude}
            />
          )}
        </div>
      ) : (
        <>
          {mode !== 'json' && (
            <div className="grid grid-cols-[0.8fr_1.2fr] gap-1 border-b border-slate-100 p-2 shrink-0" role="group" aria-label="그림 편집 도구">
              <button type="button" onClick={() => setToolView('palette')} aria-pressed={!showProperties}
                className={`rounded-lg px-1 py-2 text-xs font-semibold transition-colors ${!showProperties ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                요소 추가
              </button>
              <button type="button" onClick={() => setToolView('property')} disabled={!hasSelection} aria-pressed={showProperties}
                title={hasSelection ? '선택한 요소 설정' : '그림에서 요소나 연결선을 먼저 선택하세요'}
                className={`rounded-lg px-1 py-2 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${showProperties ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                선택한 요소 설정
              </button>
            </div>
          )}
          {/* 속성 탭 헤더 */}
          {(mode === 'json' || showProperties) && <div className="h-10 border-b flex items-center px-4 shrink-0">
            <span className="text-xs font-bold text-slate-600">{propertyTitle}</span>
            {mode === 'json' && (
              <button onClick={onJsonClose} className="ml-auto text-[10px] text-slate-400 hover:text-slate-600 transition-colors">
                닫기
              </button>
            )}
            {mode !== 'json' && showProperties && (
              <button
                onClick={onDelete}
                className="ml-auto p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="삭제 (Delete)"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>}

          {/* 속성 탭 콘텐츠 */}
          <div className="flex-1 overflow-y-auto">
            {mode === 'json' ? (
              <pre className="p-4 text-xs font-mono text-slate-700 whitespace-pre-wrap break-all leading-relaxed">
                {JSON.stringify(cleanBlob, null, 2)}
              </pre>
            ) : showProperties && selectedNode ? (
              <div className="p-3 space-y-4">
                <NodeEditor
                  frames={frames}
                  node={selectedNode}
                  onUpdate={patch => updateNodeData(selectedNode.id, patch)}
                  takenLabels={collectLabels(nodes, selectedNode.id)}
                />
              </div>
            ) : showProperties && selectedEdge ? (
              <div className="p-3 space-y-4">
                <EdgeEditor edge={selectedEdge} onUpdate={patch => updateEdgeData(selectedEdge.id, patch)} />
              </div>
            ) : (
              <Palette activeEdgeType={activeEdgeType} onEdgeTypeChange={onEdgeTypeChange} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
