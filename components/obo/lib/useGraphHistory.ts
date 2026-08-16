import { useCallback, useEffect, useRef, useState } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { Frame } from '../types';

// nodes/edges/frames 를 하나의 스냅샷으로 묶어 undo/redo 스택 관리.
// 변경은 디바운스로 커밋 → 드래그 같은 연속 변경이 한 스텝으로 합쳐진다.
interface Snapshot {
  nodes: Node[];
  edges: Edge[];
  frames: Frame[];
  traceText: string;
}

interface Params {
  nodes: Node[];
  edges: Edge[];
  frames: Frame[];
  traceText: string;
  setNodes: (n: Node[]) => void;
  setEdges: (e: Edge[]) => void;
  setFrames: (f: Frame[]) => void;
  setTraceText: (t: string) => void;
}

const LIMIT = 100;      // 스택 최대 깊이
const DEBOUNCE = 300;   // ms — 연속 변경 병합 간격

export function useGraphHistory({
  nodes, edges, frames, traceText,
  setNodes, setEdges, setFrames, setTraceText,
}: Params) {
  const past = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);
  const present = useRef<Snapshot>({ nodes, edges, frames, traceText });
  const applying = useRef(false); // undo/redo 로 인한 변경 표시(기록 제외)
  const inited = useRef(false);
  const [, force] = useState(0);
  const rerender = useCallback(() => force(v => v + 1), []);

  // 변경 감지 → 디바운스 후 직전 상태(present)를 past 에 커밋
  useEffect(() => {
    if (applying.current) {
      // undo/redo 가 만든 변경 → 기록하지 않고 present 만 동기화
      applying.current = false;
      present.current = { nodes, edges, frames, traceText };
      return;
    }
    if (!inited.current) {
      // 최초 마운트 상태는 스택에 넣지 않고 present 로만 잡는다
      inited.current = true;
      present.current = { nodes, edges, frames, traceText };
      return;
    }
    const t = setTimeout(() => {
      past.current.push(present.current);
      if (past.current.length > LIMIT) past.current.shift();
      future.current = []; // 새 변경 발생 → redo 스택 폐기
      present.current = { nodes, edges, frames, traceText };
      rerender();
    }, DEBOUNCE);
    return () => clearTimeout(t);
  }, [nodes, edges, frames, traceText, rerender]);

  const apply = useCallback((snap: Snapshot) => {
    applying.current = true;
    setNodes(snap.nodes);
    setEdges(snap.edges);
    setFrames(snap.frames);
    setTraceText(snap.traceText);
  }, [setNodes, setEdges, setFrames, setTraceText]);

  const undo = useCallback(() => {
    if (past.current.length === 0) return;
    const prev = past.current.pop()!;
    future.current.push(present.current);
    present.current = prev;
    apply(prev);
    rerender();
  }, [apply, rerender]);

  const redo = useCallback(() => {
    if (future.current.length === 0) return;
    const next = future.current.pop()!;
    past.current.push(present.current);
    present.current = next;
    apply(next);
    rerender();
  }, [apply, rerender]);

  return {
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
  };
}