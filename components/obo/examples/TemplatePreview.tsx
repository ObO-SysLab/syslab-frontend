'use client';
import { useState } from 'react';
import { OboPlayer } from '../OboPlayer';
import { REMAINING_EXAMPLES, exampleBlob } from './remaining';
export function TemplatePreview({ slug }: { slug: string }) {
  const example = REMAINING_EXAMPLES.find(e => e.slug === slug)!;
  const [blob] = useState(() => exampleBlob(example));
  // Reserve two lines even when a short scene only occupies one, keeping the graph steady.
  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 md:px-8 md:py-5"><div className="mx-auto max-w-[1280px] space-y-3">
    <header className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold text-indigo-600">OBO · {example.template.name}</p>
      <h1 className="mt-1 text-2xl font-bold">{example.title}</h1><p className="mt-1 text-sm text-slate-600">{example.subtitle}</p></div><a className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-indigo-600" href={`/test/problem/elements-preview?template=${example.template.id}`}>이 그림 편집</a></header>
    <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600">{example.legend}</p>
    <div className="h-[max(400px,calc(100dvh-270px))] max-h-[800px] [&_[aria-live=polite]>p:last-child]:min-h-[52px]" data-example={slug}><OboPlayer blob={blob} /></div>
    <p className="text-xs leading-relaxed text-slate-500">{example.note}</p>
  </div></main>;
}
