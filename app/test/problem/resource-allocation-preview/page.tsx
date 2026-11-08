'use client';
import { useState } from 'react';
import { OboPlayer } from '@/components/obo/OboPlayer';
import { createResourceAllocationExample } from '@/components/obo/resourceAllocationExample';

export default function ResourceAllocationPreview() {
  const [blob] = useState(createResourceAllocationExample);
  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 md:px-8 md:py-5">
    <div className="mx-auto max-w-[1200px] space-y-3">
      <header className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold text-indigo-600">OBO · 자원 할당 그래프</p>
        <h1 className="mt-1 text-2xl font-bold">서로 기다리면 왜 멈출까?</h1>
        <p className="mt-1 text-sm text-slate-600">자원을 요청하고 사용하는 순서를 따라, 기다림이 교착 상태가 되는 순간을 살펴보세요.</p></div><a className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-indigo-600" href="/test/problem/elements-preview?template=S3">이 그림 편집</a></header>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm" aria-label="그림 읽는 법">
        <span className="font-semibold text-slate-600">○ 프로세스 &nbsp; □ 자원</span>
        <span className="font-semibold text-amber-800">P ⇢ R &nbsp; 점선: 요청</span>
        <span className="font-semibold text-teal-700">R → P &nbsp; 실선: 할당</span>
      </div>
      <div className="h-[max(360px,calc(100dvh-260px))] max-h-[800px]" data-testid="resource-player"><OboPlayer blob={blob} /></div>
      <p className="text-xs leading-relaxed text-slate-500">이 예제는 R1·R2가 각각 하나이며, 기다리는 동안 가진 자원을 반납하거나 강제로 회수하지 않습니다. 자원이 여러 개라면 순환만으로 교착 상태를 단정할 수 없습니다.</p>
    </div>
  </main>;
}
