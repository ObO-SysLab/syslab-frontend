'use client';
import {useEffect,useMemo,useState} from 'react';
import {RrTimeline} from './RrTimeline';
import type {PublicCase} from './PublicCasePlayer';
import {compareRr,describeAt} from './rrComparison';
import {PlaybackBar} from '../PlaybackBar';
import {usePlayback} from '../playback';

/**
 * RR public example (rr-segments-v1). Right answer: my output and the answer side by side on one time axis.
 * Wrong answer: only my output, stopping and marked at the first different time;
 * neither the answer's segments nor its time boundaries are shown.
 */
export function RrSchedulePlayer({record}:{record:PublicCase}) {
  const comparison = useMemo(() => compareRr(record), [record]);
  const wrong = record.correct === false;
  const times = useMemo(() => {
    if (comparison.error !== null) return [0];
    if (!wrong || !comparison.reported) return comparison.times;
    const mine = [...new Set([0, ...comparison.reported.flatMap(s => [s.start, s.end])])].sort((a,b) => a-b), stop = comparison.firstDifference;
    return stop === null ? mine : [...new Set([...mine.filter(t => t <= stop), stop])].sort((a,b) => a-b);
  }, [comparison, wrong]);
  const [cursor,setCursor] = useState(0);
  useEffect(() => setCursor(0), [record]);
  const last = times.length-1;
  const pb = usePlayback({index: cursor, setIndex: setCursor, first: 0, last});
  if (comparison.error !== null) return <p role="status" className="rounded-xl border p-4">비교할 수 없습니다. {comparison.error}</p>;
  const {firstDifference,reported,reference,reportedError,actors} = comparison;
  const index = Math.min(cursor,last), time = times[index];
  const end = wrong && reported ? Math.max(...reported.map(s => s.end), firstDifference ?? 0, 1) : comparison.end;
  const wrongAt = wrong && firstDifference !== null ? times.indexOf(firstDifference) : null;
  const headline = !wrong ? (record.correct ? '정답입니다.' : '판정 정보가 없습니다.')
    : !reported ? `오답 · 출력을 읽을 수 없습니다. ${reportedError}`
    : firstDifference !== null ? `오답 · t = ${firstDifference}부터 정답과 다릅니다. 내 출력: ${describeAt(reported,firstDifference)}` : '오답입니다.';
  const seek = (value:number) => pb.go(value);
  const sides = wrong ? (['reported'] as const) : (['reported','reference'] as const);
  return <div className="min-w-0 space-y-4" data-rr-comparison onKeyDown={pb.onKeyDown}>
    <div className={`space-y-1 rounded-xl p-4 ${wrong ? 'bg-rose-50 text-rose-800' : 'bg-indigo-50 text-indigo-800'}`}>
      <p data-rr-difference className="break-words font-semibold">{headline}</p>
      {wrong && record.message && <p className="break-words text-sm">{record.message}</p>}
    </div>
    <div className="sticky top-0 z-30 space-y-2 rounded-xl border bg-white/95 p-3 shadow-sm" aria-label="RR 재생">
      <PlaybackBar pb={pb} index={index} wrongAt={wrongAt}/>
      <p className="text-center text-sm font-semibold">시각 <output data-rr-time>t = {time}</output> / {end}</p>
    </div>
    <div className={`grid min-w-0 gap-4 ${sides.length > 1 ? 'lg:grid-cols-2' : ''}`}>
      {sides.map(side => {
        const rows = side==='reported' ? reported : reference;
        const name = side==='reported' ? '내 출력' : '정답 풀이';
        return <section key={side} aria-label={name} className="min-w-0 space-y-2 rounded-xl border bg-white p-3">
          <h3 className="font-semibold">{name}</h3>
          <p data-rr-current={side} className="min-h-10 break-all text-sm" aria-live="polite">{rows ? `t = ${time} · ${describeAt(rows,time)}` : '유효한 출력 기록 없음'}</p>
          {rows ? <RrTimeline rows={rows} actors={actors} end={end} time={time} difference={wrong ? firstDifference : null} onSeek={t => seek(Math.max(0, times.indexOf(t)))} name={name}/>
            : <p className="rounded border bg-slate-50 p-4 text-sm">출력을 읽을 수 없어 그림을 표시하지 않습니다. {reportedError}</p>}
        </section>;
      })}
    </div>
  </div>;
}
