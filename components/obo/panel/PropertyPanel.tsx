'use client';

import { Trash2 } from 'lucide-react';
import type { Node, Edge } from '@xyflow/react';
import type { EdgeType } from '../templates';
import type { Frame } from '../types';
import { NodeEditor } from './NodeProps';
import { EdgeEditor } from './EdgeProps';
import { Palette } from './Palette';
import { FramePanel } from './FramePanel';

type PanelMode = 'palette' | 'property' | 'json';

interface PropertyPanelProps {
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
  frames: Frame[];
  selectedFrameId: string | null;
  onSelectFrame: (id: string) => void;
  onAddFrame: () => void;
  onRemoveFrame: (id: string) => void;
  onUpdateFrameLabel: (id: string, label: string) => void;
  onRemoveHighlightNode: (frameId: string, nodeId: string) => void;
  onRemoveHighlightEdge: (frameId: string, edgeId: string) => void;
}

export function PropertyPanel({
  activeTab, onTabChange,
  mode, selectedId, selectedKind, nodes, edges,
  updateNodeData, updateEdgeData,
  activeEdgeType, onEdgeTypeChange,
  currentNodes, currentEdges, onJsonClose, onDelete,
  frames, selectedFrameId, onSelectFrame, onAddFrame, onRemoveFrame,
  onUpdateFrameLabel, onRemoveHighlightNode, onRemoveHighlightEdge,
}: PropertyPanelProps) {
  const selectedNode = selectedKind === 'node' ? nodes.find(n => n.id === selectedId) ?? null : null;
  const selectedEdge = selectedKind === 'edge' ? edges.find(e => e.id === selectedId) ?? null : null;

  const propertyTitle =
    mode === 'json' ? 'JSON 출력' :
    mode === 'property' && selectedKind === 'node' ? '노드 속성' :
    mode === 'property' && selectedKind === 'edge' ? '엣지 속성' :
    '팔레트';

  const cleanBlob = {
    nodes: currentNodes.map(({ id, type, position, data }) => ({ id, type, position, data })),
    edges: currentEdges.map(({ id, source, target, data }) => ({ id, source, target, data })),
    frames,
  };

  return (
    <div className="w-64 border-l bg-white flex flex-col shrink-0 overflow-hidden">

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
          프레임{frames.length > 0 && ` (${frames.length})`}
        </button>
      </div>

      {activeTab === 'frame' ? (
        <div className="flex-1 overflow-y-auto">
          <FramePanel
            frames={frames}
            selectedFrameId={selectedFrameId}
            onSelectFrame={onSelectFrame}
            onAddFrame={onAddFrame}
            onRemoveFrame={onRemoveFrame}
            onUpdateLabel={onUpdateFrameLabel}
            onRemoveHighlightNode={onRemoveHighlightNode}
            onRemoveHighlightEdge={onRemoveHighlightEdge}
            nodes={nodes}
            edges={edges}
          />
        </div>
      ) : (
        <>
          {/* 속성 탭 헤더 */}
          <div className="h-10 border-b flex items-center px-4 shrink-0">
            <span className="text-xs font-bold text-slate-600">{propertyTitle}</span>
            {mode === 'json' && (
              <button onClick={onJsonClose} className="ml-auto text-[10px] text-slate-400 hover:text-slate-600 transition-colors">
                닫기
              </button>
            )}
            {mode === 'property' && (
              <button
                onClick={onDelete}
                className="ml-auto p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="삭제 (Delete)"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>

          {/* 속성 탭 콘텐츠 */}
          <div className="flex-1 overflow-y-auto">
            {mode === 'json' ? (
              <pre className="p-4 text-xs font-mono text-slate-700 whitespace-pre-wrap break-all leading-relaxed">
                {JSON.stringify(cleanBlob, null, 2)}
              </pre>
            ) : mode === 'property' && selectedNode ? (
              <div className="p-3 space-y-4">
                <NodeEditor node={selectedNode} onUpdate={patch => updateNodeData(selectedNode.id, patch)} />
              </div>
            ) : mode === 'property' && selectedEdge ? (
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