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
import { duplicateFrame, moveFrame } from './lib/frameEdits';
import { generateFramesFromTrace } from './lib/trace';
import { parseTraceText, stringifyTrace } from './lib/traceParser';
import { traceTokenFor, makeUniqueLabel, collectLabels } from './lib/label';
import { exampleStateValue } from './lib/overrideFields';
import { SimulationEditor } from './simulation/SimulationEditor';
import {parseDiagramTrace} from './runtime/freeDiagram.mjs';
import { createDocument } from './runtime/document.mjs';
import { resizeSlotFrames } from './slots/model';
import { pruneFrameReferences } from './authoring/model';
import { OBO_TOPICS, ruleModelName, freeTemplateName } from './topicMap';

export interface OboChoice { id: string; text: string; }

interface Props {
  alternatives?: {legacy?:ProblemOboData;simulation?:ProblemOboData};
  onAlternativesChange?: (value:{legacy?:ProblemOboData;simulation?:ProblemOboData})=>void;
  value: ProblemOboData | null;
  onChange: (data: ProblemOboData) => void;
  choices?: OboChoice[];
  allowCodingDiff?: boolean;
  testcaseOutputs?: { index: number; output: string }[];
}

const EMPTY_BLOB: OboBlob = { nodes: [], edges: [], frames: [] };

// 모드는 저작자가 고르지 않고 문제 유형에서 자동 결정된다. 상단 바에는 선택 대신 이 라벨을 표시만 한다.
const MODE_LABEL: Record<OboMode, string> = {
  single: '그림 하나',
  per_choice: '보기별 그림',
  coding_diff: '학생 출력 재생',
  simulation: '규칙 기반 시뮬레이션',
};

export const OboEditorSection = React.memo(function OboEditorSection(props: Props) {
  const legacy = useRef<ProblemOboData | null>(props.value?.mode === 'simulation' ? props.alternatives?.legacy??null : props.value);
  const simulation = useRef<ProblemOboData | null>(props.value?.mode === 'simulation' ? props.value : props.alternatives?.simulation??null);
  const modern = props.value?.mode === 'simulation';
  const update = (next: ProblemOboData) => {
    if (next.mode === 'simulation') simulation.current = next; else legacy.current = next;
    props.onAlternativesChange?.({...(legacy.current?{legacy:legacy.current}:{}),...(simulation.current?{simulation:simulation.current}:{})});
    props.onChange(next);
  };
  const [topicId, setTopicId] = useState('');
  const topic = OBO_TOPICS.find(t => t.id === topicId) ?? null;
  const coding = !!props.allowCodingDiff;
  const choose = (rule: boolean) => rule
    ? update(simulation.current ?? {schemaVersion: 2, mode: 'simulation', simulation: createDocument()})
    : update(legacy.current ?? {mode: 'single', single: EMPTY_BLOB});
  const card = (rule: boolean, title: string, body: string) => {
    const active = rule === modern;
    return <button type="button" aria-pressed={active} onClick={() => choose(rule)}
      className={`min-w-0 rounded-xl border px-3 py-2 text-left transition-colors ${active ? 'border-indigo-500 bg-white ring-1 ring-indigo-500' : 'border-slate-200 bg-white/60 hover:border-slate-300 hover:bg-white'}`}>
      <span className={`block text-sm font-semibold ${active ? 'text-indigo-700' : 'text-slate-800'}`}>{title}</span>
      <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{body}</span>
    </button>;
  };
  return <div className="flex h-full min-h-0 flex-col">
    <div className="shrink-0 space-y-2 border-b bg-slate-50 px-4 py-2" aria-label="만드는 방식">
      <div className="grid gap-2 md:grid-cols-[1fr_1fr_minmax(200px,0.8fr)]">
        {card(true, '규칙 기반 시뮬레이션', coding ? '입력만 정하면 엔진이 과정을 계산해 그립니다. 학생 코드의 결과를 엔진 정답과 비교해 채점할 수 있어요.' : '입력만 정하면 엔진이 과정을 계산해 그립니다. 값을 바꿔도 그림이 자동으로 맞춰져요.')}
        {card(false, '자유 그림', coding ? '요소를 직접 놓고 장면을 만듭니다. 학생 출력(한 줄에 한 장면)을 같은 그림으로 재생해요.' : '요소를 직접 놓고 장면을 만듭니다. 설명에 맞춰 그림을 마음대로 꾸밀 수 있어요.')}
        <label className="block text-xs text-slate-600">주제로 추천 받기
          <select aria-label="주제로 추천 받기" value={topicId} onChange={e => setTopicId(e.target.value)} className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm">
            <option value="">주제를 고르세요</option>
            {OBO_TOPICS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
      </div>
      {topic && <p role="status" className="rounded-lg bg-white px-3 py-2 text-xs leading-relaxed text-slate-600">
        <b className="text-slate-800">{topic.name}</b> · 계산과 {coding ? '의미 채점' : '자동 재생'}이 필요하면 <b>규칙 기반</b>의 {topic.rule.map(ruleModelName).map(n => `‘${n}’`).join(', ')} 모델을 고르세요.{' '}
        {topic.free.length ? <>설명용 그림을 직접 꾸미려면 <b>자유 그림</b>의 {topic.free.map(freeTemplateName).map(n => `‘${n}’`).join(', ')} 템플릿에서 시작하세요.</> : <>이 주제는 자유 그림 시작 템플릿이 없어 빈 그림에서 만들어야 합니다.</>}
      </p>}
      <p className="text-xs text-slate-500">두 방식은 서로 독립적입니다. {props.onAlternativesChange?'두 구성은 작성 초안에 함께 보관됩니다.':'전환한 구성은 이 창을 닫기 전까지 보관됩니다.'}</p>
    </div>
    {modern && props.value?.simulation ? <div className="min-h-0 flex-1 overflow-auto bg-slate-50 p-4">
      <SimulationEditor value={props.value.simulation} onChange={document => update({schemaVersion: 2, mode: 'simulation', simulation: document})} choices={props.choices} allowCoding={props.allowCodingDiff}/>
    </div> : <div className="min-h-0 flex-1"><LegacyOboEditorSection {...props} onChange={update}/></div>}
  </div>;
});

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

export const LegacyOboEditorSection = React.memo(function LegacyOboEditorSection({
  value, onChange, choices = [], allowCodingDiff = false, testcaseOutputs,
}: Props) {
  // 모드는 문제 유형이 결정한다(저작자 선택 없음): 코딩→coding_diff, 객관식(보기 있음)→per_choice.
  // 부모가 넘기는 기본값 mode:'single'이 유형 판정을 이기지 못하도록 코딩/객관식은 유형을 우선한다.
  // 유형이 특정되지 않는 경우(실습형 등)에만 저장된 mode를 존중하고, 없으면 single.
  const initMode: OboMode = value?.mode==='single'&&!!value.single?.nodes.length ? 'single' : allowCodingDiff
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
    value?.codingDiff ? value.codingDiff.sourceTraceText??stringifyTrace(value.codingDiff.referenceTrace, value.codingDiff.nodes as Node[]) : ''
  );

  // ── React Flow 상태 ───────────────────────────────────
  const init = getBlob(initMode, initChoiceId);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(init.nodes as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(init.edges as Edge[]);
  const [frames, setFrames] = useState<Frame[]>(init.frames);
  const referenceTrace = useMemo(() => parseDiagramTrace(traceText, nodes,edges).trace, [traceText, nodes,edges]);

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
        codingDiff: { nodes: blob.nodes, edges: blob.edges, referenceTrace,sourceTraceText:traceText },
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
    setEdges(blob.edges as Edge[]);
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
    if (typeof patch.slotCount === 'number') setFrames(fs => resizeSlotFrames(fs, id, patch.slotCount as number));
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n));
  }, [setNodes]);

  const updateEdgeData = useCallback((id: string, patch: object) => {
    setEdges(eds => eds.map(e => e.id === id ? { ...e, data: { ...(e.data ?? {}), ...patch } } : e));
  }, [setEdges]);

  // 노드 삭제 — 연결 엣지·프레임 강조·오버라이드까지 정리
  const deleteNodeById = useCallback((id: string) => {
    setNodes(nds => nds.filter(n => n.id !== id));
    setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
    setFrames(fs => pruneFrameReferences(fs, [id], edges.filter(e => e.source === id || e.target === id).map(e => e.id)));
    setSelectedId(prev => prev === id ? null : prev);
    setSelectedKind(prev => (selectedId === id ? null : prev));
  }, [setNodes, setEdges, selectedId, edges]);

  const deleteEdgeById = useCallback((id: string) => {
    setEdges(eds => eds.filter(e => e.id !== id));
    setFrames(fs => pruneFrameReferences(fs, [], [id]));
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
      const data = JSON.parse(JSON.stringify(src.data)) as Record<string, unknown>;
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
  const addFrame = useCallback(() => {
    const id = nextFrameId(frames);
    setFrames(fs => [...fs, { id, label: '', highlightNodes: [], highlightEdges: [] }]);
    setSelectedFrameId(id);
  }, [frames]);

  const removeFrame = useCallback((id: string) => {
    setFrames(fs => fs.filter(f => f.id !== id));
    setSelectedFrameId(prev => prev === id ? null : prev);
  }, []);

  const handleDuplicateFrame = useCallback((id: string) => {
    const index = frames.findIndex(frame => frame.id === id);
    if (index < 0) return;
    const next = duplicateFrame(frames, id);
    setFrames(next);
    setSelectedFrameId(next[index + 1].id);
  }, [frames]);

  const handleMoveFrame = useCallback((id: string, direction: -1 | 1) => {
    setFrames(current => moveFrame(current, id, direction));
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
          <span className="text-[11px] text-slate-400 font-medium">보기 방식</span>
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
          <Button variant="ghost" size="sm" className="text-slate-500" title="고급: 저장되는 자료를 JSON으로 봅니다" onClick={() => {
            const next = !jsonVisible;
            setJsonVisible(next);
            if (next) setActiveTab('property');
          }}>
            {jsonVisible ? '자료 닫기' : '고급 · 자료 보기'}
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

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
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
          setFrames={setFrames}
          onFrameNodeClick={handleFrameNodeClick}
          onFrameEdgeClick={handleFrameEdgeClick}
          traceMode={mode === 'coding_diff'}
          onTraceNodeClick={handleTraceNodeClick}
          onDuplicateNode={duplicateNode}
          onDeleteNode={deleteNodeById}
          onDeleteEdge={deleteEdgeById}
        />
        {/* Every manually authored scene (not the coding output comparison) can write its lower caption here (2026-11-08). */}
        {mode!=='coding_diff'&&<section aria-label="장면 설명 작성" className="shrink-0 border-t bg-white px-4 py-3">
          <div className="mb-2 flex items-center gap-3">
            <label className="text-sm font-semibold text-slate-700">장면
              <select aria-label="설명할 장면" className="ml-2 max-w-48 rounded border px-2 py-1 text-sm" value={selectedFrameId??''} onChange={e=>{setSelectedFrameId(e.target.value||null);setActiveTab('frame');}}>
                <option value="">선택하세요</option>{frames.map((f,i)=><option key={f.id} value={f.id}>{i+1}번 장면</option>)}
              </select>
            </label>
            <button type="button" className="text-sm text-teal-700" onClick={()=>{addFrame();setActiveTab('frame');}}>+ 장면 추가</button>
          </div>
          {selectedFrameId&&frames.some(f=>f.id===selectedFrameId)?<textarea aria-label="장면 하단 설명" rows={2} value={frames.find(f=>f.id===selectedFrameId)?.label??''} onChange={e=>updateFrameLabel(selectedFrameId,e.target.value)} className="w-full resize-y rounded-lg border border-slate-200 p-2 text-sm leading-relaxed" placeholder="이 장면에서 전달할 내용을 적으세요."/>:<p className="text-sm text-slate-400">장면을 선택하면 그림 아래에 설명을 작성할 수 있습니다.</p>}
        </section>}
        </div>

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
          onDuplicateFrame={handleDuplicateFrame}
          onMoveFrame={handleMoveFrame}
          onRemoveFrame={removeFrame}
          onUpdateFrameLabel={updateFrameLabel}
          onRemoveHighlightNode={removeHighlightNode}
          onRemoveHighlightEdge={removeHighlightEdge}
          onAddNodeOverride={addNodeOverride}
          onRemoveNodeOverride={removeNodeOverride}
          onSetOverrideField={setOverrideField}
          onClearOverrideField={clearOverrideField}
          onUpdateFrameCursorTime={updateFrameCursorTime}
          onUpdateFrameVisibleEdges={(id, visibleEdges) => setFrames(fs => fs.map(f => f.id === id ? { ...f, visibleEdges } : f))}
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
