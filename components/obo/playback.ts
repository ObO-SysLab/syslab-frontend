'use client';
import { useEffect, useState, type KeyboardEvent } from 'react';

/**
 * Learner playback shared by the free-mode, simple-mode and RR players.
 * One fixed time per scene so captions can be read; the speed only scales it.
 */
export const SCENE_MS = 3000;
export const PLAYBACK_SPEEDS = [0.5, 1, 2, 4] as const;

export interface Playback {
  playing: boolean; speed: number; setSpeed: (speed: number) => void;
  /** Last index playback can reach (a wrong scene stops it). */
  end: number; first: number; last: number;
  go: (index: number) => void; toggle: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}

/** Index runs from `first` (0, or -1 for a start state before the first scene) to `last`; playback never passes `stopAt`. */
export function usePlayback({ index, setIndex, first, last, stopAt, autoPlay = false }: {
  index: number; setIndex: (index: number) => void; first: number; last: number; stopAt?: number; autoPlay?: boolean;
}): Playback {
  const end = Math.max(first, Math.min(last, stopAt ?? last));
  const [playing, setPlaying] = useState(autoPlay);
  const [speed, setSpeed] = useState(1);
  useEffect(() => {
    if (!playing) return;
    if (index >= end) { setPlaying(false); return; }
    const timer = setTimeout(() => setIndex(index + 1), SCENE_MS / speed);
    return () => clearTimeout(timer);
  }, [playing, index, end, speed, setIndex]);
  const go = (next: number) => { setPlaying(false); setIndex(Math.max(first, Math.min(end, next))); };
  const toggle = () => {
    if (playing) { setPlaying(false); return; }
    if (index >= end) setIndex(first);
    setPlaying(true);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('input, select, textarea, [contenteditable="true"]')) return;
    const key = event.key;
    if (key === 'ArrowLeft') go(index - 1);
    else if (key === 'ArrowRight') go(index + 1);
    else if (key === 'Home') go(first);
    else if (key === 'End') go(end);
    else if (key === ' ' && !(event.target as HTMLElement).closest('button')) toggle();
    else return;
    event.preventDefault();
  };
  return { playing, speed, setSpeed, end, first, last, go, toggle, onKeyDown };
}
