export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export interface SemanticEvent { step: number; kind: string; actor: string | null; data: Record<string, Json>; }
export interface ModelRun { id: string; modelVersion: number; result: Record<string, Json>; events: SemanticEvent[]; stats: { events: number; bytes: number }; }
export interface ModelMetadata { id: string; name: string; domain: string; family: string; elements: string[]; learning_goal: string; boundary: string; }
export interface ModelContract { family: string; metadata: ModelMetadata; inputSchema: Record<string, unknown>; resultSchema: Record<string, unknown>; eventSchema: Record<string, unknown>; resultOutputSchema: Record<string, unknown>; processOutputSchema: Record<string, unknown>; inputExample: Record<string, Json>; }
export const registry: Record<string, ModelContract>;
export const modelList: ModelMetadata[];
export function defaultInput(id: string): Record<string, Json>;
export function run(id: string, input: unknown, options?: { record?: boolean; maxEvents?: number; maxBytes?: number; preferredSequence?: string[] | null }): ModelRun;
export function grade(id: string, input: Record<string, Json>, mode: string, text: string): { correct: boolean; kind: string; message: string; traceValid: boolean; traceMessage?: string | null };
export class OboValidationError extends Error { path: string; }
export function parseBoundedJson(text: string, options?: { bytes?: number; depth?: number }): Json;
export function checkShape(schema: unknown, value: unknown, path?: string): void;
