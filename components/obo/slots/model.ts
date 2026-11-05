import type { Frame } from '../types';
export const MAX_SLOTS = 64;
export const SLOT_EVENT_FIELDS = ['faultSlotIndex', 'hitSlotIndex', 'activeSlotIndex', 'pointerSlotIndex'] as const;
export type SlotEventField = typeof SLOT_EVENT_FIELDS[number];
export type SlotValue = number | null;
export function slotCountOf(data: Record<string, unknown>): number {
  const count = data.slotCount ?? (Array.isArray(data.slots) ? data.slots.length : 0);
  return typeof count === 'number' && Number.isFinite(count) ? Math.max(0, Math.min(MAX_SLOTS, Math.floor(count))) : 0;
}
export function validSlotIndex(value: unknown, count: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < count;
}
export function parseSlotValue(raw: string): { valid: boolean; value: SlotValue } {
  if (!raw.trim()) return { valid: true, value: null };
  const value = Number(raw);
  return { valid: Number.isFinite(value), value: Number.isFinite(value) ? value : null };
}
export function slotValues(data: Record<string, unknown>, count = slotCountOf(data)): SlotValue[] {
  const values = Array.isArray(data.slots) ? data.slots : [];
  return Array.from({ length: count }, (_, index) => {
    const value = values[index];
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  });
}
// Absent overrides keep inheriting earlier values; only explicit arrays are resized.
export function resizeSlotData(data: Record<string, unknown>, count: number): Record<string, unknown> {
  const next = { ...data };
  if (Array.isArray(data.slots)) next.slots = slotValues(data, count);
  for (const field of SLOT_EVENT_FIELDS) if (field in data && !validSlotIndex(data[field], count)) next[field] = null;
  return next;
}
export function resizeSlotFrames(frames: Frame[], nodeId: string, count: number): Frame[] {
  return frames.map(frame => {
    const override = frame.nodeDataOverrides?.[nodeId];
    return override ? { ...frame, nodeDataOverrides: { ...frame.nodeDataOverrides, [nodeId]: resizeSlotData(override, count) } } : frame;
  });
}
