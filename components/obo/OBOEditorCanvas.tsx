'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  ControlButton,
  Background,
  BackgroundVariant,
  addEdge,
  reconnectEdge,
  useReactFlow,
  ConnectionMode,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type Connection,
  type NodeMouseHandler,
  type EdgeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { EdgeType } from './templates';
import type { Frame } from './types';
import { FrameContext } from './FrameContext';
import { nodeTypes } from './nodes';
import { DEFAULT_NODE_DATA } from './nodes/defaultNodeData';
import { OboEdge } from './edges/OboEdge';
import { nextNodeId, nextEdgeId } from './lib/id';
import { applyFrame } from './lib/applyFrame';
import { makeUniqueLabel, collectLabels } from './lib/label';
import { Lock, Unlock } from 'lucide-react';

const edgeTypes = { 'obo-edge': OboEdge } as const;

interface OBOEditorCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  setNodes: (updater: Node[] | ((nodes: Node[]) => Node[])) => void;
  setEdges: (updater: Edge[] | ((edges: Edge[]) => Edge[])) => void;
  activeEdgeType: EdgeType;
  // 속성 탭 선택
  onSelect: (id: string | null, kind: 'node' | 'edge' | null) => void;
  // 템플릿 선택 신호 — 값이 바뀌면 캔버스를 새 내용에 맞춰 중앙 정렬(fitView)한다.
  fitSignal?: number;
  // 프레임 탭
  activeTab: 'property' | 'frame';
  frames: Frame[];
  previewFrame: Frame | null;
  onFrameNodeClick: (nodeId: string) => void;
  onFrameEdgeClick: (edgeId: string) => void;
  // 코딩 채점 모드: 노드 클릭 시 트레이스에 토큰 삽입
  traceMode?: boolean;
  onTraceNodeClick?: (nodeId: string) => void;
  // 우클릭 컨텍스트 메뉴 액션
  onDuplicateNode?: (id: string) => void;
  onDeleteNode?: (id: string) => void;
  onDeleteEdge?: (id: string) => void;
}

function CanvasInner({
  nodes, edges, onNodesChange, onEdgesChange,
  setNodes, setEdges, activeEdgeType, onSelect, fitSignal = 0,
  activeTab, frames, previewFrame, onFrameNodeClick, onFrameEdgeClick,
  traceMode = false, onTraceNodeClick,
  onDuplicateNode, onDeleteNode, onDeleteEdge,
}: OBOEditorCanvasProps) {
  // 우클릭 컨텍스트 메뉴: 대상 종류·id·화면 좌표
  const [menu, setMenu] = useState<{ kind: 'node' | 'edge'; id: string; x: number; y: number } | null>(null);
  const { screenToFlowPosition, fitView } = useReactFlow();

  // 템플릿 선택 시(fitSignal 변화) 새 노드가 측정된 뒤 화면 중앙으로 맞춘다.
  // 초기 마운트(fitSignal === 0)는 ReactFlow의 fitView 기본 동작에 맡기고 여기선 건너뛴다.
  useEffect(() => {
    if (fitSignal === 0) return;
    const id = window.setTimeout(
      () => fitView({ padding: 0.3, maxZoom: 0.75, duration: 300 }),
      60,
    );
    return () => window.clearTimeout(id);
  }, [fitSignal, fitView]);

  // 화면 이동(pan) 기본 잠금. Controls 자물쇠로 토글. 노드 드래그/편집은 영향 없음.
  const [panLocked, setPanLocked] = useState(true);

  const previewIndex = previewFrame ? frames.findIndex(f => f.id === previewFrame.id) : -1;
  const displayNodes = useMemo(
    () => (previewIndex >= 0 ? applyFrame(nodes, frames, previewIndex) : nodes),
    [nodes, frames, previewIndex]
  );

  const onConnect = useCallback((params: Connection) => {
    const isBidi  = activeEdgeType === 'bidirectional';
    const isAlloc = activeEdgeType === 'allocation';
    setEdges(eds => addEdge({
      ...params,
      id: nextEdgeId(eds),
      type: 'obo-edge',
      data: {
        label: '',
        direction: isBidi  ? 'both'       : 'forward',
        style:     isAlloc ? 'dashed'     : 'solid',
        role:      isAlloc ? 'allocation' : 'transition',
        emphasize: false,
      },
    } as Edge, eds));
  }, [activeEdgeType, setEdges]);

  // 잘못 연결한 화살표 끝점을 잡아 다른 노드/핸들로 옮긴다(id·data 유지).
  const onReconnect = useCallback((oldEdge: Edge, newConnection: Connection) => {
    setEdges(eds => reconnectEdge(oldEdge, newConnection, eds));
  }, [setEdges]);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('application/obo-component');
    if (!type) return;
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    setNodes(nds => {
      const data = { ...(DEFAULT_NODE_DATA[type] ?? { label: type }) } as Record<string, unknown>;
      // 라벨이 있는 노드는 유일한 기본 라벨을 부여(State → State2 …) — 트레이스 키 충돌 방지.
      if (typeof data.label === 'string') {
        data.label = makeUniqueLabel(data.label, collectLabels(nds));
      }
      return [...nds, { id: nextNodeId(nds), type, position, data }];
    });
  }, [screenToFlowPosition, setNodes]);

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onSelectionChange = useCallback(({ nodes: sel, edges: selEdges }: { nodes: Node[]; edges: Edge[] }) => {
    if (activeTab === 'frame') return;
    if (sel.length > 0) onSelect(sel[0].id, 'node');
    else if (selEdges.length > 0) onSelect(selEdges[0].id, 'edge');
    else onSelect(null, null);
  }, [onSelect, activeTab]);

  const handleNodeClick: NodeMouseHandler = useCallback((_, node) => {
    // 코딩 채점 모드는 프레임을 안 쓰므로 트레이스 삽입을 우선한다
    // (코딩 모드에선 트레이스 패널도 'frame' 탭에 렌더되기 때문).
    if (traceMode) onTraceNodeClick?.(node.id);
    else if (activeTab === 'frame') onFrameNodeClick(node.id);
  }, [traceMode, onTraceNodeClick, activeTab, onFrameNodeClick]);

  const handleEdgeClick: EdgeMouseHandler = useCallback((_, edge) => {
    if (activeTab === 'frame') onFrameEdgeClick(edge.id);
  }, [activeTab, onFrameEdgeClick]);

  const onNodeContextMenu: NodeMouseHandler = useCallback((e, node) => {
    e.preventDefault();
    setMenu({ kind: 'node', id: node.id, x: e.clientX, y: e.clientY });
  }, []);

  const onEdgeContextMenu: EdgeMouseHandler = useCallback((e, edge) => {
    e.preventDefault();
    setMenu({ kind: 'edge', id: edge.id, x: e.clientX, y: e.clientY });
  }, []);

  const closeMenu = useCallback(() => setMenu(null), []);

  return (
    <FrameContext.Provider value={{ previewFrame }}>
      <div className="flex-1 overflow-hidden relative" onDrop={onDrop} onDragOver={onDragOver}>
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <p className="text-slate-300 text-sm text-center leading-relaxed">
              오른쪽 팔레트에서 컴포넌트를 드래그하거나<br />
              왼쪽에서 템플릿을 선택하세요.
            </p>
          </div>
        )}
        <ReactFlow
          nodes={displayNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onReconnect={activeTab === 'property' ? onReconnect : undefined}
          onSelectionChange={onSelectionChange}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          onNodeContextMenu={onNodeContextMenu}
          onEdgeContextMenu={onEdgeContextMenu}
          onPaneClick={closeMenu}
          onMoveStart={closeMenu}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          connectionMode={ConnectionMode.Loose}
          elementsSelectable={activeTab === 'property'}
          deleteKeyCode="Delete"
          panOnDrag={!panLocked}
          snapToGrid
          snapGrid={[16, 16]}
          fitView
          fitViewOptions={{ padding: 0.3, maxZoom: 0.75 }}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e2e8f0" />
          <Controls showInteractive={false}>
            <ControlButton
              onClick={() => setPanLocked(v => !v)}
              title={panLocked ? '화면 이동 잠금 해제' : '화면 이동 잠금'}
            >
              {panLocked ? <Lock /> : <Unlock />}
            </ControlButton>
          </Controls>
        </ReactFlow>

        {menu && (
          <>
            {/* 바깥 클릭 시 닫힘 */}
            <div className="fixed inset-0 z-40" onClick={closeMenu} onContextMenu={e => { e.preventDefault(); closeMenu(); }} />
            <div
              className="fixed z-50 min-w-28 bg-white border border-slate-200 rounded-lg shadow-lg py-1 text-xs"
              style={{ left: menu.x, top: menu.y }}
            >
              {menu.kind === 'node' && (
                <button
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700"
                  onClick={() => { onDuplicateNode?.(menu.id); closeMenu(); }}
                >
                  복제
                </button>
              )}
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600"
                onClick={() => { menu.kind === 'node' ? onDeleteNode?.(menu.id) : onDeleteEdge?.(menu.id); closeMenu(); }}
              >
                삭제
              </button>
            </div>
          </>
        )}
      </div>
    </FrameContext.Provider>
  );
}

export function OBOEditorCanvas(props: OBOEditorCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}