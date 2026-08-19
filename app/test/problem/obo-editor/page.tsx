'use client';

import { useState } from 'react';
import { OboEditorSection, type OboChoice } from '@/components/obo/OboEditorSection';
import type { ProblemOboData } from '@/components/obo/types';
import { Badge } from '@/components/ui/badge';

// 실제 문제 생성 페이지(app/challenges/create)와 동일한 규칙: 보기 id는 choice_{index}.
const MOCK_CHOICES: OboChoice[] = [
  { id: 'choice_0', text: '보기 1' },
  { id: 'choice_1', text: '보기 2' },
  { id: 'choice_2', text: '보기 3' },
  { id: 'choice_3', text: '보기 4' },
];

// 코딩형 트레이스 패널의 "테스트케이스에서 불러오기" 버튼을 테스트할 수 있도록 더미 출력.
const MOCK_TESTCASE_OUTPUTS = [
  { index: 0, output: 'new ready\nready running' },
  { index: 1, output: 'new ready\nready running\nrunning terminated' },
];

type ProblemKind = 'objective' | 'coding';

export default function OBOEditorTestPage() {
  const [kind, setKind] = useState<ProblemKind>('objective');
  // kind가 바뀌면 OboEditorSection을 통째로 리마운트 — mode는 마운트 시 한 번만 정해지므로
  // (문제 유형이 mode를 자동 결정) prop만 바꿔서는 반영되지 않는다.
  const [attempt, setAttempt] = useState(0);
  const [oboData, setOboData] = useState<ProblemOboData | null>(null);

  const switchKind = (next: ProblemKind) => {
    if (next === kind) return;
    setKind(next);
    setOboData(null);
    setAttempt(a => a + 1);
  };

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      <header className="h-14 border-b flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-900">OBO Editor</span>
          <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">테스트</Badge>
        </div>
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => switchKind('objective')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
              kind === 'objective' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            객관식 (보기 4개)
          </button>
          <button
            onClick={() => switchKind('coding')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
              kind === 'coding' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            코딩형 (자동 채점)
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0">
        <OboEditorSection
          key={`${kind}-${attempt}`}
          value={oboData}
          onChange={setOboData}
          choices={kind === 'objective' ? MOCK_CHOICES : undefined}
          allowCodingDiff={kind === 'coding'}
          testcaseOutputs={kind === 'coding' ? MOCK_TESTCASE_OUTPUTS : undefined}
        />
      </div>
    </div>
  );
}
