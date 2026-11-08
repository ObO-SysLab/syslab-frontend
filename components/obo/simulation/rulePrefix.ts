import { checkShape, registry, run } from '../runtime/index.mjs';
import type { ModelRun, SemanticEvent } from '../runtime/index.mjs';
import type { SimulationInstance } from '../runtime/document.mjs';

export function requireRule(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`규칙 표시: ${message}`);
}

/** Display name chosen by the author, falling back to the semantic id (own keys only). */
export const labelOf = (instance: SimulationInstance) => (id: string) => Object.hasOwn(instance.labels, id) ? instance.labels[id] : id;

/**
 * Events [0..cursor] of the observed trace, after checking that every one equals the engine's own run of this input.
 * The engine is always run once so inputs it rejects show the safe notice before playback; execution.result is never read.
 */
export function verifiedPrefix(model: string, instance: SimulationInstance, execution: ModelRun | null, cursor: number): SemanticEvent[] {
  requireRule(instance.scenarioId === model, '표시할 모델이 다릅니다.');
  requireRule(Number.isInteger(cursor), '현재 사건 위치를 확인하세요.');
  requireRule(execution === null || execution.id === model, '실행 기록의 모델이 다릅니다.');
  checkShape(registry[model].inputSchema, instance.input, 'input');
  const expected = run(model, instance.input).events;
  const events = execution?.events.slice(0, Math.max(0, cursor + 1)) ?? [];
  requireRule(events.length <= expected.length, '사건 수가 입력의 실행보다 많습니다.');
  for (const [i, e] of events.entries()) {
    checkShape(registry[model].eventSchema, e, 'event');
    requireRule(JSON.stringify(e) === JSON.stringify(expected[i]), '사건이 입력의 실행과 다릅니다.');
  }
  return events;
}

/** A window of at most `size` items that keeps `current` visible (input order only, no outcomes). */
export function around<T>(items: T[], current: number, size = 14): { start: number; items: T[] } {
  if (items.length <= size) return { start: 0, items };
  const start = Math.min(Math.max(0, current - Math.floor(size / 2)), items.length - size);
  return { start, items: items.slice(start, start + size) };
}
