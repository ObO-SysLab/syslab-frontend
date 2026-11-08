'use client';
import {useEffect,useMemo,useState} from 'react';
import {Button} from '@/components/ui/button';
import {RrTimeline} from './RrTimeline';
import type {PublicCase} from './PublicCasePlayer';
import {compareRr,describeAt} from './rrComparison';

export function RrSchedulePlayer({record}:{record:PublicCase}) {
  const comparison = useMemo(() => compareRr(record), [record]);
  const [cursor,setCursor] = useState(0), [playing,setPlaying] = useState(false), [speed,setSpeed] = useState(1);
  const last = comparison.error === null ? comparison.times.length-1 : 0;
  useEffect(() => {setCursor(0);setPlaying(false);}, [record]);
  useEffect(() => {
    if (!playing) return;
    if (cursor >= last) {setPlaying(false);return;}
    const timer = setTimeout(() => setCursor(value => Math.min(last,value+1)), 1200/speed);
    return () => clearTimeout(timer);
  }, [playing,cursor,last,speed,record]);
  if (comparison.error !== null) return <p role="status" className="rounded-xl border p-4">비교할 수 없습니다. {comparison.error}</p>;
  const {times,firstDifference,reported,reference,reportedError,end,actors} = comparison;
  const index = Math.min(cursor,last), time = times[index];
  const seek = (value:number) => {setCursor(Math.max(0,Math.min(last,value)));setPlaying(false);};
  const difference = firstDifference === null ? null : `첫 차이 t = ${firstDifference} · 내 출력: ${describeAt(reported!,firstDifference)} / 기준 실행: ${describeAt(reference,firstDifference)}`;
  return <div className="min-w-0 space-y-4" data-rr-comparison>
    <div className="space-y-2 rounded-xl border bg-slate-50 p-4">
      <p className="font-semibold">서버 판정: {record.correct === true ? '정답' : record.correct === false ? '오답' : '판정 정보 없음'}</p>
      {record.message && <p className="break-words text-sm text-slate-600">{record.message}</p>}
      <p data-rr-difference className={`break-words text-sm font-semibold ${difference ? 'text-amber-800' : 'text-slate-700'}`}>
        {!reported ? `비교 불가: ${reportedError}` : difference ?? '표시된 실행 구간에 차이가 없습니다. 연속된 같은 실행 주체의 분할·병합은 동일하게 비교합니다.'}
      </p>
      <p className="text-xs text-slate-500">공개된 제출 당시 기록을 비교합니다. 화면 비교는 서버 판정을 바꾸지 않으며 프로그램 내부 변수나 대기 큐를 추적하지 않습니다.</p>
    </div>
    <div className="sticky top-0 z-30 space-y-3 rounded-xl border bg-white/95 p-3 shadow-sm" aria-label="RR 공통 재생">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => seek(0)}>처음으로</Button>
        <Button size="sm" variant="outline" disabled={index===0} onClick={() => seek(index-1)}>이전 시점</Button>
        <Button size="sm" onClick={() => {if(playing)setPlaying(false);else{if(index===last)setCursor(0);setPlaying(true);}}}>{playing ? '일시 정지' : index===last ? '다시 재생' : '재생'}</Button>
        <Button size="sm" variant="outline" disabled={index===last} onClick={() => seek(index+1)}>다음 시점</Button>
        <label className="flex items-center gap-2 text-sm">속도<select aria-label="RR 재생 속도" className="rounded border bg-white p-1" value={speed} onChange={event => setSpeed(Number(event.target.value))}><option value={0.5}>0.5배</option><option value={1}>1배</option><option value={2}>2배</option></select></label>
        <Button size="sm" variant="outline" disabled={firstDifference===null} onClick={() => seek(times.indexOf(firstDifference!))}>첫 차이로 이동</Button>
      </div>
      <label className="block text-sm font-semibold">공통 시간 <output data-rr-time>t = {time}</output> / {end} · 위치 {index+1}/{times.length}
        <input aria-label="RR 공통 시간" aria-valuetext={`t = ${time}, ${index+1}/${times.length}`} type="range" min={0} max={last} step={1} value={index} onChange={event => seek(Number(event.target.value))} className="mt-2 block w-full accent-indigo-600"/>
      </label>
      <p className="text-xs text-slate-500">양쪽 구간 경계를 함께 탐색합니다. [시작, 종료)에서 실행하며 종료 시점에는 다음 구간 또는 기록 종료를 표시합니다.</p>
    </div>
    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
      {(['reported','reference'] as const).map(side => {
        const rows = side==='reported' ? reported : reference;
        const name = side==='reported' ? '내 출력' : '기준 실행';
        return <section key={side} aria-label={name} className="min-w-0 space-y-2 rounded-xl border bg-white p-3">
          <h3 className="font-semibold">{name}</h3>
          <p data-rr-current={side} className="min-h-10 break-all text-sm" aria-live="polite">{rows ? `t = ${time} · ${describeAt(rows,time)}` : '유효한 출력 기록 없음'}</p>
          {rows ? <>
            <p className="text-xs text-slate-500">공통 축 0–{end} · 빨간 선: 선택 시간 · 주황 점선: 첫 차이</p>
            <RrTimeline rows={rows} actors={actors} end={end} time={time} difference={firstDifference} onSeek={time=>seek(times.indexOf(time))} name={name}/>
          </> : <p className="rounded border bg-slate-50 p-4 text-sm">출력을 읽을 수 없어 그림을 표시하지 않습니다. {reportedError}</p>}
        </section>;
      })}
    </div>
  </div>;
}
