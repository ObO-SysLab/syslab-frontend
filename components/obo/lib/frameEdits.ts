import type { Frame } from '../types';
import { nextFrameId } from './id';

export function duplicateFrame(frames: Frame[], id: string): Frame[] {
  const index = frames.findIndex(frame => frame.id === id);
  if (index < 0) return frames;
  const copy: Frame = { ...structuredClone(frames[index]), id: nextFrameId(frames) };
  return [...frames.slice(0, index + 1), copy, ...frames.slice(index + 1)];
}

export function moveFrame(frames: Frame[], id: string, direction: -1 | 1): Frame[] {
  const index = frames.findIndex(frame => frame.id === id);
  const destination = index + direction;
  if (index < 0 || destination < 0 || destination >= frames.length) return frames;
  const next = [...frames];
  const [frame] = next.splice(index, 1);
  next.splice(destination, 0, frame);
  return next;
}
