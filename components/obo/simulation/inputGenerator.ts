import { registry, run, type Json } from '../runtime/index.mjs';
import { inputToText, textReference } from '../runtime/textFormats.mjs';
import { rrInputText, rrOutputText, type ScheduleSegment } from '../runtime/rrText.mjs';

/**
 * Random hidden tests for rule-based coding problems (editor only).
 * Inputs start from the author's model input; numbers are varied for most models and nine structure-heavy
 * models get small generators. Only inputs the real engine accepts are kept, and each kept test has an
 * answer that no existing test already has. The same seed, model input and existing tests give the same tests.
 */
type Input = Record<string, Json>;
type Rand = () => number;
type Schema = { type?: string; minimum?: number; maximum?: number; minItems?: number; maxItems?: number; items?: Schema;
  properties?: Record<string, Schema>; additionalProperties?: Schema | boolean; anyOf?: unknown; oneOf?: unknown };
export type CaseFormat = 'text-v1' | 'json-v1' | 'rr-segments-v1';
export interface GeneratedCase { input: string; output: string; key: string }
export interface Generation { cases: GeneratedCase[]; tries: number; seed: number; requested: number; lastError: string }

export function seededRandom(seed: number): Rand {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const int = (r: Rand, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
const pick = <T,>(r: Rand, list: readonly T[]): T => list[Math.floor(r() * list.length)];
const keys = (value: Json | undefined) => value && typeof value === 'object' && !Array.isArray(value) ? Object.keys(value) : [];
const strings = (value: Json | undefined) => Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
/** The author's IDs when there are enough of them, otherwise short defaults. */
const names = (r: Rand, base: string[], fallback: string[], min: number, max: number) => {
  const pool = base.length >= min ? base : fallback;
  return pool.slice(0, int(r, min, Math.min(max, pool.length)));
};

/** Varies numbers and number-list lengths inside the schema; IDs, enums and structure stay the author's. */
function mutate(value: Json, schema: Schema | undefined, r: Rand): Json {
  if (schema && (schema.anyOf || schema.oneOf)) return value;
  if (typeof value === 'number' && schema && (schema.type === 'integer' || schema.type === 'number')) {
    const lo = schema.minimum ?? 0, hi = Math.min(schema.maximum ?? value + 10, Math.max(value, lo) + 10);
    return r() < 0.6 ? int(r, lo, hi) : value;
  }
  if (Array.isArray(value)) {
    const next = value.map(item => mutate(item, schema?.items, r));
    if (next.length && next.every(item => typeof item === 'number') && schema?.items && r() < 0.5) {
      const max = Math.min(schema.maxItems ?? next.length + 4, next.length + 4);
      if (r() < 0.5 && next.length < max) (next as Json[]).push(mutate(pick(r, next), schema.items, r));
      else if (next.length > (schema.minItems ?? 0)) next.splice(int(r, 0, next.length - 1), 1);
    }
    return next;
  }
  if (value && typeof value === 'object') {
    const extra = typeof schema?.additionalProperties === 'object' ? schema.additionalProperties : undefined;
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, mutate(item, schema?.properties?.[key] ?? extra, r)]));
  }
  return value;
}

const generators: Record<string, (r: Rand, base: Input) => Input> = {
  ST2(r, base) {
    const ids = names(r, keys(base.processes), ['P1', 'P2', 'P3'], 1, 3);
    const moves: Record<string, [string, string][]> = { New: [['create', 'Ready']], Ready: [['dispatch', 'Running']],
      Running: [['io', 'Waiting'], ['preempt', 'Ready'], ['finish', 'Terminated']], Waiting: [['completeIO', 'Ready']], Terminated: [] };
    const state: Record<string, string> = Object.fromEntries(ids.map(id => [id, 'New']));
    const actions: Input[] = [], length = int(r, 4, 12);
    for (let i = 0; i < length * 4 && actions.length < length; i++) {
      const id = pick(r, ids), running = Object.values(state).includes('Running');
      const options = moves[state[id]].filter(([event]) => event !== 'dispatch' || !running);
      if (!options.length) continue;
      const [event, next] = pick(r, options); actions.push({ id, event }); state[id] = next;
    }
    return { processes: Object.fromEntries(ids.map(id => [id, 'New'])), actions };
  },
  CS(r, base) {
    const ids = names(r, keys(base.pcbs), ['P', 'Q', 'R', 'S'], 2, 4);
    let current = pick(r, ids); const initialId = current, order: string[] = [];
    for (let i = int(r, 1, 5); i > 0; i--) { current = pick(r, ids.filter(id => id !== current)); order.push(current); }
    return { pcbs: Object.fromEntries(ids.map(id => [id, { pc: int(r, 0, 99) }])), initialId, order };
  },
  MF(r, base) {
    const total = typeof base.total === 'number' && base.total <= 256 ? base.total : int(r, 32, 128);
    const live: string[] = [], operations: Input[] = []; let next = 0;
    for (let i = int(r, 4, 8); i > 0; i--) {
      if (live.length && r() < 0.35) operations.push({ op: 'free', id: live.splice(int(r, 0, live.length - 1), 1)[0] });
      else { const id = String.fromCharCode(65 + next++); live.push(id); operations.push({ op: 'alloc', id, size: int(r, 1, Math.max(1, Math.floor(total / 2))) }); }
    }
    return { total, initial: [{ start: 0, size: total, owner: null }], operations, policy: base.policy };
  },
  S3(r, base) {
    // The text answer is only NONE or a deadlock set, so up to five processes and four resource kinds keep enough different answers.
    const widen = (own: string[], extra: string[]) => [...own, ...extra.filter(id => !own.includes(id))];
    const actors = names(r, widen(strings(base.actors), ['P1', 'P2', 'P3', 'P4', 'P5']), [], 2, 5), resources = names(r, widen(strings(base.resources), ['R1', 'R2', 'R3', 'R4']), [], 1, 4);
    // Mostly one unit per resource so that crossing requests often end in a deadlock.
    const available = resources.map(() => r() < 0.8 ? 1 : 2), free = [...available];
    const zero = () => actors.map(() => resources.map(() => 0)), held = zero(), actions: Input[] = [];
    for (let i = int(r, 4, 9); i > 0; i--) {
      const a = int(r, 0, actors.length - 1);
      if (held[a].some(v => v > 0) && r() < 0.2) {
        const values = held[a].map(v => v ? int(r, 1, v) : 0); values.forEach((v, j) => { held[a][j] -= v; free[j] += v; });
        actions.push({ op: 'release', actor: actors[a], values });
      } else {
        // Same rule as the engine: granted at once when free, otherwise left pending (never granted later).
        const j = int(r, 0, resources.length - 1); if (free[j] > 0) { free[j]--; held[a][j]++; }
        actions.push({ op: 'request', actor: actors[a], values: resources.map((_, k) => k === j ? 1 : 0) });
      }
    }
    return { actors, resources, available, allocated: zero(), requests: zero(), actions };
  },
  PC(r, base) {
    const actors = Array.isArray(base.actors) && base.actors.length ? base.actors as Input[] : [{ id: 'P', role: 'producer' }, { id: 'C', role: 'consumer' }];
    const ids = actors.map(a => a.id as string);
    return { ...base, capacity: int(r, 1, 3), initial: [], actors, order: Array.from({ length: int(r, 3, 10) }, () => pick(r, ids)) };
  },
  BK(r, base) {
    const actors = names(r, strings(base.actors), ['P0', 'P1', 'P2', 'P3', 'P4'], 2, 5), resources = names(r, strings(base.resources), ['A', 'B', 'C'], 1, 3);
    const max = actors.map(() => resources.map(() => int(r, 0, 6))), allocated = max.map(row => row.map(m => int(r, 0, m)));
    let request: Input | null = null;
    if (r() < 0.5) {
      const i = int(r, 0, actors.length - 1), values = resources.map((_, j) => int(r, 0, max[i][j] - allocated[i][j]));
      if (values.some(Boolean)) request = { actor: actors[i], values };
    }
    return { actors, resources, available: resources.map(() => int(r, 0, 4)), allocated, max, request };
  },
  IN(r, base) {
    const fs = base.fs as Input | undefined, blockSize = int(r, 2, 8), files = names(r, keys(fs?.directory), ['a', 'b'], 1, 2);
    const directory: Record<string, string> = {}, inodes: Record<string, Input> = {}, indirect: Record<string, string[]> = {}, blocks: Record<string, string> = {};
    files.forEach((name, f) => {
      const inode = `i${f}`, size = int(r, 1, blockSize * 5), count = Math.ceil(size / blockSize), direct = Math.min(count, int(r, 1, 3));
      const list = Array.from({ length: count }, (_, k) => { const block = `b${f}${k}`; blocks[block] = `d${f}${k}`; return block; });
      const pointer = count > direct ? `x${f}` : null; if (pointer) indirect[pointer] = list.slice(direct);
      directory[name] = inode; inodes[inode] = { size, direct: list.slice(0, direct), indirect: pointer };
    });
    const accesses = Array.from({ length: int(r, 2, 5) }, () => {
      const name = pick(r, files), size = inodes[directory[name]].size as number;
      return { name, offset: int(r, 0, size + blockSize - 1) };
    });
    return { fs: { blockSize, directory, inodes, indirect, blocks }, accesses };
  },
  PT(r, base) {
    const processes = names(r, keys(base.spaces), ['P', 'Q'], 1, 2), threads = ['T1', 'T2', 'T3'].slice(0, int(r, 1, 3));
    const spaces: Record<string, Record<string, number>> = Object.fromEntries(processes.map(p => [p, Object.fromEntries(['x', 'y'].slice(0, int(r, 1, 2)).map(k => [k, int(r, 0, 9)]))]));
    const owner: Record<string, string> = Object.fromEntries(threads.map(t => [t, pick(r, processes)]));
    const operations = Array.from({ length: int(r, 3, 7) }, (): Input => {
      const thread = pick(r, threads), shared = r() < 0.65, scope = shared ? 'shared' : 'private', key = shared ? pick(r, Object.keys(spaces[owner[thread]])) : 'r';
      return r() < 0.5 ? { op: 'read', thread, scope, key } : { op: 'write', thread, scope, key, value: int(r, 0, 99) };
    });
    if (!operations.some(o => o.op === 'read')) operations.push({ op: 'read', thread: threads[0], scope: 'private', key: 'r' });
    return { spaces, threads: Object.fromEntries(threads.map(t => [t, { process: owner[t], registers: { r: int(r, 0, 9) }, stack: [] }])), operations };
  },
  IPC(r, base) {
    const mode = base.mode as string, actors = names(r, strings(base.actors), ['P', 'Q', 'R'], 2, 3);
    const operations = Array.from({ length: int(r, 3, 8) }, (): Input => {
      const actor = pick(r, actors);
      if (mode === 'shared') return r() < 0.5 ? { actor, op: 'write', key: pick(r, ['x', 'y']), value: int(r, 0, 99) } : { actor, op: 'read', key: pick(r, ['x', 'y']) };
      return r() < 0.55 ? { actor, op: 'send', value: int(r, 0, 99) } : { actor, op: 'receive' };
    });
    return { actors, mode, capacity: int(r, 1, 3), initial: [], shared: {}, operations };
  },
  'K-INTERRUPT'(r, base) {
    const contexts = Object.fromEntries(keys(base.contexts).map(id => [id, { pc: int(r, 0, 99) }]));
    return { ...base, scenario: pick(r, ['io', 'timer']), contexts, at: int(r, 0, 3), returnValue: int(r, -1, 9) };
  },
};
export const structuredModels = Object.keys(generators);

/** Test input and expected output in the problem's student format; `key` identifies the answer. */
export function caseFor(id: string, input: Input, format: CaseFormat, mode: string): GeneratedCase {
  if (format === 'text-v1') { const text = inputToText(id, input), expected = textReference(id, text).expected; return { input: text, output: expected, key: expected }; }
  const reference = run(id, input);
  if (format === 'rr-segments-v1') { const output = rrOutputText(reference.result.segments as unknown as ScheduleSegment[]); return { input: rrInputText(input), output, key: output }; }
  return { input: JSON.stringify(input, null, 2), output: JSON.stringify({ v: 1, result: reference.result, ...(mode === 'process' ? { events: reference.events } : {}) }, null, 2), key: JSON.stringify(reference.result) };
}
function existingKey(id: string, input: string, format: CaseFormat) {
  try {
    if (format === 'text-v1') return textReference(id, input).expected;
    if (format === 'json-v1') return JSON.stringify(run(id, JSON.parse(input)).result);
  } catch { /* An unreadable existing test simply does not exclude anything. */ }
  return null;
}

export function generateHiddenCases(id: string, base: Input, { count, seed, format, mode = 'result', existing = [], maxTries = Math.max(50, count * 20) }:
  { count: number; seed: number; format: CaseFormat; mode?: string; existing?: string[]; maxTries?: number }): Generation {
  const r = seededRandom(seed), seen = new Set<string>(), cases: GeneratedCase[] = [];
  const make = generators[id] ?? ((rand: Rand, input: Input) => mutate(input, registry[id].inputSchema as Schema, rand) as Input);
  for (const input of existing) { const key = existingKey(id, input, format); if (key !== null) seen.add(key); }
  try { seen.add(caseFor(id, base, format, mode).key); } catch { /* The author's input may not be expressible in this format. */ }
  let tries = 0, lastError = '';
  while (cases.length < count && tries < maxTries) {
    tries++;
    try {
      const generated = caseFor(id, make(r, base), format, mode);
      if (seen.has(generated.key) || existing.includes(generated.input)) continue;
      seen.add(generated.key); cases.push(generated);
    } catch (error) { lastError = error instanceof Error ? error.message : String(error); }
  }
  return { cases, tries, seed, requested: count, lastError };
}
