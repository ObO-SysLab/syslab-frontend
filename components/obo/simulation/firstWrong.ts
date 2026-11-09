import { run, type Json, type ModelRun, type SemanticEvent } from '../runtime/index.mjs';
import { equal } from '../runtime/validation.mjs';

/**
 * Where a wrong answer first goes wrong (2026-11-09 learner-playback), so the learner's own record can stop and be
 * marked there without showing the expected answer. Frontend only: grading itself is unchanged.
 */

/** Text answers (text-v1): index of the first wrong line in the learner's lines; `actual.length` when lines are missing. */
export function firstWrongLine(scenarioId: string | undefined, expected: string[], actual: string[]): number {
  const tokens = (line: string) => line.split(' ');
  // CPU scheduling: same-actor neighbours may be merged or split; a line is wrong where it leaves the reference timeline.
  if (scenarioId === 'G2' || scenarioId === 'RR' || scenarioId === 'PS') {
    const reference = expected.map(tokens).map(([actor, start, end]) => ({ actor, start: Number(start), end: Number(end) }));
    // [start, end) must lie inside reference segments that all run this actor (IDLE included).
    const covered = (actor: string, start: number, end: number) => {
      let t = start;
      for (const s of reference) {
        if (s.end <= t) continue;
        if (s.start > t || s.actor !== actor) return false;
        t = s.end;
        if (t >= end) return true;
      }
      return false;
    };
    let time = 0;
    for (let i = 0; i < actual.length; i++) {
      const [actor, a, b, ...rest] = tokens(actual[i]), start = Number(a), end = Number(b);
      if (rest.length || !/^\d+$/.test(a ?? '') || !/^\d+$/.test(b ?? '') || start !== time || end <= start) return i;
      if (!covered(actor, start, end)) return i;
      time = end;
    }
    return time < (reference.at(-1)?.end ?? 0) ? actual.length : actual.length - 1;
  }
  // Banker: the GRANTED/DENIED line first, then the safe sequence (any valid order is right).
  if (scenarioId === 'BK') {
    if (expected.length > 1 && actual[0] !== expected[0]) return 0;
    return actual.length === expected.length ? expected.length - 1 : Math.min(actual.length, expected.length);
  }
  // Deadlock set and order finding are one-line answers.
  if (scenarioId === 'S3' || (scenarioId === 'DP' && expected.length === 1)) return 0;
  for (let i = 0; i < Math.min(expected.length, actual.length); i++) if (expected[i] !== actual[i]) return i;
  return Math.min(expected.length, actual.length);
}

/** Process records: the first event that differs from what the model does (as the server's compareTrace checks). */
export function firstWrongEvent(scenarioId: string, input: Record<string, Json>, reported: { result: Record<string, Json>; events: SemanticEvent[] }): { index: number; finalResult: boolean } {
  const config = structuredClone(input) as Record<string, Json>;
  if (scenarioId === 'DP' && config.mode === 'findSchedule') config.order = reported.events.map(e => (e as unknown as { actor: Json }).actor);
  const safe = (reported.result as { safe?: unknown; sequence?: unknown }).safe === true;
  let expected: ModelRun;
  try { expected = run(scenarioId, config, { preferredSequence: scenarioId === 'BK' && safe ? (reported.result as { sequence: string[] }).sequence : null }); }
  catch { return { index: 0, finalResult: false }; }
  const n = Math.min(reported.events.length, expected.events.length);
  for (let i = 0; i < n; i++) if (!equal(reported.events[i], expected.events[i])) return { index: i, finalResult: false };
  if (reported.events.length !== expected.events.length) return { index: n, finalResult: false };
  return { index: Math.max(0, reported.events.length - 1), finalResult: true };
}
