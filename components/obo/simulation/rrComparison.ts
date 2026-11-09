import {parseRrOutput, rrInputText, rrOutputText, type ScheduleSegment} from '../runtime/rrText.mjs';
import type {Json} from '../runtime/index.mjs';
import type {PublicCase} from './PublicCasePlayer';

/** Validate released records only; never regenerate the reference from current data. */
function segments(value: unknown, input: Record<string, Json>): ScheduleSegment[] {
  if (!Array.isArray(value) || !value.length || value.length > 4096 || value.some(s =>
    !s || (s.actor !== null && typeof s.actor !== 'string') || !Number.isSafeInteger(s.start) || !Number.isSafeInteger(s.end))) {
    throw new Error('비어 있거나 올바르지 않은 실행 구간입니다.');
  }
  return parseRrOutput(rrOutputText(value), input);
}
export function segmentAt(rows: ScheduleSegment[], time: number) {
  return rows.find(s => s.start <= time && time < s.end) ?? null;
}
export function describeAt(rows: ScheduleSegment[], time: number) {
  const row = segmentAt(rows, time);
  return row ? `${row.actor ?? 'IDLE'} · [${row.start}, ${row.end})` : '기록 종료 · 이후 기록 없음';
}
export function compareRr(record: PublicCase) {
  try {
    if (record.omitted) throw new Error(record.omitted);
    if (!record.input || !record.reference) throw new Error('공개된 입력 또는 기준 실행 기록이 없습니다.');
    rrInputText(record.input);
    const reference = segments(record.reference.result.segments, record.input);
    let reported: ScheduleSegment[] | null = null, reportedError = '';
    try { reported = segments(record.reported?.result?.segments, record.input); }
    catch (error) { reportedError = error instanceof Error ? error.message : '출력 형식을 읽을 수 없습니다.'; }
    const times = [...new Set([0, ...reference.flatMap(s => [s.start, s.end]), ...(reported ?? []).flatMap(s => [s.start, s.end])])].sort((a,b) => a-b);
    // rr-segments-v1 accepts splitting/merging adjacent intervals of the same actor.
    const firstDifference = reported ? times.find(time => {
      const a = segmentAt(reported!, time), b = segmentAt(reference, time);
      return Boolean(a) !== Boolean(b) || a?.actor !== b?.actor;
    }) ?? null : null;
    const actors = (record.input.jobs as unknown as {id:string}[]).map(job => job.id);
    if ([...reference, ...(reported ?? [])].some(s => s.actor === null)) actors.push('IDLE');
    return {error: null, reference, reported, reportedError, times, actors, end: times.at(-1)!, firstDifference};
  } catch (error) {
    return {error: error instanceof Error ? error.message : '공개 실행 기록을 읽을 수 없습니다.'} as const;
  }
}
