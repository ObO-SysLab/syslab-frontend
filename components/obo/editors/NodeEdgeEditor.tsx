'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  Controls,
  Background,
  Handle,
  Position,
  BackgroundVariant,
  MarkerType,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  ConnectionMode,
  type Connection,
  type Node,
  type Edge,
  type NodeProps,
  type EdgeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

// ─── 팔레트 노드 정의 ────────────────────────────────────────────

const PALETTE_ITEMS = [
  { color: '#64748b', label: 'State' },
  { color: '#7c3aed', label: 'State' },
  { color: '#0d9488', label: 'State' },
  { color: '#d97706', label: 'State' },
  { color: '#e11d48', label: 'State' },
  { color: '#2563eb', label: 'State' },
  { color: '#16a34a', label: 'State' },
  { color: '#9333ea', label: 'State' },
];

// ─── 템플릿 기본값 ──────────────────────────────────────────────

const DEFAULTS: Record<string, { nodes: Node[]; edges: Edge[] }> = {
  ST2: {
    nodes: [
      { id: 'n_0', type: 'stateNode', position: { x: 55,  y: 130 }, data: { label: 'New',        color: '#64748b' } },
      { id: 'n_1', type: 'stateNode', position: { x: 200, y: 65  }, data: { label: 'Ready',      color: '#7c3aed' } },
      { id: 'n_2', type: 'stateNode', position: { x: 355, y: 130 }, data: { label: 'Running',    color: '#0d9488' } },
      { id: 'n_3', type: 'stateNode', position: { x: 200, y: 210 }, data: { label: 'Waiting',    color: '#d97706' } },
      { id: 'n_4', type: 'stateNode', position: { x: 510, y: 130 }, data: { label: 'Terminated', color: '#e11d48' } },
    ],
    edges: [
      { id: 'e_0', source: 'n_0', target: 'n_1', type: 'labeled', label: 'admitted',  markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e_1', source: 'n_1', target: 'n_2', type: 'labeled', label: 'dispatch',  markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e_2', source: 'n_2', target: 'n_1', type: 'labeled', label: 'interrupt', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e_3', source: 'n_2', target: 'n_3', type: 'labeled', label: 'I/O wait',  markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e_4', source: 'n_3', target: 'n_1', type: 'labeled', label: 'I/O done',  markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e_5', source: 'n_2', target: 'n_4', type: 'labeled', label: 'exit',      markerEnd: { type: MarkerType.ArrowClosed } },
    ],
  },
  S3: {
    nodes: [
      { id: 'n_0', type: 'stateNode', position: { x: 80,  y: 80  }, data: { label: 'P1', color: '#3b82f6' } },
      { id: 'n_1', type: 'stateNode', position: { x: 300, y: 80  }, data: { label: 'P2', color: '#3b82f6' } },
      { id: 'n_2', type: 'stateNode', position: { x: 80,  y: 240 }, data: { label: 'R1', color: '#ef4444' } },
      { id: 'n_3', type: 'stateNode', position: { x: 300, y: 240 }, data: { label: 'R2', color: '#ef4444' } },
    ],
    edges: [],
  },
};

// ─── 포맷 변환 ──────────────────────────────────────────────────

function loadInitial(templateId: string, initialParams: object | null) {
  const p = initialParams as any;
  if (p?.nodes?.length) {
    return {
      nodes: p.nodes.map((n: any) => ({
        id: n.id, type: 'stateNode',
        position: { x: n.x ?? 0, y: n.y ?? 0 },
        data: { label: n.label ?? '', color: n.color ?? '#64748b' },
      })),
      edges: (p.edges ?? []).map((e: any) => ({
        id: e.id, source: e.from, target: e.to,
        type: 'labeled', label: e.label ?? '',
        markerEnd: { type: MarkerType.ArrowClosed },
      })),
    };
  }
  return DEFAULTS[templateId] ?? { nodes: [], edges: [] };
}

function toOBO(nodes: Node[], edges: Edge[]) {
  return {
    nodes: nodes.map(n => ({
      id: n.id,
      label: (n.data as any).label as string,
      x: Math.round(n.position.x),
      y: Math.round(n.position.y),
      color: (n.data as any).color as string,
    })),
    edges: edges.map(e => ({
      id: e.id,
      from: e.source,
      to: e.target,
      label: (e.label as string) ?? '',
    })),
    steps: [],
  };
}

// ─── 커스텀 노드 ────────────────────────────────────────────────

function StateNodeComponent({ data, selected }: NodeProps) {
  const d = data as { label: string; color: string };
  return (
    <div style={{
      width: 60, height: 60, borderRadius: '50%',
      background: selected ? d.color : '#fff',
      border: `3px solid ${d.color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontWeight: 800,
      color: selected ? '#fff' : d.color,
      boxShadow: selected ? `0 0 0 4px ${d.color}30` : '0 2px 8px rgba(0,0,0,0.12)',
      transition: 'all 0.1s',
      userSelect: 'none',
    }}>
      <Handle type="source" position={Position.Top}    style={{ width: 8, height: 8, background: d.color, border: 'none' }} />
      <Handle type="source" position={Position.Right}  style={{ width: 8, height: 8, background: d.color, border: 'none' }} />
      <Handle type="target" position={Position.Bottom} style={{ width: 8, height: 8, background: d.color, border: 'none' }} />
      <Handle type="target" position={Position.Left}   style={{ width: 8, height: 8, background: d.color, border: 'none' }} />
      <span style={{ textAlign: 'center', lineHeight: 1.2, padding: 2, maxWidth: 52, wordBreak: 'break-word' }}>
        {d.label}
      </span>
    </div>
  );
}

// ─── 커스텀 엣지 ────────────────────────────────────────────────

function LabeledEdgeComponent({ sourceX, sourceY, targetX, targetY, label, markerEnd, selected }: EdgeProps) {
  const [path, lx, ly] = getBezierPath({ sourceX, sourceY, targetX, targetY });
  return (
    <>
      <BaseEdge path={path} markerEnd={markerEnd}
        style={{ stroke: selected ? '#6366f1' : '#94a3b8', strokeWidth: selected ? 2.5 : 1.8 }}
      />
      {label && (
        <EdgeLabelRenderer>
          <div className="nodrag nopan" style={{
            position: 'absolute',
            transform: `translate(-50%,-50%) translate(${lx}px,${ly}px)`,
            fontSize: 10, fontWeight: 600,
            background: '#fff', border: '1px solid #e2e8f0',
            borderRadius: 4, padding: '1px 5px',
            color: selected ? '#6366f1' : '#64748b',
            pointerEvents: 'all', whiteSpace: 'nowrap',
          }}>
            {label as string}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const nodeTypes = { stateNode: StateNodeComponent };
const edgeTypes  = { labeled: LabeledEdgeComponent };

// ─── 팔레트 패널 ────────────────────────────────────────────────

function NodePalette() {
  const onDragStart = (event: React.DragEvent, color: string, label: string) => {
    event.dataTransfer.setData('application/obo-node', JSON.stringify({ color, label }));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-36 border-l bg-white flex flex-col shrink-0">
      <div className="h-10 border-b flex items-center px-3 shrink-0">
        <span className="text-xs font-bold text-slate-600">노드 팔레트</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <p className="text-[10px] text-slate-400 leading-relaxed">
          아래 노드를 드래그해서 캔버스에 배치하세요.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {PALETTE_ITEMS.map(({ color, label }) => (
            <div
              key={color}
              draggable
              onDragStart={e => onDragStart(e, color, label)}
              className="flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing group"
            >
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: color, flexShrink: 0,
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                transition: 'transform 0.1s',
              }}
                className="group-hover:scale-110"
              />
              <span className="text-[9px] text-slate-400">{label}</span>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-slate-100">
          <p className="text-[10px] text-slate-400 leading-relaxed">
            노드 핸들(●)에서 드래그하면 엣지가 연결됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── FlowCanvas (ReactFlowProvider 내부에서 실행) ────────────────

interface FlowCanvasProps {
  templateId: string;
  initialParams: object | null;
  onChange: (params: object) => void;
}

function FlowCanvas({ templateId, initialParams, onChange }: FlowCanvasProps) {
  const { screenToFlowPosition } = useReactFlow();

  const init = loadInitial(templateId, initialParams);
  const [nodes, setNodes, onNodesChange] = useNodesState(init.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(init.edges);

  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [nodeLabelInput, setNodeLabelInput] = useState('');
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [edgeLabelInput, setEdgeLabelInput] = useState('');

  useEffect(() => {
    const d = loadInitial(templateId, null);
    setNodes(d.nodes);
    setEdges(d.edges);
    setSelectedNode(null);
    setSelectedEdge(null);
  }, [templateId]);

  useEffect(() => {
    onChange(toOBO(nodes, edges));
  }, [nodes, edges]);

  // 팔레트 → 캔버스 드롭
  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const raw = event.dataTransfer.getData('application/obo-node');
    if (!raw) return;
    const { color, label } = JSON.parse(raw);
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const newNode: Node = {
      id: `n_${Date.now()}`,
      type: 'stateNode',
      position,
      data: { label, color },
    };
    setNodes(ns => [...ns, newNode]);
    // 드롭 직후 라벨 편집 시작
    setSelectedNode(newNode);
    setNodeLabelInput(label);
    setSelectedEdge(null);
  }, [screenToFlowPosition, setNodes]);

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onConnect = useCallback((conn: Connection) => {
    setEdges(eds => addEdge({
      ...conn,
      id: `e_${Date.now()}`,
      type: 'labeled',
      label: '',
      markerEnd: { type: MarkerType.ArrowClosed },
    }, eds));
  }, [setEdges]);

  const deleteSelected = useCallback(() => {
    setNodes(ns => ns.filter(n => !n.selected));
    setEdges(es => es.filter(e => !e.selected));
    setSelectedNode(null);
    setSelectedEdge(null);
  }, [setNodes, setEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setNodeLabelInput((node.data as any).label ?? '');
    setSelectedEdge(null);
  }, []);

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge);
    setEdgeLabelInput((edge.label as string) ?? '');
    setSelectedNode(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  const applyNodeLabel = useCallback(() => {
    if (!selectedNode) return;
    setNodes(ns => ns.map(n =>
      n.id === selectedNode.id ? { ...n, data: { ...n.data, label: nodeLabelInput } } : n
    ));
  }, [selectedNode, nodeLabelInput, setNodes]);

  const applyNodeColor = useCallback((color: string) => {
    if (!selectedNode) return;
    setNodes(ns => ns.map(n =>
      n.id === selectedNode.id ? { ...n, data: { ...n.data, color } } : n
    ));
    setSelectedNode(prev => prev ? { ...prev, data: { ...prev.data, color } } : prev);
  }, [selectedNode, setNodes]);

  const applyEdgeLabel = useCallback(() => {
    if (!selectedEdge) return;
    setEdges(es => es.map(e =>
      e.id === selectedEdge.id ? { ...e, label: edgeLabelInput } : e
    ));
    setSelectedEdge(null);
  }, [selectedEdge, edgeLabelInput, setEdges]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

      {/* 툴바 */}
      <div className="h-10 border-b bg-white flex items-center gap-2 px-3 shrink-0">
        <Button
          variant="outline" size="sm"
          className="h-7 text-xs gap-1 text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={deleteSelected}
        >
          <Trash2 className="w-3 h-3" /> 선택 삭제
        </Button>
        <span className="text-[10px] text-slate-300 ml-auto">
          노드 {nodes.length} · 엣지 {edges.length}
        </span>
      </div>

      {/* 캔버스 + 팔레트 */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* React Flow 드롭존 */}
        <div style={{ flex: 1 }} onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            connectionMode={ConnectionMode.Loose}
            deleteKeyCode="Delete"
            fitView
            fitViewOptions={{ padding: 0.3 }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2e8f0" />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>

        {/* 노드 팔레트 */}
        <NodePalette />
      </div>

      {/* 하단 속성 편집 바 */}
      {(selectedNode || selectedEdge) && (
        <div className="h-10 border-t bg-slate-50 flex items-center gap-2 px-3 shrink-0">
          {selectedNode && (
            <>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">노드</span>
              <input
                autoFocus
                value={nodeLabelInput}
                onChange={e => setNodeLabelInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') applyNodeLabel(); }}
                onBlur={applyNodeLabel}
                className="w-24 h-6 text-xs border border-slate-200 rounded px-2 focus:outline-none focus:border-indigo-400 bg-white"
                placeholder="라벨"
              />
              <div className="flex gap-1 ml-1">
                {PALETTE_ITEMS.map(({ color: c }) => (
                  <button
                    key={c}
                    onClick={() => applyNodeColor(c)}
                    style={{
                      width: 16, height: 16, borderRadius: '50%',
                      background: c, flexShrink: 0,
                      outline: (selectedNode.data as any).color === c ? `2px solid ${c}` : '2px solid transparent',
                      outlineOffset: 2,
                    }}
                  />
                ))}
              </div>
            </>
          )}
          {selectedEdge && (
            <>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">엣지 라벨</span>
              <input
                autoFocus
                value={edgeLabelInput}
                onChange={e => setEdgeLabelInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') applyEdgeLabel();
                  if (e.key === 'Escape') setSelectedEdge(null);
                }}
                className="flex-1 h-6 text-xs border border-slate-200 rounded px-2 focus:outline-none focus:border-indigo-400 bg-white"
                placeholder="라벨 입력 후 Enter"
              />
              <Button size="sm" className="h-6 text-xs px-2" onClick={applyEdgeLabel}>확인</Button>
              <button className="text-xs text-slate-400 hover:text-slate-600" onClick={() => setSelectedEdge(null)}>
                취소
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── NodeEdgeEditor (ReactFlowProvider 래핑) ─────────────────────

interface NodeEdgeEditorProps {
  templateId: string;
  initialParams: object | null;
  onChange: (params: object) => void;
}

export function NodeEdgeEditor({ templateId, initialParams, onChange }: NodeEdgeEditorProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvas templateId={templateId} initialParams={initialParams} onChange={onChange} />
    </ReactFlowProvider>
  );
}
