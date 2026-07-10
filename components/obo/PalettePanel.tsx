'use client';

import type { Node } from '@xyflow/react';
import {
  PALETTE_ITEMS, PALETTE_GROUPS, EDGE_TYPES,
  type EdgeType, type PaletteComponentType,
} from './templates';

type PanelMode = 'palette' | 'property' | 'json';

interface PalettePanelProps {
  mode: PanelMode;
  selectedNodeId: string | null;
  activeEdgeType: EdgeType;
  onEdgeTypeChange: (type: EdgeType) => void;
  nodes: Node[];
  onNodesChange: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void;
  currentParams: object;
  onJsonClose: () => void;
}

export function PalettePanel({
  mode, selectedNodeId, activeEdgeType, onEdgeTypeChange,
  currentParams, onJsonClose,
}: PalettePanelProps) {

  const onDragStart = (e: React.DragEvent, type: PaletteComponentType, label: string) => {
    e.dataTransfer.setData('application/obo-component', type);
    e.dataTransfer.setData('application/obo-label', label);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-64 border-l bg-white flex flex-col shrink-0 overflow-hidden">

      {/* 패널 헤더 */}
      <div className="h-10 border-b flex items-center px-4 shrink-0">
        <span className="text-xs font-bold text-slate-600">
          {mode === 'palette'  && '팔레트'}
          {mode === 'property' && '속성'}
          {mode === 'json'     && 'JSON 출력'}
        </span>
        {mode === 'json' && (
          <button
            onClick={onJsonClose}
            className="ml-auto text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
          >
            닫기
          </button>
        )}
      </div>

      {/* 팔레트 모드 */}
      {mode === 'palette' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {PALETTE_GROUPS.map((group) => (
            <div key={group.id} className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {group.label}
              </p>
              <div className="flex flex-col gap-1">

                {/* EDGE 그룹: 엣지 타입 선택 버튼 */}
                {group.id === 'edge'
                  ? EDGE_TYPES.map(({ type, label, description }) => (
                      <button
                        key={type}
                        onClick={() => onEdgeTypeChange(type)}
                        className={`text-left px-3 py-2 rounded-lg text-xs transition-all ${
                          activeEdgeType === type
                            ? 'bg-indigo-50 border border-indigo-200 text-indigo-700'
                            : 'bg-slate-50 border border-transparent text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <span className="font-bold">{label}</span>
                        <span className="text-slate-400 ml-1.5">{description}</span>
                      </button>
                    ))
                  : PALETTE_ITEMS.filter(item => item.group === group.id).map((item) => (
                      <div
                        key={item.type}
                        draggable
                        onDragStart={(e) => onDragStart(e, item.type, item.label)}
                        className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg
                                   text-xs cursor-grab active:cursor-grabbing
                                   hover:bg-indigo-50 hover:border-indigo-200
                                   transition-all select-none"
                      >
                        <span className="font-bold text-slate-700">{item.label}</span>
                        <p className="text-slate-400 mt-0.5 text-[10px]">{item.description}</p>
                      </div>
                    ))
                }

              </div>
            </div>
          ))}
        </div>
      )}

      {/* 속성 모드 */}
      {mode === 'property' && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center space-y-1">
            <p className="text-xs text-slate-300">속성 편집기 구현 예정</p>
            {selectedNodeId && (
              <p className="text-[10px] text-slate-200 font-mono">{selectedNodeId}</p>
            )}
          </div>
        </div>
      )}

      {/* JSON 모드 */}
      {mode === 'json' && (
        <div className="flex-1 overflow-auto p-4">
          <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap break-all">
            {JSON.stringify(currentParams, null, 2)}
          </pre>
        </div>
      )}

    </div>
  );
}