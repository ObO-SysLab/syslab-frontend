'use client';

import { useCallback } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  Background,
  BackgroundVariant,
  addEdge,
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
  // 프레임 탭
  activeTab: 'property' | 'frame';
  previewFrame: Frame | null;
  onFrameNodeClick: (nodeId: string) => void;
  onFrameEdgeClick: (edgeId: string) => void;
}

function CanvasInner({
  nodes, edges, onNodesChange, onEdgesChange,
  setNodes, setEdges, activeEdgeType, onSelect,
  activeTab, previewFrame, onFrameNodeClick, onFrameEdgeClick,
}: OBOEditorCanvasProps) {
  const { screenToFlowPosition } = useReactFlow();

  const onConnect = useCallback((params: Connection) => {
    const isBidi  = activeEdgeType === 'bidirectional';
    const isAlloc = activeEdgeType === 'allocation';
    setEdges(eds => addEdge({
      ...params,
      id: `e_${Date.now()}`,
      type: 'obo-edge',
      data: {
        label: '',
        direction: isBidi  ? 'both'       : 'forward',
        style:     isAlloc ? 'dashed'     : 'solid',
        role:      isAlloc ? 'allocation' : 'transition',
        highlight: false,
      },
    } as Edge, eds));
  }, [activeEdgeType, setEdges]);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('application/obo-component');
    if (!type) return;
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    setNodes(nds => [...nds, {
      id: `${type}-${Date.now()}`,
      type,
      position,
      data: { ...(DEFAULT_NODE_DATA[type] ?? { label: type }) },
    }]);
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
    if (activeTab === 'frame') onFrameNodeClick(node.id);
  }, [activeTab, onFrameNodeClick]);

  const handleEdgeClick: EdgeMouseHandler = useCallback((_, edge) => {
    if (activeTab === 'frame') onFrameEdgeClick(edge.id);
  }, [activeTab, onFrameEdgeClick]);

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
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onSelectionChange={onSelectionChange}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          connectionMode={ConnectionMode.Loose}
          elementsSelectable={activeTab === 'property'}
          deleteKeyCode="Delete"
          fitView
          fitViewOptions={{ padding: 0.3, maxZoom: 0.75 }}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e2e8f0" />
          <Controls />
        </ReactFlow>
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