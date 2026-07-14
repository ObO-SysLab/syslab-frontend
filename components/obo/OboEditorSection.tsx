'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNodesState, useEdgesState } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import { CheckCircle2, X } from 'lucide-react';
import { type OBOTemplate, type EdgeType } from './templates';
import type { Frame, OboBlob, OboMode, ProblemOboData } from './types';
import { TemplateSidebar } from './TemplateSidebar';
import { OBOEditorCanvas } from './OBOEditorCanvas';
import { PropertyPanel } from './panel/PropertyPanel';
import { OboPlayer } from './OboPlayer';
import { Button } from '@/components/ui/button';

export interface OboChoice { id: string; text: string; }

interface Props {
  value: ProblemOboData | null;
  onChange: (data: ProblemOboData) => void;
  choices?: OboChoice[];
}

const EMPTY_BLOB: OboBlob = { nodes: [], edges: [], frames: [] };

function serialize(nodes: Node[], edges: Edge[], frames: Frame[]): OboBlob {
  return {
    nodes: nodes.map(({ id, type, position, data }) => ({
      id, type, position, data: data as Record<string, unknown>,
    })),
    edges: edges.map(({ id, source, target, sourceHandle, targetHandle, data }) => ({
      id, source, target,
      sourceHandle: sourceHandle ?? null,
      targetHandle: targetHandle ?? null,
      data: (data ?? {}) as Record<string, unknown>,
    })),
    frames,
  };
}

export const OboEditorSection = React.memo(function OboEditorSection({
  value, onChange, choices = [],
}: Props) {
  const initMode: OboMode = value?.mode ?? 'single';
  const initChoiceId = choices[0]?.id ?? null;

  const getBlob = (m: OboMode, id: string | null): OboBlob => {
    if (m === 'single') return value?.single ?? EMPTY_BLOB;
    return id ? (value?.perChoice?.[id] ?? EMPTY_BLOB) : EMPTY_BLOB;
  };

  // ── 모드 / 보기 탭 ────────────────────────────────────
  const [mode, setMode] = useState<OboMode>(initMode);
  const [activeChoiceId, setActiveChoiceId] = useState<string | null>(initChoiceId);
  const perChoiceMapRef = useRef<Record<string, OboBlob>>(value?.perChoice ?? {});

  // ── React Flow 상태 ───────────────────────────────────
  const init = getBlob(initMode, initChoiceId);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(init.nodes as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(init.edges as Edge[]);
  const [frames, setFrames] = useState<Frame[]>(init.frames);

  // ── 에디터 UI 상태 ────────────────────────────────────
  const [selectedTemplate, setSelectedTemplate] = useState<OBOTemplate | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedKind, setSelectedKind] = useState<'node' | 'edge' | null>(null);
  const [activeEdgeType, setActiveEdgeType] = useState<EdgeType>('directed');
  const [jsonVisible, setJsonVisible] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'property' | 'frame'>('property');
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);

  // onChange ref — 부모 리렌더로 인한 effect 재실행 방지
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });

  // ── 변경 전파 ─────────────────────────────────────────
  useEffect(() => {
    const blob = serialize(nodes, edges, frames);
    if (mode === 'single') {
      onChangeRef.current({ mode: 'single', single: blob });
    } else if (activeChoiceId) {
      perChoiceMapRef.current = { ...perChoiceMapRef.current, [activeChoiceId]: blob };
      onChangeRef.current({ mode: 'per_choice', perChoice: { ...perChoiceMapRef.current } });
    }
  }, [nodes, edges, frames, mode, activeChoiceId]);

  // ── 모드 전환 ─────────────────────────────────────────
  const handleModeChange = useCallback((newMode: OboMode) => {
    if (newMode === mode) return;
    const hasContent = mode === 'single'
      ? nodes.length > 0
      : Object.values(perChoiceMapRef.current).some(b => b.nodes.length > 0);
    if (hasContent && !window.confirm('모드를 변경하면 현재 작성된 OBO 내용이 초기화됩니다. 계속할까요?')) return;

    perChoiceMapRef.current = {};
    setNodes([]);
    setEdges([]);
    setFrames([]);
    setSelectedId(null);
    setSelectedKind(null);
    setSelectedFrameId(null);
    setMode(newMode);
    setActiveChoiceId(newMode === 'per_choice' ? (choices[0]?.id ?? null) : null);
  }, [mode, nodes.length, choices, setNodes, setEdges]);

  // ── 보기 탭 전환 ──────────────────────────────────────
  const handleChoiceSelect = useCallback((choiceId: string) => {
    if (choiceId === activeChoiceId) return;
    const blob = perChoiceMapRef.current[choiceId] ?? EMPTY_BLOB;
    setNodes(blob.nodes as Node[]);
    setEdges(blob.edges as Edge[]);
    setFrames(blob.frames);
    setActiveChoiceId(choiceId);
    setSelectedId(null);
    setSelectedKind(null);
    setSelectedFrameId(null);
  }, [activeChoiceId, setNodes, setEdges]);

  // ── 템플릿 ────────────────────────────────────────────
  const handleTemplateSelect = useCallback((template: OBOTemplate) => {
    const hasContent = nodes.length > 0 || edges.length > 0;
    if (hasContent && !window.confirm(`현재 편집 내용을 초기화하고 "${template.name}" 프리셋을 불러올까요?`)) return;
    setSelectedTemplate(template);
    setNodes(template.defaultNodes);
    setEdges(template.defaultEdges);
    setSelectedId(null);
    setSelectedKind(null);
    setJsonVisible(false);
    setFrames([]);
    setSelectedFrameId(null);
  }, [nodes.length, edges.length, setNodes, setEdges]);

  // ── 속성 탭 ──────────────────────────────────────────
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

  // ── 프레임 탭 ─────────────────────────────────────────
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

  const handleFrameNodeClick = useCallback((nodeId: string) => {
    if (selectedFrameId) toggleHighlightNode(selectedFrameId, nodeId);
  }, [selectedFrameId, toggleHighlightNode]);

  const handleFrameEdgeClick = useCallback((edgeId: string) => {
    if (selectedFrameId) toggleHighlightEdge(selectedFrameId, edgeId);
  }, [selectedFrameId, toggleHighlightEdge]);

  const previewFrame = activeTab === 'frame' && selectedFrameId
    ? (frames.find(f => f.id === selectedFrameId) ?? null)
    : null;

  const panelMode = jsonVisible ? 'json' : (selectedId ? 'property' : 'palette');

  const previewBlob: OboBlob = mode === 'single'
    ? serialize(nodes, edges, frames)
    : (activeChoiceId ? (perChoiceMapRef.current[activeChoiceId] ?? EMPTY_BLOB) : EMPTY_BLOB);

  return (
    <div className="h-full flex flex-col">
      {/* 모드 선택 바 */}
      <div className="h-10 border-b flex items-center justify-between px-4 bg-slate-50 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 font-medium">시각화 방식</span>
          <div className="flex items-center bg-slate-200 rounded-lg p-0.5">
            <button
              onClick={() => handleModeChange('single')}
              className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${
                mode === 'single' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              단일
            </button>
            <button
              onClick={() => handleModeChange('per_choice')}
              className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${
                mode === 'per_choice' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              보기별
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)} disabled={previewBlob.nodes.length === 0}>
            미리보기
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            const next = !jsonVisible;
            setJsonVisible(next);
            if (next) setActiveTab('property');
          }}>
            {jsonVisible ? '닫기' : 'JSON 보기'}
          </Button>
        </div>
      </div>

      {/* 바디 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 보기 탭 패널 (per_choice 전용) */}
        {mode === 'per_choice' && (
          <div className="w-40 border-r bg-white flex flex-col shrink-0 overflow-hidden">
            <div className="px-3 py-2 border-b shrink-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">보기별 OBO</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {choices.length === 0 ? (
                <p className="text-[11px] text-slate-300 p-3">보기가 없습니다</p>
              ) : choices.map((c, i) => {
                const hasGraph = (perChoiceMapRef.current[c.id]?.nodes.length ?? 0) > 0;
                const isActive = activeChoiceId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => handleChoiceSelect(c.id)}
                    className={`w-full text-left px-3 py-2.5 flex items-center gap-1.5 text-xs border-b border-slate-50 transition-colors ${
                      isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`font-black shrink-0 ${isActive ? 'text-indigo-500' : 'text-slate-300'}`}>
                      {i + 1}.
                    </span>
                    <span className="flex-1 truncate">{c.text || '(빈 보기)'}</span>
                    {hasGraph && <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

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

      {/* 미리보기 모달 — z-[60]으로 전체화면 에디터 모달(z-50) 위에 표시 */}
      {previewOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="w-[780px] bg-white rounded-2xl overflow-hidden flex flex-col shadow-2xl"
            style={{ height: '85vh' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="h-12 border-b flex items-center justify-between px-5 shrink-0">
              <span className="font-bold text-slate-800">
                미리보기
                {mode === 'per_choice' && activeChoiceId && (
                  <span className="text-sm font-normal text-slate-400 ml-2">
                    — {choices.find(c => c.id === activeChoiceId)?.text || '선택된 보기'}
                  </span>
                )}
              </span>
              <button onClick={() => setPreviewOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <OboPlayer blob={previewBlob} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});