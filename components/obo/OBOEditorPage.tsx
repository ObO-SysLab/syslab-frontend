'use client';

import { useState, useCallback } from 'react';
import { useNodesState, useEdgesState } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import { type OBOTemplate, type EdgeType } from './templates';
import type { Frame } from './types';
import { TemplateSidebar } from './TemplateSidebar';
import { OBOEditorCanvas } from './OBOEditorCanvas';
import { PropertyPanel } from './panel/PropertyPanel';
import { OboPlayer } from './OboPlayer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export function OBOEditorPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<OBOTemplate | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // 속성 탭 상태
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedKind, setSelectedKind] = useState<'node' | 'edge' | null>(null);
  const [activeEdgeType, setActiveEdgeType] = useState<EdgeType>('directed');
  const [jsonVisible, setJsonVisible] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // 프레임 탭 상태
  const [activeTab, setActiveTab] = useState<'property' | 'frame'>('property');
  const [frames, setFrames] = useState<Frame[]>([]);
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);

  // ── 템플릿 ──────────────────────────────────────────────
  const handleTemplateSelect = useCallback((template: OBOTemplate) => {
    const hasContent = nodes.length > 0 || edges.length > 0;
    if (hasContent) {
      const ok = window.confirm(
        `현재 편집 내용을 초기화하고 "${template.name}" 프리셋을 불러올까요?`
      );
      if (!ok) return;
    }
    setSelectedTemplate(template);
    setNodes(template.defaultNodes);
    setEdges(template.defaultEdges);
    setSelectedId(null);
    setSelectedKind(null);
    setJsonVisible(false);
    setFrames([]);
    setSelectedFrameId(null);
  }, [nodes.length, edges.length, setNodes, setEdges]);

  // ── 속성 탭 콜백 ────────────────────────────────────────
  const handleSelect = useCallback((id: string | null, kind: 'node' | 'edge' | null) => {
    setSelectedId(id);
    setSelectedKind(kind);
    if (id) setJsonVisible(false);
  }, []);

  const updateNodeData = useCallback((id: string, patch: Record<string, unknown>) => {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n));
  }, [setNodes]);

  const updateEdgeData = useCallback((id: string, patch: object) => {
    setEdges(eds => eds.map(e => e.id === id ? { ...e, data: { ...(e.data ?? {}), ...patch } } : e));
  }, [setEdges]);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    if (selectedKind === 'node') {
      setNodes(nds => nds.filter(n => n.id !== selectedId));
      setEdges(eds => eds.filter(e => e.source !== selectedId && e.target !== selectedId));
      setFrames(fs => fs.map(f => ({ ...f, highlightNodes: f.highlightNodes.filter(id => id !== selectedId) })));
    } else {
      setEdges(eds => eds.filter(e => e.id !== selectedId));
      setFrames(fs => fs.map(f => ({ ...f, highlightEdges: f.highlightEdges.filter(id => id !== selectedId) })));
    }
    setSelectedId(null);
    setSelectedKind(null);
  }, [selectedId, selectedKind, setNodes, setEdges]);

  // ── 프레임 탭 콜백 ──────────────────────────────────────
  const addFrame = useCallback(() => {
    const id = `f_${Date.now()}`;
    setFrames(fs => [...fs, { id, label: '', highlightNodes: [], highlightEdges: [] }]);
    setSelectedFrameId(id);
  }, []);

  const removeFrame = useCallback((id: string) => {
    setFrames(fs => fs.filter(f => f.id !== id));
    setSelectedFrameId(prev => prev === id ? null : prev);
  }, []);

  const updateFrameLabel = useCallback((id: string, label: string) => {
    setFrames(fs => fs.map(f => f.id === id ? { ...f, label } : f));
  }, []);

  const toggleHighlightNode = useCallback((frameId: string, nodeId: string) => {
    setFrames(fs => fs.map(f => f.id !== frameId ? f : {
      ...f,
      highlightNodes: f.highlightNodes.includes(nodeId)
        ? f.highlightNodes.filter(id => id !== nodeId)
        : [...f.highlightNodes, nodeId],
    }));
  }, []);

  const toggleHighlightEdge = useCallback((frameId: string, edgeId: string) => {
    setFrames(fs => fs.map(f => f.id !== frameId ? f : {
      ...f,
      highlightEdges: f.highlightEdges.includes(edgeId)
        ? f.highlightEdges.filter(id => id !== edgeId)
        : [...f.highlightEdges, edgeId],
    }));
  }, []);

  const removeHighlightNode = useCallback((frameId: string, nodeId: string) => {
    setFrames(fs => fs.map(f => f.id !== frameId ? f : {
      ...f, highlightNodes: f.highlightNodes.filter(id => id !== nodeId),
    }));
  }, []);

  const removeHighlightEdge = useCallback((frameId: string, edgeId: string) => {
    setFrames(fs => fs.map(f => f.id !== frameId ? f : {
      ...f, highlightEdges: f.highlightEdges.filter(id => id !== edgeId),
    }));
  }, []);

  // 캔버스 클릭 → 프레임 탭에서 하이라이트 토글
  const handleFrameNodeClick = useCallback((nodeId: string) => {
    if (selectedFrameId) toggleHighlightNode(selectedFrameId, nodeId);
  }, [selectedFrameId, toggleHighlightNode]);

  const handleFrameEdgeClick = useCallback((edgeId: string) => {
    if (selectedFrameId) toggleHighlightEdge(selectedFrameId, edgeId);
  }, [selectedFrameId, toggleHighlightEdge]);

  // 프레임 탭 선택 시 캔버스 미리보기용 frame
  const previewFrame = activeTab === 'frame' && selectedFrameId
    ? (frames.find(f => f.id === selectedFrameId) ?? null)
    : null;

  // ── 저장 ────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    const blob = {
      nodes: nodes.map(({ id, type, position, data }) => ({ id, type, position, data })),
      edges: edges.map(({ id, source, target, sourceHandle, targetHandle, data }) => ({
        id, source, target, sourceHandle, targetHandle, data,
      })),
      frames,
    };
    console.warn('[OBO 저장 테스트] problemId=??  blob=', blob);
    window.alert(
      `[테스트] 노드 ${blob.nodes.length}개 · 엣지 ${blob.edges.length}개 · 프레임 ${blob.frames.length}개\n\n` +
      `실제 저장 시 → PATCH /api/problems/:id\n` +
      `body: { obo_json: <blob> }\n\n` +
      JSON.stringify(blob, null, 2).slice(0, 400) + '…'
    );
  }, [nodes, edges, frames]);

  const panelMode = jsonVisible ? 'json' : (selectedId ? 'property' : 'palette');

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">

      {/* 헤더 */}
      <header className="h-14 border-b flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-900">OBO Editor</span>
          <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">테스트</Badge>
          {selectedTemplate && (
            <>
              <Badge variant="outline">{selectedTemplate.id}</Badge>
              <span className="text-sm text-slate-500">{selectedTemplate.name}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)} disabled={nodes.length === 0}>
            미리보기
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            const next = !jsonVisible;
            setJsonVisible(next);
            if (next) setActiveTab('property');
          }}>
            {jsonVisible ? '닫기' : 'JSON 보기'}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={nodes.length === 0}>
            저장
          </Button>
        </div>
      </header>

      {/* 바디 */}
      <div className="flex flex-1 overflow-hidden">
        <TemplateSidebar
          selectedTemplateId={selectedTemplate?.id ?? null}
          onSelect={handleTemplateSelect}
        />

        <OBOEditorCanvas
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          setNodes={setNodes}
          setEdges={setEdges}
          activeEdgeType={activeEdgeType}
          onSelect={handleSelect}
          activeTab={activeTab}
          previewFrame={previewFrame}
          onFrameNodeClick={handleFrameNodeClick}
          onFrameEdgeClick={handleFrameEdgeClick}
        />

        <PropertyPanel
          activeTab={activeTab}
          onTabChange={setActiveTab}
          mode={panelMode}
          selectedId={selectedId}
          selectedKind={selectedKind}
          nodes={nodes}
          edges={edges}
          updateNodeData={updateNodeData}
          updateEdgeData={updateEdgeData}
          activeEdgeType={activeEdgeType}
          onEdgeTypeChange={setActiveEdgeType}
          currentNodes={nodes}
          currentEdges={edges}
          onJsonClose={() => setJsonVisible(false)}
          onDelete={deleteSelected}
          frames={frames}
          selectedFrameId={selectedFrameId}
          onSelectFrame={setSelectedFrameId}
          onAddFrame={addFrame}
          onRemoveFrame={removeFrame}
          onUpdateFrameLabel={updateFrameLabel}
          onRemoveHighlightNode={removeHighlightNode}
          onRemoveHighlightEdge={removeHighlightEdge}
        />
      </div>

      {previewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="w-[780px] bg-white rounded-2xl overflow-hidden flex flex-col shadow-2xl"
            style={{ height: '85vh' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="h-12 border-b flex items-center justify-between px-5 shrink-0">
              <span className="font-bold text-slate-800">미리보기</span>
              <button onClick={() => setPreviewOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <OboPlayer blob={{
                nodes: nodes.map(({ id, type, position, data }) => ({ id, type, position, data })),
                edges: edges.map(({ id, source, target, sourceHandle, targetHandle, data }) => ({ id, source, target, sourceHandle, targetHandle, data })),
                frames,
              }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
