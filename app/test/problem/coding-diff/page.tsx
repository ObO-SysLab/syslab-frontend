'use client';

import { useState } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { OBO_TEMPLATES } from '@/components/obo/templates';
import type { OboCodingSchema } from '@/components/obo/types';
import { parseTraceText } from '@/components/obo/lib/traceParser';
import { CodingDiffPlayer } from '@/components/obo/CodingDiffPlayer';
import { Button } from '@/components/ui/button';

function toBlobNodes(nodes: Node[]) {
  return nodes.map(({ id, type, position, data }) => ({ id, type, position, data: data as Record<string, unknown> }));
}
function toBlobEdges(edges: Edge[]) {
  return edges.map(({ id, source, target, sourceHandle, targetHandle, data }) => ({
    id, source, target, sourceHandle: sourceHandle ?? null, targetHandle: targetHandle ?? null,
    data: (data ?? {}) as Record<string, unknown>,
  }));
}

// ── 값 기반: S1 페이지 교체(FIFO). slot-grid 노드 id 'frames'의 slots 값이 스텝마다 바뀐다 ──
const S1 = OBO_TEMPLATES.find(t => t.id === 'S1')!;
const fifoNodes = toBlobNodes(S1.defaultNodes);
const fifoEdges = toBlobEdges(S1.defaultEdges);

const FIFO_REFERENCE_TEXT = [
  'frames [7,null,null]',
  'frames [7,0,null]',
  'frames [7,0,1]',
  'frames [2,0,1]',
  'frames [2,0,1]',
  'frames [2,3,1]',
  'frames [2,3,0]',
  'frames [4,3,0]',
].join('\n');

const fifoSchema: OboCodingSchema = {
  nodes: fifoNodes,
  edges: fifoEdges,
  referenceTrace: parseTraceText(FIFO_REFERENCE_TEXT, S1.defaultNodes),
};

const fifoScenarios = {
  all_correct: { label: '전부 정답', text: FIFO_REFERENCE_TEXT },
  middle_wrong: {
    label: '중간 오답 (스텝5)',
    text: FIFO_REFERENCE_TEXT.split('\n').map((l, i) => (i === 4 ? 'frames [2,9,1]' : l)).join('\n'),
  },
  first_wrong: {
    label: '첫 스텝부터 오답',
    text: FIFO_REFERENCE_TEXT.split('\n').map((l, i) => (i === 0 ? 'frames [1,null,null]' : l)).join('\n'),
  },
};

// ── 강조 기반: ST2 프로세스 상태 전이. New → Ready → Running → Terminated ──
const ST2 = OBO_TEMPLATES.find(t => t.id === 'ST2')!;
const st2Nodes = toBlobNodes(ST2.defaultNodes);
const st2Edges = toBlobEdges(ST2.defaultEdges);

const ST2_REFERENCE_TEXT = ['new ready', 'ready running', 'running terminated'].join('\n');

const st2Schema: OboCodingSchema = {
  nodes: st2Nodes,
  edges: st2Edges,
  referenceTrace: parseTraceText(ST2_REFERENCE_TEXT, ST2.defaultNodes),
};

const st2Scenarios = {
  all_correct: { label: '전부 정답', text: ST2_REFERENCE_TEXT },
  middle_wrong: {
    label: '중간 오답 (2번째 줄, running 대신 waiting)',
    text: ['new ready', 'ready waiting', 'running terminated'].join('\n'),
  },
  first_wrong: {
    label: '첫 줄부터 오답 (ready 대신 waiting)',
    text: ['new waiting', 'ready running', 'running terminated'].join('\n'),
  },
};

type DemoKey = 'fifo' | 'st2';
type ScenarioKey = keyof typeof fifoScenarios;

export default function CodingDiffTestPage() {
  const [demo, setDemo] = useState<DemoKey>('fifo');
  const [scenario, setScenario] = useState<ScenarioKey>('all_correct');
  const [attempt, setAttempt] = useState(0);

  const schema = demo === 'fifo' ? fifoSchema : st2Schema;
  const scenarios = demo === 'fifo' ? fifoScenarios : st2Scenarios;
  const rawNodes = demo === 'fifo' ? S1.defaultNodes : ST2.defaultNodes;
  const submittedTrace = parseTraceText(scenarios[scenario].text, rawNodes);

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      <header className="border-b px-6 py-4 space-y-3 shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-900">coding_diff 검증 페이지 (자유텍스트 트레이스)</span>
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => { setDemo('fifo'); setScenario('all_correct'); setAttempt(a => a + 1); }}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${demo === 'fifo' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
            >
              값 기반 (FIFO)
            </button>
            <button
              onClick={() => { setDemo('st2'); setScenario('all_correct'); setAttempt(a => a + 1); }}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${demo === 'st2' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
            >
              강조 기반 (상태 전이)
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(Object.keys(scenarios) as ScenarioKey[]).map(key => (
            <Button
              key={key}
              size="sm"
              variant={scenario === key ? 'default' : 'outline'}
              onClick={() => { setScenario(key); setAttempt(a => a + 1); }}
            >
              {scenarios[key].label}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => setAttempt(a => a + 1)}>
            재도전 (같은 시나리오로 재마운트)
          </Button>
        </div>
      </header>

      <div className="flex-1 min-h-0 p-4">
        <CodingDiffPlayer
          schema={schema}
          submittedTrace={submittedTrace}
          resubmitKey={`${demo}-${scenario}-${attempt}`}
        />
      </div>
    </div>
  );
}
