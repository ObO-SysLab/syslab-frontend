'use client';
import { ChevronLeft, ChevronRight, Pause, Play, SkipBack } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PLAYBACK_SPEEDS, type Playback } from './playback';

/** Up to this many scenes are shown as dots; more use a slider. */
const MAX_DOTS = 30;

/**
 * The one learner playback bar (2026-11-09 learner-playback): same buttons, names, speeds and keys in every player.
 * Scenes past `pb.end` (after a wrong scene) cannot be reached.
 */
export function PlaybackBar({ pb, index, wrongAt, showPosition = true }: { pb: Playback; index: number; wrongAt?: number | null; showPosition?: boolean }) {
  const { first, last, end, playing } = pb;
  const atEnd = index >= end;
  const label = playing ? '일시 정지' : atEnd && end > first ? '다시 재생' : '재생';
  const total = last + 1;
  return <div className="space-y-2" data-playback-bar>
    <div className="flex flex-wrap items-center justify-center gap-2" role="group" aria-label="재생 조작">
      <Button type="button" variant="ghost" size="icon" aria-label="처음으로" title="처음으로 (Home)" disabled={index <= first} onClick={() => pb.go(first)} className="h-9 w-9 text-slate-500"><SkipBack className="h-4 w-4" /></Button>
      <Button type="button" variant="outline" size="icon" aria-label="이전 장면" title="이전 장면 (←)" disabled={index <= first} onClick={() => pb.go(index - 1)} className="h-9 w-9"><ChevronLeft className="h-4 w-4" /></Button>
      <Button type="button" size="sm" aria-label={label} title={`${label} (스페이스)`} disabled={end <= first} onClick={pb.toggle} className="h-9 gap-1.5 px-3">
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{label}
      </Button>
      <Button type="button" variant="outline" size="icon" aria-label="다음 장면" title="다음 장면 (→)" disabled={index >= end} onClick={() => pb.go(index + 1)} className="h-9 w-9"><ChevronRight className="h-4 w-4" /></Button>
      <label className="flex items-center gap-1.5 text-xs text-slate-600">재생 속도
        <select aria-label="재생 속도" value={pb.speed} onChange={e => pb.setSpeed(Number(e.target.value))} className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700">
          {PLAYBACK_SPEEDS.map(n => <option key={n} value={n}>{n}배</option>)}
        </select></label>
      {showPosition && <span className="min-w-20 text-center text-xs font-medium text-slate-600" data-playback-position>{index < 0 ? '시작' : `장면 ${index + 1} / ${total}`}</span>}
    </div>
    {total > 0 && (total <= MAX_DOTS
      ? <div className="flex flex-wrap justify-center" data-playback-dots>
        {Array.from({ length: total }, (_, i) => {
          const locked = i > end, wrong = i === wrongAt, current = i === index;
          const color = wrong ? '#e11d48' : current ? '#4f46e5' : i < index ? '#a5b4fc' : '#e2e8f0';
          return <button key={i} type="button" aria-label={`${i + 1}번 장면${wrong ? ' (틀린 장면)' : ''}`} aria-current={current ? 'step' : undefined} disabled={locked}
            onClick={() => pb.go(i)} className="flex h-6 min-w-6 items-center justify-center rounded-full disabled:cursor-not-allowed">
            <span className="block h-2.5 rounded-full transition-all" style={{ width: current ? 24 : 10, background: color, opacity: locked ? 0.35 : 1 }} />
          </button>;
        })}
      </div>
      : <input type="range" aria-label="장면 이동" min={first} max={last} value={Math.min(index, last)} className="w-full accent-indigo-600"
        onChange={e => pb.go(Number(e.target.value))} />)}
  </div>;
}
