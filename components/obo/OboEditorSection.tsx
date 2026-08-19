'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNodesState, useEdgesState } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import { CheckCircle2, X, Undo2, Redo2 } from 'lucide-react';
import { useGraphHistory } from './lib/useGraphHistory';
import { type OBOTemplate, type EdgeType } from './templates';
import type { Frame, OboBlob, OboMode, ProblemOboData } from './types';
import { TemplateSidebar } from './TemplateSidebar';
import { OBOEditorCanvas } from './OBOEditorCanvas';
import { PropertyPanel } from './panel/PropertyPanel';
import { OboPlayer } from './OboPlayer';
import { Button } from '@/components/ui/button';
import { nextFrameId, nextNodeId } from './lib/id';
import { generateFramesFromTrace } from './lib/trace';
import { parseTraceText, stringifyTrace } from './lib/traceParser';
import { traceTokenFor, makeUniqueLabel, collectLabels } from './lib/label';
import { exampleStateValue } from './lib/overrideFields';
import type { GanttRow, PaintHint } from './lib/useGanttPaintDrag';

export interface OboChoice { id: string; text: string; }

interface Props {
  value: ProblemOboData | null;
  onChange: (data: ProblemOboData) => void;
  choices?: OboChoice[];
  allowCodingDiff?: boolean;
  testcaseOutputs?: { index: number; output: string }[];
}

const EMPTY_BLOB: OboBlob = { nodes: [], edges: [], frames: [] };

// 저장된 블롭의 엣지에는 type이 없다(serialize가 저장하지 않음) — React Flow edgeTypes 맵이
// 'obo-edge' 키로만 등록돼 있으므로 type 없이 그대로 넣으면 기본 엣지(라벨 미표시)로 렌더링된다.
// 캔버스에 올리기 전 항상 type을 강제해 OboPlayer(리뷰 화면)와 동일하게 렌더되도록 맞춘다.
function withEdgeType(edges: OboBlob['edges']): Edge[] {
  return edges.map(e => ({ ...e, type: 'obo-edge' as const })) as Edge[];
}

// 모드는 저작자가 고르지 않고 문제 유형에서 자동 결정된다. 상단 바에는 선택 대신 이 라벨을 표시만 한다.
const MODE_LABEL: Record<OboMode, string> = {
  single: '단일 다이어그램',
  per_choice: '보기별',
  coding_diff: '코딩 자동 채점',
};

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
  value, onChange, choices = [], allowCodingDiff = false, testcaseOutputs,
}: Props) {
  // 모드는 문제 유형이 결정한다(저작자 선택 없음): 코딩→coding_diff, 객관식(보기 있음)→per_choice.
  // 부모가 넘기는 기본값 mode:'single'이 유형 판정을 이기지 못하도록 코딩/객관식은 유형을 우선한다.
  // 유형이 특정되지 않는 경우(실습형 등)에만 저장된 mode를 존중하고, 없으면 single.
  const initMode: OboMode = allowCodingDiff
    ? 'coding_diff'
    : choices.length > 0
      ? 'per_choice'
      : value?.mode ?? 'single';
  const initChoiceId = choices[0]?.id ?? null;

  const getBlob = (m: OboMode, id: string | null): OboBlob => {
    if (m === 'single') return value?.single ?? EMPTY_BLOB;
    if (m === 'coding_diff') {
      const schema = value?.codingDiff;
      return schema ? { nodes: schema.nodes, edges: schema.edges, frames: [] } : EMPTY_BLOB;
    }
    return id ? (value?.perChoice?.[id] ?? EMPTY_BLOB) : EMPTY_BLOB;
  };

  // ── 모드 / 보기 탭 ────────────────────────────────────
  const [mode] = useState<OboMode>(initMode);
  const [activeChoiceId, setActiveChoiceId] = useState<string | null>(initChoiceId);
  const perChoiceMapRef = useRef<Record<string, OboBlob>>(value?.perChoice ?? {});
  // coding_diff 전용: frames를 손으로 안 만들고, 자유텍스트 트레이스로부터 자동 생성.
  // traceText가 유일한 source of truth — referenceTrace는 여기서 파생된다(아래 useMemo).
  const [traceText, setTraceText] = useState<string>(() =>
    value?.codingDiff ? stringifyTrace(value.codingDiff.referenceTrace, value.codingDiff.nodes as Node[]) : ''
  );

  // ── React Flow 상태 ───────────────────────────────────
  const init = getBlob(initMode, initChoiceId);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(init.nodes as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(withEdgeType(init.edges));
  const [frames, setFrames] = useState<Frame[]>(init.frames);
  const referenceTrace = useMemo(() => parseTraceText(traceText, nodes), [traceText, nodes]);

  // ── 되돌리기 / 다시하기 ────────────────────────────────
  const { undo, redo, canUndo, canRedo } = useGraphHistory({
    nodes, edges, frames, traceText, setNodes, setEdges, setFrames, setTraceText,
  });
  // Ctrl+Z = 되돌리기, Ctrl+Shift+Z = 다시하기. 입력 필드 포커스 시엔 무시.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key.toLowerCase() !== 'z') return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  // ── 에디터 UI 상태 ────────────────────────────────────
  const [selectedTemplate, setSelectedTemplate] = useState<OBOTemplate | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedKind, setSelectedKind] = useState<'node' | 'edge' | null>(null);
  const [activeEdgeType, setActiveEdgeType] = useState<EdgeType>('directed');
  const [jsonVisible, setJsonVisible] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'property' | 'frame'>('property');
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  // 템플릿을 선택할 때마다 증가 — 캔버스가 이 신호를 보고 새 템플릿을 화면 중앙으로 fitView 한다.
  const [fitSignal, setFitSignal] = useState(0);
  // perChoiceMapRef는 ref라 복사 시 리렌더가 안 되므로, 사이드바 갱신용 버전 카운터.
  const [, bumpChoiceMap] = useState(0);

  // onChange ref — 부모 리렌더로 인한 effect 재실행 방지
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });

  // ── 변경 전파 ─────────────────────────────────────────
  useEffect(() => {
    if (mode === 'single') {
      onChangeRef.current({ mode: 'single', single: serialize(nodes, edges, frames) });
    } else if (mode === 'coding_diff') {
      const blob = serialize(nodes, edges, []);
      onChangeRef.current({
        mode: 'coding_diff',
        codingDiff: { nodes: blob.nodes, edges: blob.edges, referenceTrace },
      });
    } else if (activeChoiceId) {
      const blob = serialize(nodes, edges, frames);
      perChoiceMapRef.current = { ...perChoiceMapRef.current, [activeChoiceId]: blob };
      onChangeRef.current({ mode: 'per_choice', perChoice: { ...perChoiceMapRef.current } });
    }
  }, [nodes, edges, frames, mode, activeChoiceId, referenceTrace]);

  // ── 보기 탭 전환 ──────────────────────────────────────
  const handleChoiceSelect = useCallback((choiceId: string) => {
    if (choiceId === activeChoiceId) return;
    const blob = perChoiceMapRef.current[choiceId] ?? EMPTY_BLOB;
    setNodes(blob.nodes as Node[]);
    setEdges(withEdgeType(blob.edges));
    setFrames(blob.frames);
    setActiveChoiceId(choiceId);
    setSelectedId(null);
    setSelectedKind(null);
    setSelectedFrameId(null);
  }, [activeChoiceId, setNodes, setEdges]);

  // 현재 보기의 다이어그램을 다른 보기로 통째 복사(깊은 복제). 대상에 내용 있으면 확인.
  const copyActiveChoiceTo = useCallback((targetId: string) => {
    if (mode !== 'per_choice' || !activeChoiceId || targetId === activeChoiceId) return;
    const targetHas = (perChoiceMapRef.current[targetId]?.nodes.length ?? 0) > 0;
    if (targetHas && !window.confirm('대상 보기에 이미 다이어그램이 있습니다. 덮어쓸까요?')) return;
    const clone = JSON.parse(JSON.stringify(serialize(nodes, edges, frames))) as OboBlob;
    perChoiceMapRef.current = { ...perChoiceMapRef.current, [targetId]: clone };
    onChangeRef.current({ mode: 'per_choice', perChoice: { ...perChoiceMapRef.current } });
    bumpChoiceMap(v => v + 1);
  }, [mode, activeChoiceId, nodes, edges, frames]);

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
    setFrames(template.defaultFrames ?? []);
    setSelectedFrameId(null);
    setFitSignal(s => s + 1); // 새 템플릿을 캔버스 중앙으로 다시 맞춤
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

  // 노드 삭제 — 연결 엣지·프레임 강조·오버라이드까지 정리
  const deleteNodeById = useCallback((id: string) => {
    setNodes(nds => nds.filter(n => n.id !== id));
    setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
    setFrames(fs => fs.map(f => {
      if (!f.nodeDataOverrides?.[id]) {
        return { ...f, highlightNodes: f.highlightNodes.filter(nid => nid !== id) };
      }
      const { [id]: _removed, ...restOverrides } = f.nodeDataOverrides;
      return {
        ...f,
        highlightNodes: f.highlightNodes.filter(nid => nid !== id),
        nodeDataOverrides: restOverrides,
      };
    }));
    setSelectedId(prev => prev === id ? null : prev);
    setSelectedKind(prev => (selectedId === id ? null : prev));
  }, [setNodes, setEdges, selectedId]);

  const deleteEdgeById = useCallback((id: string) => {
    setEdges(eds => eds.filter(e => e.id !== id));
    setFrames(fs => fs.map(f => ({ ...f, highlightEdges: f.highlightEdges.filter(eid => eid !== id) })));
    setSelectedId(prev => prev === id ? null : prev);
    setSelectedKind(prev => (selectedId === id ? null : prev));
  }, [setEdges, selectedId]);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    if (selectedKind === 'node') deleteNodeById(selectedId);
    else deleteEdgeById(selectedId);
  }, [selectedId, selectedKind, deleteNodeById, deleteEdgeById]);

  // 노드 복제 — 새 id, 살짝 어긋난 위치, 라벨은 유일화
  const duplicateNode = useCallback((id: string) => {
    setNodes(nds => {
      const src = nds.find(n => n.id === id);
      if (!src) return nds;
      const data = { ...(src.data as Record<string, unknown>) };
      if (typeof data.label === 'string') {
        data.label = makeUniqueLabel(data.label, collectLabels(nds));
      }
      return [...nds, {
        ...src,
        id: nextNodeId(nds),
        position: { x: src.position.x + 24, y: src.position.y + 24 },
        selected: false,
        data,
      }];
    });
  }, [setNodes]);

  // Ctrl+D = 선택 노드 복제. 입력 필드 포커스 시엔 무시.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'd') return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (selectedKind !== 'node' || !selectedId) return;
      e.preventDefault();
      duplicateNode(selectedId);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, selectedKind, duplicateNode]);

  // ── 프레임 탭 ─────────────────────────────────────────
  // 새 프레임은 직전 프레임이 오버라이드하던 노드 집합을 그대로 이어받는다(값은 안 베끼고
  // 빈 {}만) — state 필드는 applyFrame이 알아서 이전 값을 캐리포워드하므로, 패널에 그 노드가
  // 바로 보이기만 하면 편집 시작점이 "이전 프레임 내용이 유지된 채" 시작하는 것처럼 느껴진다.
  const addFrame = useCallback(() => {
    const id = nextFrameId(frames);
    const prevOverrideIds = Object.keys(frames[frames.length - 1]?.nodeDataOverrides ?? {});
    const nodeDataOverrides = prevOverrideIds.length
      ? Object.fromEntries(prevOverrideIds.map(nid => [nid, {}]))
      : undefined;
    setFrames(fs => [...fs, {
      id, label: '', highlightNodes: [], highlightEdges: [],
      ...(nodeDataOverrides ? { nodeDataOverrides } : {}),
    }]);
    setSelectedFrameId(id);
  }, [frames]);

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

  const addNodeOverride = useCallback((frameId: string, nodeId: string) => {
    setFrames(fs => fs.map(f => f.id !== frameId ? f : {
      ...f,
      nodeDataOverrides: { ...(f.nodeDataOverrides ?? {}), [nodeId]: f.nodeDataOverrides?.[nodeId] ?? {} },
    }));
  }, []);

  const removeNodeOverride = useCallback((frameId: string, nodeId: string) => {
    setFrames(fs => fs.map(f => {
      if (f.id !== frameId || !f.nodeDataOverrides) return f;
      const { [nodeId]: _removed, ...rest } = f.nodeDataOverrides;
      return { ...f, nodeDataOverrides: rest };
    }));
  }, []);

  const setOverrideField = useCallback((frameId: string, nodeId: string, field: string, value: unknown) => {
    setFrames(fs => fs.map(f => f.id !== frameId ? f : {
      ...f,
      nodeDataOverrides: {
        ...(f.nodeDataOverrides ?? {}),
        [nodeId]: { ...(f.nodeDataOverrides?.[nodeId] ?? {}), [field]: value },
      },
    }));
  }, []);

  const clearOverrideField = useCallback((frameId: string, nodeId: string, field: string) => {
    setFrames(fs => fs.map(f => {
      const existing = f.nodeDataOverrides?.[nodeId];
      if (f.id !== frameId || !existing) return f;
      const { [field]: _removed, ...restFields } = existing;
      return {
        ...f,
        nodeDataOverrides: { ...f.nodeDataOverrides, [nodeId]: restFields },
      };
    }));
  }, []);

  const updateFrameCursorTime = useCallback((frameId: string, cursorTime: number | undefined) => {
    setFrames(fs => fs.map(f => f.id !== frameId ? f : { ...f, cursorTime }));
  }, []);

  const handleFrameNodeClick = useCallback((nodeId: string) => {
    if (selectedFrameId) toggleHighlightNode(selectedFrameId, nodeId);
  }, [selectedFrameId, toggleHighlightNode]);

  const handleFrameEdgeClick = useCallback((edgeId: string) => {
    if (selectedFrameId) toggleHighlightEdge(selectedFrameId, edgeId);
  }, [selectedFrameId, toggleHighlightEdge]);

  // 코딩 채점 모드: 캔버스 노드를 클릭하면 트레이스 현재 줄 끝에 토큰(+예시값)을 붙인다.
  // 줄바꿈은 사용자가 직접 Enter — 인자 수가 가변이라 자동 줄바꿈은 넣지 않는다.
  const handleTraceNodeClick = useCallback((nodeId: string) => {
    const n = nodes.find(x => x.id === nodeId);
    if (!n) return;
    const token = traceTokenFor(n);
    const example = exampleStateValue(n);
    const insert = example ? `${token} ${example} ` : `${token} `;
    setTraceText(prev =>
      prev === '' || prev.endsWith('\n') || prev.endsWith(' ') ? prev + insert : `${prev} ${insert}`,
    );
  }, [nodes]);

  // 캔버스에 그려진 gantt-chart 노드를 직접 드래그로 칠했을 때 — 항상 "지금 고른 프레임"의
  // 오버라이드로 들어간다. 블록은 프레임이 진행되며 채워지는 것이지 기본 데이터가 아니므로,
  // 프레임을 고르지 않은 상태(속성 탭)에서는 애초에 캔버스가 칠하기를 안 받는다
  // (OboEditorSection이 onGanttChartPaint를 selectedFrameId가 있을 때만 내려줌).
  const handleGanttChartPaint = useCallback((nodeId: string, rowsNext: GanttRow[], hint: PaintHint | null) => {
    if (!selectedFrameId) return;
    addNodeOverride(selectedFrameId, nodeId);
    setOverrideField(selectedFrameId, nodeId, 'rows', rowsNext);
    if (hint) {
      setOverrideField(selectedFrameId, nodeId, 'activeRowIndex', hint.rowIndex);
      setOverrideField(selectedFrameId, nodeId, 'activeBlockIndex', hint.blockIndex);
    } else {
      clearOverrideField(selectedFrameId, nodeId, 'activeRowIndex');
      clearOverrideField(selectedFrameId, nodeId, 'activeBlockIndex');
    }
  }, [selectedFrameId, addNodeOverride, setOverrideField, clearOverrideField]);

  const previewFrame = activeTab === 'frame' && selectedFrameId
    ? (frames.find(f => f.id === selectedFrameId) ?? null)
    : null;

  const panelMode = jsonVisible ? 'json' : (selectedId ? 'property' : 'palette');

  const previewBlob: OboBlob = mode === 'per_choice'
    ? (activeChoiceId ? (perChoiceMapRef.current[activeChoiceId] ?? EMPTY_BLOB) : EMPTY_BLOB)
    : mode === 'coding_diff'
      ? (() => { const b = serialize(nodes, edges, []); return { ...b, frames: generateFramesFromTrace(referenceTrace, b.edges) }; })()
      : serialize(nodes, edges, frames);

  return (
    <div className="h-full flex flex-col">
      {/* 상단 바 — 모드는 문제 유형에서 자동 결정되므로 선택 UI 대신 현재 모드를 표시만 한다 */}
      <div className="h-10 border-b flex items-center justify-between px-4 bg-slate-50 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 font-medium">시각화 방식</span>
          <span className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-white shadow-sm text-slate-900 border border-slate-200">
            {MODE_LABEL[mode]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={undo} disabled={!canUndo} title="되돌리기 (Ctrl+Z)" className="px-2">
            <Undo2 className="w-3.5 h-3.5" />
          </Button>
          <Button variant="outline" size="sm" onClick={redo} disabled={!canRedo} title="다시하기 (Ctrl+Shift+Z)" className="px-2">
            <Redo2 className="w-3.5 h-3.5" />
          </Button>
          <div className="w-px h-5 bg-slate-200 mx-0.5" />
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

            {/* 현재 보기를 다른 보기로 복사 — 보기별 반복 작업 줄이기 */}
            {choices.length > 1 && (
              <div className="border-t p-2 shrink-0">
                <p className="text-[10px] text-slate-400 mb-1">현재 보기를 복사 →</p>
                {nodes.length === 0 ? (
                  <p className="text-[10px] text-slate-300 leading-snug">
                    현재 보기에 다이어그램을 먼저 그리면 다른 보기로 복사할 수 있어요.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {choices.map((c, i) => (c.id === activeChoiceId ? null : (
                      <button
                        key={c.id}
                        onClick={() => copyActiveChoiceTo(c.id)}
                        title={`${i + 1}번 보기로 복사`}
                        className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 hover:bg-indigo-100 text-slate-600 transition-colors"
                      >
                        {i + 1}번
                      </button>
                    )))}
                  </div>
                )}
              </div>
            )}
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
          fitSignal={fitSignal}
          activeTab={activeTab}
          frames={frames}
          previewFrame={previewFrame}
          onFrameNodeClick={handleFrameNodeClick}
          onFrameEdgeClick={handleFrameEdgeClick}
          traceMode={mode === 'coding_diff'}
          onTraceNodeClick={handleTraceNodeClick}
          onDuplicateNode={duplicateNode}
          onDeleteNode={deleteNodeById}
          onDeleteEdge={deleteEdgeById}
          onGanttChartPaint={activeTab === 'frame' && selectedFrameId ? handleGanttChartPaint : undefined}
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
          oboMode={mode}
          frames={frames}
          selectedFrameId={selectedFrameId}
          onSelectFrame={setSelectedFrameId}
          onAddFrame={addFrame}
          onRemoveFrame={removeFrame}
          onUpdateFrameLabel={updateFrameLabel}
          onRemoveHighlightNode={removeHighlightNode}
          onRemoveHighlightEdge={removeHighlightEdge}
          onAddNodeOverride={addNodeOverride}
          onRemoveNodeOverride={removeNodeOverride}
          onSetOverrideField={setOverrideField}
          onClearOverrideField={clearOverrideField}
          onUpdateFrameCursorTime={updateFrameCursorTime}
          traceText={traceText}
          onTraceTextChange={setTraceText}
          testcaseOutputs={testcaseOutputs}
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