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
import { frameEdges } from './lib/frameEdges';
import { pruneFrameReferences } from './authoring/model';
import { makeUniqueLabel, collectLabels } from './lib/label';
import { Lock, Unlock } from 'lucide-react';
import { GanttContext } from './gantt/GanttContext';
import { ganttLayouts, alignGanttRows, expandGanttMoves, blocksOf, groupOf, type GanttBlock } from './gantt/model';
import { SlotGridContext } from './slots/SlotGridContext';
import { slotCountOf, slotValues, validSlotIndex, type SlotValue } from './slots/model';
import { NodeEditContext } from './lib/NodeEditContext';
import { applyNodeEdit, checkNodeEdit, effectiveData, type EditTarget } from './lib/nodeEdit';
import { NodeValueDialog, dialogSupported } from './authoring/NodeValueDialog';

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
  setFrames?: (updater: (frames: Frame[]) => Frame[]) => void;
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
  activeTab, frames, setFrames, previewFrame, onFrameNodeClick, onFrameEdgeClick,
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
      () => fitView({ padding: 0.12, maxZoom: 1.25, duration: 250 }),
      60,
    );
    return () => window.clearTimeout(id);
  }, [fitSignal, fitView]);

  // 빈 공간을 드래그해 화면 이동. 필요할 때만 자물쇠로 잠근다. 노드 편집은 영향 없음.
  const [panLocked, setPanLocked] = useState(false);

  const previewIndex = previewFrame ? frames.findIndex(f => f.id === previewFrame.id) : -1;
  const previousNodeData = useMemo(() => previewIndex > 0 && nodes.some(n => n.type === 'process-box')
    ? Object.fromEntries(applyFrame(nodes, frames, previewIndex - 1).map(n => [n.id, n.data])) : undefined,
  [nodes, frames, previewIndex]);
  const layouts = useMemo(() => ganttLayouts(nodes, frames), [nodes, frames]);
  const displayNodes = useMemo(
    () => alignGanttRows(previewIndex >= 0 ? applyFrame(nodes, frames, previewIndex) : nodes, layouts),
    [nodes, frames, previewIndex, layouts]
  );
  const editBlock = (id: string, index: number, block: GanttBlock) => {
    const node = displayNodes.find(n => n.id === id);
    if (!node) return;
    const blocks = [...blocksOf(node.data)]; blocks[index] = block;
    if (activeTab === 'frame' && previewFrame && setFrames) {
      setFrames(fs => fs.map(frame => frame.id !== previewFrame.id ? frame : { ...frame,
        nodeDataOverrides: { ...frame.nodeDataOverrides, [id]: { ...frame.nodeDataOverrides?.[id], blocks } } }));
    } else if (activeTab === 'property') setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, blocks } } : n));
  };

  const editSlot = (id: string, index: number, value: SlotValue) => {
    const node = displayNodes.find(n => n.id === id);
    if (!node || !validSlotIndex(index, slotCountOf(node.data))) return;
    const slots = slotValues(node.data); slots[index] = value;
    if (activeTab === 'frame' && previewFrame && setFrames) {
      setFrames(fs => fs.map(frame => frame.id !== previewFrame.id ? frame : { ...frame,
        nodeDataOverrides: { ...frame.nodeDataOverrides, [id]: { ...frame.nodeDataOverrides?.[id], slots } } }));
    } else if (activeTab === 'property') setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, slots } } : n));
  };

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
        // Dashed = request, matching the S3 starting example (request dashed, allocation solid). `role` is not used for drawing or grading.
        role:      isAlloc ? 'request' : 'transition',
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
      const data = JSON.parse(JSON.stringify(DEFAULT_NODE_DATA[type] ?? { label: type })) as Record<string, unknown>;
      if (type === 'gantt-lane') {
        const rows = nds.filter(n => n.type === 'gantt-lane');
        if (rows.length) {
          data.ganttGroup = groupOf(rows[0]);
          const group = rows.filter(n => groupOf(n) === data.ganttGroup);
          position.x = group[0].position.x;
          position.y = Math.max(...group.map(n => n.position.y)) + 128;
        }
        data.trackId = makeUniqueLabel('P', new Set(rows.map(n => String(n.data.trackId))));
      }
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

  // Click-to-edit for every element (2026-11-08): base drawing in the property tab, the selected scene in the scene tab.
  const editScene = activeTab === 'frame' && previewFrame && setFrames ? previewIndex : null;
  const canEdit = !traceMode && (activeTab === 'property' || editScene !== null);
  const [dialog, setDialog] = useState<{ id: string; target: EditTarget } | null>(null);
  const [editNotice, setEditNotice] = useState('');
  useEffect(() => { if (!editNotice) return; const t = window.setTimeout(() => setEditNotice(''), 5000); return () => window.clearTimeout(t); }, [editNotice]);
  const editNodeData = useCallback((id: string, patch: Record<string, unknown>): string | null => {
    if (!canEdit) return '장면을 먼저 고르세요.';
    const result = checkNodeEdit(nodes, frames, id, patch, editScene);
    if (!result.ok) { setEditNotice(result.error); return result.error; }
    if (editScene === null) setNodes(ns => applyNodeEdit(ns, frames, id, result.patch, null).nodes);
    else setFrames!(fs => applyNodeEdit(nodes, fs, id, result.patch, editScene).frames);
    setEditNotice('');
    return null;
  }, [canEdit, nodes, frames, editScene, setNodes, setFrames]);
  const openEditor = useCallback((id: string, target: EditTarget) => {
    const node = nodes.find(n => n.id === id);
    if (canEdit && node && dialogSupported(node, target)) setDialog({ id, target });
  }, [canEdit, nodes]);
  const editLabel = editScene !== null ? `장면 ${editScene + 1} 값 수정 · 이후 장면에도 이어집니다` : '기본 그림의 값 수정';
  const dialogNode = dialog ? nodes.find(n => n.id === dialog.id) : undefined;

  return (
    <NodeEditContext.Provider value={canEdit ? { edit: editNodeData, open: openEditor } : {}}>
    <SlotGridContext.Provider value={{ traceMode,
      editLabel: activeTab === 'frame' ? `장면 ${previewIndex + 1} 값 수정 · 이후 장면에도 이어집니다` : '기본 그림의 값 수정',
      onEditSlot: !traceMode && (activeTab === 'property' || (!!previewFrame && !!setFrames)) ? editSlot : undefined }}>
    <GanttContext.Provider value={{ layouts, traceMode,
      editLabel: activeTab === 'frame' ? `장면 ${previewIndex + 1} 수정 · 이후 장면에도 이어집니다` : '기본 그림 수정',
      onEditBlock: !traceMode && (activeTab === 'property' || (!!previewFrame && !!setFrames)) ? editBlock : undefined }}>
    <FrameContext.Provider value={{ previewFrame, previousNodeData }}>
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
          edges={frameEdges(edges, previewFrame)}
          onNodesChange={changes => onNodesChange(expandGanttMoves(changes, displayNodes))}
          onEdgesChange={onEdgesChange}
          onNodesDelete={removed => {
            const ids = removed.map(n => n.id);
            setFrames?.(fs => pruneFrameReferences(fs, ids, edges.filter(e => ids.includes(e.source) || ids.includes(e.target)).map(e => e.id)));
          }}
          onEdgesDelete={removed => setFrames?.(fs => pruneFrameReferences(fs, [], removed.map(e => e.id)))}
          onConnect={onConnect}
          onReconnect={activeTab === 'property' ? onReconnect : undefined}
          onSelectionChange={onSelectionChange}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          onNodeContextMenu={onNodeContextMenu}
          onNodeDoubleClick={(_, node) => openEditor(node.id, { kind: 'whole' })}
          zoomOnDoubleClick={false}
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
          fitViewOptions={{ padding: 0.12, maxZoom: 1.25 }}
          minZoom={0.05}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e2e8f0" />
          <Controls showInteractive={false} fitViewOptions={{padding:0.12,maxZoom:1.25}}>
            <ControlButton
              onClick={() => setPanLocked(v => !v)}
              title={panLocked ? '화면 이동 잠금 해제' : '화면 이동 잠금'}
              aria-label={panLocked ? '화면 이동 잠금 해제' : '화면 이동 잠금'}
            >
              {panLocked ? <Lock /> : <Unlock />}
            </ControlButton>
          </Controls>
        </ReactFlow>

        {editNotice && <p role="alert" className="absolute left-3 top-3 z-20 max-w-sm rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 shadow">{editNotice}</p>}
        {canEdit && nodes.length > 0 && <p className="pointer-events-none absolute right-3 top-2 z-10 rounded bg-white/90 px-2 py-1 text-[11px] text-slate-500">
          {editScene !== null ? `장면 ${editScene + 1}` : '기본 그림'}
        </p>}
        {dialog && dialogNode && <NodeValueDialog key={`${dialog.id}-${JSON.stringify(dialog.target)}-${editScene}`} node={dialogNode}
          data={effectiveData(nodes, frames, dialog.id, editScene)} target={dialog.target} editLabel={editLabel}
          onApply={patch => editNodeData(dialog.id, patch)} onClose={() => setDialog(null)} />}
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
    </GanttContext.Provider>
    </SlotGridContext.Provider>
    </NodeEditContext.Provider>
  );
}

export function OBOEditorCanvas(props: OBOEditorCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
